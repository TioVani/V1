# 无尽之塔「返回菜单」误弹普通结算 & 战斗残留问题分析

## 一、问题概述

在无尽之塔模式中：
1. 玩家遇到怪物进入战斗后点击"返回菜单"，会跳出**普通模式**的 GAMEOVER 结算界面（而非保存进度回到大地图）
2. 回到大地图后，塔战斗相关资源（BattleEngine 实例、内部状态标志、存档对象等）没有被清理，造成状态污染
3. 当残留战斗状态被意外驱动时（如重新进入塔、定时器被恢复等），玩家 HP 可能被继续扣除至 0，触发**闯塔失败**的 TOWER_RESULT 结算

三个问题本质是同一根因：PAUSED 状态下"返回菜单"的塔模式分支调用链断裂。

---

## 二、触发链路（完整时序）

```
1. 玩家在塔内遇到怪物 → startCombat()
   状态: TOWER_COMBAT | inCombat=true | BattleEngine 运行中
   PauseCoordinator 已订阅 TowerCombat subscriber

2. 玩家点击暂停按钮 (game.js L4245-4255)
   → PauseCoordinator.pause()
     → TowerCombat.onPause → stopCombatTimers()  // 清除 combatTimer、combatMonsterAttackTimer
   → stateMachine.transitionTo(PAUSED)
   状态: PAUSED | 定时器已停 | inCombat=true

3. 在 PAUSED 状态点击"返回菜单" (game.js L4446-4449)
   → exitMode = modeLifecycle.getPreviousMode() || modeLifecycle.getActiveMode()
   → 由于 ModeLifecycle.syncActiveMode() 从未被调用，activeMode/previousMode 可能是 null
   → 无论 exitMode 是 'tower' 还是 null，最终都落入 endGame()

4. exitMode === 'tower' 分支 (game.js L4461-4463)
   → towerSystem.endCombat()   ← ⚠️ 此方法不存在于 TowerSystem 公共 API，静默跳过
   → endGame()                 ← ⚠️ 直接走普通模式 GAMEOVER 流程
   → PauseCoordinator.instance._paused = false  ← 重置暂停标志（不触发 onResume 回调）
   状态: GAMEOVER | 塔 BattleEngine 未销毁 | inCombat=true | combatMonster 未清

5. GAMEOVER 结算界面 → 返回 → WORLDMAP
   → 仅清理了普通战斗资源（normalBattleAdapter），塔资源全部残留
```

### 关键代码片段 (game.js L4456-4477)

```javascript
} else if (exitMode === 'tower') {
    if (towerSystem && towerSystem.endCombat) towerSystem.endCombat();  // ⚠️ 不存在
    endGame();                                                           // ⚠️
} else {
    endGame();
}
// 兜底清理全局定时器（endSeasonGame 已清，双保险）
if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; }
if (stopPetAttackTimer) stopPetAttackTimer();
if (normalBattleAdapter) normalBattleAdapter.destroy();
// 停止战斗音乐（直接调，绕过 prevState 依赖）
if (audioSystem) audioSystem.endBattle();
// 清除暂停标志（直接设内部字段，不触发 subscriber 重建定时器）
PauseCoordinator.instance._paused = false;
PauseCoordinator.instance._pauseStartTime = 0;
```

---

## 三、根因分析

### 根因 1：`towerSystem.endCombat` 方法不存在

- `game.js L4462` 调用了 `towerSystem.endCombat()`，但 `TowerSystem.js` 的公共 API（L2107-2332）中**没有导出 `endCombat` 方法**
- 搜索全项目，`endCombat` 只有这一处调用，没有任何定义
- 结果：`towerSystem && towerSystem.endCombat` 求值为 `false`，静默跳过，然后落入 `endGame()` 逻辑

### 根因 2：ModeLifecycle 与 StateMachine 脱节

`ModeLifecycleManager` 的 `activeMode` / `previousMode` 依赖 `syncActiveMode()` 来同步当前游戏状态。但 `syncActiveMode()` **从未被调用**（仅在方案文档中出现，未落地到渲染循环或状态转移中）。

- `activeMode` 只在 `modeLifecycle.transitionTo()` 时更新，但塔模式的状态切换走的是 `stateMachine.transitionTo()` → `setGameStateRaw()`，不经过 `modeLifecycle.transitionTo()`
- 结果：在 PAUSED 状态下，`modeLifecycle.getPreviousMode()` 和 `modeLifecycle.getActiveMode()` 都可能返回 `null`
- 无论返回 `'tower'` 还是 `null`，最终都走 `endGame()` 分支——结果相同但路径不同

### 根因 3：`endGame()` 不了解塔模式，只清理普通战斗资源

`endGame()` (`GameLifecycleSystem.js L525`) 的清理范围：

| 清理项 | 是否处理 |
|--------|----------|
| `timerInterval` / `moveInterval` / `monsterAttackInterval` | 是（全局定时器） |
| `normalBattleAdapter.destroy()` | 是（普通战斗适配器） |
| `saveBestScore()` | 是（普通模式最高分） |
| TowerSystem 的 `battleEngine`（BattleEngine 实例） | **否** |
| TowerSystem 的 `combatMonsterAttackTimer` / `combatTimer` | **否**（已由 stopCombatTimers 清除，但不影响根因） |
| TowerSystem 的 `inCombat` 标志 | **否** |
| TowerSystem 的 `combatMonster` 引用 | **否** |
| TowerSystem 的 PauseCoordinator subscriber (`TowerCombat`) | **否**（仍在订阅中） |
| `pd.infiniteTower` 存档状态 | **否**（未保存进度） |

