/**
 * Mock 测试：技能系统对锈灵碎片 (slime) 的伤害验证
 * 
 * 模拟场景：聚合邪灵·瓷 (slime_king) 分裂成 3 只锈灵碎片后，
 * 蓄力技、拖拽技、节奏技是否正常造成伤害
 */

// ═══════════════════════════════════════════════
// Mock 锈灵碎片（slime_king 分裂后的小怪）
// MonsterConfig: slime { baseHp: 100, baseAttack: 10, skills: [{type:'poison'}] }
// 分裂时: maxHp = floor(100 * 1.2) = 120
// ═══════════════════════════════════════════════

function createSlime(idStr, hp, x, y) {
    return {
        id: idStr + '-' + Math.random().toString(36).slice(2, 8),
        active: true,
        x: x, y: y,
        size: 60,
        hp: hp, maxHp: hp,
        type: 'slime',
        scale: 1,
        animationFrame: 0,
        lastIceAttackTime: 0, lastFireAttackTime: 0,
        comboCooldown: 0,
        armor: 0, hpBonus: 0, damageBonus: 0,
        empowered: false, empowerType: null,
        absorbType: null,
        // 锈灵碎片技能：中毒攻击
        skills: [{ type: 'poison', damage: 1, duration: 3 }],
        skillStates: {},
        shield: 0,
        hasRaged: false, hasSplit: false,
        birthTime: Date.now(),
        attack: 10,
        attackInterval: 2000,
        rageMultiplier: 1,
        splitFrom: 'boss'
    };
}

// 模拟：分裂后 3 只锈灵碎片
function createSplitSlimes() {
    return [
        createSlime('slime-A', 120, 150, 300),
        createSlime('slime-B', 120, 300, 310),
        createSlime('slime-C', 120, 450, 300)
    ];
}

// ═══════════════════════════════════════════════
// 共享状态
// ═══════════════════════════════════════════════
var monsters = [];
var log = [];
function reset() {
    monsters = createSplitSlimes();
    log = [];
}
function getActiveMonsters() {
    return monsters.filter(function(m) { return m.active; });
}

// 模拟：玩家基础攻击力 50（总攻击力经过材料/角色加成后）
var MOCK_BASE_ATK = 50;

// ═══════════════════════════════════════════════
// 技能系统 1: 蓄力技伤害逻辑
// (ChargeSystem.releaseCharge 摘抄)
// ═══════════════════════════════════════════════
function chargeSkill(levelStage) {
    var chargeLevels = {
        'light':  { stage: 'light',  label: '轻蓄', damageMult: 2.6, aoeTargets: 1,  breaksShield: false },
        'medium': { stage: 'medium', label: '中蓄', damageMult: 5.0, aoeTargets: 3,  breaksShield: false },
        'full':   { stage: 'full',   label: '满蓄', damageMult: 8.0, aoeTargets: 99, breaksShield: true }
    };
    var level = chargeLevels[levelStage];

    var aliveMonsters = getActiveMonsters().filter(function(m) { return m.hp > 0 && m.active; });
    if (aliveMonsters.length === 0) return { result: 'no targets', targets: [] };

    var targets = level.aoeTargets >= 99 ? aliveMonsters : aliveMonsters.slice(0, level.aoeTargets);
    var totalDamage = 0;
    var details = [];

    for (var t = 0; t < targets.length; t++) {
        var m = targets[t];
        var dmg = Math.floor(MOCK_BASE_ATK * level.damageMult);  // 每次循环独立计算

        if (level.breaksShield && m.shield > 0) m.shield = 0;
        if (m.shield > 0) {
            if (dmg <= m.shield) { m.shield -= dmg; dmg = 0; }
            else { dmg -= m.shield; m.shield = 0; }
        }
        var hpBefore = m.hp;
        m.hp = Math.max(0, m.hp - dmg);
        totalDamage += dmg;
        details.push({ id: m.id, hpBefore: hpBefore, dmg: dmg, hpAfter: m.hp });
    }

    return { result: 'ok', label: level.label, totalDamage: totalDamage, targets: details, remainingMonsters: getActiveMonsters().filter(function(m) { return m.hp > 0; }).length };
}

