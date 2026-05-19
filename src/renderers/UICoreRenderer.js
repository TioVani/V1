/**
 * UICoreRenderer — 共享绘制工具
 *
 * 所有渲染器的基础依赖：drawText, drawButton, drawBackButton, drawStar, getScreenScale, isBackButtonClicked
 */
function createUICoreRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getStarThief = deps.getStarThief;
    var getSEASON_STAR_TYPES = deps.getSEASON_STAR_TYPES;
    var BACK_BTN_WIDTH = deps.BACK_BTN_WIDTH;
    var BACK_BTN_HEIGHT = deps.BACK_BTN_HEIGHT;
    var BACK_BTN_COLOR = deps.BACK_BTN_COLOR;

    function getScreenScale() {
        var baseWidth = 375;
        return Math.max(0.7, Math.min(1.0, getScreenWidth() / baseWidth));
    }

    function drawText(text, x, y, size, color) {
        var ctx = getCtx();
        ctx.fillStyle = color;
        ctx.font = 'bold ' + size + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
    }

    function drawButton(text, x, y, width, height, color, enabled) {
        if (enabled === undefined) enabled = true;
        var ctx = getCtx();
        var fillRoundRect = getFillRoundRect();
        if (enabled) {
            ctx.fillStyle = color;
        } else {
            ctx.fillStyle = '#666666';
        }
        var btnRadius = Math.min(8, Math.min(width, height) / 4);
        fillRoundRect(ctx, x - width / 2, y - height / 2, width, height, btnRadius);

        var fontSize = Math.floor(height * 0.45);
        drawText(text, x, y, fontSize, enabled ? '#1a1a2e' : '#999999');
    }

    function drawBackButton() {
        var ctx = getCtx();
        var Assets = getAssets();
        var scale = getScreenScale();
        var screenHeight = getScreenHeight();
        var btnSize = Math.floor(50 * scale);
        var btnX = Math.floor(15 * scale);
        var btnY = screenHeight - Math.floor(65 * scale);

        if (Assets.backIcon && Assets.backIcon.complete) {
            var imgRatio = Assets.backIcon.width / Assets.backIcon.height;
            var drawW = Math.floor(btnSize * imgRatio);
            ctx.drawImage(Assets.backIcon, btnX, btnY, drawW, btnSize);
        } else {
            drawButton('返回', btnX + btnSize / 2, btnY + btnSize / 2, btnSize, btnSize, BACK_BTN_COLOR);
        }
    }

    function isBackButtonClicked(x, y) {
        var scale = getScreenScale();
        var screenHeight = getScreenHeight();
        var Assets = getAssets();
        var btnSize = Math.floor(50 * scale);
        var btnX = Math.floor(15 * scale);
        var btnY = screenHeight - Math.floor(65 * scale);
        var btnW;
        if (Assets.backIcon && Assets.backIcon.complete) {
            btnW = Math.floor(btnSize * (Assets.backIcon.width / Assets.backIcon.height));
        } else {
            btnW = btnSize;
        }
        return (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnSize);
    }

    function drawStar(starObj, x, y, size, scale) {
        if (scale === undefined || scale === null) {
            scale = 1;
        }
        var ctx = getCtx();
        var Assets = getAssets();
        var starThief = getStarThief();

        if (starThief && starThief.drawStarShape(ctx, starObj, x, y, size, scale)) return;

        if (starObj.type === 'big') {
            var bigSize = size * scale;
            var bigType = starObj.bigType || 'normal';

            // 光环：白色→黄色→透明 径向渐变 + 脉冲闪烁
            var pulse = 0.7 + 0.3 * Math.sin(Date.now() / 100);
            var pulseR = 0.95 + 0.1 * Math.sin(Date.now() / 150 + 1);
            ctx.save();
            var auraR = bigSize * 0.65 * pulseR;
            var auraGrad = ctx.createRadialGradient(x, y, bigSize * 0.2, x, y, auraR);
            auraGrad.addColorStop(0, 'rgba(255, 255, 255, ' + (0.8 * pulse).toFixed(2) + ')');
            auraGrad.addColorStop(0.4, 'rgba(255, 215, 0, ' + (0.5 * pulse).toFixed(2) + ')');
            auraGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.beginPath();
            ctx.arc(x, y, auraR, 0, Math.PI * 2);
            ctx.fillStyle = auraGrad;
            ctx.fill();
            ctx.restore();

            // 用和普通星星相同的图片/emoji绘制
            var bigAssets = getAssets();
            if (bigType === 'fire' && bigAssets.fireStarImage && bigAssets.fireStarImage.complete) {
                ctx.drawImage(bigAssets.fireStarImage, x - bigSize / 2, y - bigSize / 2, bigSize, bigSize);
            } else if (bigType === 'ice' && bigAssets.iceStarImage && bigAssets.iceStarImage.complete) {
                ctx.drawImage(bigAssets.iceStarImage, x - bigSize / 2, y - bigSize / 2, bigSize, bigSize);
            } else if (bigAssets.normalStarImage && bigAssets.normalStarImage.complete) {
                ctx.drawImage(bigAssets.normalStarImage, x - bigSize / 2, y - bigSize / 2, bigSize, bigSize);
            } else {
                var bigEmoji = (bigType === 'ice') ? '❄️' : '⭐';
                ctx.font = bigSize + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(bigEmoji, x, y);
            }

            // 白色扫光：出现后300ms内从左到右划过
            var sweepDuration = 300;
            var sweepElapsed = Date.now() - (starObj.createTime || 0);
            if (sweepElapsed < sweepDuration) {
                var sweepP = sweepElapsed / sweepDuration;
                var sweepW = bigSize * 0.4;
                var sweepX = x - bigSize / 2 - sweepW + (bigSize + sweepW * 2) * sweepP;
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, bigSize / 2, 0, Math.PI * 2);
                ctx.clip();
                var sweepGrad = ctx.createLinearGradient(sweepX - sweepW, 0, sweepX + sweepW, 0);
                sweepGrad.addColorStop(0, 'rgba(255,255,255,0)');
                sweepGrad.addColorStop(0.5, 'rgba(255,255,255,' + (0.85 * (1 - sweepP)).toFixed(2) + ')');
                sweepGrad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = sweepGrad;
                ctx.fillRect(sweepX - sweepW, y - bigSize / 2, sweepW * 2, bigSize);
                ctx.restore();
            }

            return;
        }

        var SEASON_STAR_TYPES = getSEASON_STAR_TYPES();
        var starTypeConfig = null;
        for (var sti = 0; sti < SEASON_STAR_TYPES.length; sti++) {
            if (SEASON_STAR_TYPES[sti].id === starObj.type) {
                starTypeConfig = SEASON_STAR_TYPES[sti];
                break;
            }
        }
        var emoji = starTypeConfig ? starTypeConfig.emoji : '⭐';

        var starColors = {
            'normal': '#FFD700', 'ice': '#00BFFF', 'fire': '#FF4500',
            'thunder': '#9370DB', 'holy': '#FFD700', 'dark': '#4B0082',
            'wind': '#98FB98', 'earth': '#D2691E', 'light': '#FFFFE0',
            'shadow': '#2F4F4F', 'rainbow': '#FF69B4', 'golden': '#FFD700',
            'crystal': '#E0FFFF', 'meteor': '#FF6347', 'cosmic': '#191970',
            'time': '#4169E1'
        };
        var color = starColors[starObj.type] || '#FFD700';

        var specialTypes = ['ice', 'fire', 'thunder', 'holy', 'dark', 'wind', 'earth', 'light', 'shadow', 'rainbow', 'golden', 'crystal', 'meteor', 'cosmic', 'time'];
        var sizeMultiplier = 1.0;
        for (var spi = 0; spi < specialTypes.length; spi++) {
            if (specialTypes[spi] === starObj.type) { sizeMultiplier = 1.2; break; }
        }
        var scaledSize = size * scale * sizeMultiplier;

        if (starObj.type === 'golden' || starObj.type === 'rainbow' || starObj.type === 'cosmic' ||
            starObj.type === 'meteor' || starObj.type === 'holy' || starObj.type === 'light' || starObj.type === 'time') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
        }

        if (starObj.type === 'fire' && Assets.fireStarImage && Assets.fireStarImage.complete) {
            ctx.drawImage(Assets.fireStarImage, x - scaledSize / 2, y - scaledSize / 2, scaledSize, scaledSize);
        } else if (starObj.type === 'ice' && Assets.iceStarImage && Assets.iceStarImage.complete) {
            ctx.drawImage(Assets.iceStarImage, x - scaledSize / 2, y - scaledSize / 2, scaledSize, scaledSize);
        } else if (starObj.type === 'normal' && Assets.normalStarImage && Assets.normalStarImage.complete) {
            ctx.drawImage(Assets.normalStarImage, x - scaledSize / 2, y - scaledSize / 2, scaledSize, scaledSize);
        } else {
            ctx.font = scaledSize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = color;
            ctx.fillText(emoji, x, y);
        }

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }

    function drawURText(text, x, y, fontSize, scale) {
        var ctx = getCtx();
        ctx.save();
        var size = Math.floor(fontSize * scale);
        ctx.font = 'bold ' + size + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 先绘制基础红色文字
        ctx.fillStyle = '#E74C3C';
        ctx.fillText(text, x, y);

        // 扫光动画：从无→左侧出现→扫到右侧→消失→等0.5秒→循环
        var textWidth = ctx.measureText(text).width;
        var sweepWidth = textWidth * 0.3;
        // 总周期 = 扫过时间(1.5s) + 等待时间(0.5s) = 2s
        var cycleTime = 2000;
        var sweepTime = 1500;
        var elapsed = Date.now() % cycleTime;

        if (elapsed < sweepTime) {
            // 扫光阶段：从文字左侧外(-sweepWidth) 扫到 右侧外(textWidth+sweepWidth)
            var progress = elapsed / sweepTime;
            var sweepCenter = -sweepWidth + (textWidth + sweepWidth * 2) * progress;

            ctx.save();
            ctx.beginPath();
            ctx.rect(x - textWidth / 2, y - size, textWidth, size * 2);
            ctx.clip();

            var grad = ctx.createLinearGradient(
                x - textWidth / 2 + sweepCenter - sweepWidth, 0,
                x - textWidth / 2 + sweepCenter + sweepWidth, 0
            );
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillText(text, x, y);

            ctx.restore();
        }
        // else: 等待0.5秒，不绘制扫光
        ctx.restore();
    }

    function drawLRText(text, x, y, fontSize, scale) {
        var ctx = getCtx();
        ctx.save();
        var size = Math.floor(fontSize * scale);
        ctx.font = 'bold ' + size + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 流光颜色逐帧切换
        var colors = ['#FF6B9D', '#C084FC', '#FFD700', '#00D4FF'];
        var t = (Date.now() % 5000) / 5000;
        var idx = Math.floor(t * colors.length);
        var color = colors[idx % colors.length];

        // 外发光
        ctx.shadowColor = '#C084FC';
        ctx.shadowBlur = 8 * scale;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // 随机星点
        var textWidth = ctx.measureText(text).width;
        var seed = Math.floor(Date.now() / 100);
        for (var i = 0; i < 6; i++) {
            var hash = (seed * 31 + i * 127) % 1000 / 1000;
            var hash2 = (seed * 73 + i * 211) % 1000 / 1000;
            var sx = x - textWidth / 2 + textWidth * hash;
            var sy = y - size / 2 + size * hash2;
            var starSize = Math.max(1, Math.floor(2 * scale * ((hash + hash2) / 2)));
            var alpha = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 200 + i));
            ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(2) + ')';
            ctx.fillRect(sx - starSize, sy, starSize * 2, 1);
            ctx.fillRect(sx, sy - starSize, 1, starSize * 2);
        }
        ctx.restore();
    }

    function drawSPText(text, x, y, fontSize, scale) {
        var ctx = getCtx();
        ctx.save();
        var size = Math.floor(fontSize * scale);
        ctx.font = 'bold ' + size + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var textWidth = ctx.measureText(text).width;

        // 星云光晕背景
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - textWidth / 2 - 5, y - size, textWidth + 10, size * 2);
        ctx.clip();

        var nebulaGrad = ctx.createRadialGradient(x, y, 0, x, y, textWidth / 2);
        nebulaGrad.addColorStop(0, 'rgba(139,92,246,0.3)');
        nebulaGrad.addColorStop(0.5, 'rgba(30,30,80,0.2)');
        nebulaGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nebulaGrad;
        ctx.fillRect(x - textWidth / 2 - 5, y - size, textWidth + 10, size * 2);

        // 缓慢飘动的星点
        var time = Date.now() / 1000;
        for (var i = 0; i < 12; i++) {
            var baseX = x - textWidth / 2 + (textWidth / 12) * i;
            var drift = Math.sin(time * 0.5 + i * 1.7) * 3 * scale;
            var driftY = Math.cos(time * 0.3 + i * 2.3) * 2 * scale;
            var starAlpha = 0.3 + 0.5 * Math.abs(Math.sin(time + i));
            ctx.fillStyle = 'rgba(200,220,255,' + starAlpha.toFixed(2) + ')';
            var dotSize = Math.max(1, Math.floor(1.5 * scale));
            ctx.fillRect(baseX + drift, y - size / 3 + driftY, dotSize, dotSize);
        }
        ctx.restore();

        // 流动渐变文字：红紫蓝→金红紫→蓝金红→紫蓝金→红紫蓝 循环
        ctx.shadowColor = '#8B5CF6';
        ctx.shadowBlur = 10 * scale;
        var palette = [
            [255, 120, 150],   // 红
            [240, 170, 240],   // 紫
            [140, 180, 255],   // 蓝
            [255, 230, 130],   // 金
        ];
        var flowT = (Date.now() % 8000) / 8000;
        var segCount = palette.length;
        var segIdx = Math.floor(flowT * segCount);
        var segFrac = (flowT * segCount) - segIdx;
        var i0 = segIdx % segCount;
        var i1 = (segIdx + 1) % segCount;
        var i2 = (segIdx + 2) % segCount;

        function lerpC(a, b, t) {
            return [
                Math.round(a[0] + (b[0] - a[0]) * t),
                Math.round(a[1] + (b[1] - a[1]) * t),
                Math.round(a[2] + (b[2] - a[2]) * t)
            ];
        }
        var c0 = lerpC(palette[i0], palette[i1], segFrac);
        var c1 = lerpC(palette[i1], palette[i2], segFrac);
        var c2 = lerpC(palette[i2], palette[(i2 + 1) % segCount], segFrac);

        var textGrad = ctx.createLinearGradient(x - textWidth / 2, 0, x + textWidth / 2, 0);
        textGrad.addColorStop(0, 'rgb(' + c0[0] + ',' + c0[1] + ',' + c0[2] + ')');
        textGrad.addColorStop(0.5, 'rgb(' + c1[0] + ',' + c1[1] + ',' + c1[2] + ')');
        textGrad.addColorStop(1, 'rgb(' + c2[0] + ',' + c2[1] + ',' + c2[2] + ')');
        ctx.fillStyle = textGrad;
        ctx.fillText(text, x, y);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // 扫光动画
        var sweepWidth = textWidth * 0.3;
        var cycleTime = 2000;
        var sweepTime = 1500;
        var elapsed = Date.now() % cycleTime;

        if (elapsed < sweepTime) {
            var progress = elapsed / sweepTime;
            var sweepCenter = -sweepWidth + (textWidth + sweepWidth * 2) * progress;

            ctx.save();
            ctx.beginPath();
            ctx.rect(x - textWidth / 2, y - size, textWidth, size * 2);
            ctx.clip();

            var grad = ctx.createLinearGradient(
                x - textWidth / 2 + sweepCenter - sweepWidth, 0,
                x - textWidth / 2 + sweepCenter + sweepWidth, 0
            );
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillText(text, x, y);

            ctx.restore();
        }

        // 文字周围闪烁星光
        var now = Date.now();
        var starSeed = Math.floor(now / 2500);
        for (var si = 0; si < 6; si++) {
            var h1 = ((starSeed * 37 + si * 173 + 71) % 1000) / 1000;
            var h2 = ((starSeed * 89 + si * 251 + 113) % 1000) / 1000;
            var sx = x - textWidth / 2 - 8 + (textWidth + 16) * h1;
            var sy = y - size * 0.8 + size * 1.6 * h2;
            var blink = Math.abs(Math.sin(now / 400 + si * 2.1));
            var starAlpha = 0.15 + 0.85 * blink;
            var starR = Math.max(1, 3 * scale * (0.5 + 0.5 * blink));
            ctx.fillStyle = 'rgba(255,255,255,' + starAlpha.toFixed(2) + ')';
            ctx.fillRect(sx - starR, sy, starR * 2, 1);
            ctx.fillRect(sx, sy - starR, 1, starR * 2);
        }
        ctx.restore();
    }

    return {
        getScreenScale: getScreenScale,
        drawText: drawText,
        drawButton: drawButton,
        drawBackButton: drawBackButton,
        isBackButtonClicked: isBackButtonClicked,
        drawStar: drawStar,
        drawURText: drawURText,
        drawLRText: drawLRText,
        drawSPText: drawSPText
    };
}

export { createUICoreRenderer };
