import Logger from '../utils/Logger.js';
/**
 * StageModeSystem - 闯关模式逻辑系统
 * 管理闯关模式的核心逻辑：初始化、战斗流程、星级判定、奖励发放
 * 渲染复用普通模式的 renderGame()，触摸复用普通模式的 handleTouchStart()
 * 怪物注入全局 monsters[]，星星使用全局 StarSystem
 */

function createStageModeSystem(deps) {
    // 基础依赖
    var getSTAGES = deps.getSTAGES;
    var getMonsterTypes = deps.getMonsterTypes;
    var getPlayerData = deps.getPlayerData;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getCharacterFullStats = deps.getCharacterFullStats;
    var addCharacterExperience = deps.addCharacterExperience;
    var saveData = deps.saveData;
    var setGameState = deps.setGameState;
    var getGameState = deps.getGameState;
    var GAME_STATE = deps.GAME_STATE;
    var getStageSelectScrollY = deps.getStageSelectScrollY;
    var getSelectedChapter = deps.getSelectedChapter;
    var getStageCriticalCount = deps.getStageCriticalCount;
    var getStagePerfectCount = deps.getStagePerfectCount;
    var getStageDamageTaken = deps.getStageDamageTaken;

    // 全局状态依赖
    var getMonsters = deps.getMonsters;
    var setMonsters = deps.setMonsters;
    var setStars = deps.setStars;
    var addNewStarFn = deps.addNewStar;
    var getCurrentStarInterval = deps.getCurrentStarInterval;
    var createMonsterFn = deps.createMonster;

    // 全局定时器依赖
    var clearTimerInterval = deps.clearTimerInterval;
    var setTimerInterval = deps.setTimerInterval;
    var clearMoveInterval = deps.clearMoveInterval;
    var setMoveInterval = deps.setMoveInterval;
    var clearMonsterAttackInterval = deps.clearMonsterAttackInterval;
    var setMonsterAttackInterval = deps.setMonsterAttackInterval;
    var monsterAttackPlayerFn = deps.monsterAttackPlayer;
    var startDodgeStarTimerFn = deps.startDodgeStarTimer;
    var stopDodgeStarTimerFn = deps.stopDodgeStarTimer;
    var startPetAttackTimerFn = deps.startPetAttackTimer;
    var stopPetAttackTimerFn = deps.stopPetAttackTimer;

    // 普通战斗适配器
    var getNormalBattleAdapter = deps.getNormalBattleAdapter;
    var resetComboFn = deps.resetCombo;
    var clearMessagesFn = deps.clearMessages;
    var clearAllAnimationsFn = deps.clearAllAnimations;
    var setTimeLeftFn = deps.setTimeLeft;

    // 内部状态
    var currentStage = null;
    var currentStageData = null;
    var score = 0;
    var timeLeft = 60;
    var monstersKilled = 0;
    var maxCombo = 0;
    var comboCount = 0;
    var isPaused = false;
    var lastComboTime = 0;
    var result = null;
    var rewardsObtained = { gold: 0, exp: 0, materials: {} };
    var currentMonsterType = null;

    /**
     * 初始化闯关
     */
    function init(stageId) {
        var STAGES = getSTAGES();
        var stage = STAGES[stageId];
        if (!stage) {
            Logger.info('关卡不存在:', stageId);
            return false;
        }

        // 重置全局状态
        setMonsters([]);
        setStars([]);
        if (resetComboFn) resetComboFn();
        if (clearMessagesFn) clearMessagesFn();
        if (clearAllAnimationsFn) clearAllAnimationsFn();

        // 清除所有全局定时器
        if (clearTimerInterval) clearTimerInterval();
        if (clearMoveInterval) clearMoveInterval();
        if (clearMonsterAttackInterval) clearMonsterAttackInterval();
        if (stopPetAttackTimerFn) stopPetAttackTimerFn();
        if (stopDodgeStarTimerFn) stopDodgeStarTimerFn();

        // 重置闯关状态
        currentStage = stageId;
        currentStageData = stage;
        score = 0;
        timeLeft = stage.settings.time;
        // 同步全局 timeLeft（供 NormalBattleAdapter.checkGameOver 使用）
        if (setTimeLeftFn) setTimeLeftFn(timeLeft);
        monstersKilled = 0;
        maxCombo = 0;
        comboCount = 0;
        isPaused = false;
        lastComboTime = 0;
        result = null;
        currentMonsterType = null;
        rewardsObtained = { gold: 0, exp: 0, materials: {} };

        // 重置玩家HP为满血（使用角色属性计算，与普通模式一致）
        var playerData = getPlayerData();
        var currentCharId = playerData.currentCharacterId;
        if (currentCharId) {
            var charStats = getCharacterFullStats(currentCharId);
            playerData.maxPlayerHp = charStats.hp;
        } else {
            playerData.maxPlayerHp = 100;
        }
        playerData.playerHp = playerData.maxPlayerHp;
        playerData.playerShield = 0;

        Logger.info('闯关模式初始化:', stage.name);
        return true;
    }

    /**
     * 开始闯关
     */
    function start() {
        setGameState(GAME_STATE.STAGE_PLAYING);

        // 生成第一个怪物
        spawnNextMonster();

        // 启动闯关计时器（使用全局 timerInterval）
        setTimerInterval(setInterval(function() {
            timeLeft--;
            if (setTimeLeftFn) setTimeLeftFn(timeLeft);
            if (timeLeft <= 0) {
                end(false);
            }
        }, 1000));

        // 启动星星生成（使用全局 moveInterval + StarSystem）
        var interval = getCurrentStarInterval ? getCurrentStarInterval() : 500;
        setMoveInterval(setInterval(function() {
            addNewStarFn();
        }, interval));

        // 启动闪避星星定时器
        if (startDodgeStarTimerFn) startDodgeStarTimerFn();

        // 启动怪物攻击（与普通模式一致）
        if (monsterAttackPlayerFn) {
            var attackInterval = 2000;  // 默认2秒
            // 使用当前怪物的攻击间隔
            var currentMonsters = getMonsters();
            if (currentMonsters.length > 0 && currentMonsters[0].attackInterval) {
                attackInterval = currentMonsters[0].attackInterval;
            }
            setMonsterAttackInterval(setInterval(function() {
                monsterAttackPlayerFn();
            }, attackInterval));
        }

        // 启动宠物攻击
        if (startPetAttackTimerFn) startPetAttackTimerFn();

        // 初始化普通战斗适配器
        if (getNormalBattleAdapter && getNormalBattleAdapter()) {
            getNormalBattleAdapter().init();
        }

        Logger.info('闯关开始！');
    }

    /**
     * 生成下一个怪物（使用 createMonster 创建完整格式怪物，注入全局 monsters[]）
     */
    function spawnNextMonster() {
        var settings = currentStageData.settings;
        if (!settings.monsterTypes || settings.monsterTypes.length === 0) return;

        var type = settings.monsterTypes[Math.floor(Math.random() * settings.monsterTypes.length)];
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var scale = getScreenScale();

        // 查询怪物类型配置获取正确属性
        var MonsterTypes = getMonsterTypes();
        var monsterType = MonsterTypes[type];
        var maxHp = monsterType ? monsterType.baseHp : 50;
        var attack = monsterType ? (monsterType.attack || 10) : 10;
        var attackInterval = monsterType ? (monsterType.attackInterval || 2000) : 2000;
        var skills = monsterType ? (monsterType.skills || []) : [];

        // 应用关卡血量倍率
        if (settings.hpMultiplier) {
            maxHp = Math.floor(maxHp * settings.hpMultiplier);
        }

        // 使用 MonsterSpawnSystem.createMonster 创建完整格式的怪物
        var m = createMonsterFn(type, sw / 2, sh / 3, {
            maxHp: maxHp,
            hp: maxHp,
            attack: attack,
            attackInterval: attackInterval,
            skills: skills,
            skillStates: {}
        });
        if (!m) {
            // 如果 createMonster 不可用，使用简单格式
            if (!monsterType) return;
            m = {
                id: Date.now(),
                active: true,
                x: sw / 2,
                y: sh / 3,
                size: Math.floor(80 * scale),
                hp: maxHp,
                maxHp: maxHp,
                type: type,
                scale: 1,
                animationFrame: 0,
                armor: 0,
                shield: 0,
                skills: skills,
                skillStates: {},
                hasRaged: false,
                absorbType: null,
                empowered: false,
                empowerType: null
            };
        }

        currentMonsterType = type;

        // 闯关模式同时只有一个怪物，清空后添加
        setMonsters([m]);

        Logger.info('生成怪物:', type, 'HP:', m.hp);
    }

    /**
     * 生成Boss
     */
    function spawnBoss(bossType) {
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var settings = currentStageData.settings;
        var scale = getScreenScale();

        // 查询Boss类型配置获取正确属性
        var MonsterTypes = getMonsterTypes();
        var monsterType = MonsterTypes[bossType];
        if (!monsterType) {
            Logger.info('Boss类型不存在:', bossType);
            end(true);
            return;
        }

        // Boss 血量 = 基础HP * 5 * 关卡倍率
        var bossMaxHp = monsterType.baseHp * 5;
        if (settings.hpMultiplier) {
            bossMaxHp = Math.floor(bossMaxHp * settings.hpMultiplier);
        }

        // 使用 createMonster 创建Boss，传入正确的属性
        var m = createMonsterFn(bossType, sw / 2, sh / 3, {
            maxHp: bossMaxHp,
            hp: bossMaxHp,
            attack: monsterType.attack || 10,
            attackInterval: monsterType.attackInterval || 2000,
            skills: monsterType.skills || [],
            skillStates: {}
        });
        if (!m) {
            m = {
                id: Date.now(),
                active: true,
                x: sw / 2,
                y: sh / 3,
                size: Math.floor(100 * scale),
                hp: bossMaxHp,
                maxHp: bossMaxHp,
                type: 'boss',
                scale: 1,
                animationFrame: 0,
                armor: 0,
                shield: 0,
                skills: monsterType.skills || [],
                skillStates: {},
                hasRaged: false,
                absorbType: null,
                empowered: false,
                empowerType: null
            };
        }

        m.type = 'boss';

        currentMonsterType = 'boss';

        // 闯关模式同时只有一个怪物，清空后添加
        setMonsters([m]);

        Logger.info('生成Boss:', bossType, 'HP:', m.hp);
    }

    /**
     * 怪物被击败（由 NormalBattleAdapter.killMonster 拦截调用）
     */
    function onMonsterDefeated(killedMonster) {
        monstersKilled++;

        var wasBoss = currentMonsterType === 'boss';
        var settings = currentStageData.settings;
        Logger.info('邪灵被净化! 净化数:', monstersKilled, '/', settings.monsterCount, 'wasBoss:', wasBoss);

        // 如果击败的是Boss，关卡完成
        if (wasBoss) {
            Logger.info('Boss被击败！关卡完成！');
            end(true);
            return;
        }

        // 检查是否需要生成守护灵（净化数达标且关卡有守护灵）
        if (settings.bossType && settings.monsterCount && monstersKilled >= settings.monsterCount) {
            Logger.info('普通怪物已全部击败，准备生成Boss:', settings.bossType);
            spawnBoss(settings.bossType);
            return;
        }

        // 没有守护灵的关卡，净化数达标后完成
        if (settings.monsterCount && monstersKilled >= settings.monsterCount && !settings.bossType) {
            Logger.info('没有Boss的关卡，直接完成');
            end(true);
            return;
        }

        // 生成下一个怪物
        spawnNextMonster();
    }

    /**
     * 结束闯关
     */
    function end(success) {
        // 清除所有全局定时器
        if (clearTimerInterval) clearTimerInterval();
        if (clearMoveInterval) clearMoveInterval();
        if (clearMonsterAttackInterval) clearMonsterAttackInterval();
        if (stopPetAttackTimerFn) stopPetAttackTimerFn();
        if (stopDodgeStarTimerFn) stopDodgeStarTimerFn();

        // 销毁普通战斗适配器
        if (getNormalBattleAdapter && getNormalBattleAdapter()) {
            getNormalBattleAdapter().destroy();
        }

        // 清理全局数组
        setMonsters([]);
        setStars([]);

        // 先设置 result 的 success，供 checkCondition 中的 boss 条件使用
        result = { success: success };

        // 计算星级
        var starCount = success ? calculateStars() : 0;
        result = {
            success: success,
            stars: starCount,
            score: score,
            time: timeLeft,
            monstersKilled: monstersKilled,
            maxCombo: maxCombo
        };

        // 保存关卡进度
        var playerData = getPlayerData();
        if (!playerData.stageProgress) {
            playerData.stageProgress = {};
        }
        var prevProgress = playerData.stageProgress[currentStage];
        var prevStars = prevProgress ? prevProgress.stars : 0;

        Logger.info('=== 奖励检查 ===');
        Logger.info('当前关卡:', currentStage);
        Logger.info('本次获得星级:', starCount);
        Logger.info('之前最高星级:', prevStars);

        // 记录实际获得的奖励
        rewardsObtained = { gold: 0, exp: 0, materials: {} };

        // 只在获得更高星级时发放差额奖励
        if (starCount > prevStars) {
            for (let s = prevStars + 1; s <= starCount; s++) {
                var reward = currentStageData.rewards[s];
                if (reward) {
                    if (s === 1 && reward.gold) {
                        playerData.gold += reward.gold;
                        rewardsObtained.gold += reward.gold;
                    }
                    if (s === 2 && reward.exp) {
                        var charId = playerData.currentCharacterId;
                        if (charId) {
                            addCharacterExperience(charId, reward.exp);
                            rewardsObtained.exp += reward.exp;
                        }
                    }
                    if (s === 3) {
                        if (reward.gold) {
                            playerData.gold += reward.gold;
                            rewardsObtained.gold += reward.gold;
                        }
                        if (reward.material) {
                            var matId = reward.material.id;
                            if (!playerData.materials[matId]) {
                                playerData.materials[matId] = { quantity: 0, usedCount: 0 };
                            }
                            playerData.materials[matId].quantity += reward.material.count;
                            if (!rewardsObtained.materials[matId]) {
                                rewardsObtained.materials[matId] = 0;
                            }
                            rewardsObtained.materials[matId] += reward.material.count;
                        }
                    }
                }
            }

            // 更新关卡进度
            playerData.stageProgress[currentStage] = {
                stars: starCount,
                bestScore: score,
                completed: true
            };
            saveData();
        }

        setGameState(GAME_STATE.STAGE_RESULT);
        Logger.info('闯关结束! 成功:', success, '星级:', starCount);
    }

    /**
     * 计算星级
     */
    function calculateStars() {
        var starCount = 0;
        var conditions = currentStageData.starConditions;
        for (let i = 0; i < conditions.length; i++) {
            if (checkCondition(conditions[i])) {
                starCount++;
            }
        }
        return starCount;
    }

    /**
     * 检查条件
     */
    function checkCondition(condition) {
        switch (condition.type) {
            case 'score': return score >= condition.target;
            case 'time': return timeLeft >= condition.target;
            case 'monster': return monstersKilled >= condition.target;
            case 'combo': return maxCombo >= condition.target;
            case 'boss': return result && result.success;
            case 'hp': return getPlayerHpPercent() >= condition.target;
            case 'noDamage': return (getStageDamageTaken ? getStageDamageTaken() : 0) === 0;
            case 'perfect': return (getStagePerfectCount ? getStagePerfectCount() : 0) >= condition.target;
            case 'critical': return (getStageCriticalCount ? getStageCriticalCount() : 0) >= condition.target;
            default: return false;
        }
    }

    /**
     * 获取玩家血量百分比
     */
    function getPlayerHpPercent() {
        var playerData = getPlayerData();
        if (!playerData) return 0;
        var maxHp = playerData.maxPlayerHp || 100;
        var currentHp = playerData.playerHp !== undefined ? playerData.playerHp : maxHp;
        if (maxHp <= 0) return 0;
        return Math.floor((currentHp / maxHp) * 100);
    }

    /**
     * 切换暂停
     */
    function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            // 与普通模式一致：切换到 PAUSED 状态
            setGameState(GAME_STATE.PAUSED);
            if (clearTimerInterval) clearTimerInterval();
            if (clearMoveInterval) clearMoveInterval();
            if (clearMonsterAttackInterval) clearMonsterAttackInterval();
            if (stopDodgeStarTimerFn) stopDodgeStarTimerFn();
            if (stopPetAttackTimerFn) stopPetAttackTimerFn();
        } else {
            resumeTimers();
        }
    }

    function resumeTimers() {
        // 恢复到闯关状态
        setGameState(GAME_STATE.STAGE_PLAYING);
        isPaused = false;
        // 恢复计时器
        setTimerInterval(setInterval(function() {
            timeLeft--;
            if (setTimeLeftFn) setTimeLeftFn(timeLeft);
            if (timeLeft <= 0) { end(false); }
        }, 1000));

        // 恢复星星生成
        var interval = getCurrentStarInterval ? getCurrentStarInterval() : 500;
        setMoveInterval(setInterval(function() {
            addNewStarFn();
        }, interval));

        // 恢复怪物攻击
        if (monsterAttackPlayerFn) {
            var currentMonsters = getMonsters();
            var attackInterval = 2000;
            if (currentMonsters.length > 0 && currentMonsters[0].attackInterval) {
                attackInterval = currentMonsters[0].attackInterval;
            }
            setMonsterAttackInterval(setInterval(function() {
                monsterAttackPlayerFn();
            }, attackInterval));
        }

        if (startDodgeStarTimerFn) startDodgeStarTimerFn();
        if (startPetAttackTimerFn) startPetAttackTimerFn();
    }

    /**
     * 增加分数（由 game.js 星星点击流程调用）
     */
    function addScore(amount) {
        score += amount;
    }

    /**
     * 更新最高连击（由 game.js 连击逻辑调用）
     */
    function updateMaxCombo(currentCombo) {
        if (currentCombo > maxCombo) {
            maxCombo = currentCombo;
        }
    }

    // ========== Getters ==========

    function getCurrentStage() { return currentStage; }
    function getCurrentStageData() { return currentStageData; }
    function getScore() { return score; }
    function getTimeLeft() { return timeLeft; }
    function getMonstersKilled() { return monstersKilled; }
    function getMaxCombo() { return maxCombo; }
    function getIsPaused() { return isPaused; }
    function getResult() { return result; }
    function getRewardsObtained() { return rewardsObtained; }

    /**
     * 重置连击计数
     */
    function resetCombo() {
        comboCount = 0;
    }

    /**
     * 检查关卡是否解锁
     */
    function isStageUnlocked(stageId) {
        var STAGES = getSTAGES();
        var stage = STAGES[stageId];
        if (!stage) return false;
        if (!stage.unlockCondition) return true;

        var prevStageId = stage.unlockCondition.stageId;
        var minStars = stage.unlockCondition.minStars || 1;

        var playerData = getPlayerData();
        var prevProgress = playerData.stageProgress && playerData.stageProgress[prevStageId];
        return prevProgress && prevProgress.stars >= minStars;
    }

    /**
     * 获取难度对应的颜色
     */
    function getDifficultyColor(difficulty) {
        switch (difficulty) {
            case 'easy': return '#4CAF50';
            case 'normal': return '#2196F3';
            case 'hard': return '#FF9800';
            case 'hell': return '#F44336';
            case 'nightmare': return '#9C27B0';
            default: return '#ffffff';
        }
    }

    /**
     * 开始闯关入口
     */
    function startStage(stageId) {
        if (!init(stageId)) {
            return;
        }
        start();
    }

    return {
        init: init,
        start: start,
        spawnNextMonster: spawnNextMonster,
        spawnBoss: spawnBoss,
        onMonsterDefeated: onMonsterDefeated,
        end: end,
        calculateStars: calculateStars,
        checkCondition: checkCondition,
        togglePause: togglePause,
        resumeTimers: resumeTimers,
        isStageUnlocked: isStageUnlocked,
        getDifficultyColor: getDifficultyColor,
        startStage: startStage,
        addScore: addScore,
        updateMaxCombo: updateMaxCombo,
        // Getters
        getCurrentStage: getCurrentStage,
        getCurrentStageData: getCurrentStageData,
        getScore: getScore,
        getTimeLeft: getTimeLeft,
        getMonstersKilled: getMonstersKilled,
        getMaxCombo: getMaxCombo,
        getIsPaused: getIsPaused,
        getResult: getResult,
        getRewardsObtained: getRewardsObtained,
        resetCombo: resetCombo
    };
}

export { createStageModeSystem };
