import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function createMockRegistry() {
    var pity = {};
    var codex = {};
    var history = [];
    var stats = { totalAttempts: 0, totalSuccesses: 0, totalGreatSuccesses: 0 };

    return {
        checkPity: function(type) { return (pity[type] || 0) >= 3; },
        getPityCount: function(type) { return pity[type] || 0; },
        incrementPity: function(type) { pity[type] = (pity[type] || 0) + 1; },
        resetPity: function(type) { pity[type] = 0; },
        record: function(type, result) {
            if (!codex[type]) codex[type] = [];
            var isNew = codex[type].indexOf(result.id) === -1;
            if (isNew) codex[type].push(result.id);
            history.unshift({ type: type, success: true, resultId: result.id });
            return isNew;
        },
        isDiscovered: function(type, id) {
            return codex[type] && codex[type].indexOf(id) !== -1;
        },
        getCodex: function(type) { return codex[type] ? codex[type].slice() : []; },
        getCodexCount: function(type) { return (codex[type] || []).length; },
        getHistory: function(limit) { return history.slice(0, limit || 20); },
        addFailureHistory: function(type) { history.unshift({ type: type, success: false }); },
        getStats: function() { return stats; },
        incrementStat: function(key) { stats[key] = (stats[key] || 0) + 1; }
    };
}

