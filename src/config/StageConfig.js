/**
 * 闯关配置
 * 包含关卡和章节数据
 */

const STAGES = {
    stage_1_1: {
        id: 'stage_1_1', chapter: 1, name: '初次相遇', difficulty: 'easy',
        description: '击败3只史莱姆完成新手训练！',
        settings: { time: 60, monsterTypes: ['slime'], monsterCount: 3, hpMultiplier: 0.8 },
        starConditions: [
            { type: 'monster', target: 3, description: '击败3只怪物' },
            { type: 'score', target: 30, description: '得分达到30分' },
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
        id: 'stage_1_2', chapter: 1, name: '连击入门', difficulty: 'easy',
        description: '学习连击技巧，达成10连击！',
        settings: { time: 60, monsterTypes: ['slime', 'goblin'], monsterCount: 5, hpMultiplier: 0.9 },
        starConditions: [
            { type: 'score', target: 80, description: '得分达到80分' },
            { type: 'combo', target: 10, description: '达成10连击' },
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
        id: 'stage_1_3', chapter: 1, name: 'Boss初挑战', difficulty: 'normal',
        description: '你的第一个Boss战！',
        settings: { time: 90, monsterTypes: ['slime', 'goblin'], monsterCount: 5, bossType: 'boss', hpMultiplier: 1.0 },
        starConditions: [
            { type: 'score', target: 150, description: '得分达到150分' },
            { type: 'boss', target: 1, description: '击败Boss' },
            { type: 'hp', target: 50, description: '剩余血量50以上' }
        ],
        rewards: {
            1: { gold: 60 },
            2: { exp: 50 },
            3: { gold: 100, material: { id: 'iceCrystal', count: 2 } }
        },
        unlockCondition: { stageId: 'stage_1_2', minStars: 1 }
    },
    stage_2_1: {
        id: 'stage_2_1', chapter: 2, name: '冰霜之力', difficulty: 'normal',
        description: '解锁冰星星，体验冰霜之力！',
        settings: { time: 75, monsterTypes: ['slime', 'goblin', 'wolf'], monsterCount: 6, hpMultiplier: 1.0 },
        starConditions: [
            { type: 'score', target: 200, description: '得分达到200分' },
            { type: 'perfect', target: 5, description: '达成5次完美点击' },
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
        id: 'stage_2_2', chapter: 2, name: '火焰试炼', difficulty: 'normal',
        description: '火焰笼罩的战场！',
        settings: { time: 80, monsterTypes: ['goblin', 'wolf', 'skeleton'], monsterCount: 8, bossType: 'goblin_king', hpMultiplier: 1.1 },
        starConditions: [
            { type: 'score', target: 250, description: '得分达到250分' },
            { type: 'boss', target: 1, description: '击败Boss' },
            { type: 'noDamage', target: 0, description: '不受伤害' }
        ],
        rewards: {
            1: { gold: 100 },
            2: { exp: 80 },
            3: { gold: 150, material: { id: 'fireSource', count: 2 } }
        },
        unlockCondition: { stageId: 'stage_2_1', minStars: 1 }
    },
    stage_2_3: {
        id: 'stage_2_3', chapter: 2, name: '双元素大师', difficulty: 'hard',
        description: '冰火交融！',
        settings: { time: 90, monsterTypes: ['wolf', 'skeleton', 'demon'], monsterCount: 10, bossType: 'flame_lord', hpMultiplier: 1.2 },
        starConditions: [
            { type: 'score', target: 400, description: '得分达到400分' },
            { type: 'combo', target: 30, description: '达成30连击' },
            { type: 'hp', target: 70, description: '血量在70%以上' }
        ],
        rewards: {
            1: { gold: 150 },
            2: { exp: 120 },
            3: { gold: 200, material: { id: 'dragonScale', count: 1 } }
        },
        unlockCondition: { stageId: 'stage_2_2', minStars: 2 }
    },
    stage_3_1: {
        id: 'stage_3_1', chapter: 3, name: '深渊入口', difficulty: 'hard',
        description: '踏入深渊！',
        settings: { time: 100, monsterTypes: ['skeleton', 'demon', 'fallenAngel'], monsterCount: 12, hpMultiplier: 1.3 },
        starConditions: [
            { type: 'score', target: 500, description: '得分达到500分' },
            { type: 'monster', target: 12, description: '击败全部怪物' },
            { type: 'hp', target: 70, description: '剩余血量70以上' }
        ],
        rewards: {
            1: { gold: 200 },
            2: { exp: 160 },
            3: { gold: 300, material: { id: 'darkEssence', count: 2 } }
        },
        unlockCondition: { stageId: 'stage_2_3', minStars: 1 }
    },
    stage_3_2: {
        id: 'stage_3_2', chapter: 3, name: '暗影Boss战', difficulty: 'hell',
        description: '深渊的守护者！',
        settings: { time: 120, monsterTypes: ['demon', 'fallenAngel'], monsterCount: 8, bossType: 'void_emperor', hpMultiplier: 1.5 },
        starConditions: [
            { type: 'score', target: 800, description: '得分达到800分' },
            { type: 'boss', target: 1, description: '击败Boss' },
            { type: 'noDamage', target: 0, description: '不受伤害' }
        ],
        rewards: {
            1: { gold: 300 },
            2: { exp: 240 },
            3: { gold: 500, material: { id: 'starHeart', count: 1 } }
        },
        unlockCondition: { stageId: 'stage_3_1', minStars: 2 }
    },
    stage_3_3: {
        id: 'stage_3_3', chapter: 3, name: '起源之战', difficulty: 'nightmare',
        description: '最终挑战！',
        settings: { time: 150, monsterTypes: ['fallenAngel', 'demon'], monsterCount: 15, bossType: 'star_devourer', hpMultiplier: 2.0 },
        starConditions: [
            { type: 'score', target: 1500, description: '得分达到1500分' },
            { type: 'combo', target: 50, description: '达成50连击' },
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
    1: { id: 1, name: '新手启程', description: '踏上冒险的第一步', stages: ['stage_1_1', 'stage_1_2', 'stage_1_3'] },
    2: { id: 2, name: '元素觉醒', description: '掌控冰火之力', stages: ['stage_2_1', 'stage_2_2', 'stage_2_3'] },
    3: { id: 3, name: '深渊挑战', description: '直面深渊的黑暗', stages: ['stage_3_1', 'stage_3_2', 'stage_3_3'] }
};

export { STAGES, CHAPTERS };
