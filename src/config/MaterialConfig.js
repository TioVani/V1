/**
 * 材料配置
 * 包含所有游戏材料数据
 */

const Materials = {
    iceCrystal: {
        id: 'iceCrystal',
        name: '冰晶',
        rarity: 'R',
        description: '使用1个增加攻击力，升级5个提升冰星星等级，可从Boss获得',
        element: 'ice',
        attributes: { attack: 1 },
        emoji: '❄'
    },
    fireSource: {
        id: 'fireSource',
        name: '火源',
        rarity: 'R',
        description: '使用1个增加攻击力，升级5个提升火星星等级，2000分后Boss掉落',
        element: 'fire',
        attributes: { attack: 2 },
        emoji: '🔥'
    },
    critCrystal: {
        id: 'critCrystal',
        name: '暴击冰晶',
        rarity: 'SSR',
        description: '使用后永久增加3%暴击率',
        element: 'ice',
        attributes: { critRate: 3 },
        emoji: '💠'
    },
    critFireSource: {
        id: 'critFireSource',
        name: '爆伤火源',
        rarity: 'SSR',
        description: '使用后永久增加20%暴击伤害',
        element: 'fire',
        attributes: { critDamage: 0.2 },
        emoji: '💥'
    },
    timeCrystal: {
        id: 'timeCrystal',
        name: '时间结晶',
        rarity: 'SR',
        description: '使用后解锁时间星星，点击时间星星可获得额外时间',
        element: 'time',
        attributes: { timeBonus: 3 },
        emoji: '⏰',
        unlocksStar: 'time'
    },
    devourerResidue: {
        id: 'devourerResidue',
        name: '吞噬残辉',
        rarity: 'SSR',
        description: '器渊吞噬者残留的虚空能量，使用后永久增加5攻击力',
        element: 'void',
        attributes: { attack: 5 },
        emoji: '✨'
    },
    dragonScale: {
        id: 'dragonScale',
        name: '龙鳞',
        rarity: 'SR',
        description: '炎龙脱落的坚硬鳞片，使用后永久增加3防御力',
        element: 'fire',
        attributes: { defense: 3 },
        emoji: '🐲'
    },
    darkEssence: {
        id: 'darkEssence',
        name: '暗之精华',
        rarity: 'SR',
        description: '暗影怪物凝聚的精华，使用后永久增加4攻击力',
        element: 'dark',
        attributes: { attack: 4 },
        emoji: '🌑'
    },
    starHeart: {
        id: 'starHeart',
        name: '器灵之心',
        rarity: 'SSR',
        description: '蕴含器灵之力的心脏，使用后永久增加8攻击力',
        element: 'star',
        attributes: { attack: 8 },
        emoji: '💎'
    }
};

export { Materials };