### 根因 4：状态污染导致后续异常

回到 WORLDMAP 后，TowerSystem 处于不一致状态：
- `inCombat = true`，`combatMonster` 仍指向战斗中的怪物对象
- PauseCoordinator 的 `TowerCombat` subscriber 仍然注册（`_owner._destroyed` 为 false）
- 存档中 `pd.infiniteTower.isPaused` 为 `false`，`grid` 未被序列化

如果后续发生以下任一操作，残留状态会被驱动：
- 玩家**重新进入塔** → 因 `isPaused=false` 走 `startNew()` 重置 → **侥幸不会出问题**
- 其他代码路径触发了 `PauseCoordinator.instance.resume()` → TowerCombat subscriber 的 `onResume` 回调触发 → `updateStarSpawnIntervalFn()` 重新创建星星生成定时器 → 战斗星星在非塔状态下产生
- `pd.infiniteTower` 存档被 `saveData()` 覆盖 → 下次读档时状态错乱

### 根因 5（潜在）：HP 归零可能触发 TOWER_RESULT

虽然 PAUSED→返回菜单路径中 `combatMonsterAttackTimer` 已被 `stopCombatTimers()` 清除，不会在后台持续扣血，但以下场景仍可能导致 `playerDeath()` 被意外触发：
- PauseCoordinator 被其他代码 resume 后，若塔战斗定时器被重建
- 玩家在暂停前 HP 已经极低，`endGame()` 未做血量保护

---

## 四、涉及的函数和状态

| 函数/代码 | 位置 | 问题 |
|-----------|------|------|
| `towerSystem.endCombat()` | **不存在** | `game.js L4462` 调用了未定义的方法 |
| `endGame()` | `GameLifecycleSystem.js L525` | 不了解塔模式，只清理普通战斗资源 |
| `modeLifecycle.syncActiveMode()` | 从未被调用 | 导致 `getPreviousMode()` / `getActiveMode()` 返回值不可靠 |
| `PauseCoordinator._paused = false` | `game.js L4477` | 直接篡改内部字段，绕过了正常的 resume 回调机制 |
| `cleanupCombat()` | `TowerSystem.js L1053` | 只在 `playerDeath()` / `pauseTower()` 中被调用，返回菜单路径不会调用到它 |
| `pauseTower()` | `TowerSystem.js L1991` | 正确保存进度+清理+回大地图，但没有在 PAUSED→返回菜单路径中被调用 |
| ModeLifecycle `cleanup` | `game.js L3438` | 注册了 `cleanup: pauseTower()`，但仅在 `ModeLifecycle.transitionTo()` 时触发，`setGameState(GAMEOVER)` 不会触发 |

---

## 五、修复建议

### 方案 A（推荐）：修复 `exitMode === 'tower'` 分支

将 `game.js L4461-4463` 的逻辑改为：

```javascript
} else if (exitMode === 'tower') {
    if (towerSystem) towerSystem.pauseTower();  // 保存进度，清理战斗，回 WORLDMAP
}
```

`pauseTower()` 已经正确处理了：
1. 保存怪物残余 HP 到 grid
2. `cleanupCombat()` → 销毁 BattleEngine + unsubscribe PauseCoordinator + 停定时器 + 清 stars
3. 序列化 grid 到存档（`pd.infiniteTower.grid`）
4. `pd.infiniteTower.isPaused = true`
5. `setGameState('WORLDMAP')` → 回到大地图（而非 GAMEOVER）

同时确保 L4477 的 `PauseCoordinator.instance._paused = false` 不会干扰 `pauseTower()` 中已完成的清理（`cleanupCombat` 已经 unsubscribe 了 TowerCombat subscriber，所以不受影响）。

### 方案 B（兜底加固）：ModeLifecycle 同步

在 game.js 的 `setGameStateRaw` 末尾添加 `modeLifecycle.syncActiveMode()`，确保 `activeMode` 始终与当前游戏状态一致。这会影响所有模式的分支判断，需要充分回归测试。

### 额外加固：`playerDeath()` 添加防重入

```javascript
function playerDeath() {
    if (_deathCalled) return;  // 防重入
    _deathCalled = true;
    // ... 原有逻辑 ...
}
```

在 `restartTower()` / `init()` 中重置 `_deathCalled = false`。

---

## 六、影响范围

- **游戏状态机**：`PAUSED → GAMEOVER` 路径中的塔模式分支（L4461-4463）
- **TowerSystem**：`pauseTower()` 已有正确实现，只需正确路由调用
- **GameLifecycleSystem**：`endGame()` 不需要修改（修复后塔模式不再调用它）
- **ModeLifecycleManager**：`syncActiveMode()` 未落地的技术债务（独立修复，非本 bug 阻塞项）
- **不涉及**：普通模式、赛季模式、Boss 模式的结算逻辑