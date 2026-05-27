/**
 * WorldMapConfig — 大世界地图数据配置
 * 每个世界独立配置，纯数据无逻辑
 * 传送点数据已迁移至 TeleportConfig.js，此处不再内联
 */
import { buildTransferDataForWorld } from './TeleportConfig.js';

var WORLDS = {
    world_01: {
        worldId: 'world_01',
        name: '灵域初境',
        backgroundImage: 'assets/images/worldmap/world_01.jpg',
        width: 1408,
        height: 768,
        hasTutorial: true,
        entryCutscene: null,
        collisionMaskData: 'world_01_F01',
        transparencyMaskData: 'world_01_T01',
        collisions: [],
        floors: [
            { id: 1, collisionMaskData: 'world_01_F01', transparencyMaskData: 'world_01_T01', backgroundImage: 'assets/images/worldmap/world_01.jpg' },
            { id: 2, collisionMaskData: 'world_01_F02', transparencyMaskData: 'world_01_T02', backgroundImage: 'assets/images/worldmap/world_01.jpg' }
        ],
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
                id: 'E01_enemy_01',
                name: '灵域小黏',
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
                id: 'chest_world01_normal',
                type: 'chest',
                x: 1229, y: 745,
                discoverRadius: 60,
                interactRadius: 30,
                priority: 40,
                once: true,
                requireTutorial: true,
                chestType: 'normal',
                reward: { spiritStones: 5, characterExp: 15, currency: 50, equipmentRarityRange: ['N', 'R'], equipmentCount: 1 }
            },
            ],
        triggerLines: [] // 由 TeleportConfig 注入
    },
    world_02: {
        worldId: 'world_02',
        name: '蜀汉城·居民小巷',
        backgroundImage: 'assets/images/worldmap/world_02.jpg',
        width: 1408,
        height: 768,
        hasTutorial: false,
        entryCutscene: null,
        collisionMaskData: 'world_02_F01',
        transparencyMaskData: 'world_02_T01',
        collisions: [],
        entities: [
            ],
        triggerLines: []
    },
    // ===== 蜀汉国区域 =====
    world_03: {
        worldId: 'world_03',
        name: '蜀汉·巷弄',
        backgroundImage: 'assets/images/worldmap/world_03.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'E02_enemy_alley',
                name: '巷弄黏怪',
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
        ],
        triggerLines: []
    },
    world_04: {
        worldId: 'world_04',
        name: '蜀汉·市集',
        backgroundImage: 'assets/images/worldmap/world_04.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
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
        ],
        triggerLines: []
    },
    world_05: {
        worldId: 'world_05',
        name: '蜀汉·神庙',
        backgroundImage: 'assets/images/worldmap/world_05.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisionMaskData: 'world_05_F01',
        transparencyMaskData: 'world_05_T01',
        collisions: [],
        entities: [
            {
                id: 'E03_enemy_normal',
                name: '神庙幼灵',
                type: 'enemy',
                x: 846, y: 291,
                discoverRadius: 100,
                interactRadius: 50,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'slime',
                level: 1
            }
        ],
        triggerLines: []
    },
    world_06: {
        worldId: 'world_06',
        name: '蜀汉·秘境',
        backgroundImage: 'assets/images/worldmap/world_06.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'E04_enemy_secret',
                name: '秘境幽魂',
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
        ],
        triggerLines: []
    },
    world_07: {
        worldId: 'world_07',
        name: '蜀汉·古迹',
        backgroundImage: 'assets/images/worldmap/world_07.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
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
        ],
        triggerLines: []
    },
    // ===== 蜀汉国像素俯视区域 =====
    world_08: {
        worldId: 'world_08',
        name: '蜀汉·皇城',
        backgroundImage: 'assets/images/worldmap/world_08.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'E05_enemy_palace',
                name: '皇城守卫',
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
        ],
        triggerLines: []
    },
    world_09: {
        worldId: 'world_09',
        name: '蜀汉·后庭',
        backgroundImage: 'assets/images/worldmap/world_09.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
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
        ],
        triggerLines: []
    },
    world_10: {
        worldId: 'world_10',
        name: '蜀汉·密道',
        backgroundImage: 'assets/images/worldmap/world_10.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'E06_enemy_tunnel',
                name: '密道暗影',
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
                x: 705, y: 410,
                discoverRadius: 160,
                interactRadius: 80,
                priority: 80,
                once: false,
                unlockMenuId: 'tower'
            }
        ],
        triggerLines: []
    },
    // ===== 蜀汉国大地图 =====
    world_11: {
        worldId: 'world_11',
        name: '蜀汉·暮色',
        backgroundImage: 'assets/images/worldmap/world_11.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'E07_enemy_dusk',
                name: '暮色怨灵',
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
        ],
        triggerLines: []
    },
    world_12: {
        worldId: 'world_12',
        name: '蜀汉·晨曦',
        backgroundImage: 'assets/images/worldmap/world_12.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
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
                id: 'E08_enemy_dawn',
                name: '晨曦守卫',
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
        ],
        triggerLines: []
    },
    // ===== 无尽塔 =====
    world_13: {
        worldId: 'world_13',
        name: '无尽塔·一层',
        backgroundImage: 'assets/images/worldmap/world_13.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'E09_enemy_floor1',
                name: '塔层守卫·壹',
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
        ],
        triggerLines: []
    },
    world_14: {
        worldId: 'world_14',
        name: '无尽塔·二层',
        backgroundImage: 'assets/images/worldmap/world_14.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'E10_enemy_floor2',
                name: '塔层守卫·贰',
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
        ],
        triggerLines: []
    },
    world_15: {
        worldId: 'world_15',
        name: '无尽塔·三层',
        backgroundImage: 'assets/images/worldmap/world_15.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'E11_enemy_floor3',
                name: '塔层守卫·叁',
                type: 'enemy',
                x: 704, y: 384,
                discoverRadius: 80,
                interactRadius: 40,
                priority: 60,
                once: false,
                respawnTime: 0,
                monster: 'tower_guard_3',
                level: 15
            }
        ],
        triggerLines: []
    },
    world_16: {
        worldId: 'world_16',
        name: '无尽塔·四层',
        backgroundImage: 'assets/images/worldmap/world_16.jpg',
        width: 1408,
        height: 768,
                hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'E12_enemy_boss',
                name: '塔主·幽冥之王',
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
        ],
        triggerLines: []
    },
    // ===== 赛博埃及·冥境 =====
    world_17: {
        worldId: 'world_17',
        name: '赛博埃及·冥境',
        backgroundImage: 'assets/images/worldmap/cyber_egypt_nether_1_20260526_110114.png',
        width: 1408,
        height: 768,
        hasTutorial: false,
        entryCutscene: null,
        collisions: [],
        entities: [
            {
                id: 'ferryman',
                name: '摆渡人',
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
            }
        ],
        triggerLines: []
    },
};

// 从 TeleportConfig 注入传送数据到每个世界
function _injectTransferData() {
    var worldIds = Object.keys(WORLDS);
    for (var i = 0; i < worldIds.length; i++) {
        var wid = worldIds[i];
        var world = WORLDS[wid];
        var data = buildTransferDataForWorld(wid);
        // 注入 playerStart（出生点）
        if (data.playerStart) {
            world.playerStart = data.playerStart;
        }
        // 合并传送 entity 到已有 entities
        if (data.entities.length > 0) {
            world.entities = world.entities.concat(data.entities);
        }
        // 合并 triggerLines（原有为空数组，直接赋值）
        if (data.triggerLines.length > 0) {
            world.triggerLines = data.triggerLines;
        }
    }
}
_injectTransferData();

function getWorldConfig(worldId) {
    return WORLDS[worldId] || null;
}

function getAllWorldIds() {
    return Object.keys(WORLDS);
}

export { WORLDS, getWorldConfig, getAllWorldIds };