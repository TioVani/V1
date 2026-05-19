/**
 * 连击系统（Combo System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

function createComboSystem(deps) {
    // 依赖注入
    var getCurrentCharacterConfig = deps.getCurrentCharacterConfig;
    var updateStarSpawnInterval = deps.updateStarSpawnInterval;
    var updateTaskProgress = deps.updateTaskProgress;
    var updateTaskStats = deps.updateTaskStats;
    var getPassiveSkillBonuses = deps.getPassiveSkillBonuses;
    var getBaseStarInterval = deps.getBaseStarInterval;
    var getMinStarInterval = deps.getMinStarInterval;

    // ==================== 常量 ====================
    var DEFAULT_COMBO_TIMEOUT = 1000;   // 默认连击超时时间（毫秒）
    var MAX_COMBO_SPEED_LEVEL = 6;      // 连击速度加成最大层数

    // ==================== 内部状态 ====================
    var comboCount = 0;                 // 当前连击数
    var lastComboTime = 0;              // 上次连击时间

    // ==================== 公共方法 ====================

    /**
     * 获取连击中断时间
     */
    function getComboTimeout() {
        var charConfig = getCurrentCharacterConfig();
        return (charConfig && charConfig.comboTimeout) || DEFAULT_COMBO_TIMEOUT;
    }

    /**
     * 更新连击
     */
    function updateCombo() {
        var now = Date.now();
        var comboTimeout = getComboTimeout();

        // 检查连击是否超时
        if (now - lastComboTime > comboTimeout && comboCount > 0) {
            // 连击超时，重置
            resetCombo();
        }

        // 更新连击计数
        comboCount++;
        lastComboTime = now;

        // 任务：最大连击数
        updateTaskProgress('max_combo', comboCount, false);
        updateTaskStats('maxCombo', comboCount, false);

        // 获取当前角色的连击效果
        var charConfig = getCurrentCharacterConfig();
        if (charConfig) {
            // 计算连击效果层级，并限制最大层数
            var comboLevel = Math.min(
                Math.floor(comboCount / charConfig.comboThreshold),
                MAX_COMBO_SPEED_LEVEL
            );

            // 更新星星生成间隔
            var speedMultiplier = Math.pow(1 - charConfig.comboSpeedBonus, comboLevel);
            var newInterval = Math.max(
                getMinStarInterval(),
                Math.floor(getBaseStarInterval() * speedMultiplier)
            );

            // 通过回调更新外部 currentStarInterval
            if (deps.setCurrentStarInterval) {
                deps.setCurrentStarInterval(newInterval);
            }

            // 如果间隔变化，重新设置定时器
            updateStarSpawnInterval();
        }
    }

    /**
     * 重置连击
     */
    function resetCombo() {
        comboCount = 0;
        lastComboTime = 0;
        // 恢复基础间隔
        if (deps.setCurrentStarInterval) {
            deps.setCurrentStarInterval(getBaseStarInterval());
        }
        updateStarSpawnInterval();
    }

    /**
     * 检查并重置超时的连击
     */
    function checkComboTimeout() {
        var comboTimeout = getComboTimeout();
        if (comboCount > 0 && Date.now() - lastComboTime > comboTimeout) {
            resetCombo();
        }
    }

    /**
     * 获取连击分数加成
     */
    function getComboScoreBonus() {
        var charConfig = getCurrentCharacterConfig();
        if (!charConfig || comboCount < charConfig.comboThreshold) {
            return 0;
        }

        var comboLevel = Math.floor(comboCount / charConfig.comboThreshold);
        var bonus = charConfig.comboScoreBonus * comboLevel;

        // 应用被动技能的连击加成
        var skillBonuses = getPassiveSkillBonuses();
        if (skillBonuses.comboBonus > 0) {
            bonus *= (1 + skillBonuses.comboBonus);
        }

        return bonus;
    }

    /**
     * 重置连击系统（游戏结束时调用）
     */
    function resetSystem() {
        comboCount = 0;
        lastComboTime = 0;
        if (deps.setCurrentStarInterval) {
            deps.setCurrentStarInterval(getBaseStarInterval());
        }
    }

    return {
        // 核心方法
        updateCombo: updateCombo,
        resetCombo: resetCombo,
        checkComboTimeout: checkComboTimeout,
        getComboTimeout: getComboTimeout,
        getComboScoreBonus: getComboScoreBonus,

        // 状态访问
        getComboCount: function() { return comboCount; },
        setComboCount: function(val) { comboCount = val; },
        getLastComboTime: function() { return lastComboTime; },
        setLastComboTime: function(val) { lastComboTime = val; },

        // 常量暴露
        getBaseStarInterval: getBaseStarInterval,
        getMinStarInterval: getMinStarInterval,

        // 系统重置
        resetSystem: resetSystem
    };
}

export { createComboSystem };
