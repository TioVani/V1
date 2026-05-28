import Logger from '../utils/Logger.js';
import { SATURATION_COSTS } from './SaturationState.js';
/**
 * D4 灵光联连系统（Link Chain System）
 * 闭包工厂 + 依赖注入模式
 *
 * 生命周期: idle → ready → revealing → waiting → swiping → judging → idle
 *          idle → ready → rhythm_ready → idle
 * - 逐个揭示灵光（每颗300ms发光+链线延伸）
 * - 揭示完毕等500ms → 超时则闪烁200ms失效
 * - 玩家滑动匹配灵光（≥2颗有效）
 * - 松手/停住500ms → 闪烁200ms → 判定生效
 * - 联连灵光全程存活（_linking保护）
 *
 * 解锁条件：角色等级 >= 20
 */

var D4_UNLOCK_LEVEL = 20;

var REVEAL_WAIT_MS = 100;
var LINE_ANIM_MS = 200;
var READY_TIMEOUT_MS = 2000;     // 触发灵光等待玩家触摸时间
var READY_HIT_RADIUS = 40;      // 触发灵光触摸判定半径
var WAIT_TIMEOUT_MS = 2000;
var IDLE_TIMEOUT_MS = 500;
var FLASH_DURATION_MS = 1000;
var CHARGE_PHASES = [
    { phase: 'ready',         threshold: 100, enter: 'enterReady',        priority: 1 },
    { phase: 'ready',         threshold: 150, enter: 'enterReady',        priority: 1 },
    { phase: 'rhythm_ready',  threshold: 200, enter: 'enterRhythmReady',  priority: 2 },
];

var CHARGE_BLOCKED_PHASES = ['revealing', 'waiting', 'swiping', 'judging', 'rhythm_ready'];

var LINK_THRESHOLD = 100;
var SECOND_READY_THRESHOLD = 150;  // 第二次联连窗口触发阈值
var RHYTHM_THRESHOLD = 200;
var LINK_COST = 100;
var RHYTHM_COST = 200;
var MIN_LINKED_STARS = 3;
var MAX_LINKED_STARS = 7;
var MIN_MATCHED = 3;
var LINK_HIT_RADIUS = 35;
var SLOW_MOTION_FACTOR = 0.5;
var IDLE_THRESHOLD = 5;

// 联连倍率表：3颗=联连技，4+颗=强化联连技
var CHAIN_MULTIPLIERS = { 3: 3.0, 4: 4.5, 5: 6.0, 6: 8.0, 7: 12.0 };

