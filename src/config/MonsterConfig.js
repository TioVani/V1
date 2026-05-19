/**
 * 怪物配置模块（Monster Config）
 * 从 game.js 迁移，包含 Monsters、MonsterRarityWeights、MonsterGrowth、BOSS_LIST
 * MonsterSkillType.XXX 已替换为对应字符串值，避免跨模块引用依赖
 */

const Monsters = {
    // ==================== N级怪物（无技能，基础属性） ====================
    slime: {
        id: 'slime',
        name: '史莱姆',
        rarity: 'N',
        emoji: '🟢',
        description: '最常见的怪物，弱小但数量众多',
        baseHp: 100,
        baseAttack: 10,
        baseDefense: 0,
        attackInterval: 2000,
        skills: [
            { type: 'poison', damage: 1, duration: 3, description: '攻击附带毒素' }
        ],
        mechanics: {},
        drops: { gold: [5, 15], exp: 5 },
        unlockScore: 60
    },

    bat: {
        id: 'bat',
        name: '蝙蝠',
        rarity: 'N',
        emoji: '🦇',
        description: '飞行的小型怪物，速度较快',
        baseHp: 80,
        baseAttack: 8,
        baseDefense: 0,
        attackInterval: 1500,
        skills: [],
        mechanics: {},
        drops: { gold: [5, 12], exp: 6 },
        unlockScore: 80
    },

    rat: {
        id: 'rat',
        name: '巨鼠',
        rarity: 'N',
        emoji: '🐀',
        description: '肮脏的巨鼠，携带毒素',
        baseHp: 120,
        baseAttack: 6,
        baseDefense: 2,
        attackInterval: 1800,
        skills: [],
        mechanics: {},
        drops: { gold: [8, 18], exp: 7 },
        unlockScore: 100
    },

    spider: {
        id: 'spider',
        name: '蜘蛛',
        rarity: 'N',
        emoji: '🕷️',
        description: '结网的蜘蛛，攻击带有毒素',
        baseHp: 90,
        baseAttack: 10,
        baseDefense: 0,
        attackInterval: 2000,
        skills: [],
        mechanics: {},
        drops: { gold: [6, 14], exp: 8 },
        unlockScore: 120
    },

    snake: {
        id: 'snake',
        name: '毒蛇',
        rarity: 'N',
        emoji: '🐍',
        description: '剧毒之蛇，被咬中会持续掉血',
        baseHp: 100,
        baseAttack: 12,
        baseDefense: 0,
        attackInterval: 2200,
        skills: [],
        mechanics: {},
        drops: { gold: [8, 16], exp: 9 },
        unlockScore: 150
    },

    boar: {
        id: 'boar',
        name: '野猪',
        rarity: 'N',
        emoji: '🐗',
        description: '暴躁的野猪，冲撞攻击',
        baseHp: 150,
        baseAttack: 8,
        baseDefense: 5,
        attackInterval: 2500,
        skills: [],
        mechanics: {},
        drops: { gold: [10, 20], exp: 10 },
        unlockScore: 180
    },

    // ==================== R级怪物（1个被动技能） ====================
    goblin: {
        id: 'goblin',
        name: '哥布林',
        rarity: 'R',
        emoji: '👺',
        description: '贪婪的小怪物，喜欢抢夺星币',
        baseHp: 180,
        baseAttack: 15,
        baseDefense: 5,
        attackInterval: 1800,
        skills: [
            { type: 'dodge', chance: 0.1, description: '10%闪避攻击' }
        ],
        mechanics: {},
        drops: { gold: [15, 30], exp: 15 },
        unlockScore: 200
    },

    wolf: {
        id: 'wolf',
        name: '野狼',
        rarity: 'R',
        emoji: '🐺',
        description: '凶猛的野兽，攻击力强',
        baseHp: 200,
        baseAttack: 20,
        baseDefense: 3,
        attackInterval: 1600,
        skills: [
            { type: 'doubleAtk', chance: 0.15, description: '15%概率连击' }
        ],
        mechanics: {},
        drops: { gold: [20, 35], exp: 18 },
        unlockScore: 250
    },

    skeleton: {
        id: 'skeleton',
        name: '骷髅战士',
        rarity: 'R',
        emoji: '💀',
        description: '不死族战士，手持利刃',
        baseHp: 220,
        baseAttack: 18,
        baseDefense: 10,
        attackInterval: 2000,
        skills: [
            { type: 'shield', interval: 10000, amount: 30, description: '每10秒获得护盾' }
        ],
        mechanics: {},
        drops: { gold: [18, 35], exp: 20 },
        unlockScore: 300
    },

    zombie: {
        id: 'zombie',
        name: '僵尸',
        rarity: 'R',
        emoji: '🧟',
        description: '不死生物，生命力顽强',
        baseHp: 300,
        baseAttack: 12,
        baseDefense: 8,
        attackInterval: 2500,
        skills: [
            { type: 'heal', interval: 8000, amount: 20, description: '每8秒恢复20HP' }
        ],
        mechanics: {},
        drops: { gold: [15, 30], exp: 22 },
        unlockScore: 350
    },

    harpy: {
        id: 'harpy',
        name: '鹰身女妖',
        rarity: 'R',
        emoji: '🦅',
        description: '飞翔的女妖，速度极快',
        baseHp: 160,
        baseAttack: 25,
        baseDefense: 0,
        attackInterval: 1200,
        skills: [
            { type: 'dodge', chance: 0.2, description: '20%闪避攻击' }
        ],
        mechanics: {},
        drops: { gold: [20, 40], exp: 25 },
        unlockScore: 400
    },

    // ==================== SR级怪物（1-2个技能） ====================
    orc: {
        id: 'orc',
        name: '兽人',
        rarity: 'SR',
        emoji: '👹',
        description: '强壮的兽人战士，狂暴时更强',
        baseHp: 400,
        baseAttack: 30,
        baseDefense: 15,
        attackInterval: 2000,
        skills: [
            { type: 'rage', hpThreshold: 0.3, attackBonus: 1.5, description: '血量低于30%攻击+50%' }
        ],
        mechanics: {},
        drops: { gold: [30, 60], exp: 35 },
        unlockScore: 500
    },

    ghost: {
        id: 'ghost',
        name: '幽灵',
        rarity: 'SR',
        emoji: '👻',
        description: '虚无缥缈，难以击中',
        baseHp: 250,
        baseAttack: 35,
        baseDefense: 0,
        attackInterval: 1800,
        skills: [
            { type: 'dodge', chance: 0.35, description: '35%闪避攻击' },
            { type: 'reflect', ratio: 0.2, description: '反弹20%伤害' }
        ],
        mechanics: {},
        drops: { gold: [35, 70], exp: 40 },
        unlockScore: 600
    },

    golem: {
        id: 'golem',
        name: '石像鬼',
        rarity: 'SR',
        emoji: '🗿',
        description: '坚硬的石像，防御极高',
        baseHp: 500,
        baseAttack: 20,
        baseDefense: 40,
        attackInterval: 3000,
        skills: [
            { type: 'armor', reduction: 0.3, description: '减伤30%' }
        ],
        mechanics: {},
        drops: { gold: [40, 80], exp: 45 },
        unlockScore: 700
    },

    demon: {
        id: 'demon',
        name: '恶魔',
        rarity: 'SR',
        emoji: '😈',
        description: '来自深渊的恶魔，危险而强大',
        baseHp: 450,
        baseAttack: 45,
        baseDefense: 20,
        attackInterval: 1600,
        skills: [
            { type: 'stun', chance: 0.15, duration: 1000, description: '15%打断玩家1秒' }
        ],
        mechanics: {},
        drops: { gold: [50, 100], exp: 55 },
        unlockScore: 800
    },

    // ==================== SSR级怪物（2个技能+特殊机制） ====================
    necromancer: {
        id: 'necromancer',
        name: '死灵法师',
        rarity: 'SSR',
        emoji: '🧙',
        description: '召唤亡灵的邪恶法师',
        baseHp: 350,
        baseAttack: 40,
        baseDefense: 10,
        attackInterval: 2200,
        skills: [
            { type: 'summon', interval: 15000, monster: 'skeleton', count: 2, description: '每15秒召唤2只骷髅' },
            { type: 'poison', damage: 5, duration: 3, description: '攻击附带毒素' }
        ],
        mechanics: { canSummon: true },
        drops: { gold: [80, 150], exp: 80 },
        unlockScore: 1000
    },

    dragon: {
        id: 'dragon',
        name: '幼龙',
        rarity: 'SSR',
        emoji: '🐉',
        description: '幼年巨龙，拥有强大的力量',
        baseHp: 600,
        baseAttack: 55,
        baseDefense: 25,
        attackInterval: 1400,
        skills: [
            { type: 'stun', chance: 0.25, duration: 1500, description: '25%打断玩家1.5秒' },
            { type: 'absorb', starType: 'fire', ratio: 0.3, healRate: 0.5, description: '吸收30%火星回血' }
        ],
        mechanics: {},
        drops: { gold: [100, 200], exp: 100 },
        unlockScore: 1200
    },

    shadow_demon: {
        id: 'shadow_demon',
        name: '影魔',
        rarity: 'SSR',
        emoji: '👤',
        description: '黑暗中的杀手，难以捉摸',
        baseHp: 400,
        baseAttack: 70,
        baseDefense: 5,
        attackInterval: 1000,
        skills: [
            { type: 'dodge', chance: 0.4, description: '40%闪避攻击' },
            { type: 'doubleAtk', chance: 0.25, description: '25%概率连击' }
        ],
        mechanics: {},
        drops: { gold: [100, 180], exp: 90 },
        unlockScore: 1400
    },

    fallenAngel: {
        id: 'fallenAngel',
        name: '堕落天使',
        rarity: 'SSR',
        emoji: '👿',
        description: '堕落的翼人，以黑暗力量攻击',
        baseHp: 500,
        baseAttack: 50,
        baseDefense: 15,
        attackInterval: 1800,
        skills: [
            { type: 'stun', chance: 0.2, duration: 1200, description: '20%打断玩家1.2秒' },
            { type: 'absorb', starType: 'ice', ratio: 0.25, healRate: 0.4, description: '吸收25%冰星回血' }
        ],
        mechanics: {},
        drops: { gold: [100, 200], exp: 100 },
        unlockScore: 1200
    },

    // ==================== UR级怪物（多技能+复杂机制） ====================
    ancient_dragon: {
        id: 'ancient_dragon',
        name: '远古巨龙',
        rarity: 'UR',
        emoji: '🐲',
        description: '远古的巨龙，毁灭性的力量',
        baseHp: 800,
        baseAttack: 80,
        baseDefense: 35,
        attackInterval: 1200,
        skills: [
            { type: 'stun', chance: 0.3, duration: 2000, description: '30%打断玩家2秒' },
            { type: 'rage', hpThreshold: 0.5, attackBonus: 1.5, description: '血量低于50%攻击+50%' },
            { type: 'armor', reduction: 0.2, description: '减伤20%' }
        ],
        mechanics: {},
        drops: { gold: [150, 300], exp: 150 },
        unlockScore: 1600
    },

    void_creature: {
        id: 'void_creature',
        name: '虚空生物',
        rarity: 'UR',
        emoji: '👾',
        description: '来自虚空的神秘存在，无视防御',
        baseHp: 700,
        baseAttack: 100,
        baseDefense: 0,
        attackInterval: 1000,
        skills: [
            { type: 'dodge', chance: 0.3, description: '30%闪避攻击' },
            { type: 'reflect', ratio: 0.3, description: '反弹30%伤害' },
            { type: 'absorb', starType: 'all', ratio: 0.2, healRate: 1.0, description: '吸收20%所有星星' }
        ],
        mechanics: { ignoreDefense: true },
        drops: { gold: [200, 400], exp: 200 },
        unlockScore: 1800
    },

    // ==================== Boss怪物 ====================
    slime_king: {
        id: 'slime_king',
        name: '史莱姆王',
        rarity: 'SR',
        emoji: '👑',
        description: '史莱姆的领袖，体型巨大',
        baseHp: 800,
        baseAttack: 30,
        baseDefense: 10,
        attackInterval: 2500,
        skills: [
            { type: 'split', hpThreshold: 0.5, splitInto: 'slime', count: 3, description: '血量50%时分裂成3只史莱姆' },
            { type: 'poison_split', hpThreshold: 0.7, damage: 20, poisonDuration: 5, poisonDamage: 8, puddleCount: 3, puddleRadius: 65, description: '吐出毒液形成毒液滩' }
        ],
        mechanics: { isBoss: true, bossPhase: 1 },
        drops: { gold: 100, exp: 80, materials: ['iceCrystal'], materialChance: 1.0 },
        unlockScore: 200
    },

    goblin_king: {
        id: 'goblin_king',
        name: '哥布林王',
        rarity: 'SR',
        emoji: '👑',
        description: '哥布林的首领，统领群族',
        baseHp: 1200,
        baseAttack: 50,
        baseDefense: 20,
        attackInterval: 2000,
        skills: [
            { type: 'summon', interval: 12000, monster: 'goblin', count: 2, description: '每12秒召唤2只哥布林' },
            { type: 'absorb', starType: 'ice', ratio: 0.2, healRate: 1.0, description: '吸收20%冰星回血' }
        ],
        mechanics: { isBoss: true, bossPhase: 2 },
        drops: { gold: 150, exp: 120, materials: ['fireSource'], materialChance: 1.0 },
        unlockScore: 500
    },

    flame_lord: {
        id: 'flame_lord',
        name: '火焰领主',
        rarity: 'SSR',
        emoji: '🔥',
        description: '掌控火焰的强大存在',
        baseHp: 2000,
        baseAttack: 80,
        baseDefense: 30,
        attackInterval: 1800,
        skills: [
            { type: 'stun', chance: 0.2, duration: 1500, description: '20%打断玩家' },
            { type: 'absorb', starType: 'fire', ratio: 0.5, healRate: 0.8, description: '吸收50%火星回血' },
            { type: 'rage', hpThreshold: 0.3, attackBonus: 2.0, description: '血量低于30%攻击翻倍' }
        ],
        mechanics: { isBoss: true, bossPhase: 3 },
        drops: { gold: 250, exp: 200, materials: ['fireSource', 'critFireSource'], materialChance: 0.8 },
        unlockScore: 800
    },

    ice_queen: {
        id: 'ice_queen',
        name: '冰霜女王',
        rarity: 'SSR',
        emoji: '❄️',
        description: '冰冷的王者，冻结一切',
        baseHp: 1800,
        baseAttack: 70,
        baseDefense: 40,
        attackInterval: 2000,
        skills: [
            { type: 'stun', chance: 0.25, duration: 2000, description: '25%打断玩家' },
            { type: 'absorb', starType: 'ice', ratio: 0.5, healRate: 0.8, description: '吸收50%冰星回血' },
            { type: 'shield', interval: 8000, amount: 100, description: '每8秒获得护盾' }
        ],
        mechanics: { isBoss: true, bossPhase: 4 },
        drops: { gold: 300, exp: 250, materials: ['iceCrystal', 'critCrystal'], materialChance: 0.8 },
        unlockScore: 1000
    },

    thunder_dragon: {
        id: 'thunder_dragon',
        name: '雷龙',
        rarity: 'SSR',
        emoji: '⚡',
        description: '掌控雷电的巨龙',
        baseHp: 3000,
        baseAttack: 100,
        baseDefense: 35,
        attackInterval: 1500,
        skills: [
            { type: 'stun', chance: 0.35, duration: 1500, description: '35%打断玩家' },
            { type: 'doubleAtk', chance: 0.3, description: '30%连击' },
            { type: 'absorb', starType: 'lightning', ratio: 0.4, healRate: 1.0, description: '吸收40%雷星' }
        ],
        mechanics: { isBoss: true, bossPhase: 5 },
        drops: { gold: 400, exp: 350, materials: ['critCrystal', 'critFireSource'], materialChance: 0.6 },
        unlockScore: 1200
    },

    void_emperor: {
        id: 'void_emperor',
        name: '虚空皇帝',
        rarity: 'UR',
        emoji: '🌌',
        description: '虚空的主宰，不可名状的恐惧',
        baseHp: 5000,
        baseAttack: 150,
        baseDefense: 50,
        attackInterval: 1200,
        skills: [
            { type: 'stun', chance: 0.3, duration: 2000, description: '30%打断玩家' },
            { type: 'absorb', starType: 'all', ratio: 0.3, healRate: 0.5, description: '吸收30%所有星星' },
            { type: 'summon', interval: 15000, monster: 'void_creature', count: 1, description: '每15秒召唤虚空生物' },
            { type: 'dodge', chance: 0.25, description: '25%闪避' }
        ],
        mechanics: { isBoss: true, bossPhase: 6, ignoreDefense: true },
        drops: { gold: 600, exp: 500, materials: ['critCrystal', 'critFireSource'], materialChance: 0.8 },
        unlockScore: 1500
    },

    chaos_lord: {
        id: 'chaos_lord',
        name: '混沌之王',
        rarity: 'UR',
        emoji: '👑',
        description: '混沌的化身，毁灭一切',
        baseHp: 8000,
        baseAttack: 200,
        baseDefense: 60,
        attackInterval: 1000,
        skills: [
            { type: 'stun', chance: 0.35, duration: 2500, description: '35%打断玩家' },
            { type: 'rage', hpThreshold: 0.5, attackBonus: 1.8, description: '血量50%以下攻击+80%' },
            { type: 'reflect', ratio: 0.4, description: '反弹40%伤害' },
            { type: 'armor', reduction: 0.3, description: '减伤30%' }
        ],
        mechanics: { isBoss: true, bossPhase: 7 },
        drops: { gold: 1000, exp: 800, materials: ['critCrystal', 'critFireSource', 'timeCrystal'], materialChance: 0.5 },
        unlockScore: 1800
    },

    abyss_lord: {
        id: 'abyss_lord',
        name: '深渊之主',
        rarity: 'UR',
        emoji: '👿',
        description: '深渊的最终Boss，无尽之塔的终极挑战',
        baseHp: 15000,
        baseAttack: 300,
        baseDefense: 80,
        attackInterval: 800,
        skills: [
            { type: 'stun', chance: 0.4, duration: 3000, description: '40%打断玩家3秒' },
            { type: 'absorb', starType: 'all', ratio: 0.5, healRate: 0.5, description: '吸收50%所有星星' },
            { type: 'summon', interval: 10000, monster: 'demon', count: 2, description: '每10秒召唤恶魔' },
            { type: 'rage', hpThreshold: 0.3, attackBonus: 2.0, description: '血量30%以下攻击翻倍' },
            { type: 'armor', reduction: 0.4, description: '减伤40%' }
        ],
        mechanics: { isBoss: true, bossPhase: 8, finalBoss: true },
        drops: { gold: 2000, exp: 1500, materials: ['critCrystal', 'critFireSource', 'timeCrystal'], materialChance: 1.0 },
        unlockScore: 2000
    },

    // ==================== 终极Boss ====================
    star_god: {
        id: 'star_god',
        name: '器灵之神',
        rarity: 'UR',
        emoji: '🌟',
        description: '终极Boss，掌控器灵之力',
        baseHp: 20000,
        baseAttack: 250,
        baseDefense: 70,
        attackInterval: 800,
        skills: [
            { type: 'stun', chance: 0.4, duration: 2500, description: '40%打断玩家' },
            { type: 'absorb', starType: 'all', ratio: 0.5, healRate: 1.0, description: '吸收50%所有星星回血' },
            { type: 'rage', hpThreshold: 0.3, attackBonus: 2.5, description: '血量30%以下攻击+150%' },
            { type: 'reflect', ratio: 0.3, description: '反弹30%伤害' }
        ],
        mechanics: { isBoss: true, bossPhase: 9, finalBoss: true },
        drops: { gold: 3000, exp: 2000, materials: ['critCrystal', 'critFireSource', 'timeCrystal'], materialChance: 1.0 },
        unlockScore: 2500
    },

    // ==================== 特殊机制Boss ====================
    star_devourer: {
        id: 'star_devourer',
        name: '器渊吞噬者',
        rarity: 'UR',
        emoji: '🌀',
        description: '吞噬器灵的深渊存在，会召唤Boss星星考验玩家',
        baseHp: 6000,
        baseAttack: 120,
        baseDefense: 40,
        attackInterval: 1500,
        skills: [
            { type: 'stun', chance: 0.15, duration: 1500, description: '15%打断玩家' },
            { type: 'absorb', starType: 'all', ratio: 0.2, healRate: 0.5, description: '吸收20%所有星星' }
        ],
        mechanics: {
            isBoss: true,
            bossPhase: 6,
            hasStarSummon: true,      // 拥有星星召唤技能
            starSummonFirst: 3,       // 首次触发攻击次数
            starSummonRepeat: 6       // 后续触发间隔
        },
        drops: {
            gold: [800, 1200],           // 星币范围 800-1200
            exp: [600, 800],             // 经验范围 600-800
            // 衡生装备池
            equipment: ['devourer_blade', 'void_armor', 'abyss_pendant', 'devourer_crown'],
            equipmentChance: 0.0025,        // 0.25%概率掉落装备
            // 衡生技能池
            skill: ['skill_void_hide', 'skill_star_devour', 'skill_shadow_evasion', 'skill_void_power'],
            skillChance: 0.01,            // 1%概率掉落技能
            // 衡生宠物池
            pet: ['pet_void_sprite', 'pet_star_devourer_cub', 'pet_phantom_hunter'],
            petChance: 0.01,              // 1%概率掉落宠物
            // 材料掉落
            materials: ['critCrystal', 'critFireSource'],
            materialChance: 0.5,          // 50%概率掉落暴击冰晶/爆伤火源
            // 吞噬残辉必掉
            devourerResidue: [3, 10]      // 必掉3-10个吞噬残辉
        },
        unlockScore: 1400
    },

    // ==================== 偷星者（特殊怪物）====================
    star_thief: {
        id: 'star_thief',
        name: '窃灵者',
        rarity: 'SSR',
        emoji: '🌑',
        description: '窃取器灵之力，将星星化为己用的神秘存在',
        baseHp: 1500,
        baseAttack: 15,
        baseDefense: 0,
        attackInterval: 2000,
        skills: [],
        mechanics: { type: 'star_thief' },
        isStarThief: true,
        drops: { gold: [50, 100], exp: 30 },
        unlockScore: 60
    }
};

