# GameDataStore 统一存储落地方案

> 目标：将散落在 20+ 个调用点的 playerData 读写收归单一模块，持久化字段与运行时字段分离，为新功能提供统一入口。

---

## 一、目标架构

```
                  各游戏子系统
                      │
                      ▼
           ┌─────────────────────┐
           │    GameDataStore    │  ← 唯一入口
           │  ┌───────────────┐  │
           │  │ SaveData  (持久化) │  │  持久化数据
           │  │ RuntimeData    │  │  纯运行时（护盾/怒气/无敌等）
           │  └───────┬───────┘  │
           │          │          │
           │   set() → dirty     │
           │   flush() → 序列化  │
           └──────────┬──────────┘
                      │
           ┌──────────┴──────────┐
           │    BrowserAPI       │
           │  game_saveData_v3   │  ← 新 key
           └─────────────────────┘
```

---

## 二、新增/修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `V1/src/systems/GameDataStore.js` | **新建** | 统一存储核心模块 |
| `V1/src/systems/MigrationPipeline.js` | **新建** | 迁移管道（v2→v3 + 旧数据修复） |
| `V1/src/systems/PlayerDataSystem.js` | **重写** | 只留迁移 pipeline，加载逻辑移入 GameDataStore |
| `V1/src/systems/StorageSystem.js` | **精简** | 移除 savePlayerData/doSavePlayerData，保留 bestScore 和云上传 |
| `V1/game.js` | **改动** | 删除 playerData 声明，改为 `dataStore.save` 访问；改写所有注入点 |
| `V1/rollup.config.mjs` | **改动** | 新增 GameDataStore.js / MigrationPipeline.js 到输入文件列表 |
| `V1/玩家数据存储脉络汇总.md` | **更新** | 同步新架构文档 |

---

## 三、GameDataStore 模块设计

### 3.1 外部接口

```
GameDataStore = createGameDataStore(deps)

deps:
    getStorage(key)         → JSON    // BrowserAPI.getStorageSync
    setStorage(key, val)    → void    // BrowserAPI.setStorageSync
    removeStorage(key)      → void    // BrowserAPI.removeStorageSync

返回:
    store = {
        save,               // 持久化数据对象（Proxy，修改自动标脏）
        runtime,            // 运行时数据对象（不标脏，不持久化）

        isDirty(),          // → boolean
        flush(),            // 立即序列化写入 localStorage（忽略防抖冷却）
        tryFlush(),         // 自动 flush：检查 isDirty() + 2000ms 冷却，满足则 flush（供 renderLoop 调用）
        load(),             // 从 localStorage 加载 → 迁移 → 填充 save + runtime
        reset(),            // 清空为默认值并写盘
        set(path, value),   // Proxy 降级方案：显式路径赋值（如 'materials.iceCrystal.quantity'）

        onFlush(fn),        // 注册 flush 后回调（如上传排行榜）
        onLoad(fn),         // 注册 load 后回调
    }
```

### 3.2 save 对象（持久化字段）

与当前 `defaultPlayerData` 一致，完整字段：

```
save._version           = 3
save.id                 = 'player_001'
save.name               = '唤灵人'
save.gold               = 0
save.starSource         = 9999
save.starStones         = 0
save.ownedCharacters    = []
save.currentCharacterId = null
save.characterExperience = {}
save.materials          = { iceCrystal, fireSource, critCrystal, critFireSource, timeCrystal, devourerResidue }
save.items              = { healPotion, timePotion, expPotionSmall, expPotionMedium, expPotionLarge }
save.usedMaterials      = {}
save.unlockedStarTypes  = []
save.iceStarLevel       = 0 / maxIceStarLevel = 10
save.fireStarLevel      = 0 / maxFireStarLevel = 10
save.timeStarLevel      = 0 / maxTimeStarLevel = 10
save.timeCrystalUnlocked = false
save.totalMonstersKilled = 0
save.bossKillCount      = 0
save.firstBossKilled    = false
save.extraCritRate      = 0
save.extraCritDamage    = 0
save.playerHp           = 100 / maxPlayerHp = 100
save.starMode           = 'random'
save.equipments         = { owned: [], equipped: { weapon, armor, accessory, set } }
save.skills             = { owned: [], equipped: [], gachaTickets: 0 }
save.pets               = { owned: [], equipped: null }
save.equippedStars      = []
save.normalStarEnabled  = true
save.taskProgress       = { guide, daily, achievements, lastDailyRefresh, stats }
save.stageProgress      = {}
save.faithData          = { resources, characters, inheritance }
save.infiniteTower      = { highestFloor, totalClears, currentFloor, ... }
save.afkData            = { lastClaimTime, maxOfflineHours, ... }
save.upgradeData        = { stars: {} }
save.fusionResults      = {}       // 融合产物注册表（5 个 FusionStrategy 动态添加）
save.seenTips           = {}
save.monthlyCards       = { small: { days, lastClaimDate, adsWatched }, large: { ... } }
save.purchasedShopPets  = []       // 商城已购宠物ID（ShopSystem 动态添加）
save.seasonData         = null     // 赛季数据缓存（SeasonSystem 动态添加，含 weekId/content/bestScore/leaderboard/selection）
```

