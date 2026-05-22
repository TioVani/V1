/**
 * MonsterDrawRenderer — 怪物绘制
 *
 * drawSingleMonster, drawMonster, drawPoisonPuddles
 */
import { RARITY_COLORS } from '../config/GameConfig.js';
import { createDelayedHpTracker } from '../utils/DelayedHpTracker.js';
var _monsterHpTracker = createDelayedHpTracker();
function createMonsterDrawRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale || function() { return 1; };
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };
    var DESIGN_HEIGHT = 812;
    var uiCore = deps.uiCore;
    var getFillRoundRect = deps.getFillRoundRect;
    var getMonsterTypes = deps.getMonsterTypes;
    var getActiveMonsters = deps.getActiveMonsters;
    var getStarThief = deps.getStarThief;
    var getPoisonPuddleSystem = deps.getPoisonPuddleSystem;
    var getAssets = deps.getAssets;
    var drawMonsterSkillAnimations = deps.drawMonsterSkillAnimations;
    var updateMonsterSkillAnimations = deps.updateMonsterSkillAnimations;

    var BIRTH_DURATION = 250;
    var BIRTH_OVERSHOOT = 1.15;
    var BOUNCE_DURATION = 350;
    var BOUNCE_HEIGHT = 80;
    var DODGE_ANIM_DURATION = 500;
    var DODGE_ANIM_MAX_SCALE = 1.5;

    function easeOutBack(t) {
        var c1 = 1.70158;
        var c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function easeOutBounce(t) {
        var n1 = 7.5625;
        var d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            t -= 1.5 / d1;
            return n1 * t * t + 0.75;
        } else if (t < 2.5 / d1) {
            t -= 2.25 / d1;
            return n1 * t * t + 0.9375;
        } else {
            t -= 2.625 / d1;
            return n1 * t * t + 0.984375;
        }
    }

    function getBirthScale(monster) {
        if (!monster.birthTime) return 1;
        var elapsed = Date.now() - monster.birthTime;
        if (elapsed >= BIRTH_DURATION) return 1;
        var t = elapsed / BIRTH_DURATION;
        return BIRTH_OVERSHOOT * easeOutBack(t);
    }

    function getBirthYOffset(monster) {
        if (!monster.birthTime) return 0;
        var elapsed = Date.now() - monster.birthTime;
        if (elapsed >= BOUNCE_DURATION) return 0;
        var t = elapsed / BOUNCE_DURATION;
        return -BOUNCE_HEIGHT * (1 - easeOutBounce(t));
    }

    function drawSingleMonster(m, index, totalCount) {
        var ctx = getCtx();
        var MonsterTypes = getMonsterTypes();
        var screenHeight = getScreenHeight();
        var fillRoundRect = getFillRoundRect();
        var scale = uiCore.getScreenScale();
        var starThief = getStarThief();

        var monsterType = MonsterTypes[m.type];
        if (!monsterType) return;

        var drawY = m.y + getBirthYOffset(m);
        var scaledSize = m.size * m.scale * getBirthScale(m);

        if (m.absorbType) {
            ctx.beginPath();
            ctx.arc(m.x, drawY, scaledSize * 0.7, 0, Math.PI * 2);
            if (m.absorbType === 'ice') {
                ctx.fillStyle = 'rgba(68, 136, 255, 0.2)';
            } else if (m.absorbType === 'fire') {
                ctx.fillStyle = 'rgba(255, 68, 0, 0.2)';
            } else if (m.absorbType === 'normal') {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
            }
            ctx.fill();
        }

        if (m.empowered) {
            ctx.beginPath();
            ctx.arc(m.x, drawY, scaledSize * 0.8, 0, Math.PI * 2);
            if (m.empowerType === 'ice') {
                ctx.fillStyle = 'rgba(68, 136, 255, 0.3)';
            } else if (m.empowerType === 'fire') {
                ctx.fillStyle = 'rgba(255, 68, 0, 0.3)';
            } else if (m.empowerType === 'normal') {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            }
            ctx.fill();
        }

        ctx.font = scaledSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(monsterType.emoji, m.x, drawY);

        var isStarThief = m.type === 'star_thief';
        var designOffsetY = getDesignOffsetY();
        var scale = getScreenScale();
        var starThiefHpBarY = isStarThief ? designOffsetY + Math.floor(DESIGN_HEIGHT / 3 * scale) - scaledSize / 2 - Math.floor(15 * scale) : drawY - scaledSize / 2 - Math.floor(15 * scale);
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        var nameX = m.x;
        var nameY = isStarThief ? starThiefHpBarY + 8 + 2 : drawY + scaledSize / 2 + 5;
        ctx.fillText(monsterType.name || m.name || '邪灵', nameX, nameY);

        if (m.absorbType) {
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            var label, color;
            if (m.absorbType === 'ice') {
                label = '💧吸水';
                color = '#4488FF';
            } else if (m.absorbType === 'fire') {
                label = '🔥吸火';
                color = '#FF4400';
            } else {
                label = '⭐吸灵';
                color = '#FFD700';
            }
            ctx.fillStyle = color;
            ctx.fillText(label, m.x, drawY - scaledSize / 2 - Math.floor(25 * scale));
        }

        var hpBarWidth = isStarThief ? 150 : (totalCount > 1 ? 80 : 120);
        var hpBarHeight = 8;
        var hpBarCenterX = m.x;
        var hpBarX = hpBarCenterX - hpBarWidth / 2;
        var hpBarY = isStarThief
            ? designOffsetY + Math.floor(DESIGN_HEIGHT / 3 * scale) - scaledSize / 2 - Math.floor(15 * scale)
            : drawY - scaledSize / 2 - Math.floor(15 * scale);

        ctx.fillStyle = '#333333';
        fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth, hpBarHeight, 3);

        var hpPercent = m.hp / m.maxHp;
        if (isNaN(hpPercent) || hpPercent < 0) hpPercent = 0;
        else if (hpPercent > 1) hpPercent = 1;

        // 白色残影血条（统一 DelayedHpTracker）
        var _mDelay = _monsterHpTracker.get(m, m.hp, m.maxHp);
        if (_mDelay.delayedHp > m.hp) {
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = '#ffffff';
            fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth * _mDelay.ratio, hpBarHeight, 3);
            ctx.restore();
        }

        var hpColor = hpPercent > 0.5 ? '#4CAF50' : (hpPercent > 0.25 ? '#FF9800' : '#ff6b6b');
        ctx.fillStyle = hpColor;
        fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight, 3);

        // 怪物闪避血条动画（放大 + 淡出）
        if (m._dodgeAnimTime) {
            var dodgeElapsed = Date.now() - m._dodgeAnimTime;
            if (dodgeElapsed < DODGE_ANIM_DURATION) {
                var dp = dodgeElapsed / DODGE_ANIM_DURATION;
                var dodgeScale = dp < 0.5 ? 1 + (DODGE_ANIM_MAX_SCALE - 1) * (dp / 0.5) : DODGE_ANIM_MAX_SCALE;
                var dodgeAlpha = dp < 0.25 ? 1.0 : 1.0 - ((dp - 0.25) / 0.75);
                var dCx = hpBarX + hpBarWidth / 2;
                var dCy = hpBarY + hpBarHeight / 2;
                var dW = hpBarWidth * dodgeScale;
                var dH = hpBarHeight * dodgeScale;
                ctx.save();
                ctx.globalAlpha = dodgeAlpha;
                ctx.fillStyle = '#333333';
                fillRoundRect(ctx, dCx - dW / 2, dCy - dH / 2, dW, dH, 3);
                ctx.fillStyle = hpColor;
                fillRoundRect(ctx, dCx - dW / 2, dCy - dH / 2, dW * hpPercent, dH, 3);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.globalAlpha = dodgeAlpha * 0.8;
                ctx.strokeRect(dCx - dW / 2, dCy - dH / 2, dW, dH);
                ctx.restore();
            } else {
                m._dodgeAnimTime = 0;
            }
        }

        if (m.armor > 0) {
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('🛡️' + m.armor, hpBarX + hpBarWidth + 3, hpBarY + hpBarHeight / 2);
        }

        if (m.shield > 0) {
            var shieldBarY = hpBarY + hpBarHeight + 2;
            ctx.fillStyle = 'rgba(0, 191, 255, 0.3)';
            fillRoundRect(ctx, hpBarX, shieldBarY, hpBarWidth, 4, 2);
            ctx.fillStyle = '#00BFFF';
            var shieldPercent = Math.min(1, m.shield / 100);
            fillRoundRect(ctx, hpBarX, shieldBarY, hpBarWidth * shieldPercent, 4, 2);
        }

        if (m.hasRaged) {
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#FF0000';
            ctx.textAlign = 'center';
            ctx.fillText('🔥', hpBarCenterX, hpBarY - 18);
        }

        // 觉醒标记（水平排列在血条上方）
        if (m.awakeAbilities && m.awakeAbilities.length > 0) {
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            var awakeMarkX = hpBarX;
            var awakeMarkY = hpBarY - 8;
            for (var awi = 0; awi < m.awakeAbilities.length; awi++) {
                ctx.fillText(m.awakeAbilities[awi].mark, awakeMarkX + awi * 14, awakeMarkY);
            }
        }

        var rarity = monsterType.rarity;
        if (rarity && rarity !== 'N') {
            var rarityColors = RARITY_COLORS;
            ctx.font = 'bold 9px sans-serif';
            ctx.fillStyle = rarityColors[rarity] || '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('[' + rarity + ']', hpBarCenterX - hpBarWidth / 2 - 12, hpBarY + hpBarHeight / 2);
        }

        if (drawMonsterSkillAnimations) drawMonsterSkillAnimations(scale, m.x, drawY, m);

        if (starThief) starThief.drawBreakBar(ctx, m);
    }

    function drawMonster() {
        var activeMonsters = getActiveMonsters();
        if (activeMonsters.length === 0) return;

        if (updateMonsterSkillAnimations) updateMonsterSkillAnimations();

        for (var i = 0; i < activeMonsters.length; i++) {
            drawSingleMonster(activeMonsters[i], i, activeMonsters.length);
        }
    }

    function drawPoisonPuddles(scale) {
        var pps = getPoisonPuddleSystem();
        var Assets = getAssets();
        if (pps) pps.drawPoisonPuddles(scale, Assets);
    }

    return {
        drawSingleMonster: drawSingleMonster,
        drawMonster: drawMonster,
        drawPoisonPuddles: drawPoisonPuddles
    };
}

export { createMonsterDrawRenderer };
