/**
 * 场景：Boss 星星点击验证（修正版）
 * 重点验证：正常点击 + 暂停恢复后点击 + 暂停不穿透
 */
module.exports = async function(sim) {
    var GAME_STATE = sim.getGAME_STATE();
    var results = [];

    var pd = sim.getPlayerData();
    pd.currentCharacterId = 'mage';
    pd.gold = 10000;
    pd.starSource = 1000;

    // ========================================
    // 子场景 1: 正常 Boss 星星点击
    // ========================================
    console.log('\n=== 子场景 1: 正常点击 ===');
    sim.startBoss(1);
    sim.tick(5);

    var star1 = await waitForStar(sim, 3000);
    if (!star1) return { pass: false, reason: '无星星', details: sim.snapshot() };

    var hp1 = sim.getBossBattleMode().bossHp;
    sim.tap(star1.x, star1.y);
    sim.tick(5);
    var hp1After = sim.getBossBattleMode().bossHp;
    var dmg1 = hp1 - hp1After;
    results.push({ name: '正常点击', damage: dmg1, pass: dmg1 > 0 });
    console.log('  伤害:', dmg1, dmg1 > 0 ? 'PASS' : 'FAIL');

    // ========================================
    // 子场景 2: 暂停→恢复→点击星星
    // ========================================
    console.log('\n=== 子场景 2: 暂停→恢复→点击 ===');
    sim.bossTogglePause();
    sim.tick(3);
    console.log('  已暂停');
    sim.bossTogglePause();
    sim.tick(3);
    console.log('  已恢复，状态:', sim.getState());

    var star2 = await waitForStar(sim, 3000);
    if (!star2) {
        results.push({ name: '暂停恢复后点击', pass: false, reason: '无星星' });
    } else {
        var hp2 = sim.getBossBattleMode().bossHp;
        sim.tap(star2.x, star2.y);
        sim.tick(5);
        var hp2After = sim.getBossBattleMode().bossHp;
        var dmg2 = hp2 - hp2After;
        results.push({ name: '暂停恢复后点击', damage: dmg2, pass: dmg2 > 0 });
        console.log('  伤害:', dmg2, dmg2 > 0 ? 'PASS' : 'FAIL');
    }

    // ========================================
    // 子场景 3: 暂停期间点击空白区域（不命中任何按钮）
    // ========================================
    console.log('\n=== 子场景 3: 暂停中点击空白区域 ===');
    var star3 = await waitForStar(sim, 2000);
    if (star3) {
        sim.bossTogglePause();
        sim.tick(3);
        var stateBefore = sim.getState();
        var hp3Before = sim.getBossBattleMode().bossHp;

        // 点击屏幕顶部空白区域（不在任何按钮区域内）
        sim.tap(50, 200);
        sim.tick(3);

        var stateAfter = sim.getState();
        var hp3After = sim.getBossBattleMode().bossHp;
        var statePreserved = (stateAfter === stateBefore);
        var noDamage = (hp3After === hp3Before);

        results.push({
            name: '暂停中点击空白',
            statePreserved: statePreserved,
            noDamage: noDamage,
            pass: statePreserved && noDamage
        });
        console.log('  状态保持:', statePreserved, '无伤害:', noDamage, (statePreserved && noDamage) ? 'PASS' : 'FAIL');

        sim.bossTogglePause();
        sim.tick(3);
    }

    // ========================================
    // 子场景 4: 暂停→继续游戏按钮→恢复后点击
    // ========================================
    console.log('\n=== 子场景 4: 通过继续按钮恢复 ===');
    var star4 = await waitForStar(sim, 2000);
    if (star4) {
        sim.bossTogglePause();
        sim.tick(3);
        var hp4Before = sim.getBossBattleMode().bossHp;

        // 点击「继续游戏」按钮位置（居中）
        var scale = sim.getScreenScale();
        var sw = sim.getScreenWidth();
        var sh = sim.getScreenHeight();
        var resumeBtnY = sh * 0.80;
        sim.tap(sw / 2, resumeBtnY);
        sim.tick(5);

        var stateAfterResume = sim.getState();
        var isBossAfterResume = stateAfterResume === GAME_STATE.BOSS_BATTLE;
        console.log('  恢复后状态:', stateAfterResume, isBossAfterResume ? 'PASS' : 'FAIL');

        results.push({
            name: '继续按钮恢复后仍是Boss',
            pass: isBossAfterResume,
            state: stateAfterResume
        });

        // 恢复后等星星并点击
        if (isBossAfterResume) {
            var star4b = await waitForStar(sim, 2000);
            if (star4b) {
                var hp4b = sim.getBossBattleMode().bossHp;
                sim.tap(star4b.x, star4b.y);
                sim.tick(5);
                var hp4bAfter = sim.getBossBattleMode().bossHp;
                var dmg4 = hp4b - hp4bAfter;
                results.push({ name: '继续按钮恢复后点击星星', damage: dmg4, pass: dmg4 > 0 });
                console.log('  伤害:', dmg4, dmg4 > 0 ? 'PASS' : 'FAIL');
            }
        }
    }

    // ========================================
    // 汇总
    // ========================================
    var allPass = results.every(function(r) { return r.pass; });
    var failedNames = results.filter(function(r) { return !r.pass; }).map(function(r) { return r.name; });

    return {
        pass: allPass,
        reason: allPass
            ? '所有子场景通过'
            : '失败: ' + failedNames.join(', '),
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
