/**
 * TitleRenderer — 启动画面渲染
 * 两阶段：先显示"点击屏幕开始"，点击后淡入"开始游戏"按钮
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
    var _activated = false;
    var _tapAlpha = 1;
    var _tapBlink = 0;
    var _btnAlpha = 0;

    function update(dt) {
        if (_fadeIn && _titleAlpha < 1) {
            _titleAlpha = Math.min(1, _titleAlpha + dt * 1.5);
            if (_titleAlpha >= 1) _fadeIn = false;
        }
        if (!_activated) {
            _tapBlink += dt * 3;
            _tapAlpha = 0.4 + 0.6 * Math.abs(Math.sin(_tapBlink));
        } else if (_btnAlpha < 1) {
            _btnAlpha = Math.min(1, _btnAlpha + dt * 2);
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
            ctx.fillStyle = 'rgba(10,10,21,0.45)';
            ctx.fillRect(0, 0, sw, sh);
        } else {
            ctx.fillStyle = '#0a0a15';
            ctx.fillRect(0, 0, sw, sh);
        }

        // 标题淡入
        ctx.globalAlpha = _titleAlpha;

        // 游戏标题
        var titleLogo = Assets && Assets.titleLogo;
        if (titleLogo && (titleLogo.complete || titleLogo._loaded)) {
            var logoH = Math.floor(800 * scale);
            var logoW = Math.floor(titleLogo.width / titleLogo.height * logoH);
            ctx.drawImage(titleLogo, sw / 2 - logoW / 2, sh * 0.35 - logoH / 2 + 150 * scale, logoW, logoH);
        } else {
            var titleSize = Math.floor(36 * scale);
            ctx.font = 'bold ' + titleSize + 'px sans-serif';
            ctx.fillStyle = '#e8d5a3';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('器落山河', sw / 2, sh * 0.35);
        }

        // 副标题
        var subSize = Math.floor(14 * scale);
        ctx.font = subSize + 'px sans-serif';
        ctx.fillStyle = '#8a7a5a';
        ctx.fillText('灵域初境', sw / 2, sh * 0.35 + titleSize * 0.8);

        if (!_activated) {
            // "点击屏幕开始" 辉光背景 + 闪烁提示
            var hintSize = Math.floor(16 * scale);
            ctx.font = hintSize + 'px sans-serif';
            var hintText = '点击屏幕开始';
            var textW = ctx.measureText(hintText).width;
            var hintX = sw / 2;
            var hintY = sh * 0.58;

            // 辉光背景
            var glowW = textW + Math.floor(40 * scale);
            var glowH = Math.floor(40 * scale);
            var glowX = hintX - glowW / 2;
            var glowY = hintY - glowH / 2;
            ctx.globalAlpha = _titleAlpha * _tapAlpha * 0.5;
            var grad = ctx.createRadialGradient(hintX, hintY, 0, hintX, hintY, Math.max(glowW, glowH) / 2);
            grad.addColorStop(0, 'rgba(232,213,163,0.35)');
            grad.addColorStop(1, 'rgba(232,213,163,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(glowX, glowY, glowW, glowH);

            // 文字
            ctx.globalAlpha = _titleAlpha * _tapAlpha;
            ctx.fillStyle = '#e8d5a3';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hintText, hintX, hintY);
        } else {
            // 开始按钮（淡入）
            var btnImg = Assets && Assets.titleStartBtn;
            if (btnImg && (btnImg.complete || btnImg._loaded)) {
                var btnW = Math.floor(btnImg.width / btnImg.height * 600 * scale);
                var btnH = Math.floor(600 * scale);
                var btnX = sw / 2 - btnW / 2;
                var btnY = sh * 0.58 - btnH / 2 - 70 * scale;
                ctx.globalAlpha = _titleAlpha * _btnAlpha * (_btnHover ? 1 : 0.85);
                ctx.drawImage(btnImg, btnX, btnY, btnW, btnH);
            } else {
                var btnW = Math.floor(160 * scale);
                var btnH = Math.floor(48 * scale);
                var btnX = sw / 2 - btnW / 2;
                var btnY = sh * 0.58 - btnH / 2;

                ctx.globalAlpha = _titleAlpha * _btnAlpha * (_btnHover ? 1 : 0.85);
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
            }
        }

        ctx.restore();
    }

    function handleTitleClick(x, y) {
        if (!_activated) {
            _activated = true;
            return false;
        }

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
        _activated = false;
        _tapAlpha = 1;
        _tapBlink = 0;
        _btnAlpha = 0;
    }

    return {
        update: update,
        renderTitle: renderTitle,
        handleTitleClick: handleTitleClick,
        isActivated: function() { return _activated; },
        reset: reset
    };
}

export { createTitleRenderer };
