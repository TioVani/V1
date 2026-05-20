/**
 * 提示系统（Tip System）
 * 新机制首次出现时弹出非强制提示，点击或自动消失
 */
import { fillRoundRect } from '../utils/DrawUtils.js';

function createTipSystem(deps) {
    var getPlayerData = deps.getPlayerData;
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;

    var activeTip = null;
    var FADE_IN = 300;
    var HOLD = 3000;
    var FADE_OUT = 700;
    var TOTAL_DURATION = FADE_IN + HOLD + FADE_OUT;

    // 星星类型中文名
    var starTypeNames = {
        ice: '水灵', fire: '火灵', time: '时序',
        heal: '治疗', shield: '护盾', dodge: '闪避',
        combo: '连灵', lightning: '雷电', poison: '毒素',
        greedy: '贪婪', unlucky: '倒霉', boss_star: '守护灵'
    };

    function showTipOnce(tipId, text) {
        var pd = getPlayerData();
        if (!pd.seenTips) pd.seenTips = {};
        if (pd.seenTips[tipId]) return;
        pd.seenTips[tipId] = true;

        // 如果有活跃提示则跳过（不排队，避免干扰）
        if (activeTip) return;

        activeTip = {
            text: text,
            startTime: Date.now(),
            dismissed: false
        };
    }

    function updateTip() {
        if (!activeTip) return;
        if (activeTip.dismissed) {
            activeTip = null;
            return;
        }
        var elapsed = Date.now() - activeTip.startTime;
        if (elapsed >= TOTAL_DURATION) {
            activeTip = null;
        }
    }

    function renderTip(scale) {
        if (!activeTip) return;
        var ctx = getCtx();
        var elapsed = Date.now() - activeTip.startTime;

        var alpha;
        if (elapsed < FADE_IN) {
            alpha = elapsed / FADE_IN;
        } else if (elapsed < FADE_IN + HOLD) {
            alpha = 1.0;
        } else {
            alpha = 1.0 - (elapsed - FADE_IN - HOLD) / FADE_OUT;
        }
        if (alpha <= 0) return;

        var screenWidth = getScreenWidth();
        var tipY = getScreenHeight() * 0.25;

        ctx.save();
        ctx.globalAlpha = alpha;

        var fontSize = Math.floor(14 * scale);
        ctx.font = fontSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        var textWidth = ctx.measureText(activeTip.text).width;
        var padding = Math.floor(16 * scale);
        var bgWidth = textWidth + padding * 2;
        var bgHeight = fontSize + padding * 2;
        var bgX = (screenWidth - bgWidth) / 2;
        var bgY = tipY - bgHeight / 2;
        var radius = Math.floor(8 * scale);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        fillRoundRect(ctx, bgX, bgY, bgWidth, bgHeight, radius);

        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(activeTip.text, screenWidth / 2, tipY);

        ctx.restore();
    }

    function handleTipClick(x, y) {
        if (!activeTip) return false;
        activeTip.dismissed = true;
        return true;
    }

    function getStarTypeName(type) {
        return starTypeNames[type] || type;
    }

    return {
        showTipOnce: showTipOnce,
        updateTip: updateTip,
        renderTip: renderTip,
        handleTipClick: handleTipClick,
        getStarTypeName: getStarTypeName
    };
}

export { createTipSystem };
