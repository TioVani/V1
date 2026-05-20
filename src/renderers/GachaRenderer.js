/**
 * GachaRenderer — 抽卡动画渲染
 */
function createGachaRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var uiCore = deps.uiCore;
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getGachaRoundRect = deps.getGachaRoundRect;
    var getPlayerData = deps.getPlayerData;
    var getGachaSystem = deps.getGachaSystem;
    var getGachaAnimationConfig = deps.getGachaAnimationConfig;

    function drawGachaStarShape(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        var rot = Math.PI / 2 * 3;
        var x = cx;
        var y = cy;
        var step = Math.PI / spikes;

        ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }

        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }

    function renderGachaAnimation() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var gachaSystem = getGachaSystem();

        ctx.fillStyle = 'rgba(0, 0, 20, 0.95)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        renderGachaStarfield();

        if (gachaSystem.animationState.phase === 'flying') {
            renderFlyingStar(scale);
        } else if (gachaSystem.animationState.phase === 'revealing' || gachaSystem.animationState.phase === 'complete') {
            renderRevealedStars(scale);
            if (gachaSystem.animationState.phase === 'complete') {
                renderGachaConfirmButton(scale);
            }
        }

        gachaSystem.updateGachaAnimation();
    }

    function renderGachaStarfield() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();

        var now = Date.now();
        ctx.save();
        for (let i = 0; i < 50; i++) {
            var x = (i * 73 + now * 0.01) % screenWidth;
            var y = (i * 47) % screenHeight;
            var size = 1 + (i % 3);
            var alpha = 0.3 + 0.3 * Math.sin(now * 0.002 + i);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function renderFlyingStar(scale) {
        var ctx = getCtx();
        var gachaSystem = getGachaSystem();
        var GACHA_ANIMATION_CONFIG = getGachaAnimationConfig();

        var star = gachaSystem.animationState.flyingStar;
        if (!star) return;

        var size = Math.floor(GACHA_ANIMATION_CONFIG.starSize * scale * star.scale);

        ctx.save();
        ctx.translate(star.x, star.y);
        ctx.rotate(star.rotation);

        var glowSize = size * 2;
        var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        drawGachaStarShape(ctx, 0, 0, 5, size, size / 2);
        ctx.fill();

        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    function renderRevealedStars(scale) {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var gachaSystem = getGachaSystem();
        var GACHA_ANIMATION_CONFIG = getGachaAnimationConfig();

        var results = gachaSystem.animationState.revealedStars;
        var total = gachaSystem.animationState.results.length;

        if (total === 0) return;

        var starSize = Math.floor(GACHA_ANIMATION_CONFIG.starSize * scale);
        var cols = total <= 5 ? total : (total <= 6 ? 3 : (total <= 9 ? 3 : 5));
        var rows = Math.ceil(total / cols);
        var gap = Math.floor(20 * scale);
        var totalWidth = cols * starSize + (cols - 1) * gap;
        var totalHeight = rows * starSize + (rows - 1) * gap;
        var startX = (screenWidth - totalWidth) / 2 + starSize / 2;
        var startY = screenHeight / 2 - totalHeight / 2 + starSize / 2;

        ctx.save();
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('&#x2728; 唤灵结果 &#x2728;', screenWidth / 2, startY - Math.floor(60 * scale));
        ctx.restore();

        for (let i = 0; i < results.length; i++) {
            var result = results[i];
            var col = i % cols;
            var row = Math.floor(i / cols);
            var x = startX + col * (starSize + gap);
            var y = startY + row * (starSize + gap);

            var rarity = result.rarity || 'N';
            var rarityConfig = GACHA_ANIMATION_CONFIG.rarities[rarity] || GACHA_ANIMATION_CONFIG.rarities.N;
            var isRare = rarity === 'SR' || rarity === 'SSR' || rarity === 'UR';

            ctx.save();

            if (isRare) {
                var now = Date.now();
                var pulseScale = 1 + 0.1 * Math.sin(now * GACHA_ANIMATION_CONFIG.glowPulseSpeed);
                var glowSize = starSize * 1.5 * pulseScale;

                var gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
                gradient.addColorStop(0, 'rgba(255, 215, 0, 0.9)');
                gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.4)');
                gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, glowSize, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = rarityConfig.color;
            ctx.beginPath();
            ctx.arc(x, y, starSize / 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = isRare ? '#FFD700' : rarityConfig.glow;
            ctx.lineWidth = isRare ? 3 : 2;
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = Math.floor(starSize * 0.5) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(result.emoji || '⭐', x, y);

            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            var gachaNameY = y + starSize / 2 + Math.floor(15 * scale);
            if (rarity === 'SP') {
                uiCore.drawSPText(result.name || '未知', x, gachaNameY, 12, scale);
            } else if (rarity === 'LR') {
                uiCore.drawLRText(result.name || '未知', x, gachaNameY, 12, scale);
            } else if (rarity === 'UR') {
                uiCore.drawURText(result.name || '未知', x, gachaNameY, 12, scale);
            } else {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(result.name || '未知', x, gachaNameY);
            }

            ctx.fillStyle = rarityConfig.glow;
            ctx.font = 'bold ' + Math.floor(10 * scale) + 'px sans-serif';
            ctx.fillText(rarity, x, y + starSize / 2 + Math.floor(30 * scale));

            ctx.restore();
        }
    }

    function renderGachaConfirmButton(scale) {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var gachaRoundRect = getGachaRoundRect();

        var btnWidth = Math.floor(150 * scale);
        var btnHeight = Math.floor(50 * scale);
        var btnX = screenWidth / 2 - btnWidth / 2;
        var btnY = screenHeight - Math.floor(100 * scale);

        ctx.save();

        var gradient = ctx.createLinearGradient(btnX, btnY, btnX + btnWidth, btnY);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(1, '#FFA500');

        ctx.fillStyle = gradient;
        gachaRoundRect(ctx, btnX, btnY, btnWidth, btnHeight, Math.floor(10 * scale));
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('确认', btnX + btnWidth / 2, btnY + btnHeight / 2);

        ctx.restore();
    }

    return { renderGachaAnimation, renderGachaStarfield, renderFlyingStar, renderRevealedStars, renderGachaConfirmButton };
}
export { createGachaRenderer };
