/**
 * Playwright 测试 Harness — AI 自测闭环
 * 启动浏览器加载游戏，暴露 testApi 给测试脚本
 *
 * 用法:
 *   node tests/browser/test-harness.mjs              # 交互模式
 *   node tests/browser/test-harness.mjs tests/browser/tests/fusion.mjs  # 跑测试文件
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');

async function createHarness() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();

    // 收集 console
    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.message}`));

    // Load game via injected scripts (browser-compatible eval)
    await page.addInitScript(() => { window.__playwright = true; });

    const modulesJs = readFileSync(resolve(PROJECT_ROOT, 'dist/game-modules.js'), 'utf8');
    const modulesPatched = modulesJs
        .replace(/if\s*\(typeof module[^}]+\}\s*$/m, '')
        .replace(/\/\/\s*#\s*sourceMappingURL[^\n]*/g, '')
        .replace(/^(const|let)\s/gm, 'var ');

    const gameJs = readFileSync(resolve(PROJECT_ROOT, 'game.js'), 'utf8');
    const gamePatched = gameJs
        .replace(
            /var _gameModules\s*=\s*require\(['"]\.\/dist\/game-modules\.js['"]\)/,
            'var _gameModules = GameModules'
        )
        .replace(/require\(['"][^'"]+['"]\)/g, '({})')
        .replace(/^(const|let)\s/gm, 'var ');

    // Inject: GameModules → game.js → init
    const combined = modulesPatched + '\n\n' + gamePatched + '\n\ninit(); window.__gameReady = true;';
    await page.addScriptTag({ content: combined });

    // 等待游戏初始化
    await page.waitForFunction('window.__gameReady === true', { timeout: 15000 }).catch(async () => {
        const err = await page.evaluate(() => window.__gameError);
        console.error('Game failed to initialize.');
        if (err) console.error('Init error:', err);
        console.error('Console logs:');
        logs.slice(-30).forEach(l => console.error('  ' + l));
    });

    // 基础通信测试
    const ping = await page.evaluate(() => 'pong');
    console.log(`[harness] ping: ${ping}`);

    // 检查游戏变量是否暴露到全局
    const globals = await page.evaluate(() => ({
        state: typeof state !== 'undefined' ? state : 'UNDEF',
        playerData: typeof playerData !== 'undefined' ? 'exists' : 'UNDEF',
        fusionEngine: typeof fusionEngine !== 'undefined' ? 'exists' : 'UNDEF',
        executeDebugAction: typeof executeDebugAction !== 'undefined' ? 'exists' : 'UNDEF',
        bestScore: typeof bestScore !== 'undefined' ? bestScore : 'UNDEF',
        __gameReady: window.__gameReady
    }));
    console.log('[harness] globals:', JSON.stringify(globals));

    const api = {
        page,

        async getState() {
            return page.evaluate(() => window.__testApi.getState());
        },

        async getPlayerData() {
            return page.evaluate(() => window.__testApi.getPlayerData());
        },

        async setPlayerData(data) {
            await page.evaluate((d) => {
                if (typeof playerData !== 'undefined') {
                    Object.keys(d).forEach(k => { playerData[k] = d[k]; });
                }
            }, data);
        },

        async click(x, y) {
            await page.evaluate(([cx, cy]) => window.__testApi.click(cx, cy), [x, y]);
            await page.waitForTimeout(100);
        },

        async touchStart(x, y) {
            await page.evaluate(([cx, cy]) => window.__testApi.touchStart(cx, cy), [x, y]);
        },

        async touchEnd(x, y) {
            await page.evaluate(([cx, cy]) => window.__testApi.touchEnd(cx, cy), [x, y]);
            await page.waitForTimeout(100);
        },

        async getLogs() {
            return page.evaluate(() => window.__testApi.getLogs());
        },

        async clearLogs() {
            await page.evaluate(() => window.__testApi.clearLogs());
            logs.length = 0;
        },

        async screenshot(path) {
            await page.screenshot({ path: path || 'tests/browser/screenshot.png' });
        },

        async screenshotBase64() {
            const buf = await page.screenshot();
            return buf.toString('base64');
        },

        async wait(ms) {
            await page.waitForTimeout(ms);
        },

        async waitForState(targetState, timeout = 5000) {
            await page.waitForFunction(
                (s) => window.__testApi.getState() === s,
                targetState,
                { timeout }
            ).catch(() => {
                throw new Error(`Timeout waiting for state "${targetState}"`);
            });
        },

        async evaluate(fn, ...args) {
            return page.evaluate(fn, ...args);
        },

        async close() {
            await browser.close();
        }
    };

    return api;
}

// CLI 模式
if (process.argv[1] && process.argv[1].endsWith('test-harness.mjs')) {
    const testFile = process.argv[2];
    if (!testFile) {
        console.log('Usage: node tests/browser/test-harness.mjs <test-file>');
        console.log('  e.g. node tests/browser/test-harness.mjs tests/browser/tests/fusion.mjs');
        process.exit(1);
    }

    const resolvedPath = resolve(testFile);
    if (!existsSync(resolvedPath)) {
        console.error(`Test file not found: ${resolvedPath}`);
        process.exit(1);
    }

    const harness = await createHarness();
    console.log(`[harness] Game loaded, state: ${await harness.getState()}`);

    const mod = await import(`file:///${resolvedPath.replace(/\\/g, '/')}`);
    console.log(`[harness] Test module loaded, default type: ${typeof mod.default}, run type: ${typeof mod.run}`);
    if (typeof mod.default === 'function') {
        await mod.default(harness);
    } else if (typeof mod.run === 'function') {
        await mod.run(harness);
    } else {
        console.error('Test file must export `run(api)` or `default(api)`');
        process.exit(1);
    }

    await harness.close();
    console.log('[harness] Done.');
}

export { createHarness };