# PauseCoordinator 统一暂停调度器 落地方案

> 将暂停从"各系统各自维护 + 按模式分支调用"改为"单一调度器 + 子系统注册回调"的模式。

---

## 一、方案概述

**改造前的问题**：
- 暂停入口按 4 种模式分支，每个分支调不同函数
- 补偿逻辑散落在 `BattleEngine`、`BossBattleAdapter`、`GameLifecycleSystem` 三处
- 新加一个带独占子系统的战斗模式，需要在 game.js 新增分支 + 在多个文件补暂停逻辑
- 广告暂停（`AdSystem`）走独立路径，不与战斗暂停共享调度

**改造后的模型**：

```
PauseCoordinator (单例)
  ├── subscribe(owner, name, { onPause, onResume })   注册（owner 用于存活校验）
  ├── unsubscribe(name)                                 注销
  ├── pause()                  遍历幸存 subscriber.onPause()
  ├── resume()                 算 duration，遍历幸存 subscriber.onResume(duration)
  ├── isPaused                 getter
  └── getPauseDuration()       暂停时长


game.js 暂停按钮
  → PauseCoordinator.pause()        ← 所有模式同一条路径
  → StateMachine.transitionTo(PAUSED)

game.js 继续/退出按钮
  → PauseCoordinator.resume()
  → StateMachine.transitionTo(...)

AdSystem 广告暂停
  → PauseCoordinator.pause()        ← 也走同一条调度路径
  → （广告关闭后 resume）

新加战斗模式
  → 不需要改 game.js
  → 公共子系统（BattleEngine/StarSystem 等）在进入战斗时统一注册、退出时统一注销
  → 独占子系统自行注册/注销即可
```

---

## 二、核心文件：PauseCoordinator.js

新建 `e:\AIGame\V1\src\utils\PauseCoordinator.js`

```js
export class PauseCoordinator {
  static _instance = null;

  static get instance() {
    if (!PauseCoordinator._instance) {
      PauseCoordinator._instance = new PauseCoordinator();
    }
    return PauseCoordinator._instance;
  }

  constructor() {
    this._paused = false;
    this._pauseStartTime = 0;
    this._subscribers = [];      // [{ owner, name, onPause, onResume }]
  }

  /**
   * 注册一个子系统
   * @param {object}  owner  - 子系统实例，用于存活校验（为 null 时跳过存活检查）
   * @param {string}  name   - 唯一标识名，同名覆盖
   * @param {function} opts.onPause  - 暂停时调用
   * @param {function} opts.onResume - 恢复时调用，接收 duration(ms)
   */
  subscribe(owner, name, opts) {
    const entry = { owner, name, onPause: opts.onPause, onResume: opts.onResume };
    const idx = this._subscribers.findIndex(s => s.name === name);
    if (idx >= 0) {
      this._subscribers[idx] = entry;
    } else {
      this._subscribers.push(entry);
    }
  }

  /** 取消注册（子系统销毁时调用） */
  unsubscribe(name) {
    this._subscribers = this._subscribers.filter(s => s.name !== name);
  }

  get isPaused() {
    return this._paused;
  }

  pause() {
    if (this._paused) return;
    this._paused = true;
    this._pauseStartTime = Date.now();
    // 清理已销毁的 subscriber，只调用存活的
    this._subscribers = this._subscribers.filter(s => {
      if (s.owner != null && !s._isAlive(s.owner)) return false;
      try { s.onPause(); } catch (e) { console.error(`[PauseCoordinator] onPause ${s.name}:`, e); }
      return true;
    });
  }

  resume() {
    if (!this._paused) return;
    const duration = Date.now() - this._pauseStartTime;
    this._paused = false;
    this._pauseStartTime = 0;
    this._subscribers = this._subscribers.filter(s => {
      if (s.owner != null && !s._isAlive(s.owner)) return false;
      try { s.onResume(duration); } catch (e) { console.error(`[PauseCoordinator] onResume ${s.name}:`, e); }
      return true;
    });
  }

  getPauseDuration() {
    return this._paused ? Date.now() - this._pauseStartTime : 0;
  }

  /**
   * 存活校验：检查对象是否存在且未被销毁。
   * 规则：若非 HTMLElement，检查 ._destroyed !== true；HTMLElement 检查 document.contains()。
   */
  _isAlive(obj) {
    if (obj._destroyed === true) return false;
    if (typeof Element !== 'undefined' && obj instanceof Element) {
      return document.contains(obj);
    }
    return true;
  }
}
```

---

## 三、各子系统注册清单

### 3.1 AnimationSystem（全局常驻）

**文件**：`AnimationSystem.js`

