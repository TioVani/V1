/**
 * GameSimulator.js — 游戏模拟器主类
 * 在 Node.js 环境中加载完整 game.js，提供程序化控制接口
 */
var mockPlatform = require('./mock-platform.js');
var path = require('path');

function GameSimulator(opts) {
    opts = opts || {};
    this._screenWidth = opts.screenWidth || 375;
    this._screenHeight = opts.screenHeight || 667;
    this._game = null;     // game.js module.exports
    this._logs = [];       // 捕获的日志
    this._started = false;
}

// ============================================================
// 初始化
// ============================================================

/**
 * 加载游戏 — 安装 mock 环境，require game.js
 */
GameSimulator.prototype.init = function() {
    // 安装 mock
    mockPlatform.install();

    // 清除 require 缓存（支持多次 init）
    var gamePath = path.resolve(__dirname, '../../game.js');
    delete require.cache[gamePath];
    // 也清除 modules
    var modulesPath = path.resolve(__dirname, '../../dist/game-modules.js');
    delete require.cache[modulesPath];

    // 加载 game.js（自动触发 init()）
    this._game = require(gamePath);
    this._started = true;
    return this;
};

// ============================================================
// 输入模拟
// ============================================================

/**
 * 模拟一次点击（touchStart + touchEnd）
 */
GameSimulator.prototype.tap = function(x, y) {
    mockPlatform.fireTouch('touchStart', x, y);
    mockPlatform.fireTouch('touchEnd', x, y);
    return this;
};

/**
 * 模拟手指按下
 */
GameSimulator.prototype.touchStart = function(x, y) {
    mockPlatform.fireTouch('touchStart', x, y);
    return this;
};

/**
 * 模拟手指抬起
 */
GameSimulator.prototype.touchEnd = function(x, y) {
    mockPlatform.fireTouch('touchEnd', x, y);
    return this;
};

/**
 * 模拟手指移动
 */
GameSimulator.prototype.touchMove = function(x, y) {
    mockPlatform.fireTouch('touchMove', x, y);
    return this;
};

// ============================================================
// 渲染循环
// ============================================================

/**
 * 驱动 n 帧渲染循环
 */
GameSimulator.prototype.tick = function(n) {
    n = n || 1;
    mockPlatform.tickRAF(n);
    return this;
};

/**
 * 推进时间并驱动帧（等待 ms 毫秒的真实时间）
 */
GameSimulator.prototype.advanceTime = async function(ms) {
    var frames = Math.ceil(ms / 16.67); // ~60fps
    var batchSize = 4; // 约 4 帧 = ~67ms
    var batches = Math.ceil(frames / batchSize);
    for (var i = 0; i < batches; i++) {
        this.tick(Math.min(batchSize, frames - i * batchSize));
        await new Promise(function(r) { setTimeout(r, 16); });
    }
    return this;
};

// ============================================================
// 状态检查
// ============================================================

GameSimulator.prototype.getState = function() {
    return this._game.getState();
};

GameSimulator.prototype.getStars = function() {
    return this._game.getStars();
};

GameSimulator.prototype.getMonsters = function() {
    return this._game.getMonsters();
};

GameSimulator.prototype.getScore = function() {
    return this._game.getScore();
};

GameSimulator.prototype.getTimeLeft = function() {
    return this._game.getTimeLeft();
};

GameSimulator.prototype.getPlayerHp = function() {
    return this._game.getPlayerHp();
};

GameSimulator.prototype.getPlayerData = function() {
    return this._game.getPlayerData();
};

GameSimulator.prototype.getBestScore = function() {
    return this._game.getBestScore();
};

GameSimulator.prototype.getPauseStartTime = function() {
    return this._game.getPauseStartTime();
};

GameSimulator.prototype.getGAME_STATE = function() {
    return this._game.getGAME_STATE();
};

// ============================================================
// 系统访问
// ============================================================

GameSimulator.prototype.getNormalBattleAdapter = function() {
    return this._game.getNormalBattleAdapter();
};

GameSimulator.prototype.getBossBattleSystem = function() {
    return this._game.getBossBattleSystem();
};

GameSimulator.prototype.getBossBattleMode = function() {
    return this._game.getBossBattleMode();
};

GameSimulator.prototype.getStarSystem = function() {
    return this._game.getStarSystem();
};

GameSimulator.prototype.getComboSystem = function() {
    return this._game.getComboSystem();
};

GameSimulator.prototype.getBattleEngine = function() {
    return this._game.getBattleEngine();
};

GameSimulator.prototype.getGameStateMachine = function() {
    return this._game.getGameStateMachine();
};

GameSimulator.prototype.getUIConfig = function() {
    return this._game.getUIConfig ? this._game.getUIConfig() : null;
};

GameSimulator.prototype.getUIEditorSystem = function() {
    return this._game.getUIEditorSystem ? this._game.getUIEditorSystem() : null;
};