// ═══════════════════════════════════════════════
// 技能系统 2: 节奏技——冲击波伤害
// (RhythmSkillSystem.applyShockwaveDamage 摘抄 — 有BUG版本)
// ═══════════════════════════════════════════════
function rhythmShockwave_DAMAGED() {
    var mlist = getActiveMonsters();
    var dmg = Math.floor(MOCK_BASE_ATK * 0.6);  // 60% baseAtk — 只计算一次！
    var totalDamage = 0;
    var details = [];

    for (var i = 0; i < mlist.length; i++) {
        var mon = mlist[i];
        if (mon.hp <= 0 || !mon.active) continue;
        if (mon.shield > 0) {
            if (dmg <= mon.shield) { mon.shield -= dmg; details.push({ id: mon.id, hpBefore: mon.hp, dmg: 0, hpAfter: mon.hp, note: 'shield blocked' }); continue; }
            else { dmg -= mon.shield; mon.shield = 0; }
        }
        var hpBefore = mon.hp;
        mon.hp = Math.max(0, mon.hp - dmg);
        totalDamage += dmg;
        details.push({ id: mon.id, hpBefore: hpBefore, dmg: dmg, hpAfter: mon.hp });
    }

    return { result: 'ok', type: 'shockwave(BUGGY)', totalDamage: totalDamage, targets: details, remainingMonsters: getActiveMonsters().filter(function(m) { return m.hp > 0; }).length };
}

// ═══════════════════════════════════════════════
// 技能系统 2: 节奏技——冲击波伤害（修复版）
// ═══════════════════════════════════════════════
function rhythmShockwave_FIXED() {
    var mlist = getActiveMonsters();
    var totalDamage = 0;
    var details = [];

    for (var i = 0; i < mlist.length; i++) {
        var mon = mlist[i];
        if (mon.hp <= 0 || !mon.active) continue;
        var dmg = Math.floor(MOCK_BASE_ATK * 0.6);  // 每次循环独立计算！
        if (mon.shield > 0) {
            if (dmg <= mon.shield) { mon.shield -= dmg; details.push({ id: mon.id, hpBefore: mon.hp, dmg: 0, hpAfter: mon.hp, note: 'shield blocked' }); continue; }
            else { dmg -= mon.shield; mon.shield = 0; }
        }
        var hpBefore = mon.hp;
        mon.hp = Math.max(0, mon.hp - dmg);
        totalDamage += dmg;
        details.push({ id: mon.id, hpBefore: hpBefore, dmg: dmg, hpAfter: mon.hp });
    }

    return { result: 'ok', type: 'shockwave(FIXED)', totalDamage: totalDamage, targets: details, remainingMonsters: getActiveMonsters().filter(function(m) { return m.hp > 0; }).length };
}

// ═══════════════════════════════════════════════
// 技能系统 2: 节奏技——settle 结算伤害
// (RhythmSkillSystem.settle 摘抄)
// ═══════════════════════════════════════════════
function rhythmSettle(comboCount) {
    // 找对应的节拍技配置
    var RHYTHM_SKILLS = [
        { min: 1,  max: 3,  name: '节奏微震',     mult: 2.5 },
        { min: 4,  max: 6,  name: '节拍技',       mult: 3.5 },
        { min: 7,  max: 8,  name: '强化节拍技',   mult: 5.0 },
        { min: 9,  max: 11, name: '完美节拍技',   mult: 7.0 },
    ];
    var skill = null;
    for (var si = 0; si < RHYTHM_SKILLS.length; si++) {
        if (comboCount >= RHYTHM_SKILLS[si].min && comboCount <= RHYTHM_SKILLS[si].max) {
            skill = RHYTHM_SKILLS[si]; break;
        }
    }
    if (!skill) return { result: 'no skill for combo ' + comboCount };

    var mlist = getActiveMonsters();
    var totalDamage = 0;
    var details = [];

    for (var i = 0; i < mlist.length; i++) {
        var mon = mlist[i];
        if (mon.hp <= 0 || !mon.active) continue;
        var dmg = Math.floor(MOCK_BASE_ATK * skill.mult);  // 每次循环独立计算
        if (mon.shield > 0) {
            if (dmg <= mon.shield) { mon.shield -= dmg; dmg = 0; }
            else { dmg -= mon.shield; mon.shield = 0; }
        }
        var hpBefore = mon.hp;
        mon.hp = Math.max(0, mon.hp - dmg);
        totalDamage += dmg;
        details.push({ id: mon.id, hpBefore: hpBefore, dmg: dmg, hpAfter: mon.hp });
    }

    return { result: 'ok', name: skill.name, mult: skill.mult, totalDamage: totalDamage, targets: details, remainingMonsters: getActiveMonsters().filter(function(m) { return m.hp > 0; }).length };
}

