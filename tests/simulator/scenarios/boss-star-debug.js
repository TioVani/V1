/**
 * 场景：Boss 模式星星点击全面排查
 * 子场景：1.正常点击 2.暂停后恢复点击 3.多轮点击
 */
module.exports = async function(sim) {
    var GAME_STATE = sim.getGAME_STATE();
    var results = [];

    // 初始化玩家
    var pd = sim.getPlayerData();
    pd.currentCharacterId = 'mage';
    pd.gold = 10000;
    pd.starSource = 1000;

    // ========================================
    // 子场景 1: 正常 Boss 点击
    // ========================================
    console.log('\n=== 子场景 1: 正常 Boss 星星点击 ===');
    sim.startBoss(1);
    sim.tick(5);

    if (sim.getState() !== GAME_STATE.BOSS_BATTLE) {
        return { pass: false, reason: 'Boss 未启动', details: { state: sim.getState() } };
    }

    // 等星星生成
    var star1 = await waitForStar(sim, 3000);
    if (!star1) {
        return { pass: false, reason: '子场景1: 无星星生成', details: sim.snapshot() };
    }

    var hpBefore = sim.getBossBattleMode().bossHp;
    sim.tap(star1.x, star1.y);
    sim.tick(5);
    var hpAfter = sim.getBossBattleMode().bossHp;
    var dmg1 = hpBefore - hpAfter;
    results.push({
        name: '正常点击',
        star: { x: star1.x.toFixed(0), y: star1.y.toFixed(0), type: star1.type },
        bossHpBefore: hpBefore,
        bossHpAfter: hpAfter,
        damage: dmg1,
        pass: dmg1 > 0
    });
    console.log('  伤害:', dmg1, dmg1 > 0 ? 'PASS' : 'FAIL');

    // ========================================
    // 子场景 2: 暂停 → 恢复 → 点击
    // ========================================
    console.log('\n=== 子场景 2: 暂停→恢复→点击 ===');
    sim.bossTogglePause();
    sim.tick(3);
    console.log('  暂停状态:', sim.getBossBattleMode().isPaused);
    console.log('  游戏状态:', sim.getState());

    sim.bossTogglePause();
    sim.tick(3);
    console.log('  恢复后暂停状态:', sim.getBossBattleMode().isPaused);

    // 等新星星
    var star2 = await waitForStar(sim, 3000);
    if (!star2) {
        results.push({ name: '暂停恢复后点击', pass: false, reason: '无星星' });
        console.log('  FAIL: 暂停恢复后无星星生成');
    } else {
        var hp2Before = sim.getBossBattleMode().bossHp;
        sim.tap(star2.x, star2.y);
        sim.tick(5);
        var hp2After = sim.getBossBattleMode().bossHp;
        var dmg2 = hp2Before - hp2After;
        results.push({
            name: '暂停恢复后点击',
            star: { x: star2.x.toFixed(0), y: star2.y.toFixed(0) },
            damage: dmg2,
            pass: dmg2 > 0
        });
        console.log('  伤害:', dmg2, dmg2 > 0 ? 'PASS' : 'FAIL');
    }

    // ========================================
    // 子场景 3: 暂停期间点击（应该无效）
    // ========================================
    console.log('\n=== 子场景 3: 暂停期间点击（应无效）===');
    var star3 = await waitForStar(sim, 2000);
    if (star3) {
        sim.bossTogglePause();
        sim.tick(3);
        var hp3Before = sim.getBossBattleMode().bossHp;
        sim.tap(star3.x, star3.y);
        sim.tick(5);
        var hp3After = sim.getBossBattleMode().bossHp;
        var dmg3 = hp3Before - hp3After;
        results.push({
            name: '暂停中点击',
            damage: dmg3,
            pass: dmg3 === 0, // 暂停中不应造成伤害
            note: '暂停中点击不应造成伤害'
        });
        console.log('  伤害:', dmg3, dmg3 === 0 ? 'PASS(正确拦截)' : 'FAIL(暂停未生效)');
        // 恢复
        sim.bossTogglePause();
        sim.tick(3);
    }

    // ========================================
    // 子场景 4: 连续多颗星星点击
    // ========================================
    console.log('\n=== 子场景 4: 连续多星点击 ===');
    var star4 = await waitForStar(sim, 2000);
    var clickCount = 0;
    var hitCount = 0;
    while (star4 && clickCount < 5) {
        var hp4b = sim.getBossBattleMode().bossHp;
        sim.tap(star4.x, star4.y);
        sim.tick(3);
        var hp4a = sim.getBossBattleMode().bossHp;
        if (hp4a < hp4b) hitCount++;
        clickCount++;
        star4 = sim.findFirstStar();
    }
    results.push({
        name: '连续点击',
        clicks: clickCount,
        hits: hitCount,
        pass: hitCount > 0
    });
    console.log('  点击:', clickCount, '命中:', hitCount, hitCount > 0 ? 'PASS' : 'FAIL');

    // ========================================
    // 汇总
    // ========================================
    var allPass = results.every(function(r) { return r.pass; });
    var failedNames = results.filter(function(r) { return !r.pass; }).map(function(r) { return r.name; });

    return {
        pass: allPass,
        reason: allPass
            ? '所有 Boss 星星点击子场景通过'
            : '失败场景: ' + failedNames.join(', '),
        details: results
    };
};

async function waitForStar(sim, timeoutMs) {
    var start = Date.now();
    while (Date.now() - start < timeoutMs) {
        sim.tick(3);
        await new Promise(function(r) { setTimeout(r, 50); });
        var found = sim.findFirstStar();
        if (found) return found.star;
    }
    return null;
}
