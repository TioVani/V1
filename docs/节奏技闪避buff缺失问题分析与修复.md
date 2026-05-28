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
  playerEffects ──→ BattleEngine.S  (NormalBattleAdapter.update，每帧同步)
  playerEffects ──→ TowerSystem弹幕检查 (直接读 getPlayerEffects)
  RhythmSkillSystem → playerEffects  ← 自动传播到所有消费者
```

---

## 具体改动

### 1. NormalBattleAdapter.js — 改为每帧同步 + 删除反向覆盖

**a) `update()` 方法**：每帧开始时从 `playerEffects` 同步到 BattleEngine（无需等待点击事件）。

```javascript
function update() {
    if (battleEngine) {
        // 每帧同步玩家状态到引擎（取代原来在 handleStarClick 中的同步）
        var fx = getPlayerEffects();
        var pd = getSaveData();
        var hp = pd.playerHp;
        var shield = pd.playerShield;
        // 塔模式用 TowerSystem 的 hp/shield
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
        battleEngine.update();
    }
}
```

**b) `handleStarClick()` 方法**：删除手动 `setPlayerState` 调用（已移到 update 中）。保留 `setTargetMonster`。

**c) `syncEngineStateBack()` 方法**：删除 `fx.dodging/es.dodging` 和 `fx.dodgeEndTime/es.dodgeEndTime` 回写行，保留 hp/shield 回写。

改前（line 1021-1022）：
```javascript
fx.dodging = es.dodging;
fx.dodgeEndTime = es.dodgeEndTime;
```
→ 删除这两行。

**d) `monsterAttackPlayer()` 中弹幕命中**：闪避检查已通过 update 中的同步间接依赖 playerEffects，但当前代码直接访问 `fx.dodging`(line 1569)，所以不受影响。

### 2. BossBattleAdapter.js — 删除反向覆盖 + 补充正向同步

**a) `update()` 方法**：删除反向覆盖行，补充正向同步。

```javascript
// 删除 line 824-825:
setPlayerStunned(S.isStunned);
setPlayerStunEndTime(S.stunEndTime);

// 删除 line 831-832:
setPlayerDodging(S.dodging);
setPlayerDodgeEndTime(S.dodgeEndTime);
```

**b) 补充正向同步**：在 `update()` 中 `battleEngine.update()` 调用之前，从 `playerEffects` 同步状态到 BattleEngine。BossBattleAdapter 没有 `getPlayerEffects` 依赖，需要新增：

```javascript
var getPlayerEffects = deps.getPlayerEffects || function() { return {}; };

