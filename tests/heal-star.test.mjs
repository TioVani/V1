import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const GM = require('../dist/game-modules.js');

// 通用 mock context（避免实际 Canvas 调用）
var mockCtx = {
    save: () => {}, restore: () => {},
    fillRect: () => {}, strokeRect: () => {},
    fillText: () => {}, strokeText: () => {},
    beginPath: () => {}, arc: () => {}, fill: () => {},
    clip: () => {}, rect: () => {},
    moveTo: () => {}, lineTo: () => {}, quadraticCurveTo: () => {},
    closePath: () => {},
    set globalAlpha(v) {},
    get globalAlpha() { return 1; },
    set font(v) {},
    set textAlign(v) {},
    set textBaseline(v) {},
    set fillStyle(v) {},
    set strokeStyle(v) {},
    set lineWidth(v) {},
    set shadowColor(v) {},
    set shadowBlur(v) {},
    translate: () => {}, scale: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    measureText: () => ({ width: 10 })
};

function createAnim() {
    return GM.createAnimationSystem({
        getCtx: () => mockCtx,
        getScreenWidth: () => 375,
        getScreenHeight: () => 667,
        getScreenScale: () => 1,
        getPlayerData: () => ({ playerHp: 100 }),
        getMonster: () => ({ x: 187, y: 222, active: true }),
        getComboCount: () => 0,
        getAssets: () => ({}),
        getFillRoundRect: () => function() {},
        playSound: () => {},
        getGameConst: () => ({})
    });
}

// ═══════════════════════════════════════════════════════════
// 治疗星星颜色
// ═══════════════════════════════════════════════════════════

describe('AnimationSystem: 治疗星星颜色', () => {
    it('getStarColor(heal) 返回嫩绿色', () => {
        const sys = createAnim();
        assert.equal(sys.getStarColor('heal'), '#90EE90');
    });

    it('getStarGlowColor(heal) 包含正确 RGB', () => {
        const sys = createAnim();
        const glow = sys.getStarGlowColor('heal');
        assert.ok(glow.includes('144, 238, 144'), '发光色 rgba 应含 144,238,144');
    });
});

// ═══════════════════════════════════════════════════════════
// 治疗流星动画
// ═══════════════════════════════════════════════════════════

describe('AnimationSystem: 治疗流星飞向血条', () => {
    it('创建 heal 类型流星 → 嫩绿色、飞向血条', () => {
        const sys = createAnim();
        const meteor = sys.createMeteorAnimation(
            100, 300,   // 星星位置
            5, false, 'heal',
            0, 1, null,
            { x: 187, y: 617 }  // 血条位置
        );

        assert.ok(meteor);
        assert.equal(meteor.color, '#90EE90');
        assert.equal(meteor.endX, 187);
        assert.equal(meteor.endY, 617);
    });

    it('流星动画正常完成', () => {
        const sys = createAnim();
        const meteor = sys.createMeteorAnimation(
            100, 300, 5, false, 'heal', 0, 1, null,
            { x: 187, y: 617 }
        );

        const start = Date.now();
        while (Date.now() - start < 200) {}
        sys.updateMeteorAnimations();

        assert.ok(meteor.completed);
    });

    it('流星绘制不崩溃', () => {
        const sys = createAnim();
        sys.createMeteorAnimation(
            100, 300, 5, false, 'heal', 0, 1, null,
            { x: 187, y: 617 }
        );

        sys.updateMeteorAnimations();
        sys.drawMeteorAnimations(1);
    });
});

// ═══════════════════════════════════════════════════════════
// 飘字动画（自定义颜色）
// ═══════════════════════════════════════════════════════════

describe('AnimationSystem: 飘字支持自定义颜色', () => {
    it('默认颜色绘制不崩溃', () => {
        const sys = createAnim();
        sys.createScorePopupAnimation(187, 580, 5);
        sys.updateScorePopupAnimations();
        sys.drawScorePopupAnimations(1);
    });

    it('嫩绿色飘字绘制不崩溃', () => {
        const sys = createAnim();
        sys.createScorePopupAnimation(187, 580, 5, '#90EE90');
        sys.updateScorePopupAnimations();
        sys.drawScorePopupAnimations(1);
    });

    it('飘字随时间消失', () => {
        const sys = createAnim();
        sys.createScorePopupAnimation(187, 580, 5, '#90EE90');

        sys.updateScorePopupAnimations();
        sys.drawScorePopupAnimations(1);

        const start = Date.now();
        while (Date.now() - start < 600) {}
        sys.updateScorePopupAnimations();
        sys.drawScorePopupAnimations(1);
    });
});

