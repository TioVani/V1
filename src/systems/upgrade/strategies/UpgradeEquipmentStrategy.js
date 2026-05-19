/**
 * UpgradeEquipmentStrategy — 装备升级策略
 * 基于 equipments.owned 数组，通过 uid 匹配
 * 兼容无 uid 的旧数据（用 index 生成 fallback uid）
 */
import { UPGRADE_CONFIG } from '../../../config/UpgradeConfig.js';

function createUpgradeEquipmentStrategy(deps) {
    var getPlayerData = deps.getPlayerData;
    var getEquipments = deps.getEquipments;
    var type = 'equipment';

    function _getStarInfo(uid, playerData) {
        if (!playerData.upgradeData) playerData.upgradeData = { stars: {} };
        if (!playerData.upgradeData.stars) playerData.upgradeData.stars = {};
        if (!playerData.upgradeData.stars[uid]) {
            playerData.upgradeData.stars[uid] = { starLevel: 0, milestones: [] };
        }
        return playerData.upgradeData.stars[uid];
    }

    function _findOwned(uid, playerData) {
        var owned = (playerData.equipments && playerData.equipments.owned) || [];
        for (var i = 0; i < owned.length; i++) {
            if (owned[i].uid === uid) return { entry: owned[i], index: i };
        }
        // 兼容旧数据：无 uid 的装备用 id 匹配
        for (var j = 0; j < owned.length; j++) {
            if (!owned[j].uid && owned[j].id === uid) return { entry: owned[j], index: j };
        }
        return null;
    }

    function resolveEntity(uid, playerData) {
        var result = _findOwned(uid, playerData);
        if (!result) return null;
        var entry = result.entry;
        var Equipments = getEquipments();
        var config = Equipments[entry.id];
        if (!config) return null;
        // 确保 uid 存在
        if (!entry.uid) entry.uid = 'equip_' + entry.id + '_' + result.index;
        return { uid: entry.uid, id: entry.id, name: config.name || entry.id, level: entry.level || 1, config: config };
    }

    function getUpgradeState(uid, playerData) {
        var result = _findOwned(uid, playerData);
        var starInfo = _getStarInfo(uid, playerData);
        return {
            level: (result && result.entry.level) || 1,
            starLevel: starInfo.starLevel || 0,
            milestones: starInfo.milestones || []
        };
    }

    function getUpgradeCost(entity, state) {
        var config = UPGRADE_CONFIG.entities.equipment;
        var gold = config.upgradeCostFormula(state.level);
        return { gold: gold };
    }

    function canAfford(playerData, cost) {
        for (var k in cost) {
            if ((playerData[k] || 0) < cost[k]) return false;
        }
        return true;
    }

    function consumeCost(playerData, cost) {
        for (var k in cost) {
            playerData[k] = (playerData[k] || 0) - cost[k];
        }
    }

    function applyUpgrade(uid, playerData) {
        var result = _findOwned(uid, playerData);
        if (!result) return;
        result.entry.level = (result.entry.level || 1) + 1;
    }

    function applyStarUpgrade(uid, playerData) {
        var starInfo = _getStarInfo(uid, playerData);
        starInfo.starLevel = (starInfo.starLevel || 0) + 1;
    }

    function getMaxLevel() {
        return UPGRADE_CONFIG.entities.equipment.maxLevel;
    }

    function getAvailableEntities(playerData) {
        var Equipments = getEquipments();
        var owned = (playerData.equipments && playerData.equipments.owned) || [];
        var result = [];
        for (var i = 0; i < owned.length; i++) {
            var entry = owned[i];
            // 确保有 uid
            if (!entry.uid) entry.uid = 'equip_' + entry.id + '_' + i;
            var config = Equipments[entry.id];
            if (!config) continue;
            var starInfo = (playerData.upgradeData && playerData.upgradeData.stars && playerData.upgradeData.stars[entry.uid]) || { starLevel: 0 };
            result.push({
                uid: entry.uid,
                id: entry.id,
                name: config.name || entry.id,
                level: entry.level || 1,
                starLevel: starInfo.starLevel || 0
            });
        }
        return result;
    }

    function getStarMaterials(entityUid, playerData) {
        var Equipments = getEquipments();
        var result0 = _findOwned(entityUid, playerData);
        if (!result0) return [];
        var targetId = result0.entry.id;
        var owned = (playerData.equipments && playerData.equipments.owned) || [];
        var result = [];
        var skipped = false;
        for (var i = 0; i < owned.length; i++) {
            if (owned[i].id === targetId) {
                if (!skipped && (owned[i].uid === entityUid || (!owned[i].uid && owned[i].id === entityUid))) {
                    skipped = true;
                    continue;
                }
                var c = Equipments[owned[i].id];
                result.push({ uid: owned[i].uid || owned[i].id, id: owned[i].id, name: c ? c.name : owned[i].id, level: owned[i].level || 1, rarity: c ? c.rarity : '' });
            }
        }
        return result;
    }

    function consumeStarMaterials(materials, playerData) {
        if (!playerData.equipments || !playerData.equipments.owned) return;
        var owned = playerData.equipments.owned;
        for (var i = 0; i < materials.length; i++) {
            var uid = materials[i].uid || materials[i];
            for (var j = owned.length - 1; j >= 0; j--) {
                if (owned[j].uid === uid || (!owned[j].uid && owned[j].id === uid)) {
                    if (playerData.equipments.equipped) {
                        var eq = playerData.equipments.equipped;
                        var keys = Object.keys(eq);
                        for (var k = 0; k < keys.length; k++) {
                            if (eq[keys[k]] === uid) eq[keys[k]] = null;
                        }
                    }
                    owned.splice(j, 1);
                    break;
                }
            }
        }
    }

    return {
        type: type,
        resolveEntity: resolveEntity,
        getUpgradeState: getUpgradeState,
        getUpgradeCost: getUpgradeCost,
        canAfford: canAfford,
        consumeCost: consumeCost,
        applyUpgrade: applyUpgrade,
        applyStarUpgrade: applyStarUpgrade,
        getMaxLevel: getMaxLevel,
        getAvailableEntities: getAvailableEntities,
        getStarMaterials: getStarMaterials,
        consumeStarMaterials: consumeStarMaterials
    };
}

export { createUpgradeEquipmentStrategy };
