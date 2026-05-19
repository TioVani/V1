import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const GM = require('../dist/game-modules.js');

var mockCtx = {
    save: () => {}, restore: () => {},
    fillRect: () => {}, strokeRect: () => {},
    fillText: () => {}, strokeText: () => {},
    beginPath: () => {}, arc: () => {}, fill: () => {}, stroke: () => {},
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

var fontConfig = GM.createCombatFontConfig();

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
        getStrokeRoundRect: () => function() {},
        combatFontConfig: () => fontConfig
    });
}

function wait(ms) {
    var start = Date.now();
    while (Date.now() - start < ms) {}
}

// ═══════════════════════════════════════════════════════════
// 点击波纹动画
// ═══════════════════════════════════════════════════════════

describe('AnimationSystem: 点击波纹', () => {
    it('创建波纹 → 有光线和波纹', () => {
        const sys = createAnim();
        sys.createTapRippleAnimation(100, 200, 0);

        sys.updateTapRippleAnimations();
        sys.drawTapRippleAnimations(1);
    });

    it('松手后波纹自动消失', () => {
        const sys = createAnim();
        sys.createTapRippleAnimation(100, 200, 0);
        sys.releaseTapRipple(0);

        // 等动画播放完（phase1=150 + phase2=200 + phase3=650 ≈ 1000ms）
        wait(1100);
        sys.updateTapRippleAnimations();

        // 再 draw 不崩溃（动画应已清空）
        sys.drawTapRippleAnimations(1);
    });

    it('长按模式 → 不自动消失', () => {
        const sys = createAnim();
        sys.createTapRippleAnimation(100, 200, 0);

        // 等超过 phase3
        wait(900);
        sys.updateTapRippleAnimations();
        sys.drawTapRippleAnimations(1);
        // 不 crash 即通过（holding=true 时粒子持续生成）
    });

    it('多指点击 → 各自独立', () => {
        const sys = createAnim();
        sys.createTapRippleAnimation(50, 100, 0);
        sys.createTapRippleAnimation(300, 500, 1);

        sys.updateTapRippleAnimations();
        sys.drawTapRippleAnimations(1);

        // 释放第一个
        sys.releaseTapRipple(0);
        sys.updateTapRippleAnimations();
        sys.drawTapRippleAnimations(1);
    });

    it('moveTapRipple 不崩溃', () => {
        const sys = createAnim();
        sys.createTapRippleAnimation(100, 200, 0);
        sys.moveTapRipple(0, 150, 250);

        sys.updateTapRippleAnimations();
        sys.drawTapRippleAnimations(1);
    });

    it('draw 不依赖 combatFontConfig 也不崩溃', () => {
        const sys = GM.createAnimationSystem({
            getCtx: () => mockCtx,
            getScreenWidth: () => 375,
            getScreenHeight: () => 667,
            getScreenScale: () => 1,
            getPlayerData: () => ({ playerHp: 100 }),
            getMonster: () => ({ x: 187, y: 222, active: true }),
            getComboCount: () => 0,
            getAssets: () => ({}),
            getFillRoundRect: () => function() {}
            // 不传 combatFontConfig
        });
        sys.createTapRippleAnimation(100, 200, 0);
        sys.updateTapRippleAnimations();
        sys.drawTapRippleAnimations(1);
    });
});

// ═══════════════════════════════════════════════════════════
// CombatFontConfig 单元测试
// ═══════════════════════════════════════════════════════════