```js
// App 启动时注册一次（全局存活，无需 unregister）
PauseCoordinator.instance.subscribe(null, 'AnimationSystem', {
  onPause: () => {
    this._pauseStartTime = Date.now();
  },
  onResume: (duration) => {
    this._pauseAccumulated += duration;
    this._pauseStartTime = null;
  }
});
```

**拆除**：删除原有的 `pauseAnimations()` / `resumeAnimations()` 公开方法。

---

### 3.2 BattleEngine（战斗生命周期）

**文件**：`BattleEngine.js`

```js
// 战斗引擎初始化时注册，销毁前 unregister
PauseCoordinator.instance.subscribe(this, 'BattleEngine', {
  onPause: () => {
    this.phase = 'paused';
    this.pauseStartTime = Date.now();
  },
  onResume: (duration) => {
    // 补偿所有时间状态
    if (this.comboStarStartTime) this.comboStarStartTime += duration;
    if (this.poisonEndTime) this.poisonEndTime += duration;
    if (this.poisonTickTime) this.poisonTickTime += duration;
    if (this.stunEndTime) this.stunEndTime += duration;
    if (this.dodgeEndTime) this.dodgeEndTime += duration;
    for (const atk of this.attackers) {
      if (atk.lastAttackTime) atk.lastAttackTime += duration;
    }
    for (const pd of this.pendingDeaths) {
      if (pd.deathTime) pd.deathTime += duration;
    }
    if (this.petLastAttackTime) this.petLastAttackTime += duration;
    this.phase = this._phaseBeforePause || 'active';
  }
});
```

**拆除**：删除 `BattleEngine.pause()` 和 `BattleEngine.resume()` 公开方法。

---

### 3.3 StarSystem（星星生存时间补偿）

**文件**：`StarSystem.js`

```js
PauseCoordinator.instance.subscribe(this, 'StarSystem', {
  onPause: () => {},
  onResume: (duration) => {
    for (const star of this.stars) {
      if (star.disappearTime) star.disappearTime += duration;
      if (star.createTime) star.createTime += duration;
    }
  }
});
```

---

### 3.4 StarThiefSystem

**文件**：`StarThiefSystem.js`

```js
PauseCoordinator.instance.subscribe(this, 'StarThief', {
  onPause: () => {
    clearTimeout(this.starTimer);
  },
  onResume: (duration) => {
    if (this.breakEndTime) this.breakEndTime += duration;
    if (this.state !== 'breaking') this._startStarTimer();
  }
});
```

**拆除**：删除 `StarThiefSystem.pause()` / `resumeThief()` 公开方法，保留内部 `_startStarTimer()`。

---

### 3.5 BossStarSystem

**文件**：`BossStarSystem.js`

```js
PauseCoordinator.instance.subscribe(this, 'BossStars', {
  onPause: () => {
    clearInterval(this._starSpawnTimer);
  },
  onResume: (duration) => {
    for (const star of this.bossStars) {
      if (star.disappearTime) star.disappearTime += duration;
    }
    this._startStarSpawnTimer();
  }
});
```

---

### 3.6 PetSystem

**文件**：`PetSystem.js`

```js
PauseCoordinator.instance.subscribe(this, 'PetSystem', {
  onPause: () => {
    clearInterval(this._attackTimer);
  },
  onResume: () => {
    this._startAttackTimer();
  }
});
```

---

### 3.7 StageModeSystem — 闪避星定时器

**文件**：`StageModeSystem.js`

```js
PauseCoordinator.instance.subscribe(this, 'StageDodgeStar', {
  onPause: () => {
    this.stopDodgeStarTimer();
  },
  onResume: () => {
    if (this._dodgeStarConfig) this._startDodgeStarTimer(this._dodgeStarConfig);
  }
});
```

闯关的其余定时器（计时器、星生成、怪物攻击）由下面的 `ModeTimers` 统一管理。

---

### 3.8 TowerSystem — 塔战斗瞬时暂停

**文件**：`TowerSystem.js`

```js
PauseCoordinator.instance.subscribe(this, 'TowerCombat', {
  onPause: () => {
    clearInterval(this._combatTimer);
    clearInterval(this._starSpawnTimer);
  },
  onResume: () => {
    this._startCombatTimer();
    this._startStarSpawnTimer();
  }
});
```

塔的持久化暂停（`pauseTower`）保持独立 — 它是序列化存档，不是时间补偿问题。

---

### 3.9 ModeTimers — 游戏主循环定时器组

**文件**：`ModeLifecycleManager.js`

不再作为 subscriber 注册，而是由 `ModeLifecycleManager` 在 PauseCoordinator 中维持一个持久引用。

