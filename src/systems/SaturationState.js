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
var RHYTHM_RECOVERY_1 = 15;    // 节奏微震 (1-2次)
var RHYTHM_RECOVERY_2 = 25;    // 节拍技 (3次)
var RHYTHM_RECOVERY_3 = 35;    // 强化节拍技 (4次)
var RHYTHM_RECOVERY_4 = 50;    // 完美节拍技 (5次)
var RHYTHM_RECOVERY_5 = 50;    // 极限节拍技 (6+次)

var MAX_SATURATION = 100;
var DESIGN_HEIGHT = 812;

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
     * 渲染饱和度条（垂直，画面左边边框旁）
     */
    function render(ctx, screenW, screenH, scale) {
        var barW = 5 * scale;
        var barH = Math.min(200, screenH - 100) * scale;
        var barX = 8 * scale;
        var designOffsetY = Math.floor(Math.max(0, (screenH - DESIGN_HEIGHT * scale) / 2));
        var barY = designOffsetY + (DESIGN_HEIGHT / 2 - barH / 2 + 240) * scale;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);

        // 填充（从底部向上）
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
        ctx.fillRect(barX, barY + barH * (1 - pct), barW, barH * pct);

        // 标签
        ctx.font = (9 * scale) + 'px sans-serif';
        ctx.fillStyle = '#cccccc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('体', barX + barW / 2, barY - 12 * scale);
        ctx.fillText('力', barX + barW / 2, barY - 4 * scale);

        // 百分比
        ctx.fillText(Math.floor(pct * 100) + '%', barX + barW / 2, barY + barH + 8 * scale);
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
    LINK_RECOVERY: LINK_RECOVERY,
    RHYTHM_RECOVERY_1: RHYTHM_RECOVERY_1,
    RHYTHM_RECOVERY_2: RHYTHM_RECOVERY_2,
    RHYTHM_RECOVERY_3: RHYTHM_RECOVERY_3,
    RHYTHM_RECOVERY_4: RHYTHM_RECOVERY_4,
    RHYTHM_RECOVERY_5: RHYTHM_RECOVERY_5
};

export { createSaturationState, SATURATION_COSTS };