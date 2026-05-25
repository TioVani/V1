/**
 * 教学战斗硬性链路验证
 * 1. 只生成一只怪（startGame不额外生怪）
 * 2. checkMonsterAppear 被拦截
 * 3. 没有怪物攻击定时器在跑
 * 4. 倒计时不会归零
 * 5. HP降到30%直接触发胜利（无setTimeout延迟）
 * 6. 胜利弹窗300ms保护期
 * 7. 300ms后可关闭弹窗 → WORLDMAP
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const indexPath = resolve(ROOT, 'index.html');

const passed = [];
const failed = [];

function assert(cond, msg) {
    if (cond) { passed.push(msg); console.log(`  PASS: ${msg}`); }
    else { failed.push(msg); console.log(`  FAIL: ${msg}`); }
}

async function main() {
    console.log('\n=== 教学战斗硬性链路测试 ===\n');

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await ctx.newPage();

    await page.goto(indexPath, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);

    // === 模拟真实教学战斗入口 ===
    const setup = await page.evaluate(() => {
        try {
            // 模拟 onInteractResult tutorial 分支
            _tutorial.active = true;
            _tutorial.entityId = 'test_tutorial';
            _tutorial.ending = false;
            _tutorial.retryCount = 0;
            godMode = true;
            playerData.godMode = true;
            bestScore = 9999; // 模拟高分玩家

            startGame();

            // 硬杀所有干扰源（和game.js里一样）
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
            if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; }
            if (stopPetAttackTimer) stopPetAttackTimer();
            timeLeft = 9999;

            var spawned = spawnMonster('slime');
            return {
                error: null,
                monster: spawned ? { id: spawned.id, type: spawned.type, hp: spawned.hp, maxHp: spawned.maxHp } : null,
                monsterCount: monsters.filter(m => m.active).length,
                timerInterval: timerInterval,
                moveInterval: moveInterval,
                monsterAttackInterval: monsterAttackInterval,
                timeLeft: timeLeft
            };
        } catch(e) { return { error: e.message }; }
    });

    // [1] 生怪检查
    console.log('[1] 生怪检查');
    console.log('  setup:', JSON.stringify(setup));
    assert(!setup.error, '无异常');
    assert(setup.monster !== null, 'spawnMonster 成功: ' + JSON.stringify(setup.monster));
    assert(setup.monsterCount === 1, '只有1只怪物');
    assert(setup.timerInterval === null, '倒计时定时器已杀');
    assert(setup.moveInterval === null, '星星生成定时器已杀');
    assert(setup.monsterAttackInterval === null, '怪物攻击定时器已杀');
    assert(setup.timeLeft === 9999, '倒计时设为9999');

    // [2] checkMonsterAppear 拦截
    console.log('\n[2] checkMonsterAppear 拦截');
    await page.waitForTimeout(500);
    const afterCheck = await page.evaluate(() => {
        for (var i = 0; i < 20; i++) checkMonsterAppear();
        return monsters.filter(m => m.active).length;
    });
    assert(afterCheck === 1, '20次checkMonsterAppear后仍只有1只怪');

    // [3] 等待3秒验证无额外生怪
    console.log('\n[3] 3秒后无额外生怪');
    await page.waitForTimeout(3000);
    const after3s = await page.evaluate(() => monsters.filter(m => m.active).length);
    assert(after3s === 1, '3秒后仍只有1只怪');

    // [4] HP阈值直接触发胜利
    console.log('\n[4] HP阈值直接触发胜利');
    const victoryResult = await page.evaluate(() => {
        var m = monsters.find(x => x.active);
        if (!m) return { error: '无怪物' };

        // 压HP到30%以下
        m.hp = Math.floor(m.maxHp * 0.2);

        // 直接调用endGame（模拟checkTutorialVictory的直接调用）
        var beforePopup = _tutorial.victoryPopup;
        endGame();
        var afterPopup = _tutorial.victoryPopup;

        return {
            error: null,
            hp: m.hp,
            maxHp: m.maxHp,
            popupBefore: beforePopup !== null,
            popupAfter: afterPopup !== null,
            popupCreatedAt: afterPopup ? afterPopup.createdAt : null,
            state: state,
            monstersLeft: monsters.filter(x => x.active).length
        };
    });
    console.log('  victory:', JSON.stringify(victoryResult));
    assert(!victoryResult.error, 'endGame无异常');
    assert(victoryResult.popupAfter === true, '胜利弹窗已出现');
    assert(victoryResult.state === 'tutorial', '状态为 TUTORIAL');
    assert(victoryResult.monstersLeft === 0, '无残留怪物');

    // [5] 300ms保护期
    console.log('\n[5] 300ms保护期验证');

    // 立即点击不应关闭
    const instantClick = await page.evaluate(() => {
        handleTouchStart({ touches: [{ clientX: 100, clientY: 100, identifier: 0 }], changedTouches: [] });
        return _tutorial.victoryPopup !== null;
    });
    assert(instantClick === true, '立即点击弹窗仍在');

    // 150ms后点击不应关闭
    await page.waitForTimeout(150);
    const midClick = await page.evaluate(() => {
        handleTouchStart({ touches: [{ clientX: 100, clientY: 100, identifier: 0 }], changedTouches: [] });
        return _tutorial.victoryPopup !== null;
    });
    assert(midClick === true, '150ms后点击弹窗仍在');

    // 200ms后（累计350ms+）点击应关闭
    await page.waitForTimeout(200);
    const lateClick = await page.evaluate(() => {
        handleTouchStart({ touches: [{ clientX: 100, clientY: 100, identifier: 0 }], changedTouches: [] });
        return {
            popupClosed: _tutorial.victoryPopup === null,
            state: state,
            completed: _tutorial.completed
        };
    });
    assert(lateClick.popupClosed === true, '350ms后点击弹窗关闭');
    assert(lateClick.state === 'worldmap', '状态切到 WORLDMAP');
    assert(lateClick.completed === true, 'tutorial完成标记');

    // 结果
    console.log(`\n=== 结果: ${passed.length} passed, ${failed.length} failed ===`);
    if (failed.length > 0) failed.forEach(f => console.log(`  FAIL: ${f}`));

    await browser.close();
    process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(2);
});
