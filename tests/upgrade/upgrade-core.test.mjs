import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ===== Inline config (mirrors UpgradeConfig.js) =====

var UPGRADE_TYPES = {
    CHARACTER: 'character',
    EQUIPMENT: 'equipment',
    SKILL: 'skill',
    PET: 'pet',
    STAR: 'star'
};

var UPGRADE_CONFIG = {
    entities: {
        character: {
            maxLevel: 90,
            expFormula: function(level) { return 100 * level; },
            statGrowth: { hp: 12, attack: 3, critRate: 0.2, critDamage: 2, defense: 1, mana: 0.5, faith: 0.5 },
            starLevels: [10, 20, 35, 55, 75],
            starCost: [
                { starSource: 50 },
                { starSource: 120 },
                { starSource: 250 },
                { starSource: 500 },
                { starSource: 1000 }
            ],
            starMultiplier: [1.0, 1.1, 1.25, 1.5, 1.8, 2.0],
            milestoneRewards: [
                { gold: 200, starSource: 30 },
                { gold: 500, starSource: 80 },
                { gold: 1000, starSource: 150 },
                { gold: 2000, starSource: 300 },
                { gold: 5000, starSource: 600 }
            ]
        },
        equipment: {
            maxLevel: 15,
            expFormula: function(level) { return 50 * level; },
            statGrowth: { attack: 2, hp: 8, critRate: 0.1, critDamage: 1, defense: 1 },
            starLevels: [5, 10],
            starCost: [
                { gold: 500 },
                { gold: 2000 }
            ],
            starMultiplier: [1.0, 1.15, 1.4],
            milestoneRewards: [
                { gold: 100, starSource: 20 },
                { gold: 300, starSource: 50 }
            ]
        },
        skill: {
            maxLevel: 10,
            expFormula: function(level) { return 100 * level; },
            statGrowth: { damage: 5 },
            starLevels: [5],
            starCost: [
                { starSource: 200 }
            ],
            starMultiplier: [1.0, 1.3],
            milestoneRewards: [
                { gold: 150, starSource: 40 }
            ]
        },
        pet: {
            maxLevel: 30,
            expFormula: function(level) { return 80 * level; },
            statGrowth: { attack: 2, hp: 5, critRate: 0.1, defense: 0.5 },
            starLevels: [10, 20],
            starCost: [
                { starSource: 100 },
                { starSource: 500 }
            ],
            starMultiplier: [1.0, 1.2, 1.5],
            milestoneRewards: [
                { gold: 200, starSource: 50 },
                { gold: 500, starSource: 100 }
            ]
        },
        star: {
            maxLevel: 10,
            expFormula: function(level) { return 30 * level; },
            statGrowth: {},
            starLevels: [5],
            starCost: [
                { starSource: 300 }
            ],
            starMultiplier: [1.0, 1.5],
            milestoneRewards: [
                { gold: 300, starSource: 80 }
            ]
        }
    },
    upgradeCostMultiplier: 1.5
};

// ===== Inline engine (mirrors UpgradeEngine.js) =====

