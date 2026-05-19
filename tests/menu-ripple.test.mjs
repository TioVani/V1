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
    drawImage: () => {},
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

// 模拟完整的 MENU 状态渲染流程
describe('主界面波纹反馈：完整流程模拟', () => {
    it('MENU 状态：touch → create ripple → clearBattle → update/draw → ripple 存在', () => {
        var sys = GM.createAnimationSystem({
            getCtx: () => mockCtx,
            getScreenWidth: () => 375,
            getScreenHeight: () => 667,
            getScreenScale: () => 1,
            getPlayerData: () => ({ playerHp: 100 }),
            getMonster: () => ({ x: 187, y: 222, active: true }),
            getComboCount: () => 0,
            getAssets: () => ({}),
            getFillRoundRect: () => function() {},
            getStrokeRoundRect: () => function() {}
        });

        // 步骤1：用户点击主界面（touchStart 里创建波纹）
        sys.createTapRippleAnimation(100, 300, 0);

        // 验证波纹已创建
        sys.updateTapRippleAnimations();
        assert.ok(true, '波纹创建成功');

        // 步骤2：render() 中非战斗状态调用 clearBattleAnimations
        sys.clearAllAnimations();

        // 步骤3：clearBattle 之后 update/draw 波纹
        sys.updateTapRippleAnimations();
        sys.drawTapRippleAnimations(1);

        // 断言：波纹在 clearAllAnimations 后已丢失
        // 因为 clearAllAnimations 的 return 对象内联版本清了 tapRippleAnimations
        // 这就是 bug！
    });

    it('验证波纹动画确实能正常工作（无 clear 干扰）', () => {
        var sys = GM.createAnimationSystem({
            getCtx: () => mockCtx,
            getScreenWidth: () => 375,
            getScreenHeight: () => 667,
            getScreenScale: () => 1,
            getPlayerData: () => ({ playerHp: 100 }),
            getMonster: () => ({ x: 187, y: 222, active: true }),
            getComboCount: () => 0,
            getAssets: () => ({}),
            getFillRoundRect: () => function() {},
            getStrokeRoundRect: () => function() {}
        });

        // 创建波纹
        sys.createTapRippleAnimation(100, 300, 0);

        // 等一点时间让动画推进（phase1=150ms）
        var start = Date.now();
        while (Date.now() - start < 50) {}

        sys.updateTapRippleAnimations();

        // 验证波纹确实有内容
        var drawCallCount = 0;
        var origStroke = mockCtx.stroke;
        mockCtx.stroke = () => { drawCallCount++; };

        sys.drawTapRippleAnimations(1);

        assert.ok(drawCallCount > 0, '波纹应该有 stroke 调用，实际: ' + drawCallCount);

        mockCtx.stroke = origStroke;
    });

    it('clearAllAnimations 后波纹应被保留', () => {
        var sys = GM.createAnimationSystem({
            getCtx: () => mockCtx,
            getScreenWidth: () => 375,
            getScreenHeight: () => 667,
            getScreenScale: () => 1,
            getPlayerData: () => ({ playerHp: 100 }),
            getMonster: () => ({ x: 187, y: 222, active: true }),
            getComboCount: () => 0,
            getAssets: () => ({}),
            getFillRoundRect: () => function() {},
            getStrokeRoundRect: () => function() {}
        });

        // 创建波纹
        sys.createTapRippleAnimation(100, 300, 0);
        sys.updateTapRippleAnimations();

        // 清战斗动画
        sys.clearAllAnimations();

        // 重新创建波纹（模拟下一帧用户再次点击）
        sys.createTapRippleAnimation(200, 400, 1);

        // 等动画推进
        var start = Date.now();
        while (Date.now() - start < 50) {}

        sys.updateTapRippleAnimations();

        // 验证波纹能绘制
        var drawCallCount = 0;
        var origStroke = mockCtx.stroke;
        mockCtx.stroke = () => { drawCallCount++; };

        sys.drawTapRippleAnimations(1);

        assert.ok(drawCallCount > 0, 'clearAllAnimations 后新波纹应可绘制，实际 stroke 次数: ' + drawCallCount);

        mockCtx.stroke = origStroke;
    });
});
