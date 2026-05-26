import Logger from '../utils/Logger.js';
import { SATURATION_COSTS } from './SaturationState.js';

var D2_UNLOCK_LEVEL = 5;
var CHARGE_LIGHT_MIN = 500;
var CHARGE_LIGHT_MAX = 1500;
var CHARGE_MEDIUM_MIN = 1500;
var CHARGE_MEDIUM_MAX = 3000;
var CHARGE_FULL_MIN = 3000;
var CANCEL_MOVE_THRESHOLD = 20;
var CHARGE_AUTO_ABSORB_RADIUS = 120;
var CHARGE_AUTO_ABSORB_PROGRESS = 0.08;
var AUTO_CAST_DELAY = 250;       // 满蓄后250ms自动施法
var CAST_EFFECT_DURATION = 400;  // 爆裂粒子消散时长
var METEOR_DURATION = 300;       // 流星飞行时长

function createChargeSystem(deps) {
    var getSaveData = deps.getSaveData;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var isTutorialComplete = deps.isTutorialComplete;
    var getActiveMonsters = deps.getActiveMonsters;
    var addMessage = deps.addMessage || function () { };
    var createScreenShake = deps.createScreenShake || function () { };
    var applyDamageToMonster = deps.applyDamageToMonster || function () { };
    var saturationState = deps.saturationState;
    var getStars = deps.getStars || function () { return []; };
    var setStars = deps.setStars || function () { };
    var drawStar = deps.drawStar || null;
    var addScore = deps.addScore || function () { };
    var addLinkCharge = deps.addLinkCharge || function () { };
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };

    var state = {
        phase: 'idle',               // idle|monitoring|charging|autoCast|castEffect
        touchId: null,
        startX: 0, startY: 0,
        chargeStartTime: 0,
        moveDistance: 0,
        monitorTimerId: null,
        monitoredStar: null,
        chargeStar: null,
        originalDisappearTime: 0,
        chargeCenterX: 0, chargeCenterY: 0,
        dragBuff: 0,
        autoCastStartTime: 0,
        castParticles: [],
        castMeteors: [],
        firedLightMeteor: false,      // 轻蓄阶段流星已发射
        firedMediumMeteor: false,     // 中蓄阶段流星已发射
        absorbedMeteorCount: 0       // 已因吸收灵光发射的流星数
    };

    function isUnlocked() {
        if (isTutorialComplete && isTutorialComplete()) return true;
        var pd = getSaveData();
        if (!pd || !pd.currentCharacterId) return false;
        var charExp = pd.characterExperience;
        if (!charExp || !charExp[pd.currentCharacterId]) return false;
        return charExp[pd.currentCharacterId].level >= D2_UNLOCK_LEVEL;
    }

    function isCharging() { return state.phase === 'charging'; }
    function isMonitoring() { return state.phase === 'monitoring'; }
    function isAutoCast() { return state.phase === 'autoCast'; }

    // ── 监控期 ──

    function beginMonitoring(x, y, touchId, star) {
        if (!isUnlocked()) return false;
        state.phase = 'monitoring';
        state.touchId = touchId;
        state.startX = x; state.startY = y;
        state.moveDistance = 0;
        state.chargeStartTime = Date.now();
        state.monitoredStar = star || null;
        if (state.monitoredStar) {
            state.originalDisappearTime = state.monitoredStar.disappearTime;
            state.monitoredStar._charging = true;
            state.monitoredStar.disappearTime = Date.now() + 86400000;
        }
        state.chargeCenterX = state.monitoredStar ? state.monitoredStar.x : x;
        state.chargeCenterY = state.monitoredStar ? state.monitoredStar.y : y;
        return true;
    }

    function updateMonitoring(x, y) {
        if (state.phase !== 'monitoring') return;
        var dx = x - state.startX;
        var dy = y - state.startY;
        state.moveDistance = Math.sqrt(dx * dx + dy * dy);
    }

    // ── 从拖拽聚合进入蓄力（叠加buff） ──

    function beginDragCharge(x, y, touchId, dragBuff) {
        state.phase = 'charging';
        state.chargeStartTime = Date.now() - dragBuff * 0.3 * CHARGE_FULL_MIN; // 每个聚合buff加速30%
        state.touchId = touchId;
        state.chargeCenterX = x;
        state.chargeCenterY = y;
        state.dragBuff = dragBuff;
        state.chargeStar = null; // 没有chargeStar（灵光已全部被拖拽消耗）
        state.moveDistance = 0;
        return true;
    }

    // ── 过渡到蓄力：灵光从共享数组移除 ──

    function checkTransitionToCharging() {
        if (state.phase !== 'monitoring') return false;
        // 蓄力锁状态：进入后不可取消，不再检测 moveDistance
        state.phase = 'charging';
        state.chargeStartTime = Date.now();
        if (state.monitoredStar) {
            state.chargeStar = state.monitoredStar;
            state.monitoredStar = null;
            var starsArr = getStars();
            if (starsArr && starsArr.length) {
                var newStars = [];
                for (var i = 0; i < starsArr.length; i++) {
                    if (starsArr[i] !== state.chargeStar) newStars.push(starsArr[i]);
                }
                if (newStars.length < starsArr.length) setStars(newStars);
            }
        }
        return true;
    }

    function getChargeElapsed() {
        if (state.phase !== 'charging' && state.phase !== 'autoCast') return 0;
        return Date.now() - state.chargeStartTime;
    }

    function getChargeLevel() {
        var elapsed = getChargeElapsed();
        if (elapsed < CHARGE_LIGHT_MIN) return null;
        if (elapsed < CHARGE_LIGHT_MAX) {
            return { stage: 'light', label: '轻蓄', damageMult: 1.3, aoeTargets: 1, breaksShield: false, progress: (elapsed - CHARGE_LIGHT_MIN) / (CHARGE_LIGHT_MAX - CHARGE_LIGHT_MIN) };
        }
        if (elapsed < CHARGE_MEDIUM_MAX) {
            return { stage: 'medium', label: '中蓄', damageMult: 2.5, aoeTargets: 3, breaksShield: false, progress: (elapsed - CHARGE_MEDIUM_MIN) / (CHARGE_MEDIUM_MAX - CHARGE_MEDIUM_MIN) };
        }
        return { stage: 'full', label: '满蓄', damageMult: 4.0, aoeTargets: 99, breaksShield: true, progress: 1 };
    }

    function getChargeProgress() {
        return Math.min(1, getChargeElapsed() / CHARGE_FULL_MIN);
    }

    function getStageColor() {
        var progress = getChargeProgress();
        if (progress < 0.33) {
            var t = progress / 0.33;
            return { r: Math.floor(100 * (1 - t)), g: Math.floor(150 + 105 * t), b: Math.floor(255 * (1 - t)) };
        } else if (progress < 0.66) {
            var t2 = (progress - 0.33) / 0.33;
            return { r: Math.floor(255 * t2), g: Math.floor(255 - 40 * t2), b: 0 };
        } else {
            var t3 = (progress - 0.66) / 0.34;
            return { r: 255, g: Math.floor(215 * (1 - t3)), b: 0 };
        }
    }

    // ── 施法效果生成 ──

    function fireSingleMeteor(cx, cy) {
        var monsters = getActiveMonsters ? getActiveMonsters() : [];
        var aliveMonsters = [];
        for (var i = 0; i < monsters.length; i++) {
            if (monsters[i].hp > 0 && monsters[i].active) aliveMonsters.push(monsters[i]);
        }
        if (aliveMonsters.length === 0) return;

        var pd = getSaveData();
        var baseAtk = pd.totalAttack || 50;
        var scale = getScreenScale ? getScreenScale() : 1;

        // 随机选一个怪物
        var target = aliveMonsters[Math.floor(Math.random() * aliveMonsters.length)];
        var dmg = Math.floor(baseAtk * 1.0); // 单颗流星基础伤害
        if (target.shield && target.shield > 0) {
            if (dmg <= target.shield) { target.shield -= dmg; dmg = 0; }
            else { dmg -= target.shield; target.shield = 0; }
        }
        target.hp = Math.max(0, target.hp - dmg);

        var endX = (target.x || cx) * scale;
        var endY = (target.y || cy - 80 * scale);
        state.castMeteors.push({
            startX: cx, startY: cy,
            endX: endX, endY: endY,
            startTime: Date.now(),
            duration: METEOR_DURATION,
            color: '#FFD700',
            size: 6 * scale
        });
        addMessage('流星 -' + dmg, '#FFD700');
    }

    function spawnCastBurst(cx, cy, level) {
        var count = level.stage === 'full' ? 20 : level.stage === 'medium' ? 12 : 8;
        var baseColor = level.stage === 'full' ? '#FF4400' : '#FFD700';
        for (var i = 0; i < count; i++) {
            var angle = Math.PI * 2 * i / count + (Math.random() - 0.5) * 0.3;
            var speed = 150 + Math.random() * 100;
            state.castParticles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                size: (4 + Math.random() * 4) * (getScreenScale ? getScreenScale() : 1),
                color: baseColor
            });
        }
        // 冲击波环
        state.castParticles.push({
            x: cx, y: cy, vx: 0, vy: 0,
            alpha: 1, size: 0,
            isRing: true,
            ringRadius: 0,
            ringMaxRadius: (level.stage === 'full' ? 120 : 80) * (getScreenScale ? getScreenScale() : 1),
            ringSpeed: (level.stage === 'full' ? 400 : 300) * (getScreenScale ? getScreenScale() : 1),
            color: baseColor
        });
    }

    function spawnCastMeteors(cx, cy, targets, level) {
        var meteorColor = level.stage === 'full' ? '#FF4400' : '#FFD700';
        var scale = getScreenScale ? getScreenScale() : 1;
        for (var i = 0; i < targets.length; i++) {
            var m = targets[i];
            // 怪物位置：用屏幕坐标（x是相对canvas的，y需要估算）
            var endX = (m.x || cx) * scale;
            var endY = (m.y || cy - 80 * scale);
            state.castMeteors.push({
                startX: cx, startY: cy,
                endX: endX, endY: endY,
                startTime: Date.now(),
                duration: METEOR_DURATION,
                color: meteorColor,
                size: (level.stage === 'full' ? 10 : 6) * scale
            });
        }
    }

    // ── 释放蓄力攻击 ──

    function releaseCharge() {
        if (state.phase !== 'charging' && state.phase !== 'autoCast') return null;

        var level = getChargeLevel();
        if (!level) {
            cancelCharge();
            return null;
        }

        if (saturationState) {
            var satCost = level.stage === 'full' ? SATURATION_COSTS.CHARGE_FULL
                : level.stage === 'medium' ? SATURATION_COSTS.CHARGE_MEDIUM
                : SATURATION_COSTS.CHARGE_LIGHT;
            saturationState.consume(satCost);
        }

        var monsters = getActiveMonsters ? getActiveMonsters() : [];
        var aliveMonsters = [];
        for (var i = 0; i < monsters.length; i++) {
            if (monsters[i].hp > 0 && monsters[i].active) aliveMonsters.push(monsters[i]);
        }

        if (aliveMonsters.length === 0) {
            cancelCharge();
            return null;
        }

        var pd = getSaveData();
        var baseAtk = pd.totalAttack || 50;

        var targets;
        if (level.aoeTargets >= 99) {
            targets = aliveMonsters;
        } else {
            targets = aliveMonsters.slice(0, level.aoeTargets);
        }

        var totalDamage = 0;
        for (var t = 0; t < targets.length; t++) {
            var m = targets[t];
            var dmg = Math.floor(baseAtk * level.damageMult);
            if (level.breaksShield && m.shield && m.shield > 0) m.shield = 0;
            if (m.shield && m.shield > 0) {
                if (dmg <= m.shield) { m.shield -= dmg; dmg = 0; }
                else { dmg -= m.shield; m.shield = 0; }
            }
            m.hp = Math.max(0, m.hp - dmg);
            totalDamage += dmg;
        }

        addMessage('重击! ' + level.label + ' -' + totalDamage, '#FF6600');
        createScreenShake(level.stage === 'full' ? 8 : 4);

        // 蓄力技得分
        if (level.stage === 'full') addScore(50);
        else if (level.stage === 'medium') addScore(30);
        else addScore(15);

        // 蓄力技增加联连进度
        if (level.stage === 'full') addLinkCharge(40);
        else if (level.stage === 'medium') addLinkCharge(25);
        else addLinkCharge(15);

        // 生成施法效果
        var cx = state.chargeCenterX;
        var cy = state.chargeCenterY;
        spawnCastBurst(cx, cy, level);
        spawnCastMeteors(cx, cy, targets, level);

        if (state.chargeStar) {
            addMessage('蓄力消耗 ' + (state.chargeStar.emoji || '灵光'), '#FFD700');
            state.chargeStar = null;
        }

        // 进入 castEffect 阶段（渲染爆裂+流星）
        state.phase = 'castEffect';

        return {
            stage: level.stage,
            label: level.label,
            damageMult: level.damageMult,
            targetCount: targets.length,
            totalDamage: totalDamage
        };
    }

    // ── 取消 ──

    function cancelCharge() {
        if (state.monitorTimerId) {
            clearTimeout(state.monitorTimerId);
            state.monitorTimerId = null;
        }
        if (state.monitoredStar) {
            state.monitoredStar._charging = false;
            state.monitoredStar.disappearTime = state.originalDisappearTime || Date.now() + 5000;
            state.monitoredStar = null;
            state.originalDisappearTime = 0;
        }
        state.chargeStar = null;
        state.phase = 'idle';
        state.touchId = null;
        state.startX = 0; state.startY = 0;
        state.chargeStartTime = 0;
        state.moveDistance = 0;
        state.chargeCenterX = 0; state.chargeCenterY = 0;
        state.dragBuff = 0;
        state.autoCastStartTime = 0;
        state.firedLightMeteor = false;
        state.firedMediumMeteor = false;
        state.absorbedMeteorCount = 0;
    }

    // ── 每帧更新 ──

    function update(dt) {
        // charging: 自动吸收 + 阶段流星 + 检测满蓄→autoCast
        if (state.phase === 'charging') {
            var stars = getStars();
            if (stars && stars.length) {
                var scale = getScreenScale ? getScreenScale() : 1;
                var absorbRadius = CHARGE_AUTO_ABSORB_RADIUS * scale;
                var cx = state.chargeCenterX;
                var cy = state.chargeCenterY;
                var removedIndices = [];
                var absorbedCount = 0;
                for (var i = stars.length - 1; i >= 0; i--) {
                    var s = stars[i];
                    if (s._charging) continue;
                    if (s._dragging) continue;
                    if (s._linking) continue;
                    var dx = s.x - cx;
                    var dy = s.y - cy;
                    if (Math.sqrt(dx * dx + dy * dy) < absorbRadius) {
                        removedIndices.push(i);
                        absorbedCount++;
                    }
                }
                if (absorbedCount > 0) {
                    var newStars = [];
                    for (var j = 0; j < stars.length; j++) {
                        if (removedIndices.indexOf(j) === -1) newStars.push(stars[j]);
                    }
                    setStars(newStars);
                    state.chargeStartTime -= absorbedCount * CHARGE_AUTO_ABSORB_PROGRESS * CHARGE_FULL_MIN;
                    // 每吸收1颗灵光 → 发射1颗流星
                    for (var am = 0; am < absorbedCount; am++) {
                        fireSingleMeteor(cx, cy);
                        state.absorbedMeteorCount++;
                        addScore(5);  // 每吸收+发射一颗灵光得5分
                        addLinkCharge(5);
                    }
                }
            }

            // 阶段流星：进入轻蓄/中蓄阶段时发射流星
            var currentLevel = getChargeLevel();
            if (currentLevel && currentLevel.stage === 'light' && !state.firedLightMeteor) {
                state.firedLightMeteor = true;
                fireSingleMeteor(state.chargeCenterX, state.chargeCenterY);
                addScore(10);  // 达到轻蓄阶段得10分
                addLinkCharge(8);
            }
            if (currentLevel && currentLevel.stage === 'medium' && !state.firedMediumMeteor) {
                state.firedMediumMeteor = true;
                fireSingleMeteor(state.chargeCenterX, state.chargeCenterY);
                addScore(20);  // 达到中蓄阶段得20分
                addLinkCharge(12);
            }

            // 满蓄检测 → 进入 autoCast
            if (getChargeProgress() >= 1) {
                state.phase = 'autoCast';
                state.autoCastStartTime = Date.now();
                addMessage('蓄力已满! 即刻释放!', '#FF4400');
            }
        }

        // autoCast: 500ms倒计时后自动施法
        if (state.phase === 'autoCast') {
            if (Date.now() - state.autoCastStartTime >= AUTO_CAST_DELAY) {
                releaseCharge();
            }
        }

        // castEffect: 粒子/流星衰减
        if (state.phase === 'castEffect') {
            for (var pi = state.castParticles.length - 1; pi >= 0; pi--) {
                var p = state.castParticles[pi];
                if (p.isRing) {
                    p.ringRadius += p.ringSpeed * dt;
                    p.alpha -= dt * 2.5;
                } else {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.alpha -= dt * 2.5;
                    p.vx *= 0.96;
                    p.vy *= 0.96;
                }
                if (p.alpha <= 0) state.castParticles.splice(pi, 1);
            }
            var now = Date.now();
            for (var mi = state.castMeteors.length - 1; mi >= 0; mi--) {
                if (now - state.castMeteors[mi].startTime > state.castMeteors[mi].duration) {
                    state.castMeteors.splice(mi, 1);
                }
            }
            if (state.castParticles.length === 0 && state.castMeteors.length === 0) {
                state.phase = 'idle';
            }
        }
    }

    // ── 渲染 ──

    function render(ctx, screenW, screenH, scale) {
        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(812 * scale), screenH);
        // 监控期脉动环
        if (state.phase === 'monitoring') {
            var elapsed = Date.now() - state.chargeStartTime;
            var radius = 28 * scale + Math.sin(elapsed / 80) * 6 * scale;
            var alpha = 0.4 + Math.sin(elapsed / 100) * 0.2;
            ctx.beginPath();
            ctx.arc(state.chargeCenterX, state.chargeCenterY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(100, 160, 255, ' + alpha.toFixed(2) + ')';
            ctx.lineWidth = 2 * scale;
            ctx.setLineDash([5 * scale, 3 * scale]);
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }

        // charging 或 autoCast: 灵光体 + 蓄力光环
        if (state.phase === 'charging' || state.phase === 'autoCast') {
            var cx = state.chargeCenterX;
            var cy = state.chargeCenterY;
            var progress = getChargeProgress();
            var level = getChargeLevel();
            var color = getStageColor();
            var inflateFactor = 1;

            // autoCast: 灵光膨胀 + 红闪烁
            if (state.phase === 'autoCast') {
                var castElapsed = Date.now() - state.autoCastStartTime;
                inflateFactor = 1 + castElapsed / AUTO_CAST_DELAY * 0.8;
                var flashAlpha = 0.5 + 0.5 * Math.sin(castElapsed / 50);
                // 红闪烁覆盖
                ctx.beginPath();
                ctx.arc(cx, cy, 40 * scale * inflateFactor, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 68, 0, ' + flashAlpha.toFixed(2) + ')';
                ctx.fill();
                progress = 1;  // 进度条锁定满格
                color = { r: 255, g: Math.floor(40 * (1 - flashAlpha)), b: 0 };
            }

            // 灵光体绘制
            if (state.chargeStar) {
                var starObj = state.chargeStar;
                if (drawStar) {
                    drawStar(starObj, cx, cy, starObj.size * inflateFactor, (starObj.scale || 1) * scale);
                } else {
                    var emoji = starObj.emoji || '⭐';
                    var sz = (starObj.size || 28) * inflateFactor * (starObj.scale || 1) * scale;
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = '#FFD700';
                    ctx.font = sz + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText(emoji, cx, cy);
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';
                }
            } else {
                // 拖拽→蓄力：无 chargeStar，画发光能量球
                var orbSize = (20 + progress * 18) * scale * inflateFactor;
                ctx.shadowBlur = 15 * scale;
                ctx.shadowColor = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
                ctx.beginPath();
                ctx.arc(cx, cy, orbSize, 0, Math.PI * 2);
                ctx.fillStyle = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
                // buff标签
                if (state.dragBuff > 0) {
                    ctx.font = 'bold ' + (11 * scale) + 'px sans-serif';
                    ctx.fillStyle = '#FFD700';
                    ctx.textAlign = 'center';
                    ctx.fillText('聚合×' + state.dragBuff + ' 加速', cx, cy - orbSize - 8 * scale);
                }
            }

            // 蓄力光环
            var time = Date.now() / 1000;
            var ringRadius = 45 * scale * inflateFactor;
            var ringCount = state.phase === 'autoCast' ? 5 : 3;

            for (var ri = 0; ri < ringCount; ri++) {
                var angle = time * (state.phase === 'autoCast' ? 6 : 3) + ri * Math.PI * 2 / ringCount;
                var rx = cx + Math.cos(angle) * ringRadius;
                var ry = cy + Math.sin(angle) * ringRadius * 0.4;
                ctx.beginPath();
                ctx.arc(rx, ry, (state.phase === 'autoCast' ? 6 : 4) * scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.9)';
                ctx.fill();
            }

            // 进度环
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius + 8 * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.7)';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();

            // 阶段标签
            if (level) {
                ctx.font = 'bold ' + (13 * scale) + 'px sans-serif';
                ctx.fillStyle = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
                ctx.textAlign = 'center';
                ctx.fillText(state.phase === 'autoCast' ? '即刻释放!' : level.label, cx, cy - ringRadius - 15 * scale);
            }

            // 进度条
            var barW = 180 * scale;
            var barH = 4 * scale;
            var barX = screenW / 2 - barW / 2;
            var barY = designBottom - Math.floor(35 * scale);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
            ctx.fillRect(barX, barY, barW * progress, barH);
        }

        // charging/autoCast/castEffect 共享：渲染飞行中的流星
        if (state.phase === 'charging' || state.phase === 'autoCast' || state.phase === 'castEffect') {
            var nowM = Date.now();
            for (var mi3 = 0; mi3 < state.castMeteors.length; mi3++) {
                var m3 = state.castMeteors[mi3];
                var mt = Math.min(1, (nowM - m3.startTime) / m3.duration);
                var mx3 = m3.startX + (m3.endX - m3.startX) * mt;
                var my3 = m3.startY + (m3.endY - m3.startY) * mt;

                var tailLen3 = 30 * scale * (1 - mt * 0.5);
                var angle3 = Math.atan2(m3.endY - m3.startY, m3.endX - m3.startX);
                var tailX3 = mx3 - Math.cos(angle3) * tailLen3;
                var tailY3 = my3 - Math.sin(angle3) * tailLen3;

                ctx.beginPath();
                ctx.moveTo(tailX3, tailY3);
                ctx.lineTo(mx3, my3);
                ctx.strokeStyle = m3.color === '#FF4400' ? 'rgba(255,68,0,0.6)' : 'rgba(255,215,0,0.6)';
                ctx.lineWidth = m3.size * 0.6;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(mx3, my3, m3.size, 0, Math.PI * 2);
                ctx.fillStyle = m3.color === '#FF4400' ? 'rgba(255,68,0,0.9)' : 'rgba(255,215,0,0.9)';
                ctx.shadowBlur = 15;
                ctx.shadowColor = m3.color;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
            }
        }
        if (state.phase === 'castEffect') {
            // 粒子（流星已在共享渲染块中处理）
            for (var pi2 = 0; pi2 < state.castParticles.length; pi2++) {
                var p2 = state.castParticles[pi2];
                if (p2.isRing) {
                    ctx.beginPath();
                    ctx.arc(p2.x, p2.y, p2.ringRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255,' + (p2.color === '#FFD700' ? '215' : '68') + ',0,' + Math.max(0, p2.alpha).toFixed(2) + ')';
                    ctx.lineWidth = 3 * scale;
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(p2.x, p2.y, p2.size, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,' + (p2.color === '#FFD700' ? '215' : '68') + ',0,' + Math.max(0, p2.alpha).toFixed(2) + ')';
                    ctx.fill();
                }
            }
            return;
        }
    }

    function reset() { cancelCharge(); state.castParticles = []; state.castMeteors = []; }

    return {
        isUnlocked: isUnlocked,
        beginMonitoring: beginMonitoring,
        updateMonitoring: updateMonitoring,
        checkTransitionToCharging: checkTransitionToCharging,
        beginDragCharge: beginDragCharge,
        getChargeElapsed: getChargeElapsed,
        getChargeLevel: getChargeLevel,
        getChargeProgress: getChargeProgress,
        getStageColor: getStageColor,
        releaseCharge: releaseCharge,
        cancelCharge: cancelCharge,
        isCharging: isCharging,
        isMonitoring: isMonitoring,
        isAutoCast: isAutoCast,
        update: update,
        render: render,
        reset: reset
    };
}

export { createChargeSystem };