function createUpgradeEngine(deps) {
    var getPlayerData = deps.getPlayerData;
    var saveData = deps.saveData;
    var showToast = deps.showToast;
    var strategies = deps.strategies;

    function upgrade(entityUid, type) {
        var strategy = strategies[type];
        if (!strategy) {
            showToast({ title: '未知升级类型', icon: 'none', duration: 1500 });
            return { success: false, error: 'unknown_type' };
        }

        var playerData = getPlayerData();
        var entity = strategy.resolveEntity(entityUid, playerData);
        if (!entity) {
            showToast({ title: '未找到该实体', icon: 'none', duration: 1500 });
            return { success: false, error: 'entity_not_found' };
        }

        var config = UPGRADE_CONFIG.entities[type];
        var state = strategy.getUpgradeState(entityUid, playerData);

        if (state.level >= config.maxLevel) {
            showToast({ title: '已达最高等级', icon: 'none', duration: 1500 });
            return { success: false, error: 'max_level' };
        }

        var cost = strategy.getUpgradeCost(entity, state);
        if (!strategy.canAfford(playerData, cost)) {
            showToast({ title: '资源不足', icon: 'none', duration: 1500 });
            return { success: false, error: 'insufficient' };
        }

        strategy.consumeCost(playerData, cost);
        strategy.applyUpgrade(entityUid, playerData);

        var newState = strategy.getUpgradeState(entityUid, playerData);
        var milestone = _checkMilestone(type, newState.level, newState.starLevel);

        saveData();

        if (milestone !== null) {
            _grantMilestoneRewards(playerData, type, milestone);
        }

        return { success: true, newLevel: newState.level, milestone: milestone };
    }

    function starUpgrade(entityUid, type) {
        var strategy = strategies[type];
        if (!strategy) {
            showToast({ title: '未知升级类型', icon: 'none', duration: 1500 });
            return { success: false, error: 'unknown_type' };
        }

        var playerData = getPlayerData();
        var entity = strategy.resolveEntity(entityUid, playerData);
        if (!entity) {
            showToast({ title: '未找到该实体', icon: 'none', duration: 1500 });
            return { success: false, error: 'entity_not_found' };
        }

        var config = UPGRADE_CONFIG.entities[type];
        var state = strategy.getUpgradeState(entityUid, playerData);
        var currentStar = state.starLevel || 0;

        if (currentStar >= config.starLevels.length) {
            showToast({ title: '已达最高星级', icon: 'none', duration: 1500 });
            return { success: false, error: 'max_star' };
        }

        var requiredLevel = config.starLevels[currentStar];
        if (state.level < requiredLevel) {
            showToast({ title: '需要达到 Lv.' + requiredLevel, icon: 'none', duration: 1500 });
            return { success: false, error: 'level_not_met' };
        }

        var cost = config.starCost[currentStar];
        if (!strategy.canAfford(playerData, cost)) {
            showToast({ title: '资源不足', icon: 'none', duration: 1500 });
            return { success: false, error: 'insufficient' };
        }

        strategy.consumeCost(playerData, cost);
        strategy.applyStarUpgrade(entityUid, playerData);

        var newState = strategy.getUpgradeState(entityUid, playerData);
        saveData();

        return { success: true, newStarLevel: newState.starLevel };
    }

    function getUpgradeInfo(entityUid, type) {
        var strategy = strategies[type];
        if (!strategy) return null;

        var playerData = getPlayerData();
        var entity = strategy.resolveEntity(entityUid, playerData);
        if (!entity) return null;

        var config = UPGRADE_CONFIG.entities[type];
        var state = strategy.getUpgradeState(entityUid, playerData);
        var currentStar = state.starLevel || 0;
        var atMaxLevel = state.level >= config.maxLevel;
        var atMaxStar = currentStar >= config.starLevels.length;

        var result = {
            level: state.level,
            maxLevel: config.maxLevel,
            atMaxLevel: atMaxLevel,
            starLevel: currentStar,
            atMaxStar: atMaxStar,
            milestones: state.milestones || []
        };

        if (!atMaxLevel) {
            result.upgradeCost = strategy.getUpgradeCost(entity, state);
        }
        if (!atMaxStar) {
            result.nextStarLevel = config.starLevels[currentStar];
            result.starCost = config.starCost[currentStar];
        }

        return result;
    }

    function getAvailableEntities(type) {
        var strategy = strategies[type];
        if (!strategy) return [];
        return strategy.getAvailableEntities(getPlayerData());
    }

    function _checkMilestone(type, newLevel, starLevel) {
        var config = UPGRADE_CONFIG.entities[type];
        var stars = config.starLevels;
        for (var i = 0; i < stars.length; i++) {
            if (newLevel === stars[i] && starLevel <= i) {
                return i;
            }
        }
        return null;
    }

    function _grantMilestoneRewards(playerData, type, milestoneIndex) {
        var config = UPGRADE_CONFIG.entities[type];
        var rewards = config.milestoneRewards[milestoneIndex];
        if (!rewards) return;
        if (rewards.gold) playerData.gold = (playerData.gold || 0) + rewards.gold;
        if (rewards.starSource) playerData.starSource = (playerData.starSource || 0) + rewards.starSource;
    }

    return {
        upgrade: upgrade,
        starUpgrade: starUpgrade,
        getUpgradeInfo: getUpgradeInfo,
        getAvailableEntities: getAvailableEntities
    };
}

