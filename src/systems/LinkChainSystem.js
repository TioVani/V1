import Logger from '../utils/Logger.js';
import { SATURATION_COSTS } from './SaturationState.js';
/**
 * D4 灵光联连系统（Link Chain System）
 * 闭包工厂 + 依赖注入模式
 *
 * 通过D1/D2/D3行为积累充能条，满100%触发联连窗口：
 * - 慢动作（50%速度）
 * - 2-6个灵光被金线串联，标注序号①②③...
 * - 玩家按序划链，画对前3个即发动大招
 * - 倍率: 3连×3 / 4连×5 / 5连×6 / 6连×8
 * - 失败充能归零，8秒冷却
 *
 * 充能规则:
 * - D1 Perfect: +12%  D1 Great: +8%  D1 普通: +5%
 * - D2 满蓄: +25%    D2 中蓄: +15%
 * - D3 每层: +3%
 *
 * 解锁条件：角色等级 >= 20
 */

var D4_UNLOCK_LEVEL = 20;

var WINDOW_DURATION_REAL_MS = 2000;
var SLOW_MOTION_FACTOR = 0.5;
var COOLDOWN_MS = 8000;
var MIN_LINKED_STARS = 2;
var MAX_LINKED_STARS = 6;
var REQUIRED_CORRECT = 3;  // 画对前3个即可发动
var LINK_HIT_RADIUS = 35;  // 联连灵光命中检测半径

// 联连倍率表
var CHAIN_MULTIPLIERS = { 2: 2.0, 3: 3.0, 4: 4.5, 5: 6.0, 6: 8.0 };

