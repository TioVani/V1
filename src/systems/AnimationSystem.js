import Logger from '../utils/Logger.js';
import ObjectPool from '../utils/ObjectPool.js';
import { vibrateShort } from '../platform/BrowserAPI.js';
/**
 * 动画系统（Animation System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

function createAnimationSystem(deps) {
    // 依赖注入
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getPlayerData = deps.getPlayerData;
    var getMonster = deps.getMonster;
    var getComboCount = deps.getComboCount;
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getStrokeRoundRect = deps.getStrokeRoundRect;
    var _combatFontConfig = deps.combatFontConfig || function() { return null; };
    function getFont(token, scale, extraScale) {
        var cfg = _combatFontConfig();
        if (cfg) return cfg.getFont(token, scale, extraScale);
        return '16px sans-serif';
    }
    var playMeteorSound = deps.playMeteorSound || function() {};
    var playDodgeHealSound = deps.playDodgeHealSound || function() {};
    var playMeteorImpactSound = deps.playMeteorImpactSound || function() {};

    // ==================== 虚拟时钟（暂停时冻结动画时间） ====================
    var _pauseAccumulated = 0;
    var _pauseStartTime = null;

    function getGameTime() {
        if (_pauseStartTime !== null) return _pauseStartTime - _pauseAccumulated;
        return Date.now() - _pauseAccumulated;
    }
    function pauseAnimations() { if (_pauseStartTime === null) _pauseStartTime = Date.now(); }
    function resumeAnimations() {
        if (_pauseStartTime !== null) {
            _pauseAccumulated += Date.now() - _pauseStartTime;
            _pauseStartTime = null;
        }
    }

    // ==================== 内部状态 ====================
    var critAnimations = [];
    var meteorAnimations = [];
    var meteorExplosions = [];
    var hpBarCounterAnimations = [];
    var playerDamageAnimations = [];
    var monsterDamageAnimations = [];
    var timeDamageAnimations = [];
    var quickTapAnimations = [];
    var goldDropAnimations = [];
    var gameMessages = [];
    var skillDamageAnimations = [];
    var petDamageAnimations = [];
    var tapRippleAnimations = [];
    var monsterProjectileAnimations = [];

    // ==================== 对象池 ====================
    var critPool = new ObjectPool(
      function() { return { x:0, y:0, damage:0, score:0, startTime:0, duration:800, initialScale:2, scale:2, alpha:1, offsetY:0, speed:2 }; },
      function(o) { o.x=0; o.y=0; o.damage=0; o.score=0; o.startTime=0; o.scale=2; o.alpha=1; o.offsetY=0; },
      10
    );
    var dmgPool = new ObjectPool(
      function() { return { x:0, y:0, damage:0, isCrit:false, startTime:0, duration:0, alpha:1, offsetY:0, color:'', scale:1 }; },
      function(o) { o.x=0; o.y=0; o.damage=0; o.isCrit=false; o.startTime=0; o.alpha=1; o.offsetY=0; o.scale=1; },
      15
    );
    var goldPool = new ObjectPool(
      function() { return { x:0, y:0, amount:0, startTime:0, duration:0, alpha:1, offsetY:0, scale:1 }; },
      function(o) { o.x=0; o.y=0; o.amount=0; o.startTime=0; o.alpha=1; o.offsetY=0; o.scale=1; },
      10
    );

    var lastVibrateTime = 0;
    var VIBRATE_COOLDOWN = 100;

    var elementalComboActive = false;
    var elementalComboTime = 0;
    var ELEMENTAL_COMBO_DURATION = 1000;

    // ==================== 暴击动画 ====================

    function createCritAnimation(x, y, damage, score, color) {
        var animation = critPool.acquire({
            x: x,
            y: y - 120,
            damage: damage,
            score: score,
            startTime: getGameTime(),
            duration: 800,
            initialScale: 2.0,
            scale: 2.0,
            alpha: 1.0,
            offsetY: 0,
            speed: 2,
            color: color || null
        });
        critAnimations.push(animation);
        Logger.info('创建暴击动画:', damage, score, '位置:', x, y - 120);
    }

    function updateCritAnimations() {
        var now = getGameTime();

        var alive = [];
        for (let ci = 0; ci < critAnimations.length; ci++) {
            var anim = critAnimations[ci];
            var elapsed = now - anim.startTime;
            var progress = elapsed / anim.duration;

            if (progress >= 1) {
                critPool.release(anim);
                continue;
            }

            // 动画阶段：
            // 0-20%: 快速放大
            // 20-100%: 缓慢缩小并上飘，透明度降低
            if (progress < 0.2) {
                // 快速放大阶段
                var expandProgress = progress / 0.2;
                anim.scale = anim.initialScale + expandProgress * 0.5;  // 2.0 -> 2.5
                anim.alpha = 1.0;
            } else {
                // 缩小消失阶段
                var shrinkProgress = (progress - 0.2) / 0.8;
                anim.scale = 2.5 - shrinkProgress * 1.5;  // 2.5 -> 1.0
                anim.alpha = 1.0 - shrinkProgress;  // 1.0 -> 0
                anim.offsetY = shrinkProgress * 60;  // 上飘60像素
            }

            alive.push(anim);
        }
        critAnimations = alive;
    }

    function drawCritAnimations(scale) {
        var ctx = getCtx();
        for (let i = 0; i < critAnimations.length; i++) {
            var anim = critAnimations[i];
            var x = anim.x;
            var y = anim.y - anim.offsetY;

            ctx.save();
            ctx.globalAlpha = anim.alpha;

            var fontSize = Math.floor(28 * scale * anim.scale);
            ctx.font = getFont('crit', scale, anim.scale);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            var fillColor = anim.color || '#FFD700';
            var strokeColor = anim.color ? 'rgba(0,80,0,0.5)' : '#8B0000';
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = Math.floor(3 * scale);

            if (anim.color) {
                // 自定义颜色模式（如治疗），只显示 +数值
                ctx.strokeText('+' + anim.damage, x, y);
                ctx.fillStyle = fillColor;
                ctx.fillText('+' + anim.damage, x, y);
            } else if (anim.score > 0) {
                ctx.strokeText('-' + anim.damage, x, y - fontSize * 0.5);
                ctx.strokeText('+' + anim.score + '灵光', x, y + fontSize * 0.5);
                ctx.fillStyle = fillColor;
                ctx.fillText('-' + anim.damage, x, y - fontSize * 0.5);
                ctx.fillText('+' + anim.score + '灵光', x, y + fontSize * 0.5);
            } else {
                ctx.strokeText('-' + anim.damage, x, y);
                ctx.fillStyle = fillColor;
                ctx.fillText('-' + anim.damage, x, y);
            }

            ctx.restore();
        }
    }

    // ==================== 流星攻击动画系统 ====================

    /**
     * 创建流星攻击动画
     * @param {number} startX - 起始X坐标（星星位置）
     * @param {number} startY - 起始Y坐标（星星位置）
     * @param {number} damage - 伤害值
     * @param {boolean} isCritical - 是否暴击
     * @param {string} starType - 星星类型
     * @param {number} starScore - 星星分数
     * @param {number} comboMultiplier - 连击倍率
     * @param {function} onHit - 命中时的回调函数
     */
    function createMeteorAnimation(startX, startY, damage, isCritical, starType, starScore, comboMultiplier, onHit, customEnd) {
        var endX, endY;
        if (customEnd) {
            endX = customEnd.x;
            endY = customEnd.y;
        } else {
            var monster = getMonster();
            if (!monster.active) {
                if (onHit) onHit();
                return null;
            }
            endX = monster.x;
            endY = monster.y;
        }

        var animation = {
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            x: startX,
            y: startY,
            damage: damage,
            isCritical: isCritical,
            starType: starType || 'normal',
            starScore: starScore || 0,
            comboMultiplier: comboMultiplier || 1,
            startTime: getGameTime(),
            duration: 150,  // 动画持续150ms（快速飞向怪物）
            progress: 0,
            trail: [],  // 尾迹粒子
            pathPoints: [],  // 弧线路径点
            arcSide: getComboCount() > 0 ? (Math.random() < 0.5 ? -1 : 1) : (startX < endX ? -1 : 1),
            arcMultiplier: 0.7 + Math.random() * 0.6,  // 弧度随机缩放 0.7~1.3
            size: isCritical ? 36 : 28,  // 暴击流星更大
            color: getStarColor(starType),
            glowColor: getStarGlowColor(starType),
            completed: false,  // 是否已完成
            hitEffectCreated: false,  // 是否已创建命中效果
            onHit: onHit  // 命中回调
        };

        meteorAnimations.push(animation);
        playMeteorSound(starType);
        return animation;
    }

    /**
     * 根据星星类型获取颜色
     */
    function getStarColor(starType) {
        switch(starType) {
            case 'ice': return '#4488FF';
            case 'fire': return '#FF4400';
            case 'lightning': return '#FFD700';
            case 'time': return '#9370DB';
            case 'combo': return '#00CED1';
            case 'dodge': return '#DA70D6';
            case 'big': return '#FFD700';
            case 'poison': return '#00FF00';
            case 'heal': return '#90EE90';
            default: return '#FFD700';
        }
    }

    /**
     * 根据星星类型获取发光颜色
     */
    function getStarGlowColor(starType) {
        switch(starType) {
            case 'ice': return 'rgba(68, 136, 255, 0.6)';
            case 'fire': return 'rgba(255, 68, 0, 0.6)';
            case 'lightning': return 'rgba(255, 215, 0, 0.6)';
            case 'time': return 'rgba(147, 112, 219, 0.6)';
            case 'combo': return 'rgba(0, 206, 209, 0.7)';
            case 'dodge': return 'rgba(218, 112, 214, 0.7)';
            case 'big': return 'rgba(255, 215, 0, 0.8)';
            case 'poison': return 'rgba(0, 255, 0, 0.7)';
            case 'heal': return 'rgba(144, 238, 144, 0.7)'; // 治疗星星：嫩绿发光
            default: return 'rgba(255, 215, 0, 0.5)';
        }
    }

    /**
     * 更新流星动画
     */
    function updateMeteorAnimations() {
        var now = getGameTime();

        meteorAnimations = meteorAnimations.filter(function(anim) {
            var elapsed = now - anim.startTime;
            anim.progress = Math.min(elapsed / anim.duration, 1);

            if (anim.progress >= 1) {
                // 动画完成，执行伤害回调
                if (!anim.completed) {
                    anim.completed = true;
                    // 执行命中回调
                    if (anim.onHit) {
                        anim.onHit();
                    }
                }
                // 保留一小段时间显示命中效果
                return elapsed < anim.duration + 50;
            }

            // 使用缓动函数实现加速效果
            var easedProgress = easeOutQuad(anim.progress);

            // 更新位置（括号弧线路径：Y轴直线，X轴抛物线偏移）
            var t = anim.progress;
            // Y轴：直线插值（带缓动）
            anim.y = anim.startY + (anim.endY - anim.startY) * easedProgress;
            // X轴：直线插值 + 抛物线侧偏（像 ) 弧线）
            var linearX = anim.startX + (anim.endX - anim.startX) * easedProgress;
            var arcHeight = Math.abs(anim.endY - anim.startY) * 0.175 * (anim.arcMultiplier || 1);
            var arcOffset = arcHeight * 27 / 4 * t * t * (1 - t);
            anim.x = linearX + arcOffset * anim.arcSide;

            // 记录路径点（用于弧线拖尾）
            anim.pathPoints = anim.pathPoints || [];
            anim.pathPoints.push({ x: anim.x, y: anim.y, time: now });

            // 添加尾迹粒子（沿路径，不随机偏移）
            if (Math.random() < 0.6) {
                anim.trail.push({
                    x: anim.x + (Math.random() - 0.5) * 4,
                    y: anim.y + (Math.random() - 0.5) * 4,
                    size: Math.random() * 6 + 3,
                    alpha: 0.8,
                    startTime: now
                });
            }

            // 更新尾迹粒子
            anim.trail = anim.trail.filter(function(particle) {
                var particleElapsed = now - particle.startTime;
                particle.alpha = 1 - (particleElapsed / 360);
                particle.size *= 0.95;
                return particle.alpha > 0 && particle.size > 1;
            });

            return true;
        });
    }

    /**
     * 缓动函数 - 二次缓出
     */
    function easeOutQuad(t) {
        return t * (2 - t);
    }

    /**
     * 绘制流星动画
     */
    function drawMeteorAnimations(scale) {
        var ctx = getCtx();
        for (let i = 0; i < meteorAnimations.length; i++) {
            var anim = meteorAnimations[i];
            ctx.save();

            // 绘制尾迹粒子
            for (let j = 0; j < anim.trail.length; j++) {
                var particle = anim.trail[j];
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * scale * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = anim.glowColor;
                ctx.globalAlpha = particle.alpha * 0.5;
                ctx.fill();
            }

            ctx.globalAlpha = 1;

            // 绘制流星主体（发光效果）
            var meteorSize = anim.size * scale;

            // 外发光
            var gradient = ctx.createRadialGradient(
                anim.x, anim.y, 0,
                anim.x, anim.y, meteorSize * 2
            );
            gradient.addColorStop(0, anim.glowColor);
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(anim.x, anim.y, meteorSize * 2, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // 绘制星星形状
            drawMeteorStar(anim.x, anim.y, meteorSize, anim.color, anim.starType, anim.isCritical);

            // 绘制尾焰（弧线拖尾）
            drawMeteorTail(anim.startX, anim.startY, anim.x, anim.y, anim.color, anim.glowColor, scale, anim.pathPoints);

            ctx.restore();

            // 如果动画完成，绘制命中效果
            if (anim.completed && !anim.hitEffectCreated) {
                anim.hitEffectCreated = true;
                createMeteorHitEffect(anim.endX, anim.endY, anim.damage, anim.isCritical, anim.starType);
            }
        }
    }

    /**
     * 绘制流星星星形状
     */
    function drawMeteorStar(x, y, size, color, starType, isCritical) {
        var ctx = getCtx();
        ctx.save();

        var spikes = 5;
        var outerRadius = size;
        var innerRadius = size * 0.5;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            var radius = i % 2 === 0 ? outerRadius : innerRadius;
            var angle = (i * Math.PI / spikes) - Math.PI / 2;
            var px = x + Math.cos(angle) * radius;
            var py = y + Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();

        // 填充渐变
        var gradient = ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, color);

        ctx.fillStyle = gradient;
        ctx.fill();

        // 暴击效果 - 添加闪烁
        if (isCritical) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.stroke();

            // 添加额外的光晕
            ctx.beginPath();
            ctx.arc(x, y, outerRadius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * 绘制流星尾焰
     */
    function drawMeteorTail(startX, startY, currentX, currentY, color, glowColor, scale, pathPoints) {
        var ctx = getCtx();
        ctx.save();

        // 如果有路径点，用弧线尾焰
        if (pathPoints && pathPoints.length > 3) {
            // 只取最近的路径点作为尾焰
            var maxLen = Math.min(pathPoints.length, 5);
            var startIdx = pathPoints.length - maxLen;
            var points = pathPoints.slice(startIdx);

            // 绘制宽尾焰（弧线渐变）
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let k = 1; k < points.length; k++) {
                ctx.lineTo(points[k].x, points[k].y);
            }
            var gradient = ctx.createLinearGradient(points[0].x, points[0].y, currentX, currentY);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.4, glowColor);
            gradient.addColorStop(1, color);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 10 * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // 第二层更细更亮的弧线
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let k2 = 1; k2 < points.length; k2++) {
                ctx.lineTo(points[k2].x, points[k2].y);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();

            ctx.restore();
            return;
        }

        // 无路径点时回退到直线
        var dx = currentX - startX;
        var dy = currentY - startY;
        var distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 10) {
            ctx.restore();
            return;
        }

        var dirX = dx / distance;
        var dirY = dy / distance;

        var tailLength = Math.min(distance * 0.5, 100) * scale;
        var tailStartX = currentX - dirX * tailLength;
        var tailStartY = currentY - dirY * tailLength;

        var gradient2 = ctx.createLinearGradient(tailStartX, tailStartY, currentX, currentY);
        gradient2.addColorStop(0, 'transparent');
        gradient2.addColorStop(0.5, glowColor);
        gradient2.addColorStop(1, color);

        ctx.beginPath();
        ctx.moveTo(tailStartX, tailStartY);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = gradient2;
        ctx.lineWidth = 18 * scale;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tailStartX, tailStartY);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 6 * scale;
        ctx.stroke();

        ctx.restore();
    }

    // ==================== 流星爆炸效果 ====================

    /**
     * 创建流星命中效果
     */
    function createMeteorHitEffect(x, y, damage, isCritical, starType) {
        playMeteorImpactSound();

        // 创建命中震动（带冷却，避免频繁震动导致卡顿）
        var now = getGameTime();
        if (now - lastVibrateTime >= VIBRATE_COOLDOWN) {
            lastVibrateTime = now;
            vibrateShort({ type: isCritical ? 'heavy' : 'light' });
        }

        // 创建爆炸效果
        var explosion = {
            x: x,
            y: y,
            startTime: getGameTime(),
            duration: isCritical ? 400 : 300,  // 暴击爆炸更持久
            color: getStarColor(starType),
            glowColor: getStarGlowColor(starType),
            isCritical: isCritical,
            maxRadius: isCritical ? 80 : 50,  // 爆炸半径
            particles: []  // 爆炸粒子
        };

        // 生成爆炸粒子（减少数量以提升性能）
        var particleCount = isCritical ? 12 : 8;
        for (let i = 0; i < particleCount; i++) {
            var angle = (Math.PI * 2 / particleCount) * i;
            var speed = 3 + Math.random() * 4;
            explosion.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 4,
                alpha: 1
            });
        }

        meteorExplosions.push(explosion);

        // 创建暴击动画（如果需要）
        if (isCritical) {
            createCritAnimation(x, y, damage, 0);
        }
    }

    /**
     * 更新流星爆炸效果
     */
    function updateMeteorExplosions() {
        var now = getGameTime();

        meteorExplosions = meteorExplosions.filter(function(exp) {
            var elapsed = now - exp.startTime;
            var progress = elapsed / exp.duration;

            if (progress >= 1) {
                return false;
            }

            // 更新粒子
            for (let i = 0; i < exp.particles.length; i++) {
                var p = exp.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.95;
                p.vy *= 0.95;
                p.alpha = 1 - progress;
                p.size *= 0.98;
            }

            return true;
        });
    }

    /**
     * 绘制流星爆炸效果
     */
    function drawMeteorExplosions(scale) {
        var ctx = getCtx();
        for (let i = 0; i < meteorExplosions.length; i++) {
            var exp = meteorExplosions[i];
            var elapsed = getGameTime() - exp.startTime;
            var progress = elapsed / exp.duration;

            ctx.save();

            // 绘制爆炸冲击波（圆环扩散）
            var waveRadius = exp.maxRadius * progress * scale;
            var waveAlpha = (1 - progress) * 0.6;

            ctx.beginPath();
            ctx.arc(exp.x, exp.y, waveRadius, 0, Math.PI * 2);
            ctx.strokeStyle = exp.color;
            ctx.lineWidth = 4 * scale * (1 - progress);
            ctx.globalAlpha = waveAlpha;
            ctx.stroke();

            // 暴击时绘制第二层冲击波
            if (exp.isCritical) {
                ctx.beginPath();
                ctx.arc(exp.x, exp.y, waveRadius * 0.7, 0, Math.PI * 2);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2 * scale * (1 - progress);
                ctx.globalAlpha = waveAlpha * 0.8;
                ctx.stroke();
            }

            // 绘制中心闪光
            var flashRadius = exp.maxRadius * 0.5 * scale * (1 - progress);
            var flashGradient = ctx.createRadialGradient(
                exp.x, exp.y, 0,
                exp.x, exp.y, flashRadius
            );
            flashGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            flashGradient.addColorStop(0.5, exp.glowColor);
            flashGradient.addColorStop(1, 'transparent');

            ctx.globalAlpha = 1 - progress;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, flashRadius, 0, Math.PI * 2);
            ctx.fillStyle = flashGradient;
            ctx.fill();

            // 绘制爆炸粒子
            for (let j = 0; j < exp.particles.length; j++) {
                var p = exp.particles[j];
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * scale * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = exp.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();
            }

            ctx.restore();
        }
    }

    // ==================== 血条反击动画系统 ====================

    /**
     * 创建血条反击放大消失动画（玩家血条）
     */
    function createHpBarCounterAnimation() {
        playDodgeHealSound();
        var scale = getScreenScale();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var playerData = getPlayerData();

        // 玩家血条位置（与渲染代码保持一致）
        var hpBarWidth = Math.floor(200 * scale);
        var hpBarHeight = Math.floor(12 * scale);
        var hpBarX = screenWidth / 2 - hpBarWidth / 2;
        var hpBarY = screenHeight - Math.floor(50 * scale);

        // 获取玩家血量
        var currentHp = playerData.playerHp != null ? playerData.playerHp : 100;
        var maxHp = playerData.maxPlayerHp || 100;
        var hpPercent = currentHp / maxHp;
        if (isNaN(hpPercent) || hpPercent < 0) hpPercent = 1;
        else if (hpPercent > 1) hpPercent = 1;

        // 血条颜色
        var hpColor = '#4CAF50';
        if (hpPercent <= 0.25) {
            hpColor = '#ff6b6b';
        } else if (hpPercent <= 0.5) {
            hpColor = '#FF9800';
        }

        // 血条中心点
        var centerX = hpBarX + hpBarWidth / 2;
        var centerY = hpBarY + hpBarHeight / 2;

        var animation = {
            x: hpBarX,
            y: hpBarY,
            width: hpBarWidth,
            height: hpBarHeight,
            hpPercent: hpPercent,
            hpColor: hpColor,
            startTime: getGameTime(),
            duration: 500,  // 动画持续500ms
            maxScale: 1.5,  // 最大放大倍数
            alpha: 1.0
        };

        hpBarCounterAnimations.push(animation);
        Logger.info('💫 创建玩家血条反击动画');
    }

    /**
     * 更新血条反击动画
     */
    function updateHpBarCounterAnimations() {
        var now = getGameTime();

        hpBarCounterAnimations = hpBarCounterAnimations.filter(function(anim) {
            var elapsed = now - anim.startTime;
            var progress = elapsed / anim.duration;

            if (progress >= 1) {
                return false;  // 动画结束，移除
            }

            // 放大效果：前50%时间放大到最大，之后保持
            if (progress < 0.5) {
                anim.currentScale = 1 + (anim.maxScale - 1) * (progress / 0.5);
            } else {
                anim.currentScale = anim.maxScale;
            }

            // 透明度：放大到一半时（progress = 0.25）就开始变透明
            if (progress < 0.25) {
                anim.alpha = 1.0;
            } else {
                anim.alpha = 1.0 - ((progress - 0.25) / 0.75);
            }

            return true;
        });
    }

    /**
     * 绘制血条反击动画
     */
    function drawHpBarCounterAnimations() {
        var ctx = getCtx();
        for (let i = 0; i < hpBarCounterAnimations.length; i++) {
            var anim = hpBarCounterAnimations[i];
            ctx.save();

            var scale = anim.currentScale || 1;
            var alpha = anim.alpha || 1;

            // 计算放大后的位置和尺寸（以中心点为基准放大）
            var centerX = anim.x + anim.width / 2;
            var centerY = anim.y + anim.height / 2;
            var scaledWidth = anim.width * scale;
            var scaledHeight = anim.height * scale;
            var scaledX = centerX - scaledWidth / 2;
            var scaledY = centerY - scaledHeight / 2;

            ctx.globalAlpha = alpha;

            // 绘制血条背景
            ctx.fillStyle = '#333333';
            ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

            // 绘制血条
            ctx.fillStyle = anim.hpColor;
            ctx.fillRect(scaledX, scaledY, scaledWidth * anim.hpPercent, scaledHeight);

            // 绘制边框（高亮效果）
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha * 0.8;
            ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

            ctx.restore();
        }
    }

    // ==================== 玩家受击动画 ====================

    function createPlayerDamageAnimation(damage, isBoss, isPoison, customText, isShield) {
        // 根据已有动画数量计算Y偏移，避免堆叠
        var stackOffset = playerDamageAnimations.length * 18;
        var animation = {
            damage: damage,
            startTime: getGameTime(),
            duration: 800,  // 动画持续800ms
            scale: isBoss ? 2.0 : 1.5,  // Boss 攻击放大效果更强
            alpha: 1.0,
            offsetY: 0,
            extraOffsetY: (customText ? -30 : 0) - stackOffset,  // 自定义文字上移+防堆叠偏移
            isBoss: isBoss,  // 标记是否为 Boss 攻击
            isPoison: isPoison,  // 标记是否为毒素伤害
            customText: customText || null,  // 自定义文字（如"中毒!"）
            isShield: isShield || false  // 标记是否为护盾扣除
        };
        playerDamageAnimations.push(animation);
        Logger.info('创建玩家受击动画:', damage, isBoss ? '(Boss攻击)' : '', isPoison ? '(毒素)' : '');
    }

    function updatePlayerDamageAnimations() {
        var now = getGameTime();

        playerDamageAnimations = playerDamageAnimations.filter(function(anim) {
            var elapsed = now - anim.startTime;
            var progress = elapsed / anim.duration;

            if (progress >= 1) {
                return false;
            }

            anim.alpha = 1.0 - progress;
            anim.offsetY = progress * (anim.isBoss ? 60 : 40);  // Boss 攻击上飘更多
            var baseScale = anim.isBoss ? 2.0 : 1.5;
            anim.scale = baseScale - progress * (anim.isBoss ? 0.8 : 0.5);  // Boss: 2.0 -> 1.2, 普通: 1.5 -> 1.0

            return true;
        });
    }

    function drawPlayerDamageAnimations(scale) {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();

        // 血条位置（屏幕下方）
        var hpBarWidth = Math.floor(200 * scale);
        var hpBarHeight = Math.floor(12 * scale);
        var hpBarX = screenWidth / 2 - hpBarWidth / 2;
        var hpBarY = screenHeight - Math.floor(50 * scale);

        for (let i = 0; i < playerDamageAnimations.length; i++) {
            var anim = playerDamageAnimations[i];
            var x = screenWidth / 2;
            var y = hpBarY - 30 - anim.offsetY - (anim.extraOffsetY || 0);  // 血条上方30像素

            ctx.save();
            ctx.globalAlpha = anim.alpha;

            var fontSize = Math.floor((anim.isBoss ? 12 : 9) * scale * anim.scale);
            ctx.font = getFont(anim.isBoss ? 'playerDmgBoss' : 'playerDmg', scale, anim.scale);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            var text, strokeColor, fillColor;
            var hasGlow = false;

            if (anim.customText) {
                // 自定义文字（如"中毒!"）- 绿色带辉光
                text = anim.customText;
                strokeColor = '#004400';
                fillColor = '#00FF00';
                hasGlow = true;
            } else if (anim.isShield) {
                // 护盾扣除 - 灰色
                text = '-' + Math.floor(anim.damage);
                strokeColor = '#333333';
                fillColor = '#CCCCCC';
            } else if (anim.isPoison) {
                // 毒素伤害 - 绿色
                text = '-' + Math.floor(anim.damage);
                strokeColor = '#004400';
                fillColor = '#00FF00';
            } else if (anim.isBoss) {
                // Boss伤害 - 紫红色
                text = '💥-' + Math.floor(anim.damage);
                strokeColor = '#4A0080';
                fillColor = '#FF00FF';
            } else {
                // 普通伤害 - 红色
                text = '-' + Math.floor(anim.damage);
                strokeColor = '#660000';
                fillColor = '#FF0000';
            }

            // 辉光效果
            if (hasGlow) {
                ctx.shadowColor = fillColor;
                ctx.shadowBlur = 15 * scale;
            }

            // 描边
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = Math.floor((anim.isBoss ? 3 : 2) * scale);
            ctx.strokeText(text, x, y);

            // 填充颜色
            ctx.fillStyle = fillColor;
            ctx.fillText(text, x, y);

            // 重置辉光
            if (hasGlow) {
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }

            ctx.restore();
        }
    }

    // ==================== 怪物受击动画（闪避反击） ====================

    function createMonsterDamageAnimation(monster, damage) {
        var animation = {
            monster: monster,
            damage: damage,
            startTime: getGameTime(),
            duration: 800,
            scale: 1.8,
            alpha: 1.0,
            offsetY: 0
        };
        monsterDamageAnimations.push(animation);
        Logger.info('创建怪物受击动画(闪避反击):', damage);
    }

    function updateMonsterDamageAnimations() {
        var now = getGameTime();

        monsterDamageAnimations = monsterDamageAnimations.filter(function(anim) {
            var elapsed = now - anim.startTime;
            var progress = elapsed / anim.duration;

            if (progress >= 1) {
                return false;
            }

            anim.alpha = 1.0 - progress;
            anim.offsetY = progress * 50;
            anim.scale = 1.8 - progress * 0.8;

            return true;
        });
    }

    function drawMonsterDamageAnimations(scale) {
        var ctx = getCtx();
        for (let i = 0; i < monsterDamageAnimations.length; i++) {
            var anim = monsterDamageAnimations[i];
            if (!anim.monster) continue;

            var x = anim.monster.x;
            var y = anim.monster.y - anim.offsetY;

            ctx.save();
            ctx.globalAlpha = anim.alpha;
            ctx.font = getFont('damage', scale, anim.scale);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 金黄色字体 + 深红色描边
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = Math.floor(3 * scale);
            ctx.strokeText('-' + anim.damage, x, y);
            ctx.fillStyle = '#FFD700';
            ctx.fillText('-' + anim.damage, x, y);

            ctx.restore();
        }
    }

    // ==================== 时间扣除动画 ====================

    function createTimeDamageAnimation(timeLoss) {
        var animation = {
            timeLoss: timeLoss,
            startTime: getGameTime(),
            duration: 800,  // 动画持续800ms
            scale: 1.5,
            alpha: 1.0,
            offsetY: 0
        };
        timeDamageAnimations.push(animation);
        Logger.info('创建时间扣除动画:', timeLoss);
    }

    function updateTimeDamageAnimations() {
        var now = getGameTime();

        timeDamageAnimations = timeDamageAnimations.filter(function(anim) {
            var elapsed = now - anim.startTime;
            var progress = elapsed / anim.duration;

            if (progress >= 1) {
                return false;
            }

            anim.alpha = 1.0 - progress;
            anim.offsetY = progress * 40;  // 向下飘40像素
            anim.scale = 1.5 - progress * 0.5;  // 1.5 -> 1.0

            return true;
        });
    }

    function drawTimeDamageAnimations(scale) {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();

        // 计时器位置（屏幕上方中间）
        var timerY = Math.floor(90 * scale);

        for (let i = 0; i < timeDamageAnimations.length; i++) {
            var anim = timeDamageAnimations[i];
            var x = screenWidth / 2;
            var y = timerY + 30 + anim.offsetY;  // 计时器下方30像素，向下飘

            ctx.save();
            ctx.globalAlpha = anim.alpha;

            var fontSize = Math.floor(18 * scale * anim.scale);
            ctx.font = getFont('timeDmg', scale, anim.scale);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 描边
            ctx.strokeStyle = '#660000';
            ctx.lineWidth = Math.floor(2 * scale);
            ctx.strokeText('-' + Math.floor(anim.timeLoss) + 's', x, y);

            // 填充红色
            ctx.fillStyle = '#FF0000';
            ctx.fillText('-' + Math.floor(anim.timeLoss) + 's', x, y);

            ctx.restore();
        }
    }

    // ==================== 快速点击动画 ====================

    function createQuickTapAnimation(x, y, score, multiplier, isFalling) {
        var animation = {
            x: x,
            y: y - 120,  // 显示在星星上方120像素
            score: score,
            multiplier: multiplier || 2,  // 倍数：2或4
            startTime: getGameTime(),
            duration: 600,  // 动画持续600ms
            scale: multiplier === 4 ? 1.8 : 1.5,  // 4倍时更大
            alpha: 1.0,
            offsetY: 0,
            isFalling: isFalling || false  // 是否下落模式
        };
        quickTapAnimations.push(animation);
    }

    function updateQuickTapAnimations() {
        var now = getGameTime();

        quickTapAnimations = quickTapAnimations.filter(function(anim) {
            var elapsed = now - anim.startTime;
            var progress = elapsed / anim.duration;

            if (progress >= 1) {
                return false;
            }

            anim.alpha = 1.0 - progress;
            anim.offsetY = progress * 40;  // 上飘40像素
            var initialScale = anim.multiplier === 4 ? 1.8 : 1.5;
            anim.scale = initialScale - progress * 0.5;

            return true;
        });
    }

    function drawQuickTapAnimations(scale) {
        var ctx = getCtx();
        for (let i = 0; i < quickTapAnimations.length; i++) {
            var anim = quickTapAnimations[i];
            var x = anim.x;
            var y = anim.y - anim.offsetY;

            ctx.save();
            ctx.globalAlpha = anim.alpha;

            var fontSize = Math.floor(40 * scale * anim.scale);
            ctx.font = getFont('quickTap', scale, anim.scale);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 根据模式和倍数显示不同文字
            var text;
            if (anim.isFalling) {
                text = anim.multiplier === 4 ? '🌟×4' : '✨×2';
            } else {
                text = anim.multiplier === 4 ? '⚡×4' : '⚡×2';
            }

            // 4倍用金色，2倍用橙色
            if (anim.multiplier === 4) {
                ctx.strokeStyle = '#FFD700';
                ctx.fillStyle = '#FFAA00';
            } else {
                ctx.strokeStyle = '#FF6600';
                ctx.fillStyle = '#FFCC00';
            }

            ctx.lineWidth = Math.floor(3 * scale);
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);

            ctx.restore();
        }
    }

    // ==================== 灵币掉落动画 ====================

    function createGoldDropAnimation(x, y, amount) {
        var animation = {
            x: x,
            y: y,
            amount: amount,
            startTime: getGameTime(),
            duration: 800,  // 动画持续800ms
            scale: 1.5,
            alpha: 1.0,
            offsetY: 0
        };
        goldDropAnimations.push(animation);
    }

    function updateGoldDropAnimations() {
        var now = getGameTime();

        goldDropAnimations = goldDropAnimations.filter(function(anim) {
            var elapsed = now - anim.startTime;
            var progress = elapsed / anim.duration;

            if (progress >= 1) {
                return false;
            }

            anim.alpha = 1.0 - progress;
            anim.offsetY = progress * 60;  // 上飘60像素
            anim.scale = 1.5 - progress * 0.5;

            return true;
        });
    }

    function drawGoldDropAnimations(scale) {
        var ctx = getCtx();
        var Assets = getAssets();
        var fillRoundRect = getFillRoundRect();

        for (let i = 0; i < goldDropAnimations.length; i++) {
            var anim = goldDropAnimations[i];
            var x = anim.x;
            var y = anim.y - anim.offsetY;

            ctx.save();
            ctx.globalAlpha = anim.alpha;

            var iconSize = Math.floor(24 * scale * anim.scale);

            // 绘制灵币图标
            if (Assets.goldIcon && Assets.goldIcon.complete) {
                ctx.drawImage(Assets.goldIcon, x - iconSize, y - iconSize/2, iconSize, iconSize);
            }

            // 绘制金额文字
            var fontSize = Math.floor(20 * scale * anim.scale);
            ctx.font = getFont('goldDrop', scale, anim.scale);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            var text = '+' + anim.amount;

            // 金色描边
            ctx.strokeStyle = '#B8860B';
            ctx.fillStyle = '#FFD700';
            ctx.lineWidth = Math.floor(2 * scale);
            ctx.strokeText(text, x + Math.floor(5 * scale), y);
            ctx.fillText(text, x + Math.floor(5 * scale), y);

            ctx.restore();
        }
    }

    // ==================== 局内滚动消息系统 ====================

    /**
     * 添加滚动消息（替代 showToast）
     */
    function addGameMessage(text, color, isReward) {
        gameMessages.push({
            text: text,
            color: color || '#ffffff',
            isReward: isReward || false,  // 奖励类型：带金色动画
            age: 0,         // 已存在的帧数
            alpha: 0,        // 当前透明度
            maxAge: 150      // 约2.5秒（60fps * 2.5）
        });
        // 最多保留6条消息
        if (gameMessages.length > 6) {
            gameMessages.shift();
        }
    }

    /**
     * 绘制右侧滚动消息
     */
    function drawGameMessages(scale) {
        if (gameMessages.length === 0) return;

        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var comboCount = getComboCount();
        var fillRoundRect = getFillRoundRect();
        var strokeRoundRect = getStrokeRoundRect();

        var lineHeight = Math.floor(22 * scale);
        var fadeStartAge = 90;  // 约1.5秒后开始淡出
        var rightPadding = Math.floor(15 * scale);

        // 消息区域基准位置：动态避开连击文字区域
        // 连击UI位于 screenHeight/3 + 150*scale，消息应在其上方
        var comboY = Math.floor(screenHeight / 3 + 150 * scale);
        var comboTop = comboY - Math.floor(5 * scale);  // 连击区域顶部留间距
        var defaultBaseY = screenHeight * 0.55 - 60;
        // 如果有连击，确保消息区域底部不超过连击顶部；否则使用默认位置
        var baseY;
        if (comboCount > 0) {
            // 消息最新条在baseY，旧消息在上方，所以整个消息区域底部是baseY
            // 需要baseY <= comboTop - lineHeight
            var maxBaseY = comboTop - lineHeight;
            baseY = Math.min(defaultBaseY, maxBaseY);
        } else {
            baseY = defaultBaseY;
        }

        ctx.save();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = getFont('message', scale);

        for (let i = 0; i < gameMessages.length; i++) {
            var msg = gameMessages[i];
            msg.age++;

            // 淡入（前10帧）
            if (msg.age <= 10) {
                msg.alpha = msg.age / 10;
            } else if (msg.age > fadeStartAge) {
                msg.alpha = Math.max(0, 1 - (msg.age - fadeStartAge) / (msg.maxAge - fadeStartAge));
            } else {
                msg.alpha = 1;
            }

            // 固定槽位：索引0最旧在上方，最新的在下方baseY
            var slotFromTop = i;
            var y = baseY - (gameMessages.length - 1 - slotFromTop) * lineHeight;

            // 跳过屏幕外的消息
            if (y < -lineHeight || y > screenHeight) continue;

            // 半透明背景条
            var textWidth = ctx.measureText(msg.text).width;
            var bgX = screenWidth - textWidth - rightPadding - 8;

            if (msg.isReward) {
                // 奖励消息：底板从金色渐变回默认黑色
                // 前30帧金色底，30-60帧渐变回黑色
                var bgProgress = Math.min(1, msg.age / 60);
                var bgR = Math.floor(51 * (1 - bgProgress));   // 51 → 0
                var bgG = Math.floor(43 * (1 - bgProgress));   // 43 → 0
                var bgB = Math.floor(0 * (1 - bgProgress));    // 0 → 0
                ctx.fillStyle = 'rgba(' + bgR + ', ' + bgG + ', ' + bgB + ', ' + (msg.alpha * 0.6) + ')';
                fillRoundRect(ctx, bgX, y - lineHeight / 2, textWidth + 12, lineHeight, 4);
                // 金色边框（渐隐）
                var borderAlpha = Math.max(0, 1 - msg.age / 60) * msg.alpha;
                if (borderAlpha > 0.01) {
                    ctx.strokeStyle = 'rgba(255, 215, 0, ' + borderAlpha + ')';
                    ctx.lineWidth = 1;
                    strokeRoundRect(ctx, bgX, y - lineHeight / 2, textWidth + 12, lineHeight, 4);
                }
            } else {
                ctx.fillStyle = 'rgba(0, 0, 0, ' + (msg.alpha * 0.35) + ')';
                fillRoundRect(ctx, bgX, y - lineHeight / 2, textWidth + 12, lineHeight, 4);
            }

            // 文字
            ctx.globalAlpha = msg.alpha;
            if (msg.isReward) {
                // 奖励文字动画：白色→msg.color渐变
                // 0-20帧: 白色(#ffffff) → msg.color
                // 20帧+: 保持msg.color
                var textColor;
                if (msg.age <= 20) {
                    var t = msg.age / 20;
                    // 解析msg.color
                    var mc = msg.color || '#ffd700';
                    var mr = 255, mg = 255, mb = 255;
                    if (mc.charAt(0) === '#' && mc.length === 7) {
                        mr = parseInt(mc.substr(1, 2), 16);
                        mg = parseInt(mc.substr(3, 2), 16);
                        mb = parseInt(mc.substr(5, 2), 16);
                    }
                    var fr = Math.floor(255 + (mr - 255) * t);
                    var fg = Math.floor(255 + (mg - 255) * t);
                    var fb = Math.floor(255 + (mb - 255) * t);
                    textColor = 'rgb(' + fr + ',' + fg + ',' + fb + ')';
                } else {
                    textColor = msg.color || '#ffd700';
                }
                ctx.fillStyle = textColor;
            } else {
                ctx.fillStyle = msg.color;
            }
            ctx.fillText(msg.text, screenWidth - rightPadding, y);
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // 移除过期消息
        gameMessages = gameMessages.filter(function(msg) {
            return msg.age < msg.maxAge;
        });
    }

    // ==================== 元素连击效果 ====================

    function drawElementalComboEffect(scale) {
        if (!elementalComboActive) return;

        var ctx = getCtx();
        var monster = getMonster();
        var now = getGameTime();
        var elapsed = now - elementalComboTime;

        // 超过显示时间则停止
        if (elapsed > ELEMENTAL_COMBO_DURATION) {
            elementalComboActive = false;
            return;
        }

        // 计算动画进度（0到1）
        var progress = elapsed / ELEMENTAL_COMBO_DURATION;
        var alpha = 1 - progress;  // 渐隐效果
        var pulseScale = 1 + 0.2 * Math.sin(progress * Math.PI * 4);  // 脉冲缩放

        ctx.save();
        ctx.globalAlpha = alpha;

        // 在怪物位置显示效果
        if (monster.active) {
            var x = monster.x;
            var y = monster.y;

            // 绘制光环效果
            var gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.floor(100 * scale * pulseScale));
            gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');  // 火焰橙
            gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.5)');  // 冰蓝
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, Math.floor(100 * scale * pulseScale), 0, Math.PI * 2);
            ctx.fill();

            // 绘制文字提示
            var fontSize = Math.floor(32 * scale * pulseScale);
            ctx.font = getFont('elemental', scale, pulseScale);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 描边
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = Math.floor(4 * scale);
            ctx.strokeText('💨 汽伤！', x, y - Math.floor(80 * scale));

            // 渐变文字（冰到火的颜色）
            var textGradient = ctx.createLinearGradient(x - 60, y, x + 60, y);
            textGradient.addColorStop(0, '#00BFFF');  // 冰蓝
            textGradient.addColorStop(1, '#FF4500');  // 火红
            ctx.fillStyle = textGradient;
            ctx.fillText('💨 汽伤！', x, y - Math.floor(80 * scale));

            // 显示双倍伤害提示
            ctx.font = getFont('elementalSub', scale);
            ctx.fillStyle = '#FFD700';
            ctx.fillText('×2 冲击！', x, y - Math.floor(50 * scale));
        }

        ctx.restore();
    }

    // ==================== 技能伤害动画 ====================

    function createSkillDamageAnimation(x, y, damage, emoji) {
        skillDamageAnimations.push({
            x: x,
            y: y,
            damage: damage,
            emoji: emoji,
            startTime: getGameTime(),
            duration: 800,
            startY: y
        });
    }

    function updateSkillDamageAnimations() {
        var now = getGameTime();
        for (let i = skillDamageAnimations.length - 1; i >= 0; i--) {
            var anim = skillDamageAnimations[i];
            var elapsed = now - anim.startTime;
            if (elapsed >= anim.duration) {
                skillDamageAnimations.splice(i, 1);
            } else {
                // 向上飘动
                var progress = elapsed / anim.duration;
                anim.y = anim.startY - 60 * progress;
            }
        }
    }

    function drawSkillDamageAnimations(scale) {
        var ctx = getCtx();
        var now = getGameTime();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < skillDamageAnimations.length; i++) {
            var anim = skillDamageAnimations[i];
            var elapsed = now - anim.startTime;
            var progress = elapsed / anim.duration;
            var alpha = 1 - progress;

            // 绘制伤害数字
            ctx.font = getFont('damage', scale);
            ctx.fillStyle = 'rgba(255, 215, 0, ' + alpha + ')';
            ctx.strokeStyle = 'rgba(139, 0, 0, ' + alpha + ')';
            ctx.lineWidth = 2;
            ctx.strokeText('-' + anim.damage, anim.x, anim.y);
            ctx.fillText('-' + anim.damage, anim.x, anim.y);

            // 绘制技能图标
            ctx.font = getFont('skillEmoji', scale);
            ctx.fillText(anim.emoji, anim.x + 30, anim.y);
        }

        ctx.textAlign = 'left';
    }

    // ==================== 宠物伤害动画 ====================

    function createPetDamageAnimation(x, y, damage, emoji, isCritical) {
        petDamageAnimations.push({
            x: x,
            y: y,
            damage: damage,
            emoji: emoji,
            isCritical: isCritical,
            startTime: getGameTime(),
            duration: 600,
            startY: y
        });
    }

    function updatePetDamageAnimations() {
        var now = getGameTime();
        for (let i = petDamageAnimations.length - 1; i >= 0; i--) {
            var anim = petDamageAnimations[i];
            var elapsed = now - anim.startTime;
            if (elapsed >= anim.duration) {
                petDamageAnimations.splice(i, 1);
            } else {
                var progress = elapsed / anim.duration;
                anim.y = anim.startY - 40 * progress;
            }
        }
    }

    function drawPetDamageAnimations(scale) {
        var ctx = getCtx();
        var now = getGameTime();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < petDamageAnimations.length; i++) {
            var anim = petDamageAnimations[i];
            var elapsed = now - anim.startTime;
            var progress = elapsed / anim.duration;
            var alpha = 1 - progress;

            // 颜色：暴击用金色，普通用青色
            var color = anim.isCritical ? 'rgba(255, 215, 0, ' + alpha + ')' : 'rgba(0, 255, 255, ' + alpha + ')';

            ctx.font = getFont('pet', scale);
            ctx.fillStyle = color;
            ctx.fillText(anim.emoji + '-' + anim.damage, anim.x, anim.y);
        }

        ctx.textAlign = 'left';
    }

    // ==================== 怪物攻击弹幕动画 ====================

    function createMonsterProjectileAnimation(startX, startY, damage, timeDamage, isBoss, onHit) {
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();

        // 终点：玩家血条中心
        var endX = screenWidth / 2;
        var endY = screenHeight - Math.floor(50 * scale);

        // 起点左右偏移，让弹幕从怪物旁边飞出，弧线方向跟随偏移方向
        var arcSide = Math.random() < 0.5 ? -1 : 1;
        var sideOffset = arcSide * (30 + Math.random() * 20);

        var animation = {
            startX: startX + sideOffset,
            startY: startY,
            endX: endX,
            endY: endY,
            x: startX + sideOffset,
            y: startY,
            damage: damage,
            timeDamage: timeDamage,
            isBoss: isBoss,
            startTime: getGameTime(),
            duration: 500,
            progress: 0,
            trail: [],
            onHit: onHit,
            completed: false,
            arcSide: arcSide  // 弧线偏移方向：左飞左弯，右飞右弯
        };
        monsterProjectileAnimations.push(animation);
    }

    function updateMonsterProjectileAnimations() {
        var now = getGameTime();
        for (let i = monsterProjectileAnimations.length - 1; i >= 0; i--) {
            var anim = monsterProjectileAnimations[i];
            var elapsed = now - anim.startTime;
            anim.progress = Math.min(elapsed / anim.duration, 1);

            if (anim.progress >= 1 && !anim.completed) {
                anim.completed = true;
                if (anim.onHit) { anim.onHit(); }
            }

            if (anim.progress >= 1) {
                // 到达后短暂保留显示
                if (elapsed >= anim.duration + 100) {
                    monsterProjectileAnimations.splice(i, 1);
                }
                continue;
            }

            // Y轴抛物线（向上拱起再落下）+ 顶峰偏向攻击侧
            var t = anim.progress;
            var linearX = anim.startX + (anim.endX - anim.startX) * t;
            var linearY = anim.startY + (anim.endY - anim.startY) * t;
            var arcHeight = Math.abs(anim.endY - anim.startY) * 0.3;
            var arcOffset = 4 * arcHeight * t * (1 - t);
            anim.y = linearY - arcOffset;
            anim.x = linearX + arcOffset * anim.arcSide * 0.1;

            // 尾迹粒子
            if (Math.random() < 0.6) {
                anim.trail.push({
                    x: anim.x + (Math.random() - 0.5) * 6,
                    y: anim.y + (Math.random() - 0.5) * 6,
                    size: Math.random() * 4 + 2,
                    alpha: 0.8,
                    startTime: now
                });
            }
            anim.trail = anim.trail.filter(function(p) {
                var pElapsed = now - p.startTime;
                p.alpha = 0.8 * (1 - pElapsed / 250);
                p.size *= 0.96;
                return p.alpha > 0 && p.size > 0.5;
            });
        }
    }

    function drawMonsterProjectileAnimations(scale) {
        var ctx = getCtx();
        for (let i = 0; i < monsterProjectileAnimations.length; i++) {
            var anim = monsterProjectileAnimations[i];
            if (anim.completed) continue;

            // 尾迹粒子
            for (let j = 0; j < anim.trail.length; j++) {
                var p = anim.trail[j];
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = anim.isBoss ? '#ff4444' : '#ff8800';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // 弹幕主体
            var radius = anim.isBoss ? Math.floor(12 * scale) : Math.floor(8 * scale);
            ctx.save();

            // 外发光
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = anim.isBoss ? '#ff2222' : '#ff6600';
            ctx.beginPath();
            ctx.arc(anim.x, anim.y, radius * 1.8, 0, Math.PI * 2);
            ctx.fill();

            // 主体
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = anim.isBoss ? '#ff4444' : '#ff8833';
            ctx.beginPath();
            ctx.arc(anim.x, anim.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // 亮心
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffcc66';
            ctx.beginPath();
            ctx.arc(anim.x, anim.y, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    // ==================== 点击波纹动画 ====================

    // 高明度低饱和度色彩池
    var tapRippleColors = [
        { r: 255, g: 220, b: 180 },  // 暖白
        { r: 180, g: 220, b: 255 },  // 冷白蓝
        { r: 255, g: 200, b: 220 },  // 淡粉
        { r: 200, g: 255, b: 220 },  // 淡绿
        { r: 220, g: 200, b: 255 },  // 淡紫
        { r: 255, g: 255, b: 200 }   // 淡黄
    ];

    function createTapRippleAnimation(x, y, touchId) {
        var scale = getScreenScale();
        var rays = [];
        var count = 6 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            var angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
            var offsetDist = (1 + Math.random() * 3) * scale;
            var maxLen = (4 + Math.random() * 4) * scale;
            var color = tapRippleColors[Math.floor(Math.random() * tapRippleColors.length)];
            rays.push({
                angle: angle,
                startX: x + Math.cos(angle) * offsetDist,
                startY: y + Math.sin(angle) * offsetDist,
                maxLength: maxLen,
                length: 0,
                width: (0.25 + Math.random() * 0.5) * scale,
                color: color,
                // 粒子阶段
                particleX: 0,
                particleY: 0,
                particleVx: (Math.random() - 0.5) * 0.3 * scale,
                particleVy: -0.3 * scale - Math.random() * 0.3 * scale,
                particleSize: (1 + Math.random() * 1) * scale,
                alpha: 1.0
            });
        }
        // 三阶段：放射(150ms) → 收缩成粒子(100ms) → 飘散消散(400ms)
        tapRippleAnimations.push({
            x: x,
            y: y,
            touchId: touchId || 0,  // 触点ID，支持多指
            startTime: getGameTime(),
            phase1: 150,   // 快速放射
            phase2: 200,   // 收缩成粒子
            phase3: 650,   // 飘散消散
            duration: 999999,  // 长按模式不自动结束，松手后设定结束时间
            maxRadius: 30 * scale,
            rippleRadius: 0,
            rippleAlpha: 0,
            rays: rays,
            holding: true,  // 默认长按模式，松手时设为false
            holdParticles: [],    // 长按阶段4的额外粒子
            lastSpawnTime: 0      // 上次生成粒子时间
        });
    }

    function moveTapRipple(touchId, x, y) {
        for (let i = 0; i < tapRippleAnimations.length; i++) {
            var anim = tapRippleAnimations[i];
            if (anim.holding && anim.touchId === touchId) {
                anim.x = x;
                anim.y = y;
            }
        }
    }

    function releaseTapRipple(touchId) {
        for (let i = 0; i < tapRippleAnimations.length; i++) {
            var anim = tapRippleAnimations[i];
            if (anim.holding && anim.touchId === touchId) {
                anim.holding = false;
                var now = getGameTime();
                anim.duration = now - anim.startTime + 800;
            }
        }
    }

    function updateTapRippleAnimations() {
        var now = getGameTime();
        var scale = getScreenScale();
        tapRippleAnimations = tapRippleAnimations.filter(function(anim) {
            var elapsed = now - anim.startTime;
            if (elapsed >= anim.duration) return false;

            var p1 = anim.phase1;
            var p2 = anim.phase2;
            var p3 = anim.phase3;

            for (let i = 0; i < anim.rays.length; i++) {
                var r = anim.rays[i];

                if (elapsed < p1) {
                    // 阶段1：快速放射
                    var progress = elapsed / p1;
                    r.length = r.maxLength * progress;
                    r.alpha = 0.9;
                    // 波纹随放射扩展
                    anim.rippleRadius = anim.maxRadius * progress;
                    anim.rippleAlpha = 0.4 * progress;
                } else if (elapsed < p2) {
                    // 阶段2：从起点端向末端收缩成粒子
                    var progress = (elapsed - p1) / (p2 - p1);
                    r.shrinkOffset = r.maxLength * progress;  // 起点端缩进量
                    r.length = r.maxLength * (1 - progress);
                    r.alpha = 0.9 - 0.3 * progress;
                    // 粒子位置在光线末端
                    r.particleX = r.startX + Math.cos(r.angle) * r.maxLength;
                    r.particleY = r.startY + Math.sin(r.angle) * r.maxLength;
                    // 波纹渐隐
                    anim.rippleAlpha = 0.4 * (1 - progress);
                } else if (elapsed < p3) {
                    // 阶段3：粒子飘散消散
                    r.length = 0;
                    var progress = (elapsed - p2) / (p3 - p2);
                    r.particleX += r.particleVx;
                    r.particleY += r.particleVy;
                    r.alpha = Math.max(0, 1.0 - progress * 1.2);
                    anim.rippleAlpha = 0;
                } else {
                    // 阶段3结束
                    r.length = 0;
                    r.alpha = 0;
                }
            }

            // 阶段4：长按持续生成向上飘的粒子（阶段3开始时即可生成，不必等粒子消散）
            if (anim.holding && elapsed >= p2) {
                if (now - anim.lastSpawnTime > 100) {  // 每100ms生成一个粒子
                    anim.lastSpawnTime = now;
                    var color = tapRippleColors[Math.floor(Math.random() * tapRippleColors.length)];
                    anim.holdParticles.push({
                        x: anim.x + (Math.random() - 0.5) * 11 * scale,
                        y: anim.y + (Math.random() - 0.5) * 11 * scale,
                        vx: (Math.random() - 0.5) * 0.3 * scale,
                        vy: -0.6 * scale - Math.random() * 0.4 * scale,
                        size: (1.0 + Math.random() * 1.0) * scale,
                        alpha: 0.9,
                        color: color,
                        startTime: now,
                        life: 600 + Math.random() * 400  // 600-1000ms寿命
                    });
                }
            }

            // 更新长按粒子
            for (let j = anim.holdParticles.length - 1; j >= 0; j--) {
                var p = anim.holdParticles[j];
                p.x += p.vx;
                p.y += p.vy;
                var age = now - p.startTime;
                if (age >= p.life) {
                    anim.holdParticles.splice(j, 1);
                } else {
                    // 后半段开始衰减
                    var fadeStart = p.life * 0.5;
                    if (age > fadeStart) {
                        p.alpha = 0.9 * (1 - (age - fadeStart) / (p.life - fadeStart));
                    }
                }
            }

            // 非长按模式下，粒子清空后可结束
            if (!anim.holding && anim.holdParticles.length === 0 && elapsed >= p3) {
                return false;
            }

            return true;
        });
    }

    function drawTapRippleAnimations(scale) {
        var ctx = getCtx();
        for (let i = 0; i < tapRippleAnimations.length; i++) {
            var anim = tapRippleAnimations[i];

            // 波纹圆环
            if (anim.rippleAlpha > 0) {
                ctx.strokeStyle = 'rgba(255, 255, 255, ' + anim.rippleAlpha + ')';
                ctx.lineWidth = 1.5 * scale;
                ctx.beginPath();
                ctx.arc(anim.x, anim.y, anim.rippleRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            for (let j = 0; j < anim.rays.length; j++) {
                var r = anim.rays[j];
                if (r.alpha <= 0) continue;
                var c = r.color;

                // 光线阶段
                if (r.length > 0) {
                    var shrinkOffset = r.shrinkOffset || 0;
                    var drawStartX = r.startX + Math.cos(r.angle) * shrinkOffset;
                    var drawStartY = r.startY + Math.sin(r.angle) * shrinkOffset;
                    ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + r.alpha + ')';
                    ctx.lineWidth = r.width;
                    ctx.beginPath();
                    ctx.moveTo(drawStartX, drawStartY);
                    ctx.lineTo(
                        r.startX + Math.cos(r.angle) * (shrinkOffset + r.length),
                        r.startY + Math.sin(r.angle) * (shrinkOffset + r.length)
                    );
                    ctx.stroke();
                }

                // 粒子阶段（光线消失后）
                if (r.length === 0 && r.particleX !== 0) {
                    ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + r.alpha + ')';
                    ctx.beginPath();
                    ctx.arc(r.particleX, r.particleY, r.particleSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // 长按阶段4粒子
            for (let k = 0; k < anim.holdParticles.length; k++) {
                var hp = anim.holdParticles[k];
                if (hp.alpha <= 0) continue;
                var hc = hp.color;
                ctx.fillStyle = 'rgba(' + hc.r + ',' + hc.g + ',' + hc.b + ',' + hp.alpha + ')';
                ctx.beginPath();
                ctx.arc(hp.x, hp.y, hp.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ==================== 星星点击粒子爆发 ====================

    var starBurstAnimations = [];
    var starBurstColors = {
        normal:   { r: 255, g: 215, b: 0 },
        fire:     { r: 255, g: 107, b: 53 },
        ice:      { r: 160, g: 210, b: 255 },
        time:     { r: 127, g: 255, b: 127 },
        lightning: { r: 255, g: 230, b: 100 },
        combo:    { r: 100, g: 255, b: 255 },
        heal:     { r: 144, g: 238, b: 144 },
        default:  { r: 255, g: 230, b: 180 }
    };

    function createStarBurstAnimation(x, y, starType) {
        var scale = getScreenScale();
        var color = starBurstColors[starType] || starBurstColors.default;
        var count = starType === 'big' ? 14 : (7 + Math.floor(Math.random() * 4));
        var particles = [];
        for (var i = 0; i < count; i++) {
            var angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            var speed = (1.5 + Math.random() * 2.5) * scale;
            var cr = Math.max(0, Math.min(255, color.r + Math.floor((Math.random() - 0.5) * 40)));
            var cg = Math.max(0, Math.min(255, color.g + Math.floor((Math.random() - 0.5) * 40)));
            var cb = Math.max(0, Math.min(255, color.b + Math.floor((Math.random() - 0.5) * 40)));
            particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: (1.5 + Math.random() * 1.5) * scale,
                colorBase: cr + ',' + cg + ',' + cb,
                alpha: 1.0
            });
        }
        starBurstAnimations.push({
            particles: particles,
            startTime: getGameTime(),
            duration: 500,
            gravity: 0.08 * scale
        });
    }

    function updateStarBurstAnimations() {
        var now = getGameTime();
        var writeIdx = 0;
        for (var i = 0; i < starBurstAnimations.length; i++) {
            var anim = starBurstAnimations[i];
            var progress = (now - anim.startTime) / anim.duration;
            if (progress >= 1) continue;
            for (var j = 0; j < anim.particles.length; j++) {
                var p = anim.particles[j];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += anim.gravity;
                p.vx *= 0.97;
                p.alpha = 1.0 - progress;
            }
            starBurstAnimations[writeIdx++] = anim;
        }
        starBurstAnimations.length = writeIdx;
    }

    function drawStarBurstAnimations(scale) {
        var ctx = getCtx();
        for (var i = 0; i < starBurstAnimations.length; i++) {
            var anim = starBurstAnimations[i];
            for (var j = 0; j < anim.particles.length; j++) {
                var p = anim.particles[j];
                if (p.alpha <= 0) continue;
                ctx.fillStyle = 'rgba(' + p.colorBase + ',' + p.alpha + ')';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ==================== 星星合成聚拢动画 ====================

    var mergeAnimations = [];

    function createMergeAnimation(x1, y1, type1, x2, y2, type2, onMerge) {
        mergeAnimations.push({
            star1X: x1, star1Y: y1, star1Type: type1,
            star2X: x2, star2Y: y2, star2Type: type2,
            midX: (x1 + x2) / 2, midY: (y1 + y2) / 2,
            startTime: getGameTime(),
            duration: 100,
            merged: false,
            onMerge: onMerge
        });
    }

    function updateMergeAnimations() {
        var now = getGameTime();
        for (var i = mergeAnimations.length - 1; i >= 0; i--) {
            var anim = mergeAnimations[i];
            var elapsed = now - anim.startTime;
            var rawProgress = Math.min(elapsed / anim.duration, 1);
            anim.progress = rawProgress * rawProgress * rawProgress; // easeInCubic 慢→快加速感
            if (rawProgress >= 1 && !anim.merged) {
                anim.merged = true;
                if (anim.onMerge) anim.onMerge();
            }
            if (anim.merged && elapsed > anim.duration + 150) {
                mergeAnimations.splice(i, 1);
            }
        }
    }

    function drawMergeAnimations(scale) {
        var ctx = getCtx();
        for (var i = 0; i < mergeAnimations.length; i++) {
            var anim = mergeAnimations[i];

            // 合并闪光
            if (anim.merged) {
                var flashElapsed = getGameTime() - anim.startTime - anim.duration;
                var flashP = flashElapsed / 150;
                if (flashP < 1) {
                    ctx.save();
                    ctx.globalAlpha = (1 - flashP) * 0.6;
                    ctx.beginPath();
                    ctx.arc(anim.midX, anim.midY, (20 + flashP * 25) * scale, 0, Math.PI * 2);
                    ctx.fillStyle = '#FFD700';
                    ctx.fill();
                    ctx.restore();
                }
                continue;
            }

            var p = anim.progress;
            var cx1 = anim.star1X + (anim.midX - anim.star1X) * p;
            var cy1 = anim.star1Y + (anim.midY - anim.star1Y) * p;
            var cx2 = anim.star2X + (anim.midX - anim.star2X) * p;
            var cy2 = anim.star2Y + (anim.midY - anim.star2Y) * p;

            // 金色连接线
            ctx.save();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = Math.max(1, (1.5 + p * 1.5) * scale);
            ctx.globalAlpha = 0.4 + p * 0.6;
            ctx.shadowBlur = 8 * scale;
            ctx.shadowColor = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(cx1, cy1);
            ctx.lineTo(cx2, cy2);
            ctx.stroke();
            ctx.restore();

            // 两端虚影星（半透明圆点）
            ctx.save();
            ctx.globalAlpha = 0.6 + p * 0.4;
            ctx.fillStyle = '#FFD700';
            ctx.shadowBlur = 6 * scale;
            ctx.shadowColor = '#FFD700';
            ctx.beginPath();
            ctx.arc(cx1, cy1, (3 + p * 5) * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx2, cy2, (3 + p * 5) * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ==================== 点击得分飘字 ====================

    var scorePopupAnimations = [];

    function createScorePopupAnimation(x, y, score, color) {
        var scale = getScreenScale();
        var token = (color || score >= 20) ? 'scoreLarge' : 'scorePopup';
        var cfg = _combatFontConfig();
        var f = cfg ? cfg.FONTS[token] : { base: 22 };
        var fontSize = Math.floor(f.base * scale);
        scorePopupAnimations.push({
            x: x,
            y: y - 30 * scale,
            score: score,
            startTime: getGameTime(),
            duration: 500,
            fontSize: fontSize,
            alpha: 1.0,
            offsetY: 0,
            color: color || null
        });
    }

    function updateScorePopupAnimations() {
        var now = getGameTime();
        var writeIdx = 0;
        for (var i = 0; i < scorePopupAnimations.length; i++) {
            var anim = scorePopupAnimations[i];
            var progress = (now - anim.startTime) / anim.duration;
            if (progress >= 1) continue;
            anim.alpha = 1.0 - progress;
            anim.offsetY = progress * 40;
            scorePopupAnimations[writeIdx++] = anim;
        }
        scorePopupAnimations.length = writeIdx;
    }

    function drawScorePopupAnimations(scale) {
        var ctx = getCtx();
        for (var i = 0; i < scorePopupAnimations.length; i++) {
            var anim = scorePopupAnimations[i];
            if (anim.alpha <= 0) continue;
            ctx.save();
            ctx.globalAlpha = anim.alpha;
            var fillColor = anim.color || '#FFD700';
            var cfg = _combatFontConfig();
            var spWeight = (cfg && cfg.FONTS.scorePopup) ? cfg.FONTS.scorePopup.weight : 'normal';
            ctx.font = spWeight + ' ' + anim.fontSize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var text = '+' + anim.score;
            var drawY = anim.y - anim.offsetY;
            // 辉光
            if (anim.color) {
                ctx.shadowColor = fillColor;
                ctx.shadowBlur = 12 * scale;
            }
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = scale;
            ctx.strokeText(text, anim.x, drawY);
            ctx.fillText(text, anim.x, drawY);
            ctx.restore();
        }
    }

    // ==================== 视觉屏幕震动 ====================

    var screenShakeState = {
        offsetX: 0,
        offsetY: 0,
        startTime: 0,
        intensity: 0,
        active: false
    };

    function createScreenShake(intensity) {
        screenShakeState.intensity = intensity * getScreenScale();
        screenShakeState.startTime = getGameTime();
        screenShakeState.active = true;
    }

    function updateScreenShake() {
        if (!screenShakeState.active) return;
        var elapsed = getGameTime() - screenShakeState.startTime;
        var duration = 150;
        if (elapsed >= duration) {
            screenShakeState.active = false;
            screenShakeState.offsetX = 0;
            screenShakeState.offsetY = 0;
            return;
        }
        var decay = 1.0 - (elapsed / duration);
        var maxOffset = screenShakeState.intensity * decay;
        screenShakeState.offsetX = (Math.random() - 0.5) * 2 * maxOffset;
        screenShakeState.offsetY = (Math.random() - 0.5) * 2 * maxOffset;
    }

    function getScreenShakeOffset() {
        return screenShakeState;
    }

    function clearAllAnimations() {
        // 重置动画时钟（防止暂停后残留 _pauseStartTime 导致新动画卡住）
        _pauseStartTime = null;
        _pauseAccumulated = 0;

        critAnimations.length = 0;
        meteorAnimations.length = 0;
        hpBarCounterAnimations.length = 0;
        playerDamageAnimations.length = 0;
        monsterDamageAnimations.length = 0;
        timeDamageAnimations.length = 0;
        quickTapAnimations.length = 0;
        goldDropAnimations.length = 0;
        skillDamageAnimations.length = 0;
        petDamageAnimations.length = 0;
        monsterProjectileAnimations.length = 0;
        starBurstAnimations.length = 0;
        mergeAnimations.length = 0;
        scorePopupAnimations.length = 0;
        gameMessages.length = 0;
    }

    // ==================== 公共 API ====================
    return {
        // 虚拟时钟（暂停控制）
        getGameTime: getGameTime,
        pauseAnimations: pauseAnimations,
        resumeAnimations: resumeAnimations,

        // 暴击动画
        createCritAnimation: createCritAnimation,
        updateCritAnimations: updateCritAnimations,
        drawCritAnimations: drawCritAnimations,

        // 流星动画
        createMeteorAnimation: createMeteorAnimation,
        updateMeteorAnimations: updateMeteorAnimations,
        drawMeteorAnimations: drawMeteorAnimations,

        // 流星爆炸
        createMeteorHitEffect: createMeteorHitEffect,
        updateMeteorExplosions: updateMeteorExplosions,
        drawMeteorExplosions: drawMeteorExplosions,

        // 血条反击
        createHpBarCounterAnimation: createHpBarCounterAnimation,
        updateHpBarCounterAnimations: updateHpBarCounterAnimations,
        drawHpBarCounterAnimations: drawHpBarCounterAnimations,

        // 玩家伤害
        createPlayerDamageAnimation: createPlayerDamageAnimation,
        updatePlayerDamageAnimations: updatePlayerDamageAnimations,
        drawPlayerDamageAnimations: drawPlayerDamageAnimations,

        // 怪物伤害
        createMonsterDamageAnimation: createMonsterDamageAnimation,
        updateMonsterDamageAnimations: updateMonsterDamageAnimations,
        drawMonsterDamageAnimations: drawMonsterDamageAnimations,

        // 时间伤害
        createTimeDamageAnimation: createTimeDamageAnimation,
        updateTimeDamageAnimations: updateTimeDamageAnimations,
        drawTimeDamageAnimations: drawTimeDamageAnimations,

        // 完美点击
        createQuickTapAnimation: createQuickTapAnimation,
        updateQuickTapAnimations: updateQuickTapAnimations,
        drawQuickTapAnimations: drawQuickTapAnimations,

        // 灵币掉落
        createGoldDropAnimation: createGoldDropAnimation,
        updateGoldDropAnimations: updateGoldDropAnimations,
        drawGoldDropAnimations: drawGoldDropAnimations,

        // 消息系统
        addGameMessage: addGameMessage,
        drawGameMessages: drawGameMessages,

        // 元素连击
        drawElementalComboEffect: drawElementalComboEffect,

        // 技能伤害
        createSkillDamageAnimation: createSkillDamageAnimation,
        updateSkillDamageAnimations: updateSkillDamageAnimations,
        drawSkillDamageAnimations: drawSkillDamageAnimations,

        // 宠物伤害
        createPetDamageAnimation: createPetDamageAnimation,
        updatePetDamageAnimations: updatePetDamageAnimations,
        drawPetDamageAnimations: drawPetDamageAnimations,

        // 怪物攻击弹幕
        createMonsterProjectileAnimation: createMonsterProjectileAnimation,
        updateMonsterProjectileAnimations: updateMonsterProjectileAnimations,
        drawMonsterProjectileAnimations: drawMonsterProjectileAnimations,

        // 点击波纹
        createTapRippleAnimation: createTapRippleAnimation,
        updateTapRippleAnimations: updateTapRippleAnimations,
        drawTapRippleAnimations: drawTapRippleAnimations,
        releaseTapRipple: releaseTapRipple,
        moveTapRipple: moveTapRipple,

        // 星星点击粒子爆发
        createStarBurstAnimation: createStarBurstAnimation,
        updateStarBurstAnimations: updateStarBurstAnimations,
        drawStarBurstAnimations: drawStarBurstAnimations,

        // 星星合成聚拢
        createMergeAnimation: createMergeAnimation,
        updateMergeAnimations: updateMergeAnimations,
        drawMergeAnimations: drawMergeAnimations,

        // 点击得分飘字
        createScorePopupAnimation: createScorePopupAnimation,
        updateScorePopupAnimations: updateScorePopupAnimations,
        drawScorePopupAnimations: drawScorePopupAnimations,

        // 视觉屏幕震动
        createScreenShake: createScreenShake,
        updateScreenShake: updateScreenShake,
        getScreenShakeOffset: getScreenShakeOffset,

        // 辅助函数
        getStarColor: getStarColor,
        getStarGlowColor: getStarGlowColor,
        easeOutQuad: easeOutQuad,
        drawMeteorStar: drawMeteorStar,
        clearAllAnimations: clearAllAnimations,
        drawMeteorTail: drawMeteorTail,

        // 元素连击状态设置（由 game.js 汽伤触发时调用）
        setElementalComboState: function(active, time) {
            elementalComboActive = active;
            elementalComboTime = time;
        },

        // 震动冷却状态访问（由 game.js 点击大星星时调用）
        getLastVibrateTime: function() { return lastVibrateTime; },
        setLastVibrateTime: function(t) { lastVibrateTime = t; },
        getVibrateCooldown: function() { return VIBRATE_COOLDOWN; },

        // 清空消息（由 game.js 游戏重置时调用）
        clearMessages: function() {
            gameMessages = [];
        },

        // 清空所有动画（由 game.js 游戏重置时调用）
        clearAllAnimations: function() {
            // 重置动画时钟（防止暂停后残留 _pauseStartTime 导致新动画卡住）
            _pauseStartTime = null;
            _pauseAccumulated = 0;

            critAnimations = [];
            meteorAnimations = [];
            meteorExplosions = [];
            hpBarCounterAnimations = [];
            playerDamageAnimations = [];
            monsterDamageAnimations = [];
            timeDamageAnimations = [];
            quickTapAnimations = [];
            goldDropAnimations = [];
            skillDamageAnimations = [];
            petDamageAnimations = [];
            monsterProjectileAnimations = [];
            gameMessages = [];
            starBurstAnimations = [];
            scorePopupAnimations = [];
            screenShakeState.active = false;
            screenShakeState.offsetX = 0;
            screenShakeState.offsetY = 0;
        },

        // 模式标记 — 进入模式时设置，cleanup 时清理
        _modeId: null,
        setModeId: function(modeId) { this._modeId = modeId; },
        getModeId: function() { return this._modeId; }
    };
}

export { createAnimationSystem };
