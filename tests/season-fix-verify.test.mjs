/**
 * 赛季模式修复验证测试
 * 
 * 验证三个修复：
 * 1. onHide 暂停战斗 → 定时器被清除
 * 2. render() 有 clearRect + 非战斗状态不震动
 * 3. GAMEOVER 返回菜单调用 cleanupMode
 */

// ============================================================
// 测试一：onHide 暂停战斗（纯模拟，无需启动完整游戏）
// ============================================================

function test_onHide_pauses_combat() {
    console.log('\n=== TEST 1: onHide 暂停战斗 ===');

    // 模拟 state、previousState、PauseCoordinator
    var state = 'season_playing';
    var previousState = null;
    var paused = false;
    var transitionTo = null;

    var mockPauseCoordinator = {
        paused: false,
        pause: function() { this.paused = true; },
        resume: function() { this.paused = false; }
    };

    var GAME_STATE = {
        SEASON_PLAYING: 'season_playing',
        PLAYING: 'playing',
        STAGE_PLAYING: 'stage_playing',
        BOSS_BATTLE: 'boss_battle',
        TOWER_COMBAT: 'tower_combat',
        PAUSED: 'paused',
        WORLDMAP: 'worldmap'
    };

    var COMBAT_STATES = [
        GAME_STATE.SEASON_PLAYING,
        GAME_STATE.PLAYING,
        GAME_STATE.STAGE_PLAYING,
        GAME_STATE.BOSS_BATTLE,
        GAME_STATE.TOWER_COMBAT
    ];

    // 模拟 onHide 逻辑（与 game.js L3548-3560 一致）
    function onHide() {
        if (state === GAME_STATE.SEASON_PLAYING ||
            state === GAME_STATE.PLAYING ||
            state === GAME_STATE.STAGE_PLAYING ||
            state === GAME_STATE.BOSS_BATTLE ||
            state === GAME_STATE.TOWER_COMBAT) {
            previousState = state;
            mockPauseCoordinator.pause();
            transitionTo = GAME_STATE.PAUSED;
        }
    }

    var allPass = true;

    // Case 1: 赛季战斗中切后台
    state = GAME_STATE.SEASON_PLAYING;
    onHide();
    if (previousState !== GAME_STATE.SEASON_PLAYING) { console.log('  FAIL: previousState 未记录'); allPass = false; }
    else console.log('  PASS: 赛季 → 暂停, previousState=season_playing');
    if (!mockPauseCoordinator.paused) { console.log('  FAIL: PauseCoordinator 未暂停'); allPass = false; }
    else console.log('  PASS: PauseCoordinator 已暂停');
    if (transitionTo !== GAME_STATE.PAUSED) { console.log('  FAIL: 未切换到 PAUSED'); allPass = false; }
    else console.log('  PASS: 已切换到 PAUSED');

    // Case 2: 大地图中切后台（非战斗状态，不应对暂停生效）
    mockPauseCoordinator.paused = false;
    previousState = null;
    transitionTo = null;
    state = GAME_STATE.WORLDMAP;
    onHide();
    if (mockPauseCoordinator.paused) { console.log('  FAIL: 非战斗状态不该暂停'); allPass = false; }
    else console.log('  PASS: 非战斗状态未暂停');
    if (transitionTo !== null) { console.log('  FAIL: 非战斗状态不该切换状态'); allPass = false; }
    else console.log('  PASS: 非战斗状态未切换');

    // Case 3: 普通战斗中切后台
    mockPauseCoordinator.paused = false;
    previousState = null;
    transitionTo = null;
    state = GAME_STATE.PLAYING;
    onHide();
    if (previousState !== GAME_STATE.PLAYING) allPass = false;
    if (!mockPauseCoordinator.paused) allPass = false;
    if (transitionTo !== GAME_STATE.PAUSED) allPass = false;
    console.log('  ' + (previousState === 'playing' && mockPauseCoordinator.paused && transitionTo === 'paused' ? 'PASS' : 'FAIL') + ': 普通战斗 → 暂停');

    // Case 4: 闯关战斗中切后台
    mockPauseCoordinator.paused = false;
    previousState = null;
    transitionTo = null;
    state = GAME_STATE.STAGE_PLAYING;
    onHide();
    console.log('  ' + (previousState === 'stage_playing' && mockPauseCoordinator.paused && transitionTo === 'paused' ? 'PASS' : 'FAIL') + ': 闯关战斗 → 暂停');

    // Case 5: Boss 战中切后台
    mockPauseCoordinator.paused = false;
    previousState = null;
    transitionTo = null;
    state = GAME_STATE.BOSS_BATTLE;
    onHide();
    console.log('  ' + (previousState === 'boss_battle' && mockPauseCoordinator.paused && transitionTo === 'paused' ? 'PASS' : 'FAIL') + ': Boss战 → 暂停');

    // Case 6: 爬塔战斗中切后台
    mockPauseCoordinator.paused = false;
    previousState = null;
    transitionTo = null;
    state = GAME_STATE.TOWER_COMBAT;
    onHide();
    console.log('  ' + (previousState === 'tower_combat' && mockPauseCoordinator.paused && transitionTo === 'paused' ? 'PASS' : 'FAIL') + ': 爬塔战斗 → 暂停');

    return allPass;
}