function createLinkChainSystem(deps) {
    var getPlayerData = deps.getPlayerData;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getStars = deps.getStars || function () { return []; };
    var getActiveMonsters = deps.getActiveMonsters || function () { return []; };
    var addMessage = deps.addMessage || function () { };
    var createScreenShake = deps.createScreenShake || function () { };
    var vibrateShort = deps.vibrateShort || function () { };
    var saturationState = deps.saturationState;

    // 内部状态
    var state = {
        charge: 0,               // 0-100
        isActive: false,         // 联连窗口开
        linkedStars: [],         // [{star, index}] 被选中的灵光
        matchedIndices: [],      // 已正确划过的序号
        swipeTargetIndex: 1,     // 下一个需要划到的序号
        windowStartTime: 0,
        isSlowMotion: false,
        lastLinkEndTime: 0,
        isCooldown: false,
        swipeActive: false
    };

    function isUnlocked() {
        var pd = getPlayerData();
        if (!pd || !pd.currentCharacterId) return false;
        var charExp = pd.characterExperience;
        if (!charExp || !charExp[pd.currentCharacterId]) return false;
        return charExp[pd.currentCharacterId].level >= D4_UNLOCK_LEVEL;
    }

    function isActive() { return state.isActive; }
    function isSlowMotionActive() { return state.isSlowMotion; }
    function isOnCooldown() { return state.isCooldown; }
    function getCharge() { return state.charge; }
    function getLinkedStars() { return state.linkedStars; }

    /**
     * 累加充能，满100自动触发联连窗口
     */
    function addCharge(amount) {
        if (!isUnlocked()) return;
        if (state.isActive || state.isCooldown) return;

        state.charge = Math.min(100, state.charge + amount);

        if (state.charge >= 100) {
            beginLinkWindow();
        }
    }

    /**
     * 触发联连窗口
     */
    function beginLinkWindow() {
        var stars = typeof getStars === 'function' ? getStars() : [];
        if (!stars || stars.length < MIN_LINKED_STARS) {
            state.charge = 0;
            return;
        }

        // 随机选 2-6 个可见灵光
        var count = Math.min(MAX_LINKED_STARS, stars.length);
        count = Math.max(MIN_LINKED_STARS, Math.floor(Math.random() * (count - MIN_LINKED_STARS + 1)) + MIN_LINKED_STARS);

        var shuffled = [];
        for (var i = 0; i < stars.length; i++) {
            shuffled.push({ star: stars[i], idx: i });
        }
        // Fisher-Yates shuffle
        for (var j = shuffled.length - 1; j > 0; j--) {
            var k = Math.floor(Math.random() * (j + 1));
            var tmp = shuffled[j];
            shuffled[j] = shuffled[k];
            shuffled[k] = tmp;
        }

        state.linkedStars = [];
        for (var s = 0; s < count; s++) {
            state.linkedStars.push({
                star: shuffled[s].star,
                index: s + 1,
                x: shuffled[s].star.x,
                y: shuffled[s].star.y
            });
        }

        state.isActive = true;
        state.isSlowMotion = true;
        state.swipeActive = false;
        state.matchedIndices = [];
        state.swipeTargetIndex = 1;
        state.windowStartTime = Date.now();
        state.charge = 100;

        addMessage('联连窗口激活! 按序划链', '#FFD700', true);
        vibrateShort({ type: 'heavy' });
    }

    /**
     * 开始跟踪滑动
     */
    function beginSwipeTracking() {
        if (!state.isActive) return;
        state.swipeActive = true;
    }

    /**
     * 追踪滑动路径
     */
    function trackSwipePath(x, y) {
        if (!state.isActive || !state.swipeActive) return;
        if (state.matchedIndices.length >= REQUIRED_CORRECT) return;  // 已画够3个

        var scale = getScreenScale ? getScreenScale() : 1;
        var hitRadius = LINK_HIT_RADIUS * scale;

        // 找下一个目标灵光
        for (var i = 0; i < state.linkedStars.length; i++) {
            var ls = state.linkedStars[i];
            if (ls.index !== state.swipeTargetIndex) continue;
            if (state.matchedIndices.indexOf(ls.index) !== -1) continue;

            var dx = x - ls.x;
            var dy = y - ls.y;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                state.matchedIndices.push(ls.index);
                state.swipeTargetIndex++;
                vibrateShort({ type: 'light' });
                addMessage('联连 ②' + ls.index, '#FFD700');
                break;
            }
        }
    }

    /**
     * 结束滑动，判定结果
     */
    function endSwipe() {
        if (!state.isActive) return null;

        var success = state.matchedIndices.length >= REQUIRED_CORRECT;
        var result = null;

        if (success) {
            var chainLength = state.linkedStars.length;
            var multiplier = CHAIN_MULTIPLIERS[chainLength] || 3.0;

            // 对当前活跃怪物造成伤害
            var monsters = getActiveMonsters();
            var pd = getPlayerData();
            var baseAtk = pd.totalAttack || 50;
            var totalDamage = 0;

            for (var m = 0; m < monsters.length; m++) {
                var mon = monsters[m];
                if (mon.hp <= 0 || !mon.active) continue;
                var dmg = Math.floor(baseAtk * multiplier);
                if (mon.shield && mon.shield > 0) {
                    if (dmg <= mon.shield) { mon.shield -= dmg; dmg = 0; }
                    else { dmg -= mon.shield; mon.shield = 0; }
                }
                mon.hp = Math.max(0, mon.hp - dmg);
                totalDamage += dmg;
            }

            // 剩余未画的灵光自动结算（按位置衰减：④=100% ⑤=80% ⑥=60%）
            var remainingBonus = 0;
            var decayMap = { 4: 1.0, 5: 0.8, 6: 0.6 };
            for (var r = 0; r < state.linkedStars.length; r++) {
                if (state.matchedIndices.indexOf(state.linkedStars[r].index) === -1) {
                    var decayRate = decayMap[state.linkedStars[r].index] || 0.5;
                    remainingBonus += Math.floor(baseAtk * decayRate);
                }
            }

            addMessage('联连发动! ' + chainLength + '连 ×' + multiplier + ' -' + (totalDamage + remainingBonus), '#FFD700', true);
            createScreenShake(10);
            vibrateShort({ type: 'heavy' });

            // 恢复饱和度
            if (saturationState) saturationState.recover(SATURATION_COSTS.LINK_RECOVERY);

            result = {
                success: true,
                chainLength: chainLength,
                multiplier: multiplier,
                totalDamage: totalDamage + remainingBonus,
                matchedCount: state.matchedIndices.length
            };
        } else {
            addMessage('联连失败...', '#ff4444');
            result = { success: false, matchedCount: state.matchedIndices.length };
        }

        // 重置
        state.isActive = false;
        state.isSlowMotion = false;
        state.swipeActive = false;
        state.linkedStars = [];
        state.matchedIndices = [];
        state.swipeTargetIndex = 1;
        state.charge = 0;
        state.isCooldown = true;
        state.lastLinkEndTime = Date.now();

        // 8秒冷却
        setTimeout(function () {
            state.isCooldown = false;
        }, COOLDOWN_MS);

        return result;
    }

    /**
     * 联连窗口超时失败
     */
    function failLink() {
        if (!state.isActive) return;
        addMessage('联连超时...', '#ff4444');
        state.isActive = false;
        state.isSlowMotion = false;
        state.swipeActive = false;
        state.linkedStars = [];
        state.matchedIndices = [];
        state.swipeTargetIndex = 1;
        state.charge = 0;
        state.isCooldown = true;
        state.lastLinkEndTime = Date.now();

        setTimeout(function () {
            state.isCooldown = false;
        }, COOLDOWN_MS);
    }

    /**
     * 每帧更新：检查窗口超时
     */
    function update(dt) {
        if (!state.isActive) return;
        if (Date.now() - state.windowStartTime >= WINDOW_DURATION_REAL_MS) {
            failLink();
        }
    }

    /**
     * 获取时间缩放因子（慢动作=0.5，正常=1.0）
     */
    function getTimeScale() {
        return state.isSlowMotion ? SLOW_MOTION_FACTOR : 1.0;
    }

    /**
     * 渲染联连线和序号
     */
    function render(ctx, screenW, screenH, scale) {
        // 充能条（战斗HUD顶部）
        if (state.charge > 0 && !state.isActive && !state.isCooldown) {
            var barW = 150 * scale;
            var barH = 4 * scale;
            var barX = screenW / 2 - barW / 2;
            var barY = 8 * scale;

            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(barX, barY, barW, barH);
            var color = state.charge >= 80 ? '#ff4444' : (state.charge >= 50 ? '#ffaa00' : '#4488ff');
            ctx.fillStyle = color;
            ctx.fillRect(barX, barY, barW * state.charge / 100, barH);

            ctx.font = (10 * scale) + 'px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('联连: ' + Math.floor(state.charge) + '%', screenW / 2, barY - 2 * scale);
        }

        if (!state.isActive) return;

        // 慢动作遮罩
        ctx.fillStyle = 'rgba(0, 0, 50, 0.15)';
        ctx.fillRect(0, 0, screenW, screenH);

        var linked = state.linkedStars;
        if (linked.length < 2) return;

        // 金色虚线连接
        ctx.setLineDash([5 * scale, 5 * scale]);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(linked[0].x, linked[0].y);
        for (var i = 1; i < linked.length; i++) {
            ctx.lineTo(linked[i].x, linked[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // 序号标记
        for (var j = 0; j < linked.length; j++) {
            var ls = linked[j];
            var isMatched = state.matchedIndices.indexOf(ls.index) !== -1;
            var isNext = ls.index === state.swipeTargetIndex;

            // 光环
            ctx.beginPath();
            ctx.arc(ls.x, ls.y, 18 * scale, 0, Math.PI * 2);
            ctx.strokeStyle = isMatched ? 'rgba(0, 255, 100, 0.9)' : (isNext ? 'rgba(255, 255, 0, 0.9)' : 'rgba(255, 215, 0, 0.5)');
            ctx.lineWidth = isNext ? 3 * scale : 2 * scale;
            ctx.stroke();

            // 序号
            ctx.font = 'bold ' + (16 * scale) + 'px sans-serif';
            ctx.fillStyle = isMatched ? '#00ff64' : (isNext ? '#ffff00' : '#ffd700');
            ctx.textAlign = 'center';
            ctx.fillText('' + ls.index, ls.x, ls.y - ls.star.size / 2 - 12 * scale);
        }

        // 窗口计时
        var remaining = Math.max(0, WINDOW_DURATION_REAL_MS - (Date.now() - state.windowStartTime));
        var timerBarW = 120 * scale;
        var timerX = screenW / 2 - timerBarW / 2;
        var timerY = screenH - 15 * scale;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(timerX, timerY, timerBarW, 3 * scale);
        ctx.fillStyle = remaining < 500 ? '#ff4444' : '#ffd700';
        ctx.fillRect(timerX, timerY, timerBarW * remaining / WINDOW_DURATION_REAL_MS, 3 * scale);
    }

    function reset() {
        state.charge = 0;
        state.isActive = false;
        state.isSlowMotion = false;
        state.swipeActive = false;
        state.linkedStars = [];
        state.matchedIndices = [];
        state.swipeTargetIndex = 1;
        state.windowStartTime = 0;
        state.isCooldown = false;
        state.lastLinkEndTime = 0;
    }

    return {
        isUnlocked: isUnlocked,
        addCharge: addCharge,
        getCharge: getCharge,
        beginLinkWindow: beginLinkWindow,
        beginSwipeTracking: beginSwipeTracking,
        trackSwipePath: trackSwipePath,
        endSwipe: endSwipe,
        failLink: failLink,
        isActive: isActive,
        isSlowMotionActive: isSlowMotionActive,
        isOnCooldown: isOnCooldown,
        getLinkedStars: getLinkedStars,
        getTimeScale: getTimeScale,
        update: update,
        render: render,
        reset: reset
    };
}

export { createLinkChainSystem };