// ═══════════════════════════════════════════════════════════
// BattleEngine: 治疗星星完整流程
// ═══════════════════════════════════════════════════════════

describe('BattleEngine: 治疗星星回血', () => {
    function createEngine(playerHp) {
        return GM.createBattleEngine({
            screen: {
                getWidth: () => 375,
                getHeight: () => 667,
                getScale: () => 1
            },
            getScreenWidth: () => 375,
            getScreenHeight: () => 667,
            getScreenScale: () => 1,
            getGameConst: () => ({}),
            getFillRoundRect: () => function() {},
            Logger: { info: () => {}, error: () => {}, warn: () => {} },
            player: {
                getData: () => ({ playerHp: playerHp }),
                getCharFullStats: () => ({ attack: 10, critRate: 0, critDamage: 2 })
            },
            animation: {
                createStarBurst: () => {},
                createScreenShake: () => {},
                createMonsterDamage: () => {},
                createPlayerDamage: () => {},
                createMeteor: () => {},
                createCrit: () => {},
                createQuickTap: () => {},
                createScorePopup: () => {},
                createMonsterProjectile: () => {},
                createHpBarCounter: () => {},
                createTimeDamage: () => {},
                createPetDamage: () => {},
                addMessage: () => {},
                vibrateShort: () => {}
            },
            combat: {
                getSeasonStarTypes: () => [],
                updateCombo: () => {},
                resetCombo: () => {},
                getComboCount: () => 0,
                calculateStarScore: () => 1,
                getMonsterSkillType: () => ({})
            },
            skills: {
                getConfig: () => ({}),
                getTypes: () => ({})
            }
        });
    }

    it('点击治疗星 → HP 增加', () => {
        const engine = createEngine(80);
        engine.init({
            mode: 'normal',
            monster: {
                id: 1, name: 'slime', hp: 100, maxHp: 100,
                attack: 10, attackInterval: 2000, active: true, x: 187, y: 222
            },
            playerHp: 80,
            playerMaxHp: 100,
            playerShield: 0,
            timeLimit: 60,
            skipAutoTimers: false,
            deathDelayMs: 0,
            onMonsterDeath: () => {},
            onPlayerDeath: () => {}
        });

        const s = engine.getState();
        assert.equal(s.playerHp, 80);

        var healStar = { x: 100, y: 300, size: 40, type: 'heal' };
        var result = engine.handleStarClick(100, 300, [healStar]);

        assert.ok(result, 'handleStarClick 应返回 true');
        assert.ok(s.playerHp > 80, 'HP 应增加，实际: ' + s.playerHp);
    });

    it('治疗量不超过 maxHp', () => {
        const engine = createEngine(99);
        engine.init({
            mode: 'normal',
            monster: {
                id: 1, name: 'slime', hp: 100, maxHp: 100,
                attack: 10, attackInterval: 2000, active: true, x: 187, y: 222
            },
            playerHp: 99,
            playerMaxHp: 100,
            playerShield: 0,
            timeLimit: 60,
            skipAutoTimers: false,
            deathDelayMs: 0,
            onMonsterDeath: () => {},
            onPlayerDeath: () => {}
        });

        const s = engine.getState();
        var healStar = { x: 100, y: 300, size: 40, type: 'heal' };
        engine.handleStarClick(100, 300, [healStar]);

        assert.equal(s.playerHp, 100, 'HP 不应超过 maxHp');
    });

    it('满血时治疗星仍消耗（返回 true）', () => {
        const engine = createEngine(100);
        engine.init({
            mode: 'normal',
            monster: {
                id: 1, name: 'slime', hp: 100, maxHp: 100,
                attack: 10, attackInterval: 2000, active: true, x: 187, y: 222
            },
            playerHp: 100,
            playerMaxHp: 100,
            playerShield: 0,
            timeLimit: 60,
            skipAutoTimers: false,
            deathDelayMs: 0,
            onMonsterDeath: () => {},
            onPlayerDeath: () => {}
        });

        const s = engine.getState();
        var healStar = { x: 100, y: 300, size: 40, type: 'heal' };
        var result = engine.handleStarClick(100, 300, [healStar]);

        assert.ok(result, '满血也应消耗治疗星');
        assert.equal(s.playerHp, 100, '满血 HP 不变');
    });
});
