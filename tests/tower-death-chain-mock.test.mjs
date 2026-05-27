/**
 * 无尽之塔怪物死亡链路 mock 测试（纯内联，无外部依赖）
 *
 * 测试目标：验证 BattleEngine 中 handleStarClick → addPendingDeath → update(pendingDeaths 消散) 链路
 *
 * 用法：node tests/tower-death-chain-mock.test.mjs
 */

// ═══════════════════════════════════════════════════
// 纯内联模拟 BattleEngine 核心逻辑
// 从 BattleEngine.js 直接提取最小必要逻辑
// ═══════════════════════════════════════════════════

function runTest(testName, fn) {
    console.log('\n=== ' + testName + ' ===');
    try {
        fn();
    } catch (e) {
        console.log('[ERROR]', e.message);
    }
}

function assert(label, condition) {
    var icon = condition ? 'PASS' : 'FAIL';
    console.log('  [' + icon + '] ' + label);
}

// ─── 模拟 BattleEngine 核心（提取自 BattleEngine.js）───
var PHASE = { IDLE: 'idle', RUNNING: 'running', FINISHED: 'finished' };
var NON_DAMAGE_TYPES = ['heal', 'shield', 'time', 'greedy', 'unlucky', 'boss_star', 'dodge', 'rainbow'];