function createLinkChainSystem(deps) {
    var getSaveData = deps.getSaveData;
    var isTutorialComplete = deps.isTutorialComplete;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getStars = deps.getStars || function () { return []; };
    var setStars = deps.setStars || function () { };
    var getActiveMonsters = deps.getActiveMonsters || function () { return []; };
    var addMessage = deps.addMessage || function () { };
    var createScreenShake = deps.createScreenShake || function () { };
    var vibrateShort = deps.vibrateShort || function () { };
    var attackMonster = deps.attackMonster || function () { };
    var attackMonstersAOE = deps.attackMonstersAOE || function () { };
    var addScore = deps.addScore || function () { };
    var saturationState = deps.saturationState;
    var getBeautyFrames = deps.getBeautyFrames || function () { return []; };
    var rhythmSkillSystem = deps.rhythmSkillSystem || null;
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };
    var playLinkStart = deps.playLinkStart || function () {};
    var playNormal = deps.playNormal || function () {};
    var createMonsterDamageAnimation = deps.createMonsterDamageAnimation || function () {};
    var createMeteor = deps.createMeteor || function () {};
    var playRainbow = deps.playRainbow || function () {};
    var playQuickTap = deps.playQuickTap || function () {};

    // 内部状态
    var state = {
        phase: 'idle',               // idle|ready|revealing|waiting|swiping|judging|rhythm_ready
        charge: 0,
        linkedStars: [],
        matchedIndices: [],
        swipeTargetIndex: 1,
        revealIndex: 0,
        revealSubPhase: 'star_glow',
        revealSubStartTime: 0,
        revealStartTime: 0,
        revealCompleteTime: 0,
        readyStartTime: 0,           // 触发灵光出现时间
        triggerX: 0,
        triggerY: 0,
        triggerStar: null,
        swipeStartTime: 0,
        idleSinceTime: 0,
        lastSwipeX: 0, lastSwipeY: 0,
        isSlowMotion: false,
        lastLinkEndTime: 0,
        judgeStartTime: 0,
        judgeResult: null,           // 'success'|'fail'
        swipeActive: false,
        resultCallback: null,        // 异步结果回调
        linkMeteors: [],             // 联连流星 [{startX,startY,targetX,targetY,startTime,duration}]
        cumulativeLinkDamage: 0,     // 灵光流星累积伤害
        screenFlash: null,           // 全屏闪白 { startTime, duration, peakAlpha }
        shockwaveRings: [],           // 全屏冲击波环 [{ startTime, duration, color, startRadius, endRadius }]
        shockwaveOrigin: null,        // 冲击波扩散中心（触发灵光位置）
        pendingMeteors: []            // 联连灵光流星雨调度 [{ star, delayMs, launched }]
    };

    function isUnlocked() {
        if (isTutorialComplete && isTutorialComplete()) return true;
        var pd = getSaveData();
        if (!pd || !pd.currentCharacterId) return false;
        var charExp = pd.characterExperience;
        if (!charExp || !charExp[pd.currentCharacterId]) return false;
        return charExp[pd.currentCharacterId].level >= D4_UNLOCK_LEVEL;
    }

    function isActive() { return state.phase !== 'idle' && state.phase !== 'rhythm_ready'; }
    function isReady() { return state.phase === 'ready'; }
    function isRhythmReady() { return state.phase === 'rhythm_ready'; }
    function getTriggerX() { return state.triggerX; }
    function getTriggerY() { return state.triggerY; }
    function isSlowMotionActive() { return state.isSlowMotion; }
    function getCharge() { return state.charge; }
    function getLinkedStars() { return state.linkedStars; }
    function getPhase() { return state.phase; }

    // ── 消耗 ──

    function consumeLink() {
        state.charge = Math.max(0, state.charge - LINK_COST);
    }

    function consumeRhythm() {
        state.charge = Math.max(0, state.charge - RHYTHM_COST);
    }

    // ── 充能辅助 ──

    function canCharge() {
        if (!isUnlocked()) return false;
        if (CHARGE_BLOCKED_PHASES.indexOf(state.phase) !== -1) return false;
        if (rhythmSkillSystem && rhythmSkillSystem.isActive()) return false;
        return true;
    }

    function resolveChargePhase(prev, next) {
        for (var i = 0; i < CHARGE_PHASES.length; i++) {
            var def = CHARGE_PHASES[i];
            if (prev < def.threshold && next >= def.threshold) {
                return def;
            }
        }
        return null;
    }

    function cancelReady(reason) {
        if (state.triggerStar) {
            state.triggerStar._linking = false;
            state.triggerStar.disappearTime = state.triggerStar._linkingOriginalDisappearTime || Date.now() + 5000;
            state.triggerStar = null;
        }
        addMessage(reason || '联连超时，继续充能...', '#ffaa00');
        state.phase = 'idle';
    }

    function enterPhase(phaseName) {
        switch (phaseName) {
            case 'ready':
                return enterReady();
            case 'rhythm_ready':
                return enterRhythmReady();
            default:
                Logger.warn('[LinkChainSystem] enterPhase: unknown phase', phaseName);
        }
    }

    // ── 充能 ──

    function addCharge(amount) {
        if (!canCharge()) return;

        var prev = state.charge;
        state.charge = Math.min(RHYTHM_THRESHOLD, prev + amount);

        var triggered = resolveChargePhase(prev, state.charge);
        if (!triggered) return;

        if (state.phase === 'ready' && triggered.phase === 'rhythm_ready') {
            cancelReady('充能满溢! 联连窗口已跳过!');
        }

        enterPhase(triggered.phase);

        var safety = 0;
        while (safety < 10) {
            var next = resolveChargePhase(prev, state.charge);
            if (!next || next === triggered) break;
            triggered = next;

            if (state.phase === 'ready' && triggered.phase === 'rhythm_ready') {
                cancelReady('充能满溢! 联连窗口已跳过!');
            }

            enterPhase(triggered.phase);
            safety++;
        }
    }

    // ── 进入 ready 阶段：随机选一颗灵光作为触发灵光 ──

    function enterReady() {
        var stars = typeof getStars === 'function' ? getStars() : [];
        if (!stars || stars.length < MIN_LINKED_STARS) {
            return;
        }

        // 找可用的灵光
        var available = [];
        for (var i = 0; i < stars.length; i++) {
            if (!stars[i]._charging && !stars[i]._dragging && !stars[i]._linking) {
                available.push(stars[i]);
            }
        }
        if (available.length < MIN_LINKED_STARS) {
            return;
        }

        // 随机选一颗作为触发灵光
        var triggerStar = available[Math.floor(Math.random() * available.length)];
        triggerStar._linking = true;
        triggerStar._linkingOriginalDisappearTime = triggerStar.disappearTime;
        triggerStar.disappearTime = Date.now() + 86400000;

        state.phase = 'ready';
        state.readyStartTime = Date.now();
        state.triggerStar = triggerStar;
        state.triggerX = triggerStar.x;
        state.triggerY = triggerStar.y;
        addMessage('联连就绪! 触摸发光灵光!', '#FFD700', true);
        vibrateShort({ type: 'medium' });
    }

    // ── 进入 rhythm_ready 阶段：清理触发灵光，激活节奏灵光 ──

    function enterRhythmReady() {
        // 清理触发灵光（恢复原状态）
        if (state.triggerStar) {
            state.triggerStar._linking = false;
            state.triggerStar.disappearTime = state.triggerStar._linkingOriginalDisappearTime || Date.now() + 5000;
            state.triggerStar = null;
        }
        state.phase = 'rhythm_ready';
        // 委托给 RhythmSkillSystem 创建节奏灵光
        if (rhythmSkillSystem) rhythmSkillSystem.enter();
        addMessage('充能满溢! 进入节奏阶段!', '#00FFFF', true);
        Logger.info('[LinkChainSystem] enterRhythmReady: charge=', state.charge);
    }

    // ── 节奏技结算完成回调 ──

    function onRhythmSkillComplete() {
        consumeRhythm();
        state.phase = 'idle';
        Logger.info('[LinkChainSystem] onRhythmSkillComplete: -200, charge=', state.charge);
    }

    // ── 触摸触发灵光 → 开始联连 ──

    function handleTriggerTouch(x, y) {
        if (state.phase !== 'ready') return false;
        var scale = getScreenScale ? getScreenScale() : 1;
        var dx = x - state.triggerX;
        var dy = y - state.triggerY;
        if (Math.sqrt(dx * dx + dy * dy) < READY_HIT_RADIUS * scale) {
            beginLinkWindow();
            // beginLinkWindow已设置 matchedIndices=[1], swipeTargetIndex=2, swipeActive=true
            state.lastSwipeX = x;
            state.lastSwipeY = y;
            return true;
        }
        return false;
    }

    // ── 触发联连窗口（触发灵光作为第一颗） ──

    function beginLinkWindow() {
        playLinkStart();
        var triggerStar = state.triggerStar;
        if (!triggerStar) {
            Logger.warn('[LinkChainSystem] beginLinkWindow: triggerStar is null, consuming link cost');
            consumeLink();
            state.phase = 'idle';
            return;
        }

        var stars = typeof getStars === 'function' ? getStars() : [];

        // 可用灵光（排除触发灵光和已被其他系统占用的）
        var available = [];
        for (var i = 0; i < stars.length; i++) {
            if (stars[i] === triggerStar) continue;
            if (stars[i]._charging || stars[i]._dragging || stars[i]._linking) continue;
            available.push(stars[i]);
        }

        // 需要至少 MIN_LINKED_STARS-1 颗额外灵光（触发灵光已经是第1颗）
        var needExtra = MIN_LINKED_STARS - 1;
        if (available.length < needExtra) {
            // 不够灵光 → 取消，恢复触发灵光
            Logger.warn('[LinkChainSystem] beginLinkWindow: not enough stars (need', needExtra, 'got', available.length, '), consuming link cost');
            triggerStar._linking = false;
            triggerStar.disappearTime = triggerStar._linkingOriginalDisappearTime || Date.now() + 5000;
            consumeLink();
            state.phase = 'idle';
            return;
        }

        // 随机选 needExtra ~ min(MAX_LINKED_STARS-1, available.length) 颗额外灵光
        var maxExtra = Math.min(MAX_LINKED_STARS - 1, available.length);
        var extraCount = needExtra + Math.floor(Math.random() * (maxExtra - needExtra + 1));

        // Fisher-Yates shuffle
        var shuffled = available.slice();
        for (var j = shuffled.length - 1; j > 0; j--) {
            var k = Math.floor(Math.random() * (j + 1));
            var tmp = shuffled[j];
            shuffled[j] = shuffled[k];
            shuffled[k] = tmp;
        }

        // 构建联连灵光列表：触发灵光 = 第1颗，其余按序
        state.linkedStars = [{
            star: triggerStar,
            index: 1,
            x: triggerStar.x,
            y: triggerStar.y
        }];

        for (var s = 0; s < extraCount; s++) {
            var star = shuffled[s];
            star._linking = true;
            star._linkingOriginalDisappearTime = star.disappearTime;
            star.disappearTime = Date.now() + 86400000;
            state.linkedStars.push({
                star: star,
                index: state.linkedStars.length + 1,
                x: star.x,
                y: star.y
            });
        }

        state.phase = 'revealing';
        state.isSlowMotion = true;
        state.swipeActive = true;   // 触摸触发灵光后立即开始滑动
        state.matchedIndices = [1]; // 第1颗已匹配
        state.swipeTargetIndex = 2; // 下一个目标是第2颗
        state.revealIndex = 0;
        state.revealSubPhase = 'star_glow';
        state.revealSubStartTime = Date.now();
        state.revealStartTime = Date.now();
        state.revealCompleteTime = 0;
        consumeLink();
        state.idleSinceTime = 0;

        addMessage('联连窗口激活!', '#FFD700', true);
        vibrateShort({ type: 'heavy' });
    }

    // ── 开始跟踪滑动 ──

    function beginSwipeTracking(x, y) {
        if (state.phase !== 'waiting' && state.phase !== 'revealing') return;
        state.phase = 'swiping';
        state.swipeActive = true;
        state.swipeStartTime = Date.now();
        state.idleSinceTime = 0;
        state.lastSwipeX = x || 0;
        state.lastSwipeY = y || 0;
        addMessage('开始划链!', '#FFD700');
    }

    // ── 追踪滑动路径 ──

    function trackSwipePath(x, y) {
        if (state.phase !== 'swiping' && state.phase !== 'revealing' && state.phase !== 'waiting') return;
        if (state.matchedIndices.length >= state.linkedStars.length) return;

        var scale = getScreenScale ? getScreenScale() : 1;
        var designOffsetY = getDesignOffsetY();
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
                addMessage('联连 ' + ls.index, '#FFD700');
                playNormal();
                ls._matchTime = Date.now();

                // 每划过一颗 → 发射流星 + 得分
                addScore(5);
                var aliveMonsters = getActiveMonsters();
                if (aliveMonsters && aliveMonsters.length > 0) {
                    var ltarget = aliveMonsters[Math.floor(Math.random() * aliveMonsters.length)];
                    state.cumulativeLinkDamage += 20;
                    state.linkMeteors.push({
                        startX: ls.x,
                        startY: ls.y,
                        targetX: ltarget.x || (getScreenWidth ? getScreenWidth() / 2 : 188),
                        targetY: ltarget.y || (designOffsetY + Math.floor(271 * scale)),
                        startTime: Date.now(),
                        duration: 300
                    });
                    // 每创建一个投射物 → 播放 Rainbow 音效（pitch 1.0-1.9 随机）
                    playRainbow(1.0 + Math.random() * 0.9);
                    // 0.35秒后播放 QuickTap 音效
                    setTimeout(function() { playQuickTap(); }, 350);
                }
                break;
            }
        }

        // 手指停住检测
        var moveDelta = Math.sqrt((x - state.lastSwipeX) * (x - state.lastSwipeX) + (y - state.lastSwipeY) * (y - state.lastSwipeY));
        if (moveDelta < IDLE_THRESHOLD) {
            if (!state.idleSinceTime) state.idleSinceTime = Date.now();
        } else {
            state.idleSinceTime = 0;
            state.lastSwipeX = x;
            state.lastSwipeY = y;
        }
    }

    // ── 结束滑动（松手） ──

    function endSwipe() {
        if (state.phase === 'waiting' || state.phase === 'revealing') {
            // 没开始滑就松手 → 闪烁后失效
            enterJudging('fail');
            return null;
        }
        if (state.phase === 'swiping') {
            enterJudging(state.matchedIndices.length >= MIN_MATCHED ? 'success' : 'fail');
            return null;
        }
        return null;
    }

    // ── 进入判定闪烁 ──

    function enterJudging(result) {
        state.phase = 'judging';
        state.judgeStartTime = Date.now();
        state.judgeResult = result || (state.matchedIndices.length >= MIN_MATCHED ? 'success' : 'fail');
        state.swipeActive = false;

        if (state.judgeResult === 'success') {
            playLinkStart();
            var now = Date.now();
            var isEnhanced = state.matchedIndices.length > 3;
            var screenW = getScreenWidth ? getScreenWidth() : 375;
            var screenH = getScreenHeight ? getScreenHeight() : 667;
            var maxDimension = Math.max(screenW, screenH);

            state.screenFlash = { startTime: now, duration: 300, peakAlpha: isEnhanced ? 0.6 : 0.4 };
            state.shockwaveOrigin = { x: state.linkedStars[0].x, y: state.linkedStars[0].y };
            state.shockwaveRings = [{
                startTime: now, duration: 600,
                color: '#FFD700', startRadius: 0, endRadius: maxDimension * 1.2
            }];
            if (isEnhanced) {
                state.shockwaveRings.push({
                    startTime: now + 100, duration: 500,
                    color: '#FF8C00', startRadius: 0, endRadius: maxDimension * 1.2
                });
            }

            // ── 联连灵光流星雨调度 ──
            // 收集所有匹配成功的联连灵光，按冲击波进度分配发射延迟
            var matchedLs = [];
            for (var i = 0; i < state.linkedStars.length; i++) {
                if (state.matchedIndices.indexOf(state.linkedStars[i].index) !== -1) {
                    matchedLs.push(state.linkedStars[i]);
                }
            }
            var ringDur = state.shockwaveRings[0].duration || 600;
            var totalCount = matchedLs.length;
            if (totalCount > 0) {
                var firstDelay = 0.20;  // 第一颗在进展 20%
                var remaining = totalCount > 1 ? (0.95 - firstDelay) / (totalCount - 1) : 0;
                for (var j = 0; j < totalCount; j++) {
                    var fraction = j === 0 ? firstDelay : firstDelay + remaining * j;
                    state.pendingMeteors.push({
                        star: matchedLs[j].star,
                        delayMs: fraction * ringDur,
                        launched: false
                    });
                }
            }

            for (var i = 0; i < state.linkedStars.length; i++) {
                if (state.matchedIndices.indexOf(state.linkedStars[i].index) !== -1) {
                    state.linkedStars[i]._allMatchedTime = now;
                }
            }
        }
    }

    // ── 判定结果生效 ──

    function applyJudgeResult() {
        var result = null;

        if (state.judgeResult === 'success') {
            var matchedCount = state.matchedIndices.length;
            var multiplier = CHAIN_MULTIPLIERS[matchedCount] || CHAIN_MULTIPLIERS[3];
            var isEnhanced = matchedCount > 3;

            var monsters = getActiveMonsters();
            var pd = getSaveData();
            var baseAtk = pd.totalAttack || 50;

            // 伤害飞字 + 受击闪烁（先创建飞字动画，再走统一伤害管线）
            var dmgPerTarget = Math.floor(baseAtk * multiplier);
            for (var m = 0; m < monsters.length; m++) {
                var mon = monsters[m];
                if (mon.hp <= 0 || !mon.active) continue;
                createMonsterDamageAnimation({ x: mon.x, y: mon.y }, dmgPerTarget);
                mon._hitFlashUntil = Date.now() + 200;
            }

            var aoeResult = attackMonstersAOE({
                raw: dmgPerTarget,
                starType: 'normal',
                targets: monsters
            });

            var totalDamage = dmgPerTarget * monsters.filter(function(m) { return m.active; }).length;

            var label = isEnhanced ? '强化联连技' : '联连技';
            addMessage(label + '! ' + matchedCount + '连 ×' + multiplier + ' -' + totalDamage, '#FFD700', true);
            createScreenShake(isEnhanced ? 12 : 8);
            vibrateShort({ type: 'heavy' });

            // 联连技得分：基础30分，强化每多1颗+10分
            addScore(30 + (matchedCount > 3 ? (matchedCount - 3) * 10 : 0));

            if (saturationState) saturationState.recover(SATURATION_COSTS.LINK_RECOVERY);

            result = {
                success: true,
                matchedCount: matchedCount,
                multiplier: multiplier,
                totalDamage: totalDamage
            };
        } else {
            addMessage('联连失效...', '#ff4444');
            result = { success: false, matchedCount: state.matchedIndices.length };
        }

        // 清理灵光保护
        if (state.judgeResult === 'success') {
            // 成功：消耗灵光（从共享数组移除）
            var starsArr = getStars();
            var newStars = [];
            for (var i = 0; i < starsArr.length; i++) {
                var keep = true;
                for (var j = 0; j < state.linkedStars.length; j++) {
                    if (starsArr[i] === state.linkedStars[j].star) {
                        starsArr[i]._linking = false;
                        keep = false;
                        break;
                    }
                }
                if (keep) newStars.push(starsArr[i]);
            }
            setStars(newStars);
        } else {
            // 失败：灵光恢复正常生命周期
            for (var k = 0; k < state.linkedStars.length; k++) {
                state.linkedStars[k].star._linking = false;
                state.linkedStars[k].star.disappearTime = state.linkedStars[k].star._linkingOriginalDisappearTime || Date.now() + 5000;
            }
        }

        // 重置状态
        state.linkedStars = [];
        state.matchedIndices = [];
        state.swipeTargetIndex = 1;
        state.revealIndex = 0;
        state.isSlowMotion = false;
        state.judgeResult = null;
        state.idleSinceTime = 0;
        state.linkMeteors = [];
        state.cumulativeLinkDamage = 0;
        // screenFlash/shockwaveRings/shockwaveOrigin keep rendering during idle phase, expire naturally
        state.phase = 'idle';
        state.lastLinkEndTime = Date.now();

        // 异步回调
        if (state.resultCallback) {
            state.resultCallback(result);
            state.resultCallback = null;
        }

        return result;
    }

    // ── 冲击波扫过灵光 → 引爆为流星 ──

    function triggerStarMeteor(star) {
        var monsters = getActiveMonsters();
        if (!monsters || monsters.length === 0) return;

        // 找最近怪物
        var nearest = null;
        var nearestDist = Infinity;
        for (var m = 0; m < monsters.length; m++) {
            var mon = monsters[m];
            if (mon.hp <= 0 || !mon.active) continue;
            var mdx = (mon.x || 0) - star.x;
            var mdy = (mon.y || 0) - star.y;
            var dist = mdx * mdx + mdy * mdy;
            if (dist < nearestDist) { nearestDist = dist; nearest = mon; }
        }

        if (!nearest || !createMeteor) return;

        var sw = getScreenWidth ? getScreenWidth() : 375;
        var sh = getScreenHeight ? getScreenHeight() : 667;
        var pd = getSaveData();
        var baseAtk = pd.totalAttack || 50;
        var dmg = Math.floor(baseAtk * 0.5);

        createMeteor(
            star.x, star.y,
            dmg, false,
            star.type || 'normal',
            0, 1,
            function() {
                if (nearest && nearest.hp > 0) {
                    var applied = dmg;
                    if (nearest.shield && nearest.shield > 0) {
                        if (applied <= nearest.shield) { nearest.shield -= applied; }
                        else { applied -= nearest.shield; nearest.shield = 0; nearest.hp = Math.max(0, nearest.hp - applied); }
                    } else {
                        nearest.hp = Math.max(0, nearest.hp - applied);
                    }
                    addMessage('冲击波流星 -' + applied, '#FF8C00');
                }
            },
            { x: nearest.x || sw / 2, y: nearest.y || sh / 3, heroic: true }
        );

        // 标记灵光消失
        star.disappearTime = Date.now() - 1;
    }

    function detectShockwaveStarHits(now) {
        for (var ri = 0; ri < state.shockwaveRings.length; ri++) {
            var ring = state.shockwaveRings[ri];
            var ringElapsed = now - ring.startTime;
            if (ringElapsed < 0 || ringElapsed >= ring.duration) continue;

            var ringProgress = ringElapsed / ring.duration;
            var ringRadius = ring.startRadius + (ring.endRadius - ring.startRadius) * ringProgress;

            var ox = state.shockwaveOrigin ? state.shockwaveOrigin.x : (getScreenWidth ? getScreenWidth() / 2 : 188);
            var oy = state.shockwaveOrigin ? state.shockwaveOrigin.y : (getScreenHeight ? getScreenHeight() / 3 : 271);

            var stars = getStars();
            for (var si = 0; si < stars.length; si++) {
                var s = stars[si];
                if (s._linking || s._charging || s._dragging || s._rhythm) continue;
                if (s._shockwaveTriggered) continue;

                var dx = s.x - ox;
                var dy = s.y - oy;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= ringRadius) {
                    s._shockwaveTriggered = true;
                    triggerStarMeteor(s);
                }
            }
        }
    }

    // ── 联连超时失效（仅用于waiting阶段超时） ──

    function failLink() {
        enterJudging('fail');
    }

    // ── 每帧更新 ──

    function update(dt) {
        var now = Date.now();

        // 清理过期特效
        if (state.screenFlash && now - state.screenFlash.startTime >= state.screenFlash.duration) {
            state.screenFlash = null;
        }

        // 冲击波碰撞检测：扫过灵光引爆为流星
        if (state.shockwaveRings.length > 0) {
            detectShockwaveStarHits(now);
        }

        // ── 联连灵光流星雨：按冲击波延迟发射 ──
        if (state.pendingMeteors.length > 0 && state.shockwaveRings.length > 0) {
            var ringStartTime = state.shockwaveRings[0].startTime;
            var ringDuration = state.shockwaveRings[0].duration || 600;
            var ringElapsed = now - ringStartTime;
            for (var mi = state.pendingMeteors.length - 1; mi >= 0; mi--) {
                var pm = state.pendingMeteors[mi];
                if (!pm.launched && ringElapsed >= pm.delayMs) {
                    pm.launched = true;
                    triggerStarMeteor(pm.star);
                    state.pendingMeteors.splice(mi, 1);
                }
            }
        }

        // 清理过期流星
        var activeMeteors = [];
        for (var m = 0; m < state.linkMeteors.length; m++) {
            if (now - state.linkMeteors[m].startTime < state.linkMeteors[m].duration) {
                activeMeteors.push(state.linkMeteors[m]);
            }
        }
        state.linkMeteors = activeMeteors;

        // ready: 触发灵光等待玩家触摸（2000ms超时）
        if (state.phase === 'ready') {
            if (Date.now() - state.readyStartTime >= READY_TIMEOUT_MS) {
                cancelReady('联连超时，继续充能...');
            }
            return;
        }

        // rhythm_ready: 委托给 rhythmSkillSystem 处理缩圈超时
        if (state.phase === 'rhythm_ready') {
            if (rhythmSkillSystem) rhythmSkillSystem.update(dt);
            return;
        }

        // revealing: 逐个揭示（star_glow → line_anim → next star）
        if (state.phase === 'revealing') {
            var elapsed = Date.now() - state.revealSubStartTime;
            if (state.revealSubPhase === 'star_glow') {
                if (elapsed >= REVEAL_WAIT_MS) {
                    // 灵光发光完毕 → 开始连线动画（到下一颗）
                    if (state.revealIndex < state.linkedStars.length - 1) {
                        state.revealSubPhase = 'line_anim';
                        state.revealSubStartTime = Date.now();
                    } else {
                        // 最后一颗无连线 → 如果正在滑动则直接进入swiping，否则进入waiting
                        state.revealCompleteTime = Date.now();
                        if (state.swipeActive) {
                            state.phase = 'swiping';
                        } else {
                            state.phase = 'waiting';
                            addMessage('按序划链!', '#FFD700');
                        }
                    }
                }
            } else if (state.revealSubPhase === 'line_anim') {
                if (elapsed >= LINE_ANIM_MS) {
                    // 连线动画完毕 → 推进到下一颗灵光发光
                    state.revealIndex++;
                    state.revealSubPhase = 'star_glow';
                    state.revealSubStartTime = Date.now();
                }
            }
            return;
        }

        // waiting: 等待500ms让玩家开始滑动
        if (state.phase === 'waiting') {
            if (Date.now() - state.revealCompleteTime >= WAIT_TIMEOUT_MS) {
                failLink();
            }
            return;
        }

        // swiping: 全部滑完自动判定成功
        if (state.phase === 'swiping') {
            if (state.matchedIndices.length >= state.linkedStars.length) {
                enterJudging('success');
                return;
            }
            return;
        }

        // judging: 闪烁200ms后生效
        if (state.phase === 'judging') {
            if (Date.now() - state.judgeStartTime >= FLASH_DURATION_MS) {
                applyJudgeResult();
            }
            return;
        }
    }

    function getTimeScale() {
        return state.isSlowMotion ? SLOW_MOTION_FACTOR : 1.0;
    }

    // ── 渲染 ──

    function render(ctx, screenW, screenH, scale) {
        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(812 * scale), screenH);
        // 充能条：idle/ready/rhythm_ready 阶段显示
        var showBar = isUnlocked() && (state.phase === 'idle' ||
            state.phase === 'ready' || state.phase === 'rhythm_ready');
        if (showBar) {
            var hpBarY = designBottom - Math.floor(50 * scale);
            var barW = Math.floor(200 * scale);
            var barH = Math.floor(Math.max(1, 1 * scale));  // 1px细线
            var barX = screenW / 2 - barW / 2;
            var barY = hpBarY - barH - Math.floor(2 * scale);

            // 背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(barX, barY, barW, barH);

            var charge = state.charge;

            if (charge > 0) {
                if (charge <= LINK_THRESHOLD) {
                    // 0→100：金色填充
                    var goldFillW = barW * charge / RHYTHM_THRESHOLD;
                    ctx.fillStyle = '#FFD700';
                    ctx.shadowBlur = 4 * scale;
                    ctx.shadowColor = '#FFD700';
                    ctx.fillRect(barX, barY, goldFillW, barH);
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';

                    // ≥80%脉动（保留现有行为）
                    if (charge >= 80) {
                        var pulseAlpha = 0.2 + 0.2 * Math.sin(Date.now() / 100);
                        ctx.fillStyle = 'rgba(255, 215, 0, ' + pulseAlpha.toFixed(2) + ')';
                        ctx.fillRect(barX - 2 * scale, barY - 2 * scale, goldFillW + 4 * scale, barH + 4 * scale);
                    }
                } else {
                    // 100→200：双色填充，前半金后半青
                    var goldHalfW = barW * LINK_THRESHOLD / RHYTHM_THRESHOLD;
                    ctx.fillStyle = '#FFD700';
                    ctx.shadowBlur = 4 * scale;
                    ctx.shadowColor = '#FFD700';
                    ctx.fillRect(barX, barY, goldHalfW, barH);
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';

                    var cyanW = barW * (charge - LINK_THRESHOLD) / RHYTHM_THRESHOLD;
                    ctx.fillStyle = '#00FFFF';
                    ctx.shadowBlur = 6 * scale;
                    ctx.shadowColor = '#00FFFF';
                    ctx.fillRect(barX + goldHalfW, barY, cyanW, barH);
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';
                }

                // 200 阶段：青色强发光+脉动
                if (charge >= RHYTHM_THRESHOLD) {
                    var cyanPulse = 0.3 + 0.3 * Math.abs(Math.sin(Date.now() / 80));
                    ctx.fillStyle = 'rgba(0, 255, 255, ' + cyanPulse.toFixed(2) + ')';
                    ctx.fillRect(barX - 3 * scale, barY - 3 * scale, barW + 6 * scale, barH + 6 * scale);
                }
            }
        }

        // 节奏阶段：不渲染联连相关内容（节奏灵光由 RhythmSkillSystem 渲染）
        if (state.phase === 'rhythm_ready') return;

        if (state.phase === 'idle' && !state.screenFlash && state.shockwaveRings.length === 0) return;

        // ready 阶段：触发灵光（跳动 + GC发光，在灵光原位）
        if (state.phase === 'ready') {
            var beautyFrames = getBeautyFrames();
            var triggerStar = state.triggerStar;
            var tx = state.triggerX;
            var ty = state.triggerY;
            var now = Date.now();
            var readyElapsed = now - state.readyStartTime;

            // 跳动效果（上下浮动）
            var bounceY = Math.sin(now / 150) * 8 * scale;
            var drawY = ty + bounceY;

            // 跳动缩放（脉动）
            var bounceScale = 1.2 + 0.3 * Math.abs(Math.sin(now / 200));

            // 灵光本体（用触发灵光的emoji和size）
            var baseSize = (triggerStar ? triggerStar.size || 48 : 48);
            var starSize = baseSize * scale * bounceScale;

            // GC序列帧发光（1.5倍灵光大小）
            if (beautyFrames && beautyFrames.length > 0) {
                var bfIdx = Math.floor(now / 60) % beautyFrames.length;
                var bfImg = beautyFrames[bfIdx];
                if (bfImg && bfImg.complete) {
                    var gcSz = starSize * 1.5;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(bfImg, tx - gcSz / 2, drawY - gcSz / 2, gcSz, gcSz);
                    ctx.globalCompositeOperation = 'source-over';
                }
            }
            var emoji = triggerStar ? (triggerStar.emoji || '⭐') : '✦';
            ctx.font = starSize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFD700';
            ctx.shadowBlur = 20 * scale;
            ctx.shadowColor = '#FFD700';
            ctx.fillText(emoji, tx, drawY);
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            // 光环
            var ringR = 28 * scale * bounceScale;
            ctx.beginPath();
            ctx.arc(tx, drawY, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();

            // 倒计时提示
            var remainMs = Math.max(0, READY_TIMEOUT_MS - readyElapsed);
            ctx.font = (10 * scale) + 'px sans-serif';
            ctx.fillStyle = remainMs < 500 ? '#ff4444' : '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText('触摸!', tx, drawY - ringR - 8 * scale);
            return;
        }

        // 慢动作遮罩（仅慢动作期间）
        if (state.isSlowMotion) {
            ctx.fillStyle = 'rgba(0, 0, 50, 0.15)';
            ctx.fillRect(0, 0, screenW, screenH);
        }

        // ── 全屏闪白 ──
        var nowFx = Date.now();
        if (state.screenFlash) {
            var flashElapsed = nowFx - state.screenFlash.startTime;
            if (flashElapsed < state.screenFlash.duration) {
                var flashAlpha = state.screenFlash.peakAlpha * (1 - flashElapsed / state.screenFlash.duration);
                ctx.fillStyle = 'rgba(255,255,255,' + flashAlpha.toFixed(3) + ')';
                ctx.fillRect(0, 0, screenW, screenH);
            } else {
                state.screenFlash = null;
            }
        }

        // ── 全屏冲击波环 ──
        var activeRings = [];
        for (var ri = 0; ri < state.shockwaveRings.length; ri++) {
            var ring = state.shockwaveRings[ri];
            var ringElapsed = nowFx - ring.startTime;
            if (ringElapsed >= 0 && ringElapsed < ring.duration) {
                var ringProgress = ringElapsed / ring.duration;
                var ringRadius = ring.startRadius + (ring.endRadius - ring.startRadius) * ringProgress;
                var ringAlpha = 1 - ringProgress;
                var ringWidth = 3 + ringProgress * 9;

                var ringCx = state.shockwaveOrigin ? state.shockwaveOrigin.x : screenW / 2;
                var ringCy = state.shockwaveOrigin ? state.shockwaveOrigin.y : screenH / 3;

                ctx.beginPath();
                ctx.arc(ringCx, ringCy, ringRadius, 0, Math.PI * 2);
                // Parse hex color to rgba
                var rHex = parseInt(ring.color.slice(1, 3), 16);
                var gHex = parseInt(ring.color.slice(3, 5), 16);
                var bHex = parseInt(ring.color.slice(5, 7), 16);
                ctx.strokeStyle = 'rgba(' + rHex + ',' + gHex + ',' + bHex + ',' + ringAlpha.toFixed(3) + ')';
                ctx.lineWidth = ringWidth * scale;
                ctx.stroke();

                // 金色光晕：环内区域淡金色填充
                var innerAlpha = 0.10 + 0.05 * Math.sin(nowFx / 120);
                ctx.fillStyle = 'rgba(255, 215, 0, ' + innerAlpha.toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(ringCx, ringCy, ringRadius * 0.85, 0, Math.PI * 2);
                ctx.fill();

                activeRings.push(ring);
            } else if (ringElapsed < 0) {
                // Ring hasn't started yet (delayed ring)
                activeRings.push(ring);
            }
        }
        state.shockwaveRings = activeRings;

        var linked = state.linkedStars;
        if (linked.length < 2) return;

        // 计算揭示范围
        var visibleCount;
        var lineAnimProgress = 0;
        var lineAnimFrom = -1; // 正在连线动画的起点索引

        if (state.phase === 'revealing') {
            visibleCount = state.revealSubPhase === 'line_anim'
                ? state.revealIndex + 2   // 连线动画中，终点已可见
                : state.revealIndex + 1;  // 灵光发光中
            if (state.revealSubPhase === 'line_anim') {
                lineAnimFrom = state.revealIndex;
                lineAnimProgress = Math.min(1, (Date.now() - state.revealSubStartTime) / LINE_ANIM_MS);
            }
        } else {
            visibleCount = linked.length;
        }

        // 判定闪烁
        var lineAlpha = 0.8;
        if (state.phase === 'judging') {
            lineAlpha = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 50));
        }

        // 链线（已完成的连线段 + 正在动画的连线段）
        if (visibleCount >= 2) {
            ctx.setLineDash([5 * scale, 5 * scale]);
            ctx.strokeStyle = 'rgba(255, 215, 0, ' + lineAlpha.toFixed(2) + ')';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.moveTo(linked[0].x, linked[0].y);
            var drawUpTo = state.phase === 'revealing' ? state.revealIndex : visibleCount - 1;
            for (var i = 1; i <= drawUpTo; i++) {
                ctx.lineTo(linked[i].x, linked[i].y);
            }
            // 连线动画：从当前揭示灵光渐变到下一颗
            if (lineAnimFrom >= 0 && lineAnimProgress > 0) {
                var fromStar = linked[lineAnimFrom];
                var toStar = linked[lineAnimFrom + 1];
                var animX = fromStar.x + (toStar.x - fromStar.x) * lineAnimProgress;
                var animY = fromStar.y + (toStar.y - fromStar.y) * lineAnimProgress;
                ctx.lineTo(animX, animY);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 灵光环 + 序号 + GC特效
        var beautyFrames = getBeautyFrames();
        for (var j = 0; j < visibleCount; j++) {
            var ls = linked[j];
            var isMatched = state.matchedIndices.indexOf(ls.index) !== -1;
            var isNext = ls.index === state.swipeTargetIndex;
            var isCurrentReveal = (state.phase === 'revealing' && j === state.revealIndex && state.revealSubPhase === 'star_glow');
            var isFirstStarReveal = (state.phase === 'revealing' && j === 0 && state.revealSubPhase === 'star_glow');

            // 匹配放大动画：单颗划过300ms从2倍缩回1倍 + 全部激活时300ms从2倍缩回1倍
            var matchAnimScale = 1;
            if (isMatched && ls._allMatchedTime) {
                var allMatchElapsed = Date.now() - ls._allMatchedTime;
                if (allMatchElapsed < 300) {
                    matchAnimScale = 2 - (allMatchElapsed / 300);
                }
            } else if (isMatched && ls._matchTime) {
                var matchElapsed = Date.now() - ls._matchTime;
                if (matchElapsed < 300) {
                    matchAnimScale = 2 - (matchElapsed / 300);
                }
            }

            // 第一颗灵光：GC序列帧大发光特效
            if (isFirstStarReveal && beautyFrames && beautyFrames.length > 0) {
                var bfIndex = Math.floor(Date.now() / 60) % beautyFrames.length;
                var bfImg = beautyFrames[bfIndex];
                if (bfImg && bfImg.complete) {
                    var gcSize = (ls.star.size || 48) * scale * 2.5 * matchAnimScale;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(bfImg, ls.x - gcSize / 2, ls.y - gcSize / 2, gcSize, gcSize);
                    ctx.globalCompositeOperation = 'source-over';
                }
            }

            // 匹配灵光 GC特效（单颗划过 或 全部激活时）
            if (isMatched && matchAnimScale > 1 && beautyFrames && beautyFrames.length > 0) {
                var mbfIndex = Math.floor(Date.now() / 60) % beautyFrames.length;
                var mbfImg = beautyFrames[mbfIndex];
                if (mbfImg && mbfImg.complete) {
                    var mGcSize = (ls.star.size || 48) * scale * 1.8 * matchAnimScale;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(mbfImg, ls.x - mGcSize / 2, ls.y - mGcSize / 2, mGcSize, mGcSize);
                    ctx.globalCompositeOperation = 'source-over';
                }
            }

            // 全部激活时（_allMatchedTime存在，scale=1阶段也显示GC）
            if (isMatched && ls._allMatchedTime && beautyFrames && beautyFrames.length > 0) {
                var amElapsed = Date.now() - ls._allMatchedTime;
                if (amElapsed < 300) {
                    var abfIndex = Math.floor(Date.now() / 60) % beautyFrames.length;
                    var abfImg = beautyFrames[abfIndex];
                    if (abfImg && abfImg.complete) {
                        var aGcSize = (ls.star.size || 48) * scale * 2.0 * matchAnimScale;
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.drawImage(abfImg, ls.x - aGcSize / 2, ls.y - aGcSize / 2, aGcSize, aGcSize);
                        ctx.globalCompositeOperation = 'source-over';
                    }
                }
            }

            // 光环（跟着放大）
            var ringRadius = 18 * scale * matchAnimScale;
            if (isCurrentReveal) {
                ringRadius = (18 * scale + 8 * scale) * matchAnimScale;
            }

            ctx.beginPath();
            ctx.arc(ls.x, ls.y, ringRadius, 0, Math.PI * 2);

            if (isMatched) {
                ctx.strokeStyle = 'rgba(0, 255, 100, 0.9)';
                ctx.lineWidth = 3 * scale;
            } else if (isNext && (state.phase === 'swiping' || state.phase === 'waiting')) {
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
                ctx.lineWidth = 3 * scale;
            } else if (isCurrentReveal) {
                ctx.strokeStyle = 'rgba(255, 215, 0, 1.0)';
                ctx.lineWidth = 3 * scale;
            } else {
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
                ctx.lineWidth = 2 * scale;
            }
            ctx.stroke();

            // 当前揭示的发光填充
            if (isCurrentReveal) {
                ctx.beginPath();
                ctx.arc(ls.x, ls.y, ringRadius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
                ctx.fill();
            }

            // 序号
            ctx.font = 'bold ' + (16 * scale) + 'px sans-serif';
            ctx.fillStyle = isMatched ? '#00ff64' : (isNext ? '#ffff00' : '#ffd700');
            ctx.textAlign = 'center';
            ctx.fillText('' + ls.index, ls.x, ls.y - (ls.star.size || 28) / 2 - 12 * scale);
        }

        // 滑动圆环：跟随手指位置（revealing + swiping 阶段都显示）
        if (state.swipeActive && (state.phase === 'swiping' || state.phase === 'revealing')) {
            var ringX = state.lastSwipeX;
            var ringY = state.lastSwipeY;
            var fingerR = 22 * scale;
            // 脉动效果
            var fingerPulse = 1 + 0.15 * Math.sin(Date.now() / 120);

            // 外圈发光
            ctx.beginPath();
            ctx.arc(ringX, ringY, fingerR * fingerPulse, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();

            // 内圈
            ctx.beginPath();
            ctx.arc(ringX, ringY, fingerR * 0.5 * fingerPulse, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.fill();

            // 与下一颗目标灵光的引导线
            if (state.swipeTargetIndex <= state.linkedStars.length) {
                for (var gi = 0; gi < state.linkedStars.length; gi++) {
                    if (state.linkedStars[gi].index === state.swipeTargetIndex) {
                        var targetLs = state.linkedStars[gi];
                        ctx.beginPath();
                        ctx.moveTo(ringX, ringY);
                        ctx.lineTo(targetLs.x, targetLs.y);
                        ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
                        ctx.lineWidth = 1.5 * scale;
                        ctx.setLineDash([4 * scale, 4 * scale]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        break;
                    }
                }
            }
        }

        // 联连流星渲染
        var nowR = Date.now();
        for (var mi = 0; mi < state.linkMeteors.length; mi++) {
            var meteor = state.linkMeteors[mi];
            var elapsed = nowR - meteor.startTime;
            var progress = Math.min(1, elapsed / meteor.duration);
            var mx = meteor.startX + (meteor.targetX - meteor.startX) * progress;
            var my = meteor.startY + (meteor.targetY - meteor.startY) * progress;
            var trailLen = 25 * scale;
            var mdx = meteor.targetX - meteor.startX;
            var mdy = meteor.targetY - meteor.startY;
            var mdist = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
            var mnx = mdx / mdist;
            var mny = mdy / mdist;

            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(mx - mnx * trailLen, my - mny * trailLen);
            var trailGrad = ctx.createLinearGradient(mx, my, mx - mnx * trailLen, my - mny * trailLen);
            trailGrad.addColorStop(0, 'rgba(255,215,0,0.9)');
            trailGrad.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.strokeStyle = trailGrad;
            ctx.lineWidth = 3 * scale;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(mx, my, 4 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
        }
    }

    function setResultCallback(cb) {
        state.resultCallback = cb;
    }

    function reset() {
        // 清理灵光保护标记
        for (var i = 0; i < state.linkedStars.length; i++) {
            state.linkedStars[i].star._linking = false;
            state.linkedStars[i].star.disappearTime = state.linkedStars[i].star._linkingOriginalDisappearTime || Date.now() + 5000;
        }
        state.phase = 'idle';
        state.charge = 0;
        state.linkedStars = [];
        state.matchedIndices = [];
        state.swipeTargetIndex = 1;
        state.revealIndex = 0;
        state.revealSubPhase = 'star_glow';
        state.revealSubStartTime = 0;
        state.revealStartTime = 0;
        state.revealCompleteTime = 0;
        state.readyStartTime = 0;
        state.triggerX = 0;
        state.triggerY = 0;
        state.triggerStar = null;
        state.revealCompleteTime = 0;
        state.isSlowMotion = false;
        state.swipeActive = false;
        state.lastLinkEndTime = 0;
        state.judgeStartTime = 0;
        state.judgeResult = null;
        state.idleSinceTime = 0;
        state.resultCallback = null;
        state.linkMeteors = [];
        state.cumulativeLinkDamage = 0;
        state.screenFlash = null;
        state.shockwaveRings = [];
        state.shockwaveOrigin = null;
        state.pendingMeteors = [];

        // 清理灵光上的冲击波触发标记
        var resetStars = getStars();
        for (var ri = 0; ri < resetStars.length; ri++) {
            delete resetStars[ri]._shockwaveTriggered;
        }

        if (rhythmSkillSystem) rhythmSkillSystem.reset();
    }

    return {
        isUnlocked: isUnlocked,
        addCharge: addCharge,
        getCharge: getCharge,
        enterReady: enterReady,
        isRhythmReady: isRhythmReady,
        enterRhythmReady: enterRhythmReady,
        onRhythmSkillComplete: onRhythmSkillComplete,
        _injectRhythmSkillSystem: function(sys) { rhythmSkillSystem = sys; },
        handleTriggerTouch: handleTriggerTouch,
        beginLinkWindow: beginLinkWindow,
        beginSwipeTracking: beginSwipeTracking,
        trackSwipePath: trackSwipePath,
        endSwipe: endSwipe,
        failLink: failLink,
        isActive: isActive,
        isReady: isReady,
        isSwipeActive: function() { return state.swipeActive; },
        isSlowMotionActive: isSlowMotionActive,
        getLinkedStars: getLinkedStars,
        getPhase: getPhase,
        getTimeScale: getTimeScale,
        update: update,
        render: render,
        setResultCallback: setResultCallback,
        reset: reset
    };
}

export { createLinkChainSystem };