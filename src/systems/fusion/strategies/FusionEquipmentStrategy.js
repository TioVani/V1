/**
 * FusionEquipmentStrategy — 祝融（装备融合）
 * 3件同部位装备 + 金币 → 神锻装备（不可拆卸，强化上限+15）
 */
import { getNextRarity, FUSION_CONFIG, FUSION_TYPES } from '../../../config/FusionConfig.js';

var FORGE_AFFIXES = ['sharp', 'tough', 'lucky', 'resonance', 'forge'];

function createFusionEquipmentStrategy(deps) {
    var getPlayerData = deps.getPlayerData;
    var getEquipments = deps.getEquipments;
    var type = FUSION_TYPES.EQUIPMENT;

    function _goldCost(rarity) {
        var costs = { UC: 500, N: 800, R: 1000, SR: 2000, SSR: 5000, UR: 10000, LR: 20000, SP: 50000 };
        return costs[rarity] || 1000;
    }

    function resolveMaterials(uids, playerData) {
        var Equipments = getEquipments();
        var owned = (playerData.equipments && playerData.equipments.owned) || [];
        var results = [];
        for (var i = 0; i < uids.length; i++) {
            var found = null;
            for (var j = 0; j < owned.length; j++) {
                if (owned[j].uid === uids[i] || (!owned[j].uid && owned[j].id === uids[i])) { found = owned[j]; break; }
            }
            if (!found) return null;
            var config = Equipments[found.id];
            if (!config) return null;
            results.push({
                uid: found.uid, id: found.id, name: config.name,
                rarity: config.rarity, slot: config.type,
                level: found.level || 1, config: config
            });
        }
        return results;
    }

    function validate(materials) {
        if (materials.length < FUSION_CONFIG.materialCount) {
            return { valid: false, error: '需要' + FUSION_CONFIG.materialCount + '件装备' };
        }
        var slot = materials[0].slot;
        for (var i = 1; i < materials.length; i++) {
            if (materials[i].slot !== slot) return { valid: false, error: '装备部位必须相同' };
        }
        var rarity = materials[0].rarity;
        for (var j = 1; j < materials.length; j++) {
            if (materials[j].rarity !== rarity) return { valid: false, error: '装备稀有度必须相同' };
        }
        return { valid: true };
    }

    function checkExtraCost(playerData, materials) {
        var rarity = materials && materials[0] ? materials[0].rarity : 'R';
        var cost = _goldCost(rarity);
        if ((playerData.gold || 0) < cost) {
            return { canAfford: false, error: '金币不足，需要' + cost };
        }
        return { canAfford: true, _cost: cost };
    }

    function consumeExtraCost(playerData, materials) {
        var rarity = materials && materials[0] ? materials[0].rarity : 'R';
        playerData.gold = (playerData.gold || 0) - _goldCost(rarity);
    }

    function saveResult(result, playerData) {
        if (!playerData.equipments) playerData.equipments = { owned: [], equipped: {} };
        if (!playerData.equipments.owned) playerData.equipments.owned = [];
        playerData.equipments.owned.push({
            id: result.id, uid: 'equip_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            level: 1
        });
        if (!playerData.fusionResults) playerData.fusionResults = {};
        playerData.fusionResults[result.id] = result;
        // 注册到 Equipments 配置表
        var Equipments = getEquipments();
        Equipments[result.id] = {
            id: result.id, name: result.name, type: result.slot, rarity: result.rarity,
            description: '神锻装备·' + (result.forgeAffix || ''),
            emoji: result.emoji || '⚔️',
            attack: (result.stats && result.stats.attack) || 0,
            critRate: (result.stats && result.stats.critRate) || 0,
            critDamage: (result.stats && result.stats.critDamage) || 0
        };
    }

    function calculateRateModifier(materials) {
        return FUSION_CONFIG.rarityModifier[materials[0].rarity] || 0;
    }

    function produce(materials, layer, greatSuccess) {
        var newRarity = getNextRarity(materials[0].rarity);
        var slot = materials[0].slot;
        var stats = _calcStats(materials, layer);
        var forgeAffix = _randomPick(FORGE_AFFIXES);
        var resultId = 'fusion_equip_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        var resultName = _genName(slot, layer);
        var result = {
            id: resultId, type: type, name: resultName, rarity: newRarity,
            slot: slot, layer: layer, stats: stats,
            forgeAffix: forgeAffix, bound: true, maxEnhance: 15,
            sourceIds: materials.map(function(m) { return m.uid; }),
            greatSuccess: greatSuccess,
            emoji: _slotEmoji(slot)
        };
        if (greatSuccess) {
            result.bonusAffix = _randomPick(FORGE_AFFIXES.filter(function(a) { return a !== forgeAffix; }));
            result.stats = _boostStats(result.stats);
        }
        return result;
    }

    function consumeMaterials(uids, playerData) {
        if (!playerData.equipments || !playerData.equipments.owned) return;
        var owned = playerData.equipments.owned;
        for (var i = 0; i < uids.length; i++) {
            if (playerData.equipments.equipped) {
                var eq = playerData.equipments.equipped;
                var keys = Object.keys(eq);
                for (var k = 0; k < keys.length; k++) {
                    if (eq[keys[k]] === uids[i]) eq[keys[k]] = null;
                }
            }
            for (var j = owned.length - 1; j >= 0; j--) {
                if (owned[j].uid === uids[i] || (!owned[j].uid && owned[j].id === uids[i])) { owned.splice(j, 1); break; }
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
        var Equipments = getEquipments();
        var owned = (playerData.equipments && playerData.equipments.owned) || [];
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
            var c = Equipments[id];
            if (c) result.push({ uid: owned[i].uid || id, id: id, name: c.name, rarity: c.rarity, slot: c.type });
        }
        return result;
    }

    function _calcStats(materials, layer) {
        var atk = 0, crit = 0, critDmg = 0;
        for (var i = 0; i < materials.length; i++) {
            atk += materials[i].config.attack || 0;
            crit += materials[i].config.critRate || 0;
            critDmg += materials[i].config.critDamage || 0;
        }
        // 属性和×0.8
        var m = FUSION_CONFIG.layerMultipliers[layer].stats * 0.8;
        return {
            attack: Math.floor(atk * m),
            critRate: Math.round(crit / materials.length * 10) / 10,
            critDamage: Math.round(critDmg / materials.length * 100) / 100
        };
    }

    function _genName(slot, layer) {
        var slotNames = { weapon: '刃', armor: '铠', accessory: '环', set: '装' };
        var n = FUSION_CONFIG.naming;
        var s = slotNames[slot] || '器';
        var suffix = _randomPick(n.suffixes);
        if (layer === 'normal') return '神锻' + s + suffix;
        if (layer === 'super') return _randomPick(n.superPrefixes) + '神锻' + s + suffix;
        return _randomPick(n.ultraPrefixes) + '·神锻' + s + suffix;
    }

    function _slotEmoji(slot) {
        var m = { weapon: '⚔️', armor: '🛡️', accessory: '💍', set: '👑' };
        return m[slot] || '🔧';
    }

    function _randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function _boostStats(stats) {
        var r = {};
        var keys = Object.keys(stats);
        for (var i = 0; i < keys.length; i++) {
            if (typeof stats[keys[i]] === 'number') r[keys[i]] = Math.floor(stats[keys[i]] * 1.5);
        }
        return r;
    }

    return {
        type: type, resolveMaterials: resolveMaterials, validate: validate,
        checkExtraCost: checkExtraCost, consumeExtraCost: consumeExtraCost,
        calculateRateModifier: calculateRateModifier,
        produce: produce, consumeMaterials: consumeMaterials,
        consumeRandomMaterials: consumeRandomMaterials, getAvailableMaterials: getAvailableMaterials,
        saveResult: saveResult
    };
}

export { createFusionEquipmentStrategy };
