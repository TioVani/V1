#!/usr/bin/env node
/**
 * run.js — Game Simulator CLI 入口
 * 用法: node tests/simulator/run.js <scenario>
 * 场景文件导出一个 async function(sim) → { pass, reason, ... }
 */
var path = require('path');
var GameSimulator = require('./GameSimulator.js');

var scenarioPath = process.argv[2];
if (!scenarioPath) {
    console.log('用法: node tests/simulator/run.js <scenario.js>');
    console.log('示例: node tests/simulator/run.js scenarios/boss-star-click.js');
    process.exit(1);
}

// 解析场景路径（支持简写：scenarios/xxx.js 或完整路径）
if (!path.isAbsolute(scenarioPath)) {
    // 先尝试相对于 simulator 目录
    var relToSim = path.resolve(__dirname, scenarioPath);
    // 再尝试相对于 cwd
    var relToCwd = path.resolve(process.cwd(), scenarioPath);
    // 优先使用存在的路径，否则用 simulator 相对路径
    var fs = require('fs');
    scenarioPath = fs.existsSync(relToSim) ? relToSim : relToCwd;
}

console.log('=== Game Simulator ===');
console.log('场景:', path.basename(scenarioPath));
console.log('');

async function main() {
    var sim;
    try {
        // 1. 创建模拟器并加载游戏
        sim = new GameSimulator();
        sim.init();
        console.log('[OK] 游戏加载完成，当前状态:', sim.getState());

        // 2. 构建以确保模块最新
        // （外部调用时应先 npm run build:only）

        // 3. 加载并执行场景
        var scenario = require(scenarioPath);
        var scenarioFn = scenario.default || scenario;
        if (typeof scenarioFn !== 'function') {
            console.error('[ERROR] 场景文件必须导出 async function(sim)');
            process.exit(1);
        }

        console.log('--- 执行场景 ---');
        var result = await scenarioFn(sim);

        // 4. 输出结果
        console.log('');
        console.log('--- 结果 ---');
        console.log('PASS:', result.pass ? 'YES' : 'NO');
        console.log('原因:', result.reason || '');
        if (result.details) {
            console.log('详情:', JSON.stringify(result.details, null, 2));
        }

        // 失败时打印快照
        if (!result.pass) {
            console.log('');
            console.log('--- 最终快照 ---');
            var snap = sim.snapshot();
            console.log(JSON.stringify(snap, null, 2));

            console.log('');
            console.log('--- 最近日志 ---');
            sim.printLogs(30);
        }

        process.exit(result.pass ? 0 : 1);

    } catch (e) {
        console.error('[ERROR]', e.message);
        console.error(e.stack);
        if (sim) {
            console.log('');
            console.log('--- 崩溃时快照 ---');
            try {
                console.log(JSON.stringify(sim.snapshot(), null, 2));
            } catch (e2) {
                console.error('无法获取快照:', e2.message);
            }
            sim.printLogs(20);
        }
        process.exit(2);
    }
}

main();
