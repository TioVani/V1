# WorldMapPlayer 碰撞滑动优化方案

## 问题

当前 `movePlayer` 轴分离碰撞判定是二值的——`checkCollision(newX, pos.y)` 返回 true 则 X 轴完全不更新。玩家斜向贴墙时，X 轴刚进入碰撞半径就被否决，Y 轴只剩微量推进，体感就是完全定住不动。

## 根因

每一步移动的位移量是 `dx × speed × dt`（约 3.3px），而碰撞判定以圆心为基准、半径为 `_playerRadius`（12px）。一旦圆心进入碰撞体的 12px 以内就被判为碰撞。步长虽小，但没有"滑到紧贴墙面"的能力——要么走全量，要么不走，中间没有合法态。

## 方案：轴分离 + 二分搜索最大合法步长

保持现有轴分离骨架不变，但将每个轴的"走/不走"二值判定替换为**沿该轴二分搜索最大合法步长**。

### 算法流程

```
movePlayer(dx, dy, dt):
    1. 归一化方向
    2. stepX = dx × speed × dt
    3. stepY = dy × speed × dt

    // X轴: 二分搜索从pos.x出发沿stepX方向的最大合法位置
    actualX = tryMoveAxis(pos.x, stepX, (x) => !checkCollision(x, pos.y))

    // Y轴: 以actualX后的位置为基准，二分搜索Y方向最大合法位置
    actualY = tryMoveAxis(pos.y, stepY, (y) => !checkCollision(actualX ?? pos.x, y))

    4. 应用 actualX, actualY
    5. 边界 clamp
    6. 两轴都为零步长且嵌在碰撞体内 → pushOutOfCollision 兜底

tryMoveAxis(start, fullStep, isValid):
    if fullStep == 0 → return null                    // 无位移量
    if !isValid(start) → return null                  // 当前位置已不合法，交给 pushOut 兜底
    if isValid(start + fullStep) → return start + fullStep  // 全量通过，无碰撞

    // 二分: lo=0(不移动,已确认合法), hi=|fullStep|(全量,已被否决)
    sign = sign(fullStep)
    lo = 0, hi = abs(fullStep), best = 0
    循环 8 轮:
        mid = (lo + hi) / 2
        if isValid(start + sign × mid): best=mid, lo=mid
        else: hi=mid
    if best > 0.5 → return start + sign × best        // 最小阈值 0.5px，过滤浮点噪声
    else → return null                                  // 退回 pushOut
```

### 效果对比

| 场景 | 当前 | 优化后 |
|------|------|--------|
| 45°角贴墙移动 | 两轴都否决，停在原地 | X轴二分到紧贴墙面（误差 < stepX/256 ≈ 0.01px），Y轴正常推进，沿墙滑行 |
| 正面撞墙 | 定住 | 二分到距墙面 0~0.01px，贴墙站立 |
| 墙角被卡 | 完全不能动 | at least one axis finds legal step |
| 正常行走（无碰撞） | 正常 | 首轮 `isValid(start+fullStep)` 即通过，无额外开销 |

### 性能

- 每帧额外开销 = 8 轮二分 × 2 轴 × checkCollision
- checkCollision 在像素位图模式下扫 `π × 12² ≈ 452` 像素
- 额外开销约 16 × 452 = 7200 次像素比较/帧，随机内存访问友好，无 GC 压力
- 正常无碰撞路径：首轮通过，零额外开销

### 改动范围

单文件 `V1/src/systems/worldmap/WorldMapPlayer.js`：

- 替换 `movePlayer` 函数体
- 新增 `_tryMoveAxis` 内部函数
- 其他接口（checkCollision、pushOutOfCollision 等）不变

### 风险

- `checkCollision` 的语义必须是"圆形区域与碰撞体重叠即返回 true"，当前实现满足此要求
- `pushOutOfCollision` 兜底逻辑保留，极端情况下（如传送后落入碰撞体）仍能脱出
- 二分搜索不改变任何地图碰撞数据，不会引入新的穿墙路径

### 边界情况处理

- **当前位置已在碰撞体内**（如传送后落入）：`tryMoveAxis` 入口处检查 `!isValid(start)`，直接返回 null，由外层 `pushOutOfCollision` 兜底。避免二分搜索在非法起点上失效。
- **浮点舍入噪声**：`best > 0.5` 最小阈值过滤，低于 0.5px 的合法位移视为无有效滑动，交给 pushOut 处理。
- **边界 clamp**：二分搜索完成后仍对 `pos.x/pos.y` 做地图边界 clamp，保持与原始实现的顺序一致性。