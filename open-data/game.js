/**
 * 开放数据域 - 好友排行榜
 *
 * 运行在开放数据域子包中，
 * 通过 sharedCanvas 绘制排行榜内容，主域用 drawImage 上屏显示。
 *
 * 与主域通信：仅支持主域 → 开放数据域（wx.onMessage）
 * 不能向主域发消息，不能访问主域变量。
 *
 * KVData 键名：
 *   best_score   — 历史最高分
 *   total_kills  — 怪物总击杀数
 *   season_score — 赛季最高分
 */

// 获取 sharedCanvas 和上下文
var sharedCanvas = wx.getSharedCanvas();
var sharedCtx = sharedCanvas.getContext('2d');

// 排行榜数据缓存
var friendData = [];
var currentTab = 'best_score';
var isVisible = false;

// 头像图片缓存
var avatarCache = {};

// KVData 键名与显示名称映射
var TAB_CONFIG = {
    best_score: { title: '最高分', unit: '分' },
    total_kills: { title: '击杀数', unit: '' },
    season_score: { title: '赛季分', unit: '分' }
};

// ========== 精简版文字特效（从 UICoreRenderer 移植，仅用 Canvas 原生 API） ==========

function drawURText(ctx, text, x, y, fontSize, scale) {
    ctx.save();
    var size = Math.floor(fontSize * scale);
    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#E74C3C';
    ctx.fillText(text, x, y);

    var textWidth = ctx.measureText(text).width;
    var sweepWidth = textWidth * 0.3;
    var cycleTime = 2000;
    var sweepTime = 1500;
    var elapsed = Date.now() % cycleTime;

    if (elapsed < sweepTime) {
        var progress = elapsed / sweepTime;
        var sweepCenter = -sweepWidth + (textWidth + sweepWidth * 2) * progress;

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
    }
    ctx.restore();
}

