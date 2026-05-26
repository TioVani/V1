import Logger from '../utils/Logger.js';
/**
 * GameLifecycleSystem - 游戏生命周期系统
 * 管理游戏的开始、暂停、恢复、结束、重启，以及赛季游戏的开始和结束
 */

function createGameLifecycleSystem(deps) {
    // 核心依赖
    var getSaveData = deps.getSaveData;
    var setGameState = deps.setGameState;
    var getGameState = deps.getGameState;
    var GAME_STATE = deps.GAME_STATE;
    var getScore = deps.getScore;
    var setScore = deps.setScore;
    var getTimeLeft = deps.getTimeLeft;
    var setTimeLeft = deps.setTimeLeft;
    var getNormalGameTime = deps.getNormalGameTime;
    var getBestScore = deps.getBestScore;
    var saveData = deps.saveData;
    var saveDataImmediate = deps.saveDataImmediate;
    var saveBestScore = deps.saveBestScore;

    // 普通战斗适配器
    var getNormalBattleAdapter = deps.getNormalBattleAdapter;

    // 定时器管理
    var clearTimerInterval = deps.clearTimerInterval;
    var clearMoveInterval = deps.clearMoveInterval;
    var clearMonsterAttackInterval = deps.clearMonsterAttackInterval;
    var setTimerInterval = deps.setTimerInterval;
    var setMoveInterval = deps.setMoveInterval;
    var setMonsterAttackInterval = deps.setMonsterAttackInterval;

    // 星星和怪物
    var getStars = deps.getStars;
    var setStars = deps.setStars;
    var getMonsters = deps.getMonsters;
    var setMonsters = deps.setMonsters;
    var addNewStar = deps.addNewStar;
    var resetStar = deps.resetStar;
    var spawnMonster = deps.spawnMonster;
    var monsterAttackPlayer = deps.monsterAttackPlayer;

    // 星星模式配置
    var getStarMode = deps.getStarMode;
    var getSTAR_MODE = deps.getSTAR_MODE;
    var getFallingConfig = deps.getFallingConfig;
    var getCurrentStarInterval = deps.getCurrentStarInterval;
    var getBaseStarInterval = deps.getBaseStarInterval;
    var setCurrentStarInterval = deps.setCurrentStarInterval;

    // 系统重置
    var clearMessages = deps.clearMessages;
    var resetCombo = deps.resetCombo;
    var clearAllAnimations = deps.clearAllAnimations;
    var resetBossStarMechanic = deps.resetBossStarMechanic;
    var stopPetAttackTimer = deps.stopPetAttackTimer;
    var startPetAttackTimer = deps.startPetAttackTimer;
    var startDodgeStarTimer = deps.startDodgeStarTimer;
    var stopDodgeStarTimer = deps.stopDodgeStarTimer;

    // 角色
    var getCharacterFullStats = deps.getCharacterFullStats;
    var getCharacterStatsAtLevel = deps.getCharacterStatsAtLevel;
    var getMAX_CHARACTER_LEVEL = deps.getMAX_CHARACTER_LEVEL;
    var getSkillSystem = deps.getSkillSystem;

    // 增益
    var getActiveBuffs = deps.getActiveBuffs;

    // 道具
    var getGameItems = deps.getGameItems;
    var getAdItems = deps.getAdItems;
    var getMAX_GAME_ITEMS = deps.getMAX_GAME_ITEMS;

    // 分裂
    var getMonsterSplitCount = deps.getMonsterSplitCount;
    var setMonsterSplitCount = deps.setMonsterSplitCount;
    var getMonsterSplitType = deps.getMonsterSplitType;
    var setMonsterSplitType = deps.setMonsterSplitType;

    // 毒素
    var getPlayerPoisoned = deps.getPlayerPoisoned;
    var setPlayerPoisoned = deps.setPlayerPoisoned;
    var getPlayerPoisonDamage = deps.getPlayerPoisonDamage;
    var setPlayerPoisonDamage = deps.setPlayerPoisonDamage;

    // 怒气/贪婪
    var getGreedyHpPool = deps.getGreedyHpPool;
    var setGreedyHpPool = deps.setGreedyHpPool;
    var getGreedySkillUnlocked = deps.getGreedySkillUnlocked;
    var setGreedySkillUnlocked = deps.setGreedySkillUnlocked;

    // 连击星星
    var getComboStarActive = deps.getComboStarActive;
    var setComboStarActive = deps.setComboStarActive;
    var getComboStarStartTime = deps.getComboStarStartTime;
    var setComboStarStartTime = deps.setComboStarStartTime;
    var getComboStarLastAttackTime = deps.getComboStarLastAttackTime;
    var setComboStarLastAttackTime = deps.setComboStarLastAttackTime;
    var getComboStarLastRemainingTime = deps.getComboStarLastRemainingTime;
    var setComboStarLastRemainingTime = deps.setComboStarLastRemainingTime;
    var getComboStarTimer = deps.getComboStarTimer;
    var setComboStarTimer = deps.setComboStarTimer;

    // 标记
    var getStarDevourerEscaped = deps.getStarDevourerEscaped;
    var setStarDevourerEscaped = deps.setStarDevourerEscaped;
    var getVoidEmperorSpawned = deps.getVoidEmperorSpawned;
    var setVoidEmperorSpawned = deps.setVoidEmperorSpawned;

    // 连击
    var getComboCount = deps.getComboCount;
    var setLastComboTime = deps.setLastComboTime;

    // 配置
    var getCONFIG = deps.getCONFIG;

    // 赛季
    var getSeasonScore = deps.getSeasonScore;
    var setSeasonScore = deps.setSeasonScore;
    var getSeasonBestScore = deps.getSeasonBestScore;
    var setSeasonBestScore = deps.setSeasonBestScore;
    var getSeasonSelection = deps.getSeasonSelection;
    var getSeasonLeaderboard = deps.getSeasonLeaderboard;
    var setSeasonLeaderboard = deps.setSeasonLeaderboard;

    // 偷星者
    var getStarThief = deps.getStarThief;

    // 云存储上传
    var uploadLeaderboardData = deps.uploadLeaderboardData;
    var uploadSeasonScore = deps.uploadSeasonScore;

    // 任务
    var updateTaskProgress = deps.updateTaskProgress;
    var updateTaskStats = deps.updateTaskStats;

    // 闯关
    var stageModeEnd = deps.stageModeEnd;
    var resumeStageTimers = deps.resumeStageTimers;

    // 游戏结束时间
    var getGameEndTime = deps.getGameEndTime;
    var setGameEndTime = deps.setGameEndTime;

    // 教学
    var getIsTutorialBattle = deps.getIsTutorialBattle || null;
    var onTutorialFailFn = deps.onTutorialFail || null;

    /**
     * 开始游戏
     */
    function startGame() {
        Logger.info('踏入灵域');
        var pd = getSaveData();
        var activeBuffs = getActiveBuffs();
        var CONFIG = getCONFIG();
        var bestScore = getBestScore();

        setScore(0);
        setTimeLeft(getNormalGameTime() + activeBuffs.timeBonus);
        setGameState(GAME_STATE.PLAYING);

        // 清除赛季模式数据，防止结算时被误判
        if (pd.seasonData && pd.seasonData.selection) {
            pd.seasonData.selection = null;
        }

        // 清空
        setStars([]);
        setMonsters([]);
        clearMessages();

        // 重置分裂状态
        setMonsterSplitCount(0);
        setMonsterSplitType(null);

        // 重置Boss累积计数
        pd.bossKillCount = 0;

        // 重置当局击杀计数
        if (deps.setMonstersKilled) deps.setMonstersKilled(0);

        // 重置毒素
        setPlayerPoisoned(false);
        setPlayerPoisonDamage(0);

        // 重置连击
        resetCombo();

        // 重置怒气
        pd.playerRage = 0;
        pd.tempAttackBonus = 0;

        // 重置贪婪
        setGreedyHpPool(0);
        setGreedySkillUnlocked(false);

        // 重置连击星星
        setComboStarActive(false);
        setComboStarStartTime(0);
        setComboStarLastAttackTime(0);
        setComboStarLastRemainingTime(0);
        var csTimer = getComboStarTimer();
        if (csTimer) {
            clearInterval(csTimer);
            setComboStarTimer(null);
        }

        // 重置标记
        setStarDevourerEscaped(false);
        setVoidEmperorSpawned(false);

        // 重置Boss星星
        resetBossStarMechanic();

        // 重置偷星者状态
        var starThiefInit = getStarThief();
        if (starThiefInit && starThiefInit.resetState) starThiefInit.resetState();

        // 清空动画
        clearAllAnimations();

        // 清空毒液滩
        if (deps.clearPoisonPuddles) deps.clearPoisonPuddles();

        // 重置玩家血量
        var currentCharId = pd.currentCharacterId;
        if (currentCharId) {
            var charStats = getCharacterFullStats(currentCharId);
            pd.maxPlayerHp = charStats.hp + activeBuffs.hpBonus;
        } else {
            pd.maxPlayerHp = 100 + activeBuffs.hpBonus;
        }
        pd.playerHp = pd.maxPlayerHp;
        pd.playerShield = 0;

        // 初始化道具
        var gameItems = getGameItems();
        var MAX_GAME_ITEMS = getMAX_GAME_ITEMS();
        gameItems.healPotion = Math.min(
            pd.items && pd.items.healPotion ? pd.items.healPotion.quantity : 0,
            MAX_GAME_ITEMS
        );
        gameItems.timePotion = Math.min(
            pd.items && pd.items.timePotion ? pd.items.timePotion.quantity : 0,
            MAX_GAME_ITEMS
        );

        var adItems = getAdItems();
        adItems.healPotion = 0;
        adItems.timePotion = 0;

        // 技能冷却
        var skillSys = getSkillSystem();
        if (skillSys) skillSys.resetSystem();

        Logger.info('游戏开始，HP:', pd.playerHp, '/', pd.maxPlayerHp);

        // 清除旧定时器
        clearTimerInterval();
        clearMoveInterval();
        clearMonsterAttackInterval();
        stopPetAttackTimer();

        // 启动倒计时
        setTimerInterval(setInterval(function() {
            var tl = getTimeLeft() - 1;
            setTimeLeft(tl);
            if (tl <= 10) {
                var starThief = getStarThief();
                if (!starThief || !starThief.isActive()) {
                    addNewStar();
                }
            }
            if (tl <= 0) {
                if (getIsTutorialBattle && getIsTutorialBattle()) {
                    if (onTutorialFailFn) onTutorialFailFn();
                } else {
                    endGame();
                }
            }
        }, 1000));

        // 启动星星生成
        var STAR_MODE = getSTAR_MODE();
        var FALLING_CONFIG = getFallingConfig();
        var starSpawnInterval = getStarMode() === STAR_MODE.FALLING
            ? FALLING_CONFIG.spawnInterval
            : getCurrentStarInterval();
        setMoveInterval(setInterval(function() {
            addNewStar();
        }, starSpawnInterval));

        startDodgeStarTimer();

        // 怪物攻击
        setMonsterAttackInterval(setInterval(function() {
            monsterAttackPlayer();
        }, 2000));

        startPetAttackTimer();

        // 高分玩家直接生成怪物（教学战斗跳过，由教程流程自行生怪）
        // [DEBUG] 临时注释：开局无条件生怪
        if (!(getIsTutorialBattle && getIsTutorialBattle())) {
            spawnMonster('slime');
            Logger.info('游戏开始时直接生成怪物（条件已注释）');
        }

        // 初始化普通战斗适配器
        if (getNormalBattleAdapter && getNormalBattleAdapter()) {
            getNormalBattleAdapter().init();
        }
    }

    /**
     * 开始赛季游戏
     */
    function startSeasonGame() {
        Logger.info('开始赛季游戏');
        var pd = getSaveData();

        setSeasonScore(0);
        setTimeLeft(60);
        setGameState(GAME_STATE.SEASON_PLAYING);

        setStars([]);
        setMonsters([]);
        setMonsterSplitCount(0);
        setMonsterSplitType(null);
        pd.bossKillCount = 0;
        setStarDevourerEscaped(false);
        setVoidEmperorSpawned(false);
        setPlayerPoisoned(false);
        setPlayerPoisonDamage(0);
        resetCombo();
        clearAllAnimations();

        // 赛季模式：使用赛季选择的角色满级属性
        var seasonSelection = getSeasonSelection();
        var charKey = seasonSelection.character;
        if (charKey) {
            var maxLevelStats = getCharacterStatsAtLevel(charKey, getMAX_CHARACTER_LEVEL());
            pd.maxPlayerHp = maxLevelStats.hp;
            pd.playerHp = maxLevelStats.hp;
        } else {
            pd.maxPlayerHp = 100;
            pd.playerHp = 100;
        }
        pd.playerShield = 0;

        if (!pd.seasonData) {
            pd.seasonData = {};
        }
        pd.seasonData.selection = seasonSelection;
        saveData();

        Logger.info('赛季游戏开始，HP:', pd.playerHp);

        clearTimerInterval();
        clearMoveInterval();
        clearMonsterAttackInterval();
        if (stopPetAttackTimer) stopPetAttackTimer();

        setTimerInterval(setInterval(function() {
            var tl = getTimeLeft() - 1;
            setTimeLeft(tl);
            if (tl <= 10) {
                var starThief = getStarThief();
                if (!starThief || !starThief.isActive()) {
                    addNewStar();
                }
            }
            if (tl <= 0) {
                endSeasonGame();
            }
        }, 1000));

        setMoveInterval(setInterval(function() {
            addNewStar();
        }, getBaseStarInterval()));

        setMonsterAttackInterval(setInterval(function() {
            monsterAttackPlayer();
        }, 2000));

        // 初始化普通战斗适配器
        if (getNormalBattleAdapter && getNormalBattleAdapter()) {
            getNormalBattleAdapter().init();
        }
    }

    /**
     * 结束赛季游戏
     */
    function endSeasonGame() {
        var seasonScore = getSeasonScore();
        Logger.info('赛季游戏结束，分数:', seasonScore);
        setGameState(GAME_STATE.GAMEOVER);
        setGameEndTime(Date.now());

        clearTimerInterval();
        clearMoveInterval();
        clearMonsterAttackInterval();
        if (stopPetAttackTimer) stopPetAttackTimer();

        if (getNormalBattleAdapter && getNormalBattleAdapter()) {
            getNormalBattleAdapter().destroy();
        }

        // 始终上传赛季分到云存储
        if (uploadSeasonScore) uploadSeasonScore(seasonScore);

        if (seasonScore > getSeasonBestScore()) {
            setSeasonBestScore(seasonScore);
            Logger.info('新赛季最高分:', seasonScore);

            var seasonLeaderboard = getSeasonLeaderboard();
            var playerInLeaderboard = null;
            for (let idx = 0; idx < seasonLeaderboard.length; idx++) {
                if (seasonLeaderboard[idx].name === '我') {
                    playerInLeaderboard = seasonLeaderboard[idx];
                    break;
                }
            }
            if (playerInLeaderboard) {
                playerInLeaderboard.score = seasonScore;
            } else {
                seasonLeaderboard.push({
                    rank: 0,
                    name: '我',
                    score: seasonScore,
                    avatar: '🎮',
                    selection: getSeasonSelection()
                });
            }

            seasonLeaderboard.sort(function(a, b) { return b.score - a.score; });
            for (let j = 0; j < seasonLeaderboard.length; j++) {
                seasonLeaderboard[j].rank = j + 1;
            }
            seasonLeaderboard = seasonLeaderboard.slice(0, 20);
            setSeasonLeaderboard(seasonLeaderboard);

            var pd = getSaveData();
            if (pd.seasonData) {
                pd.seasonData.bestScore = getSeasonBestScore();
                pd.seasonData.leaderboard = seasonLeaderboard;
                saveData();
            }
        }
    }

    /**
     * 恢复普通模式定时器 — 仅重建 setInterval，由 ModeTimers subscriber 的 onResume 调用
     */
    function resumeNormalTimers() {
        Logger.info('普通模式定时器重建');
        setGameState(GAME_STATE.PLAYING);

        if (getComboCount() > 0) {
            setLastComboTime(Date.now());
        }

        setTimerInterval(setInterval(function() {
            var tl = getTimeLeft() - 1;
            setTimeLeft(tl);
            if (tl <= 10) {
                resetStar();
            }
            if (tl <= 0) {
                if (getIsTutorialBattle && getIsTutorialBattle()) {
                    if (onTutorialFailFn) onTutorialFailFn();
                } else {
                    endGame();
                }
            }
        }, 1000));

        setMoveInterval(setInterval(function() {
            addNewStar();
        }, getCurrentStarInterval()));

        setMonsterAttackInterval(setInterval(function() {
            monsterAttackPlayer();
        }, 2000));
    }
    function restartGame() {
        clearTimerInterval();
        clearMoveInterval();

        // 重置偷星者状态
        var starThiefRestart = getStarThief();
        if (starThiefRestart && starThiefRestart.resetState) starThiefRestart.resetState();

        setTimerInterval(setInterval(function() {
            var tl = getTimeLeft() - 1;
            setTimeLeft(tl);
            if (tl <= 10) {
                resetStar();
            }
            if (tl <= 0) {
                endGame();
            }
        }, 1000));

        setMoveInterval(setInterval(function() {
            resetStar();
        }, getCurrentStarInterval()));
    }

    /**
     * 结束游戏
     */
    function endGame() {
        var state = getGameState();

        // 赛季模式走赛季结束流程
        if (state === GAME_STATE.SEASON_PLAYING) {
            endSeasonGame();
            return;
        }

        if (state === GAME_STATE.STAGE_PLAYING) {
            stageModeEnd(false);
            return;
        }

        var score = getScore();
        Logger.info('游戏结束，最终得分:', score);

        setGameState(GAME_STATE.GAMEOVER);
        setGameEndTime(Date.now());

        clearTimerInterval();
        clearMoveInterval();
        clearMonsterAttackInterval();
        stopPetAttackTimer();

        // 销毁普通战斗适配器
        if (getNormalBattleAdapter && getNormalBattleAdapter()) {
            getNormalBattleAdapter().destroy();
        }

        var starThief = getStarThief();
        if (starThief && starThief.resetState) starThief.resetState();

        saveBestScore();

        // 上传排行榜数据到云存储
        if (uploadLeaderboardData) uploadLeaderboardData();

        updateTaskProgress('play_games', 1);
        updateTaskProgress('total_games', 1);
        updateTaskStats('totalGames', 1);
        updateTaskProgress('score', score, false);
        updateTaskStats('totalScore', score, false);

        // 扣除已用道具
        var pd = getSaveData();
        var gameItems = getGameItems();
        var MAX_GAME_ITEMS = getMAX_GAME_ITEMS();
        var initialHeal = Math.min(
            pd.items && pd.items.healPotion ? pd.items.healPotion.quantity : 0,
            MAX_GAME_ITEMS
        );
        var initialTime = Math.min(
            pd.items && pd.items.timePotion ? pd.items.timePotion.quantity : 0,
            MAX_GAME_ITEMS
        );
        var usedHeal = initialHeal - gameItems.healPotion;
        var usedTime = initialTime - gameItems.timePotion;
        if (usedHeal > 0 && pd.items && pd.items.healPotion) {
            pd.items.healPotion.quantity -= usedHeal;
        }
        if (usedTime > 0 && pd.items && pd.items.timePotion) {
            pd.items.timePotion.quantity -= usedTime;
        }

        saveDataImmediate();
    }

    return {
        startGame: startGame,
        startSeasonGame: startSeasonGame,
        endSeasonGame: endSeasonGame,
        resumeNormalTimers: resumeNormalTimers,
        restartGame: restartGame,
        endGame: endGame
    };
}

export { createGameLifecycleSystem };
