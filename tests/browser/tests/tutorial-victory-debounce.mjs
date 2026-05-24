/**
 * 教学胜利弹窗触碰断点验证
 * 模拟真实场景：战斗中玩家连续点击，弹窗出现后快速连击不应关闭
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
    console.log('\n=== 教学胜利弹窗触碰断点测试 ===\n');

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await ctx.newPage();

    await page.goto(indexPath, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);

    // 设置教学战斗
    const setupResult = await page.evaluate(() => {
        try {
            _tutorial.active = true;
            _tutorial.entityId = 'test_debounce';
            godMode = true;
            playerData.godMode = true;
            bestScore = 9999;
            startGame();
            var spawned = spawnMonster('slime');
            if (!spawned) return { error: 'spawnMonster returned null' };
            spawned.hp = Math.floor(spawned.maxHp * 0.1);
            return { ok: true };
        } catch(e) { return { error: e.message }; }
    });

    if (setupResult.error) {
        console.log('Setup failed:', setupResult.error);
        await browser.close();
        process.exit(2);
    }

    // 触发胜利
    await page.evaluate(() => endGame());
    await page.waitForTimeout(50);

    const popupOk = await page.evaluate(() => _tutorial.victoryPopup !== null);
    assert(popupOk, '弹窗已出现');
    if (!popupOk) { await browser.close(); process.exit(2); }

    // 测试1: 弹窗出现后连续快速点击10次（模拟战斗中连击）
    console.log('[1] 连续快速点击10次（0-100ms内）');
    const rapidResult = await page.evaluate(() => {
        for (var i = 0; i < 10; i++) {
            handleTouchStart({ touches: [{ clientX: 100 + i * 10, clientY: 100, identifier: i }], changedTouches: [] });
        }
        return _tutorial.victoryPopup !== null;
    });
    assert(rapidResult === true, '10次快速点击后弹窗仍在');

    // 测试2: 等待500ms后再快速点击5次
    console.log('[2] 500ms后快速点击5次');
    await page.waitForTimeout(500);
    const midResult = await page.evaluate(() => {
        for (var i = 0; i < 5; i++) {
            handleTouchStart({ touches: [{ clientX: 200 + i * 10, clientY: 200, identifier: i }], changedTouches: [] });
        }
        return _tutorial.victoryPopup !== null;
    });
    assert(midResult === true, '500ms后快速点击5次弹窗仍在');

    // 测试3: 等待超过1秒后点击，弹窗应该关闭
    console.log('[3] 1.2秒后点击');
    await page.waitForTimeout(700);
    const finalResult = await page.evaluate(() => {
        handleTouchStart({ touches: [{ clientX: 100, clientY: 100, identifier: 0 }], changedTouches: [] });
        return {
            popupClosed: _tutorial.victoryPopup === null,
            state: state,
            completed: _tutorial.completed
        };
    });
    assert(finalResult.popupClosed === true, '1.2秒后点击弹窗关闭');
    assert(finalResult.state === 'worldmap', '状态切到 WORLDMAP');
    assert(finalResult.completed === true, 'tutorial标记完成');

    console.log(`\n=== 结果: ${passed.length} passed, ${failed.length} failed ===`);
    if (failed.length > 0) failed.forEach(f => console.log(`  FAIL: ${f}`));
    await browser.close();
    process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(2);
});