// ===== Mock helpers =====

function createMockPlayerData() {
    return {
        gold: 10000,
        starSource: 5000,
        upgradeStates: {
            char_001: { level: 1, starLevel: 0, milestones: [] },
            equip_001: { level: 1, starLevel: 0, milestones: [] },
            skill_001: { level: 1, starLevel: 0, milestones: [] },
            pet_001: { level: 1, starLevel: 0, milestones: [] },
            star_001: { level: 1, starLevel: 0, milestones: [] }
        }
    };
}

function createMockToast() {
    var messages = [];
    return {
        toast: function(msg) { messages.push(msg); },
        getMessages: function() { return messages.slice(); },
        reset: function() { messages.length = 0; }
    };
}

function createMockStrategy(type, entityMap) {
    return {
        resolveEntity: function(uid, pd) {
            return entityMap && entityMap[uid] ? { uid: uid, name: entityMap[uid] } : null;
        },
        getUpgradeState: function(uid, pd) {
            return pd.upgradeStates[uid] || { level: 1, starLevel: 0, milestones: [] };
        },
        getUpgradeCost: function(entity, state) {
            var config = UPGRADE_CONFIG.entities[type];
            return { gold: Math.floor(config.expFormula(state.level) * 1.5) };
        },
        canAfford: function(pd, cost) {
            if (cost.gold && (pd.gold || 0) < cost.gold) return false;
            if (cost.starSource && (pd.starSource || 0) < cost.starSource) return false;
            return true;
        },
        consumeCost: function(pd, cost) {
            if (cost.gold) pd.gold = (pd.gold || 0) - cost.gold;
            if (cost.starSource) pd.starSource = (pd.starSource || 0) - cost.starSource;
        },
        applyUpgrade: function(uid, pd) {
            if (!pd.upgradeStates[uid]) pd.upgradeStates[uid] = { level: 1, starLevel: 0, milestones: [] };
            pd.upgradeStates[uid].level++;
        },
        applyStarUpgrade: function(uid, pd) {
            if (!pd.upgradeStates[uid]) pd.upgradeStates[uid] = { level: 1, starLevel: 0, milestones: [] };
            pd.upgradeStates[uid].starLevel++;
        },
        getAvailableEntities: function(pd) {
            return Object.keys(entityMap || {}).map(function(uid) {
                return { uid: uid, name: entityMap[uid] };
            });
        }
    };
}

// ===== Config tests =====

