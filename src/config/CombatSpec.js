/**
 * 战斗规格 — 所有战斗模式的数值基线 + 特性集
 *
 * 修改规则：
 * 1. 基线修改必须经过 DevBattleMode 验证
 * 2. 修改后必须更新所有模式的测试快照
 * 3. 各模式差异通过 OVERRIDES 声明，不直接改 COMBAT_SPEC
 *
 * 配置变更检查清单：
 * - [ ] 已在 DevBattleMode 中验证手感
 * - [ ] 已运行 npm test 并更新所有模式配置快照
 * - [ ] 已考虑对现有所有模式的潜在影响
 * - [ ] 变更理由已记录在提交信息中
 */

import Logger from '../utils/Logger.js';

// ═══════════════════════════════════════════════════════════
// COMBAT_SPEC — 结构化数值参数
// 来源：普通模式实际行为
// ═══════════════════════════════════════════════════════════

var COMBAT_SPEC = {
    /** 灵光参数 — 增大 SPAWN_INTERVAL_MS 会使节奏变慢，增大 LIFETIME_MS 会降低操作压力 */
    STAR: {
        SPAWN_INTERVAL_MS: 350,
        LIFETIME_MS: 4000,
        MAX_ON_SCREEN: 5,
        SIZE: 48,
        OVERLAP_MULT: 2.2
    },

    /** 快速点击窗口 — 增大阈值会让快速点击更容易触发 */
    QUICK_TAP: {
        THRESHOLD_MS: 200,
        WINDOW_MS: 250,
        SUPER_MULT: 4,
        NORMAL_MULT: 2
    },

    /** 战斗时间 — TIME_DAMAGE_ON_HIT_S 增大会使容错更低 */
    COMBAT: {
        TIME_LIMIT_S: 30,
        TIME_DAMAGE_ON_HIT_S: 5,
        TIME_TICK_MS: 1000
    },

    /** 连击系统 — TIMEOUT_MS 增大会让连击更容易维持 */
    COMBO: {
        TIMEOUT_MS: 1500,
        MULTIPLIER: 0.1,
        STAR_DURATION_MS: 5000,
        STAR_ATTACK_INTERVAL_MS: 200
    },

    /** 怪物攻击 */
    MONSTER: {
        ATTACK_INTERVAL_MS: 2000
    },

    /** 特殊灵光效果 */
    SPECIAL_STARS: {
        HEAL_HP: 5,
        SHIELD_AMOUNT: 3,
        TIME_SECONDS: 3,
        UNLUCKY_HP_COST: 5,
        UNLUCKY_RAGE_GAIN: 1,
        UNLUCKY_MAX_RAGE: 3,
        GREEDY_HP_COST: 1,
        GREEDY_HP_POOL_INCREMENT: 2,
        RAGE_ATTACK_BONUS: 50,
        DODGE_DURATION_MS: 1000,
        DODGE_COUNTER_MULT: 0.5
    },

    /** 状态效果 */
    STATUS: {
        POISON_TICK_MS: 1000,
        POISON_STAR_DAMAGE: 15,
        POISON_DURATION_MS: 3000,
        POISON_TICK_DAMAGE: 5
    },

    /** 伤害基础值 */
    DAMAGE: {
        BASE: 20,
        PER_FLOOR: 8,
        ATTACK_DIVISOR: 100,
        ATTACK_TO_DAMAGE_SCALE: 0.5,
        VARIANCE: 0.05
    },

    /** 视觉特效参数 */
    VFX: {
        MONSTER_PROJECTILE_MS: 500,
        CRIT_DURATION_MS: 800,
        CRIT_SCALE_PEAK: 2.5,
        QUICK_TAP_ANIM_MS: 600,
        STAR_ANIM_MS: 300
    },

    /** 怒气系统 */
    RAGE: {
        HEAL_HP: 30
    }
};

// ═══════════════════════════════════════════════════════════
// COMBAT_FEATURES — 特性集定义
// ═══════════════════════════════════════════════════════════

/** 普通模式特性集 = 全集，其他模式只写差异项 */
var COMBAT_FEATURES = {
    comboDisplay: 'full',
    skillBar: true,
    petAutoAttack: true,
    pauseBehavior: 'freeze',
    starAntiOverlap: 'standard',
    monsterProjectile: true,
    starAttackEffects: true,
    scrollingMessages: 'standard',
    critDisplay: true,
    quickTapDisplay: true,
    // Phase 0 新增：Boss/塔特有 UI 特性
    bossHpBar: false,
    pauseButton: true,
    itemButtons: true,
    greedySkill: false,
    dodgeStars: true,
    bossStars: false,
    poisonPuddles: false,
    floorDisplay: false,
    victoryPopup: false
};

/** 特性值合法枚举 */
var FEATURE_ENUMS = {
    comboDisplay: ['full', 'basic'],
    pauseBehavior: ['freeze', 'none'],
    starAntiOverlap: ['standard', 'boss'],
    scrollingMessages: ['standard']
};

