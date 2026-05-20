import Logger from '../utils/Logger.js';
import deepClone from '../utils/DeepClone.js';
/**
 * 玩家数据加载系统
 * 包含 loadPlayerData 函数和默认玩家数据模板
 */

function createPlayerDataSystem(deps) {
    var getStorage = deps.getStorage;
    var setPlayerData = deps.setPlayerData;
    var setPlayerDataField = deps.setPlayerDataField;
    var savePlayerData = deps.savePlayerData;
    var setTimeCrystalUnlocked = deps.setTimeCrystalUnlocked;

    // ==================== 存档版本迁移 ====================
    var CURRENT_SAVE_VERSION = 2;

    // MIGRATIONS[i] 将存档从版本 i 迁移到版本 i+1
    // 新增字段只需在 defaultPlayerData 添加（顶层字段自动合并）
    // 此处只放结构变更：嵌套新字段、字段重命名、类型修复、数据转换
    var MIGRATIONS = [
        // v0 → v1: 初始版本化存档（之前的 ad-hoc 补丁已内联在 loadPlayerData 中作为安全网）
        function migrateV0toV1(data) {
            // 未来如果有需要，在此添加迁移逻辑
        },
        // v1 → v2: 添加 upgradeData（升星数据）
        function migrateV1toV2(data) {
            if (!data.upgradeData) {
                data.upgradeData = { stars: {} };
            }
            if (!data.upgradeData.stars) {
                data.upgradeData.stars = {};
            }
        }
    ];

    // 默认玩家数据模板
    var defaultPlayerData = {
        id: 'player_001',
        name: '唤灵人',
        gold: 0,
        starSource: 9999,
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
                totalClicks: 0,
                totalGames: 0,
                totalPerfects: 0,
                totalCriticals: 0,
                totalScore: 0,
                maxCombo: 0,
                monstersKilled: 0,
                itemsUsed: 0,
                backpackOpened: 0,
                shopOpened: 0,
                modeSwitched: 0,
                rewardsClaimed: 0
            }
        },
        equipments: {
            owned: [],
            equipped: {
                weapon: null,
                armor: null,
                accessory: null,
                set: null
            }
        },
        skills: {
            owned: [],
            equipped: [],
            gachaTickets: 0
        },
        pets: {
            owned: [],
            equipped: null
        },
        equippedStars: [],
        normalStarEnabled: true,
        stageProgress: {},
        faithData: {
            resources: {
                devoutMark: 0,
                divineEssence: 0,
                originCrystal: 0,
                weeklyDevoutMark: 0,
                lastWeeklyReset: 0
            },
            characters: {},
            inheritance: {
                totalInherited: 0,
                inheritedBonus: {
                    attack: 0,
                    hp: 0,
                    critRate: 0
                }
            }
        },
        infiniteTower: {
            highestFloor: 0,
            totalClears: 0,
            currentFloor: 1,
            currentHp: 100,
            maxHp: 100,
            collectedRewards: [],
            exploredCells: [],
            playerX: 0,
            playerY: 0,
            totalKills: 0,
            totalTreasures: 0,
            totalMaterials: 0,
            isPaused: false,
            grid: null,
            blindSteps: 0
        },
        afkData: {
            lastClaimTime: 0,
            maxOfflineHours: 8,
            baseGoldPerMinute: 2,
            baseExpPerMinute: 2,
            accumulatedRewards: { gold: 0, exp: 0, materials: {}, equipments: [] },
            accumulatedHours: 0
        },
        upgradeData: {
            stars: {}
        }
    };

    function loadPlayerData() {
        try {
            Logger.info('=== 开始加载玩家数据 ===');
            var savedData = getStorage('playerData');
            Logger.info('读取到的原始数据:', JSON.stringify(savedData));

            if (savedData) {
                // 使用默认值作为基础，然后用保存的数据覆盖
                var playerData = {};

                // 遍历默认数据，逐个字段设置
                for (let key in defaultPlayerData) {
                    if (savedData[key] !== undefined && savedData[key] !== null) {
                        playerData[key] = deepClone(savedData[key]);
                        Logger.info('使用保存的数据 ' + key + ':', playerData[key]);
                    } else {
                        playerData[key] = deepClone(defaultPlayerData[key]);
                        Logger.info('使用默认值 ' + key + ':', playerData[key]);
                    }
                }

                // 去重：确保ownedCharacters中没有重复的角色ID
                if (playerData.ownedCharacters && playerData.ownedCharacters.length > 0) {
                    var uniqueChars = [];
                    var seen = {};
                    for (let i = 0; i < playerData.ownedCharacters.length; i++) {
                        var charId = playerData.ownedCharacters[i];
                        if (!seen[charId]) {
                            seen[charId] = true;
                            uniqueChars.push(charId);
                        }
                    }
                    if (uniqueChars.length !== playerData.ownedCharacters.length) {
                        Logger.info('检测到重复角色，已自动清理:', playerData.ownedCharacters, '→', uniqueChars);
                        playerData.ownedCharacters = uniqueChars;
                        savePlayerData();
                    }
                }

                // 技能数据迁移：字符串格式 → {uid, id, level} 对象格式
                if (playerData.skills && playerData.skills.owned && playerData.skills.owned.length > 0) {
                    var needMigrate = false;
                    for (let i = 0; i < playerData.skills.owned.length; i++) {
                        if (typeof playerData.skills.owned[i] === 'string') {
                            needMigrate = true;
                            break;
                        }
                        if (typeof playerData.skills.owned[i] === 'object' && !playerData.skills.owned[i].uid) {
                            needMigrate = true;
                            break;
                        }
                    }
                    if (needMigrate) {
                        var migrated = [];
                        for (let i = 0; i < playerData.skills.owned.length; i++) {
                            var entry = playerData.skills.owned[i];
                            var skillId = typeof entry === 'string' ? entry : entry.id;
                            migrated.push({
                                uid: 'skill_' + Date.now() + '_' + i + '_' + Math.floor(Math.random() * 10000),
                                id: skillId,
                                level: (typeof entry === 'object' && entry.level) || 1
                            });
                        }
                        Logger.info('技能数据迁移: 旧格式 → 对象+uid', playerData.skills.owned.length, '→', migrated.length);
                        playerData.skills.owned = migrated;
                        savePlayerData();
                    }
                }

                // 确保 characterExperience 是对象（修复字符串类型错误）
                if (typeof playerData.characterExperience !== 'object' || playerData.characterExperience === null) {
                    Logger.info('characterExperience 类型错误，重置为对象');
                    playerData.characterExperience = {};
                } else {
                    for (let charExpId in playerData.characterExperience) {
                        var charExp = playerData.characterExperience[charExpId];
                        if (typeof charExp !== 'object' || charExp === null) {
                            Logger.info('角色', charExpId, '的经验数据类型错误，重置:', charExp);
                            playerData.characterExperience[charExpId] = {
                                level: 1,
                                exp: 0,
                                maxExp: 100
                            };
                        }
                    }
                }

                Logger.info('=== 加载完成 ===');
                Logger.info('玩家数据已加载，HP:', playerData.playerHp, 'unlockedStarTypes:', playerData.unlockedStarTypes, 'iceStarLevel:', playerData.iceStarLevel);

                // 确保 unlockedStarTypes 是数组
                if (!playerData.unlockedStarTypes || !Array.isArray(playerData.unlockedStarTypes)) {
                    Logger.info('unlockedStarTypes 不是数组，初始化为空数组');
                    playerData.unlockedStarTypes = [];
                }

                // 恢复时序结晶解锁状态
                if (playerData.timeCrystalUnlocked) {
                    setTimeCrystalUnlocked(true);
                    Logger.info('时序结晶已解锁');
                }

                Logger.info('ownedCharacters:', playerData.ownedCharacters);
                Logger.info('materials:', JSON.stringify(playerData.materials));
                Logger.info('stageProgress:', JSON.stringify(playerData.stageProgress));

                // 确保 infiniteTower 存在
                if (!playerData.infiniteTower) {
                    Logger.info('infiniteTower 不存在，初始化默认值');
                    playerData.infiniteTower = {
                        highestFloor: 0,
                        totalClears: 0,
                        currentFloor: 1,
                        currentHp: 100,
                        maxHp: 100,
                        collectedRewards: [],
                        exploredCells: [],
                        playerX: 0,
                        playerY: 0,
                        totalKills: 0,
                        totalTreasures: 0,
                        totalMaterials: 0,
                        isPaused: false,
                        grid: null,
                        blindSteps: 0
                    };
                }
                // 确保关键字段存在（兼容旧版本存档）
                if (playerData.infiniteTower.isPaused === undefined) {
                    playerData.infiniteTower.isPaused = false;
                }
                if (playerData.infiniteTower.grid === undefined) {
                    playerData.infiniteTower.grid = null;
                }
                if (playerData.infiniteTower.blindSteps === undefined) {
                    playerData.infiniteTower.blindSteps = 0;
                }

                // ==================== 版本迁移 ====================
                var saveVersion = (savedData._version !== undefined) ? savedData._version : 0;
                if (saveVersion < CURRENT_SAVE_VERSION) {
                    Logger.info('存档迁移: v' + saveVersion + ' → v' + CURRENT_SAVE_VERSION);
                    for (var mi = saveVersion; mi < MIGRATIONS.length; mi++) {
                        MIGRATIONS[mi](playerData);
                    }
                    playerData._version = CURRENT_SAVE_VERSION;
                    savePlayerData(true);
                    Logger.info('存档迁移完成');
                } else if (!playerData._version) {
                    playerData._version = CURRENT_SAVE_VERSION;
                }

                // 将加载的 playerData 写回全局
                setPlayerData(playerData);
            } else {
                Logger.info('没有找到保存的玩家数据，使用默认值');
                var freshData = deepClone(defaultPlayerData);
                freshData._version = CURRENT_SAVE_VERSION;
                setPlayerData(freshData);
            }
        } catch (error) {
            console.error('加载玩家数据失败:', error);
        }
    }

    return {
        loadPlayerData: loadPlayerData,
        defaultPlayerData: defaultPlayerData
    };
}

export { createPlayerDataSystem };
