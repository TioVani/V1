import Logger from '../utils/Logger.js';
/**
 * D5 节拍判定系统（Rhythm System）
 * 闭包工厂 + 依赖注入模式
 *
 * 每个灵光出现后伴随缩圈动画，在中心点附近点击获得 Perfect/Great 判定：
 * - Perfect: 2.0x 伤害 + 50% 分数加成
 * - Great:   1.5x 伤害 + 25% 分数加成
 * - Normal:  1.0x 伤害
 *
 * 使用灵光自带的 createTime 字段，无需额外标记。
 * 解锁条件：角色等级 >= 30
 */

var D5_UNLOCK_LEVEL = 30;

// 节拍窗口常量
var RHYTHM_SHRINK_MS = 1000;       // 缩圈时长（圈从外缩到中心）
var PERFECT_WINDOW_MS = 100;       // Perfect 窗口（中心±50ms）
var GREAT_WINDOW_MS = 200;         // Great 窗口（中心±100ms）

function createRhythmSystem(deps) {
    var getPlayerData = deps.getPlayerData;

    function isUnlocked() {
        var pd = getPlayerData();
        if (!pd || !pd.currentCharacterId) return false;
        var charExp = pd.characterExperience;
        if (!charExp || !charExp[pd.currentCharacterId]) return false;
        return charExp[pd.currentCharacterId].level >= D5_UNLOCK_LEVEL;
    }

    /**
     * 判定点击时机
     * @param {Object} star - 灵光对象（需有 createTime 字段）
     * @returns {{ grade: string, damageMult: number, scoreBonus: number }}
     */
    function judgeTiming(star) {
        if (!isUnlocked()) {
            return { grade: 'normal', damageMult: 1, scoreBonus: 0 };
        }

        var birthTime = star.createTime || star.spawnTime;
        if (!birthTime) {
            return { grade: 'normal', damageMult: 1, scoreBonus: 0 };
        }

        var elapsed = Date.now() - birthTime;
        var centerTime = RHYTHM_SHRINK_MS / 2;  // 500ms 为中心点
        var delta = Math.abs(elapsed - centerTime);

        if (delta <= PERFECT_WINDOW_MS / 2) {
            return { grade: 'perfect', damageMult: 2.0, scoreBonus: 0.5 };
        }
        if (delta <= GREAT_WINDOW_MS / 2) {
            return { grade: 'great', damageMult: 1.5, scoreBonus: 0.25 };
        }
        return { grade: 'normal', damageMult: 1.0, scoreBonus: 0 };
    }

    /**
     * 获取缩圈进度 0→1（1 = 圈缩到中心）
     */
    function getRingProgress(star) {
        var birthTime = star.createTime || star.spawnTime;
        if (!birthTime) return 0;
        var elapsed = Date.now() - birthTime;
        if (elapsed >= RHYTHM_SHRINK_MS) return 1;
        return elapsed / RHYTHM_SHRINK_MS;
    }

    /**
     * 渲染节拍缩圈动画
     */
    function render(ctx, screenW, screenH, scale, getStars) {
        if (!isUnlocked()) return;
        var stars = typeof getStars === 'function' ? getStars() : [];
        if (!stars || !stars.length) return;

        var now = Date.now();
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            var birthTime = s.createTime || s.spawnTime;
            if (!birthTime) continue;

            var elapsed = now - birthTime;
            if (elapsed >= RHYTHM_SHRINK_MS) continue;

            var progress = elapsed / RHYTHM_SHRINK_MS;  // 0→1
            var baseRadius = (s.size || 48) * 0.8;
            var ringRadius = baseRadius * (1 - progress);

            var alpha = (1 - progress) * 0.6;
            var r = Math.floor(255 * progress + 100 * (1 - progress));
            var g = Math.floor(255 * progress + 215 * (1 - progress));
            var b = Math.floor(100 * progress + 255 * (1 - progress));

            ctx.beginPath();
            ctx.arc(s.x, s.y, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(2) + ')';
            ctx.lineWidth = 2 * (scale || 1);
            ctx.stroke();

            // 中心小点标记 Perfect 区
            if (progress > 0.3 && progress < 0.7) {
                ctx.beginPath();
                ctx.arc(s.x, s.y, 3 * (scale || 1), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
                ctx.fill();
            }
        }
    }

    function reset() {
        // 无内部持久状态需要重置
    }

    return {
        isUnlocked: isUnlocked,
        judgeTiming: judgeTiming,
        getRingProgress: getRingProgress,
        render: render,
        reset: reset
    };
}

export { createRhythmSystem };