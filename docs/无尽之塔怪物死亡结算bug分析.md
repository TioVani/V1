# 无尽之塔怪物血条空不死亡不结算 — Bug 分析与修复方案

## 问题现象

无尽之塔战斗中，怪物 HP 被扣到 0（血条显示为空），但怪物不进入死亡流程，战斗不结算，格子不被清理。

---

## 一、核心架构脉络

### 1.1 战斗启动流程

```
TowerSystem.startCombat(cell)
  ├── 从 cell.monster 浅拷贝 → combatMonster（战斗中的怪物数据副本）
  ├── 构建 engineConfig（含 combatMonster、preventFinish=true 等）
  ├── NormalBattleAdapter.initTowerEngine(battleEngine, engineConfig)
  │     ├── 设置 towerConfig.extensions.preventFinish = true
  │     ├── 注入 calculateDamageOverrideHook / onStarHitMonsterHook 等扩展
  │     └── battleEngine.init(towerConfig) → S.monster = combatMonster（同引用）
  ├── 启动 combatTimer（每秒 combatTime -= 1，归零触发 combatTimeout）
  └── 启动 combatMonsterAttackTimer（每 attackInterval 触发 monsterAttackPlayer）
```

### 1.2 怪物死亡的双路径设计

**路径 A — 星星点击伤害**（`handleStarClick`）：
```
玩家点击星星
  → calculateDamageOverrideHook() 计算伤害
  → onStarHitMonsterHook() 处理护盾/闪避/吸收，返回 modifiedDamage
  → targetMonster.hp -= actualDamage
  → if (hp <= 0) addPendingDeath(targetMonster)   ← 不立即死亡，加入延迟队列
```

**路径 B — 技能/闪避反击直接伤害**：
```
useSkill() / 闪避反击
  → monster.hp -= damage
  → if (hp <= 0) finishBattle('monsterDeath')   ← 立即触发死亡
  但有保护：if (pendingDeaths.length > 0) return;   ← 不打断消散流程
```

### 1.3 pendingDeaths 消散机制（BattleEngine.update）

```
BattleEngine.update() 每帧调用
  → if (pendingDeaths.length > 0)
      → 检查 deathTime 是否已过 deathDelayMs（默认 1150ms）
      → 若消散完成：
          preventFinish=true → 直接调 callbacks.onMonsterDeath → TowerSystem.defeatMonster()
          preventFinish=false → 调 finishBattle('monsterDeath')
      → return（跳过时间倒计时等后续逻辑）
```

### 1.4 preventFinish 模式下的两个独立时钟

| 时钟 | 归属 | 行为 |
|------|------|------|
| BattleEngine 内部时间 | BattleEngine | `preventFinish=true` 时被跳过（`update()` 中因 pendingDeaths 提前 return） |
| TowerSystem combatTimer | TowerSystem | `startCombat` 中独立启动，**不感知 BattleEngine 的 pendingDeaths 状态**，每秒减 1 |

---

## 二、根因分析

### 2.1 路径1（主因）：战斗时间在消散动画期间耗尽 → 死亡回调被静默销毁

**时序**：

```
T=0    怪物 HP 被扣到 ≤0 → addPendingDeath() 入队
       -- pendingDeaths 消散等待 1150ms --
T=0~1  如果此时 combatTime 仅剩 ≤1 秒：
       TowerSystem.combatTimer 倒计时归零 → combatTimeout() 被调用
       combatTimeout() → cleanupCombat() → battleEngine.destroy()
       → S 状态机被重置，pendingDeaths 队列被丢弃
       → callbacks.onMonsterDeath 永远不会触发
       → 怪物不结算，格子不清理
```

**关键代码位置**：

`BattleEngine.js:976-992` — `update()` 中 pendingDeaths 处理时 `return`，跳过时间倒计时：

```js
if (S.pendingDeaths.length > 0) {
    // ...
    if (now - latestTime >= deathDelayMs) {
        // 触发回调 ...
    }
    return;  // ← 此处 return 后不执行时间倒计时
}
// 时间倒计时（preventFinish 模式跳过）
if (!S.extensions.preventFinish && now - lastTimeTick >= TIME_TICK_MS) { ... }
```

`TowerSystem.js:973-978` — 独立的 `combatTimer`，不检查 BattleEngine 状态：

```js
combatTimer = _tm.setInterval(function() {
    if (!inCombat) return;
    combatTime = Math.max(0, combatTime - 1);
    if (combatTime <= 0) {
        combatTimeout();  // ← 不检查 pendingDeaths
    }
}, 1000);
```

