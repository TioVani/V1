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
 *   tracker.getById(id, currentHp, maxHp); // 按稳定字符串 ID 跟踪
 *   tracker.reset(entity);   // 清除某实体的跟踪
 *   tracker.resetById(id);   // 清除某 ID 的跟踪
 *   tracker.resetAll();      // 清除全部
 */
function createDelayedHpTracker() {
    var weakCache = new WeakMap();
    var idCache = new Map();

    function get(entity, currentHp, maxHp) {
        currentHp = Math.max(0, currentHp);
        var entry = weakCache.get(entity);

        if (!entry || entry.maxHp !== maxHp) {
            entry = { delayedHp: currentHp, maxHp: maxHp };
            weakCache.set(entity, entry);
        }

        if (currentHp > entry.delayedHp) {
            entry.delayedHp = currentHp;
        }

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

    function getById(id, currentHp, maxHp) {
        currentHp = Math.max(0, currentHp);
        var entry = idCache.get(id);

        if (!entry || entry.maxHp !== maxHp) {
            entry = { delayedHp: currentHp, maxHp: maxHp };
            idCache.set(id, entry);
        }

        if (currentHp > entry.delayedHp) {
            entry.delayedHp = currentHp;
        }

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
        if (entity) weakCache.delete(entity);
    }

    function resetById(id) {
        idCache.delete(id);
    }

    function resetAll() {
        weakCache = new WeakMap();
        idCache = new Map();
    }

    return { get: get, getById: getById, reset: reset, resetById: resetById, resetAll: resetAll };
}

export { createDelayedHpTracker };