function createMockStrategy(type) {
    return {
        type: type,
        resolveMaterials: function(ids, pd) {
            return ids.map(function(id) {
                return { id: id, name: 'mock_' + id, rarity: 'R', element: 'fire', config: { attack: 10, hp: 100 } };
            });
        },
        validate: function(materials) {
            if (materials.length < 3) return { valid: false, error: 'need 3' };
            return { valid: true };
        },
        calculateRateModifier: function() { return 10; },
        produce: function(materials, layer, great) {
            return {
                id: 'result_' + Date.now(), name: 'Fused Item', rarity: 'SR',
                layer: layer, greatSuccess: great, stats: { attack: 20 }
            };
        },
        consumeMaterials: function(ids, pd) {
            pd.consumed = (pd.consumed || []).concat(ids);
        },
        consumeRandomMaterials: function(ids, pd, count) {
            pd.consumed = (pd.consumed || []).concat(ids.slice(0, count));
        },
        getAvailableMaterials: function(pd) {
            return [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
        }
    };
}

// ===== FusionRegistry Tests =====

describe('FusionRegistry', function() {
    it('pity starts at 0', function() {
        var reg = createMockRegistry();
        assert.equal(reg.getPityCount('character'), 0);
        assert.equal(reg.checkPity('character'), false);
    });

    it('pity triggers after 3 failures', function() {
        var reg = createMockRegistry();
        reg.incrementPity('character');
        reg.incrementPity('character');
        assert.equal(reg.checkPity('character'), false);
        reg.incrementPity('character');
        assert.equal(reg.checkPity('character'), true);
        assert.equal(reg.getPityCount('character'), 3);
    });

    it('pity resets on success', function() {
        var reg = createMockRegistry();
        reg.incrementPity('pet');
        reg.incrementPity('pet');
        reg.resetPity('pet');
        assert.equal(reg.getPityCount('pet'), 0);
        assert.equal(reg.checkPity('pet'), false);
    });

    it('records new codex entries', function() {
        var reg = createMockRegistry();
        var isNew = reg.record('character', { id: 'fusion_1', name: 'Test' });
        assert.equal(isNew, true);
        assert.equal(reg.isDiscovered('character', 'fusion_1'), true);
    });

    it('does not double record', function() {
        var reg = createMockRegistry();
        reg.record('character', { id: 'fusion_1', name: 'Test' });
        var isNew = reg.record('character', { id: 'fusion_1', name: 'Test' });
        assert.equal(isNew, false);
        assert.equal(reg.getCodexCount('character'), 1);
    });

    it('tracks history', function() {
        var reg = createMockRegistry();
        reg.record('pet', { id: 'fp_1', name: 'Pet1' });
        reg.addFailureHistory('pet', ['A', 'B']);
        var h = reg.getHistory(10);
        assert.equal(h.length, 2);
        assert.equal(h[0].success, false); // most recent first
        assert.equal(h[1].success, true);
    });

    it('increments stats', function() {
        var reg = createMockRegistry();
        reg.incrementStat('totalAttempts');
        reg.incrementStat('totalAttempts');
        reg.incrementStat('totalSuccesses');
        var s = reg.getStats();
        assert.equal(s.totalAttempts, 2);
        assert.equal(s.totalSuccesses, 1);
    });
});

// ===== FusionEngine Tests =====

describe('FusionEngine', function() {
    function createEngineWithMockedRandom(shouldSucceed, shouldGreatSuccess) {
        var registry = createMockRegistry();
        var strategy = createMockStrategy('character');
        // Override random to control outcome
        var originalRandom = Math.random;
        var callCount = 0;
        Math.random = function() {
            callCount++;
            if (callCount === 1) return shouldSucceed ? 0 : 0.99; // success roll
            return shouldGreatSuccess ? 0 : 0.99; // great success roll
        };
        return {
            registry: registry,
            strategy: strategy,
            restore: function() { Math.random = originalRandom; },
            playerData: { consumed: [] },
            perform: function(ids, type) {
                var rate = 75 + strategy.calculateRateModifier();
                var roll = Math.random() * 100;
                var success = registry.checkPity(type) || roll < rate;
                var greatSuccess = success && Math.random() < 0.10;
                var materials = strategy.resolveMaterials(ids, {});
                var validation = strategy.validate(materials);
                if (!validation.valid) return { success: false, error: validation.error };
                var result;
                if (success) {
                    result = strategy.produce(materials, 'normal', greatSuccess);
                    result.success = true;
                    result.greatSuccess = greatSuccess;
                    result.layer = 'normal';
                    strategy.consumeMaterials(ids, strategy);
                    registry.record(type, result);
                    registry.resetPity(type);
                    registry.incrementStat('totalAttempts');
                    registry.incrementStat('totalSuccesses');
                } else {
                    strategy.consumeRandomMaterials(ids, strategy, 1);
                    registry.incrementPity(type);
                    registry.addFailureHistory(type, materials.map(function(m) { return m.name; }));
                    registry.incrementStat('totalAttempts');
                    result = { success: false, layer: 'normal' };
                }
                return result;
            }
        };
    }

    it('succeeds when roll is low', function() {
        var e = createEngineWithMockedRandom(true, false);
        var result = e.perform(['a', 'b', 'c'], 'character');
        e.restore();
        assert.equal(result.success, true);
        assert.equal(result.greatSuccess, false);
        assert.equal(result.layer, 'normal');
        assert.equal(e.registry.getStats().totalSuccesses, 1);
    });

    it('fails when roll is high', function() {
        var e = createEngineWithMockedRandom(false, false);
        var result = e.perform(['a', 'b', 'c'], 'character');
        e.restore();
        assert.equal(result.success, false);
        assert.equal(e.registry.getPityCount('character'), 1);
        assert.equal(e.registry.getStats().totalAttempts, 1);
        assert.equal(e.registry.getStats().totalSuccesses, 0);
    });

    it('great success triggers bonus', function() {
        var e = createEngineWithMockedRandom(true, true);
        var result = e.perform(['a', 'b', 'c'], 'character');
        e.restore();
        assert.equal(result.success, true);
        assert.equal(result.greatSuccess, true);
    });

    it('pity forces success after 3 failures', function() {
        var e = createEngineWithMockedRandom(true, false);
        e.registry.incrementPity('character');
        e.registry.incrementPity('character');
        e.registry.incrementPity('character');
        assert.equal(e.registry.checkPity('character'), true);
        var result = e.perform(['a', 'b', 'c'], 'character');
        e.restore();
        assert.equal(result.success, true);
        assert.equal(e.registry.getPityCount('character'), 0); // reset
    });

    it('rejects unknown type', function() {
        var strategy = createMockStrategy('character');
        var result = { success: false, error: 'unknown_type' };
        assert.equal(result.success, false);
        assert.equal(result.error, 'unknown_type');
    });

    it('rejects insufficient materials', function() {
        var strategy = createMockStrategy('character');
        var materials = [{ id: 'a' }];
        var v = strategy.validate(materials);
        assert.equal(v.valid, false);
    });
});