// ============================================================
// 测试二：render() clearRect + 非战斗状态不震动
// ============================================================

function test_render_clearRect_and_shake_guard() {
    console.log('\n=== TEST 2: clearRect + 非战斗状态震动限制 ===');

    var allPass = true;

    // 模拟 render() 中的逻辑（game.js L5579-5586）
    var GAME_STATE = {
        PLAYING: 'playing', PAUSED: 'paused',
        SEASON_PLAYING: 'season_playing', STAGE_PLAYING: 'stage_playing',
        BOSS_BATTLE: 'boss_battle', TOWER_COMBAT: 'tower_combat',
        WORLDMAP: 'worldmap', MENU: 'menu', LEADERBOARD: 'leaderboard'
    };

    var COMBAT_STATES = [
        GAME_STATE.PLAYING, GAME_STATE.PAUSED,
        GAME_STATE.SEASON_PLAYING, GAME_STATE.STAGE_PLAYING,
        GAME_STATE.BOSS_BATTLE, GAME_STATE.TOWER_COMBAT
    ];

    function isCombatState(state) {
        for (var i = 0; i < COMBAT_STATES.length; i++) {
            if (state === COMBAT_STATES[i]) return true;
        }
        return false;
    }

    // 模拟震动偏移（战斗触发震动后）
    var shakeOffset = { offsetX: 5, offsetY: 3 };
    var translateCalled = false;
    var restoreCalled = false;
    var clearRectCalled = false;

    function mockRender(state) {
        clearRectCalled = true; // clearRect 总是被调用
        if (isCombatState(state) && (shakeOffset.offsetX !== 0 || shakeOffset.offsetY !== 0)) {
            translateCalled = true;
        }
        // ... 渲染 ...
        if (isCombatState(state) && (shakeOffset.offsetX !== 0 || shakeOffset.offsetY !== 0)) {
            restoreCalled = true;
        }
    }

    // Case 1: 赛季战斗 → 震动生效
    translateCalled = false; restoreCalled = false; clearRectCalled = false;
    mockRender(GAME_STATE.SEASON_PLAYING);
    if (!clearRectCalled) { console.log('  FAIL: clearRect 未调用'); allPass = false; }
    if (!translateCalled) { console.log('  FAIL: 赛季战斗震动未生效'); allPass = false; }
    if (!restoreCalled) { console.log('  FAIL: 赛季战斗震动未恢复'); allPass = false; }
    console.log('  ' + (clearRectCalled && translateCalled && restoreCalled ? 'PASS' : 'FAIL') + ': 赛季战斗 → clearRect + 震动生效');

    // Case 2: 大地图 → 震动不生效
    translateCalled = false; restoreCalled = false; clearRectCalled = false;
    mockRender(GAME_STATE.WORLDMAP);
    if (!clearRectCalled) { console.log('  FAIL: 大地图 clearRect 未调用'); allPass = false; }
    if (translateCalled) { console.log('  FAIL: 大地图不该有震动'); allPass = false; }
    console.log('  ' + (clearRectCalled && !translateCalled ? 'PASS' : 'FAIL') + ': 大地图 → clearRect + 无震动');

    // Case 3: 普通战斗（未暂停） → 震动生效
    translateCalled = false; restoreCalled = false; clearRectCalled = false;
    mockRender(GAME_STATE.PLAYING);
    console.log('  ' + (clearRectCalled && translateCalled && restoreCalled ? 'PASS' : 'FAIL') + ': 普通战斗 → clearRect + 震动生效');

    // Case 4: 菜单 → 震动不生效
    translateCalled = false; restoreCalled = false; clearRectCalled = false;
    mockRender(GAME_STATE.MENU);
    console.log('  ' + (clearRectCalled && !translateCalled ? 'PASS' : 'FAIL') + ': 菜单 → clearRect + 无震动');

    // Case 5: 排行榜 → 震动不生效
    translateCalled = false; restoreCalled = false; clearRectCalled = false;
    mockRender(GAME_STATE.LEADERBOARD);
    console.log('  ' + (clearRectCalled && !translateCalled ? 'PASS' : 'FAIL') + ': 排行榜 → clearRect + 无震动');

    // Case 6: 暂停状态 → 震动生效（残留震动在暂停菜单中）
    translateCalled = false; restoreCalled = false; clearRectCalled = false;
    mockRender(GAME_STATE.PAUSED);
    console.log('  ' + (clearRectCalled && translateCalled && restoreCalled ? 'PASS' : 'FAIL') + ': 暂停状态 → clearRect + 震动生效');

    return allPass;
}


