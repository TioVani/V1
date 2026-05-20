/**
 * FusionSkillStrategy — 泉涌（技能融合）
 * 3个同稀有度技能 + 灵石 → 复合技能
 * skills.owned 格式: [{uid, id, level}, ...]
 */
import { getNextRarity, FUSION_CONFIG, FUSION_TYPES } from '../../../config/FusionConfig.js';

var COMPOSITE_MAP = {
    'attack+attack+attack': 'annihilate',
    'attack+attack+passive': 'awakening',
    'attack+attack+support': 'resonance',
    'attack+passive+passive': 'awakening',
    'attack+passive+support': 'fusion',
    'attack+support+support': 'amplify',
    'support+support+support': 'blessing',
    'support+support+passive': 'eternal',
    'support+passive+passive': 'eternal',
    'passive+passive+passive': 'blessing'
};

var STAR_SOURCE_COST = 50;

function _getId(entry) {
    return typeof entry === 'string' ? entry : entry.id;
}

function createFusionSkillStrategy(deps) {
    var getPlayerData = deps.getPlayerData;
    var getSkills = deps.getSkills;
    var type = FUSION_TYPES.SKILL;

    function resolveMaterials(uids, playerData) {
        var Skills = getSkills();
        var owned = (playerData.skills && playerData.skills.owned) || [];
        var results = [];
        for (var i = 0; i < uids.length; i++) {
            var found = null;
            for (var j = 0; j < owned.length; j++) {
                if ((owned[j].uid || _getId(owned[j])) === uids[i]) { found = owned[j]; break; }
            }
            if (!found) return null;
            var skillId = _getId(found);
            var config = Skills[skillId];
            if (!config) return null;
            results.push({
                uid: found.uid || skillId, id: skillId, name: config.name, rarity: config.rarity,
                skillType: config.type, cooldown: config.cooldown || 30,
                effect: config.effect || 'damage', config: config
            });
        }
        return results;
    }

    function validate(materials) {
        if (materials.length < FUSION_CONFIG.materialCount) {
            return { valid: false, error: '需要' + FUSION_CONFIG.materialCount + '个技能' };
        }
        var seenIds = {};
        for (var i = 0; i < materials.length; i++) {
            if (seenIds[materials[i].id]) return { valid: false, error: '不能选择重复技能' };
            seenIds[materials[i].id] = true;
        }
        var rarity = materials[0].rarity;
        for (var i = 1; i < materials.length; i++) {
            if (materials[i].rarity !== rarity) return { valid: false, error: '技能稀有度必须相同' };
        }
        return { valid: true };
    }

    function checkExtraCost(playerData, materials) {
        if ((playerData.starSource || 0) < STAR_SOURCE_COST) {
            return { canAfford: false, error: '需要' + STAR_SOURCE_COST + '灵石' };
        }
        return { canAfford: true };
    }

    function consumeExtraCost(playerData) {
        playerData.starSource = (playerData.starSource || 0) - STAR_SOURCE_COST;
    }

    function calculateRateModifier(materials) {
        return FUSION_CONFIG.rarityModifier[materials[0].rarity] || 0;
    }

    function produce(materials, layer, greatSuccess) {
        var newRarity = getNextRarity(materials[0].rarity, layer);
        var compositeType = _getCompositeType(materials);
        var avgCooldown = Math.floor(_avgCooldown(materials) * 0.8);
        var stats = _calcStats(materials, layer);
        var resultId = 'fusion_skill_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        var resultName = _genName(compositeType, layer);
        var result = {
            id: resultId, type: type, name: resultName, rarity: newRarity,
            compositeType: compositeType, layer: layer,
            cooldown: avgCooldown, stats: stats,
            sourceIds: materials.map(function(m) { return m.uid; }),
            greatSuccess: greatSuccess,
            emoji: _compositeEmoji(compositeType),
            useCount: 0, maxLevel: 10
        };
        if (greatSuccess) {
            result.bonusAffix = _randomPick(FUSION_CONFIG.naming.affixes);
            result.cooldown = Math.floor(result.cooldown * 0.7);
        }
        return result;
    }

    function saveResult(result, playerData) {
        if (!playerData.skills) playerData.skills = { owned: [], equipped: [], gachaTickets: 0 };
        if (!playerData.skills.owned) playerData.skills.owned = [];
        playerData.skills.owned.push({
            uid: 'skill_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            id: result.id, level: 1
        });
        if (!playerData.fusionResults) playerData.fusionResults = {};
        playerData.fusionResults[result.id] = result;
        // 注册到 Skills 配置表
        var Skills = getSkills();
        Skills[result.id] = {
            id: result.id, name: result.name, type: result.compositeType || 'attack',
            rarity: result.rarity, cooldown: result.cooldown || 30,
            description: '复合技能·' + (result.compositeType || ''),
            emoji: result.emoji || '✨',
            effect: result.compositeType || 'damage',
            damage: (result.stats && result.stats.damage) || 0
        };
    }

    function consumeMaterials(uids, playerData) {
        if (!playerData.skills || !playerData.skills.owned) return;
        var owned = playerData.skills.owned;
        for (var i = 0; i < uids.length; i++) {
            for (var j = owned.length - 1; j >= 0; j--) {
                if ((owned[j].uid || _getId(owned[j])) === uids[i]) { owned.splice(j, 1); break; }
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
        var Skills = getSkills();
        var owned = (playerData.skills && playerData.skills.owned) || [];
        var counts = {};
        for (var i = 0; i < owned.length; i++) {
            var sid = _getId(owned[i]);
            counts[sid] = (counts[sid] || 0) + 1;
        }
        var added = {};
        var result = [];
        for (var i = 0; i < owned.length; i++) {
            var skillId = _getId(owned[i]);
            if (!added[skillId]) { added[skillId] = 0; }
            added[skillId]++;
            if (added[skillId] > counts[skillId] - 1) continue;
            var c = Skills[skillId];
            if (c) result.push({
                uid: owned[i].uid || skillId,
                id: skillId, name: c.name, rarity: c.rarity, skillType: c.type
            });
        }
        return result;
    }

    function _getCompositeType(materials) {
        var types = materials.map(function(m) { return m.skillType; }).sort();
        var key = types.join('+');
        return COMPOSITE_MAP[key] || 'fusion';
    }

    function _avgCooldown(materials) {
        var sum = 0;
        for (var i = 0; i < materials.length; i++) sum += materials[i].cooldown;
        return sum / materials.length;
    }

    function _calcStats(materials, layer) {
        var dmg = 0;
        for (var i = 0; i < materials.length; i++) dmg += materials[i].config.damage || 0;
        var m = FUSION_CONFIG.layerMultipliers[layer].stats;
        return { damage: Math.floor(dmg / materials.length * m) };
    }

    function _genName(compositeType, layer) {
        var names = {
            annihilate: '湮灭', resonance: '共鸣', amplify: '增幅',
            blessing: '祝福', awakening: '觉醒', eternal: '永恒', fusion: '融合'
        };
        var n = FUSION_CONFIG.naming;
        var base = names[compositeType] || '融合';
        var suffix = _randomPick(n.suffixes);
        if (layer === 'normal') return base + suffix;
        if (layer === 'super') return _randomPick(n.superPrefixes) + base + suffix;
        return _randomPick(n.ultraPrefixes) + '·' + base + suffix;
    }

    function _compositeEmoji(ct) {
        var m = { annihilate: '💥', resonance: '🎵', amplify: '⚡', blessing: '✨', awakening: '🔥', eternal: '💫', fusion: '🌀' };
        return m[ct] || '🌀';
    }

    function _randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    return {
        type: type, resolveMaterials: resolveMaterials, validate: validate,
        checkExtraCost: checkExtraCost, consumeExtraCost: consumeExtraCost,
        calculateRateModifier: calculateRateModifier,
        produce: produce, consumeMaterials: consumeMaterials,
        consumeRandomMaterials: consumeRandomMaterials, getAvailableMaterials: getAvailableMaterials,
        saveResult: saveResult
    };
}

export { createFusionSkillStrategy };