```js
// 在 ModeLifecycleManager 初始化时
PauseCoordinator.instance._modeTimerCallbacks = {
  onPause: () => this.timerManager.clearAll(),
  onResume: () => this._rebuildTimersForCurrentMode()
};

// PauseCoordinator 的 pause() / resume() 在遍历 subscribers 之后，
// 额外调用 _modeTimerCallbacks（如果存在）。
```

**或者更简单**：将 `ModeTimers` 视为一个无 owner 的 subscriber：

```js
PauseCoordinator.instance.subscribe(null, 'ModeTimers', {
  onPause: () => this.timerManager.clearAll(),
  onResume: () => this._rebuildTimersForCurrentMode()
});
```

**选择方式二**，更统一。`ModeLifecycleManager` 在创建 `TimerManager` 时注册。

---

### 3.10 子系统的 register/unregister 调用时机

| 子系统 | register 时机 | unregister 时机 |
|--------|-------------|---------------|
| AnimationSystem | App 启动时（全局常驻） | 无需 |
| ModeTimers | ModeLifecycleManager 初始化时（全局常驻，但 onPause/onResume 根据当前模式动态行为） | 无需 |
| BattleEngine | 进入战斗时 | `BattleEngine.destroy()` 时 |
| StarSystem | 进入战斗时 | 退出战斗时 |
| StarThiefSystem | 进入战斗时 | 退出战斗时 |
| BossStars | Boss 战斗 `init()` 时 | Boss 战斗 `destroy()` 时 |
| PetSystem | 宠物激活/切换时 | 宠物销毁时 |
| StageDodgeStar | 闯关模式 `startStageGame()` 时 | 闯关模式 `endStageGame()` 时 |
| TowerCombat | 塔战斗 `init()` 时 | 塔战斗 `destroy()` / 退出时 |

---

## 四、game.js 入口简化

### 4.1 暂停触发

**改造前**（行 3918-3933）：

```js
if (pauseAnimations) pauseAnimations();
if (state === GAME_STATE.STAGE_PLAYING) {
    stageModeSystem.togglePause();
} else if (state === GAME_STATE.BOSS_BATTLE) {
    bossBattleSystem.togglePause();
} else if (state === GAME_STATE.TOWER_COMBAT) {
    modeLifecycle.syncActiveMode();
    modeLifecycle.pauseActive();
    stateMachine.transitionTo(GAME_STATE.PAUSED);
} else {
    modeLifecycle.syncActiveMode();
    modeLifecycle.pauseActive();
    pauseGame();
}
```

**改造后**：

```js
PauseCoordinator.instance.pause();
stateMachine.transitionTo(GAME_STATE.PAUSED);
```

### 4.2 恢复

**改造前**（行 4120-4185）按模式分支 4 条恢复路径。

**改造后**：

```js
// 继续按钮
PauseCoordinator.instance.resume();
stateMachine.transitionTo(previousState);

// 重新开始按钮
PauseCoordinator.instance.resume();
currentMode.restart();            // 模式自己重新初始化

// 退出按钮
PauseCoordinator.instance.resume();
stateMachine.transitionTo(GAME_STATE.WORLDMAP);
```

`previousState` 由 `game.js` 在调用 `pause()` 之前保存：

```js
// 暂停按钮点击时
previousState = stateMachine.currentState();
PauseCoordinator.instance.pause();
stateMachine.transitionTo(GAME_STATE.PAUSED);
```

### 4.3 广告暂停

**改造前**（`AdSystem.js` 行 195-199）：

```js
pauseGameTimers();
stopDodgeStarTimer();
stopPetAttackTimer();
```

**改造后**：

```js
PauseCoordinator.instance.pause();
```

（因为 DodgeStarTimer 和 PetAttackTimer 已经注册为 subscriber，PauseCoordinator 会统一调用它们的 onPause。）

广告关闭时的恢复同理：

```js
// 改造前：resumeGame()
// 改造后：
PauseCoordinator.instance.resume();
// 战斗已结束的情况：resume 时所有战斗 subscriber 已被 unregister，所以什么都不会误恢复
```

---

## 五、渲染层简化

**文件**：`GameBattleRenderer.js`

```js
// 改造前
this._paused = (state === PAUSED || this._bossPaused);

// 改造后
this._paused = PauseCoordinator.instance.isPaused;
```

---

## 六、模式生命周期管理器精简

**文件**：`ModeLifecycleManager.js`

```js
pauseActive() {
  PauseCoordinator.instance.pause();
  stateMachine.transitionTo(GAME_STATE.PAUSED);
}

resumeActive(ctx) {
  PauseCoordinator.instance.resume();
  stateMachine.transitionTo(ctx.previousState);
}
```

原有的定时器清理/重建逻辑由 `ModeTimers` subscriber 接管。

