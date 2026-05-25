/**
 * WorldMapConfig — 大世界地图数据配置
 * 每个世界独立配置，纯数据无逻辑
 */

var WORLDS = {
    world_01: {
        worldId: 'world_01',
        name: '灵域初境',
        backgroundImage: 'assets/images/worldmap/world_01.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 215, y: 750 },
        hasTutorial: true,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'tutorial_spirits',
                type: 'tutorial',
                x: 353, y: 699,
                discoverRadius: 120,
                interactRadius: 60,
                priority: 100,
                once: true
            },
            {
                id: 'chest_01',
                type: 'chest',
                x: 422, y: 205,
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
                x: 634, y: 154,
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
                x: 1056, y: 102,
                discoverRadius: 160,
                interactRadius: 80,
                priority: 80,
                once: false,
                requireTutorial: true,
                unlockMenuId: 'tower'
            }
        ],
        triggerLines: [
            { x1: 1214, y1: 81, x2: 1293, y2: 125, targetWorld: 'world_02' }
        ]
    },
    world_02: {
        worldId: 'world_02',
        name: '冥河幽境·埃及',
        backgroundImage: 'assets/images/worldmap/world_02.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 116, y: 746 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_return',
                type: 'portal',
                x: 116, y: 746,
                discoverRadius: 120,
                interactRadius: 60,
                priority: 90,
                once: false,
                targetWorld: 'world_01',
                requireExploration: 0
            },
            {
                id: 'ferryman',
                type: 'npc',
                x: 669, y: 435,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 30,
                once: false,
                dialogue: [
                    { text: '生者啊，冥河的对岸有着不为人知的秘密。', voice: 'voLing001' },
                    { text: '想要过河？证明你的实力吧——征服那座试炼之塔，我便渡你过去。', voice: 'voLing002', stopVoice: 'voLing001' },
                    { text: '古灵们留下的试炼之塔就在北面，那是通往彼岸的唯一途径。', voice: 'voLing003', stopVoice: 'voLing002' }
                ]
            },
            {
                id: 'styx_barrier',
                type: 'barrier',
                x: 745, y: 461,
                discoverRadius: 200,
                interactRadius: 60,
                priority: 85,
                once: true,
                requireTowerClear: true,
                collisionRefs: ['styx_river'],
                hiddenEntityIds: [],
                lockedMessage: '冥河波涛汹涌，无法通行。或许摆渡人知道方法……',
                unlockMessage: '摆渡人认可你的实力，渡你过冥河！'
            },
            {
                id: 'portal_shuhan',
                type: 'portal',
                x: 1340, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_03',
                requireExploration: 0,
                lockedMessage: '通往蜀汉的传送门'
            },
            {
                id: 'portal_world05',
                type: 'portal',
                x: 660, y: 33,
                discoverRadius: 120,
                interactRadius: 60,
                priority: 90,
                once: false,
                targetWorld: 'world_05',
                requireExploration: 0
            }
        ]
    },
    // ===== 蜀汉国区域 =====
    world_03: {
        worldId: 'world_03',
        name: '蜀汉·巷弄',
        backgroundImage: 'assets/images/worldmap/world_03.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 70, y: 384 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_return_egypt',
                type: 'portal',
                x: 70, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_02',
                requireExploration: 0
            },
            {
                id: 'portal_market',
                type: 'portal',
                x: 1338, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_04',
                requireExploration: 0
            },
            {
                id: 'enemy_alley',
                type: 'enemy',
                x: 600, y: 300,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'slime',
                level: 3
            },
            {
                id: 'chest_alley',
                type: 'chest',
                x: 400, y: 500,
                discoverRadius: 60,
                interactRadius: 30,
                priority: 40,
                once: true,
                reward: { currency: 150, items: ['potion_medium'] }
            }
        ]
    },
    world_04: {
        worldId: 'world_04',
        name: '蜀汉·市集',
        backgroundImage: 'assets/images/worldmap/world_04.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 70, y: 384 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_alley',
                type: 'portal',
                x: 70, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_03',
                requireExploration: 0
            },
            {
                id: 'portal_temple',
                type: 'portal',
                x: 1338, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_05',
                requireExploration: 0
            },
            {
                id: 'npc_merchant',
                type: 'npc',
                x: 500, y: 400,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 30,
                once: false,
                dialogue: [
                    '欢迎来到蜀汉市集！这里有各种稀有宝物。',
                    '听说北面的神庙里藏着远古的秘密……',
                    '小心巷弄深处的怪物，它们可不是好惹的。'
                ]
            },
            {
                id: 'chest_market',
                type: 'chest',
                x: 900, y: 250,
                discoverRadius: 60,
                interactRadius: 30,
                priority: 40,
                once: true,
                reward: { currency: 200, items: ['potion_large'] }
            }
        ]
    },
    world_05: {
        worldId: 'world_05',
        name: '蜀汉·神庙',
        backgroundImage: 'assets/images/worldmap/world_05.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 1270, y: 734 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_market',
                type: 'portal',
                x: 70, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_04',
                requireExploration: 0
            },
            {
                id: 'portal_secret',
                type: 'portal',
                x: 1338, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_06',
                requireExploration: 0.5,
                lockedMessage: '神庙深处似乎隐藏着什么，探索更多再说……'
            },
            {
                id: 'tower_temple',
                type: 'tower',
                x: 700, y: 200,
                discoverRadius: 160,
                interactRadius: 80,
                priority: 80,
                once: false,
                unlockMenuId: 'tower'
            },
            {
                id: 'enemy_temple',
                type: 'enemy',
                x: 1000, y: 500,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'skeleton',
                level: 5
            },
            {
                id: 'enemy_normal',
                type: 'enemy',
                x: 846, y: 291,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'slime',
                level: 1
            },
            {
                id: 'portal_return_w02',
                type: 'portal',
                x: 1284, y: 748,
                discoverRadius: 120,
                interactRadius: 60,
                priority: 90,
                once: false,
                targetWorld: 'world_02',
                requireExploration: 0
            }
        ]
    },
    world_06: {
        worldId: 'world_06',
        name: '蜀汉·秘境',
        backgroundImage: 'assets/images/worldmap/world_06.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 70, y: 384 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_temple',
                type: 'portal',
                x: 70, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_05',
                requireExploration: 0
            },
            {
                id: 'portal_ruins',
                type: 'portal',
                x: 1338, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_07',
                requireExploration: 0
            },
            {
                id: 'enemy_secret',
                type: 'enemy',
                x: 700, y: 400,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'ghost',
                level: 6
            },
            {
                id: 'chest_secret',
                type: 'chest',
                x: 1100, y: 200,
                discoverRadius: 60,
                interactRadius: 30,
                priority: 40,
                once: true,
                reward: { currency: 300, items: ['rare_gem'] }
            }
        ]
    },
    world_07: {
        worldId: 'world_07',
        name: '蜀汉·古迹',
        backgroundImage: 'assets/images/worldmap/world_07.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 70, y: 384 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_secret',
                type: 'portal',
                x: 70, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_06',
                requireExploration: 0
            },
            {
                id: 'portal_palace',
                type: 'portal',
                x: 1338, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_08',
                requireExploration: 0.5,
                lockedMessage: '古迹深处通往皇城，需要更多探索……'
            },
            {
                id: 'npc_hermit',
                type: 'npc',
                x: 600, y: 300,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 30,
                once: false,
                dialogue: [
                    '这里是蜀汉最古老的遗迹……',
                    '传说皇城之下埋藏着无数秘密。',
                    '小心前行，无尽塔的挑战在等着你。'
                ]
            }
        ]
    },
    // ===== 蜀汉国像素俯视区域 =====
    world_08: {
        worldId: 'world_08',
        name: '蜀汉·皇城',
        backgroundImage: 'assets/images/worldmap/world_08.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 70, y: 384 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_ruins',
                type: 'portal',
                x: 70, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_07',
                requireExploration: 0
            },
            {
                id: 'portal_garden',
                type: 'portal',
                x: 1338, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_03',
                requireExploration: 0
            },
            {
                id: 'enemy_palace',
                type: 'enemy',
                x: 700, y: 300,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'guard',
                level: 7
            },
            {
                id: 'chest_palace',
                type: 'chest',
                x: 1000, y: 500,
                discoverRadius: 60,
                interactRadius: 30,
                priority: 40,
                once: true,
                reward: { currency: 400, items: ['royal_seal'] }
            }
        ]
    },
    world_09: {
        worldId: 'world_09',
        name: '蜀汉·后庭',
        backgroundImage: 'assets/images/worldmap/world_09.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 70, y: 384 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_palace',
                type: 'portal',
                x: 70, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_08',
                requireExploration: 0
            },
            {
                id: 'portal_tunnel',
                type: 'portal',
                x: 1338, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_10',
                requireExploration: 0
            },
            {
                id: 'npc_maiden',
                type: 'npc',
                x: 500, y: 400,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 30,
                once: false,
                dialogue: [
                    '后庭花团锦簇，是个清静的好去处。',
                    '密道就藏在花丛之后，只有有心人才能发现。',
                    '穿过密道，就能到达蜀汉的黄昏之地……'
                ]
            }
        ]
    },
    world_10: {
        worldId: 'world_10',
        name: '蜀汉·密道',
        backgroundImage: 'assets/images/worldmap/world_10.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 70, y: 384 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_garden',
                type: 'portal',
                x: 70, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_03',
                requireExploration: 0
            },
            {
                id: 'portal_dusk',
                type: 'portal',
                x: 1338, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_11',
                requireExploration: 0.5,
                lockedMessage: '密道尽头似乎通向某个特殊的地方……'
            },
            {
                id: 'enemy_tunnel',
                type: 'enemy',
                x: 700, y: 384,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'shadow',
                level: 8
            },
            {
                id: 'tower_tunnel',
                type: 'tower',
                x: 400, y: 200,
                discoverRadius: 160,
                interactRadius: 80,
                priority: 80,
                once: false,
                unlockMenuId: 'tower'
            }
        ]
    },
    // ===== 蜀汉国大地图 =====
    world_11: {
        worldId: 'world_11',
        name: '蜀汉·暮色',
        backgroundImage: 'assets/images/worldmap/world_11.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 70, y: 384 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_tunnel',
                type: 'portal',
                x: 70, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_10',
                requireExploration: 0
            },
            {
                id: 'portal_dawn',
                type: 'portal',
                x: 1338, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_12',
                requireExploration: 0
            },
            {
                id: 'enemy_dusk',
                type: 'enemy',
                x: 700, y: 300,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'dusk_wraith',
                level: 9
            },
            {
                id: 'chest_dusk',
                type: 'chest',
                x: 1100, y: 500,
                discoverRadius: 60,
                interactRadius: 30,
                priority: 40,
                once: true,
                reward: { currency: 500, items: ['dusk_crystal'] }
            }
        ]
    },
    world_12: {
        worldId: 'world_12',
        name: '蜀汉·晨曦',
        backgroundImage: 'assets/images/worldmap/world_12.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 70, y: 384 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_dusk',
                type: 'portal',
                x: 70, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_11',
                requireExploration: 0
            },
            {
                id: 'portal_tower',
                type: 'portal',
                x: 1338, y: 384,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_13',
                requireExploration: 0.6,
                lockedMessage: '晨曦尽头是无尽之塔，需要更多准备……'
            },
            {
                id: 'npc_sage',
                type: 'npc',
                x: 700, y: 400,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 30,
                once: false,
                dialogue: [
                    '你终于来到了这里，蜀汉的晨曦之地。',
                    '前方就是传说中的无尽塔，只有最勇敢的冒险者才敢挑战。',
                    '每层塔都有强大的守护者，祝你好运！'
                ]
            },
            {
                id: 'enemy_dawn',
                type: 'enemy',
                x: 400, y: 250,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'dawn_guardian',
                level: 10
            }
        ]
    },
    // ===== 无尽塔 =====
    world_13: {
        worldId: 'world_13',
        name: '无尽塔·一层',
        backgroundImage: 'assets/images/worldmap/world_13.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 704, y: 680 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_dawn',
                type: 'portal',
                x: 704, y: 680,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_12',
                requireExploration: 0
            },
            {
                id: 'portal_floor2',
                type: 'portal',
                x: 704, y: 88,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_14',
                requireExploration: 0.8,
                lockedMessage: '击败本层守护者才能继续攀登'
            },
            {
                id: 'enemy_floor1',
                type: 'enemy',
                x: 704, y: 384,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'tower_guard_1',
                level: 11
            }
        ]
    },
    world_14: {
        worldId: 'world_14',
        name: '无尽塔·二层',
        backgroundImage: 'assets/images/worldmap/world_14.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 704, y: 680 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_floor1',
                type: 'portal',
                x: 704, y: 680,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_13',
                requireExploration: 0
            },
            {
                id: 'portal_floor3',
                type: 'portal',
                x: 704, y: 88,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_15',
                requireExploration: 0.8,
                lockedMessage: '击败本层守护者才能继续攀登'
            },
            {
                id: 'enemy_floor2',
                type: 'enemy',
                x: 500, y: 384,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'tower_guard_2',
                level: 13
            },
            {
                id: 'chest_floor2',
                type: 'chest',
                x: 900, y: 384,
                discoverRadius: 60,
                interactRadius: 30,
                priority: 40,
                once: true,
                reward: { currency: 500, items: ['tower_key'] }
            }
        ]
    },
    world_15: {
        worldId: 'world_15',
        name: '无尽塔·三层',
        backgroundImage: 'assets/images/worldmap/world_15.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 704, y: 680 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_floor2',
                type: 'portal',
                x: 704, y: 680,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_14',
                requireExploration: 0
            },
            {
                id: 'portal_floor4',
                type: 'portal',
                x: 704, y: 88,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 89,
                once: false,
                targetWorld: 'world_16',
                requireExploration: 0.8,
                lockedMessage: '击败本层守护者才能继续攀登'
            },
            {
                id: 'enemy_floor3',
                type: 'enemy',
                x: 704, y: 384,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'tower_guard_3',
                level: 15
            },
            {
                id: 'tower_floor3',
                type: 'tower',
                x: 400, y: 384,
                discoverRadius: 160,
                interactRadius: 80,
                priority: 80,
                once: false,
                unlockMenuId: 'tower'
            }
        ]
    },
    world_16: {
        worldId: 'world_16',
        name: '无尽塔·四层',
        backgroundImage: 'assets/images/worldmap/world_16.jpg',
        width: 1408,
        height: 768,
        playerStart: { x: 704, y: 680 },
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'portal_floor3',
                type: 'portal',
                x: 704, y: 680,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 90,
                once: false,
                targetWorld: 'world_15',
                requireExploration: 0
            },
            {
                id: 'enemy_boss',
                type: 'enemy',
                x: 704, y: 384,
                discoverRadius: 120,
                interactRadius: 60,
                priority: 100,
                once: false,
                respawnTime: 0,
                monster: 'tower_boss',
                level: 20
            },
            {
                id: 'chest_boss',
                type: 'chest',
                x: 704, y: 150,
                discoverRadius: 60,
                interactRadius: 30,
                priority: 40,
                once: true,
                reward: { currency: 1000, items: ['legendary_weapon'] }
            }
        ]
    },
};

function getWorldConfig(worldId) {
    return WORLDS[worldId] || null;
}

function getAllWorldIds() {
    return Object.keys(WORLDS);
}

export { WORLDS, getWorldConfig, getAllWorldIds };
