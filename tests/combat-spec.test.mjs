import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const GM = require('../dist/game-modules.js');

const {
    COMBAT_SPEC, COMBAT_FEATURES, FEATURE_ENUMS, FEATURE_CONSTRAINTS,
    BOSS_COMBAT_FEATURES, TOWER_COMBAT_FEATURES,
    BOSS_COMBAT_OVERRIDES, TOWER_COMBAT_OVERRIDES,
    specResolver, getSpecValue, flattenSpec,
    validateOverrides, validateFeatures, getWeakWarnings
} = GM;

// ═══════════════════════════════════════════════════════════
// specResolver
// ═══════════════════════════════════════════════════════════

describe('specResolver', () => {
    it('returns a clone of base with no overrides', () => {
        const result = specResolver(COMBAT_SPEC);
        assert.deepEqual(result.STAR, COMBAT_SPEC.STAR);
        assert.deepEqual(result.COMBAT, COMBAT_SPEC.COMBAT);
        assert.notEqual(result, COMBAT_SPEC);
    });

    it('merges nested objects preserving uncovered keys', () => {
        const result = specResolver(COMBAT_SPEC, {
            COMBAT: { TIME_LIMIT_S: 60 }
        });
        assert.equal(result.COMBAT.TIME_LIMIT_S, 60);
        assert.equal(result.COMBAT.TIME_DAMAGE_ON_HIT_S, COMBAT_SPEC.COMBAT.TIME_DAMAGE_ON_HIT_S);
        assert.equal(result.COMBAT.TIME_TICK_MS, COMBAT_SPEC.COMBAT.TIME_TICK_MS);
        assert.equal(result.STAR.SPAWN_INTERVAL_MS, COMBAT_SPEC.STAR.SPAWN_INTERVAL_MS);
    });

    it('replaces arrays entirely', () => {
        const base = { POSITIONS: [1, 2, 3] };
        const result = specResolver(base, { POSITIONS: [4, 5] });
        assert.deepEqual(result.POSITIONS, [4, 5]);
    });

    it('resets to baseline when override value is null', () => {
        const result = specResolver(COMBAT_SPEC, {
            COMBAT: { TIME_LIMIT_S: 60 }
        });
        assert.equal(result.COMBAT.TIME_LIMIT_S, 60);
        // null 在新的 specResolver 调用中重置到 COMBAT_SPEC 基线
        const reset = specResolver(COMBAT_SPEC, {
            COMBAT: { TIME_LIMIT_S: null }
        });
        assert.equal(reset.COMBAT.TIME_LIMIT_S, COMBAT_SPEC.COMBAT.TIME_LIMIT_S);
    });

    it('forbids undefined override values', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        specResolver(COMBAT_SPEC, { COMBAT: { TIME_LIMIT_S: undefined } });
        console.error = origError;
        assert.ok(errors.length > 0);
        assert.ok(errors[0].includes('undefined'));
    });

    it('handles multiple overrides in order', () => {
        const result = specResolver(COMBAT_SPEC,
            { COMBAT: { TIME_LIMIT_S: 60 } },
            { COMBAT: { TIME_DAMAGE_ON_HIT_S: 10 } }
        );
        assert.equal(result.COMBAT.TIME_LIMIT_S, 60);
        assert.equal(result.COMBAT.TIME_DAMAGE_ON_HIT_S, 10);
    });

    it('does not mutate the base spec', () => {
        const origLimit = COMBAT_SPEC.COMBAT.TIME_LIMIT_S;
        specResolver(COMBAT_SPEC, { COMBAT: { TIME_LIMIT_S: 999 } });
        assert.equal(COMBAT_SPEC.COMBAT.TIME_LIMIT_S, origLimit);
    });
});

// ═══════════════════════════════════════════════════════════
// getSpecValue
// ═══════════════════════════════════════════════════════════