function drawLRText(ctx, text, x, y, fontSize, scale) {
    ctx.save();
    var size = Math.floor(fontSize * scale);
    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var colors = ['#FF6B9D', '#C084FC', '#FFD700', '#00D4FF'];
    var t = (Date.now() % 5000) / 5000;
    var idx = Math.floor(t * colors.length);
    var color = colors[idx % colors.length];

    ctx.shadowColor = '#C084FC';
    ctx.shadowBlur = 8 * scale;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

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

function drawSPText(ctx, text, x, y, fontSize, scale) {
    ctx.save();
    var size = Math.floor(fontSize * scale);
    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var textWidth = ctx.measureText(text).width;

    // 星云光晕背景
    ctx.beginPath();
    ctx.rect(x - textWidth / 2 - 5, y - size, textWidth + 10, size * 2);
    ctx.clip();

    var nebulaGrad = ctx.createRadialGradient(x, y, 0, x, y, textWidth / 2);
    nebulaGrad.addColorStop(0, 'rgba(139,92,246,0.3)');
    nebulaGrad.addColorStop(0.5, 'rgba(30,30,80,0.2)');
    nebulaGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(x - textWidth / 2 - 5, y - size, textWidth + 10, size * 2);

    // 飘动星点
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

    // 流动渐变文字
    ctx.shadowColor = '#8B5CF6';
    ctx.shadowBlur = 10 * scale;
    var palette = [
        [255, 120, 150],
        [240, 170, 240],
        [140, 180, 255],
        [255, 230, 130]
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

    // 扫光
    var sweepWidth = textWidth * 0.3;
    var cycleTime = 2000;
    var sweepTime = 1500;
    var elapsed = Date.now() % cycleTime;
    if (elapsed < sweepTime) {
        var progress = elapsed / sweepTime;
        var sweepCenter = -sweepWidth + (textWidth + sweepWidth * 2) * progress;
        var grad = ctx.createLinearGradient(
            x - textWidth / 2 + sweepCenter - sweepWidth, 0,
            x - textWidth / 2 + sweepCenter + sweepWidth, 0
        );
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillText(text, x, y);
    }

    // 闪烁星光
    var now = Date.now();
    var starSeed = Math.floor(now / 2500);
    for (var si = 0; si < 6; si++) {
        var h1 = ((starSeed * 37 + si * 173 + 71) % 1000) / 1000;
        var h2 = ((starSeed * 89 + si * 251 + 113) % 1000) / 1000;
        var sx = x - textWidth / 2 - 8 + (textWidth + 16) * h1;
        var sy = y - size * 0.8 + size * 1.6 * h2;
        var blink = Math.abs(Math.sin(now / 400 + si * 2.1));
        var starAlpha2 = 0.15 + 0.85 * blink;
        var starR = Math.max(1, 3 * scale * (0.5 + 0.5 * blink));
        ctx.fillStyle = 'rgba(255,255,255,' + starAlpha2.toFixed(2) + ')';
        ctx.fillRect(sx - starR, sy, starR * 2, 1);
        ctx.fillRect(sx, sy - starR, 1, starR * 2);
    }
    ctx.restore();
}

/**
 * 请求好友云存储数据
 */
function fetchFriendData(key) {
    wx.getFriendCloudStorage({
        keyList: [key],
        success: function(res) {
            friendData = res.data || [];
            friendData.sort(function(a, b) {
                var va = 0, vb = 0;
                for (var i = 0; i < a.KVDataList.length; i++) {
                    if (a.KVDataList[i].key === key) va = parseInt(a.KVDataList[i].value) || 0;
                }
                for (var j = 0; j < b.KVDataList.length; j++) {
                    if (b.KVDataList[j].key === key) vb = parseInt(b.KVDataList[j].value) || 0;
                }
                return vb - va;
            });
            drawLeaderboard();
        },
        fail: function(err) {
            console.error('获取好友排行数据失败:', err);
            friendData = [];
            drawLeaderboard();
        }
    });
}

/**
 * 绘制排行榜
 */
function drawLeaderboard() {
    var w = sharedCanvas.width;
    var h = sharedCanvas.height;

    sharedCtx.clearRect(0, 0, w, h);

    if (!isVisible) return;

    var config = TAB_CONFIG[currentTab] || TAB_CONFIG.best_score;
    var scale = w / 375;

    var listTop = Math.floor(10 * scale);
    var listBottom = h - Math.floor(20 * scale);
    var listLeft = Math.floor(20 * scale);
    var listRight = w - Math.floor(20 * scale);
    var itemHeight = Math.floor(65 * scale);
    var itemGap = Math.floor(6 * scale);

    if (friendData.length === 0) {
        sharedCtx.fillStyle = '#888888';
        sharedCtx.font = Math.floor(14 * scale) + 'px Arial';
        sharedCtx.textAlign = 'center';
        sharedCtx.textBaseline = 'middle';
        sharedCtx.fillText('暂无好友数据', w / 2, h / 2);
        return;
    }

    var rankLabels = ['冠军', '亚军', '季军'];

    for (var i = 0; i < friendData.length; i++) {
        var item = friendData[i];
        var y = listTop + i * (itemHeight + itemGap);

        if (y + itemHeight > listBottom) break;

        var itemX = listLeft;
        var itemW = listRight - listLeft;

        // 行背景
        sharedCtx.fillStyle = i < 3 ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 255, 255, 0.08)';
        fillRoundRect(sharedCtx, itemX, y, itemW, itemHeight, Math.floor(8 * scale));

        // 排名（前三名用特效文字）
        var rankCenterX = itemX + Math.floor(25 * scale);
        var rankCenterY = y + itemHeight / 2;
        if (i === 0) {
            drawSPText(sharedCtx, rankLabels[0], rankCenterX, rankCenterY, 13, scale);
        } else if (i === 1) {
            drawLRText(sharedCtx, rankLabels[1], rankCenterX, rankCenterY, 13, scale);
        } else if (i === 2) {
            drawURText(sharedCtx, rankLabels[2], rankCenterX, rankCenterY, 13, scale);
        } else {
            sharedCtx.fillStyle = '#aaaaaa';
            sharedCtx.font = 'bold ' + Math.floor(20 * scale) + 'px Arial';
            sharedCtx.textAlign = 'center';
            sharedCtx.textBaseline = 'middle';
            sharedCtx.fillText(String(i + 1), rankCenterX, rankCenterY);
        }

        // 头像（使用缓存）
        var avatarSize = Math.floor(40 * scale);
        var avatarX = itemX + Math.floor(50 * scale);
        var avatarY = y + (itemHeight - avatarSize) / 2;
        if (item.avatarUrl) {
            var cached = avatarCache[item.avatarUrl];
            if (cached && cached.loaded) {
                sharedCtx.save();
                sharedCtx.beginPath();
                sharedCtx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
                sharedCtx.clip();
                sharedCtx.drawImage(cached.img, avatarX, avatarY, avatarSize, avatarSize);
                sharedCtx.restore();
            } else if (!cached) {
                var img = wx.createImage();
                avatarCache[item.avatarUrl] = { img: img, loaded: false };
                (function(url, aImg) {
                    aImg.onload = function() {
                        avatarCache[url].loaded = true;
                    };
                    aImg.src = url;
                })(item.avatarUrl, img);
            }
        }

        // 昵称
        var nickname = item.nickname || '未知玩家';
        sharedCtx.fillStyle = '#ffffff';
        sharedCtx.font = Math.floor(15 * scale) + 'px Arial';
        sharedCtx.textAlign = 'left';
        sharedCtx.textBaseline = 'middle';
        var nameX = avatarX + avatarSize + Math.floor(10 * scale);
        sharedCtx.fillText(nickname, nameX, y + itemHeight / 2 - Math.floor(8 * scale));

        // 分数（右侧，前三名用特效）
        var score = 0;
        for (var k = 0; k < item.KVDataList.length; k++) {
            if (item.KVDataList[k].key === currentTab) {
                score = parseInt(item.KVDataList[k].value) || 0;
                break;
            }
        }
        var scoreText = score + config.unit;
        var scoreRightX = itemX + itemW - Math.floor(10 * scale);
        var scoreY = y + itemHeight / 2 + Math.floor(10 * scale);
        if (i === 0) {
            drawSPText(sharedCtx, scoreText, scoreRightX - sharedCtx.measureText(scoreText).width / 2, scoreY, 15, scale);
        } else if (i === 1) {
            drawLRText(sharedCtx, scoreText, scoreRightX - sharedCtx.measureText(scoreText).width / 2, scoreY, 15, scale);
        } else if (i === 2) {
            drawURText(sharedCtx, scoreText, scoreRightX - sharedCtx.measureText(scoreText).width / 2, scoreY, 15, scale);
        } else {
            sharedCtx.fillStyle = '#FFD700';
            sharedCtx.font = 'bold ' + Math.floor(16 * scale) + 'px Arial';
            sharedCtx.textAlign = 'right';
            sharedCtx.textBaseline = 'middle';
            sharedCtx.fillText(scoreText, scoreRightX, scoreY);
        }
    }
}

/**
 * 圆角矩形填充
 */
function fillRoundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
}

/**
 * 监听主域消息
 */
wx.onMessage(function(data) {
    if (data.type === 'show') {
        isVisible = true;
        currentTab = data.tab || 'best_score';
        if (data.width && data.height) {
            sharedCanvas.width = data.width;
            sharedCanvas.height = data.height;
        }
        fetchFriendData(currentTab);
    } else if (data.type === 'hide') {
        isVisible = false;
        sharedCtx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
    } else if (data.type === 'switchTab') {
        currentTab = data.tab || 'best_score';
        fetchFriendData(currentTab);
    }
});

// 动画渲染循环
function animationLoop() {
    if (isVisible) {
        drawLeaderboard();
    }
    requestAnimationFrame(animationLoop);
}
requestAnimationFrame(animationLoop);
