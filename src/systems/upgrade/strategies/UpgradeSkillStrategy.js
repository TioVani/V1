/**
 * UpgradeSkillStrategy — 技能升级策略
 * 兼容两种格式：string（旧）和 {uid, id, level}（新）
 * 旧格式升级时自动转换为对象格式
 */
import { UPGRADE_CONFIG } from '../../../config/UpgradeConfig.js';

function createUpgradeSkillStrategy(deps) {
    var getSaveData = deps.getSaveData;
    var getSkills = deps.getSkills;
    var type = 'skill';

    function _getStarInfo(uid, playerData) {
        if (!playerData.upgradeData) playerData.upgradeData = { stars: {} };
        if (!playerData.upgradeData.stars) playerData.upgradeData.stars = {};
        if (!playerData.upgradeData.stars[uid]) {
            playerData.upgradeData.stars[uid] = { starLevel: 0, milestones: [] };
        }
        return playerData.upgradeData.stars[uid];
    }

    function _findOwned(uid, playerData) {
        var owned = (playerData.skills && playerData.skills.owned) || [];
        for (var i = 0; i < owned.length; i++) {
            var entry = owned[i];
            if (typeof entry === 'object' && entry.uid === uid) return { entry: entry, index: i };
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
        var Skills = getSkills();
        var config = Skills[entry.id];
        if (!config) return null;
        // 确保 uid 存在
        if (!entry.uid) entry.uid = 'skill_' + entry.id + '_' + result.index;
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
        var config = UPGRADE_CONFIG.entities.skill;
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
            var Skills = getSkills();
            playerData.skills.owned[result.index] = {
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
        return UPGRADE_CONFIG.entities.skill.maxLevel;
    }

    function getAvailableEntities(playerData) {
        var Skills = getSkills();
        var owned = (playerData.skills && playerData.skills.owned) || [];
        var result = [];
        for (var i = 0; i < owned.length; i++) {
            var entry = owned[i];
            if (typeof entry === 'string') continue; // 旧格式跳过（无 uid）
            if (!entry.uid) entry.uid = 'skill_' + entry.id + '_' + i;
            var config = Skills[entry.id];
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
        var Skills = getSkills();
        var r0 = _findOwned(entityUid, playerData);
        if (!r0) return [];
        var targetId = r0.entry.id;
        var owned = (playerData.skills && playerData.skills.owned) || [];
        var result = [];
        var skipped = false;
        for (var i = 0; i < owned.length; i++) {
            if (typeof owned[i] === 'string') continue;
            if (owned[i].id === targetId) {
                var thisUid = owned[i].uid || owned[i].id;
                if (!skipped && thisUid === entityUid) { skipped = true; continue; }
                var c = Skills[owned[i].id];
                result.push({ uid: thisUid, id: owned[i].id, name: c ? c.name : owned[i].id, level: owned[i].level || 1, rarity: c ? c.rarity : '' });
            }
        }
        return result;
    }

    function consumeStarMaterials(materials, playerData) {
        if (!playerData.skills || !playerData.skills.owned) return;
        var owned = playerData.skills.owned;
        for (var i = 0; i < materials.length; i++) {
            var uid = materials[i].uid || materials[i];
            for (var j = owned.length - 1; j >= 0; j--) {
                var e = owned[j];
                if (typeof e === 'string') continue;
                var eUid = e.uid || e.id;
                if (eUid === uid) { owned.splice(j, 1); break; }
            }
        }
    }

    function refundStarMaterials(materials, playerData) {
        if (!playerData.skills) playerData.skills = { owned: [], equipped: [] };
        if (!playerData.skills.owned) playerData.skills.owned = [];
        for (var i = 0; i < materials.length; i++) {
            var m = materials[i];
            playerData.skills.owned.push({
                uid: m.uid,
                id: m.id,
                level: m.level || 1,
                rarity: m.rarity || ''
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

export { createUpgradeSkillStrategy };
