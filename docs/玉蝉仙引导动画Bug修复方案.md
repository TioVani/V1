# 玉蝉仙引导动画 Bug 修复方案

## 问题描述

落地后出现 3 个问题：

| # | 现象 | 严重程度 |
|---|------|---------|
| 1 | 文字不在气泡内，偏移到气泡外部 | 视觉 bug |
| 2 | 还没说"来，先尝试点击一下灵光吧~"，直接显示"就是这样！！" | 逻辑 bug |
| 3 | 点击不了灵光，tutorial 战斗无法进行 | 阻断 bug |

---

## 根因分析

### Bug 1：文字不在气泡内

**文件**：`V1/src/systems/DialogueSystem.js`

**根因**：`bubbleOffsetY` 的计算基准有误。

原设计意图：气泡应该显示在立绘**上方**。但实际上 `guideAnim.bubbleOffsetY: -30` 是相对 `posY`（立绘**顶部**）的偏移。立绘高 160px，`posY` 是顶部坐标。`-30` 意味着气泡底边在立绘顶部再往上 30px——这个间距偏大，导致气泡飘太远。

同时在 `renderBubble` 中（约第 370 行），`ctx.font` 在计算 `wrapText` 时已设置，但 `fillText` 前没有再次确认 `textBaseline = 'top'`。在某些 Canvas 状态下 `textBaseline` 可能被其他渲染代码改为 `'alphabetic'`，导致文字以基线对齐而非顶部对齐，文字向下偏移超出气泡底边。

### Bug 2：跳过第一句直接说"就是这样！！"

**文件**：`V1/src/systems/SceneDispatcher.js`（`registerBattleTriggers`）

**根因**：时序竞争——`battle_start` trigger 和 `first_star_click` trigger **同时注册**，但 `battle_start` 有 800ms 延迟。

实际时序：
```
t=0ms    SceneDispatcher.registerBattleTriggers 被调用
         ├─ battle_start setTimeout(800ms) 被注册
         └─ first_star_click callback 被注册（立即生效）

t=200ms  tutorial 战斗中灵光出现
         如果此时玩家点了灵光（或下落灵光自动触底判定）
           → _firstStarClickCallback 被触发
           → advance() 被调用，但 _guideState.active === false → 直接 return
           → _firstStarClickCallback 被置 null（一次性回调被消耗）

t=800ms  play() 被调用，guide_anim 启动
         但 first_star_click 回调已经没了
```

由于 `_firstStarClickCallback` 是一次性的，被消耗后就消失了。另一种情况：如果 `first_star_click` 回调在 `play()` 之后、`sliding_in` 完成之前触发，`advance()` 会因 `phase === 'sliding_in'` 而跳到 showing 并设置 `bubbleText` 为"就是这样！！"——这就是用户看到的"还没说第一句就说第二句"。

### Bug 3：点击不了灵光

**文件**：`V1/src/systems/NormalBattleAdapter.js`（`handleStarClick`，约第 963 行）

**根因**：状态白名单遗漏 `GAME_STATE.TUTORIAL`。

```javascript
if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.SEASON_PLAYING &&
    state !== GAME_STATE.STAGE_PLAYING && !isTower && !isBoss) {
    return false;
}
```

TUTORIAL 状态不在上述列表中，直接 `return false`。灵光点击被硬阻断。

---

## 修复方案

### 修复 1：文字不在气泡内

**文件**：`V1/src/systems/DialogueSystem.js`

**修改点 A** — `renderBubble` 函数中，`fillText` 前强制设置 `textBaseline` 和 `font`：

```javascript
// 在 renderBubble 的文字绘制前（约第 369-372 行间）
ctx.fillStyle = '#333';
ctx.font = '14px sans-serif';          // ← 确保与 wrapText 时一致
ctx.textBaseline = 'top';              // ← 强制顶部对齐
for (var i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], bx + padding, by + padding + i * lineHeight);
}
```

**修改点 B** — `DialogueConfig.js` 中 `guideAnim.bubbleOffsetY` 调整。

