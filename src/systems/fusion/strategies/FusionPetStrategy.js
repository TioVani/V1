/**
 * FusionPetStrategy — 超然（宠物融合）
 * 3只同稀有度宠物（不要求同元素，越不同越特殊）→ 进化种
 */
import { getNextRarity, FUSION_CONFIG, FUSION_TYPES } from '../../../config/FusionConfig.js';

var EVOLUTION_TYPES = {
    PURE: 'pure',       // 纯系：全同技能
    HYBRID: 'hybrid',   // 混血：不同技能
    CHIMERA: 'chimera', // 嵌合：≥2 SR
    TRANSCEND: 'transcend' // 超越：全 UR+
};

function createFusionPetStrategy(deps) {
    var getPlayerData = deps.getPlayerData;
    var getPets = deps.getPets;
    var type = FUSION_TYPES.PET;

    function resolveMaterials(uids, playerData) {
        var Pets = getPets();
        var owned = (playerData.pets && playerData.pets.owned) || [];
        var results = [];
        for (var i = 0; i < uids.length; i++) {
            var found = null;
            for (var j = 0; j < owned.length; j++) {
                if (owned[j].uid === uids[i] || (owned[j].instanceId === uids[i]) || (!owned[j].uid && !owned[j].instanceId && owned[j].id === uids[i])) { found = owned[j]; break; }
            }
            if (!found) return null;
            var config = Pets[found.id];
            if (!config) return null;
            results.push({
                uid: found.uid, id: found.id, name: config.name,
                rarity: config.rarity, skill: config.skill || null,
                level: found.level || 1, config: config
            });
        }
        return results;
    }

    function validate(materials) {
        if (materials.length < FUSION_CONFIG.materialCount) {
            return { valid: false, error: '需要' + FUSION_CONFIG.materialCount + '只宠物' };
        }
        var rarity = materials[0].rarity;
        for (var i = 1; i < materials.length; i++) {
            if (materials[i].rarity !== rarity) return { valid: false, error: '宠物稀有度必须相同' };
        }
        return { valid: true };
    }

    function calculateRateModifier(materials) {
        return FUSION_CONFIG.rarityModifier[materials[0].rarity] || 0;
    }

    function produce(materials, layer, greatSuccess) {
        var newRarity = getNextRarity(materials[0].rarity);
        var evoType = _determineEvolution(materials);
        var stats = _calcStats(materials, layer);
        var resultId = 'fusion_pet_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        var resultName = _genName(evoType, layer);
        var result = {
            id: resultId, type: type, name: resultName, rarity: newRarity,
            evolutionType: evoType, layer: layer, stats: stats,
            sourceIds: materials.map(function(m) { return m.uid; }),
            greatSuccess: greatSuccess,
            emoji: _evoEmoji(evoType),
            skill: _determineSkill(materials, evoType)
        };
        if (greatSuccess) {
            result.bonusAffix = _randomPick(FUSION_CONFIG.naming.affixes);
            result.stats = _boostStats(result.stats);
            result.passive = _randomPick(['吸血', '反击', '守护', '连锁']);
        }
        return result;
    }

    function saveResult(result, playerData) {
        if (!playerData.pets) playerData.pets = { owned: [], equipped: null };
        if (!playerData.pets.owned) playerData.pets.owned = [];
        playerData.pets.owned.push({
            id: result.id, uid: 'pet_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            level: 1, exp: 0
        });
        if (!playerData.fusionResults) playerData.fusionResults = {};
        playerData.fusionResults[result.id] = result;
        // 注册到 Pets 配置表，背包/出战等消费端自动兼容
        var Pets = getPets();
        Pets[result.id] = {
            id: result.id, name: result.name, rarity: result.rarity,
            attack: (result.stats && result.stats.attack) || 0,
            attackSpeed: (result.stats && result.stats.attackSpeed) || 2,
            description: '融合产物·' + (result.evolutionType || ''),
            emoji: result.emoji || '🐾',
            skill: result.skill || null
        };
    }

    function consumeMaterials(uids, playerData) {
        if (!playerData.pets || !playerData.pets.owned) return;
        for (var i = 0; i < uids.length; i++) {
            if (playerData.pets.equipped === uids[i]) {
                playerData.pets.equipped = null;
            }
            for (var j = playerData.pets.owned.length - 1; j >= 0; j--) {
                if (playerData.pets.owned[j].uid === uids[i] || playerData.pets.owned[j].instanceId === uids[i] || (!playerData.pets.owned[j].uid && !playerData.pets.owned[j].instanceId && playerData.pets.owned[j].id === uids[i])) {
                    playerData.pets.owned.splice(j, 1);
                    break;
                }
            }
        }
    }

    function consumeRandomMaterials(uids, playerData, count) {
        var shuffled = uids.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
        }
        consumeMaterials(shuffled.slice(0, count), playerData);
    }

    function getAvailableMaterials(playerData) {
        var Pets = getPets();
        var owned = (playerData.pets && playerData.pets.owned) || [];
        var counts = {};
        for (var i = 0; i < owned.length; i++) {
            counts[owned[i].id] = (counts[owned[i].id] || 0) + 1;
        }
        var added = {};
        var result = [];
        for (var i = 0; i < owned.length; i++) {
            var id = owned[i].id;
            if (!added[id]) { added[id] = 0; }
            added[id]++;
            if (added[id] > counts[id] - 1) continue;
            var c = Pets[id];
            if (c) result.push({ uid: owned[i].uid || owned[i].instanceId || id, id: id, name: c.name, rarity: c.rarity });
        }
        return result;
    }

    function _determineEvolution(materials) {
        var skills = materials.map(function(m) { return m.skill; });
        var allSameSkill = skills.every(function(s) { return s === skills[0]; });
        var rarities = materials.map(function(m) { return m.rarity; });
        var allUR = rarities.every(function(r) { return r === 'UR' || r === 'LR' || r === 'SP'; });
        var srCount = rarities.filter(function(r) { return r === 'SR'; }).length;

        if (allUR) return EVOLUTION_TYPES.TRANSCEND;
        if (srCount >= 2) return EVOLUTION_TYPES.CHIMERA;
        if (allSameSkill) return EVOLUTION_TYPES.PURE;
        return EVOLUTION_TYPES.HYBRID;
    }

    function _calcStats(materials, layer) {
        var atk = 0, spd = 0;
        for (var i = 0; i < materials.length; i++) {
            atk += materials[i].config.attack || 0;
            spd += materials[i].config.attackSpeed || 2;
        }
        var m = FUSION_CONFIG.layerMultipliers[layer].stats;
        return {
            attack: Math.floor(atk / materials.length * m),
            attackSpeed: Math.round(spd / materials.length * 10) / 10
        };
    }

    function _determineSkill(materials, evoType) {
        var skills = materials.map(function(m) { return m.skill; }).filter(function(s) { return s; });
        if (evoType === EVOLUTION_TYPES.PURE && skills[0]) return skills[0] + '_evolved';
        if (skills.length > 0) return _randomPick(skills) + '_' + evoType;
        return 'fusion_' + evoType;
    }

    function _genName(evoType, layer) {
        var n = FUSION_CONFIG.naming;
        var prefix = { pure: '纯血', hybrid: '混血', chimera: '嵌合', transcend: '超越' }[evoType];
        var suffix = _randomPick(n.suffixes);
        if (layer === 'normal') return prefix + suffix;
        if (layer === 'super') return _randomPick(n.superPrefixes) + prefix + suffix;
        return _randomPick(n.ultraPrefixes) + '·' + prefix + suffix;
    }

    function _evoEmoji(evoType) {
        var m = { pure: '🐾', hybrid: '🦊', chimera: '🐉', transcend: '🔮' };
        return m[evoType] || '🐾';
    }

    function _randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function _boostStats(stats) {
        var r = {};
        var keys = Object.keys(stats);
        for (var i = 0; i < keys.length; i++) r[keys[i]] = Math.floor(stats[keys[i]] * 1.5);
        return r;
    }

    return {
        type: type, resolveMaterials: resolveMaterials, validate: validate,
        calculateRateModifier: calculateRateModifier,
        produce: produce, consumeMaterials: consumeMaterials,
        consumeRandomMaterials: consumeRandomMaterials, getAvailableMaterials: getAvailableMaterials,
        saveResult: saveResult
    };
}

export { createFusionPetStrategy };