/** 特性间依赖规则 */
var FEATURE_CONSTRAINTS = {
    critDisplay: { requires: ['starAttackEffects'] },
    quickTapDisplay: { requires: ['starAttackEffects'] }
};

// --- 各模式特性覆盖（只写差异项，自动继承 COMBAT_FEATURES） ---

var BOSS_COMBAT_FEATURES = {
    skillBar: false,
    starAntiOverlap: 'boss',
    bossHpBar: true,
    itemButtons: false,
    greedySkill: true,
    bossStars: true,
    poisonPuddles: true,
    dodgeStars: true,
    pauseButton: true
};

var TOWER_COMBAT_FEATURES = {
    comboDisplay: 'basic',
    skillBar: false,
    floorDisplay: true,
    victoryPopup: true,
    itemButtons: false,
    dodgeStars: true,
    pauseButton: true
};

// ═══════════════════════════════════════════════════════════
// 各模式数值覆盖
// ═══════════════════════════════════════════════════════════

var BOSS_COMBAT_OVERRIDES = {
    COMBAT: { TIME_LIMIT_S: 60, TIME_DAMAGE_ON_HIT_S: 8 }
};

var TOWER_COMBAT_OVERRIDES = {
    DAMAGE: { PER_FLOOR: 12 },
    COMBO: { MULTIPLIER: 0.12 }
};

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════

/**
 * 深度合并配置
 * 语义：对象→合并（保留未覆盖的key），数组→替换，null→重置为基线值，undefined→禁止
 */
function specResolver(base) {
    var result = {};
    for (var key in base) {
        if (!base.hasOwnProperty(key)) continue;
        var val = base[key];
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            result[key] = deepClone(val);
        } else {
            result[key] = val;
        }
    }
    for (var i = 1; i < arguments.length; i++) {
        var overrides = arguments[i];
        if (!overrides) continue;
        for (var oKey in overrides) {
            if (!overrides.hasOwnProperty(oKey)) continue;
            var oVal = overrides[oKey];
            if (oVal === null) {
                // null = 重置为基线值
                if (base.hasOwnProperty(oKey)) {
                    var baseVal = base[oKey];
                    result[oKey] = (baseVal !== null && typeof baseVal === 'object' && !Array.isArray(baseVal))
                        ? deepClone(baseVal) : baseVal;
                }
            } else if (typeof oVal === 'object' && !Array.isArray(oVal)) {
                if (!result[oKey] || typeof result[oKey] !== 'object' || Array.isArray(result[oKey])) {
                    result[oKey] = {};
                }
                result[oKey] = specResolver(result[oKey], oVal);
            } else if (typeof oVal === 'undefined') {
                Logger.error('[CombatSpec] specResolver: 不允许使用 undefined 覆盖 key "' + oKey + '"，请使用 null 重置');
            } else {
                result[oKey] = oVal;
            }
        }
    }
    return result;
}

function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.slice();
    var clone = {};
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            clone[key] = deepClone(obj[key]);
        }
    }
    return clone;
}

/**
 * 路径访问配置值
 * getSpecValue(config, 'STAR.LIFETIME_MS') → 2000
 * 开发模式下路径拼写错误会给出 typo 建议
 */
function getSpecValue(config, path) {
    var parts = path.split('.');
    var current = config;
    var traversed = [];
    for (var i = 0; i < parts.length; i++) {
        if (current === null || current === undefined || typeof current !== 'object') {
            var suggestion = findSimilarKey(traversed.length > 0 ? getNestedValue(config, traversed.join('.')) : config, parts[i]);
            var msg = '[CombatSpec] 路径 "' + path + '" 解析失败，在 "' + traversed.join('.') + '" 中未找到 "' + parts[i] + '"';
            if (suggestion) msg += '。你是否是指 "' + suggestion + '"？';
            Logger.error(msg);
            return undefined;
        }
        if (!current.hasOwnProperty(parts[i])) {
            var parent = traversed.length > 0 ? traversed.join('.') : '根';
            var sug = findSimilarKey(current, parts[i]);
            var m = '[CombatSpec] 路径 "' + path + '" 解析失败，在 ' + parent + ' 组中未找到 "' + parts[i] + '"';
            if (sug) m += '。你是否是指 "' + sug + '"？';
            Logger.error(m);
            return undefined;
        }
        traversed.push(parts[i]);
        current = current[parts[i]];
    }
    return current;
}

function getNestedValue(config, path) {
    var parts = path.split('.');
    var val = config;
    for (var i = 0; i < parts.length; i++) {
        if (val == null || typeof val !== 'object') return undefined;
        val = val[parts[i]];
    }
    return val;
}