GameSimulator.prototype.getScreenScale = function() {
    return this._game.getScreenScale();
};

GameSimulator.prototype.getScreenWidth = function() {
    return this._game.getScreenWidth();
};

GameSimulator.prototype.getScreenHeight = function() {
    return this._game.getScreenHeight();
};

// ============================================================
// 游戏控制
// ============================================================

GameSimulator.prototype.startGame = function() {
    this._game.startGame();
    return this;
};

GameSimulator.prototype.endGame = function() {
    this._game.endGame();
    return this;
};

GameSimulator.prototype.pauseGame = function() {
    this._game.pauseGame();
    return this;
};

GameSimulator.prototype.resumeGame = function() {
    this._game.resumeGame();
    return this;
};

GameSimulator.prototype.startBoss = function(level) {
    var bbm = this.getBossBattleMode();
    if (bbm) {
        bbm.init(level || 1);
        bbm.start();
    }
    return this;
};

GameSimulator.prototype.bossTogglePause = function() {
    var bbs = this.getBossBattleSystem();
    if (bbs) bbs.togglePause();
    return this;
};

/**
 * 设置玩家数据（必须在 init 后、startGame 前调用）
 */
GameSimulator.prototype.setupPlayer = function(opts) {
    var pd = this.getPlayerData();
    if (!pd) return this;
    if (opts.characterId) pd.currentCharacterId = opts.characterId;
    if (opts.hp) { pd.playerHp = opts.hp; pd.maxPlayerHp = opts.hp; }
    if (opts.gold) pd.gold = opts.gold;
    if (opts.starSource) pd.starSource = opts.starSource;
    return this;
};

// ============================================================
// 塔模式控制
// ============================================================

GameSimulator.prototype.getTowerSystem = function() {
    return this._game.getTowerSystem();
};

/**
 * 开始塔模式（初始化 + 切换状态）
 */
GameSimulator.prototype.startTower = function() {
    var ts = this.getTowerSystem();
    var sm = this.getGameStateMachine();
    var GS = this.getGAME_STATE();
    if (ts) ts.init();
    if (sm) sm.transitionTo(GS.TOWER);
    return this;
};

/**
 * 移动塔模式玩家
 */
GameSimulator.prototype.towerMovePlayer = function(dx, dy) {
    var ts = this.getTowerSystem();
    if (ts) ts.movePlayer(dx, dy);
    return this;
};

/**
 * 暂停塔战斗
 */
GameSimulator.prototype.towerPauseCombat = function() {
    var ts = this.getTowerSystem();
    if (ts) ts.pauseCombat();
    return this;
};

/**
 * 恢复塔战斗
 */
GameSimulator.prototype.towerResumeCombat = function() {
    var ts = this.getTowerSystem();
    if (ts) ts.resumeCombat();
    return this;
};

/**
 * 放弃塔（获取已有奖励）
 */
GameSimulator.prototype.towerGiveUp = function() {
    var ts = this.getTowerSystem();
    if (ts) ts.giveUp();
    return this;
};

/**
 * 重新开始塔
 */
GameSimulator.prototype.towerRestart = function() {
    var ts = this.getTowerSystem();
    if (ts) ts.restartTower();
    return this;
};

/**
 * 塔模式状态快照
 */
GameSimulator.prototype.towerSnapshot = function() {
    var ts = this.getTowerSystem();
    if (!ts) return null;
    var grid = ts.grid;
    var rows = grid ? grid.length : 0;
    var cells = [];
    var px = ts.playerX;
    var py = ts.playerY;
    var range = 5;
    if (grid) {
        for (var y = Math.max(0, py - range); y <= Math.min(rows - 1, py + range); y++) {
            for (var x = Math.max(0, px - range); x <= Math.min((grid[y] || []).length - 1, px + range); x++) {
                var cell = grid[y][x];
                if (!cell) continue;
                cells.push({
                    x: x, y: y,
                    type: cell.type,
                    explored: cell.explored,
                    hasMonster: !!(cell.monster || cell.occupiedBy),
                    hasReward: !!(cell.reward),
                    isPlayer: (x === px && y === py)
                });
            }
        }
    }
    return {
        floor: ts.currentFloor,
        playerX: px,
        playerY: py,
        playerHp: ts.playerHp,
        playerMaxHp: ts.playerMaxHp,
        playerShield: ts.playerShield,
        inCombat: ts.inCombat,
        isHiddenPathBoss: ts.isHiddenPathBoss,
        combatMonster: ts.combatMonster ? {
            name: ts.combatMonster.name,
            hp: ts.combatMonster.hp,
            attack: ts.combatMonster.attack
        } : null,
        combatTime: ts.combatTime,
        blindSteps: ts.blindSteps,
        gridSize: rows,
        nearbyCells: cells
    };
};

// ============================================================
// 调试工具
// ============================================================

/**
 * 找到 (x, y) 位置的星星
 */