// 怪物稀有度权重（用于随机生成）
const MonsterRarityWeights = {
    UC: 60,
    N: 50,
    R: 30,
    SR: 15,
    SSR: 4,
    UR: 1,
    LR: 0.1,
    SP: 0.01
};

// 怪物成长系数
const MonsterGrowth = {
    hpPerLevel: 1.15,      // 每层HP +15%
    attackPerLevel: 1.10,  // 每层攻击 +10%
    defensePerLevel: 1.05  // 每层防御 +5%
};

// Boss列表配置
const BOSS_LIST = [
    {
        id: 'slime_king',
        name: '史莱姆王',
        emoji: '🟢',
        level: 1,
        hp: 2000,
        attack: 5,
        attackInterval: 2000,
        skills: [
            { type: 'split', hpThreshold: 0.5, splitInto: 'slime', count: 3, description: '血量50%时分裂成3只史莱姆' },
            { type: 'poison_split', hpThreshold: 0.7, damage: 20, poisonDuration: 5, poisonDamage: 8, puddleCount: 3, puddleRadius: 65, description: '吐出毒液形成毒液滩' }
        ],
        description: '入门级Boss，击败可获得基础奖励',
        rewards: {
            gold: [50, 100],
            starSource: [0, 5],
            materials: ['iceCrystal'],
            materialChance: 0.3,
            equipment: ['sword_1'],
            equipmentChance: 0.025,
            skill: null,
            skillChance: 0
        }
    },
    {
        id: 'flame_lord',
        name: '火焰领主',
        emoji: '🔥',
        level: 5,
        hp: 4000,
        attack: 10,
        attackInterval: 1800,  // 攻击间隔1.8秒
        description: '中级Boss，有概率掉落火源和技能',
        rewards: {
            gold: [100, 200],
            starSource: [5, 15],
            materials: ['fireSource', 'iceCrystal'],
            materialChance: 0.5,
            equipment: ['sword_2', 'fire_sword'],
            equipmentChance: 0.05,
            skill: 'skill_fireball',
            skillChance: 0.05
        }
    },
    {
        id: 'ice_queen',
        name: '冰霜女王',
        emoji: '❄️',
        level: 10,
        hp: 8000,
        attack: 15,
        attackInterval: 1500,  // 攻击间隔1.5秒
        description: '高级Boss，有概率掉落暴击冰晶',
        rewards: {
            gold: [200, 400],
            starSource: [10, 30],
            materials: ['critCrystal', 'iceCrystal', 'fireSource'],
            materialChance: 0.6,
            equipment: ['ice_staff', 'frost_scepter'],
            equipmentChance: 0.075,
            skill: 'skill_ice_shield',
            skillChance: 0.1
        }
    },
    {
        id: 'thunder_dragon',
        name: '雷龙',
        emoji: '🐉',
        level: 20,
        hp: 20000,
        attack: 25,
        attackInterval: 1200,  // 攻击间隔1.2秒
        description: '精英Boss，有概率掉落稀有装备和技能',
        rewards: {
            gold: [500, 1000],
            starSource: [30, 80],
            materials: ['critCrystal', 'critFireSource'],
            materialChance: 0.7,
            equipment: ['meteor_blade', 'blaze_edge'],
            equipmentChance: 0.1,
            skill: 'skill_thunder_strike',
            skillChance: 0.15
        }
    },
    {
        id: 'void_emperor',
        name: '虚空皇帝',
        emoji: '👾',
        level: 30,
        hp: 40000,
        attack: 40,
        attackInterval: 1000,  // 攻击间隔1秒
        description: '传说级Boss，有概率掉落UR装备',
        rewards: {
            gold: [1000, 3000],
            starSource: [100, 200],
            materials: ['critCrystal', 'critFireSource', 'timeCrystal'],
            materialChance: 0.8,
            equipment: ['star_sword', 'heart_of_ice', 'emperor_flame'],
            equipmentChance: 0.125,
            skill: 'skill_void_slash',
            skillChance: 0.25
        }
    },
    {
        id: 'star_god',
        name: '器灵之神',
        emoji: '🌟',
        level: 50,
        hp: 100000,
        attack: 60,
        attackInterval: 800,  // 攻击间隔0.8秒（最快）
        description: '终极Boss，掉落最稀有奖励',
        rewards: {
            gold: [3000, 8000],
            starSource: [200, 500],
            materials: ['critCrystal', 'critFireSource', 'timeCrystal'],
            materialChance: 1.0,
            equipment: ['galaxy_blade'],
            equipmentChance: 0.2,
            skill: 'skill_cosmic_ray',
            skillChance: 0.5
        }
    }
];