### 3.3 runtime 对象（运行时字段，不持久化）

```
runtime.godMode            = false
runtime.playerShield       = 0
runtime.playerRage         = 0
runtime.tutorialCompleted  = false
runtime.worldMapProgress   = { currentWorldId: null, worlds: {} }
runtime.showCharacterDetails = false   // 从 save 移出（纯 UI 状态）
```

### 3.4 内部机制

**Proxy 自动标脏**：
- `save` 对象用递归 `Proxy` 包裹，对任意深度的属性赋值（如 `save.materials.iceCrystal.quantity += 1`）都会自动触发 `_markDirty()`。实现方式：每个被访问的子对象也返回一个新的 Proxy，直到叶子节点。
- 子 Proxy 实例通过内部 `WeakMap` 缓存（key=原始对象，value=Proxy），同一路径多次访问返回同一个 Proxy 实例，避免高频创建。
- **set 陷阱的子对象重新包裹**：当子系统执行 `save.xxx = newObj`（整体替换）时，set 陷阱除了标脏，还会检测 `newObj` 是否为对象，是则递归包裹 Proxy 再赋值。这确保 Phase 2-3 过渡期内，即使子系统做了深层对象的整体替换（如 `playerData.materials = { iceCrystal: ... }`），新对象仍然被 Proxy 包裹，后续属性修改（`iceCrystal.quantity += 1`）仍能标脏。
- `runtime` 不标脏（修改不影响 flush 行为）。
- `isDirty()` 返回当前是否有未写入变更。
- 如果目标环境不支持 Proxy（微信小程序等），降级为暴露 `store.set(pathString, value)` 显式路径 API（如 `dataStore.set('materials.iceCrystal.quantity', 5)`），内部解析路径并标脏。

**flush 策略**：
- 脏标记由 Proxy 自动设置，子系统不需要手动调 flush。
- 自动 flush：在全局 tick 循环（game.js renderLoop 末尾）调用 `store.tryFlush()`。内部检查 `isDirty()` + 2000ms 冷却，两个条件都满足才执行实际写入。
- 手动 flush：`store.flush()` 立即写入（忽略冷却），用于世界地图退出等需要即时持久化的场景。

game.js 的 renderLoop 修改为：
```javascript
function renderLoop() {
    render();
    dataStore.tryFlush();  // 自动防抖 flush
    _rafId = requestAnimationFrame(renderLoop);
}
```

**flush 内部实现细节**（防止 Proxy 循环标脏）：
- `_rawSave`：内部持有的原始数据对象。Proxy 的 target 即指向同一个 `_rawSave` 对象——Proxy 只是拦截层，数据本体始终在 `_rawSave` 上。不需要额外的副本同步。
- `flush()` 执行时：先读取并暂存脏标记 → 重置脏标记为 false → 对 `_rawSave` 深拷贝快照 → 序列化写入 localStorage → 触发 `onFlush` 回调。深拷贝操作直接在裸对象上进行，不经过 Proxy，避免在 flush 过程中重新标脏导致下一帧再次 flush 的无限循环。

**load 流程**：
```
load()
  ├─ getStorage('saveData_v3')        // 新 key
  ├─ 如果有 v3 数据：
  │     ├─ 填充 store.save ← v3.saveData
  │     └─ 填充 store.runtime ← v3.runtimeData
  ├─ 如果没有 v3 但 v2 数据存在：
  │     ├─ 读取 game_playerData
  │     ├─ 执行旧数据修复（去重、技能格式迁移、characterExperience 修复）
  │     ├─ 执行版本迁移链 v2 → CURRENT
  │     ├─ 拆分运行时字段到 runtime
  │     ├─ 填充 store.save + store.runtime
  │     ├─ 触发 onLoad 回调
  │     └─ flush() → 写入 game_saveData_v3（同时回写 game_playerData 作降级兼容）
  └─ 没有数据 → 填充默认值，触发 onLoad
```