describe('UpgradeConfig structure', function() {
    var requiredFields = ['maxLevel', 'expFormula', 'statGrowth', 'starLevels', 'starCost', 'starMultiplier', 'milestoneRewards'];
    var types = ['character', 'equipment', 'skill', 'pet', 'star'];

    it('UPGRADE_TYPES has all 5 entity types', function() {
        assert.equal(UPGRADE_TYPES.CHARACTER, 'character');
        assert.equal(UPGRADE_TYPES.EQUIPMENT, 'equipment');
        assert.equal(UPGRADE_TYPES.SKILL, 'skill');
        assert.equal(UPGRADE_TYPES.PET, 'pet');
        assert.equal(UPGRADE_TYPES.STAR, 'star');
    });

    types.forEach(function(type) {
        it('entity ' + type + ' has all required fields', function() {
            var entity = UPGRADE_CONFIG.entities[type];
            assert.ok(entity, 'entity config exists for ' + type);
            requiredFields.forEach(function(field) {
                assert.ok(entity[field] !== undefined, type + ' has field ' + field);
            });
        });
    });

    it('character: maxLevel=90, 5 starLevels, 5 starCost, 6 starMultiplier', function() {
        var c = UPGRADE_CONFIG.entities.character;
        assert.equal(c.maxLevel, 90);
        assert.equal(c.starLevels.length, 5);
        assert.equal(c.starCost.length, 5);
        assert.equal(c.starMultiplier.length, 6); // 5 stars + base
        assert.equal(c.starCost[0].starSource, 50);
        assert.equal(c.starCost[4].starSource, 1000);
    });

    it('equipment: maxLevel=15, 2 starLevels, gold cost', function() {
        var e = UPGRADE_CONFIG.entities.equipment;
        assert.equal(e.maxLevel, 15);
        assert.equal(e.starLevels.length, 2);
        assert.equal(e.starLevels[0], 5);
        assert.equal(e.starLevels[1], 10);
        assert.ok(e.starCost[0].gold !== undefined);
        assert.equal(e.starCost[0].gold, 500);
        assert.equal(e.starCost[1].gold, 2000);
    });

    it('skill: maxLevel=10, 1 starLevel, starSource cost', function() {
        var s = UPGRADE_CONFIG.entities.skill;
        assert.equal(s.maxLevel, 10);
        assert.equal(s.starLevels.length, 1);
        assert.equal(s.starLevels[0], 5);
        assert.equal(s.starCost[0].starSource, 200);
    });

    it('pet: maxLevel=30, 2 starLevels', function() {
        var p = UPGRADE_CONFIG.entities.pet;
        assert.equal(p.maxLevel, 30);
        assert.equal(p.starLevels.length, 2);
        assert.equal(p.starLevels[0], 10);
        assert.equal(p.starLevels[1], 20);
        assert.equal(p.starCost[0].starSource, 100);
        assert.equal(p.starCost[1].starSource, 500);
    });

    it('star: maxLevel=10, 1 starLevel', function() {
        var st = UPGRADE_CONFIG.entities.star;
        assert.equal(st.maxLevel, 10);
        assert.equal(st.starLevels.length, 1);
        assert.equal(st.starCost[0].starSource, 300);
    });

    it('expFormula returns valid numbers', function() {
        var types = Object.keys(UPGRADE_CONFIG.entities);
        types.forEach(function(type) {
            var formula = UPGRADE_CONFIG.entities[type].expFormula;
            var result = formula(5);
            assert.ok(typeof result === 'number', type + ' expFormula(5) returns number');
            assert.ok(result > 0, type + ' expFormula(5) > 0');
        });
    });
});

// ===== Engine upgrade tests =====

