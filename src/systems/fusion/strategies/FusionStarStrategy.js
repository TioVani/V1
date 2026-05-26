/**
 * FusionStarStrategy — 坍缩（灵光融合）
 * 3颗同类型灵光 + 时序结晶 → 新星类型
 */
import { FUSION_CONFIG, FUSION_TYPES } from '../../../config/FusionConfig.js';

var STAR_FUSION_TABLE = {
    'normal+normal+normal': 'collapse',
    'fire+fire+fire': 'supernova',
    'ice+ice+ice': 'freeze',
    'thunder+thunder+thunder': 'timesplit',
    'dodge+dodge+dodge': 'void',
    'default': 'collapse'
};

function createFusionStarStrategy(deps) {
    var getSaveData = deps.getSaveData;
    var getStarTypes = deps.getStarTypes;
    var getSeasonStarTypes = deps.getSeasonStarTypes;
    var type = FUSION_TYPES.STAR;

    function resolveMaterials(ids, playerData) {
        var starTypes = getStarTypes();
        var unlocked = playerData.unlockedStarTypes || [];
        var fused = (playerData.fusionData && playerData.fusionData.fusionStars) || [];
        var results = [];
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            // 先在融合灵光中按 uid 查找
            var found = null;
            for (var j = 0; j < fused.length; j++) {
                if (fused[j].uid === id) { found = fused[j]; break; }
            }
            // 再按 starType 在已解锁列表中查找
            if (!found && unlocked.indexOf(id) !== -1) {
                found = { starType: id, rarity: (starTypes[id] && starTypes[id].rarity) || 'R' };
            }
            if (!found) return null;
            var config = starTypes[found.starType];
            results.push({
                uid: found.uid || found.starType, starType: found.starType,
                name: config ? config.name : found.starType,
                rarity: found.rarity || 'R', config: config || {}
            });
        }
        return results;
    }

    function validate(materials) {
        if (materials.length < FUSION_CONFIG.materialCount) {
            return { valid: false, error: '需要' + FUSION_CONFIG.materialCount + '颗灵光' };
        }
        var st = materials[0].starType;
        for (var i = 1; i < materials.length; i++) {
            if (materials[i].starType !== st) return { valid: false, error: '灵光类型必须相同' };
        }
        return { valid: true };
    }

    function checkExtraCost(playerData, materials) {
        var tc = playerData.materials && playerData.materials.timeCrystal;
        if (!tc || tc.quantity < 1) return { canAfford: false, error: '需要1个时序结晶' };
        return { canAfford: true };
    }

    function consumeExtraCost(playerData) {
        if (playerData.materials && playerData.materials.timeCrystal) {
            playerData.materials.timeCrystal.quantity--;
        }
    }

    function calculateRateModifier(materials) {
        return FUSION_CONFIG.rarityModifier[materials[0].rarity] || 0;
    }

    function produce(materials, layer, greatSuccess) {
        var starType = _determineStarType(materials);
        var resultId = 'fusion_star_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        var resultName = _genName(starType, layer);
        var result = {
            id: resultId, type: type, name: resultName,
            starType: starType, layer: layer,
            sourceIds: materials.map(function(m) { return m.uid; }),
            greatSuccess: greatSuccess,
            emoji: _starEmoji(starType),
            resonanceSlots: 3,
            effects: _genEffects(starType, layer)
        };
        if (greatSuccess) {
            result.bonusAffix = _randomPick(FUSION_CONFIG.naming.affixes);
            result.resonanceSlots = 4;
        }
        return result;
    }

    function saveResult(result, playerData) {
        if (!playerData.fusionData) playerData.fusionData = { pityCount: {}, codex: {}, history: [], stats: { totalAttempts: 0, totalSuccesses: 0, totalGreatSuccesses: 0 } };
        if (!playerData.fusionData.fusionStars) playerData.fusionData.fusionStars = [];
        playerData.fusionData.fusionStars.push({
            uid: 'star_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            starType: result.starType, rarity: 'SR', id: result.id
        });
        if (!playerData.fusionResults) playerData.fusionResults = {};
        playerData.fusionResults[result.id] = result;
        // 注册到 SEASON_STAR_TYPES 配置表
        if (getSeasonStarTypes) {
            var arr = getSeasonStarTypes();
            var exists = false;
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].id === result.starType) { exists = true; break; }
            }
            if (!exists) {
                arr.push({ id: result.starType, name: result.name || result.starType, rarity: 'SR' });
            }
        }
    }

    function consumeMaterials(uids, playerData) {
        if (!playerData.fusionData || !playerData.fusionData.fusionStars) return;
        var stars = playerData.fusionData.fusionStars;
        for (var i = 0; i < uids.length; i++) {
            for (var j = stars.length - 1; j >= 0; j--) {
                if (stars[j].uid === uids[i]) { stars.splice(j, 1); break; }
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
        var starTypes = getStarTypes();
        // 从已解锁的灵光类型 + 融合产出的灵光 中获取可用材料
        var unlocked = playerData.unlockedStarTypes || [];
        var fused = (playerData.fusionData && playerData.fusionData.fusionStars) || [];
        var result = [];
        var seen = {};
        // 已解锁的灵光类型（排除 normal 和 boss_star）
        for (var i = 0; i < unlocked.length; i++) {
            var st = unlocked[i];
            if (st === 'normal' || st === 'boss_star') continue;
            if (seen[st]) continue;
            seen[st] = true;
            var c = starTypes[st];
            result.push({ id: st, starType: st, name: c ? c.name : st, rarity: (c && c.rarity) || 'R' });
        }
        // 融合产出的灵光
        for (var j = 0; j < fused.length; j++) {
            var f = fused[j];
            if (seen[f.starType]) continue;
            seen[f.starType] = true;
            var c2 = starTypes[f.starType];
            result.push({ uid: f.uid, id: f.starType, starType: f.starType, name: c2 ? c2.name : f.starType, rarity: f.rarity || 'R' });
        }
        return result;
    }

    function _determineStarType(materials) {
        var types = materials.map(function(m) { return m.starType; }).sort().join('+');
        return STAR_FUSION_TABLE[types] || STAR_FUSION_TABLE['default'];
    }

    function _genEffects(starType, layer) {
        var m = FUSION_CONFIG.layerMultipliers[layer].stats;
        var base = {
            collapse: { damageBonus: 2 * m },
            freeze: { freezeChance: 0.3 * m },
            supernova: { aoeDamage: 5 * m },
            timesplit: { timeBonus: 3 * m },
            void: { dodgeChance: 0.2 * m }
        };
        return base[starType] || { damageBonus: m };
    }

    function _genName(starType, layer) {
        var names = { collapse: '坍缩星', freeze: '冻结星', supernova: '超新星', timesplit: '时裂星' };
        var n = FUSION_CONFIG.naming;
        var base = names[starType] || '新星';
        if (layer === 'normal') return base;
        if (layer === 'super') return _randomPick(n.superPrefixes) + base;
        return _randomPick(n.ultraPrefixes) + base;
    }

    function _starEmoji(st) {
        var m = { collapse: '⚫', freeze: '🧊', supernova: '🌟', timesplit: '⏳', void: '🌀' };
        return m[st] || '⭐';
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

export { createFusionStarStrategy };