// update() 中 battleEngine.update() 之前插入：
var fx = getPlayerEffects();
battleEngine.setPlayerState(
    null, null,  // hp/shield 由 BossBattleAdapter 自己管理
    fx.dodging, fx.dodgeEndTime,
    fx.stunned, fx.stunEndTime
);
```

**c)** BossBattleAdapter 中 `setPlayerPoisoned`/`setPlayerPoisonEndTime`/`setPlayerPoisonDamage`（line 826-830）也存在同样的反向覆盖问题，但 poison 状态不在本次方案范围，可后续统一处理。

### 3. TowerSystem.js — 删除独立变量，改为读 playerEffects

**a)** 删除独立声明的 `var dodging = false;` 和 `var dodgeEndTime = 0;`（line 231-232）

**b)** 新增 deps 注入 `getPlayerEffects`：

```javascript
var getPlayerEffects = deps.getPlayerEffects || function() { return {}; };
```

**c)** 弹幕命中闪避检查（line 1089）：改为读 `playerEffects`：
```javascript
// 改前：
if (dodging && Date.now() < dodgeEndTime) {
// 改后：
var fx = getPlayerEffects();
if (fx.dodging && Date.now() < fx.dodgeEndTime) {
```

**d)** `updateCombatTick()` 中（line 1340）：删除 `dodging = st.dodging;`

**e)** 所有传给 `battleEngine.setPlayerState` 的 `dodging` 参数改为从 `getPlayerEffects()` 读取。

**f)** 初始化重置（line 1822/2332）：`dodging = false; dodgeEndTime = 0;` 改为 `getPlayerEffects().dodging = false; getPlayerEffects().dodgeEndTime = 0;`

### 4. game.js — TowerSystem 增加 deps

在 TowerSystem 初始化 deps 中增加：

```javascript
getPlayerEffects: function() { return playerEffects; },
```

### 5. 闪避星（dodge star）状态传播 — 补充 onAfterSpecialStar 钩子

**问题**：闪避星点击时 BattleEngine 内部设置 `S.dodging = true`（`BattleEngine.js:627`），当前通过 `syncEngineStateBack` 回写到 `playerEffects`。删除回写后此路径断裂。

**修复**：在 `NormalBattleAdapter.onAfterSpecialStarHook` 中增加 `dodge` case：

```javascript
case 'dodge':
    var fx = getPlayerEffects();
    var dodgeTime = getDodgeDuration();
    fx.dodging = true;
    fx.dodgeEndTime = Date.now() + dodgeTime;
    break;
```

`getDodgeDuration` 已在 deps 中（line 80），无需额外注入。

或者更简洁：在 `onAfterSpecialStar` 中直接写 `playerEffects`（引擎内部 `case 'dodge'` 仍设置 `S.dodging`，下一帧 update 同步会覆盖 S，一帧延迟无感知）。

### 6. 暂停恢复补偿 — playerEffects.dodgeEndTime 需同步补偿

**问题**：`BattleEngine._restorePauseCombatState` 中补偿 `S.dodgeEndTime += duration`，但 `playerEffects.dodgeEndTime` 不会被补偿，导致暂停恢复后 `playerEffects` 与 `S` 在一帧内不一致。

**处理**：一帧延迟后 update 同步会覆盖。但为彻底一致，可在 PauseCoordinator 的 resume 回调中增加对 playerEffects 的补偿——当前 PauseCoordinator 是外部模块，改动范围超出本次方案。**暂不处理**，一帧不一致在 60fps 下无感知。

---

## 改动清单汇总

| 文件 | 增 | 删 |
|------|---|----|
| `NormalBattleAdapter.js` | update 中增加每帧 setPlayerState；onAfterSpecialStarHook 增加 dodge case | handleStarClick 中的 setPlayerState 调用；syncEngineStateBack 中 dodging/stun 回写行 |
| `BossBattleAdapter.js` | deps 增加 getPlayerEffects；update 中增加正向 setPlayerState | update 中 setPlayerDodging/setPlayerDodgeEndTime/setPlayerStunned/setPlayerStunEndTime |
| `TowerSystem.js` | deps 增加 getPlayerEffects；弹幕检查改为读 playerEffects；setPlayerState 传参改为读 playerEffects | 独立 dodging/dodgeEndTime 变量声明；updateCombatTick 中 dodging/stun 回写行；重置逻辑改为写 playerEffects |
| `game.js` | BossBattleAdapter 和 TowerSystem deps 各增加 getPlayerEffects | — |
| `RhythmSkillSystem.js` | — | — |

模型统一后，将来新增任何玩家状态字段或新增游戏模式，只需维护一个方向：写入 `playerEffects` → 自动传播。

---

## 风险点

1. **`NormalBattleAdapter.update()` 调用频率**：当前渲染循环中各模式都调用 adapter/system.update()，频率为每帧一次（60fps），16ms 延迟对闪避状态同步而言充分。

2. **闪避星点击后一帧延迟**：`case 'dodge'` 在 BattleEngine 中写 `S.dodging = true`，同时 `onAfterSpecialStar` 写 `playerEffects.dodging = true`。下一帧 `update()` 同步 playerEffects → S 时会覆盖 S 中的值。一帧内两者均正确，无竞态。

3. **BossBattleAdapter.init() 中 `setPlayerDodging(false)` 保留**：这是初始化重置逻辑（建立干净初始状态），不是反向覆盖，保留不删。

4. **TowerSystem 弹幕命中闭包**：当前闭包捕获本地 `dodging` 变量，改为 `getPlayerEffects()` 后需要确保闭包内的 `getPlayerEffects` 引用正确。TowerSystem 是函数式模块，`getPlayerEffects` 通过 deps 注入为闭包变量，弹幕回调中访问的是注入时的引用，指向 game.js 的 `playerEffects` 全局单例，始终有效。

5. **暂停恢复补偿**：`BattleEngine._restorePauseCombatState` 中 `S.dodgeEndTime += duration` 补偿生效，`playerEffects.dodgeEndTime` 滞后一帧（16ms），下一个 `update()` 周期会被覆盖为旧值。暂不处理，影响可忽略。