> 注意：迁移完成后的 flush 在 `load()` 末尾统一执行，不在迁移中途单独 flush（当前 PlayerDataSystem 的 3 次中间 savePlayerData 全部合并）。旧数据修复操作（去重、技能格式迁移、characterExperience 类型修复）是幂等的——即使连续执行两次结果相同。如果在修复完成但 flush 前进程崩溃，下次启动会重新从旧 key 加载并再次执行全部修复，结果正确。同时回写旧 key 以保证降级兼容。

**reset 流程**：
```
reset()
  ├─ save ← deepClone(defaultSaveData)
  ├─ runtime ← deepClone(defaultRuntimeData)
  ├─ 重置脏标记
  ├─ 同步全局状态（见下方说明）
  └─ flush()
```

\u003e `reset()` 会触发 flush 写入 localStorage，但**不触发 onLoad 回调**。因此需要在 reset() 末尾显式同步全局状态：
\u003e ```
\u003e combatState.timeCrystalUnlocked = false;
\u003e starMode = 'random';
\u003e if (starSystem) starSystem.setStarMode('random');
\u003e ```
\u003e 或者在 ShopRenderer 等消费方改为直接从 `dataStore.save` 读取（推荐），从根本上消除对 `combatState` 的桥接依赖。

### 3.5 生命周期钩子

```javascript
// uploadLeaderboardData 改为接受可选参数，有则用，无则自己从 dataStore.save 读
// StorageSystem.js 内：
function uploadLeaderboardData(saveSnapshot) {
    var data = saveSnapshot || dataStore.save;
    var bestScoreVal = getBestScore() || 0;
    var totalKillsVal = (data && data.totalMonstersKilled) || 0;
    // ...
}

// game.js 注册：
store.onFlush(function(saveSnapshot) {
    storageSystem.uploadLeaderboardData(saveSnapshot);
});

store.onLoad(function() {
    // 恢复教程状态
    if (store.runtime.tutorialCompleted) _tutorial.completed = true;
    // 同步 timeCrystalUnlocked 到战斗运行时状态
    combatState.timeCrystalUnlocked = store.save.timeCrystalUnlocked;
    // 同步星模式
    starMode = store.save.starMode || 'random';
    if (starSystem) starSystem.setStarMode(starMode);
});
```

---

## 四、game.js 改动

### 4.1 删除

- 删除 `let playerData = { ... }` 声明 (L838-892)
- 删除 `PlayerDataSystem.js` 中 `loadPlayerData` 的全部逻辑（只留迁移函数）
- 删除 `StorageSystem.js` 中 `savePlayerData`/`doSavePlayerData`/`clearGameData`

### 4.2 新增初始化

```
// 初始化统一数据存储
var dataStore = _gameModules.createGameDataStore({
    getStorage: function(key) { return $P.getStorageSync(key); },
    setStorage: function(key, val) { $P.setStorageSync(key, val); },
    removeStorage: function(key) { $P.removeStorageSync(key); }
});

// 加载最高分
loadBestScore();

// 初始化迁移管道（仅作为工具模块供 load() 内部调用，不直接对外调 migrate）
var migrationPipeline = _gameModules.createMigrationPipeline();

// 加载数据（内部自包含迁移逻辑，无需外部调 migrate）
dataStore.load();

// 注册 flush 后上传排行榜
dataStore.onFlush(function(snapshot) {
    storageSystem.uploadLeaderboardData(snapshot);
});

// 注册 load 后恢复全局状态
dataStore.onLoad(function() {
    if (dataStore.runtime.tutorialCompleted) _tutorial.completed = true;
    combatState.timeCrystalUnlocked = dataStore.save.timeCrystalUnlocked;
    starMode = dataStore.save.starMode || 'random';
    if (starSystem) starSystem.setStarMode(starMode);
});

// 暴露全局快捷引用
var saveData = dataStore.save;
var runtimeData = dataStore.runtime;
```

### 4.3 注入点改写模式

> **实际量级**：`getPlayerData` 注入共 61 处，`setPlayerData` 注入共 2 处，`playerData.` 裸引用 game.js 内 82 处 + src/ 子系统内 685 处，总计约 770 处需要改写。以下为统一改写模式。

当前模式（以偷灵系统为例）：
```
saveData: function() { savePlayerData(); },
getPlayerData: function() { return playerData; }
```

改为：
```
getSaveData: function() { return dataStore.save; },
getRuntimeData: function() { return dataStore.runtime; }
```

