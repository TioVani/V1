/**
 * 净化关卡配置
 * 包含净化关卡和章节数据
 */

const STAGES = {
    stage_1_1: {
        id: 'stage_1_1', chapter: 1, name: '触碰·灵域唤醒', difficulty: 'easy',
        description: '击败3只锈灵碎片，迈出唤灵人的第一步',
        settings: { time: 60, monsterTypes: ['slime'], monsterCount: 3, hpMultiplier: 0.8 },
        starConditions: [
            { type: 'monster', target: 3, description: '净化3只邪灵' },
            { type: 'score', target: 30, description: '灵辉值达到30' },
            { type: 'time', target: 30, description: '剩余30秒以上' }
        ],
        rewards: {
            1: { gold: 30 },
            2: { exp: 20 },
            3: { gold: 50, material: { id: 'iceCrystal', count: 1 } }
        },
        unlockCondition: null
    },
    stage_1_2: {
        id: 'stage_1_2', chapter: 1, name: '羁绊之触·初连', difficulty: 'easy',
        description: '学习连灵技巧，达成10连灵',
        settings: { time: 60, monsterTypes: ['slime', 'goblin'], monsterCount: 5, hpMultiplier: 0.9 },
        starConditions: [
            { type: 'score', target: 80, description: '灵辉值达到80' },
            { type: 'combo', target: 10, description: '达成10连灵' },
            { type: 'time', target: 15, description: '剩余15秒以上' }
        ],
        rewards: {
            1: { gold: 40 },
            2: { exp: 30 },
            3: { gold: 60, material: { id: 'iceCrystal', count: 1 } }
        },
        unlockCondition: { stageId: 'stage_1_1', minStars: 1 }
    },
    stage_1_3: {
        id: 'stage_1_3', chapter: 1, name: '首次净化', difficulty: 'normal',
        description: '面对你的第一只被污染古灵——聚合邪灵·瓷',
        settings: { time: 90, monsterTypes: ['slime', 'goblin'], monsterCount: 5, bossType: 'boss', hpMultiplier: 1.0 },
        starConditions: [
            { type: 'score', target: 150, description: '灵辉值达到150' },
            { type: 'boss', target: 1, description: '净化守护灵' },
            { type: 'hp', target: 50, description: '灵核活性50以上' }
        ],
        rewards: {
            1: { gold: 60 },
            2: { exp: 50 },
            3: { gold: 100, material: { id: 'iceCrystal', count: 2 } }
        },
        unlockCondition: { stageId: 'stage_1_2', minStars: 1 }
    },
    stage_2_1: {
        id: 'stage_2_1', chapter: 2, name: '水灵光·共鸣', difficulty: 'normal',
        description: '水行灵光在灵域中苏醒，触碰即是回应',
        settings: { time: 75, monsterTypes: ['slime', 'goblin', 'wolf'], monsterCount: 6, hpMultiplier: 1.0 },
        starConditions: [
            { type: 'score', target: 200, description: '灵辉值达到200' },
            { type: 'perfect', target: 5, description: '达成5次灵光合拍' },
            { type: 'time', target: 20, description: '剩余20秒以上' }
        ],
        rewards: {
            1: { gold: 80 },
            2: { exp: 60 },
            3: { gold: 120, material: { id: 'critCrystal', count: 1 } }
        },
        unlockCondition: { stageId: 'stage_1_3', minStars: 1 }
    },
    stage_2_2: {
        id: 'stage_2_2', chapter: 2, name: '火灵光·试炼', difficulty: 'normal',
        description: '火焰笼罩的战场——紊乱能量以高温形态释放',
        settings: { time: 80, monsterTypes: ['goblin', 'wolf', 'skeleton'], monsterCount: 8, bossType: 'goblin_king', hpMultiplier: 1.1 },
        starConditions: [
            { type: 'score', target: 250, description: '灵辉值达到250' },
            { type: 'boss', target: 1, description: '净化守护灵' },
            { type: 'noDamage', target: 0, description: '不受紊乱冲击' }
        ],
        rewards: {
            1: { gold: 100 },
            2: { exp: 80 },
            3: { gold: 150, material: { id: 'fireSource', count: 2 } }
        },
        unlockCondition: { stageId: 'stage_2_1', minStars: 1 }
    },
    stage_2_3: {
        id: 'stage_2_3', chapter: 2, name: '冰火灵光·交织', difficulty: 'hard',
        description: '冰火灵光在战场上相互激荡，秩序与紊乱在此刻对峙',
        settings: { time: 90, monsterTypes: ['wolf', 'skeleton', 'demon'], monsterCount: 10, bossType: 'flame_lord', hpMultiplier: 1.2 },
        starConditions: [
            { type: 'score', target: 400, description: '灵辉值达到400' },
            { type: 'combo', target: 30, description: '达成30连灵' },
            { type: 'hp', target: 70, description: '灵核活性在70%以上' }
        ],
        rewards: {
            1: { gold: 150 },
            2: { exp: 120 },
            3: { gold: 200, material: { id: 'dragonScale', count: 1 } }
        },
        unlockCondition: { stageId: 'stage_2_2', minStars: 2 }
    },
    stage_3_1: {
        id: 'stage_3_1', chapter: 3, name: '灵脉·深潜', difficulty: 'hard',
        description: '灵脉深处传来紊乱的回响——踏入被污染的古灵领域',
        settings: { time: 100, monsterTypes: ['skeleton', 'demon', 'fallenAngel'], monsterCount: 12, hpMultiplier: 1.3 },
        starConditions: [
            { type: 'score', target: 500, description: '灵辉值达到500' },
            { type: 'monster', target: 12, description: '净化全部邪灵' },
            { type: 'hp', target: 70, description: '灵核活性70以上' }
        ],
        rewards: {
            1: { gold: 200 },
            2: { exp: 160 },
            3: { gold: 300, material: { id: 'darkEssence', count: 2 } }
        },
        unlockCondition: { stageId: 'stage_2_3', minStars: 1 }
    },
    stage_3_2: {
        id: 'stage_3_2', chapter: 3, name: '灵脉·守护灵净化', difficulty: 'hell',
        description: '灵脉深处的守护灵——被严重污染的灵脉邪灵等待着净化',
        settings: { time: 120, monsterTypes: ['demon', 'fallenAngel'], monsterCount: 8, bossType: 'void_emperor', hpMultiplier: 1.5 },
        starConditions: [
            { type: 'score', target: 800, description: '灵辉值达到800' },
            { type: 'boss', target: 1, description: '净化守护灵' },
            { type: 'noDamage', target: 0, description: '不受紊乱冲击' }
        ],
        rewards: {
            1: { gold: 300 },
            2: { exp: 240 },
            3: { gold: 500, material: { id: 'starHeart', count: 1 } }
        },
        unlockCondition: { stageId: 'stage_3_1', minStars: 2 }
    },
    stage_3_3: {
        id: 'stage_3_3', chapter: 3, name: '灵脉·源头净化', difficulty: 'nightmare',
        description: '灵脉紊乱的源头——灵脉吞噬者在深处等待着最终的净化',
        settings: { time: 150, monsterTypes: ['fallenAngel', 'demon'], monsterCount: 15, bossType: 'star_devourer', hpMultiplier: 2.0 },
        starConditions: [
            { type: 'score', target: 1500, description: '灵辉值达到1500' },
            { type: 'combo', target: 50, description: '达成50连灵' },
            { type: 'time', target: 30, description: '剩余30秒以上' }
        ],
        rewards: {
            1: { gold: 500 },
            2: { exp: 400 },
            3: { gold: 800, material: { id: 'starHeart', count: 2 } }
        },
        unlockCondition: { stageId: 'stage_3_2', minStars: 2 }
    }
};

// 章节配置
const CHAPTERS = {
    1: { id: 1, name: '灵域入门', description: '触碰第一道灵光，迈出唤灵人的第一步', stages: ['stage_1_1', 'stage_1_2', 'stage_1_3'] },
    2: { id: 2, name: '灵光觉醒', description: '水行与火行灵光在灵域中苏醒', stages: ['stage_2_1', 'stage_2_2', 'stage_2_3'] },
    3: { id: 3, name: '灵脉深处', description: '深入灵脉，直面紊乱的源头', stages: ['stage_3_1', 'stage_3_2', 'stage_3_3'] }
};

export { STAGES, CHAPTERS };
