/**
 * TitleRenderer — 启动画面渲染
 * 显示游戏标题 + "开始游戏" 按钮
 */
function createTitleRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getAssets = deps.getAssets;
    var onStartClick = deps.onStartClick;

    var _titleAlpha = 0;
    var _fadeIn = true;
    var _btnHover = false;

    function update(dt) {
        if (_fadeIn && _titleAlpha < 1) {
            _titleAlpha = Math.min(1, _titleAlpha + dt * 1.5);
            if (_titleAlpha >= 1) _fadeIn = false;
        }
    }

    function renderTitle() {
        var ctx = getCtx();
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var scale = getScreenScale();

        ctx.save();
        ctx.globalAlpha = 1;

        // 背景
        var Assets = getAssets ? getAssets() : null;
        var titleBg = Assets && Assets.titleBgImage;
        if (titleBg && titleBg.complete) {
            var imgRatio = titleBg.width / titleBg.height;
            var screenRatio = sw / sh;
            var dw, dh, dx, dy;
            if (imgRatio > screenRatio) {
                dh = sh; dw = sh * imgRatio;
                dx = (sw - dw) / 2; dy = 0;
            } else {
                dw = sw; dh = sw / imgRatio;
                dx = 0; dy = (sh - dh) / 2;
            }
            ctx.drawImage(titleBg, dx, dy, dw, dh);
            // 半透明遮罩让文字可读
            ctx.fillStyle = 'rgba(10,10,21,0.45)';
            ctx.fillRect(0, 0, sw, sh);
        } else {
            ctx.fillStyle = '#0a0a15';
            ctx.fillRect(0, 0, sw, sh);
        }

        // 标题淡入
        ctx.globalAlpha = _titleAlpha;

        // 游戏标题
        var titleSize = Math.floor(36 * scale);
        ctx.font = 'bold ' + titleSize + 'px sans-serif';
        ctx.fillStyle = '#e8d5a3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('器落山河', sw / 2, sh * 0.35);

        // 副标题
        var subSize = Math.floor(14 * scale);
        ctx.font = subSize + 'px sans-serif';
        ctx.fillStyle = '#8a7a5a';
        ctx.fillText('灵域初境', sw / 2, sh * 0.35 + titleSize * 0.8);

        // 开始按钮
        var btnW = Math.floor(160 * scale);
        var btnH = Math.floor(48 * scale);
        var btnX = sw / 2 - btnW / 2;
        var btnY = sh * 0.58 - btnH / 2;

        ctx.globalAlpha = _titleAlpha * (_btnHover ? 1 : 0.85);
        ctx.fillStyle = '#2a1f0e';
        ctx.strokeStyle = '#e8d5a3';
        ctx.lineWidth = Math.floor(2 * scale);
        var r = Math.floor(8 * scale);
        ctx.beginPath();
        ctx.moveTo(btnX + r, btnY);
        ctx.lineTo(btnX + btnW - r, btnY);
        ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + r, r);
        ctx.lineTo(btnX + btnW, btnY + btnH - r);
        ctx.arcTo(btnX + btnW, btnY + btnH, btnX + btnW - r, btnY + btnH, r);
        ctx.lineTo(btnX + r, btnY + btnH);
        ctx.arcTo(btnX, btnY + btnH, btnX, btnY + btnH - r, r);
        ctx.lineTo(btnX, btnY + r);
        ctx.arcTo(btnX, btnY, btnX + r, btnY, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        var btnTextSize = Math.floor(18 * scale);
        ctx.font = btnTextSize + 'px sans-serif';
        ctx.fillStyle = '#e8d5a3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('开始游戏', sw / 2, btnY + btnH / 2);

        ctx.restore();
    }

    function handleTitleClick(x, y) {
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var scale = getScreenScale();

        var btnW = Math.floor(160 * scale);
        var btnH = Math.floor(48 * scale);
        var btnX = sw / 2 - btnW / 2;
        var btnY = sh * 0.58 - btnH / 2;

        if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
            if (onStartClick) onStartClick();
            return true;
        }
        return false;
    }

    function reset() {
        _titleAlpha = 0;
        _fadeIn = true;
        _btnHover = false;
    }

    return {
        update: update,
        renderTitle: renderTitle,
        handleTitleClick: handleTitleClick,
        reset: reset
    };
}

export { createTitleRenderer };
