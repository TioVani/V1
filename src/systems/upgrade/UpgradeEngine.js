/**
 * UpgradeEngine — 升级+升星核心引擎
 * 流程编排：校验 → 扣费 → 应用 → 存档
 * 升星规则：无等级门槛 + 消耗同ID副本 + 概率成功
 */
import Logger from '../../utils/Logger.js';
import { UPGRADE_CONFIG } from '../../config/UpgradeConfig.js';

function createUpgradeEngine(deps) {
    var getSaveData = deps.getSaveData;
    var saveData = deps.saveData;
    var showToast = deps.showToast;
    var strategies = deps.strategies;

    function upgrade(entityUid, type) {
        var strategy = strategies[type];
        if (!strategy) {
            showToast({ title: '未知升级类型', icon: 'none', duration: 1500 });
            return { success: false, error: 'unknown_type' };
        }

        var pd = getSaveData();
        var entity = strategy.resolveEntity(entityUid, pd);
        if (!entity) {
            showToast({ title: '未找到该实体', icon: 'none', duration: 1500 });
            return { success: false, error: 'entity_not_found' };
        }

        var config = UPGRADE_CONFIG.entities[type];
        var state = strategy.getUpgradeState(entityUid, pd);

        if (state.level >= config.maxLevel) {
            showToast({ title: '已达最高等级', icon: 'none', duration: 1500 });
            return { success: false, error: 'max_level' };
        }

        var cost = strategy.getUpgradeCost(entity, state);
        if (!strategy.canAfford(pd, cost)) {
            showToast({ title: '资源不足', icon: 'none', duration: 1500 });
            return { success: false, error: 'insufficient' };
        }

        strategy.consumeCost(pd, cost);
        strategy.applyUpgrade(entityUid, pd);

        var newState = strategy.getUpgradeState(entityUid, pd);
        saveData();
        Logger.info('[升级] type=' + type + ' uid=' + entityUid + ' level=' + state.level + '→' + newState.level);

        showToast({ title: '升级成功 Lv.' + newState.level, icon: 'none', duration: 1500 });
        return { success: true, newLevel: newState.level };
    }

    function starUpgrade(entityUid, type) {
        var strategy = strategies[type];
        if (!strategy) {
            showToast({ title: '未知升级类型', icon: 'none', duration: 1500 });
            return { success: false, error: 'unknown_type' };
        }

        var pd = getSaveData();
        var entity = strategy.resolveEntity(entityUid, pd);
        if (!entity) {
            showToast({ title: '未找到该实体', icon: 'none', duration: 1500 });
            return { success: false, error: 'entity_not_found' };
        }

        var config = UPGRADE_CONFIG.entities[type];
        var state = strategy.getUpgradeState(entityUid, pd);
        var currentStar = state.starLevel || 0;

        if (currentStar >= config.maxStar) {
            showToast({ title: '已达最高星级', icon: 'none', duration: 1500 });
            return { success: false, error: 'max_star' };
        }

        var needed = config.starMaterials[currentStar];
        var available = strategy.getStarMaterials(entityUid, pd);

        if (available.length < needed) {
            showToast({ title: '需要' + needed + '个相同' + _getTypeName(type), icon: 'none', duration: 1500 });
            return { success: false, error: 'insufficient_materials' };
        }

        // 消耗材料
        var consumed = available.slice(0, needed);
        strategy.consumeStarMaterials(consumed, pd);

        // 概率判定
        var rate = config.starRates[currentStar];
        var roll = Math.random();
        var success = roll < rate;

        if (success) {
            strategy.applyStarUpgrade(entityUid, pd);
            var newState = strategy.getUpgradeState(entityUid, pd);
            saveData();
            Logger.info('[升星成功] type=' + type + ' uid=' + entityUid + ' star=' + currentStar + '→' + newState.starLevel + ' rate=' + rate);
            showToast({ title: '升星成功！★' + newState.starLevel, icon: 'none', duration: 2000 });
            return { success: true, newStarLevel: newState.starLevel, rate: rate, roll: roll };
        } else {
            // 失败返还 50% 材料（向下取整，最少返还 0）
            var refundCount = Math.floor(needed * 0.5);
            if (refundCount > 0) {
                var refundMaterials = consumed.slice(0, refundCount);
                strategy.refundStarMaterials(refundMaterials, pd);
            }
            saveData();
            Logger.info('[升星失败] type=' + type + ' uid=' + entityUid + ' star=' + currentStar + ' rate=' + rate + ' roll=' + roll.toFixed(3) + ' refund=' + refundCount);
            showToast({ title: '升星失败…返还' + refundCount + '个材料', icon: 'none', duration: 1500 });
            return { success: false, starLevel: currentStar, rate: rate, roll: roll };
        }
    }

    function getUpgradeInfo(entityUid, type) {
        var strategy = strategies[type];
        if (!strategy) return null;

        var pd = getSaveData();
        var entity = strategy.resolveEntity(entityUid, pd);
        if (!entity) return null;

        var config = UPGRADE_CONFIG.entities[type];
        var state = strategy.getUpgradeState(entityUid, pd);
        var currentStar = state.starLevel || 0;
        var atMaxLevel = state.level >= config.maxLevel;
        var atMaxStar = currentStar >= config.maxStar;

        var result = {
            level: state.level,
            maxLevel: config.maxLevel,
            atMaxLevel: atMaxLevel,
            starLevel: currentStar,
            maxStar: config.maxStar,
            atMaxStar: atMaxStar
        };

        if (!atMaxLevel) {
            result.upgradeCost = strategy.getUpgradeCost(entity, state);
        }
        if (!atMaxStar) {
            result.starMaterialCount = config.starMaterials[currentStar];
            result.starRate = config.starRates[currentStar];
            result.starMultiplier = config.starMultiplier[currentStar + 1];
            var mats = strategy.getStarMaterials(entityUid, pd);
            result.availableMaterials = mats.length;
            result.materialDetails = mats;
        }
        result.currentMultiplier = config.starMultiplier[currentStar];

        return result;
    }

    function getAvailableEntities(type) {
        var strategy = strategies[type];
        if (!strategy) return [];
        return strategy.getAvailableEntities(getSaveData());
    }

    function _getTypeName(type) {
        var names = { character: '角色', equipment: '装备', skill: '技能', pet: '宠物', star: '灵光' };
        return names[type] || type;
    }

    return {
        upgrade: upgrade,
        starUpgrade: starUpgrade,
        getUpgradeInfo: getUpgradeInfo,
        getAvailableEntities: getAvailableEntities
    };
}

export { createUpgradeEngine };
