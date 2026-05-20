import Logger from '../utils/Logger.js';
/**
 * D2 长按蓄力系统（Charge System）
 * 闭包工厂 + 依赖注入模式
 *
 * 玩家按住空白区域蓄力，松开释放高倍率伤害：
 * - 轻蓄(0.5-1.5s): 1.5x, 单体
 * - 中蓄(1.5-3.0s): 2.5x, 3目标AOE
 * - 满蓄(3.0s+):     4.0x, 全屏AOE, 破盾
 *
 * 解锁条件：角色等级 >= 5
 */

var D2_UNLOCK_LEVEL = 5;

var CHARGE_LIGHT_MIN = 500;
var CHARGE_LIGHT_MAX = 1500;
var CHARGE_MEDIUM_MIN = 1500;
var CHARGE_MEDIUM_MAX = 3000;
var CHARGE_FULL_MIN = 3000;

var CANCEL_MOVE_THRESHOLD = 20;

function createChargeSystem(deps) {
    var getPlayerData = deps.getPlayerData;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getActiveMonsters = deps.getActiveMonsters;
    var addMessage = deps.addMessage || function () { };
    var createScreenShake = deps.createScreenShake || function () { };
    var applyDamageToMonster = deps.applyDamageToMonster || function () { };

    // 内部状态
    var state = {
        phase: 'idle',           // 'idle' | 'monitoring' | 'charging'
        touchId: null,
        startX: 0,
        startY: 0,
        chargeStartTime: 0,
        moveDistance: 0,
        monitorTimerId: null
    };

    function isUnlocked() {
        var pd = getPlayerData();
        if (!pd || !pd.currentCharacterId) return false;
        var charExp = pd.characterExperience;
        if (!charExp || !charExp[pd.currentCharacterId]) return false;
        return charExp[pd.currentCharacterId].level >= D2_UNLOCK_LEVEL;
    }

    function isCharging() {
        return state.phase === 'charging';
    }

    function isMonitoring() {
        return state.phase === 'monitoring';
    }

    function beginMonitoring(x, y, touchId) {
        if (!isUnlocked()) return false;
        state.phase = 'monitoring';
        state.touchId = touchId;
        state.startX = x;
        state.startY = y;
        state.moveDistance = 0;
        state.chargeStartTime = Date.now();
        return true;
    }

    function updateMonitoring(x, y) {
        if (state.phase !== 'monitoring') return;
        var dx = x - state.startX;
        var dy = y - state.startY;
        state.moveDistance = Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 由 TouchGestureSystem 在 500ms 定时器触发时调用
     */
    function checkTransitionToCharging() {
        if (state.phase !== 'monitoring') return false;
        if (state.moveDistance > CANCEL_MOVE_THRESHOLD) {
            cancelCharge();
            return false;
        }
        state.phase = 'charging';
        state.chargeStartTime = Date.now();
        return true;
    }

    function getChargeElapsed() {
        if (state.phase !== 'charging') return 0;
        return Date.now() - state.chargeStartTime;
    }

    function getChargeLevel() {
        var elapsed = getChargeElapsed();
        if (elapsed < CHARGE_LIGHT_MIN) return null;
        if (elapsed < CHARGE_LIGHT_MAX) {
            return { stage: 'light', label: '轻蓄', damageMult: 1.5, aoeTargets: 1, breaksShield: false, progress: (elapsed - CHARGE_LIGHT_MIN) / (CHARGE_LIGHT_MAX - CHARGE_LIGHT_MIN) };
        }
        if (elapsed < CHARGE_MEDIUM_MAX) {
            return { stage: 'medium', label: '中蓄', damageMult: 2.5, aoeTargets: 3, breaksShield: false, progress: (elapsed - CHARGE_MEDIUM_MIN) / (CHARGE_MEDIUM_MAX - CHARGE_MEDIUM_MIN) };
        }
        return { stage: 'full', label: '满蓄', damageMult: 4.0, aoeTargets: 99, breaksShield: true, progress: 1 };
    }

    function getChargeProgress() {
        var elapsed = getChargeElapsed();
        return Math.min(1, elapsed / CHARGE_FULL_MIN);
    }

    /**
     * 返回蓄力光环颜色 {r,g,b}：蓝 → 金 → 红
     */
    function getStageColor() {
        var progress = getChargeProgress();
        if (progress < 0.33) {
            var t = progress / 0.33;
            return { r: Math.floor(100 * (1 - t)), g: Math.floor(150 + 105 * t), b: Math.floor(255 * (1 - t)) };
        } else if (progress < 0.66) {
            var t2 = (progress - 0.33) / 0.33;
            return { r: Math.floor(255 * t2), g: Math.floor(255 - 40 * t2), b: 0 };
        } else {
            var t3 = (progress - 0.66) / 0.34;
            return { r: 255, g: Math.floor(215 * (1 - t3)), b: 0 };
        }
    }

    /**
     * 释放蓄力攻击，返回伤害结果
     */
    function releaseCharge() {
        if (state.phase !== 'charging') return null;

        var level = getChargeLevel();
        if (!level) {
            cancelCharge();
            return null;
        }

        var monsters = getActiveMonsters ? getActiveMonsters() : [];
        var aliveMonsters = [];
        for (var i = 0; i < monsters.length; i++) {
            if (monsters[i].hp > 0 && monsters[i].active) {
                aliveMonsters.push(monsters[i]);
            }
        }

        if (aliveMonsters.length === 0) {
            cancelCharge();
            return null;
        }

        var pd = getPlayerData();
        // 用当前角色的攻击力作为基础值
        var baseAtk = pd.totalAttack || 50;

        // 选择目标
        var targets;
        if (level.aoeTargets >= 99) {
            targets = aliveMonsters;
        } else {
            targets = aliveMonsters.slice(0, level.aoeTargets);
        }

        var totalDamage = 0;
        for (var t = 0; t < targets.length; t++) {
            var m = targets[t];
            var dmg = Math.floor(baseAtk * level.damageMult);

            // 破盾
            if (level.breaksShield && m.shield && m.shield > 0) {
                m.shield = 0;
            }

            // 先扣护盾
            if (m.shield && m.shield > 0) {
                if (dmg <= m.shield) {
                    m.shield -= dmg;
                    dmg = 0;
                } else {
                    dmg -= m.shield;
                    m.shield = 0;
                }
            }

            m.hp = Math.max(0, m.hp - dmg);
            totalDamage += dmg;
        }

        addMessage('重击! ' + level.label + ' -' + totalDamage, '#FF6600');
        createScreenShake(level.stage === 'full' ? 8 : 4);

        cancelCharge();
        return {
            stage: level.stage,
            label: level.label,
            damageMult: level.damageMult,
            targetCount: targets.length,
            totalDamage: totalDamage
        };
    }

    function cancelCharge() {
        if (state.monitorTimerId) {
            clearTimeout(state.monitorTimerId);
            state.monitorTimerId = null;
        }
        state.phase = 'idle';
        state.touchId = null;
        state.startX = 0;
        state.startY = 0;
        state.chargeStartTime = 0;
        state.moveDistance = 0;
    }

    /**
     * 渲染蓄力光环
     */
    function render(ctx, screenW, screenH, scale) {
        if (state.phase !== 'charging') return;

        var level = getChargeLevel();
        var color = getStageColor();
        var progress = getChargeProgress();

        // 角色区域中心（底部中央）
        var charCenterX = screenW / 2;
        var charCenterY = screenH - 75 * scale;

        var time = Date.now() / 1000;
        var ringRadius = 45 * scale;
        var ringCount = 3;

        // 旋转光环点
        for (var ri = 0; ri < ringCount; ri++) {
            var angle = time * 3 + ri * Math.PI * 2 / ringCount;
            var rx = charCenterX + Math.cos(angle) * ringRadius;
            var ry = charCenterY + Math.sin(angle) * ringRadius * 0.4;
            ctx.beginPath();
            ctx.arc(rx, ry, 4 * scale, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.9)';
            ctx.fill();
        }

        // 进度环
        ctx.beginPath();
        ctx.arc(charCenterX, charCenterY, ringRadius + 8 * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.7)';
        ctx.lineWidth = 3 * scale;
        ctx.stroke();

        // 阶段标签
        if (level) {
            ctx.font = 'bold ' + (13 * scale) + 'px sans-serif';
            ctx.fillStyle = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
            ctx.textAlign = 'center';
            ctx.fillText(level.label, charCenterX, charCenterY - ringRadius - 15 * scale);
        }

        // 蓄力进度条（底部HP条上方）
        var barW = 180 * scale;
        var barH = 4 * scale;
        var barX = screenW / 2 - barW / 2;
        var barY = screenH - 35 * scale;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
        ctx.fillRect(barX, barY, barW * progress, barH);
    }

    function reset() {
        cancelCharge();
    }

    return {
        isUnlocked: isUnlocked,
        beginMonitoring: beginMonitoring,
        updateMonitoring: updateMonitoring,
        checkTransitionToCharging: checkTransitionToCharging,
        getChargeElapsed: getChargeElapsed,
        getChargeLevel: getChargeLevel,
        getChargeProgress: getChargeProgress,
        getStageColor: getStageColor,
        releaseCharge: releaseCharge,
        cancelCharge: cancelCharge,
        isCharging: isCharging,
        isMonitoring: isMonitoring,
        render: render,
        reset: reset
    };
}

export { createChargeSystem };