---

## 七、改动文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `src/utils/PauseCoordinator.js` | 统一暂停调度器（约 90 行） |
| **修改** | `src/systems/AnimationSystem.js` | 注册 subscriber，删除 pauseAnimations/resumeAnimations |
| **修改** | `src/systems/BattleEngine.js` | 注册 subscriber（带 owner 存活校验），删除 pause/resume |
| **修改** | `src/systems/StarSystem.js` | 注册 subscriber |
| **修改** | `src/systems/StarThiefSystem.js` | 注册 subscriber，删除 pause/resumeThief |
| **修改** | `src/systems/BossStarSystem.js` | 注册 subscriber |
| **修改** | `src/systems/PetSystem.js` | 注册 subscriber |
| **修改** | `src/systems/StageModeSystem.js` | 注册 subscriber（闪避星），删除 togglePause 中定时器操作 |
| **修改** | `src/systems/TowerSystem.js` | 注册 subscriber，删除 pauseCombat/resumeCombat 中定时器操作 |
| **修改** | `src/systems/BossBattleAdapter.js` | 删除 togglePause 中的定时器操作和补偿代码 |
| **修改** | `src/systems/GameLifecycleSystem.js` | 删除 pauseGame/resumeGame 中的定时器操作和补偿代码 |
| **修改** | `src/systems/ModeLifecycleManager.js` | 精简 pauseActive/resumeActive，注册 ModeTimers subscriber |
| **修改** | `src/systems/AdSystem.js` | `pauseGameTimers` + `stopDodgeStarTimer` + `stopPetAttackTimer` 替换为 `PauseCoordinator.instance.pause()` |
| **修改** | `game.js` | 暂停/恢复入口从多分支简化；新增 `previousState` 变量 |
| **修改** | `src/renderers/GameBattleRenderer.js` | `_paused` 改为单一来源 |
| **修改** | `src/state/StateMachine.js` | 补充 `paused → tower_resume` 转移 |

---

## 八、新模式接入示例

假设新增"竞速模式"，带一个独占的"时间衰减沙漏"系统：

```js
// 1. 沙漏系统初始化时注册
PauseCoordinator.instance.subscribe(this, 'Hourglass', {
  onPause: () => {
    clearInterval(this._decayTimer);
  },
  onResume: (duration) => {
    this._decayEndTime += duration;
    this._startDecayTimer();
  }
});

// 2. 沙漏系统销毁时注销
PauseCoordinator.instance.unsubscribe('Hourglass');

// 3. 公共子系统在进入战斗时统一注册（BattleEngine、StarSystem 等），
//    竞速模式如果用的是同一套战斗入口，不需要额外操作。

// 4. 竞速模式退出时，公共子系统由战斗退出统一注销。
```

竞速模式作者总共只写一个 subscriber 对象（+ unregister），不碰 `game.js`、`BattleEngine`、`StateMachine`。

---

## 九、边缘情况处理

### 9.1 模式切换残留

`pause()` 遍历 subscriber 前会调用 `_isAlive()` 过滤掉已销毁的 owner（检查 `_destroyed` 标记）。防止 Boss 战斗退出但 `BossStars` subscriber 未及时 unregister 导致死回调。

### 9.2 广告暂停的兼容性

广告弹出时可能在任何状态下（非战斗页面也可能），此时 PauseCoordinator.pause() 遍历所有 subscriber — 但战斗 subscriber 要么未注册（非战斗页）、要么正常工作（战斗页）。广告关闭后 resume() 同样安全：未注册的无影响，已注册的正常恢复。

### 9.3 恢复状态缺失

`game.js` 在调用 `pause()` 前保存 `previousState`，恢复时使用。不再依赖各系统内部记忆（如 `BossBattleAdapter._phaseBeforePause`）。

---

## 十、风险与回滚策略

- **回滚**：PauseCoordinator 是单向依赖（各子系统依赖它，它不依赖任何子系统）。如果出问题，把 game.js 的暂停入口改回原来的分支调用即可，subscriber 注册代码保留也无害（PauseCoordinator 不被调用时不会触发任何副作用）。
- **测试重点**：
  1. 4 种模式各测暂停→继续、暂停→重新开始、暂停→退出
  2. 战斗中弹广告→关闭广告→战斗继续
  3. 非战斗页面弹广告→关闭广告→页面正常
  4. 时间补偿正确（中毒/眩晕/闪避不会因暂停提前结束或多延续）
  5. 快速切换模式时 subscriber 无残留

---

## 十一、相关文档

- 暂停现状分析：`e:\AIGame\V1\暂停脉络汇总.md`
- 本方案为唯一落地方案，汇总文档第十章指向本文档，避免双份维护。