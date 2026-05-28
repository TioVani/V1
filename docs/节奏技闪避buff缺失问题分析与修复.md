# 节奏技闪避buff缺失 — 统一修复方案

## 问题现象

节奏技触发期间的全程闪避buff：
- **赛季/普通模式**：生效，玩家不受弹幕伤害
- **BOSS模式/无尽之塔**：不生效，玩家仍被弹幕命中

---

## 根因分析

### 玩家状态管理的现状

项目中玩家状态（hp、shield、dodging、stun、poison 等）分散在三处维护：

```
playerEffects (GameState.js 全局单例)
BattleEngine.S  (引擎内部状态副本)
TowerSystem 本地变量 (dodging/dodgeEndTime/stunEndTime 独立副本)
```

每次 `handleStarClick` 时，`NormalBattleAdapter` 从 `playerEffects` 读取状态写入 `BattleEngine.S`。

每帧 `update` 时，各模式又有不同的回写回路：

```
普通/赛季: NormalBattleAdapter.update()
  → battleEngine.update()  (不回写 playerEffects)

BOSS:      BossBattleAdapter.update()
  → S.dodging/stun/poison → setPlayerXxx() 写入 playerEffects  ← 反向覆盖

无尽之塔:  TowerSystem.updateCombatTick()
  → S.dodging → 本地 dodging 变量  ← 反向覆盖
```

### 问题链路

1. RhythmSkillSystem.enter() 设置 `playerEffects.dodging = true`
2. 节奏技激活期间，触摸事件被 RhythmSkillSystem 消费，**不执行 handleStarClick**
3. 因此 `playerEffects.dodging` 从未同步到 `BattleEngine.S.dodging`
4. 普通/赛季模式：没有反向覆盖回路 → 问题不暴露
5. **BOSS模式**：每帧 `setPlayerDodging(S.dodging)` 把 false 写回 playerEffects → 闪避被抹除
6. **无尽之塔**：每帧 `dodging = st.dodging` 把 false 写回本地变量 → 弹幕命中不闪避

### 深层问题

当前架构下，添加任何一个新的玩家状态字段都需要在三个地方维护同步逻辑。每增加一种游戏模式又要再写一套覆盖回路。这本质上不可扩展。

---

## 修复目标

**统一状态管理方向：`playerEffects` 是唯一真相源，所有消费者从它读取。**

具体约束：
- BattleEngine 内部保留 `S.*` 副本（它是计算引擎，内部逻辑依赖本地状态），但 `S.*` 始终从 `playerEffects` 单向同步过来
- 删除所有 `S → playerEffects` 的反向覆盖回路
- 删除 TowerSystem 的独立变量副本
- 同步不再依赖 `handleStarClick` 事件，改为在 `update` 中按帧同步

---

## 架构变更

```
变更前（N 个真相源，N×M 条同步路径）：
  playerEffects ──→ BattleEngine.S  (handleStarClick)
  BattleEngine.S  ──→ playerEffects (BossBattleAdapter.update)    ← 删除
  BattleEngine.S  ──→ TowerSystem本地 (TowerSystem.combatTick)    ← 删除
  TowerSystem本地 ──→ BattleEngine.S  (弹幕命中后)
  RhythmSkillSystem → playerEffects  (不经过 BattleEngine)

变更后（单向流动）：
  playerEffects ──→ NormalBattleAdapter.update() ──→ BattleEngine.S (每帧同步，覆盖全部模式)
  TowerSystem弹幕检查 ──→ 惰性读 playerEffects.dodging (不再读本地变量)
  RhythmSkillSystem/闪避星 → playerEffects → 自动广播到所有消费者
```

---

## 具体改动

### 1. NormalBattleAdapter.js — 改为每帧同步

**a) `update()` 方法**：在 `battleEngine.update()` 之前插入正向同步（line 886 之后、line 887 注释之前）：

```javascript
function update() {
    if (battleEngine) {
        // 每帧同步玩家状态到引擎
        var fx = getPlayerEffects();
        var pd = getSaveData();
        var hp = pd.playerHp;
        var shield = pd.playerShield;
        var state = getGameState();
        var GAME_STATE = getGameConst();
        if (state === GAME_STATE.TOWER_COMBAT) {
            var ts = getTowerSystem();
            if (ts) { hp = ts.playerHp; shield = ts.playerShield || 0; }
        }
        battleEngine.setPlayerState(
            hp, shield,
            fx.dodging, fx.dodgeEndTime,
            fx.stunned, fx.stunEndTime
        );
        if (fx.poisoned) {
            battleEngine.setPoisonState(fx.poisoned, fx.poisonEndTime, fx.poisonDamage, fx.poisonTickTime);
        }
    }
    battleEngine.update();  // 原有 line 886，移到这里
    // 收服灵光生成（保留原有逻辑 line 887-897）
    ...
}
```