- 子系统内部通过 `deps.getSaveData()` 拿到 save 引用后，其内部 `playerData.xxx` 改为 `saveData.xxx`。
- 原来 `saveData` 注入直接删除——Proxy 自动标脏 + 全局 tick 自动 flush，子系统不再需要手动触发保存。
- 对于世界地图等需要**即时持久化**的场景，改为注入 `flushData: function() { dataStore.flush(); }`，直调 `deps.flushData()` 替代原来的 `saveData()`（即时路径）或 `saveDataImmediate()`。
- 注入点改写模式中保留 3 种注入类型：

```
// 读数据
getSaveData:    function() { return dataStore.save; },
getRuntimeData: function() { return dataStore.runtime; },

// 即时保存（替代 savePlayerData(true) / saveDataImmediate）
flushData:      function() { dataStore.flush(); },
```

### 4.4 module.exports 适配（Simulator 环境）

game.js 底部 `module.exports` 导出（L6407-6411）暴露了 `playerData`，用于 Node.js Simulator 环境：

```
getPlayerData: function() { return playerData; },
getPlayerHp: function() { return playerData.playerHp; },
```

改为：

```
getPlayerData: function() { return dataStore.save; },
getPlayerHp: function() { return dataStore.save.playerHp; },
```

---

## 五、版本迁移（v2 → v3）

### 5.1 迁移触发

`dataStore.load()` 内部自动检测：

1. 先尝试读 `game_saveData_v3`（新 key）— 有则直接使用
2. 没有则尝试读 `game_playerData`（旧 key v2）— 有则迁移到 v3
3. 都没有则使用默认值

### 5.2 迁移逻辑（v2 → v3）

```
migrateV2toV3(v2data):
    // 结构相同，key 变化
    v3data = deepClone(v2data)

    // 提取运行时字段到 runtime
    // 注意：以下字段从持久化数据中移除后，降级回旧版本时这些数据会丢失
    // - godMode → 无敌模式重置为 false（可接受）
    // - playerShield → 护盾清零（可接受）
    // - playerRage → 怒气清零（可接受，且当前版本从未写入该字段）
    // - tutorialCompleted → 教程重新触发（影响小）
    // - worldMapProgress → 世界地图进度丢失（需提示玩家）
    // - showCharacterDetails → UI 重置（影响微小）
    runtime = {
        godMode:           v3data.godMode || false,
        playerShield:      v3data.playerShield || 0,
        playerRage:        v3data.playerRage || 0,
        tutorialCompleted: v3data.tutorialCompleted || false,
        worldMapProgress:  v3data.worldMapProgress || { currentWorldId: null, worlds: {} },
        showCharacterDetails: v3data.showCharacterDetails || false
    }

    // 从持久化字段中删除运行时字段
    delete v3data.godMode
    delete v3data.playerShield
    delete v3data.playerRage
    delete v3data.tutorialCompleted
    delete v3data.worldMapProgress
    delete v3data.showCharacterDetails

    return { save: v3data, runtime: runtime }
```

---

## 六、StorageSystem.js 精简

保留的功能：
- `loadBestScore()` / `saveBestScore()` — 最高分
- `uploadToCloudStorage()` / `uploadLeaderboardData()` / `uploadSeasonScore()` — 云上传

移除的功能：
- `savePlayerData()` / `doSavePlayerData()` — 由 `dataStore.flush()` 替代
- `clearGameData()` — 由 `dataStore.reset()` 替代

---

## 七、PlayerDataSystem.js 精简

移除 `loadPlayerData()`（逻辑移入 GameDataStore + MigrationPipeline）。保留：
- `defaultPlayerData` 模板 — 移入 `GameDataStore.js` 作为 `defaultSaveData`
- `MIGRATIONS` 数组 — 移入新建的 `MigrationPipeline.js`
- 旧数据修复逻辑（去重、技能格式迁移、characterExperience 类型修复）— 移入 `MigrationPipeline.js` 作为 v2→v3 前的修复步骤

> `MigrationPipeline.js` 作为工具模块，被 `GameDataStore.load()` 内部调用。game.js 中只初始化 `migrationPipeline`（用于可选的手动迁移场景），但不直接调 `migrate()`。迁移入口统一在 `load()` 中。

### 七-附录：其他受影响的系统

**AdSystem.js 适配**：
- 当前 `setPlayerDataProp('timeCrystalUnlocked', true)` 改为 `dataStore.save.timeCrystalUnlocked = true`
- `combatState.timeCrystalUnlocked` 不再由 AdSystem 双向维护——改为在 `onLoad` 时一次性同步，后续 ShopRenderer 等从 `dataStore.save.timeCrystalUnlocked` 直接读取。

