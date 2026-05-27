/**
 * Mock 测试：无尽之塔模式下技能系统对怪物的伤害验证
 * 
 * 模拟塔模式中 CombatMonster 独立于 monsters 数组的场景。
 * 修复前 getActiveMonsters() 在塔模式下返回空数组，导致技能伤害全空。
 */

// ═══════════════════════════════════════════════
// 模拟游戏状态
// ═══════════════════════════════════════════════
var GAME_STATE = {
    STAGE_PLAYING: 'stage_playing',
    TOWER_COMBAT: 'tower_combat'
};
var state = GAME_STATE.STAGE_PLAYING;

// ═══════════════════════════════════════════════
// 模拟普通模式的 monsters 数组
// ═══════════════════════════════════════════════
var monsters = [
    { id: 'slime-A', active: true, hp: 120, maxHp: 120, shield: 0, armor: 0, skills: [{ type: 'poison' }], type: 'slime' },
    { id: 'slime-B', active: true, hp: 120, maxHp: 120, shield: 0, armor: 0, skills: [{ type: 'poison' }], type: 'slime' },
    { id: 'slime-C', active: true, hp: 120, maxHp: 120, shield: 0, armor: 0, skills: [{ type: 'poison' }], type: 'slime' }
];

// ═══════════════════════════════════════════════
// 模拟塔模式的 CombatMonster
// ═══════════════════════════════════════════════
var towerSystem = {
    combatMonster: {
        id: 'tower-boss',
        active: true,
        hp: 800,
        maxHp: 800,
        shield: 0,
        armor: 0,
        skills: [{ type: 'split', hpThreshold: 0.5, splitInto: 'slime', count: 3 }],
        type: 'slime_king',
        splitFrom: null
    }
};

var BASE_ATK = 50;
var passed = 0;
var failed = 0;

function getActiveMonsters() {
    // 模拟修复后逻辑
    if (state === GAME_STATE.TOWER_COMBAT && towerSystem && towerSystem.combatMonster) {
        return towerSystem.combatMonster.active !== false ? [towerSystem.combatMonster] : [];
    }
    return monsters.filter(function(m) { return m.active; });
}

function resetTower() {
    if (towerSystem.combatMonster) {
        towerSystem.combatMonster.hp = 800;
        towerSystem.combatMonster.shield = 0;
        towerSystem.combatMonster.active = true;
    }
}

function resetNormal() {
    monsters[0].hp = 120;
    monsters[1].hp = 120;
    monsters[2].hp = 120;
}

