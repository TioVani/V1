/**
 * UpgradeCharacterStrategy — 角色升级策略
 * 读取 characterExperience[charId].level，不修改 CharacterSystem
 * 升星数据存储在 upgradeData.stars[uid]
 */
import { UPGRADE_CONFIG } from '../../../config/UpgradeConfig.js';

function createUpgradeCharacterStrategy(deps) {
    var getPlayerData = deps.getPlayerData;
    var getCharacters = deps.getCharacters;
    var type = 'character';

    function _getStarInfo(uid, playerData) {
        if (!playerData.upgradeData) playerData.upgradeData = { stars: {} };
        if (!playerData.upgradeData.stars) playerData.upgradeData.stars = {};
        if (!playerData.upgradeData.stars[uid]) {
            playerData.upgradeData.stars[uid] = { starLevel: 0, milestones: [] };
        }
        return playerData.upgradeData.stars[uid];
    }

    function resolveEntity(uid, playerData) {
        var charExp = playerData.characterExperience && playerData.characterExperience[uid];
        if (!charExp) return null;
        var Characters = getCharacters();
        var config = Characters[uid];
        if (!config) {
            var keys = Object.keys(Characters);
            for (var i = 0; i < keys.length; i++) {
                if (Characters[keys[i]].id === uid) { config = Characters[keys[i]]; break; }
            }
        }
        if (!config) return null;
        return { uid: uid, id: uid, name: config.name || uid, level: charExp.level || 1, config: config };
    }

    function getUpgradeState(uid, playerData) {
        var charExp = playerData.characterExperience && playerData.characterExperience[uid];
        var starInfo = _getStarInfo(uid, playerData);
        return {
            level: (charExp && charExp.level) || 1,
            starLevel: starInfo.starLevel || 0,
            milestones: starInfo.milestones || []
        };
    }

    function getUpgradeCost(entity, state) {
        var config = UPGRADE_CONFIG.entities.character;
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
        if (!playerData.characterExperience || typeof playerData.characterExperience !== 'object') {
            playerData.characterExperience = {};
        }
        if (!playerData.characterExperience[uid]) {
            playerData.characterExperience[uid] = { level: 1, exp: 0, maxExp: 100 };
        }
        var ce = playerData.characterExperience[uid];
        // 保留溢出经验：升级前 maxExp 减去剩余 exp，转成新等级的经验
        var overflow = Math.max(0, ce.exp - ce.maxExp);
        ce.level++;
        ce.maxExp = 100 * ce.level;
        ce.exp = overflow;
    }

    function applyStarUpgrade(uid, playerData) {
        var starInfo = _getStarInfo(uid, playerData);
        starInfo.starLevel = (starInfo.starLevel || 0) + 1;
    }

    function getMaxLevel() {
        return UPGRADE_CONFIG.entities.character.maxLevel;
    }

    function getAvailableEntities(playerData) {
        var Characters = getCharacters();
        var result = [];
        var owned = playerData.ownedCharacters || [];
        for (var i = 0; i < owned.length; i++) {
            var charId = owned[i];
            var charExp = playerData.characterExperience && playerData.characterExperience[charId];
            if (!charExp) continue;
            var config = Characters[charId];
            if (!config) {
                // key 和 id 可能不同，尝试遍历查找
                for (var key in Characters) {
                    if (Characters[key].id === charId) { config = Characters[key]; break; }
                }
            }
            if (!config) continue;
            var starInfo = (playerData.upgradeData && playerData.upgradeData.stars && playerData.upgradeData.stars[charId]) || { starLevel: 0 };
            result.push({
                uid: charId,
                id: charId,
                name: config.name || charId,
                level: charExp.level || 1,
                starLevel: starInfo.starLevel || 0
            });
        }
        return result;
    }

    function getStarMaterials(entityUid, playerData) {
        var Characters = getCharacters();
        var owned = playerData.ownedCharacters || [];
        var result = [];
        var skipped = false;
        for (var i = 0; i < owned.length; i++) {
            if (owned[i] === entityUid) {
                if (!skipped) { skipped = true; continue; }
                var c = Characters[owned[i]];
                var exp = (playerData.characterExperience && playerData.characterExperience[owned[i]]) || {};
                result.push({ uid: owned[i], id: owned[i], name: c ? c.name : owned[i], level: exp.level || 1, rarity: c ? c.rarity : '' });
            }
        }
        return result;
    }

    function consumeStarMaterials(materials, playerData) {
        var owned = playerData.ownedCharacters || [];
        for (var i = 0; i < materials.length; i++) {
            var uid = materials[i].uid || materials[i];
            var idx = owned.indexOf(uid);
            if (idx !== -1) owned.splice(idx, 1);
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

export { createUpgradeCharacterStrategy };