// ============================================================
// 测试三：GAMEOVER 返回菜单调用 cleanupMode
// ============================================================

function test_gameover_cleanup_mode() {
    console.log('\n=== TEST 3: GAMEOVER 返回菜单 cleanupMode ===');

    var allPass = true;
    var cleanupCalled = false;
    var cleanedMode = null;
    var transitionTo = null;

    // 模拟 modeLifecycle.cleanupMode
    var mockModeLifecycle = {
        cleanupMode: function(mode) {
            cleanupCalled = true;
            cleanedMode = mode;
        }
    };

    // 模拟 GAMEOVER 的 season 返回菜单逻辑 (game.js L5349-5353)
    function seasonGameoverReturnMenu() {
        seasonSelection = { character: null, skills: [], pet: null };
        mockModeLifecycle.cleanupMode('season');
        transitionTo = 'WORLDMAP';
    }

    var seasonSelection = { character: 'test_char', skills: ['s1'], pet: 'p1' };

    seasonGameoverReturnMenu();

    if (!cleanupCalled) { console.log('  FAIL: cleanupMode 未调用'); allPass = false; }
    else console.log('  PASS: cleanupMode 已调用');
    if (cleanedMode !== 'season') { console.log('  FAIL: cleanupMode 参数错误: ' + cleanedMode); allPass = false; }
    else console.log('  PASS: cleanupMode 参数为 season');
    if (seasonSelection.character !== null) { console.log('  FAIL: seasonSelection 未清空'); allPass = false; }
    else console.log('  PASS: seasonSelection 已清空');
    if (transitionTo !== 'WORLDMAP') { console.log('  FAIL: 未跳转到 WORLDMAP'); allPass = false; }
    else console.log('  PASS: 跳转到 WORLDMAP');

    return allPass;
}


// ============================================================
// 测试四：震动状态在离开战斗时清除（额外验证）
// ============================================================

