import Logger from '../utils/Logger.js';
import deepClone from '../utils/DeepClone.js';

/**
 * GameDataStore — 统一游戏数据存储
 *
 * 设计目标：
 * - save 对象通过递归 Proxy 自动标脏，子系统任意深度修改都触发 isDirty()=true
 * - runtime 对象不标脏、不持久化（护盾/怒气/无敌/UI状态等）
 * - flush() 由全局 renderLoop 自动调用 tryFlush()（防抖冷却 2000ms）
 * - load() 内部自包含迁移逻辑（v2 → v3）
 * - 支持 onFlush / onLoad 生命周期钩子
 * - Proxy 不可用环境自动降级为显式 set(path, value) API
 */

var HAS_PROXY = typeof Proxy !== 'undefined';

function createGameDataStore(deps) {
    var getStorage = deps.getStorage;
    var setStorage = deps.setStorage;
    var removeStorage = deps.removeStorage;

    // ==================== 默认值模板 ====================

    var defaultSaveData = {
        _version: 3,
        id: 'player_001',
        name: '唤灵人',
        gold: 0,
        starSource: 0,
        starStones: 0,
        ownedCharacters: [],
        currentCharacterId: null,
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
            expPotionLarge: { quantity: 0 },
            starChest: { quantity: 0 }
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
        extraCritRate: 0,
        extraCritDamage: 0,
        playerHp: 100,
        maxPlayerHp: 100,
        starMode: 'random',
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
        towerUnlocked: false,
        afkData: {
            lastClaimTime: 0,
            maxOfflineHours: 8,
            baseGoldPerMinute: 10,
            baseExpPerMinute: 2,
            accumulatedRewards: { gold: 0, exp: 0, materials: {}, equipments: [] },
            accumulatedHours: 0
        },
        upgradeData: {
            stars: {}
        },
        fusionResults: {},
        seenTips: {},
        monthlyCards: {
            small: { days: 0, lastClaimDate: null, adsWatched: 0 },
            large: { days: 0, lastClaimDate: null, adsWatched: 0 }
        },
        purchasedShopPets: [],
        seasonData: null
    };

    var defaultRuntimeData = {
        godMode: false,
        playerShield: 0,
        playerRage: 0,
        tutorialCompleted: false,
        worldMapProgress: { currentWorldId: null, worlds: {} },
        showCharacterDetails: false
    };

    // ==================== 内部状态 ====================

    var _rawSave = deepClone(defaultSaveData);
    var _rawRuntime = deepClone(defaultRuntimeData);
    var _dirty = false;
    var _lastFlushTime = 0;
    var _flushCooldownMs = 2000;
    var _flushHooks = [];
    var _loadHooks = [];
    var _proxyCache = null;
    var _saveProxy = null;   // WeakMap: 原始对象 → Proxy
    var _suppressFlush = false; // reset 后抑制 flush，防止 beforeunload 写回旧数据

    // ==================== Proxy 标脏引擎 ====================

    function _markDirty() {
        _dirty = true;
    }

    function _resetDirty() {
        _dirty = false;
    }

    /**
     * 递归创建 Proxy 包裹对象树。
     * 每个子对象被访问时返回新的 Proxy，但通过 _proxyCache 缓存保证同一原始对象返回同一 Proxy。
     */
    function _wrapWithProxy(obj) {
        if (!HAS_PROXY || obj === null || typeof obj !== 'object') {
            return obj;  // 原始类型直接返回
        }

        // 检查缓存
        if (_proxyCache && _proxyCache.has(obj)) {
            return _proxyCache.get(obj);
        }

        var proxy = new Proxy(obj, {
            get: function(target, prop, receiver) {
                var value = Reflect.get(target, prop, receiver);
                if (typeof value === 'object' && value !== null) {
                    return _wrapWithProxy(value);
                }
                return value;
            },
            set: function(target, prop, value, receiver) {
                var oldValue = target[prop];
                var result = Reflect.set(target, prop, value, receiver);
                if (oldValue !== value) {
                    _markDirty();
                }
                return result;
            },
            deleteProperty: function(target, prop) {
                if (prop in target) {
                    var result = Reflect.deleteProperty(target, prop);
                    _markDirty();
                    return result;
                }
                return true;
            }
        });

        if (_proxyCache) {
            _proxyCache.set(obj, proxy);
        }

        return proxy;
    }

    /**
     * 重建 Proxy 缓存和包装。
     * 在 load/reset 后调用，因为 _rawSave 内容可能整体替换。
     */
    function _rebuildProxy() {
        _proxyCache = new WeakMap();
        _saveProxy = _wrapWithProxy(_rawSave);
    }

    // ==================== 显式路径 API（Proxy 降级方案） ====================

    function setByPath(pathStr, value) {
        var parts = pathStr.split('.');
        var obj = _rawSave;
        for (var i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in obj) || typeof obj[parts[i]] !== 'object' || obj[parts[i]] === null) {
                obj[parts[i]] = {};
            }
            obj = obj[parts[i]];
        }
        var lastKey = parts[parts.length - 1];
        if (obj[lastKey] !== value) {
            obj[lastKey] = value;
            _markDirty();
        }
    }

    // ==================== 持久化引擎 ====================

    function isDirty() {
        return _dirty;
    }

    function flush() {
        if (_suppressFlush) return;
        if (_dirty) {
            var snapshot = deepClone(_rawSave);
            var runtimeSnapshot = deepClone(_rawRuntime);
            _resetDirty();
            var payload = {
                _version: 3,
                saveData: snapshot,
                runtimeData: runtimeSnapshot
            };
            try {
                setStorage('game_saveData_v3', payload);
            } catch (e) {
                console.error('[GameDataStore] flush 写入失败:', e);
            }
            // 触发 onFlush 钩子（传入 save 快照）
            for (var i = 0; i < _flushHooks.length; i++) {
                try {
                    _flushHooks[i](snapshot);
                } catch (e) {
                    console.error('[GameDataStore] onFlush 钩子执行失败:', e);
                }
            }
            _lastFlushTime = Date.now();
        }
    }

    function tryFlush() {
        if (_suppressFlush) return;
        if (!_dirty) return;
        var now = Date.now();
        if (now - _lastFlushTime >= _flushCooldownMs) {
            flush();
        }
    }

    // ==================== 加载 & 迁移 ====================

    function load() {
        try {
            var v3Raw = getStorage('game_saveData_v3');

            if (v3Raw && v3Raw.saveData && v3Raw._version === 3) {
                _rawSave = _migrateIncomingSaveData(v3Raw.saveData);
                _rawRuntime = v3Raw.runtimeData ? deepClone(v3Raw.runtimeData) : deepClone(defaultRuntimeData);
                Logger.info('[GameDataStore] 从 v3 存储加载');
            } else {
                // 尝试从旧 key 迁移
                var oldData = getStorage('playerData');
                if (oldData) {
                    Logger.info('[GameDataStore] 从旧 playerData 迁移 → v3');
                    var migrated = _migrateV2toV3(oldData);
                    _rawSave = migrated.save;
                    _rawRuntime = migrated.runtime;
                    // 写入 v3，清除旧 key
                    flush();
                    try { removeStorage('playerData'); } catch(e) {}
                } else {
                    Logger.info('[GameDataStore] 无存档，使用默认值');
                    _rawSave = deepClone(defaultSaveData);
                    _rawRuntime = deepClone(defaultRuntimeData);
                }
            }

            _rebuildProxy();
            _resetDirty();

            _fireLoadHooks();
        } catch (e) {
            console.error('[GameDataStore] 加载失败:', e);
            _rawSave = deepClone(defaultSaveData);
            _rawRuntime = deepClone(defaultRuntimeData);
            _rebuildProxy();
            _resetDirty();
            _fireLoadHooks();
        }
    }

    /**
     * 对新加载的 saveData 做字段补全（兼容未来新增字段）。
     */
    function _migrateIncomingSaveData(data) {
        var merged = deepClone(defaultSaveData);
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                merged[key] = deepClone(data[key]);
            }
        }
        merged._version = 3;
        return merged;
    }

    /**
     * v2 (game_playerData) → v3 (拆分为 save + runtime)
     */
    function _migrateV2toV3(v2data) {
        // 旧数据修复（幂等）
        _repairOldData(v2data);

        var v3data = deepClone(v2data);

        // 提取运行时字段
        var runtime = {
            godMode: v3data.godMode || false,
            playerShield: v3data.playerShield || 0,
            playerRage: v3data.playerRage || 0,
            tutorialCompleted: v3data.tutorialCompleted || false,
            worldMapProgress: v3data.worldMapProgress || { currentWorldId: null, worlds: {} },
            showCharacterDetails: v3data.showCharacterDetails || false
        };

        // 从持久化字段中移除运行时字段
        delete v3data.godMode;
        delete v3data.playerShield;
        delete v3data.playerRage;
        delete v3data.tutorialCompleted;
        delete v3data.worldMapProgress;
        delete v3data.showCharacterDetails;

        v3data._version = 3;

        // 补全缺失字段
        v3data = _migrateIncomingSaveData(v3data);

        return { save: v3data, runtime: runtime };
    }

    /**
     * 旧数据修复（从 PlayerDataSystem 迁移过来，幂等）：
     * - 去重 ownedCharacters
     * - 技能格式迁移（字符串 → {uid, id, level}）
     * - characterExperience 类型修复
     */
    function _repairOldData(data) {
        // 去重
        if (data.ownedCharacters && data.ownedCharacters.length > 0) {
            var uniqueChars = [];
            var seen = {};
            for (var i = 0; i < data.ownedCharacters.length; i++) {
                var charId = data.ownedCharacters[i];
                if (!seen[charId]) {
                    seen[charId] = true;
                    uniqueChars.push(charId);
                }
            }
            if (uniqueChars.length !== data.ownedCharacters.length) {
                Logger.info('[GameDataStore] 检测到重复角色，已自动清理:', data.ownedCharacters, '→', uniqueChars);
                data.ownedCharacters = uniqueChars;
            }
        }

        // 技能格式迁移
        if (data.skills && data.skills.owned && data.skills.owned.length > 0) {
            var needMigrate = false;
            for (var j = 0; j < data.skills.owned.length; j++) {
                if (typeof data.skills.owned[j] === 'string') { needMigrate = true; break; }
                if (typeof data.skills.owned[j] === 'object' && !data.skills.owned[j].uid) { needMigrate = true; break; }
            }
            if (needMigrate) {
                var migrated = [];
                for (var k = 0; k < data.skills.owned.length; k++) {
                    var entry = data.skills.owned[k];
                    var skillId = typeof entry === 'string' ? entry : entry.id;
                    migrated.push({
                        uid: 'skill_' + Date.now() + '_' + k + '_' + Math.floor(Math.random() * 10000),
                        id: skillId,
                        level: (typeof entry === 'object' && entry.level) || 1
                    });
                }
                Logger.info('[GameDataStore] 技能数据迁移: 旧格式 → 对象+uid', data.skills.owned.length, '→', migrated.length);
                data.skills.owned = migrated;
            }
        }

        // characterExperience 类型修复
        if (typeof data.characterExperience !== 'object' || data.characterExperience === null) {
            Logger.info('[GameDataStore] characterExperience 类型错误，重置为对象');
            data.characterExperience = {};
        } else {
            for (var charExpId in data.characterExperience) {
                if (data.characterExperience.hasOwnProperty(charExpId)) {
                    var charExp = data.characterExperience[charExpId];
                    if (typeof charExp !== 'object' || charExp === null) {
                        Logger.info('[GameDataStore] 角色', charExpId, '的经验数据类型错误，重置');
                        data.characterExperience[charExpId] = { level: 1, exp: 0, maxExp: 100 };
                    }
                }
            }
        }

        // 确保关键字段是数组
        if (!data.unlockedStarTypes || !Array.isArray(data.unlockedStarTypes)) {
            data.unlockedStarTypes = [];
        }

        // 补全 infiniteTower 字段
        if (!data.infiniteTower) {
            data.infiniteTower = {
                highestFloor: 0, totalClears: 0, currentFloor: 1, currentHp: 100, maxHp: 100,
                collectedRewards: [], exploredCells: [], playerX: 0, playerY: 0,
                totalKills: 0, totalTreasures: 0, totalMaterials: 0,
                isPaused: false, grid: null, blindSteps: 0
            };
        }
        if (data.infiniteTower.isPaused === undefined) data.infiniteTower.isPaused = false;
        if (data.infiniteTower.grid === undefined) data.infiniteTower.grid = null;
        if (data.infiniteTower.blindSteps === undefined) data.infiniteTower.blindSteps = 0;
        if (data.towerUnlocked === undefined) data.towerUnlocked = false;
    }

    
    function reset() {
        _rawSave = deepClone(defaultSaveData);
        _rawRuntime = deepClone(defaultRuntimeData);
        _rebuildProxy();
        _markDirty();
        _suppressFlush = false; // 暂时解除，允许本次 flush 执行
        flush();
        _suppressFlush = true;  // 之后抑制所有 flush，防止 beforeunload 写回
        _resetDirty();
        // 清除旧 key 残留，防止下次 load() 回退读取旧数据
        try {
            removeStorage('playerData');
            removeStorage('bestScore');
            removeStorage('cloudData');
        } catch (e) {
            console.error('[GameDataStore] reset 清理旧 key 失败:', e);
        }
    }

    // ==================== 生命周期钩子 ====================

    function onFlush(fn) {
        _flushHooks.push(fn);
    }

    function onLoad(fn) {
        _loadHooks.push(fn);
    }

    function _fireLoadHooks() {
        for (var i = 0; i < _loadHooks.length; i++) {
            try {
                _loadHooks[i]();
            } catch (e) {
                console.error('[GameDataStore] onLoad 钩子执行失败:', e);
            }
        }
    }

    // ==================== 初始化 ====================

    _rebuildProxy();
    _resetDirty();

    return {
        get save() { return _saveProxy; },
        get runtime() { return _rawRuntime; },

        isDirty: isDirty,
        flush: flush,
        tryFlush: tryFlush,
        load: load,
        reset: reset,
        set: setByPath,

        onFlush: onFlush,
        onLoad: onLoad,

        // 暴露默认值模板（迁移管道可能需要）
        _defaultSaveData: defaultSaveData,

        /**
         * 返回合并的 save + runtime 访问对象。
         * 用于需要同时读取 playerHp（持久化）和 playerShield（运行时）的场景。
         * Proxy 自动委托：save 字段走 _saveProxy（标脏），runtime 字段走 _rawRuntime（不标脏）。
         */
        combined: _buildCombinedProxy()
    };

    function _buildCombinedProxy() {
        if (!HAS_PROXY) {
            // 降级：返回合并对象
            var obj = {};
            for (var k in _rawRuntime) { if (_rawRuntime.hasOwnProperty(k)) obj[k] = _rawRuntime[k]; }
            return obj;
        }

        return new Proxy({}, {
            get: function(_, prop) {
                if (prop in _rawRuntime) return _rawRuntime[prop];
                return _saveProxy[prop];
            },
            set: function(_, prop, value) {
                if (prop in _rawRuntime) {
                    _rawRuntime[prop] = value;
                    return true;
                }
                _saveProxy[prop] = value;
                return true;
            }
        });
    }
}

export { createGameDataStore };