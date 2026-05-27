import { SATURATION_COSTS } from './SaturationState.js';

/**
 * D4-节奏技系统（Rhythm Skill System）
 *
 * 联连充能条第二阶段（200）触发的节奏灵光机制：
 * - 节奏灵光固定出现在屏幕中心向下偏移200px，进入待激活状态
 * - 玩家点击激活后，半屏缩圈开始收缩
 * - Perfect/Great → 计数+1，冲击波扩散，缩圈重置
 * - Miss/缩圈超时 → 结算节奏技
 *
 * 视觉优化：固定位置 + 半屏缩圈 + 放大本体 + 启动仪式 + 判定色环 + 冲击波
 */

var BASE_SHRINK_MS = 1000;       // 基础缩圈时长（第1连）

// 根据当前连击数计算缩圈时长（ms）
function getShrinkDuration(successCount) {
    // 前8连固定1000ms建立手感，第9连开始渐进加速
    if (successCount <= 8) return 1000;
    if (successCount <= 14) return 800;
    if (successCount <= 18) return 650;
    if (successCount <= 21) return 520;
    // 21连之后慢慢变速到极限反应165ms
    if (successCount <= 23) return 420;
    if (successCount <= 25) return 340;
    if (successCount <= 27) return 275;
    if (successCount <= 29) return 225;
    if (successCount <= 31) return 190;
    return 165;
}

// 随机抽快慢节奏模式。前21连匀速（纯速度适应），第22连开始引入变速
function applyRhythmStyle(baseMs, successCount) {
    if (successCount < 22) return baseMs; // 前21连无变速

    var roll = Math.random();
    if (roll < 0.35) {
        // 快缩：70-80% 时间内缩完
        return baseMs * (0.7 + Math.random() * 0.1);
    } else if (roll < 0.65) {
        // 匀速：100%
        return baseMs;
    } else if (roll < 0.85) {
        // 忽快忽慢：前段快速缩+后段减速（总时长的80-90%）
        return baseMs * (0.8 + Math.random() * 0.1);
    } else {
        // 急缩：几乎瞬间缩完
        return baseMs * (0.3 + Math.random() * 0.2);
    }
}
var PERFECT_WINDOW_RATIO = 0.20;  // Perfect 窗口占缩圈时长的 20%（±10%）
var GREAT_WINDOW_RATIO = 0.80;    // Great 窗口占缩圈时长的 80%（±40%）—— 保证边缘和刚进圈都有充足判定空间
var RHYTHM_HIT_RADIUS_BASE = 80;  // 触摸判定半径（pending 状态下固定）
var RHYTHM_STAR_SIZE = 72;         // 节奏灵光本体尺寸
var GUIDE_RING_PERIOD_MS = 2500;   // 待激活引导圈周期（慢速约2.5秒）
var ACTIVATE_TIMEOUT_MS = 4000;    // 待激活超时时间
var RESPAWN_DELAY_MS = 4000;       // 超时消失后重新出现的延迟

// 获取当前缩圈时长对应的 Perfect 窗口半宽（ms）
function getPerfectHalfWindow(shrinkDuration) {
    return shrinkDuration * PERFECT_WINDOW_RATIO / 2;
}
// 获取当前缩圈时长对应的 Great 窗口半宽（ms）
function getGreatHalfWindow(shrinkDuration) {
    return shrinkDuration * GREAT_WINDOW_RATIO / 2;
}