**DebugSystem.js** 适配：
- 当前 `getPlayerData` 注入改为 `getSaveData` + `getRuntimeData`
- `clearGameData` 调用改为 `dataStore.reset()`
- `godMode` 切换从 `playerData.godMode` 改为 `dataStore.runtime.godMode`
- 内部 42 处 `playerData.` 引用需改写

---

## 八、分阶段实施

| 阶段 | 步骤 | 内容 | 改动范围 |
|------|------|------|----------|
| **Phase 1** | 1 | 新建 `V1/src/systems/GameDataStore.js`，实现递归 Proxy 标脏 + flush + load + reset + hooks | 新文件 ~250 行 |
|  | 2 | 新建 `V1/src/systems/MigrationPipeline.js`，迁移 v2→v3 + 旧数据修复 + 降级双写 | 新文件 ~120 行 |
|  | 3 | 更新 `V1/rollup.config.mjs`，将新模块加入输入文件列表 | 新增 2 行 |
|  | 4 | 精简 `StorageSystem.js`，移除 save/clear，保留 bestScore + 云上传 | 删 ~60 行 |
|  | 5 | 精简 `PlayerDataSystem.js`，模板和迁移函数移入新模块 | 删 ~200 行 |
| **Phase 2** | 6 | 改 `game.js`：删除 playerData 声明，初始化 dataStore，添加全局 tick 自动 flush | ~50 行新增 |
|  | 7 | 改写 game.js 内 61 处 `getPlayerData`/`setPlayerData` 注入 + 82 处裸引用 | ~143 处 |
|  | 8 | 改写 game.js 底部 `module.exports` 中的 `getPlayerData`/`getPlayerHp` | ~2 行 |
| **Phase 3** | 9 | 逐个子系统迁移 `src/` 下 45 个文件内的 `playerData.` 引用（~685 处） | 每批 3-5 个文件 |
|  | 10 | 删除子系统中 `saveData` 注入（Proxy 自动标脏替代手动触发） | ~20 个模块 |
|  | 11 | 即时持久化场景（世界地图等）改为直调 `deps.flushData()` | ~4 处 |
| **Phase 4** | 12 | 测试：新游戏建号、旧存档迁移、各系统数据写入、降级兼容、flush 正确性 | 全量回归 |

> 一次性改动量过大（总计约 770 处），分 4 个阶段实施。Phase 1-2 建好框架和 game.js 适配，Phase 3 逐批迁移子系统。

---

## 九、新功能接入模式

假设后续新增"竞技场系统"，只需：

```
// 在 GameDataStore.js 的 defaultSaveData 中增加字段
defaultSaveData.arenaData = {
    rank: 0,
    season: 1,
    history: []
};

// 竞技场系统中使用
var ArenaSystem = {
    increaseRank: function() {
        dataStore.save.arenaData.rank += 1;   // Proxy 自动标脏
        // 不需要手动调 flush，全局 tick 会检测脏标记自动写入
    }
};
```

无需关心防抖、序列化、key 管理、迁移——全部由 GameDataStore 统一处理。

---

## 十、风险与回滚

- **风险 1**：game.js 内 + src/ 共约 770 处 `playerData.` 引用需改写，遗漏概率高
  - **缓解**：分阶段实施，每阶段完成后 grep `playerData\.` 和 `getPlayerData` 确认零残留。Phase 3 逐批迁移，每批验证。
- **风险 2**：递归 Proxy 在微信小程序等环境下可能降级
  - **缓解**：同时提供 `store.set(path, value)` 显式 API 作为降级方案，在 Proxy 不可用时自动切换。
- **风险 3**：旧存档迁移时如果只写新 key 不写旧 key，降级回旧版本会丢失进度
  - **缓解**：迁移时**双写**——同时写入 `game_saveData_v3` 和 `game_playerData`（去除运行时字段的纯净版），旧版本可以通过 `game_playerData` 恢复大多数数据（仅丢失运行时字段，降级丢失明细见迁移逻辑注释）。
- **风险 4**：新模块未注册到 `_gameModules` 导致 rollup 构建中无法引用
  - **缓解**：`GameDataStore.js` 和 `MigrationPipeline.js` 内部通过 `_gameModules.createGameDataStore = function(...) {}` / `_gameModules.createMigrationPipeline = function(...) {}` 模式注册，与其他系统模块一致。同时更新 `rollup.config.mjs` 的输入文件列表。