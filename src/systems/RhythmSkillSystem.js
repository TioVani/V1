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

var RHYTHM_SHRINK_MS = 1000;       // 缩圈时长（圈从半屏缩到中心）
var PERFECT_WINDOW_MS = 100;       // Perfect 窗口（中心±50ms）
var GREAT_WINDOW_MS = 300;         // Great 窗口（中心±150ms）
var RHYTHM_HIT_RADIUS = 80;        // 触摸判定半径
var RHYTHM_STAR_SIZE = 72;         // 节奏灵光本体尺寸
var GUIDE_RING_PERIOD_MS = 2500;   // 待激活引导圈周期（慢速约2.5秒）
var ACTIVATE_TIMEOUT_MS = 4000;    // 待激活超时时间
var RESPAWN_DELAY_MS = 4000;       // 超时消失后重新出现的延迟

var RHYTHM_SKILLS = [
    { min: 1, max: 2,  name: '节奏微震',   mult: 2.0, aoe: false, stamina: 15, breakShield: false, shake: 0,  bonus: 15 },
    { min: 3, max: 3,  name: '节拍技',     mult: 3.0, aoe: true,  stamina: 25, breakShield: false, shake: 8,  bonus: 30 },
    { min: 4, max: 4,  name: '强化节拍技', mult: 4.5, aoe: true,  stamina: 35, breakShield: true,  shake: 10, bonus: 40 },
    { min: 5, max: 5,  name: '完美节拍技', mult: 6.0, aoe: true,  stamina: 50, breakShield: true,  shake: 14, bonus: 50 },
    { min: 6, max: 99, name: '极限节拍技', mult: 8.0, aoe: true,  stamina: 50, breakShield: true,  shake: 18, bonus: 60 }
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
    var onComplete = deps.onComplete || function () { };

    var state = {
        phase: 'idle',
        rhythmStar: null,
        successCount: 0,
        ringResetTime: 0,
        pendingStartTime: 0,
        respawnTimer: 0,
        shockwaveTime: 0
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
        if (Math.sqrt(dx * dx + dy * dy) >= RHYTHM_HIT_RADIUS * scale) return false;

        // 待激活 → 激活缩圈
        if (state.phase === 'pending') {
            state.phase = 'active';
            state.ringResetTime = Date.now();
            rs.createTime = Date.now();
            addMessage('节奏开始!', '#00FFFF', true);
            vibShort('medium');
            return true;
        }

        // 活动状态判定
        if (state.phase === 'active') {
            var elapsed = Date.now() - state.ringResetTime;
            var centerTime = RHYTHM_SHRINK_MS;
            var delta = Math.abs(elapsed - centerTime);

            if (delta <= PERFECT_WINDOW_MS / 2) {
                state.successCount++;
                state.ringResetTime = Date.now();
                state.shockwaveTime = Date.now();
                rs.createTime = Date.now();
                addMessage('Perfect! x' + state.successCount, '#00FFFF', true);
                addScore(5);
                vibShort('light');
            } else if (delta <= GREAT_WINDOW_MS / 2) {
                state.successCount++;
                state.ringResetTime = Date.now();
                state.shockwaveTime = Date.now();
                rs.createTime = Date.now();
                addMessage('Great! x' + state.successCount, '#00FFFF', true);
                addScore(5);
                vibShort('light');
            } else {
                settle();
            }
            return true;
        }

        return false;
    }

    function settle() {
        var count = state.successCount;
        var skill = null;
        for (var si = 0; si < RHYTHM_SKILLS.length; si++) {
            var entry = RHYTHM_SKILLS[si];
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
                var staminaKey = count <= 2 ? 'RHYTHM_RECOVERY_1'
                    : count === 3 ? 'RHYTHM_RECOVERY_2'
                    : count === 4 ? 'RHYTHM_RECOVERY_3'
                    : count === 5 ? 'RHYTHM_RECOVERY_4'
                    : 'RHYTHM_RECOVERY_5';
                saturationState.recover(SATURATION_COSTS[staminaKey]);
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
                return;
            }
            return;
        }

        if (state.phase === 'active') {
            if (Date.now() - state.ringResetTime >= RHYTHM_SHRINK_MS + GREAT_WINDOW_MS / 2) {
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
        var outerRingRadius = Math.min(sw, sh) * 0.5;

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
        var ringProgress = Math.min(1, ringElapsed / RHYTHM_SHRINK_MS);
        var innerRadius = rs.size * scale * 0.8;
        var ringRadius = outerRingRadius * (1 - ringProgress) + innerRadius * ringProgress;

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

        // ── 判定范围色环 ──
        var greatRingRadius = innerRadius + 120 * scale;
        var perfectRingRadius = innerRadius + 40 * scale;

        if (ringRadius > greatRingRadius) {
            ctx.beginPath();
            ctx.arc(rs.x, rs.y, greatRingRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.25)';
            ctx.lineWidth = 2 * scale;
            ctx.setLineDash([6 * scale, 4 * scale]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(rs.x, rs.y, perfectRingRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
            ctx.lineWidth = 2 * scale;
            ctx.setLineDash([4 * scale, 4 * scale]);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (ringRadius > perfectRingRadius) {
            var greatGlow = 1 - (ringRadius - perfectRingRadius) / (greatRingRadius - perfectRingRadius);
            var greatAlpha = 0.4 + greatGlow * 0.6;

            ctx.beginPath();
            ctx.arc(rs.x, rs.y, greatRingRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 100, ' + greatAlpha.toFixed(2) + ')';
            ctx.lineWidth = (2.5 + greatGlow) * scale;
            ctx.setLineDash([6 * scale, 4 * scale]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(rs.x, rs.y, greatRingRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 255, 100, ' + (0.06 + greatGlow * 0.08).toFixed(2) + ')';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(rs.x, rs.y, perfectRingRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
            ctx.lineWidth = 2 * scale;
            ctx.setLineDash([4 * scale, 4 * scale]);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (ringRadius > innerRadius) {
            var perfectGlow = 1 - (ringRadius - innerRadius) / (perfectRingRadius - innerRadius);
            var perfectAlpha = 0.5 + perfectGlow * 0.5;

            ctx.beginPath();
            ctx.arc(rs.x, rs.y, greatRingRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.2)';
            ctx.lineWidth = 1.5 * scale;
            ctx.setLineDash([6 * scale, 4 * scale]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(rs.x, rs.y, perfectRingRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 215, 0, ' + perfectAlpha.toFixed(2) + ')';
            ctx.lineWidth = (2.5 + perfectGlow * 1.5) * scale;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(rs.x, rs.y, perfectRingRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 215, 0, ' + (0.08 + perfectGlow * 0.12).toFixed(2) + ')';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(rs.x, rs.y, innerRadius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 200, ' + (0.5 + perfectGlow * 0.5).toFixed(2) + ')';
            ctx.fill();
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

export { createRhythmSkillSystem, RHYTHM_SHRINK_MS, PERFECT_WINDOW_MS, GREAT_WINDOW_MS, RHYTHM_SKILLS };