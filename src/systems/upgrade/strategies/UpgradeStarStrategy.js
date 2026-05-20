/**
 * UpgradeStarStrategy — 灵光升级策略
 * 与现有 MaterialSystem 的 iceStarLevel/fireStarLevel/timeStarLevel 集成
 * 消耗材料而非金币：iceCrystal / fireSource / timeCrystal
 */
import { UPGRADE_CONFIG } from '../../../config/UpgradeConfig.js';

// 灵光类型 → playerData 字段名 → 材料Key 的映射
var STAR_FIELD_MAP = {
    ice:   { field: 'iceStarLevel',  material: 'iceCrystal',   maxField: 'maxIceStarLevel' },
    fire:  { field: 'fireStarLevel', material: 'fireSource',    maxField: 'maxFireStarLevel' },
    time:  { field: 'timeStarLevel', material: 'timeCrystal',   maxField: 'maxTimeStarLevel' }
};

function createUpgradeStarStrategy(deps) {
    var getPlayerData = deps.getPlayerData;
    var getSeasonStarTypes = deps.getSeasonStarTypes;
    var type = 'star';

    function _getStarInfo(uid, playerData) {
        if (!playerData.upgradeData) playerData.upgradeData = { stars: {} };
        if (!playerData.upgradeData.stars) playerData.upgradeData.stars = {};
        if (!playerData.upgradeData.stars[uid]) {
            playerData.upgradeData.stars[uid] = { starLevel: 0, milestones: [] };
        }
        return playerData.upgradeData.stars[uid];
    }

    function resolveEntity(uid, playerData) {
        var map = STAR_FIELD_MAP[uid];
        if (!map) return null;
        var level = playerData[map.field] || 0;
        return { uid: uid, id: uid, name: _getStarName(uid), level: level };
    }

    function _getStarName(starId) {
        var names = { ice: '水灵星', fire: '火灵星', time: '时序星' };
        return names[starId] || starId;
    }

    function getUpgradeState(uid, playerData) {
        var map = STAR_FIELD_MAP[uid];
        var starInfo = _getStarInfo(uid, playerData);
        return {
            level: map ? (playerData[map.field] || 0) : 0,
            starLevel: starInfo.starLevel || 0,
            milestones: starInfo.milestones || []
        };
    }

    function getUpgradeCost(entity, state) {
        var map = STAR_FIELD_MAP[entity.uid];
        if (!map) return {};
        var amount = 5 * (state.level + 1);
        var cost = {};
        cost[map.material] = amount;
        return cost;
    }

    function canAfford(playerData, cost) {
        for (var k in cost) {
            if (!cost.hasOwnProperty(k)) continue;
            // 材料走 materials[key].quantity，其他资源走 playerData[key]
            var matData = playerData.materials && playerData.materials[k];
            if (matData) {
                if ((matData.quantity || 0) < cost[k]) return false;
            } else {
                if ((playerData[k] || 0) < cost[k]) return false;
            }
        }
        return true;
    }

    function consumeCost(playerData, cost) {
        for (var k in cost) {
            if (!cost.hasOwnProperty(k)) continue;
            var matData = playerData.materials && playerData.materials[k];
            if (matData) {
                matData.quantity = (matData.quantity || 0) - cost[k];
            } else {
                playerData[k] = (playerData[k] || 0) - cost[k];
            }
        }
    }

    function applyUpgrade(uid, playerData) {
        var map = STAR_FIELD_MAP[uid];
        if (!map) return;
        playerData[map.field] = (playerData[map.field] || 0) + 1;
    }

    function applyStarUpgrade(uid, playerData) {
        var starInfo = _getStarInfo(uid, playerData);
        starInfo.starLevel = (starInfo.starLevel || 0) + 1;
    }

    function getMaxLevel() {
        return UPGRADE_CONFIG.entities.star.maxLevel;
    }

    function getAvailableEntities(playerData) {
        var unlockedTypes = playerData.unlockedStarTypes || [];
        var result = [];
        for (var i = 0; i < unlockedTypes.length; i++) {
            var starId = unlockedTypes[i];
            var map = STAR_FIELD_MAP[starId];
            if (!map) continue;
            var level = playerData[map.field] || 0;
            var starInfo = (playerData.upgradeData && playerData.upgradeData.stars && playerData.upgradeData.stars[starId]) || { starLevel: 0 };
            result.push({
                uid: starId,
                id: starId,
                name: _getStarName(starId),
                level: level,
                starLevel: starInfo.starLevel || 0
            });
        }
        return result;
    }

    // 灵光用对应材料（水灵晶/火灵源/时序结晶）代替同ID副本作为升星材料
    // 虚拟材料ID格式: 'starMat_{starUid}_{index}'
    var _lastStarUid = null;

    function getStarMaterials(entityUid, playerData) {
        _lastStarUid = entityUid;
        var map = STAR_FIELD_MAP[entityUid];
        if (!map) return [];
        var matNames = { iceCrystal: '水灵晶', fireSource: '火灵源', timeCrystal: '时序结晶' };
        var matData = playerData.materials && playerData.materials[map.material];
        var qty = matData ? (matData.quantity || 0) : 0;
        var count = Math.floor(qty / 10);
        var result = [];
        for (var i = 0; i < count; i++) {
            result.push({ uid: 'starMat_' + entityUid + '_' + i, id: map.material, name: matNames[map.material] || map.material, level: 10, rarity: '' });
        }
        return result;
    }

    function consumeStarMaterials(ids, playerData) {
        var uid = _lastStarUid;
        var map = STAR_FIELD_MAP[uid];
        if (!map) return;
        var cost = ids.length * 10;
        if (playerData.materials && playerData.materials[map.material]) {
            playerData.materials[map.material].quantity = (playerData.materials[map.material].quantity || 0) - cost;
        }
    }

    function refundStarMaterials(materials, playerData) {
        var uid = _lastStarUid;
        var map = STAR_FIELD_MAP[uid];
        if (!map) return;
        var refundQty = Math.floor(materials.length * 5);
        if (refundQty > 0 && playerData.materials && playerData.materials[map.material]) {
            playerData.materials[map.material].quantity = (playerData.materials[map.material].quantity || 0) + refundQty;
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
        consumeStarMaterials: consumeStarMaterials,
        refundStarMaterials: refundStarMaterials
    };
}

export { createUpgradeStarStrategy };