`bubbleOffsetY` 的语义是：气泡**底边**相对于立绘**顶部**（`posY`）的偏移。负值 = 气泡在立绘上方。

```javascript
bubbleOffsetY: -30,   // 原值：气泡距立绘顶部 30px，偏远
// 改为：
bubbleOffsetY: -5,    // 气泡底边紧贴立绘顶部上方 5px
```

### 修复 2：跳过第一句直接说第二句

**文件**：`V1/src/systems/SceneDispatcher.js` 和 `V1/src/systems/DialogueSystem.js`

**策略**：不提前注册 `first_star_click` 回调。改为 `play()` 时传入所有 triggers 数据，sliding_in 完成时由 DialogueSystem 自己注册回调，advance() 从 triggers 数组中取下一段。

**修改点 A** — `SceneDispatcher.js` 的 `registerBattleTriggers`：

```javascript
function registerBattleTriggers(inBattleConfig) {
    if (inBattleConfig.mode === 'guide_anim') {
        var battleStartTrigger = inBattleConfig.triggers.find(function(t) { return t.at === 'battle_start'; });
        if (battleStartTrigger) {
            setTimeout(function() {
                dialogueSystem.play({
                    mode: 'guide_anim',
                    guideAnim: inBattleConfig.guideAnim,
                    triggers: inBattleConfig.triggers,   // 全部 trigger 数据
                    startIndex: 0,                        // 从第 0 条 (battle_start) 开始
                });
            }, battleStartTrigger.delayMs);
        }
        // first_star_click 不再在此处注册，由 DialogueSystem 在滑入完成后自行注册
    }
}
```

**修改点 B** — `DialogueSystem.js` 的 `play()`：

```javascript
if (opts.mode === 'guide_anim') {
    var cfg = opts.guideAnim;
    var startIdx = opts.startIndex || 0;
    var firstLine = (opts.triggers && opts.triggers[startIdx])
        ? opts.triggers[startIdx].lines[0] : '';
    _guideState.active = true;
    _guideState.characterId = cfg.characterId;
    _guideState.config = cfg;
    _guideState.bubbleText = firstLine;
    _guideState.phase = 'sliding_in';
    _guideState.phaseTimer = 0;
    _guideState.opacity = 1;
    _guideState.bubbleOpacity = 0;
    _guideState._needsCoordInit = true;
    _guideState._triggers = opts.triggers || [];   // ← 存储全部 triggers
    _guideState._triggerIndex = startIdx + 1;       // ← 指向下一条（first_star_click）
    return;
}
```

**修改点 C** — `DialogueSystem.js` 的 `update()` 中 sliding_in 完成时注册事件：

```javascript
case 'sliding_in':
    var t = Math.min(1, _guideState.phaseTimer / _guideState.config.slideInDuration);
    _guideState.posX = _guideState.startX + (_guideState.targetX - _guideState.startX) * easeOutCubic(t);
    if (t >= 1) {
        _guideState.posX = _guideState.targetX;
        _guideState.phase = 'showing';
        _guideState.phaseTimer = 0;

        // 滑入完成：如果有下一条 trigger 且需要等待事件，注册回调
        var nextTrigger = _guideState._triggers[_guideState._triggerIndex];
        if (nextTrigger && nextTrigger.at === 'first_star_click' && _deps.registerFirstStarClick) {
            _guideState.waitForEvent = nextTrigger.waitFor;
            _deps.registerFirstStarClick(function() {
                advance();  // advance 内部自动取 _triggerIndex 指向的 trigger
            });
        }
    }
    break;
```

**修改点 D** — `DialogueSystem.js` 的 `advance()` 改为从 `_triggers` 数组中取值：

