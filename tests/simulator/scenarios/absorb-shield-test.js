/**
 * 场景：怪物吸收 + 护盾完全抵挡 测试
 * 验证：
 * 1. 正常攻击造成伤害（HP 减少）
 * 2. 怪物吸收时 HP 不减少（反而回血）
 * 3. 护盾完全抵挡时 HP 不变
 */
module.exports = async function(sim) {
    var results = [];

    var pd = sim.getPlayerData();
    pd.currentCharacterId = 'mage';
    pd.gold = 10000;
    pd.starSource = 1000;

    sim.startBoss(1);
    sim.tick(5);

    // 等待怪物和星星
    var ready = false;
    for (var wait = 0; wait < 60; wait++) {
        sim.tick(3);
        await new Promise(function(r) { setTimeout(r, 50); });
        var mons = sim.getMonsters();
        var hasMon = false;
        for (var i = 0; i < mons.length; i++) {
            if (mons[i].hp > 0) { hasMon = true; break; }
        }
        if (hasMon && sim.findFirstStar()) { ready = true; break; }
    }
    if (!ready) return { pass: false, reason: '怪物或星星未就绪' };

    var monsters = sim.getMonsters();
    var monster = null;
    for (var j = 0; j < monsters.length; j++) {
        if (monsters[j].hp > 0) { monster = monsters[j]; break; }
    }

    async function waitForStar(maxWaits) {
        for (var w = 0; w < (maxWaits || 30); w++) {
            sim.tick(3);
            await new Promise(function(r) { setTimeout(r, 30); });
            var f = sim.findFirstStar();
            if (f) return f;
        }
        return null;
    }

    // === 测试 1: 正常攻击 ===
    var s1 = await waitForStar();
    if (!s1) return { pass: false, reason: '无星星', details: results };
    var hp1 = monster.hp;
    sim.tap(s1.star.x, s1.star.y);
    sim.tick(5);
    var dmg1 = hp1 - monster.hp;
    results.push({ name: '正常攻击造成伤害', pass: dmg1 > 0, damage: dmg1 });

    // === 测试 2: 怪物吸收（100%） ===
    monster.absorbType = 'all';
    monster.absorbRatio = 1.0;
    monster.healRate = 0.5;

    var s2 = await waitForStar();
    if (s2) {
        var hp2 = monster.hp;
        sim.tap(s2.star.x, s2.star.y);
        sim.tick(5);
        var hpAfter2 = monster.hp;
        // 吸收时 HP 应不减少（怪物回血）
        results.push({ name: '吸收：HP不减少', pass: hpAfter2 >= hp2, hpBefore: hp2, hpAfter: hpAfter2 });
    } else {
        results.push({ name: '吸收测试', pass: false, reason: '无星星' });
    }
    monster.absorbType = null;
    monster.absorbRatio = 0;

    // === 测试 3: 护盾完全抵挡 ===
    monster.shield = 9999;

    var s3 = await waitForStar();
    if (s3) {
        var hp3 = monster.hp;
        sim.tap(s3.star.x, s3.star.y);
        sim.tick(5);
        var hpAfter3 = monster.hp;
        // 护盾完全抵挡时 HP 不变
        results.push({ name: '护盾：HP不变', pass: hpAfter3 === hp3, hpBefore: hp3, hpAfter: hpAfter3 });
    } else {
        results.push({ name: '护盾测试', pass: false, reason: '无星星' });
    }
    monster.shield = 0;

    var allPass = results.every(function(r) { return r.pass; });
    return { pass: allPass, reason: allPass ? '全部通过' : '部分失败', details: results };
};