function createMockEngine() {
    var S = createDefaultState();
    var callbacks = {};

    function createDefaultState() {
        return {
            phase: PHASE.IDLE,
            monster: null,
            playerHp: 100, playerMaxHp: 100, playerShield: 0,
            timeLeft: 40, timeLimit: 40,
            pendingDeaths: [],
            deathDelayMs: 1150,
            extensions: {},
            isFinished: false, finishReason: null,
            skillCooldowns: {},
            playerStats: null
        };
    }

    function init(config) {
        S = createDefaultState();
        S.phase = PHASE.RUNNING;
        S.monster = config.monster || null;
        S.playerHp = config.playerHp || 100;
        S.playerMaxHp = config.playerMaxHp || 100;
        S.timeLeft = config.timeLimit || 40;
        S.timeLimit = config.timeLimit || 40;
        S.deathDelayMs = config.deathDelayMs != null ? config.deathDelayMs : 1150;
        S.extensions = config.extensions || {};
        callbacks.onMonsterDeath = config.onMonsterDeath || null;
        callbacks.onPlayerDeath = config.onPlayerDeath || null;
    }

    function addPendingDeath(monster) {
        if (!monster || !monster.id) return;
        for (var i = 0; i < S.pendingDeaths.length; i++) {
            if (S.pendingDeaths[i].monsterId === monster.id) return;
        }
        S.pendingDeaths.push({ monsterId: monster.id, deathTime: Date.now(), monster: monster });
        console.log('[addPendingDeath] 怪物 ' + monster.name + ' 加入延迟死亡队列, HP=' + monster.hp);
    }

    /**
     * 模拟 handleStarClick 的核心攻击路径
     * 只提取了伤害计算到 addPendingDeath 的关键部分
     */
    function handleStarClick(star, monster, damageCalcFn) {
        if (S.phase !== PHASE.RUNNING) return false;

        // 前置钩子
        if (S.extensions.onBeforeStarClick) {
            var preResult = S.extensions.onBeforeStarClick(star);
            if (preResult && preResult.skip) return false;
            if (preResult && preResult.handled) return true;
        }

        // 特殊星星
        if (NON_DAMAGE_TYPES.indexOf(star.type) !== -1) return true;
        if (star.type === 'combo') return true;

        // 攻击目标
        var targetMonster = S.monster;
        if (S.extensions.getAttackTarget) {
            targetMonster = S.extensions.getAttackTarget(star) || S.monster;
        }

        // 伤害计算
        var result = null;
        if (S.extensions.calculateDamageOverride) {
            result = S.extensions.calculateDamageOverride(star);
        }
        if (!result && damageCalcFn) {
            result = damageCalcFn(star);
        }
        if (!result) result = { damage: 10 };

        var damage = result.damage;

        // ★ 关键检查1：无怪物或不活跃
        if (!targetMonster || !targetMonster.active) {
            console.log('  [handleStarClick] BLOCKED: targetMonster=' + !!targetMonster + ', active=' + (targetMonster ? targetMonster.active : 'N/A'));
            return true;
        }

        // 怪物防御钩子
        var hitResult = { prevented: false, isAbsorbed: false, reflected: false };
        if (S.extensions.onStarHitMonster) {
            hitResult = S.extensions.onStarHitMonster(star, targetMonster, damage, result.isCrit) || hitResult;
        }

        // ★ 关键检查2：被阻止
        if (hitResult.prevented) {
            console.log('  [handleStarClick] PREVENTED (absorb/dodge/block)');
            return true;
        }

        // ★ 关键检查3：闪避
        if (hitResult.dodged) {
            console.log('  [handleStarClick] DODGED');
            return true;
        }

        var actualDamage = (hitResult.modifiedDamage !== undefined) ? hitResult.modifiedDamage : damage;

        // ★ 关键检查4：护盾格挡
        if (hitResult.shieldBlocked && actualDamage <= 0) {
            console.log('  [handleStarClick] SHIELD BLOCKED');
            return true;
        }

        // ★ 应用伤害
        targetMonster.hp -= actualDamage;
        console.log('  [handleStarClick] 伤害=' + actualDamage + ' 剩余HP=' + targetMonster.hp + ' 碾压=' + (targetMonster.hp <= 0));

        if (targetMonster.hp <= 0) {
            addPendingDeath(targetMonster);
        }

        return true;
    }

    function update() {
        if (S.phase !== PHASE.RUNNING) return;

        // pendingDeaths 消散处理
        if (S.pendingDeaths.length > 0) {
            var latestTime = 0;
            for (var i = 0; i < S.pendingDeaths.length; i++) {
                if (S.pendingDeaths[i].deathTime > latestTime) latestTime = S.pendingDeaths[i].deathTime;
            }
            var now = Date.now();
            var elapsed = now - latestTime;
            if (elapsed >= S.deathDelayMs) {
                var lastDead = S.pendingDeaths[S.pendingDeaths.length - 1];
                S.pendingDeaths = [];
                if (S.extensions.preventFinish) {
                    console.log('[update] pendingDeaths 消散完成, preventFinish=true, 直接调回调');
                    if (callbacks.onMonsterDeath) callbacks.onMonsterDeath({ monster: lastDead.monster, floor: S.floor });
                } else {
                    console.log('[update] pendingDeaths 消散完成, 调 finishBattle');
                    finishBattle('monsterDeath');
                }
            } else {
                console.log('[update] pendingDeaths 等待中... 已过=' + elapsed + 'ms / ' + S.deathDelayMs + 'ms');
            }
            return;
        }
    }

    function finishBattle(reason) {
        if (S.phase === PHASE.FINISHED) return;
        if (reason === 'monsterDeath' && S.pendingDeaths.length > 0) return;
        S.pendingDeaths = [];
        S.phase = PHASE.FINISHED;
        S.isFinished = true;
        S.finishReason = reason;
        console.log('[finishBattle] reason=' + reason);
        if (reason === 'monsterDeath' && callbacks.onMonsterDeath) {
            callbacks.onMonsterDeath({ monster: S.monster });
        }
    }

    function destroy() {
        S = createDefaultState();
        callbacks = {};
        console.log('[destroy] 状态机已销毁');
    }

    function getState() { return S; }

    return {
        init: init, update: update, handleStarClick: handleStarClick,
        destroy: destroy, getState: getState,
        addPendingDeath: addPendingDeath, finishBattle: finishBattle
    };
}

