/**
 * 场景：Boss 模式点击星星
 * 验证 Boss 战斗中星星能被正确点击和消耗
 */
module.exports = async function(sim) {
    var GAME_STATE = sim.getGAME_STATE();

    // 1. 设置玩家（有角色才能正确初始化 HP）
    var pd = sim.getPlayerData();
    pd.currentCharacterId = 'mage';
    pd.gold = 10000;
    pd.starSource = 1000;

    // 2. 开始 Boss 战斗
    sim.startBoss(1);
    sim.tick(5);

    var stateAfterBoss = sim.getState();
    if (stateAfterBoss !== GAME_STATE.BOSS_BATTLE) {
        return {
            pass: false,
            reason: 'Boss 战斗未正确启动',
            details: { state: stateAfterBoss, expected: GAME_STATE.BOSS_BATTLE }
        };
    }

    // 3. 等待星星生成（Boss 模式星星由 moveInterval 生成）
    // 等待最多 3 秒
    var hasStars = false;
    for (var wait = 0; wait < 60; wait++) {
        sim.tick(3);
        await new Promise(function(r) { setTimeout(r, 50); });
        var starsCheck = sim.getStars();
        for (var si = 0; si < starsCheck.length; si++) {
            if (starsCheck[si].visible) {
                hasStars = true;
                break;
            }
        }
        if (hasStars) break;
    }

    var snap1 = sim.snapshot();
    if (!hasStars) {
        return {
            pass: false,
            reason: 'Boss 战斗中没有星星生成',
            details: { snapshot: snap1, logs: sim.filterLogs('star').slice(-10) }
        };
    }

    // 4. 找到第一颗可见星星
    var found = sim.findFirstStar();
    if (!found) {
        return {
            pass: false,
            reason: '找不到可见星星',
            details: { snapshot: snap1 }
        };
    }

    var starBefore = found.star;
    var starsCountBefore = snap1.starsVisible;

    // 5. 点击该星星
    sim.tap(starBefore.x, starBefore.y);
    sim.tick(5);

    // 6. 检查结果
    var snap2 = sim.snapshot();
    var starsCountAfter = snap2.starsVisible;

    // 星星被消耗 = 可见星星减少，或分数增加
    var consumed = starsCountAfter < starsCountBefore || snap2.score > 0;

    return {
        pass: consumed,
        reason: consumed
            ? '星星被正确点击（分数=' + snap2.score + '，可见星星 ' + starsCountBefore + '→' + starsCountAfter + '）'
            : '星星点击未生效（分数=' + snap2.score + '，可见星星 ' + starsCountBefore + '→' + starsCountAfter + '）',
        details: {
            starClicked: { x: starBefore.x, y: starBefore.y, type: starBefore.type },
            scoreBefore: 0,
            scoreAfter: snap2.score,
            starsBefore: starsCountBefore,
            starsAfter: starsCountAfter,
            state: snap2.state
        }
    };
};