describe('getSpecValue', () => {
    it('resolves valid paths', () => {
        assert.equal(getSpecValue(COMBAT_SPEC, 'STAR.SPAWN_INTERVAL_MS'), 600);
        assert.equal(getSpecValue(COMBAT_SPEC, 'COMBAT.TIME_LIMIT_S'), 30);
        assert.equal(getSpecValue(COMBAT_SPEC, 'DAMAGE.BASE'), 20);
    });

    it('returns undefined for invalid paths', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        const result = getSpecValue(COMBAT_SPEC, 'STAR.NONEXISTENT');
        console.error = origError;
        assert.equal(result, undefined);
        assert.ok(errors.length > 0);
    });

    it('suggests typo corrections', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        getSpecValue(COMBAT_SPEC, 'STAR.LIFTTIME_MS');
        console.error = origError;
        assert.ok(errors[0].includes('LIFETIME_MS'));
    });

    it('handles single-level path', () => {
        const config = { SIMPLE: 42 };
        assert.equal(getSpecValue(config, 'SIMPLE'), 42);
    });

    it('handles resolved config with overrides', () => {
        const RC = specResolver(COMBAT_SPEC, { COMBAT: { TIME_LIMIT_S: 60 } });
        assert.equal(getSpecValue(RC, 'COMBAT.TIME_LIMIT_S'), 60);
        assert.equal(getSpecValue(RC, 'STAR.SPAWN_INTERVAL_MS'), 600);
    });
});

// ═══════════════════════════════════════════════════════════
// flattenSpec
// ═══════════════════════════════════════════════════════════

describe('flattenSpec', () => {
    it('flattens nested spec to flat keys', () => {
        const flat = flattenSpec(COMBAT_SPEC);
        assert.equal(flat.STAR_SPAWN_INTERVAL_MS, 600);
        assert.equal(flat.STAR_LIFETIME_MS, 2000);
        assert.equal(flat.COMBAT_TIME_LIMIT_S, 30);
        assert.equal(flat.COMBO_MULTIPLIER, 0.1);
        assert.equal(flat.DAMAGE_BASE, 20);
    });

    it('uses prefix for nested flattening', () => {
        const flat = flattenSpec(COMBAT_SPEC.STAR, 'STAR');
        assert.equal(flat.STAR_SPAWN_INTERVAL_MS, 600);
        assert.equal(flat.STAR_SIZE, 48);
    });

    it('preserves non-object values directly', () => {
        const spec = { A: 1, B: 'hello', C: true };
        const flat = flattenSpec(spec);
        assert.equal(flat.A, 1);
        assert.equal(flat.B, 'hello');
        assert.equal(flat.C, true);
    });
});

// ═══════════════════════════════════════════════════════════
// validateOverrides
// ═══════════════════════════════════════════════════════════

describe('validateOverrides', () => {
    it('passes for valid overrides', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        validateOverrides(BOSS_COMBAT_OVERRIDES, COMBAT_SPEC, 'boss');
        console.error = origError;
        assert.equal(errors.length, 0);
    });

    it('reports unknown keys', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        validateOverrides({ NONEXISTENT: 123 }, COMBAT_SPEC, 'test');
        console.error = origError;
        assert.ok(errors.length > 0);
        assert.ok(errors[0].includes('NONEXISTENT'));
    });

    it('suggests typo for unknown keys', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        validateOverrides({ START: {} }, COMBAT_SPEC, 'test');
        console.error = origError;
        assert.ok(errors[0].includes('STAR'));
    });

    it('handles null overrides', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        validateOverrides(null, COMBAT_SPEC, 'test');
        console.error = origError;
        assert.equal(errors.length, 0);
    });

    it('recursively validates nested overrides', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        validateOverrides(
            { COMBAT: { NONEXISTENT_KEY: 123 } },
            COMBAT_SPEC,
            'test'
        );
        console.error = origError;
        assert.ok(errors.length > 0);
        assert.ok(errors[0].includes('NONEXISTENT_KEY'));
    });
});

// ═══════════════════════════════════════════════════════════
// validateFeatures
// ═══════════════════════════════════════════════════════════

describe('validateFeatures', () => {
    it('passes for valid features', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        validateFeatures(COMBAT_FEATURES, 'normal');
        console.error = origError;
        assert.equal(errors.length, 0);
    });

    it('reports illegal enum values', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        validateFeatures({ comboDisplay: 'invalid' }, 'test');
        console.error = origError;
        assert.ok(errors.length > 0);
        assert.ok(errors[0].includes('invalid'));
    });

    it('reports missing dependencies', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        validateFeatures({ critDisplay: true, starAttackEffects: false }, 'test');
        console.error = origError;
        assert.ok(errors.length > 0);
        assert.ok(errors[0].includes('依赖'));
    });

    it('passes when dependencies are met', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));
        validateFeatures({ critDisplay: true, starAttackEffects: true }, 'test');
        console.error = origError;
        assert.equal(errors.length, 0);
    });
});

// ═══════════════════════════════════════════════════════════
// getWeakWarnings
// ═══════════════════════════════════════════════════════════

