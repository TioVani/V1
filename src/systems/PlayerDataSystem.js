/**
 * 玩家数据加载系统 — 兼容存根
 *
 * 全部数据加载逻辑已迁移至 GameDataStore.js。
 * 本模块保留 defaultPlayerData 导出供外部参考（实际模板在 GameDataStore.js 中的 defaultSaveData）。
 * loadPlayerData 为 no-op（game.js 已改为 dataStore.load()）。
 */

function createPlayerDataSystem() {
    var defaultPlayerData = {
        id: 'player_001',
        name: '唤灵人',
        gold: 0,
        starSource: 0,
        starStones: 0,
        ownedCharacters: [],
        currentCharacterId: null,
        showCharacterDetails: false,
        characterExperience: {},
        materials: {
            iceCrystal: { quantity: 0, usedCount: 0 },
            fireSource: { quantity: 0, usedCount: 0 },
            critCrystal: { quantity: 0, usedCount: 0 },
            critFireSource: { quantity: 0, usedCount: 0 },
            timeCrystal: { quantity: 0, usedCount: 0 },
            devourerResidue: { quantity: 0, usedCount: 0 }
        },
        items: {
            healPotion: { quantity: 0 },
            timePotion: { quantity: 0 },
            expPotionSmall: { quantity: 0 },
            expPotionMedium: { quantity: 0 },
            expPotionLarge: { quantity: 0 }
        },
        usedMaterials: {},
        unlockedStarTypes: [],
        iceStarLevel: 0,
        maxIceStarLevel: 10,
        fireStarLevel: 0,
        maxFireStarLevel: 10,
        timeStarLevel: 0,
        maxTimeStarLevel: 10,
        timeCrystalUnlocked: false,
        totalMonstersKilled: 0,
        bossKillCount: 0,
        firstBossKilled: false,
        seenTips: {},
        extraCritRate: 0,
        extraCritDamage: 0,
        playerHp: 100,
        maxPlayerHp: 100,
        starMode: 'random',
        taskProgress: {
            guide: {},
            daily: {},
            achievements: {},
            lastDailyRefresh: 0,
            stats: {
                totalClicks: 0, totalGames: 0, totalPerfects: 0, totalCriticals: 0,
                totalScore: 0, maxCombo: 0, monstersKilled: 0, itemsUsed: 0,
                backpackOpened: 0, shopOpened: 0, modeSwitched: 0, rewardsClaimed: 0
            }
        },
        equipments: {
            owned: [],
            equipped: { weapon: null, armor: null, accessory: null, set: null }
        },
        skills: { owned: [], equipped: [], gachaTickets: 0 },
        pets: { owned: [], equipped: null },
        equippedStars: [],
        spaceKeyStar: null,
        normalStarEnabled: true,
        stageProgress: {},
        faithData: {
            resources: {
                devoutMark: 0, divineEssence: 0, originCrystal: 0,
                weeklyDevoutMark: 0, lastWeeklyReset: 0
            },
            characters: {},
            inheritance: {
                totalInherited: 0,
                inheritedBonus: { attack: 0, hp: 0, critRate: 0 }
            }
        },
        infiniteTower: {
            highestFloor: 0, totalClears: 0, currentFloor: 1,
            currentHp: 100, maxHp: 100,
            collectedRewards: [], exploredCells: [],
            playerX: 0, playerY: 0,
            totalKills: 0, totalTreasures: 0, totalMaterials: 0,
            isPaused: false, grid: null, blindSteps: 0
        },
        afkData: {
            lastClaimTime: 0, maxOfflineHours: 8,
            baseGoldPerMinute: 10, baseExpPerMinute: 2,
            accumulatedRewards: { gold: 0, exp: 0, materials: {}, equipments: [] },
            accumulatedHours: 0
        },
        upgradeData: { stars: {} }
    };

    function loadPlayerData() {
        // no-op: 数据加载由 GameDataStore.load() 处理
    }

    return {
        loadPlayerData: loadPlayerData,
        defaultPlayerData: defaultPlayerData
    };
}

export { createPlayerDataSystem };