# GAMEOVER 渲染赛季模式误判修复

## 问题描述

无尽之塔（或其他非赛季模式）进入 GAMEOVER 时，错误渲染了赛季模式的结算界面（赛季分数、排名、"赛季结束"标题）。

## 根因分析

GAMEOVER 的赛季判定有两处，都依赖 `seasonSelection.character` 是否为空：

**game.js L5337（触摸处理）：**

```javascript
const isSeasonMode = seasonSelection.character !== null;
```

**MenuRenderer.js L837-838（渲染）：**

```javascript
var isSeasonMode = (state === GAME_STATE.SEASON_PLAYING ||
    (pd.seasonData && pd.seasonData.selection && pd.seasonData.selection.character));
```

`seasonSelection` 只在以下时机被清空：

- 进入赛季菜单（重置选择）
- 赛季选择界面点击"重置"按钮
- 赛季 GAMEOVER 的"返回菜单"按钮

**非赛季模式（无尽之塔、普通战斗、闯关、Boss）结束时从不清理 `seasonSelection`。**

如果玩家之前玩过赛季模式，`seasonSelection.character` 有残留值，后续任何模式的 GAMEOVER 都会被误判为赛季结算。

## 方案评估

| 方案 | 改动点 | 新状态 | 每新增模式要改 | 可靠性 |
|------|--------|--------|:---:|:---:|
| `_lastGameWasSeason` 全局标志位 | 4-5处 | 1个变量 | 是 | 依赖手动维护 |
| **`endSeasonGame` 末尾清空 `seasonSelection`** | **1处** | **无** | **否** | **高** |
| 用 `modeLifecycle.getPreviousMode()` | 2处 | 无 | 否 | 不可靠（从未 sync） |

## 修复方案

在 `endSeasonGame()` 末尾，GAMEOVER 渲染完成后清空 `seasonSelection`。让 `seasonSelection` 的生命周期变成：**赛季战斗开始前赋值 → 赛季战斗结束即清**。

### 代码改动

**`src/systems/GameLifecycleSystem.js` — `endSeasonGame()` 末尾追加：**

在 `saveData()` 之后、函数结束前：

```javascript
// 清空赛季选择，防止其他模式的 GAMEOVER 误判为赛季结算
// 放在 saveData 之后，不影响持久化
if (setSeasonSelection) {
    setSeasonSelection({ character: null, skills: [], pet: null, starTypes: [] });
}
```

### 时序安全

`endSeasonGame()` 的执行顺序：

```
setGameState(GAMEOVER)
→ clearTimer(定时器清理)
→ uploadScore(上传分数)
→ 排行榜处理
→ saveData(持久化)
→ 清空 seasonSelection     ← 新增
```

`renderGameOver` 在 `setGameState(GAMEOVER)` 后的同一帧渲染，此时 `seasonSelection` 仍有值，结算界面正常显示。下一帧 `seasonSelection` 已清空，但不影响已进入的 GAMEOVER 显示状态。

### 不改动的地方

- `renderGameOver` 的赛季判定逻辑不变
- GAMEOVER 触摸处理的赛季判定不变
- 非赛季战斗入口不需要任何额外处理

### 注意事项

如果在 `endSeasonGame` 调用后再读取 `seasonSelection`（如延迟回调），会读到 null。当前代码没有这种场景。