GameSimulator.prototype.findStarAt = function(x, y, radius) {
    var stars = this.getStars();
    radius = radius || 30;
    for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        if (!s.visible) continue;
        var dx = x - s.x;
        var dy = y - s.y;
        if (dx * dx + dy * dy < radius * radius) {
            return { star: s, index: i };
        }
    }
    return null;
};

/**
 * 找到第一颗可见星星
 */
GameSimulator.prototype.findFirstStar = function() {
    var stars = this.getStars();
    for (var i = 0; i < stars.length; i++) {
        if (stars[i].visible) return { star: stars[i], index: i };
    }
    return null;
};

/**
 * 完整状态快照
 */
GameSimulator.prototype.snapshot = function() {
    var stars = this.getStars();
    var monsters = this.getMonsters();
    var visibleStars = [];
    for (var i = 0; i < stars.length; i++) {
        if (stars[i].visible) {
            visibleStars.push({
                x: stars[i].x,
                y: stars[i].y,
                type: stars[i].type,
                size: stars[i].size
            });
        }
    }
    var aliveMonsters = [];
    for (var j = 0; j < monsters.length; j++) {
        if (monsters[j].hp > 0 && monsters[j].active) {
            aliveMonsters.push({
                name: monsters[j].name,
                hp: monsters[j].hp,
                x: monsters[j].x,
                y: monsters[j].y
            });
        }
    }
    return {
        state: this.getState(),
        score: this.getScore(),
        timeLeft: this.getTimeLeft(),
        playerHp: this.getPlayerHp(),
        starsTotal: stars.length,
        starsVisible: visibleStars.length,
        stars: visibleStars,
        monstersTotal: monsters.length,
        monstersAlive: aliveMonsters.length,
        monsters: aliveMonsters,
        pauseStartTime: this.getPauseStartTime()
    };
};

/**
 * 获取捕获的日志
 */
GameSimulator.prototype.getLogs = function() {
    return mockPlatform.getLogs();
};

/**
 * 清空日志
 */
GameSimulator.prototype.clearLogs = function() {
    mockPlatform.clearLogs();
    return this;
};

/**
 * 过滤日志（按关键字）
 */
GameSimulator.prototype.filterLogs = function(keyword) {
    var logs = mockPlatform.getLogs();
    return logs.filter(function(l) {
        return l.msg.indexOf(keyword) !== -1;
    });
};

/**
 * 打印最近的日志（调试用）
 */
GameSimulator.prototype.printLogs = function(lastN) {
    var logs = mockPlatform.getLogs();
    var start = lastN ? Math.max(0, logs.length - lastN) : 0;
    for (var i = start; i < logs.length; i++) {
        console.log('[' + logs[i].level + '] ' + logs[i].msg);
    }
    return this;
};

// ============================================================
// 截图 / 绘制命令捕获
// ============================================================

/**
 * 开启绘制命令捕获
 */
GameSimulator.prototype.startCapture = function() {
    mockPlatform.setCaptureMode(true);
    mockPlatform.clearDrawCommands();
    return this;
};

/**
 * 关闭绘制命令捕获
 */
GameSimulator.prototype.stopCapture = function() {
    mockPlatform.setCaptureMode(false);
    return this;
};

/**
 * 获取本帧绘制命令（原始数组）
 */
GameSimulator.prototype.getDrawCommands = function() {
    return mockPlatform.getDrawCommands();
};

/**
 * 获取绘制摘要（结构化：文字/形状/图像）
 */
GameSimulator.prototype.captureFrame = function() {
    return mockPlatform.getDrawSummary();
};

/**
 * 截取一帧并输出文字内容
 */
GameSimulator.prototype.captureTexts = function() {
    var summary = mockPlatform.getDrawSummary();
    var lines = [];
    for (var i = 0; i < summary.texts.length; i++) {
        var t = summary.texts[i];
        lines.push('y=' + Math.round(t.y) + ' x=' + Math.round(t.x) + ' [' + (t.color || '') + '] ' + t.text);
    }
    return lines;
};

/**
 * 清空绘制命令
 */
GameSimulator.prototype.clearCapture = function() {
    mockPlatform.clearDrawCommands();
    return this;
};

// ============================================================
// 辅助
// ============================================================

/**
 * 等待条件为真
 */
GameSimulator.prototype.waitFor = function(conditionFn, timeoutMs, checkIntervalMs) {
    var self = this;
    timeoutMs = timeoutMs || 5000;
    checkIntervalMs = checkIntervalMs || 50;
    return new Promise(function(resolve, reject) {
        var start = Date.now();
        function check() {
            self.tick(3);
            if (conditionFn()) {
                resolve(true);
                return;
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('waitFor timeout after ' + timeoutMs + 'ms'));
                return;
            }
            setTimeout(check, checkIntervalMs);
        }
        check();
    });
};

module.exports = GameSimulator;