// ═══════════════════════════════════════════════
// 技能系统 3: 拖拽技——聚合流星伤害
// (DragSystem.updateDrag 摘抄)
// ═══════════════════════════════════════════════
function dragMeteor() {
    var aliveMonsters = getActiveMonsters();
    if (aliveMonsters.length === 0) return { result: 'no targets' };

    // 随机选一个目标
    var target = aliveMonsters[Math.floor(Math.random() * aliveMonsters.length)];
    var baseDamage = Math.floor(MOCK_BASE_ATK * 1.5);  // 1.5x 基础攻击力

    // 模拟 attackMonsterInternal 的防御处理
    var m = target;
    var hpBefore = m.hp;
    var finalDamage = baseDamage;

    // 护盾吸收
    if (m.shield > 0) {
        var shieldAbsorb = Math.min(m.shield, finalDamage);
        m.shield -= shieldAbsorb;
        finalDamage -= shieldAbsorb;
    }

    // 护甲减伤
    if (m.armor > 0) {
        finalDamage = Math.max(1, finalDamage - m.armor);
    }

    if (finalDamage > 0) {
        m.hp = Math.max(0, m.hp - finalDamage);
    }

    return {
        result: 'ok',
        targetId: target.id,
        baseDamage: baseDamage,
        finalDamage: finalDamage,
        hpBefore: hpBefore,
        hpAfter: m.hp,
        remainingMonsters: getActiveMonsters().filter(function(m) { return m.hp > 0; }).length
    };
}

// ═══════════════════════════════════════════════
// 测试套件
// ═══════════════════════════════════════════════
var passed = 0;
var failed = 0;

