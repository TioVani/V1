import Logger from '../utils/Logger.js';
/**
 * 材料使用系统（Material System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

function createMaterialSystem(deps) {
    // 依赖注入
    var getPlayerData = deps.getPlayerData;
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
        var playerData = getPlayerData();
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
                var hasFireStar = playerData.unlockedStarTypes && playerData.unlockedStarTypes.indexOf('fire') !== -1;
                if (hasFireStar) {
                    baseScore = 5 * (1 + playerData.fireStarLevel * 0.05);
                }
            }
        } else if (starType === 'ice') {
            if (isSeasonMode) {
                baseScore = 3;
            } else {
                var hasIceStar = playerData.unlockedStarTypes && playerData.unlockedStarTypes.indexOf('ice') !== -1;
                if (hasIceStar) {
                    baseScore = 3 * (1 + playerData.iceStarLevel * 0.05);
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
        var playerData = getPlayerData();
        var Materials = getMaterials();
        var GAME_STATE = getGameConst();
        var totalAttack = 0;
        var isSeasonMode = (getGameState() === GAME_STATE.SEASON_PLAYING);

        if (isSeasonMode && getSeasonSelection().character) {
            var maxLevelStats = getCharacterStatsAtLevel(getSeasonSelection().character, getMaxCharacterLevel());
            totalAttack += maxLevelStats.attack;
            return totalAttack;
        }

        var currentCharId = playerData.currentCharacterId;
        if (currentCharId) {
            var stats = getCharacterFullStats(currentCharId);
            totalAttack += stats.attack;
        }

        for (let materialId in playerData.usedMaterials) {
            var usedData = playerData.usedMaterials[materialId];
            var material = Materials[materialId];
            if (material && material.attributes && material.attributes.attack) {
                var materialBonus = material.attributes.attack * usedData.count;
                totalAttack += materialBonus;
            }
        }

        totalAttack += (getActiveBuffs().attackBonus || 0);
        totalAttack += (playerData.tempAttackBonus || 0);

        return totalAttack;
    }

    function useMaterial(materialId) {
        var playerData = getPlayerData();
        var Materials = getMaterials();
        var materialData = playerData.materials[materialId];
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

        if (!playerData.usedMaterials[materialId]) {
            playerData.usedMaterials[materialId] = { count: 0 };
        }
        playerData.usedMaterials[materialId].count++;

        // 冰晶：解锁冰星星
        if (materialId === 'iceCrystal') {
            if (!playerData.unlockedStarTypes || !Array.isArray(playerData.unlockedStarTypes)) {
                playerData.unlockedStarTypes = [];
            }
            if (playerData.unlockedStarTypes.indexOf('ice') === -1) {
                playerData.unlockedStarTypes.push('ice');
                showToast({ title: '解锁冰星星!', icon: 'none', duration: 2000 });
            }
        }

        // 火源：解锁火星星
        if (materialId === 'fireSource') {
            if (!playerData.unlockedStarTypes || !Array.isArray(playerData.unlockedStarTypes)) {
                playerData.unlockedStarTypes = [];
            }
            if (playerData.unlockedStarTypes.indexOf('fire') === -1) {
                playerData.unlockedStarTypes.push('fire');
                showToast({ title: '解锁火星星!', icon: 'none', duration: 2000 });
            }
        }

        // 时间结晶：解锁/升级时间星星
        if (materialId === 'timeCrystal') {
            if (!playerData.unlockedStarTypes || !Array.isArray(playerData.unlockedStarTypes)) {
                playerData.unlockedStarTypes = [];
            }
            if (playerData.unlockedStarTypes.indexOf('time') === -1) {
                playerData.unlockedStarTypes.push('time');
                showToast({ title: '解锁时间星星!', icon: 'none', duration: 2000 });
            } else {
                if (!playerData.timeStarLevel) playerData.timeStarLevel = 0;
                playerData.timeStarLevel++;
                showToast({ title: '时间星星升级! Lv.' + playerData.timeStarLevel, icon: 'none', duration: 2000 });
            }
        }

        // 暴击冰晶：永久增加暴击率
        if (materialId === 'critCrystal') {
            var critBonus = Materials['critCrystal'].attributes.critRate || 3;
            playerData.extraCritRate = (playerData.extraCritRate || 0) + critBonus;
            showToast({ title: '暴击率 +' + critBonus + '%', icon: 'none', duration: 1500 });
        }

        // 爆伤火源：永久增加暴击伤害
        if (materialId === 'critFireSource') {
            var critDmgBonus = Materials['critFireSource'].attributes.critDamage || 0.1;
            playerData.extraCritDamage = (playerData.extraCritDamage || 0) + critDmgBonus;
            showToast({ title: '暴击伤害 +' + (critDmgBonus * 100) + '%', icon: 'none', duration: 1500 });
        }

        saveData();
        Logger.info('使用材料:', material.name, '剩余数量:', materialData.quantity);
        return true;
    }

    function upgradeIceStar() {
        var playerData = getPlayerData();
        var iceCrystalData = playerData.materials['iceCrystal'];
        if (!iceCrystalData) {
            Logger.info('没有冰晶');
            return false;
        }

        if (playerData.iceStarLevel >= playerData.maxIceStarLevel) {
            Logger.info('冰星星已达到最高等级');
            return false;
        }

        var upgradeCost = 5 * (playerData.iceStarLevel + 1);
        if (iceCrystalData.quantity < upgradeCost) {
            showToast({ title: '冰晶不足，需要' + upgradeCost + '个', icon: 'none', duration: 1500 });
            return false;
        }

        iceCrystalData.quantity -= upgradeCost;
        playerData.iceStarLevel++;
        saveData();

        showToast({ title: '冰星星升到Lv.' + playerData.iceStarLevel, icon: 'success', duration: 1500 });
        Logger.info('冰星星升级成功! 等级:', playerData.iceStarLevel);
        return true;
    }

    function upgradeFireStar() {
        var playerData = getPlayerData();
        var fireSourceData = playerData.materials['fireSource'];
        if (!fireSourceData) {
            Logger.info('没有火源');
            return false;
        }

        if (playerData.fireStarLevel >= playerData.maxFireStarLevel) {
            Logger.info('火星星已达到最高等级');
            return false;
        }

        var upgradeCost = 5 * (playerData.fireStarLevel + 1);
        if (fireSourceData.quantity < upgradeCost) {
            showToast({ title: '火源不足，需要' + upgradeCost + '个', icon: 'none', duration: 1500 });
            return false;
        }

        fireSourceData.quantity -= upgradeCost;
        playerData.fireStarLevel++;
        saveData();

        showToast({ title: '火星星升到Lv.' + playerData.fireStarLevel, icon: 'success', duration: 1500 });
        Logger.info('火星星升级成功! 等级:', playerData.fireStarLevel);
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