注意：`battleEngine.setPoisonState` 是 BattleEngine 实例方法（定义在 `BattleEngine.js:1213`），直接调用即可，无需 deps 注入。

**b) `handleStarClick()` 方法**：删除 line 941-945（`engine.setPlayerState(hpToSync, shieldToSync, playerEffects.dodging, playerEffects.dodgeEndTime, false, 0)` 这 5 行调用）。保留 `setTargetMonster`、`syncEngineStateBack()` 和 `Logger.info` 日志行（line 940）。

**c) `syncEngineStateBack()` 方法**：**保留不动**。闪避星点击后 BattleEngine 精确计算了 dodgeEndTime（含超速/快速点击加成），回写到 playerEffects 是合理的单向传播。

### 2. BossBattleAdapter.js — 仅删除反向覆盖

**关键发现**：`game.js` 的渲染循环中，`isCombat` 条件包含 `BOSS_BATTLE` 和 `TOWER_COMBAT`，**所有战斗模式每帧都调用 `normalBattleAdapter.update()`**（line 5897）。而 `normalBattleAdapter` 在 `initBossEngine`/`initTowerEngine` 时已将引擎引用指向 Boss/Tower 创建的引擎实例。

因此 NormalBattleAdapter.update() 中新增的 `setPlayerState` 正向同步**同时覆盖 Boss 和 Tower 模式**，BossBattleAdapter 无需自己做正向同步。

**a) `update()` 方法**：删除 line 820-828（整个"同步状态效果"区块，9行）：

```javascript
// 删除以下区块（line 820-828）:
// 同步状态效果
setPlayerStunned(S.isStunned);        // line 821
setPlayerStunEndTime(S.stunEndTime);  // line 822
setPlayerPoisoned(S.isPoisoned);      // line 823
setPlayerPoisonEndTime(S.poisonEndTime);// line 824
setPlayerPoisonDamage(S.poisonDamage); // line 825
setPlayerPoisonTickTime(S.poisonTickTime);// line 826
setPlayerDodging(S.dodging);          // line 827
setPlayerDodgeEndTime(S.dodgeEndTime);// line 828
```

poison 的 4 行（823-826）也在同一区块中，一并删除（避免后续遗漏）。

**b) `init()` 方法**中的初始化重置行（`setPlayerDodging(false)` 等）保留不动——它们是战斗入口清理逻辑。

**c)** BossBattleAdapter **不需要**新增 `getPlayerEffects` deps——正向同步由 NormalBattleAdapter.update() 代为完成。

### 3. TowerSystem.js — 删除独立变量，改为读 playerEffects

**涉及 4 个变量**：`dodging`、`dodgeEndTime`、`playerStunned`、`playerStunEndTime`。它们有完全一致的 6 类引用点：声明 → 弹幕闭包读写 → updateCombatTick 回写 → getter → 重置 → restartCurrentCombat。

**a) 新增 deps 注入**：
```javascript
var getPlayerEffects = deps.getPlayerEffects || function() { return {}; };
```

**b) 删除变量声明**（line 227-228, 240-241）：
```javascript
var dodging = false;           // 删除
var dodgeEndTime = 0;          // 删除
var playerStunned = false;     // 删除
var playerStunEndTime = 0;     // 删除
```

**c) 弹幕命中闭包**（line 1084-1185 匿名函数内）：
- line 1086 闪避检查：改为 `var fx = getPlayerEffects(); if (fx.dodging && Date.now() < fx.dodgeEndTime)`
- line 1114 `setPlayerState` 传参：`dodging` → `fx.dodging`，`playerStunned` → `fx.stunned`
- line 1168-1169 眩晕触发（**写**操作）：`playerStunned = true` → `fx.stunned = true`，`playerStunEndTime = ...` → `fx.stunEndTime = ...`
- line 1180 `setPlayerState` 传参：同上改为从 `fx` 读取

**d) `updateCombatTick()` 删除回写行**（line 1333-1337）：
```javascript
playerStunned = st.isStunned;      // 删除
playerStunEndTime = st.stunEndTime;// 删除
dodging = st.dodging;             // 删除
```

**e) getter 修改**（搜索 `get dodging`、`get playerStunned` 等）：改为返回 `playerEffects` 的值而非本地变量：
```javascript
get dodging() { return getPlayerEffects().dodging; },
get dodgeEndTime() { return getPlayerEffects().dodgeEndTime; },
get playerStunned() { return getPlayerEffects().stunned; },
get playerStunEndTime() { return getPlayerEffects().stunEndTime; },
```