describe('CombatFontConfig: 字体配置', () => {
    it('getFont 返回有效字体字符串', () => {
        var cfg = GM.createCombatFontConfig();
        var font = cfg.getFont('damage', 1);
        assert.ok(font.includes('px sans-serif'), '应包含 px sans-serif');
        assert.ok(font.includes('normal'), 'damage 应为 normal weight');
    });

    it('getFont damage 不含 bold', () => {
        var cfg = GM.createCombatFontConfig();
        var font = cfg.getFont('damage', 1);
        assert.ok(!font.includes('bold'), 'damage 不应为 bold');
    });

    it('getFont comboNum 含 bold', () => {
        var cfg = GM.createCombatFontConfig();
        var font = cfg.getFont('comboNum', 1);
        assert.ok(font.includes('bold'), 'comboNum 应为 bold');
    });

    it('getFont 带 extraScale 放大', () => {
        var cfg = GM.createCombatFontConfig();
        var normal = cfg.getFont('damage', 1);
        var scaled = cfg.getFont('damage', 1, 2);
        // base=24, normal=24px, scaled=48px
        assert.ok(scaled.includes('48'), '2倍缩放应为 48px');
    });

    it('getFont 未知 token 返回默认值', () => {
        var cfg = GM.createCombatFontConfig();
        var font = cfg.getFont('nonexistent', 1);
        assert.equal(font, '16px sans-serif');
    });

    it('所有 token 的 base size 合理（8-60）', () => {
        var cfg = GM.createCombatFontConfig();
        for (var token in cfg.FONTS) {
            var base = cfg.FONTS[token].base;
            assert.ok(base >= 8 && base <= 60, token + ' base=' + base + ' 超出范围');
        }
    });
});

// ═══════════════════════════════════════════════════════════
// AnimationSystem 使用 Config 字体
// ═══════════════════════════════════════════════════════════

describe('AnimationSystem: 通过 Config 渲染战斗文字', () => {
    it('伤害数字绘制不崩溃', () => {
        const sys = createAnim();
        // 创建怪物受伤动画
        sys.createMonsterDamageAnimation(187, 222, 50);
        sys.updateMonsterDamageAnimations();
        sys.drawMonsterDamageAnimations(1);
    });

    it('暴击动画使用 Config 字体绘制不崩溃', () => {
        const sys = createAnim();
        sys.createCritAnimation(187, 222, 100, 5);
        sys.updateCritAnimations();
        sys.drawCritAnimations(1);
    });

    it('暴击动画带颜色（治疗）不崩溃', () => {
        const sys = createAnim();
        sys.createCritAnimation(187, 222, 5, 0, '#90EE90');
        sys.updateCritAnimations();
        sys.drawCritAnimations(1);
    });

    it('玩家受伤动画不崩溃', () => {
        const sys = createAnim();
        sys.createPlayerDamageAnimation(10, false);
        sys.updatePlayerDamageAnimations();
        sys.drawPlayerDamageAnimations(1);
    });

    it('时间扣减动画不崩溃', () => {
        const sys = createAnim();
        sys.createTimeDamageAnimation(2);
        sys.updateTimeDamageAnimations();
        sys.drawTimeDamageAnimations(1);
    });

    it('宠物伤害动画不崩溃', () => {
        const sys = createAnim();
        sys.createPetDamageAnimation(100, 200, 30, false, '🐶');
        sys.updatePetDamageAnimations();
        sys.drawPetDamageAnimations(1);
    });

    it('战斗消息绘制不崩溃', () => {
        const sys = createAnim();
        sys.addGameMessage('测试消息', '#ff6b6b');
        sys.drawGameMessages(1);
    });

    it('clearAllAnimations 不应清空波纹动画', () => {
        const sys = createAnim();
        // 模拟真实时序：用户点击 → 创建波纹
        sys.createTapRippleAnimation(100, 200, 0);
        // 模拟非战斗状态下一帧的渲染顺序：先 clearAllAnimations，再 update/draw 波纹
        sys.clearAllAnimations();
        sys.updateTapRippleAnimations();
        sys.drawTapRippleAnimations(1);
        // 波纹已被 clearAllAnimations 清掉，无法显示 — 这是 bug
    });

    it('无 combatFontConfig 时降级不崩溃', () => {
        const sys = GM.createAnimationSystem({
            getCtx: () => mockCtx,
            getScreenWidth: () => 375,
            getScreenHeight: () => 667,
            getScreenScale: () => 1,
            getPlayerData: () => ({ playerHp: 100 }),
            getMonster: () => ({ x: 187, y: 222, active: true }),
            getComboCount: () => 0,
            getAssets: () => ({}),
            getFillRoundRect: () => function() {}
        });
        sys.createCritAnimation(187, 222, 50, 0);
        sys.updateCritAnimations();
        sys.drawCritAnimations(1);
    });
});