var RHYTHM_SKILLS = [
    { min: 1,  max: 3,  name: '节奏微震',     mult: 2.5,  aoe: true, stamina: 8,  breakShield: false, shake: 4,  bonus: 10 },
    { min: 4,  max: 6,  name: '节拍技',       mult: 3.5,  aoe: true, stamina: 14, breakShield: false, shake: 5,  bonus: 20 },
    { min: 7,  max: 8,  name: '强化节拍技',   mult: 5.0,  aoe: true, stamina: 20, breakShield: true,  shake: 7,  bonus: 32 },
    { min: 9,  max: 11, name: '完美节拍技',   mult: 7.0,  aoe: true, stamina: 28, breakShield: true,  shake: 9,  bonus: 46 },
    { min: 12, max: 14, name: '高级节拍技',   mult: 9.5,  aoe: true, stamina: 36, breakShield: true,  shake: 11, bonus: 62 },
    { min: 15, max: 17, name: '极限节拍技',   mult: 12.5, aoe: true, stamina: 46, breakShield: true,  shake: 13, bonus: 80 },
    { min: 18, max: 20, name: '神之节拍技',   mult: 16.0, aoe: true, stamina: 56, breakShield: true,  shake: 15, bonus: 100 },
    { min: 21, max: 23, name: '超神节拍技',   mult: 20.0, aoe: true, stamina: 66, breakShield: true,  shake: 17, bonus: 125 },
    { min: 24, max: 26, name: '传说节拍技',   mult: 24.0, aoe: true, stamina: 76, breakShield: true,  shake: 19, bonus: 150 },
    { min: 27, max: 29, name: '神话节拍技',   mult: 28.0, aoe: true, stamina: 86, breakShield: true,  shake: 21, bonus: 180 },
    { min: 30, max: 31, name: '创世节拍技',   mult: 32.0, aoe: true, stamina: 95, breakShield: true,  shake: 23, bonus: 210 },
    { min: 32, max: -1, name: '终极节拍技',   mult: 40.0, aoe: true, stamina: 100,breakShield: true,  shake: 28, bonus: 250 }
];

