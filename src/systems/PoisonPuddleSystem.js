import Logger from '../utils/Logger.js';

/**
 * 毒液滩系统
 * 管理毒液滩生成、更新、渲染和毒星碰撞检测
 */
function createPoisonPuddleSystem(deps) {
    var getScreenScale = deps.getScreenScale;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getCtx = deps.getCtx;
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };

    var poisonPuddles = [];
    var poisonStars = [];

    function spawnPoisonPuddles(monsterX, monsterY, skill) {
        var scale = getScreenScale();
        var screenW = getScreenWidth();
        var screenH = getScreenHeight();
        var designOffsetY = getDesignOffsetY();
        var DESIGN_HEIGHT = 812;
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenH);
        var count = skill.puddleCount || 3;
        var radius = (skill.puddleRadius || 65) * scale;
        var duration = 8000;
        var starSize = 48 * scale;

        for (let i = 0; i < count; i++) {
            var px, py, overlap, attempts = 0;
            do {
                px = monsterX + (Math.random() - 0.5) * 200 * scale;
                py = designOffsetY + Math.floor(447 * scale) + Math.random() * Math.floor(203 * scale);
                px = Math.max(radius + 10, Math.min(screenW - radius - 10, px));
                py = Math.max(designOffsetY + radius + Math.floor(10 * scale), Math.min(designBottom - radius - Math.floor(10 * scale), py));
                overlap = false;
                for (let oi = 0; oi < poisonPuddles.length; oi++) {
                    var odx = px - poisonPuddles[oi].x;
                    var ody = py - poisonPuddles[oi].y;
                    var minDist = radius + poisonPuddles[oi].radius;
                    if (odx * odx + ody * ody < minDist * minDist) {
                        overlap = true;
                        break;
                    }
                }
                attempts++;
            } while (overlap && attempts < 10);
            if (overlap) continue;

            poisonPuddles.push({
                x: px,
                y: py,
                radius: radius,
                createTime: Date.now(),
                duration: duration,
                lastStarTime: Date.now() + 500,
                starSpawned: false
            });
        }
    }

    function updatePoisonPuddles() {
        var now = Date.now();
        var scale = getScreenScale();

        for (let i = poisonPuddles.length - 1; i >= 0; i--) {
            var p = poisonPuddles[i];
            if (now - p.createTime >= p.duration) {
                poisonPuddles.splice(i, 1);
                continue;
            }
            if (!p.starSpawned && now - p.createTime >= 500) {
                p.starSpawned = true;
                poisonStars.push({
                    x: p.x + (Math.random() - 0.5) * p.radius * 0.6,
                    y: p.y + (Math.random() - 0.5) * p.radius * 0.6,
                    size: 48 * scale,
                    createTime: now,
                    duration: 4000,
                    isPoisonStar: true
                });
            }
        }

        for (let j = poisonStars.length - 1; j >= 0; j--) {
            var s = poisonStars[j];
            if (now - s.createTime >= s.duration) {
                poisonStars.splice(j, 1);
            }
        }
    }

    function drawPoisonPuddles(scale, Assets) {
        var ctx = getCtx();
        if (!ctx) return;
        var now = Date.now();

        for (let i = 0; i < poisonPuddles.length; i++) {
            var p = poisonPuddles[i];
            var age = now - p.createTime;
            var fadeAlpha = age > p.duration - 1000 ? (p.duration - age) / 1000 : 1;
            fadeAlpha = Math.max(0, Math.min(1, fadeAlpha));

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 180, 0, ' + (0.25 * fadeAlpha) + ')';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 0, ' + (0.4 * fadeAlpha) + ')';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();

            var bubbleCount = 3;
            for (let bi = 0; bi < bubbleCount; bi++) {
                var bAngle = (bi / bubbleCount) * Math.PI * 2 + age * 0.002;
                var bDist = p.radius * 0.5 + Math.sin(age * 0.003 + bi) * p.radius * 0.2;
                var bx = p.x + Math.cos(bAngle) * bDist;
                var by = p.y + Math.sin(bAngle) * bDist;
                ctx.beginPath();
                ctx.arc(bx, by, 3 * scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(100, 255, 100, ' + (0.5 * fadeAlpha) + ')';
                ctx.fill();
            }
        }

        for (let j = 0; j < poisonStars.length; j++) {
            var s = poisonStars[j];
            var sAge = now - s.createTime;
            var sAlpha = sAge > s.duration - 1000 ? (s.duration - sAge) / 1000 : 1;
            sAlpha = Math.max(0, Math.min(1, sAlpha));
            var pulse = 1 + Math.sin(sAge * 0.006) * 0.08;
            var drawSize = s.size * pulse;

            ctx.globalAlpha = sAlpha;
            if (Assets && Assets.normalStarImage && Assets.normalStarImage.complete) {
                ctx.drawImage(Assets.normalStarImage, s.x - drawSize / 2, s.y - drawSize / 2, drawSize, drawSize);
            } else {
                ctx.font = Math.floor(drawSize) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⭐', s.x, s.y);
            }
            ctx.globalAlpha = 1;
        }
    }

    function clearPoisonPuddles() {
        poisonPuddles = [];
        poisonStars = [];
    }

    function checkPoisonStarHit(x, y) {
        for (let pi = poisonStars.length - 1; pi >= 0; pi--) {
            var ps = poisonStars[pi];
            var dx = x - ps.x;
            var dy = y - ps.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ps.size / 2 + 10) {
                return { hit: true, index: pi, star: ps };
            }
        }
        return { hit: false };
    }

    function removePoisonStar(index) {
        if (index >= 0 && index < poisonStars.length) {
            poisonStars.splice(index, 1);
        }
    }

    function checkPoisonPuddleAt(x, y) {
        for (let pdi = 0; pdi < poisonPuddles.length; pdi++) {
            var pp = poisonPuddles[pdi];
            var dx = x - pp.x;
            var dy = y - pp.y;
            if (dx * dx + dy * dy < pp.radius * pp.radius) {
                return { inPuddle: true, puddle: pp };
            }
        }
        return { inPuddle: false };
    }

    return {
        spawnPoisonPuddles: spawnPoisonPuddles,
        updatePoisonPuddles: updatePoisonPuddles,
        drawPoisonPuddles: drawPoisonPuddles,
        clearPoisonPuddles: clearPoisonPuddles,
        checkPoisonStarHit: checkPoisonStarHit,
        removePoisonStar: removePoisonStar,
        checkPoisonPuddleAt: checkPoisonPuddleAt,
        get poisonPuddles() { return poisonPuddles; },
        get poisonStars() { return poisonStars; }
    };
}

export { createPoisonPuddleSystem };