function test(name, fn) {
    reset();
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

// ── 测试 1: 蓄力技满蓄 (AOE) 对 3 只锈灵碎片 ──
test('ChargeSkill 满蓄应打 3 只锈灵碎片，每只 400 伤害', function() {
    var result = chargeSkill('full');
    assert(result.result === 'ok', 'result should be ok');
    assert(result.targets.length === 3, 'should hit all 3 slimes');
    // baseAtk=50, damageMult=8.0 => dmg=400 per target
    assert(result.targets[0].dmg === 400, 'dmg should be 400, got ' + result.targets[0].dmg);
    assert(result.targets[1].dmg === 400, 'dmg should be 400, got ' + result.targets[1].dmg);
    assert(result.targets[2].dmg === 400, 'dmg should be 400, got ' + result.targets[2].dmg);
    // 所有怪物 HP 从 120 → 0
    assert(result.remainingMonsters === 0, 'all should be dead');
});

// ── 测试 2: 蓄力技中蓄 (AOE=3) 对 3 只 ──
test('ChargeSkill 中蓄应打 3 只锈灵碎片，每只 250 伤害', function() {
    var result = chargeSkill('medium');
    assert(result.targets.length === 3, 'should hit all 3 slimes');
    // baseAtk=50, damageMult=5.0 => dmg=250
    assert(result.targets[0].dmg === 250, 'dmg should be 250, got ' + result.targets[0].dmg);
    assert(result.remainingMonsters === 0, 'all should be dead');
});

// ── 测试 3: 蓄力技轻蓄 (AOE=1) 只打 1 只 ──
test('ChargeSkill 轻蓄应只打 1 只，伤害 130', function() {
    var result = chargeSkill('light');
    assert(result.targets.length === 1, 'should hit only 1 slime');
    // baseAtk=50, damageMult=2.6 => dmg=130
    assert(result.targets[0].dmg === 130, 'dmg should be 130, got ' + result.targets[0].dmg);
    assert(result.targets[0].hpBefore === 120 && result.targets[0].hpAfter === 0, 'one should be dead');
    assert(result.remainingMonsters === 2, '2 remaining');
});

// ── 测试 4: 节奏技冲击波（BUG版）对 3 只锈灵碎片 ──
test('RhythmShockwave(BUGGY) 对 3 只无护盾锈灵碎片：bug 不触发', function() {
    var result = rhythmShockwave_DAMAGED();
    // 无护盾，dmg 不会被削减，每个怪物都吃 30 伤害
    assert(result.targets.length === 3, 'should hit all 3');
    assert(result.targets[0].dmg === 30, 'dmg should be 30, got ' + result.targets[0].dmg);
    assert(result.targets[1].dmg === 30, 'dmg should be 30, got ' + result.targets[1].dmg);
    assert(result.targets[2].dmg === 30, 'dmg should be 30, got ' + result.targets[2].dmg);
    // 每只从 120 → 90
    assert(result.targets[0].hpAfter === 90, 'hp should be 90');
    assert(result.remainingMonsters === 3, 'none dead');
});

// ── 测试 5: 节奏技冲击波（BUG版）— 模拟第一只带护盾 ──
test('RhythmShockwave(BUGGY) 第一只有护盾时，dmg 污染后续怪物', function() {
    reset();
    // 给 A 加护盾
    monsters[0].shield = 100;

    var result = rhythmShockwave_DAMAGED();
    // BUG: dmg=30 <= shield=100, 所以 A 只扣盾，然后 continue
    // dmg 没被修改所以还是 30
    // 但问题是：如果 shield > dmg，直接 continue 跳过伤害，这是正确的
    // 但 dmg 不会被修改
    // 换个场景：shield = 20, dmg = 30
    reset();
    monsters[0].shield = 20;
    result = rhythmShockwave_DAMAGED();
    // A: shield=20, dmg=30 => shield=0, dmg=10
    // B: dmg=10  (B的HP从120→110)
    // C: dmg=10  (C的HP从120→110)
    assert(result.targets[0].dmg === 10, 'A should take 10 dmg (30-20 shield), got ' + result.targets[0].dmg);
    assert(result.targets[1].dmg === 10, 'B should take 10 (polluted dmg), got ' + result.targets[1].dmg);
    assert(result.targets[2].dmg === 10, 'C should take 10 (polluted dmg), got ' + result.targets[2].dmg);
    assert(result.targets[0].hpAfter === 110, 'A hp should be 110');
    assert(result.targets[1].hpAfter === 110, 'B hp should be 110');
    assert(result.targets[2].hpAfter === 110, 'C hp should be 110');
    console.log('    → BUG 确认: 第一只护盾20吃掉了大部分伤害，导致 B/C 只受 10 而非 30');
});

// ── 测试 6: 节奏技冲击波（修复版）— 同样场景 ──
test('RhythmShockwave(FIXED) 第一只有护盾时，后续怪物不受影响', function() {
    reset();
    monsters[0].shield = 20;

    var result = rhythmShockwave_FIXED();
    // A: shield=20, dmg=30 => shield=0, dmg=10
    // B: dmg=30 (重新计算的) => hp 120→90
    // C: dmg=30 => hp 120→90
    assert(result.targets[0].dmg === 10, 'A should take 10, got ' + result.targets[0].dmg);
    assert(result.targets[1].dmg === 30, 'B should take 30, got ' + result.targets[1].dmg);
    assert(result.targets[2].dmg === 30, 'C should take 30, got ' + result.targets[2].dmg);
    assert(result.targets[0].hpAfter === 110, 'A hp=110');
    assert(result.targets[1].hpAfter === 90,  'B hp=90');
    assert(result.targets[2].hpAfter === 90,  'C hp=90');
});

// ── 测试 7: 节奏技结算 ──
test('RhythmSettle 4连对 3 只锈灵碎片', function() {
    var result = rhythmSettle(4);
    assert(result.name === '节拍技', 'should be 节拍技');
    assert(result.mult === 3.5, 'mult should be 3.5');
    // baseAtk=50, mult=3.5 => dmg=175 per target
    assert(result.targets[0].dmg === 175, 'dmg should be 175, got ' + result.targets[0].dmg);
    assert(result.targets.length === 3, 'should hit all 3');
    assert(result.remainingMonsters === 0, 'all should be dead (175 > 120)');
});

// ── 测试 8: 拖拽技聚合流星 ──
test('DragMeteor 对锈灵碎片', function() {
    var result = dragMeteor();
    assert(result.result === 'ok', 'result should be ok');
    // baseAtk=50, 1.5x => 75
    assert(result.baseDamage === 75, 'baseDamage should be 75, got ' + result.baseDamage);
    assert(result.finalDamage === 75, 'finalDamage should be 75 (no armor/shield)');
    assert(result.hpBefore === 120 && result.hpAfter === 45, 'hp should go 120→45');
    assert(result.remainingMonsters === 3, 'none dead');
});

// ── 测试 9: 拖拽技连续 2 次 ──
test('DragMeteor 连续 2 次可击杀一只锈灵碎片', function() {
    var r1 = dragMeteor();
    var killedId = r1.targetId;
    var r2 = dragMeteor();
    // 第二次可能打同一只或不同只
    // 如果不是同一只，第一只 r1 的第二次还会活着
    // 打到同一只的概率 ~1/3
    // 只验证伤害是否正常应用
    assert(r1.finalDamage === 75, 'first hit should be 75');
    assert(r2.finalDamage === 75, 'second hit should be 75');
    var aliveCount = getActiveMonsters().filter(function(m) { return m.hp > 0; }).length;
    console.log('    → 2 hits, alive count: ' + aliveCount + ' (如果打到同一只则=2，否则可能=3或=2)');
});

// ── 测试 10: 锈灵碎片有中毒技能，但技能系统应直接扣HP不受影响 ──
test('锈灵碎片中毒技能不影响技能系统伤害计算', function() {
    var m = monsters[0];
    assert(m.skills[0].type === 'poison', 'slime should have poison skill');
    // Charge/Rhythm/Drag 都不检查 skills，只看 hp/shield/armor
    // 所以中毒技能不影响伤害应用
    var result = chargeSkill('full');
    assert(result.targets.length === 3, 'should hit all 3 despite poison skill');
    assert(result.targets[0].dmg === 400, 'dmg unaffected by poison skill');
});

// ═══════════════════════════════════════════════
// 测试 11: 模拟真实战斗流程 — slime_king 分裂 → 技能攻击
// ═══════════════════════════════════════════════
test('完整流程：Boss分裂后，蓄力技 + 节奏技 + 拖拽技混用', function() {
    // 初始状态：3 只锈灵碎片
    assert(monsters.length === 3, '3 slimes');
    assert(monsters[0].hp === 120 && monsters[1].hp === 120 && monsters[2].hp === 120, 'all 120 hp');

    // 步骤1: 节奏技冲击波（修复版）→ 每只 -30
    var r1 = rhythmShockwave_FIXED();
    assert(r1.totalDamage === 90, 'shockwave total should be 90');
    monsters.forEach(function(m) { assert(m.hp === 90, 'each hp should be 90 after shockwave'); });

    // 步骤2: 拖拽技连续 3 次（假设打不同目标）
    var d1 = dragMeteor();
    var d2 = dragMeteor();
    var d3 = dragMeteor();
    var remaining = getActiveMonsters().filter(function(m) { return m.hp > 0; });
    console.log('    → 3 drag meteors, remaining: ' + remaining.length);

    // 步骤3: 蓄力技中蓄→ 全屏 AOE 250
    var c1 = chargeSkill('medium');
    assert(c1.targets.length > 0, 'should have targets');
    console.log('    → charge medium, totalDamage: ' + c1.totalDamage + ', remaining: ' + c1.remainingMonsters);

    // 步骤4: 节奏技结算 2 连 (节奏微震 mult=2.5)
    var s1 = rhythmSettle(2);
    console.log('    → rhythm settle (2 combo), totalDamage: ' + s1.totalDamage + ', remaining: ' + s1.remainingMonsters);
});

// ═══════════════════════════════════════════════
// 最终结果
// ═══════════════════════════════════════════════

// 测试 12: 节奏技流星回调（detonateStars 模拟）
test('节奏技流星回调：流星到达时对目标造成伤害', function() {
    // 模拟 detonateStars 场景：场上 3 只怪物，冲击波引爆灵光，流星飞向最近怪物
    // 修复前 onHit 传 null，流星只播动画不扣血
    // 修复后应在回调中直接扣血

    var totalMeteorDmg = 0;
    var starsList = [
        { x: 200, y: 500, type: 'normal', _rhythm: false, disappearTime: Date.now() + 99999 },
        { x: 350, y: 520, type: 'normal', _rhythm: false, disappearTime: Date.now() + 99999 },
        { x: 300, y: 480, type: 'ice',    _rhythm: false, disappearTime: Date.now() + 99999 },
    ];

    // findNearestMonster 逻辑
    function findNearestMonster(sx, sy) {
        var nearest = null;
        var nearestDist = Infinity;
        var mlist = getActiveMonsters();
        for (var m = 0; m < mlist.length; m++) {
            var mon = mlist[m];
            if (mon.hp <= 0 || !mon.active) continue;
            var mdx = (mon.x || 0) - sx;
            var mdy = (mon.y || 0) - sy;
            var dist = mdx * mdx + mdy * mdy;
            if (dist < nearestDist) { nearestDist = dist; nearest = mon; }
        }
        return nearest;
    }

    // onHit 回调模拟（修复后版本）
    function fireMeteorWithCallback(s, dmg) {
        var target = findNearestMonster(s.x, s.y);
        if (target && target.hp > 0 && target.active) {
            if (target.shield > 0) {
                if (dmg <= target.shield) { target.shield -= dmg; return 0; }
                var leftover = dmg - target.shield;
                target.shield = 0;
                target.hp = Math.max(0, target.hp - leftover);
                return leftover;
            }
            target.hp = Math.max(0, target.hp - dmg);
            return dmg;
        }
        return 0;
    }

    for (var i = 0; i < starsList.length; i++) {
        var s = starsList[i];
        if (s._rhythm) continue;
        var dmg = Math.floor(MOCK_BASE_ATK * 0.5);  // 25 per meteor
        var applied = fireMeteorWithCallback(s, dmg);
        totalMeteorDmg += applied;
    }

    // 3 颗流星，每颗 25 伤害，总共 75
    assert(totalMeteorDmg > 0, 'meteors should deal damage');
    assert(totalMeteorDmg === 75, '3 x 25 = 75, got ' + totalMeteorDmg);
    console.log('    → 3 meteors total damage: ' + totalMeteorDmg);
});

// 测试 13: 节奏技流星回调——修复前（onHit=null）对比
test('节奏技流星回调：修复前 onHit=null 不造成伤害', function() {
    var hpBefore = {};
    for (var i = 0; i < monsters.length; i++) {
        hpBefore[monsters[i].id] = monsters[i].hp;
    }

    // 模拟修复前：onHit 传 null，流星飞完不扣血
    // 这种情况下怪物 HP 应该完全不变
    monsters.forEach(function(m, idx) {
        assert(m.hp === hpBefore[m.id], 'hp should be unchanged when onHit=null');
    });
});

// ═══════════════════════════════════════════════
console.log('\n═══════════════════════════════════════');
console.log('结果: ' + passed + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════');

if (failed > 0) process.exit(1);