/**
 * 融合系统配置
 * 所有融合相关的常量和配置集中管理
 */

var FUSION_LAYERS = {
    NORMAL: 'normal',
    SUPER: 'super',
    ULTRA: 'ultra'
};

var FUSION_TYPES = {
    CHARACTER: 'character',
    PET: 'pet',
    SKILL: 'skill',
    STAR: 'star',
    EQUIPMENT: 'equipment'
};

var FUSION_CONFIG = {
    successRate: { normal: 75, super: 45, ultra: 20 },
    rarityModifier: { UC: 15, N: 10, R: 10, SR: 0, SSR: -10, UR: -15, LR: -20, SP: 0 },
    greatSuccessChance: 0.10,
    pityThreshold: 3,
    failureMaterialLoss: 1,
    materialCount: 3,
    layerMultipliers: {
        normal: { stats: 2 },
        super: { stats: 5 },
        ultra: { stats: 15 }
    },
    layerAffixCount: {
        normal: { min: 1, max: 2 },
        super: { bonus: 1 },
        ultra: { bonus: 1 }
    },
    layerNames: { normal: '初融', super: '超融', ultra: '极融' },
    naming: {
        domains: ['焰域', '冰域', '雷域', '风域', '光域', '暗域', '灵域', '虚域'],
        superPrefixes: ['超', '极', '神', '圣', '魔', '天', '地', '玄'],
        ultraPrefixes: ['至臻', '永恒', '无限', '至高', '本源', '归元', '万灵', '归一'],
        affixes: ['锋锐', '坚韧', '幸运', '共鸣', '熔铸', '迅捷', '暴虐', '守护'],
        suffixes: ['之刃', '之心', '之眼', '之翼', '之力', '之魂', '之光', '之影']
    },
    elements: ['fire', 'ice', 'thunder', 'wind', 'light', 'dark', 'none'],
    elementAffinity: {
        fire: '爆发', ice: '控制', thunder: '连锁', wind: '闪避',
        light: '治疗', dark: '吸血', none: '随机'
    }
};

var RARITY_ORDER = ['UC', 'N', 'R', 'SR', 'SSR', 'UR', 'LR', 'SP'];

function getNextRarity(rarity) {
    var idx = RARITY_ORDER.indexOf(rarity);
    if (idx < 0 || idx >= RARITY_ORDER.length - 1) return rarity;
    return RARITY_ORDER[idx + 1];
}

export { FUSION_LAYERS, FUSION_TYPES, FUSION_CONFIG, RARITY_ORDER, getNextRarity };
