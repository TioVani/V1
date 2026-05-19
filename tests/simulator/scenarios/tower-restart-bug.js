/**
 * 场景：塔战斗中暂停→点击「重新开始」→ 跑到主界面
 * 复现步骤：
 * 1. 进入塔模式
 * 2. 移动到怪物格子触发战斗
 * 3. 暂停
 * 4. 点击「重新开始」按钮
 * 5. 检查状态 → 预期回到 TOWER，实际可能去了 MENU
 */
module.exports = async function(sim) {
    var GAME_STATE = sim.getGAME_STATE();
    var results = [];

    // Setup
    var pd = sim.getPlayerData();
    pd.currentCharacterId = 'mage';
    pd.gold = 10000;
    pd.starSource = 1000;

    // 进入塔模式
    sim.startTower();
    sim.tick(5);
    var state = sim.getState();
    results.push({ name: '进入塔', pass: state === GAME_STATE.TOWER, state: state });

    // 获取塔系统
    var ts = sim.getTowerSystem();
    var grid = ts.grid;

    // 找到玩家附近的怪物格子
    var monsterCell = null;
    var px = ts.playerX;
    var py = ts.playerY;
    for (var dy = -1; dy <= 1 && !monsterCell; dy++) {
        for (var dx = -1; dx <= 1 && !monsterCell; dx++) {
            if (dx === 0 && dy === 0) continue;
            var nx = px + dx;
            var ny = py + dy;
            if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[ny].length) {
                var cell = grid[ny][nx];
                if (cell && (cell.type === 'monster' || (cell.monster && cell.monster.hp > 0))) {
                    monsterCell = { x: nx, y: ny, cell: cell };
                }
            }
        }
    }

    if (!monsterCell) {
        // 扩大搜索范围
        for (var dy2 = -3; dy2 <= 3 && !monsterCell; dy2++) {
            for (var dx2 = -3; dx2 <= 3 && !monsterCell; dx2++) {
                if (dx2 === 0 && dy2 === 0) continue;
                var nx2 = px + dx2;
                var ny2 = py + dy2;
                if (ny2 >= 0 && ny2 < grid.length && nx2 >= 0 && nx2 < grid[ny2].length) {
                    var cell2 = grid[ny2][nx2];
                    if (cell2 && (cell2.type === 'monster' || (cell2.monster && cell2.monster.hp > 0))) {
                        monsterCell = { x: nx2, y: ny2, cell: cell2 };
                    }
                }
            }
        }
    }

    if (!monsterCell) {
        return { pass: false, reason: '找不到怪物格子', details: sim.towerSnapshot() };
    }

    console.log('怪物位置:', monsterCell.x, monsterCell.y, '类型:', monsterCell.cell.type);

    // 移动到怪物格子（可能需要多步）
    var totalDx = monsterCell.x - ts.playerX;
    var totalDy = monsterCell.y - ts.playerY;
    // 逐步移动
    while (totalDx !== 0 || totalDy !== 0) {
        var stepX = totalDx > 0 ? 1 : (totalDx < 0 ? -1 : 0);
        var stepY = totalDy > 0 ? 1 : (totalDy < 0 ? -1 : 0);
        if (stepX !== 0) {
            sim.towerMovePlayer(stepX, 0);
            totalDx -= stepX;
        } else if (stepY !== 0) {
            sim.towerMovePlayer(0, stepY);
            totalDy -= stepY;
        }
        sim.tick(3);
        // 如果进入战斗了就停止
        if (ts.inCombat || sim.getState() === GAME_STATE.TOWER_COMBAT) break;
    }

    sim.tick(5);
    var stateAfterMove = sim.getState();
    var inCombat = ts.inCombat;
    console.log('移动后状态:', stateAfterMove, '战斗中:', inCombat);

    if (stateAfterMove !== GAME_STATE.TOWER_COMBAT) {
        return { pass: false, reason: '未能进入塔战斗，状态: ' + stateAfterMove, details: sim.towerSnapshot() };
    }

    results.push({ name: '进入塔战斗', pass: true, state: stateAfterMove });

    // === 核心：暂停 → 点击重新开始 ===
    console.log('\n=== 暂停 → 点击重新开始 ===');

    // 1. 点暂停按钮（左上角 15,15 ~ 65,65）
    var pauseBtnSize = 50;
    sim.tap(40, 40);
    sim.tick(3);

    var stateAfterPause = sim.getState();
    console.log('暂停后状态:', stateAfterPause);
    results.push({ name: '暂停', pass: stateAfterPause === GAME_STATE.PAUSED, state: stateAfterPause });

    // 2. 检查 modeLifecycle 的状态
    var sm = sim.getGameStateMachine();
    var mlMode = null;
    try {
        var ml = sim._game._executeDebugAction ? null : null;
    } catch(e) {}

    // 3. 点击「重新开始」按钮（屏幕中间偏下）
    var scale = sim.getScreenScale();
    var sw = sim.getScreenWidth();
    var sh = sim.getScreenHeight();
    var btnWidth = Math.floor(200 * scale);
    var btnHeight = Math.floor(60 * scale);
    var restartBtnY = sh * 0.70;

    console.log('重新开始按钮位置: x=[' + (sw/2 - btnWidth/2) + ',' + (sw/2 + btnWidth/2) + '] y=[' + (restartBtnY - btnHeight/2) + ',' + (restartBtnY + btnHeight/2) + ']');

    sim.clearLogs();
    sim.tap(sw / 2, restartBtnY);
    sim.tick(5);

    var stateAfterRestart = sim.getState();
    console.log('点击重新开始后状态:', stateAfterRestart);

    // 检查日志
    var logs = sim.filterLogs('重新开始');
    logs.forEach(function(l) { console.log('  日志:', l.msg); });

    var modeLifecycleLogs = sim.filterLogs('ModeLifecycle');
    modeLifecycleLogs.forEach(function(l) { console.log('  ML日志:', l.msg); });

    var expectedStates = [GAME_STATE.TOWER, GAME_STATE.TOWER_COMBAT];
    var isCorrect = expectedStates.indexOf(stateAfterRestart) !== -1;
    var wentToMenu = stateAfterRestart === GAME_STATE.MENU;

    results.push({
        name: '重新开始后状态',
        pass: isCorrect,
        state: stateAfterRestart,
        wentToMenu: wentToMenu,
        expected: 'TOWER or TOWER_COMBAT',
        actual: stateAfterRestart
    });

    // === 诊断：追踪 modeLifecycle.getPreviousMode ===
    console.log('\n=== 根因分析 ===');
    console.log('点击重新开始后状态:', stateAfterRestart);

    // 重新初始化一次来追踪
    sim.startTower();
    sim.tick(5);

    // 再找怪物进入战斗
    ts = sim.getTowerSystem();
    grid = ts.grid;
    px = ts.playerX;
    py = ts.playerY;
    monsterCell = null;
    for (var dy3 = -2; dy3 <= 2 && !monsterCell; dy3++) {
        for (var dx3 = -2; dx3 <= 2 && !monsterCell; dx3++) {
            if (dx3 === 0 && dy3 === 0) continue;
            var nx3 = px + dx3;
            var ny3 = py + dy3;
            if (ny3 >= 0 && ny3 < grid.length && nx3 >= 0 && nx3 < grid[ny3].length) {
                var cell3 = grid[ny3][nx3];
                if (cell3 && cell3.type === 'monster') {
                    monsterCell = { x: nx3, y: ny3 };
                }
            }
        }
    }

    if (monsterCell) {
        // 移动到怪物
        var totalDx2 = monsterCell.x - ts.playerX;
        var totalDy2 = monsterCell.y - ts.playerY;
        while (totalDx2 !== 0 || totalDy2 !== 0) {
            var sx = totalDx2 > 0 ? 1 : (totalDx2 < 0 ? -1 : 0);
            var sy = totalDy2 > 0 ? 1 : (totalDy2 < 0 ? -1 : 0);
            if (sx !== 0) { sim.towerMovePlayer(sx, 0); totalDx2 -= sx; }
            else if (sy !== 0) { sim.towerMovePlayer(0, sy); totalDy2 -= sy; }
            sim.tick(3);
            if (ts.inCombat || sim.getState() === GAME_STATE.TOWER_COMBAT) break;
        }
        sim.tick(3);
    }

    // 现在追踪暂停流程中的 ModeLifecycle 状态
    console.log('战斗状态:', sim.getState());

    // 暂停前检查
    sim.clearLogs();
    sim.tap(40, 40); // 点暂停
    sim.tick(3);

    var mlLogs2 = sim.filterLogs('ModeLifecycle');
    console.log('暂停时 ModeLifecycle 日志:');
    mlLogs2.forEach(function(l) { console.log('  ' + l.msg); });

    // 汇总
    var allPass = results.every(function(r) { return r.pass; });
    return {
        pass: allPass,
        reason: wentToMenu
            ? 'BUG确认：塔战斗中暂停→重新开始，状态变为 MENU 而非 TOWER'
            : (isCorrect ? '行为正确' : '异常状态: ' + stateAfterRestart),
        details: results
    };
};