// ═══════════════════════════════════════════════════
// 测试 1：基本伤害链路
// ═══════════════════════════════════════════════════
runTest('测试1: 基本伤害链路（active=true, 有伤害钩子）', function() {
    var deathCallbackCalled = false;
    var engine = createMockEngine();

    var monster = {
        id: 'mon_1', name: '测试怪物', hp: 100, maxHp: 100, attack: 10,
        active: true, skills: []
    };

    engine.init({
        monster: monster,
        playerHp: 100, playerMaxHp: 100,
        deathDelayMs: 500,
        onMonsterDeath: function(ctx) {
            deathCallbackCalled = true;
            console.log('  [回调] onMonsterDeath! monster=' + (ctx.monster ? ctx.monster.name : 'null'));
        },
        extensions: {
            preventFinish: true,
            calculateDamageOverride: function() {
                return { damage: 30, isCrit: false };
            },
            onStarHitMonster: function(star, m, damage) {
                return { prevented: false, modifiedDamage: damage, shieldBlocked: false };
            }
        }
    });

    var state = engine.getState();
    assert('初始HP=100', state.monster.hp === 100);

    engine.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 }, monster);
    state = engine.getState();
    assert('HP减少(=70)', state.monster.hp === 70);

    engine.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 }, monster);
    engine.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 }, monster);
    engine.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 }, monster);
    state = engine.getState();
    assert('HP≤0(=-20)', state.monster.hp <= 0);
    assert('pendingDeaths=1', state.pendingDeaths.length === 1);
    assert('phase=running', state.phase === 'running');

    // 消散
    state.pendingDeaths[0].deathTime = Date.now() - 600;
    engine.update();
    state = engine.getState();
    assert('死亡回调触发', deathCallbackCalled);
    assert('pendingDeaths清空', state.pendingDeaths.length === 0);
    assert('phase仍为running(因为preventFinish)', state.phase === 'running');

    engine.destroy();
});

// ═══════════════════════════════════════════════════
// 测试 2：缺少 active 属性
// ═══════════════════════════════════════════════════
runTest('测试2: 怪物缺少 active 属性', function() {
    var engine = createMockEngine();

    var monster = { id: 'mon_2', name: '无active怪物', hp: 100, maxHp: 100, attack: 10 };
    // 注意：没有 active 属性

    engine.init({
        monster: monster,
        playerHp: 100, playerMaxHp: 100,
        extensions: {
            preventFinish: true,
            calculateDamageOverride: function() { return { damage: 30, isCrit: false }; },
            onStarHitMonster: function(star, m, damage) { return { prevented: false, modifiedDamage: damage }; }
        }
    });

    engine.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 }, monster);
    var state = engine.getState();
    assert('HP应不变(=100)', state.monster.hp === 100);
    assert('!targetMonster.active 阻断', state.monster.hp !== 70);

    engine.destroy();
});

// ═══════════════════════════════════════════════════
// 测试 3：preventFinish 路径 vs finishBattle 路径
// ═══════════════════════════════════════════════════
runTest('测试3: preventFinish=true 消散回调 vs preventFinish=false finishBattle', function() {
    // 3a: preventFinish=true（塔模式）
    console.log('  3a: preventFinish=true（塔模式）');
    var prevCalled = false;
    var eng = createMockEngine();
    eng.init({
        monster: { id: 'mon_3a', name: '怪物3a', hp: 10, maxHp: 100, active: true },
        playerHp: 100, playerMaxHp: 100,
        deathDelayMs: 200,
        onMonsterDeath: function() { prevCalled = true; },
        extensions: {
            preventFinish: true,
            calculateDamageOverride: function() { return { damage: 30, isCrit: false }; },
            onStarHitMonster: function(s, m, d) { return { prevented: false, modifiedDamage: d }; }
        }
    });

    eng.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 });
    var st = eng.getState();
    st.pendingDeaths[0].deathTime = Date.now() - 300;
    eng.update();
    st = eng.getState();
    assert('preventFinish=true 回调触发', prevCalled);
    assert('phase 仍为 running', st.phase === 'running');
    eng.destroy();

    // 3b: preventFinish=false
    console.log('  3b: preventFinish=false');
    var prevCalled2 = false;
    var eng2 = createMockEngine();
    eng2.init({
        monster: { id: 'mon_3b', name: '怪物3b', hp: 10, maxHp: 100, active: true },
        playerHp: 100, playerMaxHp: 100,
        deathDelayMs: 200,
        onMonsterDeath: function() { prevCalled2 = true; },
        extensions: {
            preventFinish: false,
            calculateDamageOverride: function() { return { damage: 30, isCrit: false }; },
            onStarHitMonster: function(s, m, d) { return { prevented: false, modifiedDamage: d }; }
        }
    });

    eng2.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 });
    var st2 = eng2.getState();
    st2.pendingDeaths[0].deathTime = Date.now() - 300;
    eng2.update();
    st2 = eng2.getState();
    assert('preventFinish=false 回调触发', prevCalled2);
    assert('phase=finished', st2.phase === 'finished');
    eng2.destroy();
});