```javascript
function advance() {
    if (!_guideState.active) return;

    // 如果还在滑入中，直接跳到目标位置
    if (_guideState.phase === 'sliding_in') {
        _guideState.posX = _guideState.targetX;
        _guideState.phase = 'showing';
        _guideState.phaseTimer = 0;
    }

    if (_guideState.phase !== 'showing') return;

    // 从 _triggers 数组取当前段的数据
    var trigger = _guideState._triggers[_guideState._triggerIndex];
    if (trigger && trigger.lines && trigger.lines.length > 0) {
        _guideState.bubbleText = trigger.lines[0];
        _guideState.bubbleOpacity = 0;
        _guideState.phaseTimer = 0;
    }
    var waitFor = trigger ? trigger.waitFor : null;

    // 移到下一条
    _guideState._triggerIndex++;

    // 如果没有下一条（waitFor === null 或已是最后一条），启动滑出计时
    if (!waitFor && _guideState.config.bubbleHoldAfterLast > 0) {
        setTimeout(function() {
            if (_guideState.active && _guideState.phase === 'showing') {
                _guideState.phase = 'sliding_out';
                _guideState.phaseTimer = 0;
            }
        }, _guideState.config.bubbleHoldAfterLast);
    }
}
```

### 修复 3：点击不了灵光

**文件**：`V1/src/systems/NormalBattleAdapter.js`（`handleStarClick`，约第 960-965 行）

**修改**：在白名单中追加 `GAME_STATE.TUTORIAL`：

```javascript
// 原：
if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.SEASON_PLAYING &&
    state !== GAME_STATE.STAGE_PLAYING && !isTower && !isBoss) {
    return false;
}

// 改为：
if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.SEASON_PLAYING &&
    state !== GAME_STATE.STAGE_PLAYING && state !== GAME_STATE.TUTORIAL &&
    !isTower && !isBoss) {
    return false;
}
```

---

## 涉及文件清单

| 文件 | 改动 | 说明 |
|------|------|------|
| `V1/src/systems/DialogueSystem.js` | ① `renderBubble` 中 fillText 前强制设置 font + textBaseline<br>② `play()` 存储 `_triggers` 数组 + `_triggerIndex`<br>③ `update()` 中 sliding_in 完成时注册 firstStarClick 回调<br>④ `advance()` 改为从 `_triggers` 数组取值 | Bug 1 + Bug 2 |
| `V1/src/config/DialogueConfig.js` | `guideAnim.bubbleOffsetY` 从 `-30` 改为 `-5` | Bug 1 |
| `V1/src/systems/SceneDispatcher.js` | `registerBattleTriggers` 移除 firstStarClick 立即注册，改为传入全部 triggers | Bug 2 |
| `V1/src/systems/NormalBattleAdapter.js` | `handleStarClick` 状态白名单追加 `GAME_STATE.TUTORIAL` | Bug 3 |

---

## 实施步骤

1. **Bug 3 优先（阻断）** — 修改 `NormalBattleAdapter.js` 状态白名单，恢复灵光点击
2. **Bug 2 修复** — 修改 SceneDispatcher 移除提前注册 + DialogueSystem 改用 `_triggers` 数组管理
3. **Bug 1 修复** — 修改 DialogueSystem 的 `renderBubble` 强制字体基线 + 调整 `bubbleOffsetY`
4. **联调验证** — 确认流程：滑入 → 气泡紧贴立绘上方 → 文字在气泡内 → 点击灵光 → 文字切换 → 滑出

---

## 验证清单

| 验证项 | 预期结果 |
|--------|---------|
| 玉蝉仙滑入 | 从左侧屏幕外滑入到 15% 位置，约 400ms |
| 气泡弹出 | 气泡紧贴立绘上方，文字"来，先尝试点击一下灵光吧~"居中在气泡内 |
| 灵光可点击 | 点击灵光后正常造成伤害，怪物正常受击 |
| 首次点击触发 | 首次点击灵光时气泡切换为"就是这样！！"，绝不是滑入前就切换 |
| 文字不丢失 | advance() 从 _triggers 数组正确取出第二段文字"就是这样！！" |
| 玉蝉仙滑出 | "就是这样！！"显示约 800ms 后立绘向右滑出，气泡渐隐 |
| 战斗正常结束 | tutorial 战斗结束后正常弹出 victoryPopup |