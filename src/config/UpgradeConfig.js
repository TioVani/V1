/**
 * 升级+升星系统配置
 * 升星规则：无等级门槛 + 消耗同ID副本 + 概率成功
 */

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
            maxStar: 5,
            starMaterials: [1, 1, 2, 2, 3],
            starRates: [1.0, 0.80, 0.60, 0.40, 0.25],
            starMultiplier: [1.0, 1.1, 1.3, 1.6, 2.0, 2.5],
            upgradeCostFormula: function(level) { return Math.floor(50 * level * 0.5); }
        },
        equipment: {
            maxLevel: 15,
            expFormula: function(level) { return 50 * level; },
            statGrowth: { attack: 2, hp: 8, critRate: 0.1, critDamage: 1, defense: 1 },
            maxStar: 3,
            starMaterials: [1, 1, 2],
            starRates: [1.0, 0.80, 0.60],
            starMultiplier: [1.0, 1.2, 1.5, 2.0],
            upgradeCostFormula: function(level) { return Math.floor(30 * level * 0.5); }
        },
        skill: {
            maxLevel: 10,
            expFormula: function(level) { return 100 * level; },
            statGrowth: { damage: 5 },
            maxStar: 3,
            starMaterials: [1, 1, 2],
            starRates: [1.0, 0.80, 0.60],
            starMultiplier: [1.0, 1.2, 1.5, 2.0],
            upgradeCostFormula: function(level) { return Math.floor(40 * level * 0.5); }
        },
        pet: {
            maxLevel: 30,
            expFormula: function(level) { return 80 * level; },
            statGrowth: { attack: 2, hp: 5, critRate: 0.1, defense: 0.5 },
            maxStar: 3,
            starMaterials: [1, 1, 2],
            starRates: [1.0, 0.80, 0.60],
            starMultiplier: [1.0, 1.2, 1.5, 2.0],
            upgradeCostFormula: function(level) { return Math.floor(35 * level * 0.5); }
        },
        star: {
            maxLevel: 10,
            expFormula: function(level) { return 30 * level; },
            statGrowth: {},
            maxStar: 2,
            starMaterials: [1, 1],
            starRates: [1.0, 0.80],
            starMultiplier: [1.0, 1.5, 2.0],
            upgradeCostFormula: function(level) { return Math.floor(25 * level * 0.5); }
        }
    }
};

export { UPGRADE_CONFIG, UPGRADE_TYPES };