`TowerSystem.js:1311-1328` — `combatTimeout` 直接销毁战斗状态：

```js
function combatTimeout() {
    var remainHp = combatMonster.hp;   // ≤0，不保存 savedHp
    if (remainHp > 0) { ... }
    cleanupCombat();  // ← 销毁 BattleEngine，pendingDeaths 丢失
    // ...
}
```

**触发条件**：战斗剩余时间 < 2 秒时怪物 HP 归零。

### 2.2 路径2（边界）：combatTimeout 与 defeatMonster 的竞态

`cleanupCombat()` 中 `battleEngine.destroy()` 会把 `S` 重置为默认状态（`playerHp=100`）。如果 `cleanupCombat` 被 `combatTimeout` 调用，而同一帧内 TOWER_COMBAT 渲染仍在进行，可能读到 destroy 后的脏数据。

- 此路径概率较低，但防御性处理仍有价值。

---

## 三、修复方案

### 方案 A（治本）：TowerSystem 的 combatTimer 感知 BattleEngine pendingDeaths 状态

修改 `TowerSystem.js` 中 `startCombat` 内的 `combatTimer`：

```js
combatTimer = _tm.setInterval(function() {
    if (!inCombat) return;

    // 如果 BattleEngine 的 pendingDeaths 队列中有怪物正在消散，暂停倒计时
    if (battleEngine) {
        var beState = battleEngine.getState();
        if (beState && beState.pendingDeaths && beState.pendingDeaths.length > 0) {
            return;  // 等待消散完成
        }
    }

    combatTime = Math.max(0, combatTime - 1);
    if (combatTime <= 0) {
        combatTimeout();
    }
}, 1000);
```

**效果**：消散动画期间（≤1150ms）倒计时暂停，确保 `callbacks.onMonsterDeath` 必定触发。

### 方案 B（兜底）：cleanupCombat 中检查 pendingDeaths 并强制结算

修改 `TowerSystem.js` 中 `cleanupCombat`：

```js
function cleanupCombat() {
    // 防御性检查：如果有 pendingDeaths 未结算，先强制触发死亡回调
    // 使用标志位防止 defeatMonster() → cleanupCombat() 递归
    if (!_inCleanupDefend && battleEngine) {
        var beState = battleEngine.getState();
        if (beState && beState.pendingDeaths && beState.pendingDeaths.length > 0) {
            if (combatMonster && combatMonster.hp <= 0) {
                _inCleanupDefend = true;
                defeatMonster();
                _inCleanupDefend = false;
                return;
            }
        }
    }

    // 原有清理逻辑
    _owner._destroyed = true;
    PauseCoordinator.instance.unsubscribe('TowerCombat');
    stopCombatTimers();
    if (battleEngine) battleEngine.destroy();
    if (releaseTowerEngineFn) releaseTowerEngineFn();
    if (clearBattleAnimations) clearBattleAnimations();
    if (clearStars) clearStars();
    combatMonster = null;
    inCombat = false;
}
```

**效果**：即使因任何原因 `combatTimeout` 在 `pendingDeaths` 消散前被调用，也能强制完成死亡结算。

### 推荐实施方案

**同时应用方案 A + 方案 B**：

- 方案 A 治本：从源头消除时序竞态，正常流程中消散动画不会被超时打断。
- 方案 B 兜底：覆盖异常路径（如多 timer 并发、快速操作边缘情况），确保已有 pendingDeaths 不会被静默丢弃。

---

## 四、影响范围评估

| 文件 | 修改内容 | 风险评估 |
|------|----------|----------|
| `TowerSystem.js` — `startCombat` 中的 `combatTimer` 回调 | 增加 pendingDeaths 检查 | **低风险**：只增加一个早期返回分支，不改变正常流程 |
| `TowerSystem.js` — `cleanupCombat` | 增加 pendingDeaths 防御性检查 | **低风险**：只在不具备 pendingDeaths 的正常流程中多一次空检查 |

- 不影响普通模式战斗（普通模式不使用 `preventFinish`）。
- 不影响塔模式隐藏之路 Boss（`isHiddenPathBoss=true` 时不走 BattleEngine 路径）。
- 对正常击杀流程（HP 归零后 2 秒以上剩余时间）无任何影响。

---

## 五、实现备注

方案 B 使用 `_inCleanupDefend` 防御标志位阻止 `defeatMonster()` → `cleanupCombat()` 的递归调用。需在 `TowerSystem` 闭包顶部声明该变量：

```js
var _inCleanupDefend = false;
```