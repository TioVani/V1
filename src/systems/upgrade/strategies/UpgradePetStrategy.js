/**
 * UpgradePetStrategy — 宠物升级策略
 * 兼容两种格式：string（旧）和 {uid/id/instanceId, level}（新）
 * 旧格式升级时自动转换为对象格式
 */
import { UPGRADE_CONFIG } from '../../../config/UpgradeConfig.js';

function createUpgradePetStrategy(deps) {
    var getSaveData = deps.getSaveData;
    var getPets = deps.getPets;
    var type = 'pet';

    function _getStarInfo(uid, playerData) {
        if (!playerData.upgradeData) playerData.upgradeData = { stars: {} };
        if (!playerData.upgradeData.stars) playerData.upgradeData.stars = {};
        if (!playerData.upgradeData.stars[uid]) {
            playerData.upgradeData.stars[uid] = { starLevel: 0, milestones: [] };
        }
        return playerData.upgradeData.stars[uid];
    }

    function _findOwned(uid, playerData) {
        var owned = (playerData.pets && playerData.pets.owned) || [];
        for (var i = 0; i < owned.length; i++) {
            var entry = owned[i];
            if (typeof entry === 'object') {
                // 优先匹配 uid，其次匹配 instanceId，最后匹配 id
                if (entry.uid === uid) return { entry: entry, index: i };
                if (entry.instanceId === uid) return { entry: entry, index: i };
            }
        }
        // 兼容旧数据：无 uid 的对象用 id 匹配
        for (var j = 0; j < owned.length; j++) {
            var entry2 = owned[j];
            if (typeof entry2 === 'object' && !entry2.uid && entry2.id === uid) return { entry: entry2, index: j };
        }
        return null;
    }

    function resolveEntity(uid, playerData) {
        var result = _findOwned(uid, playerData);
        if (!result) return null;
        var entry = result.entry;
        var Pets = getPets();
        var config = Pets[entry.id];
        if (!config) return null;
        // 确保 uid 存在
        if (!entry.uid) entry.uid = 'pet_' + entry.id + '_' + result.index;
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
        var config = UPGRADE_CONFIG.entities.pet;
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
        var entry = result.entry;
        if (typeof entry === 'string') {
            // 旧格式：string → 对象
            playerData.pets.owned[result.index] = {
                uid: uid,
                id: entry,
                level: 2
            };
        } else {
            entry.level = (entry.level || 1) + 1;
            if (!entry.uid) entry.uid = uid;
        }
    }

    function applyStarUpgrade(uid, playerData) {
        var starInfo = _getStarInfo(uid, playerData);
        starInfo.starLevel = (starInfo.starLevel || 0) + 1;
    }

    function getMaxLevel() {
        return UPGRADE_CONFIG.entities.pet.maxLevel;
    }

    function getAvailableEntities(playerData) {
        var Pets = getPets();
        var owned = (playerData.pets && playerData.pets.owned) || [];
        var result = [];
        for (var i = 0; i < owned.length; i++) {
            var entry = owned[i];
            if (typeof entry === 'string') continue; // 旧格式跳过（无 uid）
            if (!entry.uid) entry.uid = 'pet_' + entry.id + '_' + i;
            var config = Pets[entry.id];
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
        var Pets = getPets();
        var r0 = _findOwned(entityUid, playerData);
        if (!r0) return [];
        var targetId = r0.entry.id;
        var owned = (playerData.pets && playerData.pets.owned) || [];
        var result = [];
        var skipped = false;
        for (var i = 0; i < owned.length; i++) {
            if (typeof owned[i] === 'string') continue;
            if (owned[i].id === targetId) {
                var thisUid = owned[i].uid || owned[i].instanceId || owned[i].id;
                if (!skipped && thisUid === entityUid) { skipped = true; continue; }
                var c = Pets[owned[i].id];
                result.push({ uid: thisUid, id: owned[i].id, name: c ? c.name : owned[i].id, level: owned[i].level || 1, rarity: c ? c.rarity : '' });
            }
        }
        return result;
    }

    function consumeStarMaterials(materials, playerData) {
        if (!playerData.pets || !playerData.pets.owned) return;
        var owned = playerData.pets.owned;
        for (var i = 0; i < materials.length; i++) {
            var uid = materials[i].uid || materials[i];
            if (playerData.pets.equipped === uid) playerData.pets.equipped = null;
            for (var j = owned.length - 1; j >= 0; j--) {
                var e = owned[j];
                if (typeof e === 'string') continue;
                var eUid = e.uid || e.instanceId || e.id;
                if (eUid === uid) { owned.splice(j, 1); break; }
            }
        }
    }

    function refundStarMaterials(materials, playerData) {
        if (!playerData.pets) playerData.pets = { owned: [], equipped: null };
        if (!playerData.pets.owned) playerData.pets.owned = [];
        for (var i = 0; i < materials.length; i++) {
            var m = materials[i];
            playerData.pets.owned.push({
                uid: m.uid,
                id: m.id,
                instanceId: m.uid || m.instanceId,
                level: m.level || 1
            });
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

export { createUpgradePetStrategy };