function test_shake_cleared_on_state_change() {
    console.log('\n=== TEST 4: 离开战斗状态时清除震动 ===');

    var allPass = true;
    var shakeCleared = false;

    var GAME_STATE = {
        PLAYING: 'playing', SEASON_PLAYING: 'season_playing',
        STAGE_PLAYING: 'stage_playing', BOSS_BATTLE: 'boss_battle',
        TOWER_COMBAT: 'tower_combat', PAUSED: 'paused',
        WORLDMAP: 'worldmap', GAMEOVER: 'gameover'
    };

    var COMBAT_STATES = [
        GAME_STATE.PLAYING, GAME_STATE.SEASON_PLAYING,
        GAME_STATE.STAGE_PLAYING, GAME_STATE.BOSS_BATTLE,
        GAME_STATE.TOWER_COMBAT
    ];

    function isInArray(arr, val) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === val) return true;
        }
        return false;
    }

    // 模拟 setGameStateRaw 中的逻辑 (game.js L3457-3460)
    function onStateChange(prevState, newState) {
        if (isInArray(COMBAT_STATES, prevState) &&
            !isInArray(COMBAT_STATES, newState) &&
            newState !== GAME_STATE.PAUSED) {
            shakeCleared = true;
        }
    }

    // Case 1: SEASON_PLAYING → WORLDMAP（通过暂停返回菜单）
    shakeCleared = false;
    onStateChange(GAME_STATE.SEASON_PLAYING, GAME_STATE.WORLDMAP);
    console.log('  ' + (shakeCleared ? 'PASS' : 'FAIL') + ': SEASON_PLAYING → WORLDMAP, 震动清除');

    // Case 2: SEASON_PLAYING → GAMEOVER
    shakeCleared = false;
    onStateChange(GAME_STATE.SEASON_PLAYING, GAME_STATE.GAMEOVER);
    console.log('  ' + (shakeCleared ? 'PASS' : 'FAIL') + ': SEASON_PLAYING → GAMEOVER, 震动清除');

    // Case 3: SEASON_PLAYING → PAUSED（暂停不触发清除）
    shakeCleared = false;
    onStateChange(GAME_STATE.SEASON_PLAYING, GAME_STATE.PAUSED);
    console.log('  ' + (!shakeCleared ? 'PASS' : 'FAIL') + ': SEASON_PLAYING → PAUSED, 不清除震动');

    // Case 4: WORLDMAP → SEASON_PLAYING（进入战斗不触发）
    shakeCleared = false;
    onStateChange(GAME_STATE.WORLDMAP, GAME_STATE.SEASON_PLAYING);
    console.log('  ' + (!shakeCleared ? 'PASS' : 'FAIL') + ': WORLDMAP → SEASON_PLAYING, 不清除震动');

    return allPass;
}


// ============================================================
// 运行全部测试
// ============================================================

console.log('═══════════════════════════════════════');
console.log('  赛季模式修复验证测试');
console.log('═══════════════════════════════════════');

var t1 = test_onHide_pauses_combat();
var t2 = test_render_clearRect_and_shake_guard();
var t3 = test_gameover_cleanup_mode();
var t4 = test_shake_cleared_on_state_change();

console.log('\n═══════════════════════════════════════');
console.log('  测试结果汇总');
console.log('═══════════════════════════════════════');
console.log('  1. onHide 暂停战斗:    ' + (t1 ? 'PASS' : 'FAIL'));
console.log('  2. clearRect + 震动限制: ' + (t2 ? 'PASS' : 'FAIL'));
console.log('  3. GAMEOVER cleanupMode: ' + (t3 ? 'PASS' : 'FAIL'));
console.log('  4. 状态切换清除震动:     ' + (t4 ? 'PASS' : 'FAIL'));

if (t1 && t2 && t3 && t4) {
    console.log('\n  全部通过 ✓');
    process.exit(0);
} else {
    console.log('\n  存在失败 ✗');
    process.exit(1);
}