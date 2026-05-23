/**
 * WorldMapConfig — 大世界地图数据配置
 * 每个世界独立配置，纯数据无逻辑
 */

var WORLDS = {
    world_01: {
        worldId: 'world_01',
        name: '灵域初境',
        width: 2000,
        height: 1500,
        playerStart: { x: 100, y: 800 },
        hasTutorial: true,
        entryCutscene: null,
        collisions: [
            { id: 'bound_top', type: 'rect', x: 0, y: -100, w: 2000, h: 100 },
            { id: 'tutorial_wall_right', type: 'rect', x: 550, y: 0, w: 30, h: 600 },
            { id: 'tutorial_wall_bottom', type: 'rect', x: 0, y: 1000, w: 600, h: 30 },
        ],
        entities: [
            {
                id: 'tutorial_spirits',
                type: 'tutorial',
                x: 400, y: 800,
                discoverRadius: 120,
                interactRadius: 60,
                priority: 100,
                once: true
            },
            {
                id: 'chest_01',
                type: 'chest',
                x: 600, y: 400,
                discoverRadius: 60,
                interactRadius: 30,
                priority: 40,
                once: true,
                requireTutorial: true,
                reward: { currency: 100, items: ['potion_small'] }
            },
            {
                id: 'enemy_01',
                type: 'enemy',
                x: 900, y: 300,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                requireTutorial: true,
                respawnTime: 0,
                monster: 'slime',
                level: 1
            },
            {
                id: 'tower',
                type: 'tower',
                x: 1500, y: 200,
                discoverRadius: 160,
                interactRadius: 80,
                priority: 80,
                once: false,
                requireTutorial: true,
                unlockMenuId: 'tower'
            },
            {
                id: 'portal',
                type: 'portal',
                x: 1800, y: 800,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                requireTutorial: true,
                targetWorld: 'world_02',
                requireExploration: 0.8,
                lockedMessage: '探索度未达标，无法传送'
            }
        ]
    },
    world_02: {
        worldId: 'world_02',
        name: '冥河幽境·埃及',
        width: 2400,
        height: 1800,
        playerStart: { x: 100, y: 900 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [
            { id: 'styx_river', type: 'rect', x: 1000, y: 0, w: 120, h: 1800 }
        ],
        entities: [
            {
                id: 'portal_return',
                type: 'portal',
                x: 200, y: 900,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_01',
                requireExploration: 0
            },
            {
                id: 'ferryman',
                type: 'npc',
                x: 950, y: 850,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 30,
                once: false,
                dialogue: [
                    '生者啊，冥河的对岸有着不为人知的秘密。',
                    '想要过河？证明你的实力吧——征服那座试炼之塔，我便渡你过去。',
                    '古灵们留下的试炼之塔就在北面，那是通往彼岸的唯一途径。'
                ]
            },
            {
                id: 'styx_barrier',
                type: 'barrier',
                x: 1060, y: 900,
                discoverRadius: 200,
                interactRadius: 60,
                priority: 85,
                once: true,
                requireTowerClear: true,
                collisionRefs: ['styx_river'],
                hiddenEntityIds: [],
                lockedMessage: '冥河波涛汹涌，无法通行。或许摆渡人知道方法……',
                unlockMessage: '摆渡人认可你的实力，渡你过冥河！'
            }
        ]
    }
};

function getWorldConfig(worldId) {
    return WORLDS[worldId] || null;
}

function getAllWorldIds() {
    return Object.keys(WORLDS);
}

export { WORLDS, getWorldConfig, getAllWorldIds };
