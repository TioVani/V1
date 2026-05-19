/**
 * DelayedHpTracker — 统一延迟血条动画逻辑
 *
 * 用 WeakMap 以实体对象为 key 跟踪 delayedHp，
 * 自动检测 maxHp 变化并重置（防止 boss 分裂后溢出）。
 *
 * 用法：
 *   var tracker = createDelayedHpTracker();
 *   var result = tracker.get(entity, currentHp, maxHp);
 *   // result.delayedHp, result.ratio (delayedHp / maxHp)
 *   tracker.reset(entity);  // 清除某实体的跟踪
 *   tracker.resetAll();     // 清除全部
 */
function createDelayedHpTracker() {
    var cache = new WeakMap();

    function get(entity, currentHp, maxHp) {
        currentHp = Math.max(0, currentHp);
        var entry = cache.get(entity);

        // maxHp 变化时自动重置（如 boss 分裂）
        if (!entry || entry.maxHp !== maxHp) {
            entry = { delayedHp: currentHp, maxHp: maxHp };
            cache.set(entity, entry);
        }

        // hp 增加时直接跟随
        if (currentHp > entry.delayedHp) {
            entry.delayedHp = currentHp;
        }

        // hp 减少时缓慢衰减（白色残影效果）
        if (entry.delayedHp > currentHp) {
            entry.delayedHp -= (entry.delayedHp - currentHp) * 0.06;
            if (entry.delayedHp - currentHp < 0.5) {
                entry.delayedHp = currentHp;
            }
        }

        return {
            delayedHp: entry.delayedHp,
            ratio: maxHp > 0 ? entry.delayedHp / maxHp : 0
        };
    }

    function reset(entity) {
        if (entity) cache.delete(entity);
    }

    function resetAll() {
        cache = new WeakMap();
    }

    return { get: get, reset: reset, resetAll: resetAll };
}

export { createDelayedHpTracker };