**f) 初始化重置**（line 1819-1820/1828-1829 和 line 2324-2326）：改为写 `playerEffects`。

### 3b. GameBattleRenderer.js — 删除对 TowerSystem 的反向覆盖

`GameBattleRenderer.js` line 301 附近存在：
```javascript
playerEffects.stunned = towerSystem.playerStunned || false;
playerEffects.stunEndTime = towerSystem.playerStunEndTime || 0;
```
这是从 TowerSystem getter 读到值后再写回 `playerEffects` 的反向覆盖。改为 TowerSystem getter 直接返回 `playerEffects` 的值后，这两行变为自赋值（`fx.stunned = fx.stunned`），**删除这两行**。

### 4. game.js — TowerSystem 增加 deps + 确保 playerEffects.reset() 在战斗入口调用

**a)** TowerSystem deps 中增加（line 1258 `clearStars` 之后、line 1259 `getModeLifecycle` 之前）：
```javascript
getPlayerEffects: function() { return playerEffects; },
```

**b)** BossBattleAdapter 不需要新增 deps。

**c)** `playerEffects` 变量在 game.js **line 173** 声明：`var playerEffects = _gameModules.playerEffects;`。

---

## 改动清单汇总

| 文件 | 增 | 删 |
|------|---|----|
| `NormalBattleAdapter.js` | update 中增加每帧 setPlayerState（含 poison 同步） | handleStarClick 中 line 941-945 的 setPlayerState 调用 |
| `BossBattleAdapter.js` | — | update 中 line 820-828 整个"同步状态效果"区块（含 poison 4行一并清理） |
| `TowerSystem.js` | deps 增加 getPlayerEffects；弹幕闭包改为惰性读/写 playerEffects；getter 改为透传 playerEffects | 4个本地变量（dodging/dodgeEndTime/playerStunned/playerStunEndTime）；updateCombatTick 中对应回写行；重置改为写 playerEffects |
| `GameBattleRenderer.js` | — | line 301 附近：删除从 TowerSystem getter 到 playerEffects 的赋值行 |
| `game.js` | TowerSystem deps 增加 getPlayerEffects（line 1258 后） | — |
| `BattleEngine.js` | — | — |
| `RhythmSkillSystem.js` | — | — |
| `syncEngineStateBack` | — | 保留不动 |

正向同步由 **一处代码** 覆盖所有模式：

```
game.js renderGame → isCombat → normalBattleAdapter.update()
    → battleEngine.setPlayerState(hp, shield, dodging, dodgeEndTime, stunned, stunEndTime)
    → battleEngine.setPoisonState(...)
    → battleEngine.update()

Boss/Tower 模式共享此路径（initBossEngine/initTowerEngine 已将引擎引用注入到 normalBattleAdapter.battleEngine）
```

已删除的覆盖回路：

```
BossBattleAdapter.update → S.dodging/stun/poison → setPlayerXxx() → playerEffects (每帧覆盖)
TowerSystem.updateCombatTick → st.dodging/stun → 本地变量 (每帧覆盖)
GameBattleRenderer → towerSystem.playerStunned → playerEffects.stunned (反向覆盖)
```

---

## 风险点

1. **正向同步已覆盖全部模式**：`normalBattleAdapter.update()` 对所有战斗模式均被调用（`isCombat` 条件），且 `initBossEngine`/`initTowerEngine` 已将引擎引用指向正确的实例。

2. **`syncEngineStateBack` 保留不动**：闪避星 dodgeEndTime 含超速/快速点击加成，需 BattleEngine 精确计算后回写。

3. **BossBattleAdapter.init() 重置行保留**：战斗入口清理，不删。

4. **TowerSystem 弹幕闭包**：延时回调惰性读 `getPlayerEffects()` 正确。

5. **TowerSystem 眩晕变量一并处理**：`playerStunned`/`playerStunEndTime` 与 dodging 模式完全一致，统一改为从 playerEffects 读写。

6. **GameBattleRenderer 反向覆盖删除**：TowerSystem getter 改为透传 playerEffects 后，渲染器中的赋值行变为自赋值，删除无副作用。

7. **暂停恢复补偿**：`BattleEngine._restorePauseCombatState` 中 `S.dodgeEndTime += duration` 仅补偿引擎内部状态，playerEffects 滞后一帧。影响可忽略。

8. **TowerSystem 中毒变量暂不处理**：`playerPoisoned`/`playerPoisonEndTime`/`playerPoisonDamage`/`playerPoisonTickTime` 也是相同模式的本地变量，但本次方案聚焦闪避+眩晕（直接影响节奏技），中毒变量后续以相同模式统一。