describe('UpgradeEngine.upgrade', function() {
    function createTestEngine(entityMap) {
        var pd = createMockPlayerData();
        var toast = createMockToast();
        var saved = false;

        var strategy = createMockStrategy('character', entityMap || { char_001: 'Hero' });
        var engine = createUpgradeEngine({
            getPlayerData: function() { return pd; },
            saveData: function() { saved = true; },
            showToast: function(msg) { toast.toast(msg); },
            strategies: { character: strategy }
        });

        return { engine: engine, pd: pd, toast: toast, isSaved: function() { return saved; } };
    }

    it('successful upgrade increments level', function() {
        var t = createTestEngine({ char_001: 'Hero' });
        var result = t.engine.upgrade('char_001', 'character');
        assert.equal(result.success, true);
        assert.equal(result.newLevel, 2);
        assert.equal(t.pd.upgradeStates.char_001.level, 2);
    });

    it('insufficient gold rejects upgrade', function() {
        var t = createTestEngine({ char_001: 'Hero' });
        t.pd.gold = 0;
        var result = t.engine.upgrade('char_001', 'character');
        assert.equal(result.success, false);
        assert.equal(result.error, 'insufficient');
        assert.equal(t.pd.upgradeStates.char_001.level, 1); // unchanged
    });

    it('max level rejects upgrade', function() {
        var t = createTestEngine({ char_001: 'Hero' });
        t.pd.upgradeStates.char_001.level = 90;
        var result = t.engine.upgrade('char_001', 'character');
        assert.equal(result.success, false);
        assert.equal(result.error, 'max_level');
    });

    it('unknown type rejects upgrade', function() {
        var t = createTestEngine({ char_001: 'Hero' });
        var result = t.engine.upgrade('char_001', 'nonexistent');
        assert.equal(result.success, false);
        assert.equal(result.error, 'unknown_type');
    });

    it('missing entity rejects upgrade', function() {
        var t = createTestEngine({ char_001: 'Hero' });
        var result = t.engine.upgrade('char_999', 'character');
        assert.equal(result.success, false);
        assert.equal(result.error, 'entity_not_found');
    });

    it('upgrade consumes gold', function() {
        var t = createTestEngine({ char_001: 'Hero' });
        var goldBefore = t.pd.gold;
        t.engine.upgrade('char_001', 'character');
        assert.ok(t.pd.gold < goldBefore, 'gold was consumed');
    });

    it('upgrade triggers saveData', function() {
        var t = createTestEngine({ char_001: 'Hero' });
        t.engine.upgrade('char_001', 'character');
        assert.equal(t.isSaved(), true);
    });
});

// ===== Engine starUpgrade tests =====

describe('UpgradeEngine.starUpgrade', function() {
    function createTestEngine(type, entityMap) {
        var pd = createMockPlayerData();
        var toast = createMockToast();
        var saved = false;

        var strategy = createMockStrategy(type || 'character', entityMap || { char_001: 'Hero' });
        var engine = createUpgradeEngine({
            getPlayerData: function() { return pd; },
            saveData: function() { saved = true; },
            showToast: function(msg) { toast.toast(msg); },
            strategies: (function() {
                var obj = {};
                obj[type || 'character'] = strategy;
                return obj;
            })()
        });

        return { engine: engine, pd: pd, toast: toast, strategy: strategy, isSaved: function() { return saved; } };
    }

    it('successful star upgrade', function() {
        var t = createTestEngine('character', { char_001: 'Hero' });
        t.pd.upgradeStates.char_001.level = 10; // meet starLevel[0] = 10
        t.pd.starSource = 1000;
        var result = t.engine.starUpgrade('char_001', 'character');
        assert.equal(result.success, true);
        assert.equal(result.newStarLevel, 1);
        assert.equal(t.pd.upgradeStates.char_001.starLevel, 1);
    });

    it('level_not_met rejects star upgrade', function() {
        var t = createTestEngine('character', { char_001: 'Hero' });
        t.pd.upgradeStates.char_001.level = 5; // needs 10 for first star
        t.pd.starSource = 1000;
        var result = t.engine.starUpgrade('char_001', 'character');
        assert.equal(result.success, false);
        assert.equal(result.error, 'level_not_met');
        assert.equal(t.pd.upgradeStates.char_001.starLevel, 0); // unchanged
    });

    it('max_star rejects star upgrade', function() {
        var t = createTestEngine('skill', { skill_001: 'Fireball' });
        var skillConfig = UPGRADE_CONFIG.entities.skill;
        t.pd.upgradeStates.skill_001.level = skillConfig.maxLevel;
        t.pd.upgradeStates.skill_001.starLevel = skillConfig.starLevels.length; // already max
        var result = t.engine.starUpgrade('skill_001', 'skill');
        assert.equal(result.success, false);
        assert.equal(result.error, 'max_star');
    });

    it('star upgrade consumes starSource', function() {
        var t = createTestEngine('character', { char_001: 'Hero' });
        t.pd.upgradeStates.char_001.level = 10;
        var before = t.pd.starSource;
        t.engine.starUpgrade('char_001', 'character');
        assert.ok(t.pd.starSource < before, 'starSource was consumed');
        assert.equal(t.pd.starSource, before - 50); // character starCost[0].starSource = 50
    });

    it('star upgrade triggers saveData', function() {
        var t = createTestEngine('character', { char_001: 'Hero' });
        t.pd.upgradeStates.char_001.level = 10;
        t.pd.starSource = 1000;
        t.engine.starUpgrade('char_001', 'character');
        assert.equal(t.isSaved(), true);
    });
});