function createRhythmSkillSystem(deps) {
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getSaveData = deps.getSaveData;
    var getActiveMonsters = deps.getActiveMonsters || function () { return []; };
    var saturationState = deps.saturationState;
    var addMessage = deps.addMessage || function () { };
    var createScreenShake = deps.createScreenShake || function () { };
    var vibrateShort = deps.vibrateShort || function () { };
    var addScore = deps.addScore || function () { };
    var getBeautyFrames = deps.getBeautyFrames || function () { return []; };
    var getStars = deps.getStars || function () { return []; };
    var applyDamage = deps.applyDamage || function () { };
    var createMeteor = deps.createMeteor || function () { };
    var playerEffects = deps.playerEffects || null;
    var onComplete = deps.onComplete || function () { };
var playQte = deps.playQte || function () {};
    var playUiSkip = deps.playUiSkip || function () {};
    var playQteActivate = deps.playQteActivate || function () {};
    var calculateStarScore = deps.calculateStarScore || function () { return 0; };
    var calculateTotalAttack = deps.calculateTotalAttack || function () { return 0; };

    var state = {
        phase: 'idle',
        rhythmStar: null,
        successCount: 0,
        ringResetTime: 0,
        pendingStartTime: 0,
        respawnTimer: 0,
        shockwaveTime: 0,
        shrinkDuration: BASE_SHRINK_MS  // 当前圈的实际缩圈时长
    };

    function enter() {
        var sw = getScreenWidth ? getScreenWidth() : 375;
        var sh = getScreenHeight ? getScreenHeight() : 812;
        var scale = getScreenScale ? getScreenScale() : 1;

        // 屏幕中心向下偏移200px
        var cx = sw / 2;
        var cy = sh / 2 + 200 * scale;

        var rhythmStar = {
            x: cx,
            y: cy,
            size: RHYTHM_STAR_SIZE,
            type: 'normal',
            visible: true,
            createTime: Date.now(),
            disappearTime: Date.now() + 86400000,
            _rhythm: true,
            _linking: false,
            _charging: false,
            _dragging: false
        };

        state.rhythmStar = rhythmStar;
        state.successCount = 0;
        state.ringResetTime = 0;
        state.phase = 'pending';
        state.pendingStartTime = Date.now();
        state.respawnTimer = 0;
        state.shockwaveTime = 0;

        // 节奏灵光出现即施加闪避buff（全程覆盖，标记对抗一次性清除）
        if (playerEffects) {
            playerEffects.dodging = true;
            playerEffects.dodgeEndTime = Date.now() + 3600000; // 持续直到节奏技结束
            playerEffects._rhythmActive = true; // 标记：节奏技活跃中，弹幕命中不清除闪避
        }

        addMessage('节奏技就绪! 点击节奏灵光!', '#00FFFF', true);
        vibShort('heavy');
    }

    function handleTouch(x, y) {
        if (state.phase === 'idle') return false;
        var scale = getScreenScale ? getScreenScale() : 1;
        var rs = state.rhythmStar;
        if (!rs) return false;

        var dx = x - rs.x;
        var dy = y - rs.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        // 有效触摸半径：pending 用固定值，active 用缩圈环当前半径（全屏可点）
        var hitRadius = (state.phase === 'active')
            ? (getScreenWidth ? Math.min(getScreenWidth(), getScreenHeight()) * 0.6 : 375 * 0.6)
            : RHYTHM_HIT_RADIUS_BASE * scale;

        if (dist >= hitRadius) return false;

        // 待激活 → 激活缩圈
        if (state.phase === 'pending') {
            state.phase = 'active';
            state.ringResetTime = Date.now();
            state.shrinkDuration = BASE_SHRINK_MS;
            rs.createTime = Date.now();
playQteActivate();
playQteActivate();
            addMessage('节奏开始!', '#00FFFF', true);
            vibShort('medium');
            return true;
        }

        // 活动状态判定
        if (state.phase === 'active') {
            var elapsed = Date.now() - state.ringResetTime;
            var centerTime = state.shrinkDuration;
            var delta = Math.abs(elapsed - centerTime);

            var perfectHalf = getPerfectHalfWindow(state.shrinkDuration);
            var greatHalf = getGreatHalfWindow(state.shrinkDuration);

            if (delta <= perfectHalf) {
                // Perfect
                state.successCount++;
                state.ringResetTime = Date.now();
                state.shockwaveTime = Date.now();
                rs.createTime = Date.now();
                applyShockwaveDamage();
                detonateStars();
                state.shrinkDuration = applyRhythmStyle(getShrinkDuration(state.successCount), state.successCount);
                addMessage('Perfect! x' + state.successCount, '#00FFFF', true);
                addScore(5);
                vibShort('light');
                playQte();
            } else if (delta <= greatHalf) {
                // Great
                state.successCount++;
                state.ringResetTime = Date.now();
                state.shockwaveTime = Date.now();
                rs.createTime = Date.now();
                applyShockwaveDamage();
                detonateStars();
                state.shrinkDuration = applyRhythmStyle(getShrinkDuration(state.successCount), state.successCount);
                addMessage('Great! x' + state.successCount, '#00FFFF', true);
                addScore(5);
                vibShort('light');
                playQte();
            } else {
                playUiSkip();
                settle();
            }
            return true;
        }

        return false;
    }

    // ── 冲击波伤害：每次成功点击对全屏怪物造成小额伤害 ──
    function applyShockwaveDamage() {
        var monsters = getActiveMonsters();
        var pd = getSaveData();
        var baseAtk = pd.totalAttack || 50;
        var baseDmg = Math.max(10, Math.floor(baseAtk * 0.6)); // 冲击波最低 10 点伤害
        var totalHit = 0;

        for (var m = 0; m < monsters.length; m++) {
            var mon = monsters[m];
            if (mon.hp <= 0 || !mon.active) continue;
            var dmg = baseDmg;
            if (mon.shield && mon.shield > 0) {
                if (dmg <= mon.shield) { mon.shield -= dmg; totalHit++; continue; }
                else { dmg -= mon.shield; mon.shield = 0; }
            }
            mon.hp = Math.max(0, mon.hp - dmg);
            totalHit++;
        }
    }

    // ── 引爆场上灵光：冲击波扫过的灵光变成流星飞向敌人 ──
    function detonateStars() {
        var stars = getStars();
        if (!stars || stars.length === 0) return;

        var monsters = getActiveMonsters();

        // 找一个活跃怪物作为流星目标（优先最近的）
        function findNearestMonster(sx, sy) {
            var nearest = null;
            var nearestDist = Infinity;
            for (var m = 0; m < monsters.length; m++) {
                var mon = monsters[m];
                if (mon.hp <= 0 || !mon.active) continue;
                var mdx = (mon.x || 0) - sx;
                var mdy = (mon.y || 0) - sy;
                var dist = mdx * mdx + mdy * mdy;
                if (dist < nearestDist) { nearestDist = dist; nearest = mon; }
            }
            return nearest;
        }

        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            if (s._rhythm) continue; // 节奏灵光自身不引爆

            var target = findNearestMonster(s.x, s.y);

            // 创建流星从灵光位置飞向敌人
            if (target && createMeteor) {
                var sw = getScreenWidth ? getScreenWidth() : 375;
                var sh = getScreenHeight ? getScreenHeight() : 667;
                // 伤害 = 普通点击该灵光时的伤害（starScore + totalAttack）
                var dmg = Math.floor(calculateStarScore(s.type || 'normal') + calculateTotalAttack());
                var targetRef = target;  // 闭包捕获，避免流星到达时 target 被其他攻击打死导致引用失效
                // 使用 IIFE 确保每个流星的 dmg/targetRef 闭包独立
                (function(dmgCopy, targetCopy, starX, starY, starType, endPos) {
                    createMeteor(
                        starX, starY,       // 起点：灵光位置
                        dmgCopy, false,     // 伤害, 非暴击
                        starType,           // 灵光类型
                        0, 1,               // score, comboMultiplier
                        function() {        // 命中回调：流星到达时造成伤害
                            if (targetCopy && targetCopy.hp > 0) {
                                var applied = dmgCopy;  // 记录实际造成伤害
                                if (targetCopy.shield > 0) {
                                    if (dmgCopy <= targetCopy.shield) { targetCopy.shield -= dmgCopy; applied = dmgCopy; }
                                    else { applied = dmgCopy; var leftover = dmgCopy - targetCopy.shield; targetCopy.shield = 0; targetCopy.hp = Math.max(0, targetCopy.hp - leftover); }
                                } else {
                                    targetCopy.hp = Math.max(0, targetCopy.hp - dmgCopy);
                                }
                                addMessage('灵光流星 -' + applied, '#FFD700');
                            }
                        },
                        endPos  // 终点：怪物位置 + fallback + 英雄流星标记
                    );
                })(dmg, targetRef, s.x, s.y, s.type || 'normal', { x: target.x || sw / 2, y: target.y || sh / 3, heroic: true });
            }

            // 生存类灵光额外触发效果
            if (s.type === 'heal' || s.type === 'shield' || s.type === 'dodge') {
                if (applyDamage) applyDamage(s, 0);
            }

            // 标记灵光为已处置（由 StarSystem 的过期机制清理）
            s.disappearTime = Date.now() - 1;
        }
    }

    function settle() {
        var count = state.successCount;
        var skill = null;
        for (var si = 0; si < RHYTHM_SKILLS.length; si++) {
            var entry = RHYTHM_SKILLS[si];
            if (entry.max === -1) {
                // 无限档：min=13+，倍率按边际递减公式计算
                if (count >= entry.min) {
                    skill = Object.assign({}, entry);
                    var extra = count - entry.min;
                    // 边际递减：每额外1连增加1.5倍率，最多加到50.0
                    skill.mult = Math.min(50.0, entry.mult + extra * 1.5);
                    skill.stamina = Math.min(100, entry.stamina + extra * 3);
                    skill.bonus = entry.bonus + extra * 5;
                    skill.name = '终极节拍技 x' + count;
                }
                break;
            }
            if (count >= entry.min && count <= entry.max) { skill = entry; break; }
        }

        var monsters = getActiveMonsters();
        var pd = getSaveData();
        var baseAtk = pd.totalAttack || 50;
        var totalDamage = 0;

        if (skill && count >= 1) {
            if (skill.aoe) {
                for (var m = 0; m < monsters.length; m++) {
                    var mon = monsters[m];
                    if (mon.hp <= 0 || !mon.active) continue;
                    var dmg = Math.floor(baseAtk * skill.mult);
                    if (skill.breakShield && mon.shield && mon.shield > 0) mon.shield = 0;
                    if (mon.shield && mon.shield > 0) {
                        if (dmg <= mon.shield) { mon.shield -= dmg; dmg = 0; }
                        else { dmg -= mon.shield; mon.shield = 0; }
                    }
                    mon.hp = Math.max(0, mon.hp - dmg);
                    totalDamage += dmg;
                }
            } else {
                var target = null;
                for (var t = 0; t < monsters.length; t++) {
                    if (monsters[t].hp > 0 && monsters[t].active) { target = monsters[t]; break; }
                }
                if (target) {
                    var dmgSingle = Math.floor(baseAtk * skill.mult);
                    if (target.shield && target.shield > 0) {
                        if (dmgSingle <= target.shield) { target.shield -= dmgSingle; dmgSingle = 0; }
                        else { dmgSingle -= target.shield; target.shield = 0; }
                    }
                    target.hp = Math.max(0, target.hp - dmgSingle);
                    totalDamage = dmgSingle;
                }
            }

            addMessage(skill.name + '! x' + skill.mult + ' -' + totalDamage, '#00FFFF', true);
            if (skill.shake > 0) createScreenShake(skill.shake);
            vibShort('heavy');
            addScore(skill.bonus || 0);

            if (saturationState) {
                saturationState.recover(skill.stamina || 10);
            }
        } else {
            addMessage('节奏失败...', '#ff4444');
        }

        state.rhythmStar = null;
        state.successCount = 0;
        state.ringResetTime = 0;
        state.phase = 'idle';
        state.pendingStartTime = 0;
        state.respawnTimer = 0;
        state.shockwaveTime = 0;

        // 节奏技结束：清除闪避状态
        if (playerEffects) {
            playerEffects.dodging = false;
            playerEffects.dodgeEndTime = 0;
            playerEffects._rhythmActive = false;
        }

        onComplete();
    }

    function update(dt) {
        if (state.phase === 'idle') {
            if (state.respawnTimer > 0 && Date.now() >= state.respawnTimer) {
                state.respawnTimer = 0;
                enter();
            }
            return;
        }

        if (state.phase === 'pending') {
            if (Date.now() - state.pendingStartTime >= ACTIVATE_TIMEOUT_MS) {
                state.rhythmStar = null;
                state.phase = 'idle';
                state.pendingStartTime = 0;
                state.respawnTimer = Date.now() + RESPAWN_DELAY_MS;
                state.shockwaveTime = 0;
                if (playerEffects) {
                    playerEffects.dodging = false;
                    playerEffects.dodgeEndTime = 0;
                    playerEffects._rhythmActive = false;
                }
                return;
            }
            return;
        }

        if (state.phase === 'active') {
            // 超时缓冲：Great 窗口外 + 额外 50ms
            var greatHalf = getGreatHalfWindow(state.shrinkDuration);
            if (Date.now() - state.ringResetTime >= state.shrinkDuration + greatHalf + 50) {
                playUiSkip();
                settle();
            }
        }
    }

    function render(ctx, screenW, screenH, scale) {
        var rs = state.rhythmStar;
        if (!rs) return;

        var now = Date.now();
        var sw = getScreenWidth ? getScreenWidth() : screenW;
        var sh = getScreenHeight ? getScreenHeight() : screenH;
        var outerRingRadius = Math.min(sw, sh) * 0.6;

        // ── 待激活状态 ──
        if (state.phase === 'pending') {
            var pendingElapsed = now - state.pendingStartTime;
            var pulsePhase = pendingElapsed / 300;
            var pulseScale = 1 + 0.12 * Math.sin(pulsePhase * Math.PI * 2);

            var guideProgress = (pendingElapsed % GUIDE_RING_PERIOD_MS) / GUIDE_RING_PERIOD_MS;
            var guidePingpong = guideProgress < 0.5 ? guideProgress * 2 : 2 - guideProgress * 2;
            var guideRadius = outerRingRadius * (1 - guidePingpong) + rs.size * scale * 0.8 * guidePingpong;
            var guideAlpha = 0.25 + 0.15 * Math.sin(pulsePhase * Math.PI * 2);

            ctx.beginPath();
            ctx.arc(rs.x, rs.y, guideRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 255, ' + guideAlpha.toFixed(2) + ')';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();

            var beautyFrames = getBeautyFrames();
            if (beautyFrames && beautyFrames.length > 0) {
                var bfIdx = Math.floor(now / 60) % beautyFrames.length;
                var bfImg = beautyFrames[bfIdx];
                if (bfImg && bfImg.complete) {
                    var gcSz = rs.size * scale * 1.5 * pulseScale;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(bfImg, rs.x - gcSz / 2, rs.y - gcSz / 2, gcSz, gcSz);
                    ctx.globalCompositeOperation = 'source-over';
                }
            }

            var bodySize = rs.size * scale * pulseScale;
            ctx.font = bodySize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#00FFFF';
            ctx.shadowBlur = 24 * scale;
            ctx.shadowColor = '#00FFFF';
            ctx.fillText('✦', rs.x, rs.y);
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            var remaining = Math.ceil((ACTIVATE_TIMEOUT_MS - pendingElapsed) / 1000);
            if (remaining < 0) remaining = 0;
            ctx.font = 'bold ' + (14 * scale) + 'px sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 8 * scale;
            ctx.shadowColor = '#00FFFF';
            ctx.fillText('点击开始 ' + remaining + 's', rs.x, rs.y - bodySize * 0.8);
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            return;
        }

        // ── 活动状态 ──
        if (state.phase !== 'active') return;

        var ringElapsed = now - state.ringResetTime;
        var ringProgress = Math.min(1, ringElapsed / state.shrinkDuration);
        var innerRadius = rs.size * scale * 0.8;
        var ringRadius = outerRingRadius * (1 - ringProgress) + innerRadius * ringProgress;

        // ── 外圈参考线：缩圈起始边界，纯视觉辅助 ──
        ctx.beginPath();
        ctx.arc(rs.x, rs.y, outerRingRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200, 200, 220, 0.12)';
        ctx.lineWidth = 1 * scale;
        ctx.setLineDash([10 * scale, 8 * scale]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 缩圈环
        var cr = Math.floor(255 * ringProgress);
        var cg = 255;
        var cb = 255;
        var ringAlpha = (1 - ringProgress) * 0.8 + 0.15;
        ctx.beginPath();
        ctx.arc(rs.x, rs.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + ringAlpha.toFixed(2) + ')';
        ctx.lineWidth = 3 * scale;
        ctx.stroke();

        // ── 判定范围高亮：在缩圈环上方叠加判定窗口的静态参考色环 ──
        // Great 窗口和 Perfect 窗口用固定的半径范围（对应 shrinkDuration ±比例），
        // 与 handleTouch 中的判定窗口完全对齐
        var greatHalf = getGreatHalfWindow(state.shrinkDuration);
        var perfectHalf = getPerfectHalfWindow(state.shrinkDuration);

        // 视觉参考带使用独立的缩小系数：显示比实际判定更靠内（更小），
        // 玩家看到缩圈环"进入"视觉参考带时，实际判定窗口已经开启，
        // 进圈和圈边都能拿到判定
        var VISUAL_GREAT_SCALE = 0.55;
        var VISUAL_PERFECT_SCALE = 0.45;

        var visGreatHalf = greatHalf * VISUAL_GREAT_SCALE;
        var visPerfectHalf = perfectHalf * VISUAL_PERFECT_SCALE;

        var visGreatStartMs = state.shrinkDuration - visGreatHalf;
        var visPerfectStartMs = state.shrinkDuration - visPerfectHalf;
        var visPerfectEndMs = state.shrinkDuration + visPerfectHalf;
        var visGreatEndMs = state.shrinkDuration + visGreatHalf;

        // timeToRadius 把时间映射到 ringRadius
        var t2r = function(ms) {
            var progressAt = Math.min(1, Math.max(0, ms / state.shrinkDuration));
            return outerRingRadius * (1 - progressAt) + innerRadius * progressAt;
        };

        var visGreatOuterR = t2r(visGreatStartMs);
        var visPerfectOuterR = t2r(visPerfectStartMs);
        var visPerfectInnerR = t2r(visPerfectEndMs);
        var visGreatInnerR = t2r(visGreatEndMs);

        // ── 绘制 Great 窗口参考带（绿色） ──
        ctx.beginPath();
        ctx.arc(rs.x, rs.y, visGreatOuterR, 0, Math.PI * 2);
        ctx.arc(rs.x, rs.y, visGreatInnerR, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 100, 0.06)';
        ctx.fill();

        // Great 外边界虚线
        ctx.beginPath();
        ctx.arc(rs.x, rs.y, visGreatOuterR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 100, 0.30)';
        ctx.lineWidth = 1.5 * scale;
        ctx.setLineDash([8 * scale, 6 * scale]);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── 绘制 Perfect 窗口参考带（金色） ──
        ctx.beginPath();
        ctx.arc(rs.x, rs.y, visPerfectOuterR, 0, Math.PI * 2);
        ctx.arc(rs.x, rs.y, visPerfectInnerR, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
        ctx.fill();

        // Perfect 外边界虚线
        ctx.beginPath();
        ctx.arc(rs.x, rs.y, visPerfectOuterR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.40)';
        ctx.lineWidth = 1.5 * scale;
        ctx.setLineDash([6 * scale, 5 * scale]);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── 缩圈环在判定窗口内时额外加粗高亮（用视觉参考带） ──
        if (ringRadius <= visGreatOuterR && ringRadius > visPerfectOuterR) {
            // 在 Great 区：缩圈环叠加绿色光晕
            var gt = 1 - (ringRadius - visPerfectOuterR) / (visGreatOuterR - visPerfectOuterR);
            ctx.beginPath();
            ctx.arc(rs.x, rs.y, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 100, ' + (0.3 + gt * 0.5).toFixed(2) + ')';
            ctx.lineWidth = (3 + gt * 3) * scale;
            ctx.stroke();
        } else if (ringRadius <= visPerfectOuterR && ringRadius >= visPerfectInnerR) {
            // 在 Perfect 区：缩圈环叠加金色光晕
            var midR = (visPerfectOuterR + visPerfectInnerR) / 2;
            var pt = 1 - Math.abs(ringRadius - midR) / ((visPerfectOuterR - visPerfectInnerR) / 2);
            ctx.beginPath();
            ctx.arc(rs.x, rs.y, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 215, 0, ' + (0.5 + pt * 0.5).toFixed(2) + ')';
            ctx.lineWidth = (3 + pt * 4) * scale;
            ctx.stroke();
        } else if (ringRadius < visPerfectInnerR && ringRadius >= visGreatInnerR) {
            // 已过 Perfect 仍在 Great 区：缩圈环绿色渐暗
            var gt2 = (ringRadius - visGreatInnerR) / (visPerfectInnerR - visGreatInnerR);
            ctx.beginPath();
            ctx.arc(rs.x, rs.y, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 100, ' + (0.3 * (1 - gt2)).toFixed(2) + ')';
            ctx.lineWidth = (3 * (1 - gt2)) * scale;
            ctx.stroke();
        }

        // ── 冲击波 ──
        if (state.shockwaveTime > 0) {
            var waveElapsed = now - state.shockwaveTime;
            var waveDuration = 400;
            if (waveElapsed < waveDuration) {
                var waveProgress = waveElapsed / waveDuration;
                var waveRadius = innerRadius + waveProgress * outerRingRadius;
                var waveAlpha = (1 - waveProgress) * 0.6;

                ctx.beginPath();
                ctx.arc(rs.x, rs.y, waveRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 255, 255, ' + waveAlpha.toFixed(2) + ')';
                ctx.lineWidth = (3 + waveProgress * 4) * scale;
                ctx.stroke();

                var waveAlphaInner = (1 - waveProgress) * 0.3;
                ctx.beginPath();
                ctx.arc(rs.x, rs.y, waveRadius * 0.85, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, ' + waveAlphaInner.toFixed(2) + ')';
                ctx.lineWidth = 1.5 * scale;
                ctx.stroke();
            } else {
                state.shockwaveTime = 0;
            }
        }

        // GC 发光
        var beautyFrames2 = getBeautyFrames();
        if (beautyFrames2 && beautyFrames2.length > 0) {
            var bfIdx2 = Math.floor(now / 60) % beautyFrames2.length;
            var bfImg2 = beautyFrames2[bfIdx2];
            if (bfImg2 && bfImg2.complete) {
                var gcSz2 = rs.size * scale * 1.5;
                ctx.globalCompositeOperation = 'lighter';
                ctx.drawImage(bfImg2, rs.x - gcSz2 / 2, rs.y - gcSz2 / 2, gcSz2, gcSz2);
                ctx.globalCompositeOperation = 'source-over';
            }
        }

        // 灵光本体
        ctx.font = (rs.size * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#00FFFF';
        ctx.shadowBlur = 22 * scale;
        ctx.shadowColor = '#00FFFF';
        ctx.fillText('✦', rs.x, rs.y);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        if (state.successCount > 0) {
            ctx.font = 'bold ' + (16 * scale) + 'px sans-serif';
            ctx.fillStyle = '#00FFFF';
            ctx.textAlign = 'center';
            ctx.fillText('x' + state.successCount, rs.x, rs.y - rs.size * scale * 0.8);
        }
    }

    function isActive() {
        return state.phase === 'pending' || state.phase === 'active';
    }

    function reset() {
        state.phase = 'idle';
        state.rhythmStar = null;
        state.successCount = 0;
        state.ringResetTime = 0;
        state.pendingStartTime = 0;
        state.respawnTimer = 0;
        state.shockwaveTime = 0;
    }

    function vibShort(type) {
        try { vibrateShort({ type: type }); } catch (e) {}
    }

    return {
        enter: enter,
        handleTouch: handleTouch,
        update: update,
        render: render,
        isActive: isActive,
        reset: reset
    };
}

export { createRhythmSkillSystem, BASE_SHRINK_MS, PERFECT_WINDOW_RATIO, GREAT_WINDOW_RATIO, RHYTHM_SKILLS };