/**
 * FusionCharacterStrategy — 共进（角色融合）
 * 3个同稀有度角色，至少2个同元素 → ★新角色，稀有度跳一级
 */
import { getNextRarity, FUSION_CONFIG, FUSION_TYPES } from '../../../config/FusionConfig.js';

function createFusionCharacterStrategy(deps) {
    var getSaveData = deps.getSaveData;
    var getCharacters = deps.getCharacters;
    var type = FUSION_TYPES.CHARACTER;

    function _getConfig(charId) {
        var Characters = getCharacters();
        if (Characters[charId]) return Characters[charId];
        var keys = Object.keys(Characters);
        for (var i = 0; i < keys.length; i++) {
            if (Characters[keys[i]].id === charId) return Characters[keys[i]];
        }
        return null;
    }

    function resolveMaterials(ids, playerData) {
        var Characters = getCharacters();
        var owned = playerData.ownedCharacters || [];
        var results = [];
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            if (owned.indexOf(id) === -1) return null;
            var config = _getConfig(id);
            if (!config) return null;
            var exp = (playerData.characterExperience && playerData.characterExperience[id]) || {};
            results.push({
                id: id, name: config.name || id, rarity: config.rarity,
                element: config.element || 'none', level: exp.level || 1, config: config
            });
        }
        return results;
    }

    function validate(materials) {
        if (materials.length < FUSION_CONFIG.materialCount) {
            return { valid: false, error: '需要' + FUSION_CONFIG.materialCount + '个角色' };
        }
        var seenIds = {};
        for (var i = 0; i < materials.length; i++) {
            if (seenIds[materials[i].id]) return { valid: false, error: '不能选择重复角色' };
            seenIds[materials[i].id] = true;
        }
        var rarity = materials[0].rarity;
        for (var i = 1; i < materials.length; i++) {
            if (materials[i].rarity !== rarity) return { valid: false, error: '角色稀有度必须相同' };
        }
        var elCounts = {};
        for (var j = 0; j < materials.length; j++) {
            var e = materials[j].element;
            elCounts[e] = (elCounts[e] || 0) + 1;
        }
        var hasPair = false;
        var keys = Object.keys(elCounts);
        for (var k = 0; k < keys.length; k++) {
            if (elCounts[keys[k]] >= 2) { hasPair = true; break; }
        }
        if (!hasPair) return { valid: false, error: '至少需要2个同元素角色' };
        return { valid: true };
    }

    function calculateRateModifier(materials) {
        return FUSION_CONFIG.rarityModifier[materials[0].rarity] || 0;
    }

    function determineLayer(materials, playerData) {
        var fd = playerData.fusionData;
        if (!fd || !fd.characterLayers) return 'normal';
        var maxLayer = 'normal';
        var order = { normal: 0, super: 1, ultra: 2 };
        for (var i = 0; i < materials.length; i++) {
            var cl = fd.characterLayers[materials[i].id];
            if (cl && order[cl] > order[maxLayer]) maxLayer = cl;
        }
        return maxLayer;
    }

    function produce(materials, layer, greatSuccess) {
        var newRarity = getNextRarity(materials[0].rarity, layer);
        var mainEl = _getMainElement(materials);
        var stats = _calcStats(materials, mainEl, layer);
        var resultId = 'fusion_char_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        var resultName = _genName(layer, mainEl);
        var result = {
            id: resultId, type: type, name: resultName, rarity: newRarity,
            element: mainEl, layer: layer, stats: stats,
            sourceIds: materials.map(function(m) { return m.id; }),
            greatSuccess: greatSuccess, emoji: _elementEmoji(mainEl)
        };
        if (greatSuccess) {
            result.bonusAffix = _randomPick(FUSION_CONFIG.naming.affixes);
            result.stats = _boostStats(result.stats);
        }
        return result;
    }

    function saveResult(result, playerData) {
        if (!playerData.ownedCharacters) playerData.ownedCharacters = [];
        playerData.ownedCharacters.push(result.id);
        if (!playerData.characterExperience) playerData.characterExperience = {};
        playerData.characterExperience[result.id] = { level: 1, exp: 0, maxExp: 100 };
        if (!playerData.fusionData) playerData.fusionData = {};
        if (!playerData.fusionData.characterLayers) playerData.fusionData.characterLayers = {};
        playerData.fusionData.characterLayers[result.id] = result.layer || 'normal';
        if (!playerData.fusionResults) playerData.fusionResults = {};
        playerData.fusionResults[result.id] = result;
        // 注册到 Characters 配置表
        var Characters = getCharacters();
        Characters[result.id] = {
            id: result.id, name: result.name, emoji: result.emoji || '⭐',
            rarity: result.rarity, element: result.element || 'none',
            description: '融合角色·' + (result.element || ''),
            hp: (result.stats && result.stats.hp) || 100, hpGrowth: 10,
            attack: (result.stats && result.stats.attack) || 10, attackGrowth: 2,
            critRate: 5, critRateGrowth: 1,
            critDamage: 10, critDamageGrowth: 0.1,
            mana: 5, manaGrowth: 1,
            faith: 5, faithGrowth: 1,
            defense: 5, defenseGrowth: 1
        };
    }

    function consumeMaterials(ids, playerData) {
        var owned = playerData.ownedCharacters || [];
        for (var i = 0; i < ids.length; i++) {
            var idx = owned.indexOf(ids[i]);
            if (idx !== -1) owned.splice(idx, 1);
        }
        for (var j = 0; j < ids.length; j++) {
            if (playerData.characterExperience) delete playerData.characterExperience[ids[j]];
        }
    }

    function consumeRandomMaterials(ids, playerData, count) {
        var shuffled = ids.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
        }
        consumeMaterials(shuffled.slice(0, count), playerData);
    }

    function getAvailableMaterials(playerData) {
        var owned = playerData.ownedCharacters || [];
        var counts = {};
        for (var i = 0; i < owned.length; i++) {
            counts[owned[i]] = (counts[owned[i]] || 0) + 1;
        }
        var result = [];
        var added = {};
        for (var i = 0; i < owned.length; i++) {
            var id = owned[i];
            if (added[id]) continue;
            added[id] = true;
            var excess = counts[id] - 1;
            if (excess <= 0) continue;
            var c = _getConfig(id);
            if (c) {
                for (var j = 0; j < excess; j++) {
                    result.push({ id: id, name: c.name, rarity: c.rarity, element: c.element || 'none' });
                }
            }
        }
        return result;
    }

    function _getMainElement(materials) {
        var c = {};
        for (var i = 0; i < materials.length; i++) c[materials[i].element] = (c[materials[i].element] || 0) + 1;
        var best = 'none', max = 0;
        var keys = Object.keys(c);
        for (var j = 0; j < keys.length; j++) { if (c[keys[j]] > max) { max = c[keys[j]]; best = keys[j]; } }
        return best;
    }

    function _calcStats(materials, mainEl, layer) {
        var atk = 0, hp = 0;
        for (var i = 0; i < materials.length; i++) {
            var w = materials[i].element === mainEl ? 1.5 : (materials[i].element === 'none' ? 1.0 : 0.7);
            atk += (materials[i].config.attack || 0) * w;
            hp += (materials[i].config.hp || 0) * w;
        }
        var m = FUSION_CONFIG.layerMultipliers[layer].stats;
        return { attack: Math.floor(atk / materials.length * m), hp: Math.floor(hp / materials.length * m) };
    }

    function _genName(layer, element) {
        var n = FUSION_CONFIG.naming;
        var d = _randomPick(n.domains), s = _randomPick(n.suffixes);
        if (layer === 'normal') return d + '·' + s;
        if (layer === 'super') return _randomPick(n.superPrefixes) + d + '·' + s;
        return _randomPick(n.ultraPrefixes) + '·' + d + '·' + s;
    }

    function _elementEmoji(el) {
        var m = { fire: '🔥', ice: '❄️', thunder: '⚡', wind: '💨', light: '✨', dark: '🌑', none: '⭐' };
        return m[el] || '⭐';
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
        calculateRateModifier: calculateRateModifier, determineLayer: determineLayer,
        produce: produce, consumeMaterials: consumeMaterials,
        consumeRandomMaterials: consumeRandomMaterials, getAvailableMaterials: getAvailableMaterials,
        saveResult: saveResult
    };
}

export { createFusionCharacterStrategy };
