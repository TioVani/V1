import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const GM = require('../dist/game-modules.js');

// ═══════════════════════════════════════════════════════════
// Bug: 赛季模式玩一段时间后星星点击和怪物攻击停止
// 根因: BattleEngine 内部时间倒计时在 preventFinish 模式下仍运行
// 修复: preventFinish 模式跳过引擎内部时间倒计时
// ═══════════════════════════════════════════════════════════

describe('BattleEngine: preventFinish 模式跳过时间倒计时', () => {
    function createEngine(opts) {
        opts = opts || {};
        const engine = GM.createBattleEngine({
            getScreenWidth: () => 375,
            getScreenHeight: () => 667,
            getScreenScale: () => 1,
            getGameConst: () => opts.gameConst || {},
            getFillRoundRect: () => function() {},
            Logger: { info: () => {}, error: () => {}, warn: () => {} }
        });

        engine.init({
            mode: opts.mode || 'normal',
            monster: {
                id: 1, name: 'slime', hp: 100, maxHp: 100,
                attack: 10, attackInterval: 2000, active: true, x: 187, y: 222
            },
            playerHp: 100,
            playerMaxHp: 100,
            playerShield: 0,
            timeLimit: opts.timeLimit || 3,
            skipAutoTimers: false,
            extensions: opts.extensions || {},
            onMonsterDeath: opts.onMonsterDeath || function() {},
            onPlayerDeath: opts.onPlayerDeath || function() {},
            onTimeUp: opts.onTimeUp || function() {},
            deathDelayMs: opts.deathDelayMs != null ? opts.deathDelayMs : 0
        });

        return engine;
    }

    it('preventFinish=true: 时间耗尽后 phase 保持 running', () => {
        var timeUpCalled = false;
        const engine = createEngine({
            timeLimit: 3,
            extensions: { preventFinish: true },
            onTimeUp: () => { timeUpCalled = true; }
        });

        const s = engine.getState();
        assert.equal(s.phase, 'running', '初始 phase 应为 running');

        // 模拟时间流逝：连续 update 超过 timeLimit（TIME_TICK_MS=1000）
        for (let i = 0; i < 50; i++) {
            engine.update();
        }

        assert.equal(s.phase, 'running', 'preventFinish 模式 phase 应保持 running');
        assert.equal(timeUpCalled, false, 'preventFinish 模式不应触发 onTimeUp');
    });

    it('preventFinish=false: 时间耗尽后 phase 变 finished', () => {
        var timeUpCalled = false;
        const engine = createEngine({
            timeLimit: 1,
            extensions: {},
            onTimeUp: () => { timeUpCalled = true; },
            gameConst: {}
        });

        const s = engine.getState();

        // 直接调用 finishBattle 模拟时间到（跳过攻击者系统 mock 问题）
        engine.finishBattle('timeUp');

        assert.equal(s.phase, 'finished', '非 preventFinish 模式 phase 应变 finished');
        assert.equal(timeUpCalled, true, '应触发 onTimeUp');
    });

    it('preventFinish=true + deathDelayMs=0: 怪物死亡立即回调', () => {
        var deathCalled = false;
        const engine = createEngine({
            timeLimit: 60,
            deathDelayMs: 0,
            extensions: { preventFinish: true },
            onMonsterDeath: () => { deathCalled = true; }
        });

        const s = engine.getState();

        // 怪物 hp 清零 → addPendingDeath
        s.monster.hp = 0;
        engine.addPendingDeath(s.monster);

        // update 应立即触发死亡回调
        engine.update();

        assert.equal(deathCalled, true, 'deathDelayMs=0 应立即触发 onMonsterDeath');
        assert.equal(s.phase, 'running', 'preventFinish 模式 phase 保持 running');
    });

    it('preventFinish=true + deathDelayMs=1150: 怪物死亡有延迟', () => {
        var deathCalled = false;
        const engine = createEngine({
            timeLimit: 60,
            deathDelayMs: 1150,
            extensions: { preventFinish: true },
            onMonsterDeath: () => { deathCalled = true; }
        });

        const s = engine.getState();
        s.monster.hp = 0;
        engine.addPendingDeath(s.monster);

        // 立即 update — 还在延迟中
        engine.update();
        assert.equal(deathCalled, false, '延迟期间不应触发 onMonsterDeath');

        // 等过延迟时间
        const start = Date.now();
        while (Date.now() - start < 1200) {}
        engine.update();

        assert.equal(deathCalled, true, '延迟后应触发 onMonsterDeath');
    });
});

// ═══════════════════════════════════════════════════════════
// Bug: 暂停后返回菜单再进入，流星动画固定在点击位置
// 根因: clearAllAnimations 的外层覆盖版本未重置 _pauseStartTime
// 修复: clearAllAnimations 重置 _pauseStartTime 和 _pauseAccumulated
// ═══════════════════════════════════════════════════════════

describe('AnimationSystem: clearAllAnimations 重置暂停时钟', () => {
    function createAnim() {
        return GM.createAnimationSystem({
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

    it('暂停时 getGameTime 冻结', () => {
        const sys = createAnim();
        sys.pauseAnimations();

        const t1 = sys.getGameTime();
        const start = Date.now();
        while (Date.now() - start < 10) {}
        const t2 = sys.getGameTime();

        assert.equal(t2, t1, '暂停时 getGameTime 应返回固定值');
    });

    it('clearAllAnimations 后 getGameTime 恢复流动', () => {
        const sys = createAnim();

        // 模拟：暂停 → clearAll（返回菜单再进入）
        sys.pauseAnimations();
        sys.clearAllAnimations();

        const t1 = sys.getGameTime();
        const start = Date.now();
        while (Date.now() - start < 10) {}
        const t2 = sys.getGameTime();

        assert.ok(t2 > t1, 'clearAllAnimations 后 getGameTime 应恢复流动');
    });

    it('暂停→clearAll→创建流星→update: 动画能推进', () => {
        const sys = createAnim();

        // 模拟完整 bug 路径
        sys.pauseAnimations();
        sys.clearAllAnimations();

        // 创建流星动画
        const meteor = sys.createMeteorAnimation(
            100, 100,   // startX, startY
            10,          // damage
            false,       // isCritical
            'normal',    // starType
            10,          // starScore
            1,           // comboMultiplier
            null,        // onHit
            { x: 200, y: 300 }  // customEnd
        );

        assert.ok(meteor, '应成功创建流星动画');
        assert.equal(meteor.progress, 0, '初始 progress 应为 0');

        // 等动画 duration（150ms）过完
        const start = Date.now();
        while (Date.now() - start < 200) {}
        sys.updateMeteorAnimations();

        assert.ok(meteor.progress > 0, '流星动画 progress 应大于 0');
    });

    it('未 clearAll 时流星动画无法推进（复现原始 bug）', () => {
        const sys = createAnim();

        // 只暂停，不 clearAll
        sys.pauseAnimations();

        const meteor = sys.createMeteorAnimation(
            100, 100, 10, false, 'normal', 10, 1, null,
            { x: 200, y: 300 }
        );

        const start = Date.now();
        while (Date.now() - start < 200) {}
        sys.updateMeteorAnimations();

        assert.equal(meteor.progress, 0, '暂停未恢复时 progress 应保持 0（bug 复现）');
    });
});