function test(name, fn) {
    resetTower();
    resetNormal();
    try {
        fn();
        passed++;
        console.log('  PASS: ' + name);
    } catch (e) {
        failed++;
        console.log('  FAIL: ' + name + ' — ' + e.message);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
}

// ── 蓄力技满蓄 ──
function chargeSkillFull() {
    var mlist = getActiveMonsters();
    if (mlist.length === 0) return { result: 'no targets' };

    var level = { stage: 'full', damageMult: 8.0, aoeTargets: 99, breaksShield: true };
    var targets = level.aoeTargets >= 99 ? mlist : mlist.slice(0, level.aoeTargets);
    var totalDamage = 0;
    var details = [];

    for (var t = 0; t < targets.length; t++) {
        var m = targets[t];
        var dmg = Math.floor(BASE_ATK * level.damageMult);
        if (level.breaksShield && m.shield > 0) m.shield = 0;
        if (m.shield > 0) {
            if (dmg <= m.shield) { m.shield -= dmg; dmg = 0; }
            else { dmg -= m.shield; m.shield = 0; }
        }
        var hpBefore = m.hp;
        m.hp = Math.max(0, m.hp - dmg);
        totalDamage += dmg;
        details.push({ id: m.id, dmg: dmg, hpBefore: hpBefore, hpAfter: m.hp });
    }
    return { totalDamage: totalDamage, targets: details };
}

// ── 拖拽技 ──
function dragMeteor() {
    var mlist = getActiveMonsters();
    if (mlist.length === 0) return { result: 'no targets' };
    var m = mlist[Math.floor(Math.random() * mlist.length)];
    var dmg = Math.floor(BASE_ATK * 1.5);
    if (m.shield > 0) {
        var absorb = Math.min(m.shield, dmg);
        m.shield -= absorb;
        dmg -= absorb;
    }
    if (m.armor > 0) dmg = Math.max(1, dmg - m.armor);
    var hpBefore = m.hp;
    m.hp = Math.max(0, m.hp - dmg);
    return { targetId: m.id, dmg: dmg, hpBefore: hpBefore, hpAfter: m.hp };
}

// ── 节奏技冲击波（修复版） ──
function rhythmShockwave() {
    var mlist = getActiveMonsters();
    var totalDamage = 0;
    var details = [];
    var baseDmg = Math.floor(BASE_ATK * 0.6);
    for (var i = 0; i < mlist.length; i++) {
        var mon = mlist[i];
        if (mon.hp <= 0 || !mon.active) continue;
        var dmg = baseDmg;
        if (mon.shield > 0) {
            if (dmg <= mon.shield) { mon.shield -= dmg; continue; }
            else { dmg -= mon.shield; mon.shield = 0; }
        }
        var hpBefore = mon.hp;
        mon.hp = Math.max(0, mon.hp - dmg);
        totalDamage += dmg;
        details.push({ id: mon.id, dmg: dmg, hpBefore: hpBefore, hpAfter: mon.hp });
    }
    return { totalDamage: totalDamage, targets: details };
}

// ═══════════════════════════════════════════════
// 测试：普通模式
// ═══════════════════════════════════════════════
test('普通模式: 蓄力技满蓄打中 3 只锈灵碎片', function() {
    state = GAME_STATE.STAGE_PLAYING;
    var r = chargeSkillFull();
    assert(r.targets.length === 3, 'should hit 3');
    assert(r.targets[0].dmg === 400, 'dmg should be 400');
    assert(monsters[0].hp === 0, 'should be dead');
});

test('普通模式: 拖拽技打出 75 伤害', function() {
    state = GAME_STATE.STAGE_PLAYING;
    var r = dragMeteor();
    assert(r.dmg === 75, 'dmg should be 75');
});

test('普通模式: 节奏技冲击波对 3 只各打 30', function() {
    state = GAME_STATE.STAGE_PLAYING;
    var r = rhythmShockwave();
    assert(r.totalDamage === 90, 'total should be 90');
});

// ═══════════════════════════════════════════════
// 测试：塔模式（修复后）
// ═══════════════════════════════════════════════
test('塔模式: 蓄力技满蓄对 Boss 造成 400 伤害', function() {
    state = GAME_STATE.TOWER_COMBAT;
    var r = chargeSkillFull();
    assert(r.targets.length === 1, 'tower mode has 1 monster');
    assert(r.targets[0].dmg === 400, 'dmg should be 400, got ' + r.targets[0].dmg);
    assert(r.targets[0].id === 'tower-boss', 'should hit tower boss');
    assert(towerSystem.combatMonster.hp === 400, 'boss hp should be 800-400=400, got ' + towerSystem.combatMonster.hp);
});

test('塔模式: 拖拽技对 Boss 造成 75 伤害', function() {
    state = GAME_STATE.TOWER_COMBAT;
    var r = dragMeteor();
    assert(r.targetId === 'tower-boss', 'should target tower boss');
    assert(r.dmg === 75, 'dmg should be 75');
    assert(towerSystem.combatMonster.hp === 725, 'boss hp should be 725, got ' + towerSystem.combatMonster.hp);
});

test('塔模式: 节奏技冲击波对 Boss 造成 30 伤害', function() {
    state = GAME_STATE.TOWER_COMBAT;
    var r = rhythmShockwave();
    assert(r.targets.length === 1, '1 target');
    assert(r.targets[0].dmg === 30, 'dmg should be 30');
    assert(towerSystem.combatMonster.hp === 770, 'boss hp should be 770, got ' + towerSystem.combatMonster.hp);
});

test('塔模式: 多次混合技能攻击', function() {
    state = GAME_STATE.TOWER_COMBAT;
    // 2 次拖拽
    var d1 = dragMeteor();
    var d2 = dragMeteor();
    // 1 次冲击波
    var s1 = rhythmShockwave();
    // 1 次满蓄
    var c1 = chargeSkillFull();
    console.log('    → tower mixed: drag-1=' + d1.hpAfter + ', drag-2=' + d2.hpAfter + ', shockwave=' + s1.totalDamage + ', charge=' + c1.totalDamage);
    assert(towerSystem.combatMonster.hp <= 800 - 75 - 75 - 30 - 400, 'boss should take total damage correctly');
    assert(towerSystem.combatMonster.hp >= 0, 'hp not negative');
});

test('塔模式: 护盾吸收测试', function() {
    state = GAME_STATE.TOWER_COMBAT;
    towerSystem.combatMonster.shield = 20;
    var r = rhythmShockwave();
    assert(r.targets[0].dmg === 10, '30 dmg - 20 shield = 10, got ' + r.targets[0].dmg);
    assert(towerSystem.combatMonster.hp === 790, 'boss hp should be 790, got ' + towerSystem.combatMonster.hp);
    assert(towerSystem.combatMonster.shield === 0, 'shield depleted');
});

// ═══════════════════════════════════════════════
// 测试：切换到塔模式后，技能系统不再误打到普通模式怪物
// ═══════════════════════════════════════════════
test('切换到塔模式后，技能系统只打塔怪不打普通怪', function() {
    state = GAME_STATE.TOWER_COMBAT;
    var r = chargeSkillFull();
    assert(r.targets.length === 1, 'should only hit tower boss');
    assert(r.targets[0].id === 'tower-boss', 'should be tower boss');
    // 普通模式怪物不受影响
    assert(monsters[0].hp === 120, 'normal slimes untouched');
    assert(monsters[1].hp === 120, 'normal slimes untouched');
});

// ═══════════════════════════════════════════════
// 变体：塔模式无战斗时（combatMonster=null）
// ═══════════════════════════════════════════════
(function() {
    state = GAME_STATE.TOWER_COMBAT;
    var oldCombat = towerSystem.combatMonster;
    towerSystem.combatMonster = null;
    // 先将普通模式怪物也清空，才能验证塔模式下无 combatMonster 返回空
    var oldMonsters = monsters;
    monsters = [];
    var mlist = getActiveMonsters();
    try {
        if (mlist.length !== 0) throw new Error('expected empty, got ' + mlist.length);
        passed++;
        console.log('  PASS: 塔模式无战斗时返回空数组');
    } catch (e) {
        failed++;
        console.log('  FAIL: 塔模式无战斗时返回空数组 — ' + e.message);
    }
    monsters = oldMonsters;
    towerSystem.combatMonster = oldCombat;
})();

// ═══════════════════════════════════════════════
// 变体：塔模式怪物 inactive
// ═══════════════════════════════════════════════
(function() {
    state = GAME_STATE.TOWER_COMBAT;
    var oldActive = towerSystem.combatMonster.active;
    towerSystem.combatMonster.active = false;
    var mlist = getActiveMonsters();
    try {
        if (mlist.length !== 0) throw new Error('should return empty when inactive');
        passed++;
        console.log('  PASS: 塔模式 inactive 怪物应返回空');
    } catch (e) {
        failed++;
        console.log('  FAIL: 塔模式 inactive 怪物应返回空 — ' + e.message);
    }
    towerSystem.combatMonster.active = oldActive;
})();

// ═══════════════════════════════════════════════
console.log('\n═══════════════════════════════════════');
console.log('结果: ' + passed + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════');

if (failed > 0) process.exit(1);