// ═══════════════════════════════════════════════════
// 测试 4：onStarHitMonster 返回 prevented 或 shieldBlocked
// ═══════════════════════════════════════════════════
runTest('测试4: onStarHitMonster 防御阻断', function() {
    // 4a: prevented (吸收)
    console.log('  4a: prevented (吸收)');
    var eng = createMockEngine();
    var m = { id: 'mon_4a', name: '吸收怪', hp: 100, maxHp: 100, active: true };
    eng.init({
        monster: m,
        playerHp: 100, playerMaxHp: 100,
        extensions: {
            preventFinish: true,
            calculateDamageOverride: function() { return { damage: 30, isCrit: false }; },
            onStarHitMonster: function() { return { prevented: true, absorbed: true }; }
        }
    });
    eng.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 }, m);
    assert('prevented时HP不变', m.hp === 100);
    eng.destroy();

    // 4b: shieldBlocked
    console.log('  4b: shieldBlocked (护盾格挡)');
    var eng2 = createMockEngine();
    var m2 = { id: 'mon_4b', name: '护盾怪', hp: 100, maxHp: 100, active: true, shield: 100 };
    eng2.init({
        monster: m2,
        playerHp: 100, playerMaxHp: 100,
        extensions: {
            preventFinish: true,
            calculateDamageOverride: function() { return { damage: 30, isCrit: false }; },
            onStarHitMonster: function() { return { prevented: false, modifiedDamage: 0, shieldBlocked: true }; }
        }
    });
    eng2.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 }, m2);
    assert('shieldBlocked且damage=0时HP不变', m2.hp === 100);
    eng2.destroy();
});

// ═══════════════════════════════════════════════════
// 测试 5：destroy 在 pendingDeaths 消散前
// ═══════════════════════════════════════════════════
runTest('测试5: destroy 在 pendingDeaths 消散前（模拟 combatTimeout）', function() {
    var deathCallbackCalled = false;
    var eng = createMockEngine();
    eng.init({
        monster: { id: 'mon_5', name: '怪物5', hp: 10, maxHp: 100, active: true },
        playerHp: 100, playerMaxHp: 100,
        onMonsterDeath: function() { deathCallbackCalled = true; },
        extensions: {
            preventFinish: true,
            calculateDamageOverride: function() { return { damage: 30, isCrit: false }; },
            onStarHitMonster: function(s, m, d) { return { prevented: false, modifiedDamage: d }; }
        }
    });

    eng.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 });
    var st = eng.getState();
    assert('pendingDeaths=1', st.pendingDeaths.length === 1);

    // 不等消散，直接 destroy（模拟 combatTimeout → cleanupCombat → battleEngine.destroy）
    eng.destroy();
    assert('destroy后死亡回调未触发', !deathCallbackCalled);

    st = eng.getState();
    assert('destroy后pendingDeaths清空', st.pendingDeaths.length === 0);
});

// ═══════════════════════════════════════════════════
// 测试 6：多帧 update 中消散正常触发
// ═══════════════════════════════════════════════════
runTest('测试6: 多帧 update 后正常消散', function() {
    var deathCallbackCalled = false;
    var eng = createMockEngine();
    eng.init({
        monster: { id: 'mon_6', name: '怪物6', hp: 10, maxHp: 100, active: true },
        playerHp: 100, playerMaxHp: 100,
        deathDelayMs: 100,
        onMonsterDeath: function() { deathCallbackCalled = true; },
        extensions: {
            preventFinish: true,
            calculateDamageOverride: function() { return { damage: 30, isCrit: false }; },
            onStarHitMonster: function(s, m, d) { return { prevented: false, modifiedDamage: d }; }
        }
    });

    eng.handleStarClick({ type: 'fire', size: 30, x: 200, y: 600 });

    // 模拟多帧，每次 update 后 time 增加
    var st = eng.getState();
    var origTime = st.pendingDeaths[0].deathTime;

    // 第1帧：刚加进去，时间还不够
    eng.update();
    st = eng.getState();
    assert('第1帧未消散', !deathCallbackCalled);

    // 修改 deathTime 来模拟时间流逝
    st.pendingDeaths[0].deathTime = Date.now() - 150;
    eng.update();
    st = eng.getState();
    assert('时间足够后消散', deathCallbackCalled);
    assert('pendingDeaths清空', st.pendingDeaths.length === 0);

    eng.destroy();
});

console.log('\n=== 所有测试完成 ===');