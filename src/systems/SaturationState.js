/**
 * SaturationState — 饱和度（体力条）
 * D2 重击和 D3 拖拽共享的资源条
 *
 * 消耗规则:
 * - D3 拖拽每吸附1灵光: -8%
 * - D2 满蓄释放: -30%
 * - D2 中蓄释放: -15%
 * - D2 轻蓄释放: -5%
 *
 * 恢复规则:
 * - 自然恢复: +5%/秒
 * - D1 Perfect: +3%
 * - D4 联连发动: +25%
 */
var NATURAL_RECOVERY_RATE = 5;     // 每秒 +5%
var DRAG_ABSORB_COST = 8;          // 每吸附1灵光 -8%
var CHARGE_FULL_COST = 30;
var CHARGE_MEDIUM_COST = 15;
var CHARGE_LIGHT_COST = 5;
var PERFECT_RECOVERY = 3;
var LINK_RECOVERY = 25;

var MAX_SATURATION = 100;

function createSaturationState() {
    var current = MAX_SATURATION;

    function getValue() { return current; }
    function getPercent() { return current / MAX_SATURATION; }

    /**
     * 消耗饱和度，返回是否成功
     */
    function consume(amount) {
        if (current < amount) return false;
        current = Math.max(0, current - amount);
        return true;
    }

    /**
     * 恢复饱和度
     */
    function recover(amount) {
        current = Math.min(MAX_SATURATION, current + amount);
    }

    /**
     * 检查是否能继续吸附（饱和度 > 0）
     */
    function canAbsorb() {
        return current > 0;
    }

    /**
     * 每帧更新：自然恢复
     * @param {number} dt — 秒
     */
    function update(dt) {
        current = Math.min(MAX_SATURATION, current + NATURAL_RECOVERY_RATE * dt);
    }

    /**
     * 渲染饱和度条（HUD底栏，角色上方）
     */
    function render(ctx, screenW, screenH, scale) {
        var barW = 150 * scale;
        var barH = 5 * scale;
        var barX = screenW / 2 - barW / 2;
        var barY = screenH - 55 * scale;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);

        // 填充
        var pct = getPercent();
        var r, g;
        if (pct > 0.5) {
            r = Math.floor(100 * (1 - pct) * 2);
            g = 200;
        } else if (pct > 0.2) {
            r = 255;
            g = Math.floor(200 * pct * 2);
        } else {
            r = 255;
            g = 0;
        }
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',100)';
        ctx.fillRect(barX, barY, barW * pct, barH);

        // 标签
        ctx.font = (9 * scale) + 'px sans-serif';
        ctx.fillStyle = '#cccccc';
        ctx.textAlign = 'center';
        ctx.fillText('体力', barX - 3 * scale, barY + barH / 2 + 3 * scale);

        // 百分比
        ctx.fillText(Math.floor(pct * 100) + '%', barX + barW + 3 * scale, barY + barH / 2 + 3 * scale);
    }

    function reset() {
        current = MAX_SATURATION;
    }

    return {
        getValue: getValue,
        getPercent: getPercent,
        consume: consume,
        recover: recover,
        canAbsorb: canAbsorb,
        update: update,
        render: render,
        reset: reset
    };
}

// 消耗/恢复常量导出，供外部直接引用
var SATURATION_COSTS = {
    DRAG_ABSORB: DRAG_ABSORB_COST,
    CHARGE_FULL: CHARGE_FULL_COST,
    CHARGE_MEDIUM: CHARGE_MEDIUM_COST,
    CHARGE_LIGHT: CHARGE_LIGHT_COST,
    PERFECT_RECOVERY: PERFECT_RECOVERY,
    LINK_RECOVERY: LINK_RECOVERY
};

export { createSaturationState, SATURATION_COSTS };