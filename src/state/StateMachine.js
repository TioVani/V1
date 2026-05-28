/**
 * StateMachine — 游戏状态转移校验
 *
 * 定义合法状态转移图，非法转移打 warning 不阻断。
 * 转移时记录 previousState，供 ModeLifecycleManager 判断恢复目标。
 */
import Logger from '../utils/Logger.js';

function createStateMachine(deps) {
    var getGameState = deps.getGameState;
    var setGameStateRaw = deps.setGameStateRaw;
    var getPreviousState = deps.getPreviousState;
    var setPreviousState = deps.setPreviousState;

    // 合法转移图 — 键是源状态，值是允许的目标状态集合
    // 未列出的转移视为合法（宽松模式，避免阻断正常运行）
    var transitions = {
        'title': ['loading'],
        'loading': ['cutscene'],
        'cutscene': ['worldmap'],
        'worldmap': [
            'tutorial', 'boss_select', 'stage_select', 'season_menu', 'tower',
            'tower_resume', 'squad', 'shop', 'backpack', 'leaderboard',
            'settings', 'tasks', 'gacha_animation', 'debug', 'faith', 'nostalgic',
            'fusion', 'upgrade', 'cutscene_dialogue'
        ],
        'cutscene_dialogue': ['worldmap'],
        'tutorial': ['worldmap', 'tutorial'],
        'menu': [
            'playing', 'boss_select', 'stage_select', 'season_menu', 'tower',
            'tower_resume', 'squad', 'shop', 'backpack', 'leaderboard',
            'settings', 'tasks', 'gacha_animation', 'debug', 'faith', 'nostalgic'
        ],
        'playing': ['paused', 'gameover', 'menu'],
        'paused': ['playing', 'menu', 'boss_battle', 'tower_combat', 'stage_playing', 'season_playing'],
        'boss_battle': ['paused', 'boss_battle_result', 'menu'],
        'boss_battle_result': ['worldmap', 'menu', 'boss_select', 'boss_battle'],
        'boss_select': ['worldmap', 'menu', 'boss_battle'],
        'tower': ['tower_combat', 'tower_result', 'worldmap', 'menu'],
        'tower_combat': ['paused', 'tower', 'tower_result', 'worldmap', 'menu'],
        'tower_result': ['worldmap', 'menu', 'tower'],
        'tower_resume': ['tower', 'worldmap', 'menu'],
        'stage_select': ['worldmap', 'menu', 'stage_playing'],
        'stage_playing': ['paused', 'stage_result', 'menu'],
        'stage_result': ['menu', 'stage_select'],
        'season_menu': ['worldmap', 'menu', 'season_select'],
        'season_select': ['menu', 'season_playing'],
        'season_playing': ['paused', 'gameover', 'menu'],
        'backpack': ['worldmap', 'menu'],
        'shop': ['worldmap', 'menu'],
        'leaderboard': ['worldmap', 'menu'],
        'settings': ['worldmap', 'menu'],
        'tasks': ['worldmap', 'menu'],
        'squad': ['worldmap', 'menu', 'backpack'],
        'gacha_animation': ['menu'],
        'gameover': ['menu', 'season_playing', 'playing', 'boss_battle', 'stage_playing', 'tower_combat']
    };

    // 统计
    var transitionLog = [];
    var maxLogSize = 50;

    /**
     * 执行状态转移（带校验）
     * @param {string} newState - 目标状态值
     * @returns {boolean} - 转移是否合法
     */
    function transitionTo(newState) {
        var current = getGameState();

        // 相同状态不转移
        if (current === newState) return true;

        // 检查合法性
        var allowed = transitions[current];
        var isLegal = !allowed || allowed.indexOf(newState) !== -1;

        if (!isLegal) {
            Logger.warn('StateMachine: 非法转移', current, '->', newState, '（允许但不推荐）');
        }

        // 记录
        setPreviousState(current);
        setGameStateRaw(newState);

        // 日志
        transitionLog.push({ from: current, to: newState, time: Date.now(), legal: isLegal });
        if (transitionLog.length > maxLogSize) transitionLog.shift();

        Logger.info('StateMachine:', current, '->', newState, isLegal ? '(合法)' : '(未注册)');

        return isLegal;
    }

    function getTransitionLog() {
        return transitionLog.slice();
    }

    function getPreviousStateValue() {
        return getPreviousState();
    }

    /**
     * 查询两个状态间转移是否合法
     */
    function isLegalTransition(from, to) {
        var allowed = transitions[from];
        if (!allowed) return true; // 未定义的源状态视为合法
        return allowed.indexOf(to) !== -1;
    }

    return {
        transitionTo: transitionTo,
        getPreviousState: getPreviousStateValue,
        getTransitionLog: getTransitionLog,
        isLegalTransition: isLegalTransition
    };
}

export { createStateMachine };
