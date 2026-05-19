/**
 * 场景：排查 Boss 暂停期间点击星星触发了重新开始按钮
 */
module.exports = async function(sim) {
    var GAME_STATE = sim.getGAME_STATE();

    var pd = sim.getPlayerData();
    pd.currentCharacterId = 'mage';
    pd.gold = 10000;
    pd.starSource = 1000;

    sim.startBoss(1);
    sim.tick(5);

    // 等星星
    var star = await waitForStar(sim, 3000);
    if (!star) return { pass: false, reason: '无星星' };

    var scale = sim.getScreenScale();
    var sw = sim.getScreenWidth();
    var sh = sim.getScreenHeight();

    // 计算暂停菜单按钮位置
    var btnWidth = Math.floor(200 * scale);
    var btnHeight = Math.floor(60 * scale);
    var menuBtnY = sh * 0.60;
    var restartBtnY = sh * 0.70;
    var resumeBtnY = sh * 0.80;

    console.log('\n=== 暂停菜单按钮坐标 ===');
    console.log('屏幕:', sw, 'x', sh, 'scale:', scale);
    console.log('按钮宽度:', btnWidth, '高度:', btnHeight);
    console.log('返回菜单: x=[' + (sw/2 - btnWidth/2) + ',' + (sw/2 + btnWidth/2) + '] y=[' + (menuBtnY - btnHeight/2) + ',' + (menuBtnY + btnHeight/2) + ']');
    console.log('重新开始: x=[' + (sw/2 - btnWidth/2) + ',' + (sw/2 + btnWidth/2) + '] y=[' + (restartBtnY - btnHeight/2) + ',' + (restartBtnY + btnHeight/2) + ']');
    console.log('继续游戏: x=[' + (sw/2 - btnWidth/2) + ',' + (sw/2 + btnWidth/2) + '] y=[' + (resumeBtnY - btnHeight/2) + ',' + (resumeBtnY + btnHeight/2) + ']');
    console.log('\n星星位置: x=' + star.x.toFixed(1) + ' y=' + star.y.toFixed(1));

    // 检查星星是否在某个按钮区域内
    var inMenu = isInside(sw/2, menuBtnY, btnWidth, btnHeight, star.x, star.y);
    var inRestart = isInside(sw/2, restartBtnY, btnWidth, btnHeight, star.x, star.y);
    var inResume = isInside(sw/2, resumeBtnY, btnWidth, btnHeight, star.x, star.y);
    console.log('星星在返回菜单区域:', inMenu);
    console.log('星星在重新开始区域:', inRestart);
    console.log('星星在继续游戏区域:', inResume);

    // 暂停
    sim.bossTogglePause();
    sim.tick(3);
    console.log('\n=== 暂停后点击星星 ===');
    console.log('暂停状态:', sim.getBossBattleMode().isPaused);
    console.log('游戏状态:', sim.getState());

    // 点击星星
    sim.clearLogs();
    sim.tap(star.x, star.y);
    sim.tick(3);

    var stateAfter = sim.getState();
    console.log('点击后状态:', stateAfter);

    // 查找日志
    var logs = sim.filterLogs('点击');
    console.log('点击相关日志:');
    logs.forEach(function(l) { console.log('  ' + l.msg); });

    var leakedThrough = stateAfter === GAME_STATE.BOSS_BATTLE;
    // 即使状态没变，暂停菜单的 return 也可能吞掉了点击
    var clickLogs = sim.filterLogs('BattleEngine');
    var attackHappened = clickLogs.some(function(l) { return l.msg.indexOf('攻击怪物') !== -1; });
    console.log('攻击是否发生:', attackHappened);

    // 结论
    var problem = '';
    if (!leakedThrough) {
        problem = '点击星星后游戏状态改变为: ' + stateAfter + '（预期仍为 boss_battle）';
    } else if (attackHappened) {
        problem = '暂停期间点击星星造成了伤害（不应发生）';
    }

    return {
        pass: leakedThrough && !attackHappened,
        reason: problem || '暂停期间点击星星被正确拦截',
        details: {
            starPos: { x: star.x.toFixed(1), y: star.y.toFixed(1) },
            buttons: {
                menu: { y: menuBtnY, range: [menuBtnY - btnHeight/2, menuBtnY + btnHeight/2] },
                restart: { y: restartBtnY, range: [restartBtnY - btnHeight/2, restartBtnY + btnHeight/2] },
                resume: { y: resumeBtnY, range: [resumeBtnY - btnHeight/2, resumeBtnY + btnHeight/2] }
            },
            stateAfter: stateAfter,
            attackHappened: attackHappened
        }
    };
};

function isInside(cx, cy, w, h, px, py) {
    return px >= cx - w/2 && px <= cx + w/2 && py >= cy - h/2 && py <= cy + h/2;
}

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