function findSimilarKey(obj, target) {
    if (!obj || typeof obj !== 'object') return null;
    var bestKey = null;
    var bestDist = Infinity;
    for (var key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        var dist = levenshtein(target, key);
        if (dist < bestDist && dist <= Math.max(target.length, key.length) / 2) {
            bestDist = dist;
            bestKey = key;
        }
    }
    return bestKey;
}

function levenshtein(a, b) {
    var m = a.length, n = b.length;
    var d = [];
    for (var i = 0; i <= m; i++) { d[i] = [i]; }
    for (var j = 0; j <= n; j++) { d[0][j] = j; }
    for (var ii = 1; ii <= m; ii++) {
        for (var jj = 1; jj <= n; jj++) {
            var cost = a[ii - 1] === b[jj - 1] ? 0 : 1;
            d[ii][jj] = Math.min(d[ii - 1][jj] + 1, d[ii][jj - 1] + 1, d[ii - 1][jj - 1] + cost);
        }
    }
    return d[m][n];
}

/**
 * 扁平化 COMBAT_SPEC 为旧格式（用于向后兼容的 BATTLE_CONSTANTS 导出）
 * STAR.SPAWN_INTERVAL_MS → STAR_SPAWN_INTERVAL_MS
 */
function flattenSpec(spec, prefix) {
    var result = {};
    prefix = prefix || '';
    for (var key in spec) {
        if (!spec.hasOwnProperty(key)) continue;
        var flatKey = prefix ? prefix + '_' + key : key;
        var val = spec[key];
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            var nested = flattenSpec(val, flatKey);
            for (var nk in nested) {
                if (nested.hasOwnProperty(nk)) result[nk] = nested[nk];
            }
        } else {
            result[flatKey] = val;
        }
    }
    return result;
}

/**
 * 强校验 — 检查 override 中的 key 是否在 spec 中有定义
 */
function validateOverrides(overrides, specBase, label) {
    if (!overrides) return;
    for (var key in overrides) {
        if (!overrides.hasOwnProperty(key)) continue;
        var val = overrides[key];
        if (!specBase.hasOwnProperty(key)) {
            var sug = findSimilarKey(specBase, key);
            var msg = '[CombatSpec] ' + label + ': 未知参数 "' + key + '"';
            if (sug) msg += '。你是否是指 "' + sug + '"？';
            Logger.error(msg);
            continue;
        }
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            validateOverrides(val, specBase[key], label + '.' + key);
        }
    }
}

/**
 * 强校验 — 特性枚举值 + 依赖规则
 */
function validateFeatures(features, label) {
    if (!features) return;
    for (var key in features) {
        if (!features.hasOwnProperty(key)) continue;
        var val = features[key];
        if (FEATURE_ENUMS[key]) {
            if (FEATURE_ENUMS[key].indexOf(val) === -1) {
                Logger.error('[CombatSpec] ' + label + ': 特性 "' + key + '" 值 "' + val + '" 不合法，合法值: ' + FEATURE_ENUMS[key].join('/'));
            }
        }
        if (FEATURE_CONSTRAINTS[key] && FEATURE_CONSTRAINTS[key].requires) {
            var reqs = FEATURE_CONSTRAINTS[key].requires;
            for (var i = 0; i < reqs.length; i++) {
                if (!features[reqs[i]]) {
                    Logger.error('[CombatSpec] ' + label + ': 特性 "' + key + '" 依赖 "' + reqs[i] + '"，但 "' + reqs[i] + '" 未启用');
                }
            }
        }
    }
}

/**
 * 弱校验 — 合理性提示（不阻止运行）
 */
function getWeakWarnings(config) {
    var warnings = [];
    if (getSpecValue(config, 'STAR.LIFETIME_MS') <= getSpecValue(config, 'QUICK_TAP.WINDOW_MS')) {
        warnings.push('STAR.LIFETIME_MS ≤ QUICK_TAP.WINDOW_MS: 灵光可能在快速点击前消失');
    }
    if (getSpecValue(config, 'COMBAT.TIME_LIMIT_S') <= 0) {
        warnings.push('COMBAT.TIME_LIMIT_S ≤ 0: 战斗时间无效');
    }
    if (getSpecValue(config, 'STAR.MAX_ON_SCREEN') <= 0) {
        warnings.push('STAR.MAX_ON_SCREEN ≤ 0: 无法生成灵光');
    }
    if (getSpecValue(config, 'COMBO.MULTIPLIER') <= 0) {
        warnings.push('COMBO.MULTIPLIER ≤ 0: 连击无奖励');
    }
    return warnings;
}

export {
    COMBAT_SPEC,
    COMBAT_FEATURES,
    FEATURE_ENUMS,
    FEATURE_CONSTRAINTS,
    BOSS_COMBAT_FEATURES,
    TOWER_COMBAT_FEATURES,
    BOSS_COMBAT_OVERRIDES,
    TOWER_COMBAT_OVERRIDES,
    specResolver,
    getSpecValue,
    flattenSpec,
    validateOverrides,
    validateFeatures,
    getWeakWarnings
};
