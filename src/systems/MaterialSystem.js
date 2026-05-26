import Logger from '../utils/Logger.js';
/**
 * 材料使用系统（Material System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

function createMaterialSystem(deps) {
    // 依赖注入
    var getSaveData = deps.getSaveData;
    var getMaterials = deps.getMaterials;
    var getGameState = deps.getGameState;
    var getGameConst = deps.getGameConst;
    var getSeasonStarTypes = deps.getSeasonStarTypes;
    var getSeasonSelection = deps.getSeasonSelection;
    var getMaxCharacterLevel = deps.getMaxCharacterLevel;
    var getActiveBuffs = deps.getActiveBuffs;
    var getComboScoreBonus = deps.getComboScoreBonus;
    var getPassiveSkillBonuses = deps.getPassiveSkillBonuses;
    var getCharacterStatsAtLevel = deps.getCharacterStatsAtLevel;
    var getCharacterFullStats = deps.getCharacterFullStats;
    var updateTaskProgressFn = deps.updateTaskProgress;
    var saveData = deps.saveData;
    var showToast = deps.showToast;

    // ==================== 内部函数 ====================

    function calculateStarScore(starType) {
        var pd = getSaveData();
        var GAME_STATE = getGameConst();
        var SEASON_STAR_TYPES = getSeasonStarTypes();
        var baseScore = 1;
        var isSeasonMode = (getGameState() === GAME_STATE.SEASON_PLAYING);

        var starTypeConfig = SEASON_STAR_TYPES.find(function(s) { return s.id === starType; });
        var multiplier = starTypeConfig ? starTypeConfig.multiplier : 1;

        if (starType === 'fire') {
            if (isSeasonMode) {
                baseScore = 5;
            } else {
                var hasFireStar = pd.unlockedStarTypes && pd.unlockedStarTypes.indexOf('fire') !== -1;
                if (hasFireStar) {
                    baseScore = 5 * (1 + pd.fireStarLevel * 0.05);
                }
            }
        } else if (starType === 'ice') {
            if (isSeasonMode) {
                baseScore = 3;
            } else {
                var hasIceStar = pd.unlockedStarTypes && pd.unlockedStarTypes.indexOf('ice') !== -1;
                if (hasIceStar) {
                    baseScore = 3 * (1 + pd.iceStarLevel * 0.05);
                }
            }
        } else if (starType === 'time') {
            baseScore = 2;
        } else if (starTypeConfig) {
            baseScore = multiplier;
        }

        var comboBonus = getComboScoreBonus();
        if (comboBonus > 0) {
            baseScore *= (1 + comboBonus);
        }

        var skillBonuses = getPassiveSkillBonuses();
        if (skillBonuses.starScoreBonus > 1) {
            baseScore *= skillBonuses.starScoreBonus;
        }

        return Math.floor(baseScore);
    }

    function calculateTotalAttack() {
        var pd = getSaveData();
        var Materials = getMaterials();
        var GAME_STATE = getGameConst();
        var totalAttack = 0;
        var isSeasonMode = (getGameState() === GAME_STATE.SEASON_PLAYING);

        if (isSeasonMode && getSeasonSelection().character) {
            var maxLevelStats = getCharacterStatsAtLevel(getSeasonSelection().character, getMaxCharacterLevel());
            totalAttack += maxLevelStats.attack;
            return totalAttack;
        }

        var currentCharId = pd.currentCharacterId;
        if (currentCharId) {
            var stats = getCharacterFullStats(currentCharId);
            totalAttack += stats.attack;
        }

        for (let materialId in pd.usedMaterials) {
            var usedData = pd.usedMaterials[materialId];
            var material = Materials[materialId];
            if (material && material.attributes && material.attributes.attack) {
                var materialBonus = material.attributes.attack * usedData.count;
                totalAttack += materialBonus;
            }
        }

        totalAttack += (getActiveBuffs().attackBonus || 0);
        totalAttack += (pd.tempAttackBonus || 0);

        return totalAttack;
    }

    function useMaterial(materialId) {
        var pd = getSaveData();
        var Materials = getMaterials();
        var materialData = pd.materials[materialId];
        if (!materialData || materialData.quantity <= 0) {
            Logger.info('材料数量不足');
            return false;
        }

        if (materialData.usedCount === undefined || materialData.usedCount === null) {
            materialData.usedCount = 0;
        }

        var material = Materials[materialId];
        if (!material) {
            Logger.info('材料不存在');
            return false;
        }

        materialData.quantity--;
        materialData.usedCount++;

        updateTaskProgressFn('use_material', 1);
        if (materialId === 'iceCrystal') {
            updateTaskProgressFn('use_ice_crystal', 1);
        }

        if (!pd.usedMaterials[materialId]) {
            pd.usedMaterials[materialId] = { count: 0 };
        }
        pd.usedMaterials[materialId].count++;

        // 水灵晶：解锁水灵星
        if (materialId === 'iceCrystal') {
            if (!pd.unlockedStarTypes || !Array.isArray(pd.unlockedStarTypes)) {
                pd.unlockedStarTypes = [];
            }
            if (pd.unlockedStarTypes.indexOf('ice') === -1) {
                pd.unlockedStarTypes.push('ice');
                showToast({ title: '解锁水灵星!', icon: 'none', duration: 2000 });
            }
        }

        // 火灵源：解锁火灵星
        if (materialId === 'fireSource') {
            if (!pd.unlockedStarTypes || !Array.isArray(pd.unlockedStarTypes)) {
                pd.unlockedStarTypes = [];
            }
            if (pd.unlockedStarTypes.indexOf('fire') === -1) {
                pd.unlockedStarTypes.push('fire');
                showToast({ title: '解锁火灵星!', icon: 'none', duration: 2000 });
            }
        }

        // 时序结晶：解锁/升级时序星
        if (materialId === 'timeCrystal') {
            if (!pd.unlockedStarTypes || !Array.isArray(pd.unlockedStarTypes)) {
                pd.unlockedStarTypes = [];
            }
            if (pd.unlockedStarTypes.indexOf('time') === -1) {
                pd.unlockedStarTypes.push('time');
                showToast({ title: '解锁时序星!', icon: 'none', duration: 2000 });
            } else {
                if (!pd.timeStarLevel) pd.timeStarLevel = 0;
                pd.timeStarLevel++;
                showToast({ title: '时序星升级! Lv.' + pd.timeStarLevel, icon: 'none', duration: 2000 });
            }
        }

        // 水灵暴晶：永久增加暴击率
        if (materialId === 'critCrystal') {
            var critBonus = Materials['critCrystal'].attributes.critRate || 3;
            pd.extraCritRate = (pd.extraCritRate || 0) + critBonus;
            showToast({ title: '会心感应 +' + critBonus + '%', icon: 'none', duration: 1500 });
        }

        // 火灵爆源：永久增加暴击伤害
        if (materialId === 'critFireSource') {
            var critDmgBonus = Materials['critFireSource'].attributes.critDamage || 0.1;
            pd.extraCritDamage = (pd.extraCritDamage || 0) + critDmgBonus;
            showToast({ title: '会心威力 +' + (critDmgBonus * 100) + '%', icon: 'none', duration: 1500 });
        }

        saveData();
        Logger.info('使用材料:', material.name, '剩余数量:', materialData.quantity);
        return true;
    }

    function upgradeIceStar() {
        var pd = getSaveData();
        var iceCrystalData = pd.materials['iceCrystal'];
        if (!iceCrystalData) {
            Logger.info('没有水灵晶');
            return false;
        }

        if (pd.iceStarLevel >= pd.maxIceStarLevel) {
            Logger.info('水灵星已达到最高等级');
            return false;
        }

        var upgradeCost = 5 * (pd.iceStarLevel + 1);
        if (iceCrystalData.quantity < upgradeCost) {
            showToast({ title: '水灵晶不足，需要' + upgradeCost + '个', icon: 'none', duration: 1500 });
            return false;
        }

        iceCrystalData.quantity -= upgradeCost;
        pd.iceStarLevel++;
        saveData();

        showToast({ title: '水灵星升到Lv.' + pd.iceStarLevel, icon: 'success', duration: 1500 });
        Logger.info('水灵星升级成功! 等级:', pd.iceStarLevel);
        return true;
    }

    function upgradeFireStar() {
        var pd = getSaveData();
        var fireSourceData = pd.materials['fireSource'];
        if (!fireSourceData) {
            Logger.info('没有火灵源');
            return false;
        }

        if (pd.fireStarLevel >= pd.maxFireStarLevel) {
            Logger.info('火灵星已达到最高等级');
            return false;
        }

        var upgradeCost = 5 * (pd.fireStarLevel + 1);
        if (fireSourceData.quantity < upgradeCost) {
            showToast({ title: '火灵源不足，需要' + upgradeCost + '个', icon: 'none', duration: 1500 });
            return false;
        }

        fireSourceData.quantity -= upgradeCost;
        pd.fireStarLevel++;
        saveData();

        showToast({ title: '火灵星升到Lv.' + pd.fireStarLevel, icon: 'success', duration: 1500 });
        Logger.info('火灵星升级成功! 等级:', pd.fireStarLevel);
        return true;
    }

    // ==================== 公共 API ====================

    return {
        calculateStarScore: calculateStarScore,
        calculateTotalAttack: calculateTotalAttack,
        useMaterial: useMaterial,
        upgradeIceStar: upgradeIceStar,
        upgradeFireStar: upgradeFireStar
    };
}

export { createMaterialSystem };