describe('getWeakWarnings', () => {
    it('returns no warnings for default config', () => {
        const warnings = getWeakWarnings(COMBAT_SPEC);
        assert.ok(warnings.length === 0, 'Default spec should have no warnings');
    });

    it('warns when star lifetime <= quick tap window', () => {
        const bad = specResolver(COMBAT_SPEC, {
            STAR: { LIFETIME_MS: 100 },
            QUICK_TAP: { WINDOW_MS: 200 }
        });
        const warnings = getWeakWarnings(bad);
        assert.ok(warnings.some(w => w.includes('LIFETIME_MS')));
    });

    it('warns when time limit <= 0', () => {
        const bad = specResolver(COMBAT_SPEC, { COMBAT: { TIME_LIMIT_S: 0 } });
        const warnings = getWeakWarnings(bad);
        assert.ok(warnings.some(w => w.includes('TIME_LIMIT_S')));
    });

    it('warns when max stars <= 0', () => {
        const bad = specResolver(COMBAT_SPEC, { STAR: { MAX_ON_SCREEN: 0 } });
        const warnings = getWeakWarnings(bad);
        assert.ok(warnings.some(w => w.includes('MAX_ON_SCREEN')));
    });

    it('warns when combo multiplier <= 0', () => {
        const bad = specResolver(COMBAT_SPEC, { COMBO: { MULTIPLIER: 0 } });
        const warnings = getWeakWarnings(bad);
        assert.ok(warnings.some(w => w.includes('MULTIPLIER')));
    });
});

// ═══════════════════════════════════════════════════════════
// 模式配置快照
// ═══════════════════════════════════════════════════════════

describe('Mode config snapshots', () => {
    it('boss mode overrides apply correctly', () => {
        const RC = specResolver(COMBAT_SPEC, BOSS_COMBAT_OVERRIDES);
        assert.equal(getSpecValue(RC, 'COMBAT.TIME_LIMIT_S'), 60);
        assert.equal(getSpecValue(RC, 'COMBAT.TIME_DAMAGE_ON_HIT_S'), 8);
        assert.equal(getSpecValue(RC, 'STAR.SPAWN_INTERVAL_MS'), 600);
        assert.equal(getSpecValue(RC, 'COMBO.MULTIPLIER'), 0.1);
    });

    it('tower mode uses defaults (empty overrides)', () => {
        const RC = specResolver(COMBAT_SPEC, TOWER_COMBAT_OVERRIDES);
        assert.equal(getSpecValue(RC, 'COMBAT.TIME_LIMIT_S'), 30);
        assert.equal(getSpecValue(RC, 'STAR.SPAWN_INTERVAL_MS'), 600);
    });

    it('boss features disable skillBar and use boss anti-overlap', () => {
        const RF = specResolver(COMBAT_FEATURES, BOSS_COMBAT_FEATURES);
        assert.equal(RF.skillBar, false);
        assert.equal(RF.starAntiOverlap, 'boss');
        assert.equal(RF.petAutoAttack, true);
        assert.equal(RF.comboDisplay, 'full');
    });

    it('tower features use basic combo and disable skillBar', () => {
        const RF = specResolver(COMBAT_FEATURES, TOWER_COMBAT_FEATURES);
        assert.equal(RF.comboDisplay, 'basic');
        assert.equal(RF.skillBar, false);
        assert.equal(RF.petAutoAttack, true);
    });

    it('all mode configs pass validation', () => {
        const errors = [];
        const origError = console.error;
        console.error = (...args) => errors.push(args.join(' '));

        validateOverrides(BOSS_COMBAT_OVERRIDES, COMBAT_SPEC, 'boss');
        validateOverrides(TOWER_COMBAT_OVERRIDES, COMBAT_SPEC, 'tower');
        validateFeatures(specResolver(COMBAT_FEATURES, BOSS_COMBAT_FEATURES), 'boss');
        validateFeatures(specResolver(COMBAT_FEATURES, TOWER_COMBAT_FEATURES), 'tower');

        console.error = origError;
        assert.equal(errors.length, 0, 'All mode configs should validate cleanly');
    });

    it('all mode configs have no weak warnings', () => {
        const bossRC = specResolver(COMBAT_SPEC, BOSS_COMBAT_OVERRIDES);
        const towerRC = specResolver(COMBAT_SPEC, TOWER_COMBAT_OVERRIDES);
        assert.equal(getWeakWarnings(bossRC).length, 0);
        assert.equal(getWeakWarnings(towerRC).length, 0);
    });
});
