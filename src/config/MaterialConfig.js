/**
 * 材料配置
 * 包含所有游戏材料数据
 */

const Materials = {
    iceCrystal: {
        id: 'iceCrystal',
        name: '水灵晶',
        rarity: 'R',
        description: '使用1个增强灵光冲击，集齐5个提升水灵星等级，可从古灵获得',
        element: 'water',
        attributes: { attack: 1 },
        emoji: '💧'
    },
    fireSource: {
        id: 'fireSource',
        name: '火灵源',
        rarity: 'R',
        description: '使用1个增强灵光冲击，集齐5个提升火灵星等级，2000分后古灵掉落',
        element: 'fire',
        attributes: { attack: 2 },
        emoji: '🔥'
    },
    critCrystal: {
        id: 'critCrystal',
        name: '水灵暴晶',
        rarity: 'SSR',
        description: '使用后永久提纯会心感应',
        element: 'water',
        attributes: { critRate: 3 },
        emoji: '💠'
    },
    critFireSource: {
        id: 'critFireSource',
        name: '火灵爆源',
        rarity: 'SSR',
        description: '使用后永久增强会心灵光威力',
        element: 'fire',
        attributes: { critDamage: 0.2 },
        emoji: '💥'
    },
    timeCrystal: {
        id: 'timeCrystal',
        name: '时序结晶',
        rarity: 'SR',
        description: '使用后解锁时序星，点击时序星可获得额外时间',
        element: 'time',
        attributes: { timeBonus: 3 },
        emoji: '⏰',
        unlocksStar: 'time'
    },
    devourerResidue: {
        id: 'devourerResidue',
        name: '吞噬残辉',
        rarity: 'SSR',
        description: '灵脉吞噬者残留的紊乱能量，使用后永久增强5点灵光冲击',
        element: 'void',
        attributes: { attack: 5 },
        emoji: '✨'
    },
    dragonScale: {
        id: 'dragonScale',
        name: '火麟玉',
        rarity: 'SR',
        description: '火行古灵凝结的鳞玉，使用后永久增强3点灵场护盾',
        element: 'fire',
        attributes: { defense: 3 },
        emoji: '🔶'
    },
    darkEssence: {
        id: 'darkEssence',
        name: '阴灵精华',
        rarity: 'SR',
        description: '阴行古灵凝聚的精华，使用后永久增强4点灵光冲击',
        element: 'dark',
        attributes: { attack: 4 },
        emoji: '🌙'
    },
    starHeart: {
        id: 'starHeart',
        name: '器灵之心',
        rarity: 'SSR',
        description: '蕴含器灵之力的灵核，使用后永久增强8点灵光冲击',
        element: 'star',
        attributes: { attack: 8 },
        emoji: '🪨'
    }
};

export { Materials };