// ===== Engine getUpgradeInfo tests =====

describe('UpgradeEngine.getUpgradeInfo', function() {
    it('returns info for valid entity', function() {
        var pd = createMockPlayerData();
        var engine = createUpgradeEngine({
            getPlayerData: function() { return pd; },
            saveData: function() {},
            showToast: function() {},
            strategies: { character: createMockStrategy('character', { char_001: 'Hero' }) }
        });
        var info = engine.getUpgradeInfo('char_001', 'character');
        assert.ok(info);
        assert.equal(info.level, 1);
        assert.equal(info.maxLevel, 90);
        assert.equal(info.atMaxLevel, false);
        assert.equal(info.starLevel, 0);
        assert.equal(info.atMaxStar, false);
        assert.ok(info.upgradeCost);
        assert.ok(info.starCost);
        assert.equal(info.nextStarLevel, 10);
    });

    it('returns null for unknown type', function() {
        var pd = createMockPlayerData();
        var engine = createUpgradeEngine({
            getPlayerData: function() { return pd; },
            saveData: function() {},
            showToast: function() {},
            strategies: {}
        });
        assert.equal(engine.getUpgradeInfo('char_001', 'nonexistent'), null);
    });

    it('returns null for missing entity', function() {
        var pd = createMockPlayerData();
        var engine = createUpgradeEngine({
            getPlayerData: function() { return pd; },
            saveData: function() {},
            showToast: function() {},
            strategies: { character: createMockStrategy('character', { char_001: 'Hero' }) }
        });
        assert.equal(engine.getUpgradeInfo('char_999', 'character'), null);
    });

    it('atMaxLevel is true when level capped', function() {
        var pd = createMockPlayerData();
        pd.upgradeStates.char_001.level = 90;
        var engine = createUpgradeEngine({
            getPlayerData: function() { return pd; },
            saveData: function() {},
            showToast: function() {},
            strategies: { character: createMockStrategy('character', { char_001: 'Hero' }) }
        });
        var info = engine.getUpgradeInfo('char_001', 'character');
        assert.equal(info.atMaxLevel, true);
        assert.equal(info.upgradeCost, undefined);
    });
});

// ===== Engine getAvailableEntities tests =====

describe('UpgradeEngine.getAvailableEntities', function() {
    it('returns entity list from strategy', function() {
        var pd = createMockPlayerData();
        var engine = createUpgradeEngine({
            getPlayerData: function() { return pd; },
            saveData: function() {},
            showToast: function() {},
            strategies: { character: createMockStrategy('character', { char_001: 'Hero', char_002: 'Mage' }) }
        });
        var list = engine.getAvailableEntities('character');
        assert.equal(list.length, 2);
        assert.equal(list[0].uid, 'char_001');
        assert.equal(list[1].uid, 'char_002');
    });

    it('returns empty for unknown type', function() {
        var pd = createMockPlayerData();
        var engine = createUpgradeEngine({
            getPlayerData: function() { return pd; },
            saveData: function() {},
            showToast: function() {},
            strategies: {}
        });
        assert.deepEqual(engine.getAvailableEntities('nonexistent'), []);
    });
});