// 怪物配置 - 使用统一怪物系统
const MonsterTypes = {
    // 普通怪物 - 从统一配置获取
    slime: {
        id: 'slime',
        name: Monsters.slime.name,
        emoji: Monsters.slime.emoji,
        baseHp: Monsters.slime.baseHp,
        timeReward: 8,
        rarity: Monsters.slime.rarity,
        skills: Monsters.slime.skills
    },
    goblin: {
        id: 'goblin',
        name: Monsters.goblin.name,
        emoji: Monsters.goblin.emoji,
        baseHp: Monsters.goblin.baseHp,
        timeReward: 6,
        rarity: Monsters.goblin.rarity,
        skills: Monsters.goblin.skills
    },
    wolf: {
        id: 'wolf',
        name: Monsters.wolf.name,
        emoji: Monsters.wolf.emoji,
        baseHp: Monsters.wolf.baseHp,
        timeReward: 10,
        rarity: Monsters.wolf.rarity,
        skills: Monsters.wolf.skills
    },
    skeleton: {
        id: 'skeleton',
        name: Monsters.skeleton.name,
        emoji: Monsters.skeleton.emoji,
        baseHp: Monsters.skeleton.baseHp,
        timeReward: 12,
        rarity: Monsters.skeleton.rarity,
        skills: Monsters.skeleton.skills
    },
    demon: {
        id: 'demon',
        name: Monsters.demon.name,
        emoji: Monsters.demon.emoji,
        baseHp: Monsters.demon.baseHp,
        timeReward: 15,
        rarity: Monsters.demon.rarity,
        skills: Monsters.demon.skills
    },
    fallenAngel: {
        id: 'fallenAngel',
        name: Monsters.fallenAngel.name,
        emoji: Monsters.fallenAngel.emoji,
        baseHp: Monsters.fallenAngel.baseHp,
        timeReward: 18,
        rarity: Monsters.fallenAngel.rarity,
        skills: Monsters.fallenAngel.skills
    },
    // Boss - 从统一配置获取
    slime_king: {
        id: 'slime_king',
        name: Monsters.slime_king.name,
        emoji: Monsters.slime_king.emoji,
        baseHp: Monsters.slime_king.baseHp,
        timeReward: 20,
        attack: Monsters.slime_king.baseAttack,
        attackInterval: Monsters.slime_king.attackInterval,
        rarity: Monsters.slime_king.rarity,
        skills: Monsters.slime_king.skills,
        isBoss: true
    },
    goblin_king: {
        id: 'goblin_king',
        name: Monsters.goblin_king.name,
        emoji: Monsters.goblin_king.emoji,
        baseHp: Monsters.goblin_king.baseHp,
        timeReward: 25,
        attack: Monsters.goblin_king.baseAttack,
        attackInterval: Monsters.goblin_king.attackInterval,
        rarity: Monsters.goblin_king.rarity,
        skills: Monsters.goblin_king.skills,
        isBoss: true
    },
    flame_lord: {
        id: 'flame_lord',
        name: Monsters.flame_lord.name,
        emoji: Monsters.flame_lord.emoji,
        baseHp: Monsters.flame_lord.baseHp,
        timeReward: 30,
        attack: Monsters.flame_lord.baseAttack,
        attackInterval: Monsters.flame_lord.attackInterval,
        rarity: Monsters.flame_lord.rarity,
        skills: Monsters.flame_lord.skills,
        isBoss: true
    },
    ice_queen: {
        id: 'ice_queen',
        name: Monsters.ice_queen.name,
        emoji: Monsters.ice_queen.emoji,
        baseHp: Monsters.ice_queen.baseHp,
        timeReward: 35,
        attack: Monsters.ice_queen.baseAttack,
        attackInterval: Monsters.ice_queen.attackInterval,
        rarity: Monsters.ice_queen.rarity,
        skills: Monsters.ice_queen.skills,
        isBoss: true
    },
    thunder_dragon: {
        id: 'thunder_dragon',
        name: Monsters.thunder_dragon.name,
        emoji: Monsters.thunder_dragon.emoji,
        baseHp: Monsters.thunder_dragon.baseHp,
        timeReward: 40,
        attack: Monsters.thunder_dragon.baseAttack,
        attackInterval: Monsters.thunder_dragon.attackInterval,
        rarity: Monsters.thunder_dragon.rarity,
        skills: Monsters.thunder_dragon.skills,
        isBoss: true
    },
    chaos_lord: {
        id: 'chaos_lord',
        name: Monsters.chaos_lord.name,
        emoji: Monsters.chaos_lord.emoji,
        baseHp: Monsters.chaos_lord.baseHp,
        timeReward: 45,
        attack: Monsters.chaos_lord.baseAttack,
        attackInterval: Monsters.chaos_lord.attackInterval,
        rarity: Monsters.chaos_lord.rarity,
        skills: Monsters.chaos_lord.skills,
        isBoss: true
    },
    abyss_lord: {
        id: 'abyss_lord',
        name: Monsters.abyss_lord.name,
        emoji: Monsters.abyss_lord.emoji,
        baseHp: Monsters.abyss_lord.baseHp,
        timeReward: 55,
        attack: Monsters.abyss_lord.baseAttack,
        attackInterval: Monsters.abyss_lord.attackInterval,
        rarity: Monsters.abyss_lord.rarity,
        skills: Monsters.abyss_lord.skills,
        isBoss: true
    },
    star_god: {
        id: 'star_god',
        name: Monsters.star_god.name,
        emoji: Monsters.star_god.emoji,
        baseHp: Monsters.star_god.baseHp,
        timeReward: 60,
        attack: Monsters.star_god.baseAttack,
        attackInterval: Monsters.star_god.attackInterval,
        rarity: Monsters.star_god.rarity,
        skills: Monsters.star_god.skills,
        isBoss: true
    },
    void_emperor: {
        id: 'void_emperor',
        name: Monsters.void_emperor.name,
        emoji: Monsters.void_emperor.emoji,
        baseHp: Monsters.void_emperor.baseHp,
        timeReward: 50,
        attack: Monsters.void_emperor.baseAttack,
        attackInterval: Monsters.void_emperor.attackInterval,
        rarity: Monsters.void_emperor.rarity,
        skills: Monsters.void_emperor.skills,
        isBoss: true
    },
    star_devourer: {
        id: 'star_devourer',
        name: Monsters.star_devourer.name,
        emoji: Monsters.star_devourer.emoji,
        baseHp: Monsters.star_devourer.baseHp,
        timeReward: 55,
        attack: Monsters.star_devourer.baseAttack,
        attackInterval: Monsters.star_devourer.attackInterval,
        rarity: Monsters.star_devourer.rarity,
        skills: Monsters.star_devourer.skills,
        isBoss: true
    },

    // 偷星者（特殊怪物）
    star_thief: {
        id: 'star_thief',
        name: Monsters.star_thief.name,
        emoji: Monsters.star_thief.emoji,
        baseHp: Monsters.star_thief.baseHp,
        attack: Monsters.star_thief.baseAttack,
        attackInterval: Monsters.star_thief.attackInterval,
        timeReward: 0,
        rarity: Monsters.star_thief.rarity,
        skills: Monsters.star_thief.skills,
        isBoss: true,
        isStarThief: true
    }
};

export { Monsters, MonsterRarityWeights, MonsterGrowth, BOSS_LIST, MonsterTypes };
