/**
 * 怪物配置模块（Monster Config）— 邪灵主题（器灵·赛博华夏）
 * 从 game.js 迁移，包含 Monsters、MonsterRarityWeights、MonsterGrowth、BOSS_LIST
 *
 * 邪灵 = 被污染的古灵。击败 = 净化。
 * 命名公式：【古灵本名】邪灵 / 被污染的【文物】碎片 /【属性】紊乱灵
 */

const Monsters = {
    // ==================== UC级古灵（粗品，最低稀有度） ====================
    dust: {
        id: 'dust',
        name: '灵尘',
        rarity: 'UC',
        emoji: '🌫️',
        description: '灵域中最微弱的灵能残留，几乎无法凝聚成形',
        baseHp: 50,
        baseAttack: 4,
        baseDefense: 0,
        attackInterval: 2500,
        skills: [],
        mechanics: {},
        drops: { gold: [1, 5], exp: 2 },
        unlockScore: 0
    },

    // 新手教学对手：剑魄（使用实际角色图渲染）
    tutorial_jp: {
        id: 'tutorial_jp',
        name: '剑魄',
        rarity: 'R',
        emoji: '⚔️',
        description: '华夏·青铜灵，新手教学对手',
        baseHp: 100,
        baseAttack: 0,
        baseDefense: 0,
        attackInterval: 99999,
        skills: [],
        mechanics: { isTutorial: true },
        drops: { gold: [0, 0], exp: 0 },
        unlockScore: 0,
        imageAssetId: 'char_archerPortrait'
    },

    wisp: {
        id: 'wisp',
        name: '微光灵絮',
        rarity: 'UC',
        emoji: '💨',
        description: '飘散的微弱灵絮，尚不足以形成完整的古灵意识',
        baseHp: 60,
        baseAttack: 5,
        baseDefense: 0,
        attackInterval: 2200,
        skills: [],
        mechanics: {},
        drops: { gold: [2, 6], exp: 3 },
        unlockScore: 20
    },

    shard: {
        id: 'shard',
        name: '残片邪灵',
        rarity: 'UC',
        emoji: '🔹',
        description: '被严重污染的文物残片，灵能结构极不稳定',
        baseHp: 70,
        baseAttack: 6,
        baseDefense: 1,
        attackInterval: 2000,
        skills: [],
        mechanics: {},
        drops: { gold: [3, 8], exp: 4 },
        unlockScore: 40
    },

    // ==================== N级古灵（无技能，基础属性） ====================
    slime: {
        id: 'slime',
        name: '锈灵碎片',
        rarity: 'N',
        emoji: '🔸',
        description: '被污染的青铜碎片中剥离的细小灵能，在灵域边缘徘徊。攻击时附带紊乱能量的微弱侵蚀',
        baseHp: 100,
        baseAttack: 10,
        baseDefense: 0,
        attackInterval: 2000,
        skills: [
            { type: 'poison', damage: 1, duration: 3, description: '攻击附带铜毒' }
        ],
        mechanics: {},
        drops: { gold: [5, 15], exp: 5 },
        unlockScore: 60
    },

    bat: {
        id: 'bat',
        name: '碎瓷邪灵',
        rarity: 'N',
        emoji: '🔹',
        description: '破碎瓷器中被污染的残余灵能，在灵域中游荡不定',
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
        name: '散玉邪灵',
        rarity: 'N',
        emoji: '💚',
        description: '碎玉中逸散的被污染灵能，微小但凝聚不散',
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
        name: '锈剑邪灵',
        rarity: 'N',
        emoji: '🗡️',
        description: '残破锈剑中滞留的紊乱灵能，锋芒仍带有侵蚀之力',
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
        name: '墨渍邪灵',
        rarity: 'N',
        emoji: '🖋️',
        description: '被污染的废弃墨迹灵能，携带紊乱的意识碎片',
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
        name: '碎金邪灵',
        rarity: 'N',
        emoji: '✨',
        description: '金器碎片中被污染的灵能，以莽撞的方式横冲直撞',
        baseHp: 150,
        baseAttack: 8,
        baseDefense: 5,
        attackInterval: 2500,
        skills: [],
        mechanics: {},
        drops: { gold: [10, 20], exp: 10 },
        unlockScore: 180
    },

    // ==================== R级古灵（1个被动技能） ====================
    goblin: {
        id: 'goblin',
        name: '戈魂邪灵',
        rarity: 'R',
        emoji: '🔱',
        description: '被污染的青铜戈矛之残灵，贪恋灵质碎屑的残余能量',
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
        name: '青瓷邪灵',
        rarity: 'R',
        emoji: '🍶',
        description: '被污染的瓷器之灵，优雅外表下是紊乱的内核',
        baseHp: 200,
        baseAttack: 20,
        baseDefense: 3,
        attackInterval: 1600,
        skills: [
            { type: 'doubleAtk', chance: 0.15, description: '15%概率连灵' }
        ],
        mechanics: {},
        drops: { gold: [20, 35], exp: 18 },
        unlockScore: 250
    },

    skeleton: {
        id: 'skeleton',
        name: '断璧邪灵',
        rarity: 'R',
        emoji: '💍',
        description: '被污染的断裂玉璧之灵，聚集成顽固的防御性能量层',
        baseHp: 220,
        baseAttack: 18,
        baseDefense: 10,
        attackInterval: 2000,
        skills: [
            { type: 'shield', interval: 10000, amount: 30, description: '每10秒获得玉盾' }
        ],
        mechanics: {},
        drops: { gold: [18, 35], exp: 20 },
        unlockScore: 300
    },

    zombie: {
        id: 'zombie',
        name: '残卷邪灵',
        rarity: 'R',
        emoji: '📜',
        description: '被污染的残破书卷之灵，紊乱能量使其反复重组',
        baseHp: 300,
        baseAttack: 12,
        baseDefense: 8,
        attackInterval: 2500,
        skills: [
            { type: 'heal', interval: 8000, amount: 20, description: '每8秒恢复20灵能' }
        ],
        mechanics: {},
        drops: { gold: [15, 30], exp: 22 },
        unlockScore: 350
    },

    harpy: {
        id: 'harpy',
        name: '暗矢邪灵',
        rarity: 'R',
        emoji: '🏹',
        description: '被污染的暗器之灵，来去无踪的紊乱能量碎片',
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

    // ==================== SR级古灵（1-2个技能） ====================
    orc: {
        id: 'orc',
        name: '战戈邪灵',
        rarity: 'SR',
        emoji: '⚔️',
        description: '被污染的铜戈战意之灵——越受压制，紊乱反噬越强',
        baseHp: 400,
        baseAttack: 30,
        baseDefense: 15,
        attackInterval: 2000,
        skills: [
            { type: 'rage', hpThreshold: 0.3, attackBonus: 1.5, description: '灵核活性低于30%冲击+50%' }
        ],
        mechanics: {},
        drops: { gold: [30, 60], exp: 35 },
        unlockScore: 500
    },

    ghost: {
        id: 'ghost',
        name: '玉蝉邪灵',
        rarity: 'SR',
        emoji: '🦗',
        description: '被污染的玉蝉之灵，紊乱能量使其形态在虚实之间不断闪烁',
        baseHp: 250,
        baseAttack: 35,
        baseDefense: 0,
        attackInterval: 1800,
        skills: [
            { type: 'dodge', chance: 0.35, description: '灵核虚化：35%闪避灵光冲击' },
            { type: 'reflect', ratio: 0.2, description: '灵能反射：反弹20%灵光冲击' }
        ],
        mechanics: {},
        drops: { gold: [35, 70], exp: 40 },
        unlockScore: 600
    },

    golem: {
        id: 'golem',
        name: '鼎纹邪灵',
        rarity: 'SR',
        emoji: '🛡️',
        description: '被污染的鼎纹碎片之灵，凝成僵固但坚定不散的防御层',
        baseHp: 500,
        baseAttack: 20,
        baseDefense: 40,
        attackInterval: 3000,
        skills: [
            { type: 'armor', reduction: 0.3, description: '灵场强化：减轻30%灵光冲击' }
        ],
        mechanics: {},
        drops: { gold: [40, 80], exp: 45 },
        unlockScore: 700
    },

    demon: {
        id: 'demon',
        name: '狂草邪灵',
        rarity: 'SR',
        emoji: '🎨',
        description: '被污染的书法之灵，狂乱笔意扭曲为无序的紊乱冲击',
        baseHp: 450,
        baseAttack: 45,
        baseDefense: 20,
        attackInterval: 1600,
        skills: [
            { type: 'stun', chance: 0.15, duration: 1000, description: '15%打断唤灵人1秒' }
        ],
        mechanics: {},
        drops: { gold: [50, 100], exp: 55 },
        unlockScore: 800
    },

    // ==================== SSR级古灵（2个技能+特殊机制） ====================
    necromancer: {
        id: 'necromancer',
        name: '丹青卷邪灵',
        rarity: 'SSR',
        emoji: '📖',
        description: '被污染的古画卷灵，紊乱能量撕扯出更多碎片蔓延',
        baseHp: 350,
        baseAttack: 40,
        baseDefense: 10,
        attackInterval: 2200,
        skills: [
            { type: 'summon', interval: 15000, monster: 'skeleton', count: 2, description: '每15秒召唤2只断璧灵' },
            { type: 'poison', damage: 5, duration: 3, description: '攻击附带墨毒' }
        ],
        mechanics: { canSummon: true },
        drops: { gold: [80, 150], exp: 80 },
        unlockScore: 1000
    },

    dragon: {
        id: 'dragon',
        name: '铜龙纹邪灵',
        rarity: 'SSR',
        emoji: '🐲',
        description: '被污染的青铜龙纹之灵，龙威异化为侵蚀性能量场',
        baseHp: 600,
        baseAttack: 55,
        baseDefense: 25,
        attackInterval: 1400,
        skills: [
            { type: 'stun', chance: 0.25, duration: 1500, description: '25%打断唤灵人1.5秒' },
            { type: 'absorb', starType: 'fire', ratio: 0.3, healRate: 0.5, description: '吸收30%火灵星回血' }
        ],
        mechanics: {},
        drops: { gold: [100, 200], exp: 100 },
        unlockScore: 1200
    },

    shadow_demon: {
        id: 'shadow_demon',
        name: '剑意邪灵',
        rarity: 'SSR',
        emoji: '⚡',
        description: '被污染的剑意之灵，锋芒逆转成对自身周围的反噬',
        baseHp: 400,
        baseAttack: 70,
        baseDefense: 5,
        attackInterval: 1000,
        skills: [
            { type: 'dodge', chance: 0.4, description: '40%闪避攻击' },
            { type: 'doubleAtk', chance: 0.25, description: '25%概率连灵' }
        ],
        mechanics: {},
        drops: { gold: [100, 180], exp: 90 },
        unlockScore: 1400
    },

    fallenAngel: {
        id: 'fallenAngel',
        name: '鎏金邪灵',
        rarity: 'SSR',
        emoji: '👑',
        description: '被污染的鎏金器灵，紊乱能量以耀目金辉伪装自身',
        baseHp: 500,
        baseAttack: 50,
        baseDefense: 15,
        attackInterval: 1800,
        skills: [
            { type: 'stun', chance: 0.2, duration: 1200, description: '20%打断唤灵人1.2秒' },
            { type: 'absorb', starType: 'ice', ratio: 0.25, healRate: 0.4, description: '吸收25%水灵星回血' }
        ],
        mechanics: {},
        drops: { gold: [100, 200], exp: 100 },
        unlockScore: 1200
    },

    // ==================== UR级古灵（多技能+复杂机制） ====================
    ancient_dragon: {
        id: 'ancient_dragon',
        name: '龙纹鼎邪灵',
        rarity: 'UR',
        emoji: '🔥',
        description: '被污染的龙纹鼎之灵，紊乱能量在铭文间层层叠加暴烈释放',
        baseHp: 800,
        baseAttack: 80,
        baseDefense: 35,
        attackInterval: 1200,
        skills: [
            { type: 'stun', chance: 0.25, duration: 2000, description: '25%打断唤灵人2秒' },
            { type: 'rage', hpThreshold: 0.5, attackBonus: 1.5, description: '灵核活性低于50%冲击+50%' },
            { type: 'armor', reduction: 0.2, description: '灵场强化：减轻20%灵光冲击' }
        ],
        mechanics: {},
        drops: { gold: [150, 300], exp: 150 },
        unlockScore: 1600
    },

    void_creature: {
        id: 'void_creature',
        name: '灵脉裂片',
        rarity: 'UR',
        emoji: '🔮',
        description: '被污染的灵在灵脉中留下的残缺印记，侵入了不属它的灵域',
        baseHp: 700,
        baseAttack: 100,
        baseDefense: 0,
        attackInterval: 1000,
        skills: [
            { type: 'dodge', chance: 0.3, description: '30%闪避攻击' },
            { type: 'reflect', ratio: 0.3, description: '反弹30%冲击' },
            { type: 'absorb', starType: 'all', ratio: 0.2, healRate: 1.0, description: '吸收20%所有星星' }
        ],
        mechanics: { ignoreDefense: true },
        drops: { gold: [200, 400], exp: 200 },
        unlockScore: 1800
    },

    // ==================== Boss古灵 ====================
    slime_king: {
        id: 'slime_king',
        name: '聚合邪灵·瓷',
        rarity: 'SR',
        emoji: '🏺',
        description: '多片被污染的瓷灵碎片重新聚合而成的更大紊乱能量体。灵核活性降至一半时会再次崩散',
        baseHp: 800,
        baseAttack: 30,
        baseDefense: 10,
        attackInterval: 2500,
        skills: [
            { type: 'split', hpThreshold: 0.5, splitInto: 'slime', count: 3, description: '灵核活性50%时分裂成3只锈灵碎片' },
            { type: 'poison_split', hpThreshold: 0.7, damage: 20, poisonDuration: 5, poisonDamage: 8, puddleCount: 3, puddleRadius: 65, description: '溅射瓷碎片形成危险区域' }
        ],
        mechanics: { isBoss: true, bossPhase: 1 },
        drops: { gold: 100, exp: 80, materials: ['iceCrystal'], materialChance: 1.0 },
        unlockScore: 200
    },

    goblin_king: {
        id: 'goblin_king',
        name: '统领邪灵·戈',
        rarity: 'SR',
        emoji: '⚔️',
        description: '被污染戈戟群灵中最强的一缕，紊乱能量高度集中于其身，能召唤更多戈魂邪灵',
        baseHp: 1200,
        baseAttack: 50,
        baseDefense: 20,
        attackInterval: 2000,
        skills: [
            { type: 'summon', interval: 12000, monster: 'goblin', count: 2, description: '每12秒召唤2只戈魂' },
            { type: 'absorb', starType: 'ice', ratio: 0.2, healRate: 1.0, description: '吸收20%水灵星回血' }
        ],
        mechanics: { isBoss: true, bossPhase: 2 },
        drops: { gold: 150, exp: 120, materials: ['fireSource'], materialChance: 1.0 },
        unlockScore: 500
    },

    flame_lord: {
        id: 'flame_lord',
        name: '烈焰鼎邪灵',
        rarity: 'SSR',
        emoji: '🔥',
        description: '被火灵光污染的鼎灵，紊乱能量以高温形态疯狂释放',
        baseHp: 2000,
        baseAttack: 80,
        baseDefense: 30,
        attackInterval: 1800,
        skills: [
            { type: 'stun', chance: 0.2, duration: 1500, description: '20%打断唤灵人' },
            { type: 'absorb', starType: 'fire', ratio: 0.5, healRate: 0.8, description: '吸收50%火灵星回血' },
            { type: 'rage', hpThreshold: 0.3, attackBonus: 2.0, description: '灵核活性低于30%冲击翻倍' }
        ],
        mechanics: { isBoss: true, bossPhase: 3 },
        drops: { gold: 250, exp: 200, materials: ['fireSource', 'critFireSource'], materialChance: 0.8 },
        unlockScore: 800
    },

    ice_queen: {
        id: 'ice_queen',
        name: '冰裂瓷邪灵',
        rarity: 'SSR',
        emoji: '❄️',
        description: '被水灵光污染的冰裂纹瓷器之灵，紊乱能量冻结周遭的灵场',
        baseHp: 1800,
        baseAttack: 70,
        baseDefense: 40,
        attackInterval: 2000,
        skills: [
            { type: 'stun', chance: 0.25, duration: 2000, description: '25%打断唤灵人' },
            { type: 'absorb', starType: 'ice', ratio: 0.5, healRate: 0.8, description: '吸收50%水灵星回血' },
            { type: 'shield', interval: 8000, amount: 100, description: '每8秒获得冰瓷护盾' }
        ],
        mechanics: { isBoss: true, bossPhase: 4 },
        drops: { gold: 300, exp: 250, materials: ['iceCrystal', 'critCrystal'], materialChance: 0.8 },
        unlockScore: 1000
    },

    thunder_dragon: {
        id: 'thunder_dragon',
        name: '雷击剑邪灵',
        rarity: 'SSR',
        emoji: '⚡',
        description: '被金灵光污染的剑之灵，紊乱能量以高频暴发的形态反复轰击',
        baseHp: 3000,
        baseAttack: 100,
        baseDefense: 35,
        attackInterval: 1500,
        skills: [
            { type: 'stun', chance: 0.25, duration: 1500, description: '25%打断唤灵人' },
            { type: 'doubleAtk', chance: 0.3, description: '30%连灵' },
            { type: 'absorb', starType: 'lightning', ratio: 0.4, healRate: 1.0, description: '吸收40%金灵星' }
        ],
        mechanics: { isBoss: true, bossPhase: 5 },
        drops: { gold: 400, exp: 350, materials: ['critCrystal', 'critFireSource'], materialChance: 0.6 },
        unlockScore: 1200
    },

    void_emperor: {
        id: 'void_emperor',
        name: '灵脉邪灵',
        rarity: 'UR',
        emoji: '🔮',
        description: '灵脉超载中产生的高度凝缩紊乱能量聚合体——它没有本体，只有紊乱的结构本身',
        baseHp: 5000,
        baseAttack: 150,
        baseDefense: 50,
        attackInterval: 1200,
        skills: [
            { type: 'stun', chance: 0.25, duration: 2000, description: '25%打断唤灵人' },
            { type: 'absorb', starType: 'all', ratio: 0.3, healRate: 0.5, description: '吸收30%所有星星' },
            { type: 'summon', interval: 15000, monster: 'void_creature', count: 1, description: '每15秒召唤灵脉裂片' },
            { type: 'dodge', chance: 0.25, description: '25%闪避' }
        ],
        mechanics: { isBoss: true, bossPhase: 6, ignoreDefense: true },
        drops: { gold: 600, exp: 500, materials: ['critCrystal', 'critFireSource'], materialChance: 0.8 },
        unlockScore: 1500
    },

    chaos_lord: {
        id: 'chaos_lord',
        name: '古器邪灵',
        rarity: 'UR',
        emoji: '🔻',
        description: '一件被严重污染的古器物之灵，紊乱能量已深入意义核心——不是恶，是彻底的失控',
        baseHp: 8000,
        baseAttack: 200,
        baseDefense: 60,
        attackInterval: 1000,
        skills: [
            { type: 'stun', chance: 0.25, duration: 2500, description: '25%打断唤灵人' },
            { type: 'rage', hpThreshold: 0.5, attackBonus: 1.8, description: '灵核活性50%以下冲击+80%' },
            { type: 'reflect', ratio: 0.4, description: '灵能反射：反弹40%灵光冲击' },
            { type: 'armor', reduction: 0.3, description: '灵场强化：减轻30%灵光冲击' }
        ],
        mechanics: { isBoss: true, bossPhase: 7 },
        drops: { gold: 1000, exp: 800, materials: ['critCrystal', 'critFireSource', 'timeCrystal'], materialChance: 0.5 },
        unlockScore: 1800
    },

    abyss_lord: {
        id: 'abyss_lord',
        name: '渊默邪灵',
        rarity: 'UR',
        emoji: '🌀',
        description: '灵域深处最古老的被污染灵——它的紊乱已持续数千年，安静但深不可测',
        baseHp: 15000,
        baseAttack: 300,
        baseDefense: 80,
        attackInterval: 800,
        skills: [
            { type: 'stun', chance: 0.25, duration: 3000, description: '25%打断唤灵人3秒' },
            { type: 'absorb', starType: 'all', ratio: 0.5, healRate: 0.5, description: '吸收50%所有星星' },
            { type: 'summon', interval: 10000, monster: 'demon', count: 2, description: '每10秒召唤狂草灵' },
            { type: 'rage', hpThreshold: 0.3, attackBonus: 2.0, description: '灵核活性30%以下冲击翻倍' },
            { type: 'armor', reduction: 0.4, description: '减伤40%' }
        ],
        mechanics: { isBoss: true, bossPhase: 8, finalBoss: true },
        drops: { gold: 2000, exp: 1500, materials: ['critCrystal', 'critFireSource', 'timeCrystal'], materialChance: 1.0 },
        unlockScore: 2000
    },

    // ==================== 终极Boss（已中国化，保留） ====================
    star_god: {
        id: 'star_god',
        name: '万灵聚合体',
        rarity: 'UR',
        emoji: '🌟',
        description: '灵脉中所有残余被污染灵能的共振聚合——它不是一个灵，是所有紊乱的回音',
        baseHp: 20000,
        baseAttack: 250,
        baseDefense: 70,
        attackInterval: 800,
        skills: [
            { type: 'stun', chance: 0.25, duration: 2500, description: '25%打断唤灵人' },
            { type: 'absorb', starType: 'all', ratio: 0.5, healRate: 1.0, description: '吸收50%所有星星回血' },
            { type: 'rage', hpThreshold: 0.3, attackBonus: 2.5, description: '灵核活性30%以下冲击+150%' },
            { type: 'reflect', ratio: 0.3, description: '反弹30%冲击' }
        ],
        mechanics: { isBoss: true, bossPhase: 9, finalBoss: true },
        drops: { gold: 3000, exp: 2000, materials: ['critCrystal', 'critFireSource', 'timeCrystal'], materialChance: 1.0 },
        unlockScore: 2500
    },

    // ==================== 特殊机制Boss（已中国化，保留） ====================
    star_devourer: {
        id: 'star_devourer',
        name: '灵脉吞噬者',
        rarity: 'UR',
        emoji: '🌀',
        description: '灵脉中紊乱能量凝结的反向涡流——没有意识，但像漩涡一样吞噬靠近的灵能',
        baseHp: 6000,
        baseAttack: 120,
        baseDefense: 40,
        attackInterval: 1500,
        skills: [
            { type: 'stun', chance: 0.15, duration: 1500, description: '15%打断唤灵人' },
            { type: 'absorb', starType: 'all', ratio: 0.2, healRate: 0.5, description: '吸收20%所有星星' }
        ],
        mechanics: {
            isBoss: true,
            bossPhase: 6,
            hasStarSummon: true,
            starSummonFirst: 3,
            starSummonRepeat: 6
        },
        drops: {
            gold: [800, 1200],
            exp: [600, 800],
            equipment: ['devourer_blade', 'void_armor', 'abyss_pendant', 'devourer_crown'],
            equipmentChance: 0.0025,
            skill: ['skill_void_hide', 'skill_star_devour', 'skill_shadow_evasion', 'skill_void_power'],
            skillChance: 0.01,
            pet: ['pet_void_sprite', 'pet_star_devourer_cub', 'pet_phantom_hunter'],
            petChance: 0.01,
            materials: ['critCrystal', 'critFireSource'],
            materialChance: 0.5,
            devourerResidue: [3, 10]
        },
        unlockScore: 1400
    },

    // ==================== 偷星者/窃灵者（特殊怪物，已中国化，保留） ====================
    star_thief: {
        id: 'star_thief',
        name: '窃灵者',
        rarity: 'SSR',
        emoji: '🌑',
        description: '窃取器灵之力，将灵光化为己用的神秘存在',
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

// 古灵稀有度权重（用于随机生成）
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

// 古灵成长系数
const MonsterGrowth = {
    hpPerLevel: 1.15,
    attackPerLevel: 1.10,
    defensePerLevel: 1.05
};

// Boss列表配置
const BOSS_LIST = [
    {
        id: 'slime_king',
        name: '聚合邪灵·瓷',
        emoji: '🏺',
        level: 1,
        hp: 2000,
        attack: 5,
        attackInterval: 2000,
        skills: [
            { type: 'split', hpThreshold: 0.5, splitInto: 'slime', count: 3, description: '灵核活性50%时分裂成3只锈灵碎片' },
            { type: 'poison_split', hpThreshold: 0.7, damage: 20, poisonDuration: 5, poisonDamage: 8, puddleCount: 3, puddleRadius: 65, description: '溅射瓷碎片形成危险区域' }
        ],
        description: '入门级邪灵，被污染的碎瓷灵能聚合体',
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
        name: '烈焰鼎邪灵',
        emoji: '🔥',
        level: 5,
        hp: 4000,
        attack: 10,
        attackInterval: 1800,
        description: '被火灵光污染的中型邪灵',
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
        name: '冰裂瓷邪灵',
        emoji: '❄️',
        level: 10,
        hp: 8000,
        attack: 15,
        attackInterval: 1500,
        description: '被水灵光污染的高级邪灵',
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
        name: '雷击剑邪灵',
        emoji: '⚡',
        level: 20,
        hp: 20000,
        attack: 25,
        attackInterval: 1200,
        description: '被金灵光污染的精英邪灵',
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
        name: '灵脉邪灵',
        emoji: '🔮',
        level: 30,
        hp: 40000,
        attack: 40,
        attackInterval: 1000,
        description: '灵脉紊乱产生的聚合邪灵',
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
        name: '万灵聚合体',
        emoji: '🌟',
        level: 50,
        hp: 100000,
        attack: 60,
        attackInterval: 800,
        description: '灵域中所有紊乱能量共振的统合产物',
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

// 古灵配置 - 使用统一古灵系统（MonsterTypes 通过 Monsters 引用自动获取新名称）
const MonsterTypes = {
    tutorial_jp: {
        id: 'tutorial_jp',
        name: Monsters.tutorial_jp.name,
        emoji: Monsters.tutorial_jp.emoji,
        baseHp: Monsters.tutorial_jp.baseHp,
        timeReward: 0,
        rarity: Monsters.tutorial_jp.rarity,
        skills: Monsters.tutorial_jp.skills,
        imageAssetId: 'char_archerPortrait'
    },
    dust: {
        id: 'dust',
        name: Monsters.dust.name,
        emoji: Monsters.dust.emoji,
        baseHp: Monsters.dust.baseHp,
        timeReward: 4,
        rarity: Monsters.dust.rarity,
        skills: Monsters.dust.skills
    },
    wisp: {
        id: 'wisp',
        name: Monsters.wisp.name,
        emoji: Monsters.wisp.emoji,
        baseHp: Monsters.wisp.baseHp,
        timeReward: 5,
        rarity: Monsters.wisp.rarity,
        skills: Monsters.wisp.skills
    },
    shard: {
        id: 'shard',
        name: Monsters.shard.name,
        emoji: Monsters.shard.emoji,
        baseHp: Monsters.shard.baseHp,
        timeReward: 6,
        rarity: Monsters.shard.rarity,
        skills: Monsters.shard.skills
    },
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