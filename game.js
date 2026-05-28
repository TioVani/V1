// 器落山河 - Canvas 2D 游戏
// 包含：游戏循环、数据持久化、广告（移除音效以保证兼容性）

// 调试日志开关 - 生产环境自动关闭
const _isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
const _log = _isDev ? console.log.bind(console) : function() {};
const _warn = _isDev ? console.warn.bind(console) : function() {};

// 游戏状态
const GAME_STATE = {
    TITLE: 'title',
    LOADING: 'loading',
    CUTSCENE: 'cutscene',
    WORLDMAP: 'worldmap',
    TUTORIAL: 'tutorial',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover',
    LEADERBOARD: 'leaderboard',
    BACKPACK: 'backpack',
    SHOP: 'shop',
    SETTINGS: 'settings',   // 设置界面
    TASKS: 'tasks',         // 任务界面
    SEASON_MENU: 'season_menu',     // 赛季模式入口
    SEASON_SELECT: 'season_select', // 赛季选择界面
    SEASON_PLAYING: 'season_playing', // 赛季游戏进行中
    STAGE_SELECT: 'stage_select',   // 闯关选择界面
    STAGE_PLAYING: 'stage_playing', // 闯关游戏进行中
    STAGE_RESULT: 'stage_result',   // 闯关结算界面
    SQUAD: 'squad',          // 编队系统界面
    FAITH: 'faith',          // 信仰系统界面
    TOWER: 'tower',          // 无尽之塔界面
    TOWER_COMBAT: 'tower_combat', // 爬塔战斗界面
    TOWER_RESULT: 'tower_result', // 爬塔结算界面
    TOWER_RESUME: 'tower_resume', // 爬塔继续/放弃选择界面
    NOSTALGIC: 'nostalgic',  // 怀旧副本界面
    BOSS_BATTLE: 'boss_battle', // Boss战模式
    BOSS_SELECT: 'boss_select',  // Boss选择界面
    BOSS_BATTLE_RESULT: 'boss_battle_result', // Boss战结算界面
    GACHA_ANIMATION: 'gacha_animation', // 抽卡动画界面
    DEBUG: 'debug',  // 调试面板
    FUSION: 'fusion',  // 融合系统界面
    UPGRADE: 'upgrade', // 升级系统界面
    CUTSCENE_DIALOGUE: 'cutscene_dialogue' // 对话剧情状态（全屏文字对话）
};

// 游戏变量
let canvas = null;
let ctx = null;
let state = GAME_STATE.TITLE;
let previousState = GAME_STATE.TITLE;  // 记录上一个状态，用于背包返回
let score = 0;
let timeLeft = 60;
let godMode = false;
let timerInterval = null;
let moveInterval = null;
let renderInterval = null;
let _rafId = null;
let monsterAttackInterval = null;
let bestScore = 0;
let monstersKilled = 0;  // 击杀怪物计数
let currentMonster = null;  // 当前怪物
let gameEndTime = 0;  // 游戏结束时间戳，用于冷却期保护
let pauseStartTime = 0;  // 暂停开始时间，用于调整灵韵消失时间


// 防抖保存机制（避免频繁保存导致卡顿）
let touchStartState = null;  // 触摸开始时的游戏状态


// 玩家被打断状态（Boss技能）

// 玩家中毒状态

// 玩家闪避状态（闪避灵韵）

// 调试面板
let debugPanelOpen = false;          // 调试面板是否打开
var devBattleSystem = null;            // 开发者战斗调参工具


// 抽卡动画系统

// ==================== 贪婪灵韵系统 ====================

// ==================== 连击灵韵系统 ====================

// ==================== Boss灵韵机制 ====================

// ==================== 器灵吞噬者逃跑机制 ====================

// ==================== 虚空皇帝限制机制 ====================

// ==================== 外部模块加载（从 dist/game-modules.js） ====================
var _gameModules = require('./dist/game-modules.js');
var $P = _gameModules.BrowserAPI;
var PauseCoordinator = _gameModules.PauseCoordinator;
var createStarThiefSystem = _gameModules.createStarThiefSystem;
var createVictoryHealPlugin = _gameModules.createVictoryHealPlugin;
var createCaptureSystem = _gameModules.createCaptureSystem;
var CAPTURE_STAR_TYPE = _gameModules.CAPTURE_STAR_TYPE || {};
var CAPTURE_CONFIG = _gameModules.CAPTURE_CONFIG || {};
var createTaskSystem = _gameModules.createTaskSystem;
var createFaithSystem = _gameModules.createFaithSystem;
var createTowerSystem = _gameModules.createTowerSystem;
var createAFKSystem = _gameModules.createAFKSystem;
var createGachaSystem = _gameModules.createGachaSystem;
var createDialogueSystem = _gameModules.createDialogueSystem;
var createSceneDispatcher = _gameModules.createSceneDispatcher;
var PORTRAIT_MAP = _gameModules.PORTRAIT_MAP;
var STORY_SCENES = _gameModules.STORY_SCENES;
var NPC_DIALOGUE_DRIVERS = _gameModules.NPC_DIALOGUE_DRIVERS;
// 抽卡配置（供渲染等直接使用）
var GACHA_POOL_TYPES = _gameModules.GACHA_POOL_TYPES;
var GACHA_POOL_ROTATION_DAYS = _gameModules.GACHA_POOL_ROTATION_DAYS;
var GACHA_ANIMATION_CONFIG = _gameModules.GACHA_ANIMATION_CONFIG;
var GACHA_POOLS = _gameModules.GACHA_POOLS;
var STAR_CHEST_REWARDS = _gameModules.STAR_CHEST_REWARDS;
var STAR_CHEST_DROP_RATE = _gameModules.STAR_CHEST_DROP_RATE;
// 任务配置（供渲染等直接使用）
var GUIDE_TASKS = _gameModules.GUIDE_TASKS;
var DAILY_TASKS = _gameModules.DAILY_TASKS;
var ACHIEVEMENT_TASKS = _gameModules.ACHIEVEMENT_TASKS;
// 信仰配置（供渲染等直接使用）
var FAITH_CONFIG = _gameModules.FAITH_CONFIG;
// 爬塔配置（供渲染等直接使用）
var TOWER_CONFIG = _gameModules.TOWER_CONFIG;
// 角色系统配置
var MAX_CHARACTER_LEVEL = _gameModules.MAX_CHARACTER_LEVEL;
var createCharacterSystem = _gameModules.createCharacterSystem;
var createDropSystem = _gameModules.createDropSystem;
var createMaterialSystem = _gameModules.createMaterialSystem;
var createAnimationSystem = _gameModules.createAnimationSystem;
var createComboSystem = _gameModules.createComboSystem;
var createPetSystem = _gameModules.createPetSystem;
var createSkillSystem = _gameModules.createSkillSystem;
var MonsterSkillType = _gameModules.MonsterSkillType;
var createMonsterSkillSystem = _gameModules.createMonsterSkillSystem;
var STAR_MODE = _gameModules.STAR_MODE;
var FALLING_CONFIG = _gameModules.FALLING_CONFIG;
var MAX_STARS_ON_SCREEN = _gameModules.MAX_STARS_ON_SCREEN;
var getBirthTransform = _gameModules.getBirthTransform;
var createStarSystem = _gameModules.createStarSystem;
var ShopItems = _gameModules.ShopItems;
var createShopSystem = _gameModules.createShopSystem;
var createMonsterSpawnSystem = _gameModules.createMonsterSpawnSystem;
var createPoisonPuddleSystem = _gameModules.createPoisonPuddleSystem;
var createTipSystem = _gameModules.createTipSystem;
var BOSS_STAR_COUNT = _gameModules.BOSS_STAR_COUNT;
var BOSS_STAR_MISS_THRESHOLD = _gameModules.BOSS_STAR_MISS_THRESHOLD;
var BOSS_STAR_DURATION = _gameModules.BOSS_STAR_DURATION;
var BOSS_FIRST_TRIGGER = _gameModules.BOSS_FIRST_TRIGGER;
var BOSS_REPEAT_TRIGGER = _gameModules.BOSS_REPEAT_TRIGGER;
var BOSS_STUN_CHANCE = _gameModules.BOSS_STUN_CHANCE;
var BOSS_STUN_DURATION = _gameModules.BOSS_STUN_DURATION;
var createBossStarSystem = _gameModules.createBossStarSystem;
var createUICoreRenderer = _gameModules.createUICoreRenderer;
var createMonsterDrawRenderer = _gameModules.createMonsterDrawRenderer;
var createAFKRenderer = _gameModules.createAFKRenderer;
var createMenuRenderer = _gameModules.createMenuRenderer;
var createSeasonRenderer = _gameModules.createSeasonRenderer;
var createTaskRenderer = _gameModules.createTaskRenderer;
var createDebugRenderer = _gameModules.createDebugRenderer;
var createShopRenderer = _gameModules.createShopRenderer;
var createBackpackRenderer = _gameModules.createBackpackRenderer;
var createGachaRenderer = _gameModules.createGachaRenderer;
var createStageRenderer = _gameModules.createStageRenderer;
var createSquadRenderer = _gameModules.createSquadRenderer;
var createBossRenderer = _gameModules.createBossRenderer;
var createTowerRenderer = _gameModules.createTowerRenderer;
var createGameBattleRenderer = _gameModules.createGameBattleRenderer;
var SEASON_STAR_TYPES = _gameModules.SEASON_STAR_TYPES;
var createSeasonSystem = _gameModules.createSeasonSystem;
var createMonthlyCardSystem = _gameModules.createMonthlyCardSystem;
var createStorageSystem = _gameModules.createStorageSystem;
var createGameDataStore = _gameModules.createGameDataStore;
var createMigrationPipeline = _gameModules.createMigrationPipeline;
var playerEffects = _gameModules.playerEffects;
var combatState = _gameModules.combatState;
var uiScrollState = _gameModules.uiScrollState;
var comboState = _gameModules.comboState;
var createBattleEngine = _gameModules.createBattleEngine;
var BATTLE_CONSTANTS = _gameModules.BATTLE_CONSTANTS;
var createAudioSystem = _gameModules.createAudioSystem;
var createModeLifecycleManager = _gameModules.createModeLifecycleManager;
var createStateMachine = _gameModules.createStateMachine;
var FUSION_TYPES = _gameModules.FUSION_TYPES;
var FUSION_CONFIG = _gameModules.FUSION_CONFIG;
var createFusionRegistry = _gameModules.createFusionRegistry;
var createFusionEngine = _gameModules.createFusionEngine;
var createFusionCharacterStrategy = _gameModules.createFusionCharacterStrategy;
var createFusionPetStrategy = _gameModules.createFusionPetStrategy;
var createFusionSkillStrategy = _gameModules.createFusionSkillStrategy;
var createFusionStarStrategy = _gameModules.createFusionStarStrategy;
var createFusionEquipmentStrategy = _gameModules.createFusionEquipmentStrategy;
var createFusionRenderer = _gameModules.createFusionRenderer;
var createUpgradeEngine = _gameModules.createUpgradeEngine;
var createUpgradeCharacterStrategy = _gameModules.createUpgradeCharacterStrategy;
var createUpgradeEquipmentStrategy = _gameModules.createUpgradeEquipmentStrategy;
var createUpgradeSkillStrategy = _gameModules.createUpgradeSkillStrategy;
var createUpgradePetStrategy = _gameModules.createUpgradePetStrategy;
var createUpgradeStarStrategy = _gameModules.createUpgradeStarStrategy;
var createUpgradeRenderer = _gameModules.createUpgradeRenderer;
var createAssetManager = _gameModules.createAssetManager;
var IMAGE_GROUPS = _gameModules.IMAGE_GROUPS;
var BEAUTY_CONFIG = _gameModules.BEAUTY_CONFIG;
var CHARACTER_MAP = _gameModules.CHARACTER_MAP;
var AUDIO_CONFIG = _gameModules.AUDIO_CONFIG;
var assetManager = null;
var upgradeEngine = null;
var upgradeRenderer = null;
let starThief = null;
let victoryHealPlugin = null;
let audioSystem = null;
let taskSystem = null;
let faithSystem = null;
let towerSystem = null;
let afkSystem = null;
let gachaSystem = null;
let characterSystem = null;
let dropSystem = null;
let materialSystem = null;
let animationSystem = null;
// 任务系统函数桥接（在 init() 中实例化后赋值）
var initTaskProgress = null;
var checkDailyTaskRefresh = null;
var updateTaskProgress = null;
var updateTaskStats = null;
var claimTaskReward = null;
var getTasksWithProgress = null;
var hasClaimableRewards = null;
// 信仰系统函数桥接（在 init() 中实例化后赋值）
var getCharacterFaithData = null;
var getFaithAttributeBonus = null;
var addFaithExp = null;
var useFaithResource = null;
var gainFaithResource = null;
var unlockSpecialization = null;
var unlockBreakthroughSkill = null;
var performInheritance = null;
var calculateTotalAttributesWithFaith = null;
var hasBreakthroughEffect = null;
// 角色系统函数桥接（在 init() 中实例化后赋值）
var initCharacterExperience = null;
var getCharacterExperience = null;
var getExpForLevel = null;
var addCharacterExperience = null;
var getCharacterLevelBonus = null;
var getCharacterStatsAtLevel = null;
var getCharacterFullStats = null;
var getPassiveSkillBonuses = null;
// 掉落系统函数桥接
var dropMaterial = null;
var dropEquipment = null;
var dropSkill = null;
var dropPet = null;
// 材料使用系统函数桥接
var calculateStarScore = null;
var calculateTotalAttack = null;
var useMaterial = null;
var upgradeIceStar = null;
var upgradeFireStar = null;
// 动画系统函数桥接
var createCritAnimation = null;
var updateCritAnimations = null;
var drawCritAnimations = null;
var createMeteorAnimation = null;
var updateMeteorAnimations = null;
var drawMeteorAnimations = null;
var createMeteorHitEffect = null;
var updateMeteorExplosions = null;
var drawMeteorExplosions = null;
var createHpBarCounterAnimation = null;
var updateHpBarCounterAnimations = null;
var drawHpBarCounterAnimations = null;
var createPlayerDamageAnimation = null;
var updatePlayerDamageAnimations = null;
var drawPlayerDamageAnimations = null;
var createMonsterDamageAnimation = null;
var updateMonsterDamageAnimations = null;
var drawMonsterDamageAnimations = null;
var createTimeDamageAnimation = null;
var updateTimeDamageAnimations = null;
var drawTimeDamageAnimations = null;
var createQuickTapAnimation = null;
var updateQuickTapAnimations = null;
var drawQuickTapAnimations = null;
var createGoldDropAnimation = null;
var updateGoldDropAnimations = null;
var drawGoldDropAnimations = null;
var addGameMessage = null;
var drawGameMessages = null;
var drawElementalComboEffect = null;
var createSkillDamageAnimation = null;
var updateSkillDamageAnimations = null;
var drawSkillDamageAnimations = null;
var createPetDamageAnimation = null;
var updatePetDamageAnimations = null;
var drawPetDamageAnimations = null;
var createMonsterProjectileAnimation = null;
var updateMonsterProjectileAnimations = null;
var drawMonsterProjectileAnimations = null;
var createTapRippleAnimation = null;
var updateTapRippleAnimations = null;
var drawTapRippleAnimations = null;
var releaseTapRipple = null;
var moveTapRipple = null;
// 灵韵点击粒子爆发
var createStarBurstAnimation = null;
var updateStarBurstAnimations = null;
var drawStarBurstAnimations = null;
// 灵韵合成聚拢
var updateMergeAnimations = null;
var drawMergeAnimations = null;
// 战斗动画清理
var clearBattleAnimations = null;
// 点击得分飘字
var createScorePopupAnimation = null;
var updateScorePopupAnimations = null;
var drawScorePopupAnimations = null;
// 视觉屏幕震动
var createScreenShake = null;
var updateScreenShake = null;
var getScreenShakeOffset = null;
var clearScreenShake = null;
// 提示系统
var tipSystem = null;
var tipShowTipOnce = null;
var tipUpdateTip = null;
var tipRenderTip = null;
var tipHandleTipClick = null;
var tipGetStarTypeName = null;
var getStarColor = null;
var getStarGlowColor = null;
var easeOutQuad = null;
var setElementalComboState = null;
var clearMessages = null;
var clearAllAnimations = null;
var getLastVibrateTime = null;
var setLastVibrateTime = null;
var getVibrateCooldown = null;
// 连击系统函数桥接
var comboSystem = null;
var getComboTimeout = null;
var updateCombo = null;
var resetCombo = null;
var checkComboTimeout = null;
var getComboScoreBonus = null;
// 宠物系统函数桥接
var petSystem = null;
var petAttackMonster = null;
var triggerPetSkill = null;
var startPetAttackTimer = null;
var updateMonsterBurnStatus = null;
var stopPetAttackTimer = null;
// 技能系统函数桥接
var skillSystem = null;
var useSkill = null;
var getSkillRemainingCooldown = null;
var updateSkillEffects = null;
var getActiveSkillBonuses = null;
var isImmune = null;
// 怪物技能系统函数桥接
var monsterSkillSystem = null;
var triggerMonsterSkill = null;
var calculateMonsterDamage = null;
var calculateDamageToMonster = null;
var addMonsterSkillAnimation = null;
var updateMonsterSkillAnimations = null;
var drawMonsterSkillAnimations = null;
// 融合系统
var fusionRegistry = null;
var fusionEngine = null;
var fusionRenderer = null;
// 灵韵系统函数桥接
var starSystem = null;
var shopSystem = null;
var monsterSpawnSystem = null;
var poisonPuddleSystem = null;
var bossStarSystem = null;
var addNewStar = null;
var addRandomStar = null;
var addFallingStar = null;
var updateFallingStars = null;
var mergeStars = null;
var resetStar = null;
var cleanupExpiredStars = null;
var spawnDodgeStar = null;
var updateStarSpawnInterval = null;
// 商店系统函数桥接（在 init() 中实例化后赋值）
var purchaseShopItem = null;
var useItem = null;
var resetBuffs = null;
// 怪物生成系统函数桥接（在 init() 中实例化后赋值）
var getMonsterInstance = null;
var getAvailableMonsters = null;
var getAvailableBosses = null;
var getRandomMonster = null;
var getMonsterTypeByScore = null;
var getBossTypeByScore = null;
var createMonster = null;
var calculateMonsterPositions = null;
var checkUnlockCharacter = null;
var checkMonsterAppear = null;
var spawnMonster = null;
// Boss灵韵机制函数桥接（在 init() 中实例化后赋值）
var triggerBossStarSkill = null;
var checkBossStarPenalty = null;
var resetBossStarMechanic = null;
var removeBossStar = null;
var incrementBossAttackCount = null;
// 怪物战斗系统函数桥接（在 init() 中实例化后赋值）
var singleMonsterAttack = null;
var monsterAttackPlayer = null;
var useGreedySkill = null;
var checkGameOver = null;
var updateMonsterAnimation = null;
var attackMonster = null;
var attackMonstersAOE = null;
var killMonster = null;
var onMonsterKilled = null;
var updatePoisonEffect = null;
// 调试系统桥接
var debugSystem = null;
// UI编辑器桥接
var uiConfig = null;
var uiEditorSystem = null;
var combatFontConfig = null;
var executeDebugAction = null;
var addMaterialToBackpack = null;
var endStage = null;
// 挂机系统函数桥接（在 init() 中实例化后赋值）
var calculateAccumulatedAfkRewards = null;
var claimAfkRewards = null;
// 抽卡系统函数桥接
var performGacha = null;
var showGachaResults = null;
var startGachaAnimation = null;
var updateGachaAnimation = null;
var closeGachaAnimation = null;
var handleGachaAnimationClick = null;
var handleGachaClick = null;
var getGachaPoolRemainingDays = null;
var checkGachaPoolRotation = null;
// 赛季系统函数桥接
var seasonSystem = null;
var getCurrentSeasonWeek = null;
var getMondayOfWeek = null;
var getSeasonSeed = null;
var seededRandom = null;
var generateSeasonContent = null;
var initSeasonContent = null;
var generateMockSeasonLeaderboard = null;
var getSeasonRank = null;
var startDodgeStarTimer = null;
var stopDodgeStarTimer = null;
// 月卡系统函数桥接
var monthlyCardSystem = null;
var isMonthlyCardClaimedToday = null;
var getTodayString = null;
var handleMonthlyCardClick = null;
var handleSmallMonthlyCardClick = null;
var handleLargeMonthlyCardClick = null;
var watchAdForMonthlyCard = null;
var addMonthlyCardDays = null;
var claimMonthlyCardReward = null;
// 存档系统函数桥接
var storageSystem = null;
var savePlayerData = null;
var loadBestScore = null;
var saveBestScore = null;
var clearGameData = null;
// 广告系统函数桥接
var adSystem = null;
var initAds = null;
var showRewardedVideoAd = null;
var showItemAd = null;
var handleItemAdReward = null;
var showTimeCrystalAd = null;
// 闯关模式系统函数桥接
var stageModeSystem = null;
var isStageUnlocked = null;
var getDifficultyColor = null;
var startStage = null;
// Boss战系统函数桥接
var bossBattleSystem = null;
var normalBattleAdapter = null;
var invariantChecker = null;
var modeLifecycle = null;
var stateMachine = null;
var uiCoreRenderer = null;
var monsterDrawRenderer = null;
// 全局绘制函数桥接（init 中由渲染器实例化后赋值）
var drawText = null;
var drawButton = null;
var drawBackButton = null;
var isBackButtonClicked = null;
var drawStar = null;
var drawMonster = null;
var drawSingleMonster = null;
var drawPoisonPuddles = null;
// AFK 渲染桥接
var renderAfkPopup = null;
var renderAfkResultPopup = null;
var renderAfkButton = null;
var handleAfkPopupTouch = null;
var handleAfkButtonTouch = null;
var handleAfkResultTouch = null;
// 菜单/赛季/任务/调试渲染桥接
var renderMenu = null;
var renderMenuBar = null;
// 大世界探索系统
var titleRenderer = null;
var cutsceneRenderer = null;
var worldMapSystem = null;
var worldMapRenderer = null;
var _keysDown = {};
var _towerKeyMoveCooldown = 0;
// 空格灵光系统闭包变量
var _pendingSpaceKeyTutorial = false;
var _spaceKeyHolding = false;
var _spaceKeyDownTime = 0;
var _spaceKeyTargetStar = null;
var _joystickActive = false;
var _joystickStartX = 0;
var _joystickStartY = 0;
var _joystickDX = 0;
var _joystickDY = 0;
// 对话剧情系统
var dialogueSystem = null;
var sceneDispatcher = null;
// 教学状态（收敛为单一对象，减少散弹式修改）
var _tutorial = {
    active: false,
    entityId: null,
    ending: false,
    victoryPopup: null,
    retryCount: 0,
    completed: false
};
var _worldMapBattleEntityId = null;
var _battleMusicTriggered = false;
var _lastPortalTime = 0;
var renderGameOver = null;
var renderPausedMenu = null;
var renderLeaderboard = null;
var renderSettings = null;
var renderSeasonMenu = null;
var renderSeasonSelect = null;
var renderSeasonLeaderboard = null;
var renderTasks = null;
var renderDebugPanel = null;
// 背包渲染桥接
var renderBackpack = null;
var renderMaterialsTab = null;
var renderCharactersTab = null;
var renderStarsTab = null;
var renderItemsTab = null;
var renderEquipmentsTab = null;
var renderSkillsTab = null;
var renderPetsTab = null;
var renderFaithTab = null;
// 商城渲染桥接
var renderShop = null;
var renderShopMaterialsTab = null;
var renderShopBuffsTab = null;
var renderShopItemsTab = null;
var renderShopGachaTab = null;
var renderShopPetsTab = null;
var renderShopMonthlyTab = null;
// 扭蛋渲染桥接
var renderGachaAnimation = null;
var renderGachaStarfield = null;
var renderFlyingStar = null;
var renderRevealedStars = null;
var renderGachaConfirmButton = null;
// 闯关渲染桥接
var renderStageSelect = null;
var renderStageResult = null;
// 阵营渲染桥接
var renderSquad = null;
var renderPortraitLarge = null;
var renderSquadCharacter = null;
var renderSquadEquipment = null;
var renderSquadSkills = null;
var renderSquadPets = null;
var renderSquadStars = null;
// Boss渲染桥接
var renderBossBattleResult = null;
var renderBossSelect = null;
// 塔渲染桥接
var renderTower = null;
var renderHiddenPathDialog = null;
var renderBattle = null;
var renderTowerResult = null;
var renderTowerResume = null;
// 核心战斗渲染桥接
var renderGame = null;
var afkRenderer = null;
var menuRenderer = null;
var seasonRenderer = null;
var taskRenderer = null;
var debugRenderer = null;
var shopRenderer = null;
var backpackRenderer = null;
var gachaRenderer = null;
var stageRenderer = null;
var squadRenderer = null;
var bossRenderer = null;
var towerRenderer = null;
var gameBattleRenderer = null;
// D2-D5 战斗维度系统桥接（在 init() 中创建，全局可访问）
var rhythmSystem = null;
var rhythmSkillSystem = null;
var saturationState = null;
var chargeSystem = null;
var dragSystem = null;
var linkChainSystem = null;
var touchGestureSystem = null;
var touchPipeline = null;
var USE_TOUCH_PIPELINE = true;
var _lastBossStunTime = 0;
var getStarBaseScore = null;
// 游戏生命周期系统函数桥接
var gameLifecycleSystem = null;
var startGame = null;
var endGame = null;
var onTutorialFail = null;
var restartGame = null;
var startSeasonGame = null;
var endSeasonGame = null;
// 玩家数据加载系统函数桥接
var playerDataSystem = null;
var loadPlayerData = null;
// GameDataStore 统一数据存储
var dataStore = null;
var saveData = null;
var runtimeData = null;
var migrationPipeline = null;
// 配置数据桥接（从 game-modules.js 导入）
var EquipmentTypes = _gameModules.EquipmentTypes;
var EquipmentRarity = _gameModules.EquipmentRarity;
var Equipments = _gameModules.Equipments;
var SkillTypes = _gameModules.SkillTypes;
var Skills = _gameModules.Skills;
var PetRarity = _gameModules.PetRarity;
var Pets = _gameModules.Pets;
var Materials = _gameModules.Materials;
var STAGES = _gameModules.STAGES;
var CHAPTERS = _gameModules.CHAPTERS;
// 绘图工具函数桥接（从 game-modules.js 导入）
var drawRoundRect = _gameModules.drawRoundRect;
var fillRoundRect = _gameModules.fillRoundRect;
var strokeRoundRect = _gameModules.strokeRoundRect;
var gachaRoundRect = _gameModules.gachaRoundRect;
// 大型配置数据桥接（从 game-modules.js 导入）
var Monsters = _gameModules.Monsters;
var MonsterRarityWeights = _gameModules.MonsterRarityWeights;
var MonsterGrowth = _gameModules.MonsterGrowth;
var BOSS_LIST = _gameModules.BOSS_LIST;
var MonsterTypes = _gameModules.MonsterTypes;
var Characters = _gameModules.Characters;
var getCharacterKey = _gameModules.getCharacterKey;
// 游戏核心配置桥接（从 game-modules.js 导入）
var CONFIG = _gameModules.CONFIG;
var BOSS_BATTLE_CONFIG = _gameModules.BOSS_BATTLE_CONFIG;
// ========== MockLeaderboardData 已移除（使用开放数据域好友排行榜） ==========
var BASE_STAR_INTERVAL = _gameModules.BASE_STAR_INTERVAL;
var MIN_STAR_INTERVAL = _gameModules.MIN_STAR_INTERVAL;

// spec-aware base interval: reads from BattleEngine RC if available, falls back to constant
function _getSpecAwareBaseStarInterval() {
    var engine = (normalBattleAdapter && normalBattleAdapter.getBattleEngine) ? normalBattleAdapter.getBattleEngine() : null;
    if (engine && engine.getEffectiveSpec()) {
        return _gameModules.getSpecValue(engine.getEffectiveSpec(), 'STAR.SPAWN_INTERVAL_MS') || BASE_STAR_INTERVAL;
    }
    return BASE_STAR_INTERVAL;
}
var DODGE_DURATION = _gameModules.DODGE_DURATION;
var DODGE_STAR_SPAWN_INTERVAL = _gameModules.DODGE_STAR_SPAWN_INTERVAL;
var DODGE_STAR_LIFETIME = _gameModules.DODGE_STAR_LIFETIME;
var MONSTER_ABSORB_SCORE = _gameModules.MONSTER_ABSORB_SCORE;
var MONSTER_ARMOR_GAIN = _gameModules.MONSTER_ARMOR_GAIN;
var MONSTER_HP_GAIN = _gameModules.MONSTER_HP_GAIN;
var MONSTER_DAMAGE_GAIN = _gameModules.MONSTER_DAMAGE_GAIN;
var NORMAL_GAME_TIME = _gameModules.NORMAL_GAME_TIME;
var TIME_STAR_MIN_TIME = _gameModules.TIME_STAR_MIN_TIME;
var STAR_DEVOURER_ESCAPE_HP_RATIO = _gameModules.STAR_DEVOURER_ESCAPE_HP_RATIO;
var GREEDY_SKILL_THRESHOLD = _gameModules.GREEDY_SKILL_THRESHOLD;
var COMBO_STAR_DURATION = _gameModules.COMBO_STAR_DURATION;
var COMBO_STAR_INTERVAL = _gameModules.COMBO_STAR_INTERVAL;
var SKILL_SLOT_SIZE = _gameModules.SKILL_SLOT_SIZE;
var MAX_ACTIVE_SKILLS = _gameModules.MAX_ACTIVE_SKILLS;
var BACK_BTN_WIDTH = _gameModules.BACK_BTN_WIDTH;
var BACK_BTN_HEIGHT = _gameModules.BACK_BTN_HEIGHT;
var BACK_BTN_COLOR = _gameModules.BACK_BTN_COLOR;
var isModeUnlocked = _gameModules.isModeUnlocked;
var AWAKE_CONFIG = _gameModules.AWAKE_CONFIG;
var getPlayerHpScaling = _gameModules.getPlayerHpScaling;
var getPlayerAtkScaling = _gameModules.getPlayerAtkScaling;
var getPlayerScoreScaling = _gameModules.getPlayerScoreScaling;
var getAwakeStage = _gameModules.getAwakeStage;
var getDropTier = _gameModules.getDropTier;
// ═══════════════════════════════════════════════════════════
// 战斗特性（CombatSpec features）— 渲染层感知
// ═══════════════════════════════════════════════════════════
var _COMBAT_SPEC = _gameModules.COMBAT_SPEC;
var _specResolverFn = _gameModules.specResolver;
var _normalCombatFeatures = _gameModules.COMBAT_FEATURES;
var _bossCombatFeatures = _specResolverFn(_normalCombatFeatures, _gameModules.BOSS_COMBAT_FEATURES);
var _towerCombatFeatures = _specResolverFn(_normalCombatFeatures, _gameModules.TOWER_COMBAT_FEATURES);
function getCombatFeatures() {
    if (state === GAME_STATE.BOSS_BATTLE) return _bossCombatFeatures;
    if (state === GAME_STATE.TOWER_COMBAT) return _towerCombatFeatures;
    return _normalCombatFeatures;
}

function applyPoisonStarEffect(dmg) {
    if (godMode) return; // 无敌模式免疫毒灵
    if (runtimeData.playerShield > 0) {
        var absorb = Math.min(runtimeData.playerShield, dmg);
        runtimeData.playerShield -= absorb;
        dmg -= absorb;
    }
    var oldHp = saveData.playerHp;
    saveData.playerHp = Math.max(0, saveData.playerHp - dmg);
    _log('[HP] poison_star | -' + dmg + ' | ' + oldHp + ' → ' + saveData.playerHp);
    playerEffects.poisoned = true;
    playerEffects.poisonEndTime = Date.now() + _COMBAT_SPEC.STATUS.POISON_DURATION_MS;
    playerEffects.poisonDamage = _COMBAT_SPEC.STATUS.POISON_TICK_DAMAGE;
    playerEffects.poisonTickTime = Date.now() + _COMBAT_SPEC.STATUS.POISON_TICK_MS;
    addGameMessage('☠️ 毒灵爆发! -' + _COMBAT_SPEC.STATUS.POISON_STAR_DAMAGE + 'HP+中毒!', '#00ff00', true);
    $P.vibrateShort({ type: 'heavy' });
}

// ==================== 技能栏系统 ====================

// 宠物攻击系统

// ==================== Boss战模式 ====================


// ==================== 统一怪物配置系统 ====================


// 排行榜系统


// 任务系统
let tasksTab = 'guide';  // 'guide' 引导任务、'daily' 每日任务 或 'achievements' 成就任务
let tasksScrollY = 0; // 任务列表滚动偏移
let tasksLastTouchY = 0; // 任务列表触摸上一次Y坐标

// ==================== 闯关模式系统 ====================

// 闯关模式变量
let currentStage = null;           // 当前关卡ID
let currentStageData = null;       // 当前关卡数据
let stageScore = 0;                // 闯关分数
let stageTime = 0;                 // 闯关时间
let stageMonstersKilled = 0;       // 击杀怪物数
let stageBossesKilled = 0;         // 击杀Boss数
let stageMaxCombo = 0;             // 最高连击
let stagePerfectCount = 0;         // 完美点击次数
let stageCriticalCount = 0;        // 暴击次数
let stageDamageTaken = 0;          // 受到的伤害
let stageResult = { stars: 0, rewards: {} };  // 关卡结果
let selectedChapter = 1;           // 当前选择的章节


// }

// ========== MockLeaderboardData 已移除（使用开放数据域好友排行榜） ==========

// 游戏资源
const Assets = {
    backgroundImage: null,
    titleBgImage: null,
    titleLogo: null,
    titleStartBtn: null,
    fightBgImage: null,     // 战斗场景背景图片（初始）
    fightBgImage2: null,    // 战斗场景背景图片（2000分解锁）
    worldMapBg01: null,     // 世界地图背景 world_01
    worldMapBg02: null,     // 世界地图背景 world_02
    worldMapBg03: null,
    worldMapBg04: null,
    worldMapBg05: null,
    worldMapBg06: null,
    worldMapBg07: null,
    worldMapBg08: null,
    worldMapBg09: null,
    worldMapBg10: null,
    worldMapBg11: null,
    worldMapBg12: null,
    worldMapBg13: null,
    worldMapBg14: null,
    worldMapBg15: null,
    worldMapBg16: null,
    worldMapBg17: null,
    bgPositionCache: null,  // 缓存背景图片位置信息
    fightBgPositionCache: null,  // 缓存战斗背景图片位置信息
    fightBgPositionCache2: null, // 缓存第二张战斗背景图片位置信息
    normalStarImage: null,  // 灵韵图片
    iceStarImage: null,     // 冰灵图片
    fireStarImage: null,    // 火灵图片
    backpackImage: null,    // 背包UI图片
    menuButtonImage: null,  // 菜单展开按钮图片（展开状态）
    menuButtonImageCollapsed: null,  // 菜单展开按钮图片（未展开状态）
    settingsIcon: null,     // 设置图标
    goldIcon: null,         // 灵币图标
    starSourceIcon: null,   // 器灵石图标
    backIcon: null,         // 返回按钮图标
    taskIcon: null,         // 任务图标
    leaderboardIcon: null,  // 排行榜图标
    seasonIcon: null,       // 赛季图标
    shopIcon: null,         // 商城图标
    towerIcon: null,        // 无尽塔图标
    bossImage: null,        // Boss战图标
    beautyFrames: [],      // 灵光发光序列帧（16帧）
    bluelightImg: null,     // Bluelight光线特效图
    characterImages: {      // 角色图片
        starter: null,      // 玉蝉仙
        starterPortrait: null, // 玉蝉仙立绘
        warrior: null       // 鼎魂
    },
    dialoguePortraits: {   // 对话剧情立绘
        portrait_jp: null,   // 剑魄
        portrait_ml: null,   // 猫灵
        portrait_ycx: null   // 玉蝉仙
    }
};


// ==================== 赛季模式配置 ====================
// 通过 seasonSystem getter/setter 访问

// 赛季模式状态（保留全局声明，通过 seasonSystem 同步）
// 全局变量保留用于渲染等处直接读取，SeasonSystem 通过 setter 同步回来
let seasonContent = null;
let seasonSelection = { character: null, skills: [], pet: null, starTypes: [] };
let seasonScore = 0;
let seasonBestScore = 0;
let seasonLeaderboard = [];



// 当前激活的增益效果（单局生效）
let activeBuffs = {
    attackBonus: 0,
    critRateBonus: 0,
    goldBonus: 1,
    timeBonus: 0,
    hpBonus: 0
};

// 局内道具数量（每种最多带3个）
let gameItems = {
    healPotion: 0,
    timePotion: 0
};
const MAX_GAME_ITEMS = 3;  // 每种道具局内最多携带数量

// 局内广告道具次数（每种道具最多2次看广告机会）
let adItems = {
    healPotion: 0,
    timePotion: 0
};
const MAX_AD_ITEMS = 2;  // 每种道具看广告次数上限

// 玩家数据（由 GameDataStore 统一管理，saveData 是对 dataStore.save 的 Proxy 引用）
// 注意：playerData 已废弃，全部使用 saveData / runtimeData 替代
var saveData = null;
var runtimeData = null;

function _updateCatSpiritVisibility(worldId) {
    if (worldId === 'world_02' && worldMapSystem) {
        var pd = saveData;
        var tutorialDone = pd && pd.ownedCharacters && pd.ownedCharacters.indexOf('char_001') !== -1;
        if (!tutorialDone) {
            worldMapSystem.setHiddenEntityIds(['npc_cat_spirit']);
        } else {
            worldMapSystem.setHiddenEntityIds([]);
        }
    }
}

// 游戏状态
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAMEOVER: 'gameover',
    BACKPACK: 'backpack'
};


// 数据存储和加载

// 数据存储已迁移至 GameDataStore（统一入口），详见 V1/GameDataStore落地方案.md
// saveData = dataStore.save（Proxy 自动标脏），runtimeData = dataStore.runtime（不持久化）
// flush 由 renderLoop 自动调用 tryFlush()（2000ms 防抖冷却）


// 游戏模式设置
let starMode = STAR_MODE.RANDOM;  // 默认随机生成模式（保留全局，多处读取）


// 灵韵数组（支持多个灵韵同时存在）
let stars = [];

// 怪物数组（支持多怪物同时存在）
let monsters = [];

// poisonPuddles, poisonStars 通过 poisonPuddleSystem 访问

function spawnPoisonPuddles(monsterX, monsterY, skill) { poisonPuddleSystem.spawnPoisonPuddles(monsterX, monsterY, skill); }
function updatePoisonPuddles() { poisonPuddleSystem.updatePoisonPuddles(); }


// 获取第一个激活的怪物（兼容旧代码）
var getActiveMonster = null;
var getActiveMonsters = null;

// 兼容层：monster 变量指向第一个激活的怪物
const monster = new Proxy({}, {
    get(target, prop) {
        const activeMonster = getActiveMonster();
        if (activeMonster && prop in activeMonster) {
            return activeMonster[prop];
        }
        // 返回默认值
        const defaults = {
            active: false, x: 0, y: 0, size: 60, hp: 0, maxHp: 0,
            type: null, scale: 1, animationFrame: 0, armor: 0,
            shield: 0, hasRaged: false, hasSplit: false, skills: [],
            absorbType: null, empowered: false, empowerType: null,
            damageBonus: 0, hpBonus: 0, attack: 10, attackInterval: 2000,
            rageMultiplier: 1, skillStates: {}, lastIceAttackTime: 0,
            lastFireAttackTime: 0, comboCooldown: 0
        };
        return defaults[prop];
    },
    set(target, prop, value) {
        const activeMonster = getActiveMonster();
        if (activeMonster) {
            activeMonster[prop] = value;
        }
        return true;
    }
});

// 屏幕尺寸
let screenWidth = 0;
let screenHeight = 0;
let _screenNeedsUpdate = false;

// 广告

// 游戏配置

// 初始化
function init() {
    try {
        _log('开始初始化...');

        // 获取Canvas
        canvas = $P.createCanvas();
        ctx = canvas.getContext('2d');

        // 获取屏幕尺寸
        const systemInfo = $P.getSystemInfoSync();
        screenWidth = systemInfo.windowWidth;
        screenHeight = systemInfo.windowHeight;
        const dpr = systemInfo.pixelRatio || 1;

        console.log('[ScreenInit] sw=' + screenWidth + ' sh=' + screenHeight + ' dpr=' + dpr + ' canvasCSS_w=' + canvas.clientWidth + ' canvasCSS_h=' + canvas.clientHeight + ' windowW=' + window.innerWidth + ' windowH=' + window.innerHeight + ' scale=' + (screenWidth / 375));

        // 高DPI适配：Canvas物理分辨率 = 逻辑尺寸 × DPR
        canvas.width = screenWidth * dpr;
        canvas.height = screenHeight * dpr;
        ctx.scale(dpr, dpr);

        _log('屏幕尺寸:', screenWidth, 'x', screenHeight, 'DPR:', dpr, '物理:', canvas.width, 'x', canvas.height);

        // 屏幕尺寸变更标记 — resize handler 仅标记，渲染帧开头统一处理
        window.addEventListener('resize', function() {
            _screenNeedsUpdate = true;
        });
        
        // 初始化存档系统（精简版：只负责 bestScore + 云上传）
        storageSystem = createStorageSystem({
            getScore: function() { return score; },
            getBestScore: function() { return bestScore; },
            setBestScore: function(val) { bestScore = val; },
            getSeasonBestScore: function() { return seasonBestScore; }
        });
        loadBestScore = function() { storageSystem.loadBestScore(); };
        saveBestScore = function() { storageSystem.saveBestScore(); };
        _log('存档系统模块初始化完成');

        // 初始化统一数据存储 GameDataStore
        dataStore = createGameDataStore({
            getStorage: function(key) { return $P.getStorageSync(key); },
            setStorage: function(key, val) { $P.setStorageSync(key, val); },
            removeStorage: function(key) { $P.removeStorageSync(key); }
        });
        migrationPipeline = createMigrationPipeline();

        // 注册 load 后恢复全局状态（必须在 load() 之前注册）
        dataStore.onLoad(function() {
            var pd = dataStore.save;
            var rt = dataStore.runtime;
            if (rt.tutorialCompleted) {
                _tutorial.completed = true;
                rt.tutorialCompleted = true;
            }
            combatState.timeCrystalUnlocked = pd.timeCrystalUnlocked;
            starMode = pd.starMode || 'random';
            if (starSystem) starSystem.setStarMode(starMode);
        });

        dataStore.load();
        saveData = dataStore.save;
        runtimeData = dataStore.runtime;

        // 注册 flush 后上传排行榜
        dataStore.onFlush(function(snapshot) {
            storageSystem.uploadLeaderboardData(snapshot);
        });

        _log('统一数据存储模块初始化完成');

        // 初始化调试系统模块
        debugSystem = _gameModules.createDebugSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getCharacters: function() { return Characters; },
            getEquipments: function() { return _gameModules.Equipments; },
            getSkills: function() { return _gameModules.Skills; },
            getPets: function() { return _gameModules.Pets; },
            getSeasonStarTypes: function() { return _gameModules.SEASON_STAR_TYPES; },
            savePlayerData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            showToast: function(title, icon, duration) { $P.showToast({ title: title, icon: icon, duration: duration }); },
            setBestScore: function(val) { bestScore = val; },
            getUpgradeEngine: function() { return upgradeEngine; },
            toggleDevBattle: function() {
                if (devBattleSystem) {
                    devBattleSystem.toggle();
                    debugPanelOpen = false;
                }
            },
            toggleUIEditor: function() {
                debugPanelOpen = false;
                if (uiEditorSystem) uiEditorSystem.toggle();
            },
            toggleGodMode: function() {
                godMode = !godMode;
                runtimeData.godMode = godMode;
                $P.showToast({ title: godMode ? '无敌模式 ON' : '无敌模式 OFF', icon: 'none', duration: 1500 });
            },
            resetSaveData: function() { dataStore.reset(); },
            onResetComplete: function() {
                bestScore = 0;
                _tutorial.completed = false;
                _tutorial.active = false;
                _tutorial.ending = false;
                _tutorial.victoryPopup = null;
            }
        });
        executeDebugAction = function(actionId) { debugSystem.executeDebugAction(actionId); };
        _log('调试系统模块初始化完成');

        // 初始化UIConfig和UIEditor
        uiConfig = _gameModules.createUIConfig({
            storageSet: function(key, val) { $P.setStorageSync(key, val); },
            storageGet: function(key) { return $P.getStorageSync(key); }
        });
        uiConfig.load();

        // 初始化战斗字体配置
        combatFontConfig = _gameModules.createCombatFontConfig();

        uiEditorSystem = _gameModules.createUIEditorSystem({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getGameState: function() { return state; },
            getFillRoundRect: function() { return fillRoundRect; },
            uiConfig: uiConfig,
            showToast: function(opts) { $P.showToast(opts); }
        });
        _log('UI编辑器模块初始化完成');

        // 加载最高分
        loadBestScore();

        // 首次上传排行榜数据（后续由 onFlush 自动上传）
        storageSystem.uploadLeaderboardData(saveData);

        _log('灵韵模式:', starMode);
        
        // ==================== 资源管理器 ====================
        assetManager = createAssetManager({
            createImage: function() { return $P.createImage(); },
            imageGroups: IMAGE_GROUPS,
            beautyConfig: BEAUTY_CONFIG,
            characterMap: CHARACTER_MAP
        });
        assetManager.loadAll();
        _log('AssetManager 加载全部分组');

        // 适配层：回填 Assets 对象，渲染器零改动
        Assets.backgroundImage = assetManager.get('backgroundImage');
        Assets.titleBgImage = assetManager.get('titleBgImage');
        Assets.titleLogo = assetManager.get('titleLogo');
        Assets.titleStartBtn = assetManager.get('titleStartBtn');
        Assets.fightBgImage = assetManager.get('fightBgImage');
        Assets.fightBgImage2 = assetManager.get('fightBgImage2');
        Assets.normalStarImage = assetManager.get('normalStarImage');
        Assets.iceStarImage = assetManager.get('iceStarImage');
        Assets.fireStarImage = assetManager.get('fireStarImage');
        Assets.backpackImage = assetManager.get('backpackImage');
        Assets.menuButtonImage = assetManager.get('menuButtonImage');
        Assets.menuButtonImageCollapsed = assetManager.get('menuButtonImageCollapsed');
        Assets.settingsIcon = assetManager.get('settingsIcon');
        Assets.goldIcon = assetManager.get('goldIcon');
        Assets.starSourceIcon = assetManager.get('starSourceIcon');
        Assets.backIcon = assetManager.get('backIcon');
        Assets.taskIcon = assetManager.get('taskIcon');
        Assets.leaderboardIcon = assetManager.get('leaderboardIcon');
        Assets.seasonIcon = assetManager.get('seasonIcon');
        Assets.shopIcon = assetManager.get('shopIcon');
        Assets.towerIcon = assetManager.get('towerIcon');
        Assets.bossImage = assetManager.get('bossImage');
        Assets.chestImage = assetManager.get('chestImage');
        Assets.idleIcon = assetManager.get('idleIcon');
        Assets.char_worldMapPlayer = assetManager.get('char_worldMapPlayer');
        Assets.worldMapBg01 = assetManager.get('worldMapBg01');
        Assets.worldMapBg02 = assetManager.get('worldMapBg02');
        Assets.worldMapBg03 = assetManager.get('worldMapBg03');
        Assets.worldMapBg04 = assetManager.get('worldMapBg04');
        Assets.worldMapBg05 = assetManager.get('worldMapBg05');
        Assets.worldMapBg06 = assetManager.get('worldMapBg06');
        Assets.worldMapBg07 = assetManager.get('worldMapBg07');
        Assets.worldMapBg08 = assetManager.get('worldMapBg08');
        Assets.worldMapBg09 = assetManager.get('worldMapBg09');
        Assets.worldMapBg10 = assetManager.get('worldMapBg10');
        Assets.worldMapBg11 = assetManager.get('worldMapBg11');
        Assets.worldMapBg12 = assetManager.get('worldMapBg12');
        Assets.worldMapBg13 = assetManager.get('worldMapBg13');
        Assets.worldMapBg14 = assetManager.get('worldMapBg14');
        Assets.worldMapBg15 = assetManager.get('worldMapBg15');
        Assets.worldMapBg16 = assetManager.get('worldMapBg16');
        Assets.worldMapBg17 = assetManager.get('worldMapBg17');
        Assets.characterImages.starter = assetManager.get('char_starter');
        Assets.characterImages.starterPortrait = assetManager.get('char_starterPortrait');
        Assets.characterImages.warrior = assetManager.get('char_warrior');
        Assets.characterImages.warriorPortrait = assetManager.get('char_warriorPortrait');
        Assets.characterImages.archer = assetManager.get('char_archer');
        Assets.characterImages.archerPortrait = assetManager.get('char_archerPortrait');
        // 对话剧情立绘
        Assets.dialoguePortraits = {
            portrait_jp: assetManager.get('dialogue_portrait_jp'),
            portrait_ml: assetManager.get('dialogue_portrait_ml'),
            portrait_ycx: assetManager.get('dialogue_portrait_ycx'),
        };
        // NPC 大地图立绘扁平映射（供 WorldMapRenderer 按 npcImageId 查找）
        Assets['dialogue_portrait_ml'] = assetManager.get('dialogue_portrait_ml');
        Assets.beautyFrames = assetManager.getFrames('beauty');
        Assets.bluelightImg = assetManager.get('bluelightImg');


        // 初始化偷灵者模块
        starThief = createStarThiefSystem({
            getStars: function() { return stars; },
            setStars: function(val) { stars = val; },
            pushStar: function(star) { stars.push(star); },
            removeStarAt: function(i) { stars.splice(i, 1); },
            getMonsters: function() { return monsters; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getEquipments: function() { return Equipments; },
            addMessage: function(msg, color, isImportant) { addGameMessage(msg, color, isImportant); },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            updateStarSpawn: function() { updateStarSpawnInterval(); },
            clearMoveInterval: function() { if (moveInterval) { clearInterval(moveInterval); moveInterval = null; } },
            stopDodgeStarTimer: function() { stopDodgeStarTimer(); },
            fillRoundRectFn: fillRoundRect,
            getScreenScaleFn: getScreenScale,
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        _log('偷灵者模块初始化完成');

        // 击杀回血插件
        victoryHealPlugin = createVictoryHealPlugin({
            addMessage: function(msg, color, isImportant) { addGameMessage(msg, color, isImportant); },
            getCharacterFullStats: function(id) { return getCharacterFullStats(id); },
            healPlayerFn: function(amount) { return normalBattleAdapter ? normalBattleAdapter.healPlayer(amount) : 0; }
        });

        // 初始化收服系统模块
        captureSystem = createCaptureSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getMonsters: function() { return monsters; },
            addMessage: function(msg, color, isImportant) { addGameMessage(msg, color, isImportant); },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: getScreenScale,
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });

        // 初始化任务系统模块
        taskSystem = createTaskSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            addCharExp: function(charId, exp) { addCharacterExperience(charId, exp); },
            showToast: function(opts) { $P.showToast(opts); }
        });
        // 将任务系统函数挂载到全局（保持向后兼容）
        initTaskProgress = function() { taskSystem.initTaskProgress(); };
        checkDailyTaskRefresh = function() { taskSystem.checkDailyTaskRefresh(); };
        updateTaskProgress = function(taskType, value, isAdditive) { taskSystem.updateTaskProgress(taskType, value, isAdditive); };
        updateTaskStats = function(statType, value, isAdditive) { taskSystem.updateTaskStats(statType, value, isAdditive); };
        claimTaskReward = function(taskId, taskType) { return taskSystem.claimTaskReward(taskId, taskType); };
        getTasksWithProgress = function(taskType) { return taskSystem.getTasksWithProgress(taskType); };
        hasClaimableRewards = function() { return taskSystem.hasClaimableRewards(); };
        completeEventTask = function(taskId) { return taskSystem.completeEventTask(taskId); };
        _log('任务系统模块初始化完成');

        // 初始化信仰系统模块
        faithSystem = createFaithSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ }
        });
        getCharacterFaithData = function(charId) { return faithSystem.getCharacterFaithData(charId); };
        getFaithAttributeBonus = function(charId, attribute) { return faithSystem.getFaithAttributeBonus(charId, attribute); };
        addFaithExp = function(charId, expAmount) { return faithSystem.addFaithExp(charId, expAmount); };
        useFaithResource = function(charId, resourceType, amount) { return faithSystem.useFaithResource(charId, resourceType, amount); };
        gainFaithResource = function(resourceType, amount) { faithSystem.gainFaithResource(resourceType, amount); };
        unlockSpecialization = function(charId, path) { return faithSystem.unlockSpecialization(charId, path); };
        unlockBreakthroughSkill = function(charId, skillId) { return faithSystem.unlockBreakthroughSkill(charId, skillId); };
        performInheritance = function(charId) { return faithSystem.performInheritance(charId); };
        calculateTotalAttributesWithFaith = function(charId, baseAttributes) { return faithSystem.calculateTotalAttributesWithFaith(charId, baseAttributes); };
        hasBreakthroughEffect = function(charId, effectType) { return faithSystem.hasBreakthroughEffect(charId, effectType); };
        _log('信仰系统模块初始化完成');

        // 初始化爬塔系统模块
        towerSystem = createTowerSystem({
            battleEngine: null, // 占位，创建后回填
            initTowerEngineFn: function(engine, config) { normalBattleAdapter.initTowerEngine(engine, config); },
            releaseTowerEngineFn: function() { normalBattleAdapter.releaseEngine(); },
            updateStarSpawnInterval: function() { updateStarSpawnInterval(); },
            getCombatState: function() { return combatState; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            addCharExp: function(charId, exp) { addCharacterExperience(charId, exp); },
            getCharFullStats: function(charId) { return getCharacterFullStats(charId); },
            getScreenScale: getScreenScale,
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getSeasonStarTypes: function() { return SEASON_STAR_TYPES; },
            playCharacterStep: function() { if (audioSystem) audioSystem.playCharacterStep(); },
            playTeleport: function() { if (audioSystem) audioSystem.playTeleport(); },
            playCombo: function() { if (audioSystem) audioSystem.playCombo(); },
            playCritical: function() { if (audioSystem) audioSystem.playCritical(); },
            playHit: function() { if (audioSystem) audioSystem.playHit(); },
            playQuickTap: function() { if (audioSystem) audioSystem.playQuickTap(); },
            playHitEnemy: function() { if (audioSystem) audioSystem.playHitEnemy(); },
            playNormal: function() { if (audioSystem) audioSystem.playNormal(); },
            playPoisonClick: function() { if (audioSystem) audioSystem.playPoisonClick(); },
            playTreasureBox: function() { if (audioSystem) audioSystem.playTreasureBox(); },
            playTreasureMisc: function() { if (audioSystem) audioSystem.playTreasureMisc(); },
            playPetAttack: function() { if (audioSystem) audioSystem.playPetAttack(); },
            clearTimerInterval: function() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } },
            clearMoveInterval: function() { if (moveInterval) { clearInterval(moveInterval); moveInterval = null; } },
            clearMonsterAttackInterval: function() { if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; } },
            setGameState: function(s) { stateMachine.transitionTo(s); },
            getGameState: function() { return state; },
            getCtx: function() { return ctx; },
            showToast: function(opts) { $P.showToast(opts); },
            createStarBurstAnimation: function(x, y, starType) { createStarBurstAnimation(x, y, starType); },
            createScreenShake: function(intensity) { createScreenShake(intensity); },
            createMonsterDamageAnimation: function(x, y, dmg) { createMonsterDamageAnimation(x, y, dmg); },
            createPlayerDamageAnimation: function(dmg, isBoss, isPoison, customText, isShield) { createPlayerDamageAnimation(dmg, isBoss, isPoison, customText, isShield); },
            addGameMessage: function(text, color, isR) { addGameMessage(text, color, isR); },
            createMeteorAnimation: function(sx, sy, dmg, crit, st, ss, cm, cb, ce) { createMeteorAnimation(sx, sy, dmg, crit, st, ss, cm, cb, ce); },
            createCritAnimation: function(x, y, dmg, score, color) { createCritAnimation(x, y, dmg, score, color); },
            createQuickTapAnimation: function(x, y, score, tier, isF) { createQuickTapAnimation(x, y, score, tier, isF); },
            createMonsterProjectileAnimation: function(sx, sy, dmg, td, boss, onHit) { createMonsterProjectileAnimation(sx, sy, dmg, td, boss, onHit); },
            createHpBarCounterAnimation: function() { createHpBarCounterAnimation(); },
            updateCombo: function() { updateCombo(); },
            resetCombo: function() { resetCombo(); },
            getComboCount: function() { return comboState.count; },
            calculateStarScore: function(t) { return calculateStarScore(t); },
            createTimeDamageAnimation: function(dmg) { createTimeDamageAnimation(dmg); },
            getCharacterFullStats: function(id) { return getCharacterFullStats(id); },
            COMBO_STAR_DURATION: COMBO_STAR_DURATION,
            COMBO_STAR_INTERVAL: COMBO_STAR_INTERVAL,
            getMonsterSkillType: function() { return MonsterSkillType; },
            getSkillsConfig: function() { return Skills; },
            getSkillTypes: function() { return SkillTypes; },
            getPets: function() { return Pets; },
            clearBattleAnimations: function() { animationSystem.clearAllAnimations(); },
            clearStars: function() { stars = []; },
            getPlayerEffects: function() { return playerEffects; },
            getModeLifecycle: function() { return modeLifecycle; }
        });

        // 创建 BattleEngine 并回填给 TowerSystem
        var battleEngine = createBattleEngine({
            screen: {
                getWidth: function() { return screenWidth; },
                getHeight: function() { return screenHeight; },
                getScale: getScreenScale
            },
            player: {
                getData: function() { return saveData; },
                getCharFullStats: function(id) { return getCharacterFullStats(id); },
                save: function() { /* no-op: auto-flush */ }
            },
            animation: {
                createStarBurst: function(x, y, t) { createStarBurstAnimation(x, y, t); },
                createScreenShake: function(i) { createScreenShake(i); },
                createMonsterDamage: function(x, y, d) { createMonsterDamageAnimation(x, y, d); },
                createPlayerDamage: function(d, b, p, t, s) { createPlayerDamageAnimation(d, b, p, t, s); },
                createMeteor: function(sx, sy, d, c, st, ss, cm, cb, ce) { return createMeteorAnimation(sx, sy, d, c, st, ss, cm, cb, ce); },
                createCrit: function(x, y, d, s, c) { createCritAnimation(x, y, d, s, c); },
                createQuickTap: function(x, y, s, t, f) { createQuickTapAnimation(x, y, s, t, f); },
                createScorePopup: function(x, y, s, c) { createScorePopupAnimation(x, y, s, c); },
                createMonsterProjectile: function(sx, sy, d, td, b, h) { createMonsterProjectileAnimation(sx, sy, d, td, b, h); },
                createHpBarCounter: function() { createHpBarCounterAnimation(); },
                createTimeDamage: function(d) { createTimeDamageAnimation(d); },
                createPetDamage: function(x, y, d, e, c) { createPetDamageAnimation(x, y, d, e, c); },
                addMessage: function(t, c, r) { addGameMessage(t, c, r); },
                vibrateShort: function(o) { try { $P.vibrateShort(o); } catch(e) {} },
                playCombo: function() { if (audioSystem) audioSystem.playCombo(); },
                playCritical: function() { if (audioSystem) audioSystem.playCritical(); },
                playHit: function() { if (audioSystem) audioSystem.playHit(); },
                playNormal: function() { if (audioSystem) audioSystem.playNormal(); },
                playPoisonClick: function() { if (audioSystem) audioSystem.playPoisonClick(); },
                playQuickTap: function() { if (audioSystem) audioSystem.playQuickTap(); },
                playHitEnemy: function() { if (audioSystem) audioSystem.playHitEnemy(); },
                playPetAttack: function() { if (audioSystem) audioSystem.playPetAttack(); },
                playRainbow: function(p) { if (audioSystem) audioSystem.playRainbow(p); }
            },
            combat: {
                getSeasonStarTypes: function() { return SEASON_STAR_TYPES; },
                updateCombo: function() { updateCombo(); },
                resetCombo: function() { resetCombo(); },
                getComboCount: function() { return comboState.count; },
                calculateStarScore: function(t) { return calculateStarScore(t); },
                getMonsterSkillType: function() { return MonsterSkillType; }
            },
            skills: {
                getConfig: function() { return Skills; },
                getTypes: function() { return SkillTypes; }
            },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },

            // playerEffects getter/setter（真相源读写）
            getPlayerDodging: function() { return playerEffects.dodging; },
            getPlayerDodgeEndTime: function() { return playerEffects.dodgeEndTime; },
            isPlayerStunned: function() { return playerEffects.isStunned(); },
            getPlayerStunEndTime: function() { return playerEffects.stunEndTime; },
            getPlayerPoisoned: function() { return playerEffects.poisoned; },
            getPlayerPoisonEndTime: function() { return playerEffects.poisonEndTime; },
            getPlayerPoisonDamage: function() { return playerEffects.poisonDamage; },
            getPlayerPoisonTickTime: function() { return playerEffects.poisonTickTime; },
            setPlayerDodging: function(val) { playerEffects.dodging = val; },
            setPlayerDodgeEndTime: function(val) { playerEffects.dodgeEndTime = val; },
            setPlayerStunned: function(val) { playerEffects.stunned = val; },
            setPlayerStunEndTime: function(val) { playerEffects.stunEndTime = val; },
            setPlayerPoisoned: function(val) { playerEffects.poisoned = val; },
            setPlayerPoisonEndTime: function(val) { playerEffects.poisonEndTime = val; },
            setPlayerPoisonDamage: function(val) { playerEffects.poisonDamage = val; },
            setPlayerPoisonTickTime: function(val) { playerEffects.poisonTickTime = val; }
        });
        towerSystem._setBattleEngine(battleEngine);
        window._tower = towerSystem; // 控制台快捷入口
        _log('爬塔系统模块初始化完成');

        // 初始化开发者战斗调参工具
        devBattleSystem = _gameModules.createDevBattleSystem({
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: getScreenScale,
            getBattleEngine: function() {
                // 优先返回当前活跃模式的引擎，避免推送到错误的引擎实例
                if (normalBattleAdapter && normalBattleAdapter.getBattleEngine) {
                    var nbe = normalBattleAdapter.getBattleEngine();
                    if (nbe) return nbe;
                }
                if (towerSystem && towerSystem._getBattleEngine) return towerSystem._getBattleEngine();
                if (typeof BossBattleMode !== 'undefined' && BossBattleMode.getBattleEngine) return BossBattleMode.getBattleEngine();
                return null;
            },
            onToggle: function(isVisible) {
                if (isVisible) {
                    previousState = state;
                    PauseCoordinator.instance.pause();
                    stateMachine.transitionTo(GAME_STATE.PAUSED);
                } else {
                    PauseCoordinator.instance.resume();
                    stateMachine.transitionTo(previousState);
                }
            },
            onSpecChanged: function(overrides) {
                // spec 参数已通过 BattleEngine.subscribe → StarSystem.onSpecChanged 自动推送
                // 这里只同步灵韵生成间隔到 comboState（供 getCurrentStarInterval 读取）
                var RC = _gameModules.specResolver(_gameModules.COMBAT_SPEC, Object.keys(overrides).length > 0 ? overrides : null);
                var newInterval = _gameModules.getSpecValue(RC, 'STAR.SPAWN_INTERVAL_MS');
                if (newInterval && newInterval !== comboState.currentStarInterval) {
                    comboState.currentStarInterval = newInterval;
                }
            },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });

        // 初始化挂机系统模块
        afkSystem = createAFKSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            addCharExp: function(charId, exp) { addCharacterExperience(charId, exp); },
            getEquipments: function() { return Equipments; },
            getScreenScale: getScreenScale,
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getBestScore: function() { return bestScore; },
            getTowerHighestFloor: function() { return saveData.infiniteTower ? saveData.infiniteTower.highestFloor : 0; },
            showToast: function(opts) { $P.showToast(opts); }
        });
        calculateAccumulatedAfkRewards = function() { return afkSystem.calculateAccumulatedAfkRewards(); };
        claimAfkRewards = function() { afkSystem.claimAfkRewards(); };
        _log('挂机系统模块初始化完成');

        // 初始化抽卡系统模块
        gachaSystem = createGachaSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            getSkills: function() { return Skills; },
            getCharacters: function() { return Characters; },
            getPets: function() { return Pets; },
            getStarTypes: function() { return SEASON_STAR_TYPES; },
            setGameState: function(s) { stateMachine.transitionTo(s); },
            getGameState: function() { return state; },
            getScreenScale: getScreenScale,
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        performGacha = function(count, poolType) { return gachaSystem.performGacha(count, poolType); };
        showGachaResults = function(results) { gachaSystem.showGachaResults(results); };
        startGachaAnimation = function(results, poolType) { gachaSystem.startGachaAnimation(results, poolType); };
        updateGachaAnimation = function() { gachaSystem.updateGachaAnimation(); };
        closeGachaAnimation = function() { gachaSystem.closeGachaAnimation(); };
        handleGachaAnimationClick = function(x, y) { gachaSystem.handleGachaAnimationClick(x, y); };
        handleGachaClick = function(x, y, scale) { gachaSystem.handleGachaClick(x, y, scale); };
        getGachaPoolRemainingDays = function() { return gachaSystem.getGachaPoolRemainingDays(); };
        checkGachaPoolRotation = function() { gachaSystem.checkGachaPoolRotation(); };
        _log('抽卡系统模块初始化完成');

        // 初始化角色经验系统模块
        characterSystem = createCharacterSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getCharacters: function() { return Characters; },
            getCharacterKey: getCharacterKey,
            getEquipments: function() { return Equipments; },
            getSkills: function() { return Skills; },
            getPets: function() { return Pets; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            addMessage: function(msg, color, isImportant) { addGameMessage(msg, color, isImportant); },
            getGameState: function() { return state; },
            getSeasonSelection: function() { return seasonSelection; }
        });
        initCharacterExperience = function(charId) { characterSystem.initCharacterExperience(charId); };
        getCharacterExperience = function(charId) { return characterSystem.getCharacterExperience(charId); };
        getExpForLevel = function(level) { return characterSystem.getExpForLevel(level); };
        addCharacterExperience = function(charId, exp) { characterSystem.addCharacterExperience(charId, exp); };
        getCharacterLevelBonus = function(charId) { return characterSystem.getCharacterLevelBonus(charId); };
        getCharacterStatsAtLevel = function(charKey, level) { return characterSystem.getCharacterStatsAtLevel(charKey, level); };
        getCharacterFullStats = function(charId) { return characterSystem.getCharacterFullStats(charId); };
        getPassiveSkillBonuses = function() { return characterSystem.getPassiveSkillBonuses(); };
        getCurrentCharacterConfig = function() { return characterSystem.getCurrentCharacterConfig(); };
        _log('角色经验系统模块初始化完成');

        // 初始化掉落系统模块
        dropSystem = createDropSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getScore: function() { return score; },
            getEquipments: function() { return Equipments; },
            getSkills: function() { return Skills; },
            getPets: function() { return Pets; },
            getStarChestDropRate: function() { return STAR_CHEST_DROP_RATE; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            addMessage: function(msg, color, isImportant) { addGameMessage(msg, color, isImportant); }
        });
        dropMaterial = function() { dropSystem.dropMaterial(); };
        dropEquipment = function(isBoss) { dropSystem.dropEquipment(isBoss); };
        dropSkill = function() { dropSystem.dropSkill(); };
        dropPet = function(isBoss) { dropSystem.dropPet(isBoss); };
        _log('掉落系统模块初始化完成');

        // 初始化材料使用系统模块
        materialSystem = createMaterialSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getMaterials: function() { return Materials; },
            getGameState: function() { return state; },
            getGameConst: function() { return GAME_STATE; },
            getSeasonStarTypes: function() { return SEASON_STAR_TYPES; },
            getSeasonSelection: function() { return seasonSelection; },
            getMaxCharacterLevel: function() { return MAX_CHARACTER_LEVEL; },
            getActiveBuffs: function() { return activeBuffs; },
            getComboScoreBonus: function() { return getComboScoreBonus(); },
            getPassiveSkillBonuses: function() { return getPassiveSkillBonuses(); },
            getCharacterStatsAtLevel: function(charKey, level) { return getCharacterStatsAtLevel(charKey, level); },
            getCharacterFullStats: function(charId) { return getCharacterFullStats(charId); },
            updateTaskProgress: function(type, val) { updateTaskProgress(type, val); },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            showToast: function(opts) { $P.showToast(opts); }
        });
        calculateStarScore = function(starType) { return materialSystem.calculateStarScore(starType); };
        calculateTotalAttack = function() { return materialSystem.calculateTotalAttack(); };
        useMaterial = function(materialId) { return materialSystem.useMaterial(materialId); };
        upgradeIceStar = function() { return materialSystem.upgradeIceStar(); };
        upgradeFireStar = function() { return materialSystem.upgradeFireStar(); };
        _log('材料使用系统模块初始化完成');

        // 初始化音频系统
        audioSystem = createAudioSystem({ sfx: AUDIO_CONFIG.sfx, bgm: AUDIO_CONFIG.bgm });
        audioSystem.init();

        // 初始化动画系统模块
        animationSystem = createAnimationSystem({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: getScreenScale,
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getMonster: function() { return monster; },
            getComboCount: function() { return comboState.count; },
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getStrokeRoundRect: function() { return strokeRoundRect; },
            combatFontConfig: function() { return combatFontConfig; },
            playMeteorSound: function(starType) { if (audioSystem) audioSystem.playMeteor(starType); },
            playDodgeHealSound: function() { if (audioSystem) audioSystem.playDodgeHeal(); },
            playMeteorImpactSound: function() { if (audioSystem) audioSystem.playMeteorImpact(); },
            getBeautyFrames: function() { return Assets.beautyFrames || []; },
            getBluelightImg: function() { return Assets.bluelightImg; }
        });
        createCritAnimation = function(x, y, damage, score, color) { animationSystem.createCritAnimation(x, y, damage, score, color); };
        updateCritAnimations = function() { animationSystem.updateCritAnimations(); };
        drawCritAnimations = function(scale) { animationSystem.drawCritAnimations(scale); };
        createMeteorAnimation = function(sx, sy, dmg, crit, st, ss, cm, cb, customEnd) { return animationSystem.createMeteorAnimation(sx, sy, dmg, crit, st, ss, cm, cb, customEnd); };
        updateMeteorAnimations = function() { animationSystem.updateMeteorAnimations(); };
        drawMeteorAnimations = function(scale) { animationSystem.drawMeteorAnimations(scale); };
        createMeteorHitEffect = function(x, y, dmg, crit, st) { animationSystem.createMeteorHitEffect(x, y, dmg, crit, st); };
        updateMeteorExplosions = function() { animationSystem.updateMeteorExplosions(); };
        drawMeteorExplosions = function(scale) { animationSystem.drawMeteorExplosions(scale); };
        createHpBarCounterAnimation = function() { animationSystem.createHpBarCounterAnimation(); };
        updateHpBarCounterAnimations = function() { animationSystem.updateHpBarCounterAnimations(); };
        drawHpBarCounterAnimations = function(scale) { animationSystem.drawHpBarCounterAnimations(scale); };
        createPlayerDamageAnimation = function(dmg, isBoss, isPoison, customText, isShield) { animationSystem.createPlayerDamageAnimation(dmg, isBoss, isPoison, customText, isShield); };
        updatePlayerDamageAnimations = function() { animationSystem.updatePlayerDamageAnimations(); };
        drawPlayerDamageAnimations = function(scale) { animationSystem.drawPlayerDamageAnimations(scale); };
        createMonsterDamageAnimation = function(x, y, dmg) { animationSystem.createMonsterDamageAnimation(x, y, dmg); };
        updateMonsterDamageAnimations = function() { animationSystem.updateMonsterDamageAnimations(); };
        drawMonsterDamageAnimations = function(scale) { animationSystem.drawMonsterDamageAnimations(scale); };
        createTimeDamageAnimation = function(x, y, dmg) { animationSystem.createTimeDamageAnimation(x, y, dmg); };
        updateTimeDamageAnimations = function() { animationSystem.updateTimeDamageAnimations(); };
        drawTimeDamageAnimations = function(scale) { animationSystem.drawTimeDamageAnimations(scale); };
        createQuickTapAnimation = function(x, y, score, tier, isF) { animationSystem.createQuickTapAnimation(x, y, score, tier, isF); };
        updateQuickTapAnimations = function() { animationSystem.updateQuickTapAnimations(); };
        drawQuickTapAnimations = function(scale) { animationSystem.drawQuickTapAnimations(scale); };
        createGoldDropAnimation = function(x, y, gold) { animationSystem.createGoldDropAnimation(x, y, gold); };
        updateGoldDropAnimations = function() { animationSystem.updateGoldDropAnimations(); };
        drawGoldDropAnimations = function(scale) { animationSystem.drawGoldDropAnimations(scale); };
        addGameMessage = function(text, color, isR) { animationSystem.addGameMessage(text, color, isR); };
        drawGameMessages = function(scale) { animationSystem.drawGameMessages(scale); };
        drawElementalComboEffect = function(scale) { animationSystem.drawElementalComboEffect(scale); };
        createSkillDamageAnimation = function(x, y, dmg, emoji) { animationSystem.createSkillDamageAnimation(x, y, dmg, emoji); };
        updateSkillDamageAnimations = function() { animationSystem.updateSkillDamageAnimations(); };
        drawSkillDamageAnimations = function(scale) { animationSystem.drawSkillDamageAnimations(scale); };
        createPetDamageAnimation = function(x, y, dmg, emoji, crit) { animationSystem.createPetDamageAnimation(x, y, dmg, emoji, crit); };
        updatePetDamageAnimations = function() { animationSystem.updatePetDamageAnimations(); };
        drawPetDamageAnimations = function(scale) { animationSystem.drawPetDamageAnimations(scale); };
        createMonsterProjectileAnimation = function(sx, sy, dmg, td, boss, onHit) { animationSystem.createMonsterProjectileAnimation(sx, sy, dmg, td, boss, onHit); };
        updateMonsterProjectileAnimations = function() { animationSystem.updateMonsterProjectileAnimations(); };
        drawMonsterProjectileAnimations = function(scale) { animationSystem.drawMonsterProjectileAnimations(scale); };
        createTapRippleAnimation = function(x, y, touchId) { animationSystem.createTapRippleAnimation(x, y, touchId); };
        updateTapRippleAnimations = function() { animationSystem.updateTapRippleAnimations(); };
        drawTapRippleAnimations = function(scale) { animationSystem.drawTapRippleAnimations(scale); };
        releaseTapRipple = function(touchId) { animationSystem.releaseTapRipple(touchId); };
        moveTapRipple = function(touchId, x, y) { animationSystem.moveTapRipple(touchId, x, y); };
        createStarBurstAnimation = function(x, y, starType) { animationSystem.createStarBurstAnimation(x, y, starType); };
        updateStarBurstAnimations = function() { animationSystem.updateStarBurstAnimations(); };
        drawStarBurstAnimations = function(scale) { animationSystem.drawStarBurstAnimations(scale); };
        updateMergeAnimations = function() { animationSystem.updateMergeAnimations(); };
        drawMergeAnimations = function(scale) { animationSystem.drawMergeAnimations(scale); };
        clearBattleAnimations = function() { animationSystem.clearAllAnimations(); };
        createScorePopupAnimation = function(x, y, score, color) { animationSystem.createScorePopupAnimation(x, y, score, color); };
        updateScorePopupAnimations = function() { animationSystem.updateScorePopupAnimations(); };
        drawScorePopupAnimations = function(scale) { animationSystem.drawScorePopupAnimations(scale); };
        createScreenShake = function(intensity) { animationSystem.createScreenShake(intensity); };
        updateScreenShake = function() { animationSystem.updateScreenShake(); };
        getScreenShakeOffset = function() { return animationSystem.getScreenShakeOffset(); };
        clearScreenShake = function() { animationSystem.clearScreenShake(); };
        getStarColor = function(st) { return animationSystem.getStarColor(st); };
        getStarGlowColor = function(st) { return animationSystem.getStarGlowColor(st); };
        easeOutQuad = function(t) { return animationSystem.easeOutQuad(t); };
        setElementalComboState = function(active, time) { animationSystem.setElementalComboState(active, time); };
        clearMessages = function() { animationSystem.clearMessages(); };
        clearAllAnimations = function() { animationSystem.clearAllAnimations(); };
        getLastVibrateTime = function() { return animationSystem.getLastVibrateTime(); };
        setLastVibrateTime = function(t) { animationSystem.setLastVibrateTime(t); };
        getVibrateCooldown = function() { return animationSystem.getVibrateCooldown(); };
        _log('动画系统模块初始化完成');

        // 初始化提示系统
        tipSystem = createTipSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: getScreenScale,
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        tipShowTipOnce = function(tipId, text) { tipSystem.showTipOnce(tipId, text); };
        tipUpdateTip = function() { tipSystem.updateTip(); };
        tipRenderTip = function(scale) { tipSystem.renderTip(scale); };
        tipHandleTipClick = function(x, y) { return tipSystem.handleTipClick(x, y); };
        tipGetStarTypeName = function(type) { return tipSystem.getStarTypeName(type); };
        _log('提示系统模块初始化完成');

        // 初始化连击系统
        comboSystem = createComboSystem({
            getCurrentCharacterConfig: function() { return getCurrentCharacterConfig(); },
            updateStarSpawnInterval: function() { updateStarSpawnInterval(); },
            updateTaskProgress: function(taskId, progress, isReplace) { updateTaskProgress(taskId, progress, isReplace); },
            updateTaskStats: function(key, val, isReplace) { updateTaskStats(key, val, isReplace); },
            getPassiveSkillBonuses: function() { return getPassiveSkillBonuses(); },
            setCurrentStarInterval: function(val) { comboState.currentStarInterval = val; },
            getBaseStarInterval: function() { return _getSpecAwareBaseStarInterval(); },
            getMinStarInterval: function() { return MIN_STAR_INTERVAL; }
        });
        getComboTimeout = function() { return comboSystem.getComboTimeout(); };
        updateCombo = function() { comboSystem.updateCombo(); var prevCombo = comboState.count; comboState.count = comboSystem.getComboCount(); comboState.lastComboTime = comboSystem.getLastComboTime(); if (comboState.count > prevCombo) { comboState.slideAnim = 0; comboState.slideTriggered = true; if (stageModeSystem) stageModeSystem.updateMaxCombo(comboState.count); } };
        resetCombo = function() { comboSystem.resetCombo(); comboState.count = 0; comboState.lastComboTime = 0; comboState.slideAnim = 0; comboState.slideTriggered = false; };
        checkComboTimeout = function() { comboSystem.checkComboTimeout(); comboState.count = comboSystem.getComboCount(); comboState.lastComboTime = comboSystem.getLastComboTime(); };
        getComboScoreBonus = function() { return comboSystem.getComboScoreBonus(); };
        _log('连击系统模块初始化完成');

        // 初始化宠物系统
        petSystem = createPetSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getPets: function() { return Pets; },
            getActiveMonsters: function() { return getActiveMonsters(); },
            getGameState: function() { return state; },
            getGameConst: function() { return GAME_STATE; },
            getStarThief: function() { return starThief; },
            getBossBattleMode: function() { return BossBattleMode; },
            getCurrentStarInterval: function() { return comboState.currentStarInterval; },
            setCurrentStarInterval: function(val) { comboState.currentStarInterval = val; },
            getBaseStarInterval: function() { return _getSpecAwareBaseStarInterval(); },
            getMinStarInterval: function() { return MIN_STAR_INTERVAL; },
            createPetDamageAnimation: function(x, y, dmg, emoji, crit) { createPetDamageAnimation(x, y, dmg, emoji, crit); },
            onMonsterKilled: function(m) { onMonsterKilled(m); },
            setMonsters: function(val) { monsters = val; },
            onPetAttack: function() { if (audioSystem) audioSystem.playPetAttack(); },
            addMessage: function(msg, color) { addGameMessage(msg, color); }
        });
        petAttackMonster = function() { petSystem.petAttackMonster(); };
        triggerPetSkill = function(pet, target) { petSystem.triggerPetSkill(pet, target); };
        startPetAttackTimer = function() { petSystem.startPetAttackTimer(); };
        updateMonsterBurnStatus = function() { petSystem.updateMonsterBurnStatus(); };
        stopPetAttackTimer = function() { petSystem.stopPetAttackTimer(); };
        _log('宠物系统模块初始化完成');

        // 初始化技能系统
        skillSystem = createSkillSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getSkills: function() { return Skills; },
            getSkillTypes: function() { return SkillTypes; },
            getActiveMonsters: function() { return getActiveMonsters(); },
            getGameState: function() { return state; },
            getGameConst: function() { return GAME_STATE; },
            getBossBattleMode: function() { return BossBattleMode; },
            getMonster: function() { return monster; },
            getCharacterFullStats: function(charId) { return getCharacterFullStats(charId); },
            getScreenScale: getScreenScale,
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getStars: function() { return stars; },
            setCurrentStarInterval: function(val) { comboState.currentStarInterval = val; },
            getBaseStarInterval: function() { return _getSpecAwareBaseStarInterval(); },
            getMinStarInterval: function() { return MIN_STAR_INTERVAL; },
            addTimeLeft: function(val) { timeLeft += val; },
            addMessage: function(msg, color, isImportant) { addGameMessage(msg, color, isImportant); },
            createCritAnimation: function(x, y, dmg, score, color) { createCritAnimation(x, y, dmg, score, color); },
            createSkillDamageAnimation: function(x, y, dmg, emoji) { createSkillDamageAnimation(x, y, dmg, emoji); },
            onMonsterKilled: function(m) { onMonsterKilled(m); },
            vibrateShort: function(opts) { $P.vibrateShort(opts); }
        });
        useSkill = function(skillId) { return skillSystem.useSkill(skillId); };
        getSkillRemainingCooldown = function(skillId) { return skillSystem.getSkillRemainingCooldown(skillId); };
        updateSkillEffects = function() { skillSystem.updateSkillEffects(); };
        getActiveSkillBonuses = function() { return skillSystem.getActiveSkillBonuses(); };
        isImmune = function() { return skillSystem.isImmune(); };
        _log('技能系统模块初始化完成');

        // 初始化怪物技能系统
        monsterSkillSystem = createMonsterSkillSystem({
            getCtx: function() { return ctx; }
        });
        triggerMonsterSkill = function(monster, skillType, context) { return monsterSkillSystem.triggerMonsterSkill(monster, skillType, context); };
        calculateMonsterDamage = function(monster) { return monsterSkillSystem.calculateMonsterDamage(monster); };
        calculateDamageToMonster = function(monster, baseDamage, starType) { return monsterSkillSystem.calculateDamageToMonster(monster, baseDamage, starType); };
        addMonsterSkillAnimation = function(monster, skillType, text) { monsterSkillSystem.addMonsterSkillAnimation(monster, skillType, text); };
        updateMonsterSkillAnimations = function() { monsterSkillSystem.updateMonsterSkillAnimations(); };
        drawMonsterSkillAnimations = function(scale, monsterX, monsterY, targetMonster) { monsterSkillSystem.drawMonsterSkillAnimations(scale, monsterX, monsterY, targetMonster); };
        _log('怪物技能系统模块初始化完成');

        // 初始化灵韵系统
        starSystem = createStarSystem({
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: getScreenScale,
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getGameState: function() { return state; },
            getGameConst: function() { return GAME_STATE; },
            getSeasonSelection: function() { return seasonSelection; },
            getStars: function() { return stars; },
            setStars: function(val) { stars = val; },
            pushStar: function(star) { stars.push(star); },
            getStarThief: function() { return starThief; },
            getMoveInterval: function() { return moveInterval; },
            setMoveInterval: function(val) { moveInterval = val; },
            getCurrentStarInterval: function() { return comboState.currentStarInterval; },
            setCurrentStarInterval: function(val) { comboState.currentStarInterval = val; },
            getSpecValueFn: function(path) {
                var engine = normalBattleAdapter && normalBattleAdapter.getBattleEngine ? normalBattleAdapter.getBattleEngine() : null;
                if (engine && engine.getEffectiveSpec()) return _gameModules.getSpecValue(engine.getEffectiveSpec(), path);
                return _gameModules.getSpecValue(_gameModules.COMBAT_SPEC, path);
            },
            combatSpec: _gameModules.COMBAT_SPEC,
            getPauseStartTime: function() { return pauseStartTime; },
            createMergeAnimation: function(x1,y1,t1,x2,y2,t2,cb) { animationSystem.createMergeAnimation(x1,y1,t1,x2,y2,t2,cb); },
            playMerge: function() { if (audioSystem) audioSystem.playMerge(); }
        });
        addNewStar = function() { starSystem.addNewStar(); };
        addRandomStar = function() { starSystem.addRandomStar(); };
        addFallingStar = function() { starSystem.addFallingStar(); };
        updateFallingStars = function() { starSystem.updateFallingStars(); };
        mergeStars = function() { starSystem.mergeStars(); };
        resetStar = function() { starSystem.resetStar(); };
        cleanupExpiredStars = function() { starSystem.cleanupExpiredStars(); };
        spawnDodgeStar = function() { starSystem.spawnDodgeStar(); };
        // 更新 updateStarSpawnInterval 桥接
        updateStarSpawnInterval = function() { starSystem.updateStarSpawnInterval(); };
        // 同步灵韵模式到 StarSystem（init 早期恢复 starMode 时 starSystem 还未创建）
        starSystem.setStarMode(starMode);
        _log('灵韵系统模块初始化完成，模式:', starMode);

        // 初始化商店系统
        shopSystem = createShopSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getActiveBuffs: function() { return activeBuffs; },
            setActiveBuffs: function(val) { activeBuffs = val; },
            getGameItems: function() { return gameItems; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            addCharExp: function(charId, exp) { addCharacterExperience(charId, exp); },
            addMessage: function(msg, color, isImportant) { addGameMessage(msg, color, isImportant); },
            performGacha: function(count, poolType) { return performGacha(count, poolType); },
            showGachaResults: function(results) { showGachaResults(results); },
            getGachaSystem: function() { return gachaSystem; },
            addTimeLeft: function(val) { timeLeft += val; },
            updateTaskProgress: function(taskId, progress, isReplace) { updateTaskProgress(taskId, progress, isReplace); },
            updateTaskStats: function(key, val, isReplace) { updateTaskStats(key, val, isReplace); },
            showToast: function(opts) { $P.showToast(opts); },
            showModal: function(opts) { $P.showModal(opts); },
            getPets: function() { return Pets; },
            getStarChestRewards: function() { return STAR_CHEST_REWARDS; }
        });
        purchaseShopItem = function(item) { return shopSystem.purchaseShopItem(item); };
        useItem = function(itemId) { return shopSystem.useItem(itemId); };
        resetBuffs = function() { shopSystem.resetBuffs(); };
        _log('商店系统模块初始化完成');

        // 初始化怪物生成系统
        monsterSpawnSystem = createMonsterSpawnSystem({
            getMonsters: function() { return monsters; },
            setMonsters: function(val) { monsters = val; },
            getScore: function() { return score; },
            getBestScore: function() { return bestScore; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getGameState: function() { return state; },
            getGameConst: function() { return GAME_STATE; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            getConfig: function() { return CONFIG; },
            getMonsterTypes: function() { return MonsterTypes; },
            getMonstersConfig: function() { return Monsters; },
            getMonsterGrowth: function() { return MonsterGrowth; },
            getMonsterRarityWeights: function() { return MonsterRarityWeights; },
            getMonstersKilled: function() { return monstersKilled; },
            getStarThief: function() { return starThief; },
            getMonsterSkillType: function() { return MonsterSkillType; },
            getMonsterAbsorbScore: function() { return MONSTER_ABSORB_SCORE; },
            getStarDevourerEscaped: function() { return combatState.starDevourerEscaped; },
            setStarDevourerEscaped: function(val) { combatState.starDevourerEscaped = val; },
            getVoidEmperorSpawned: function() { return combatState.voidEmperorSpawned; },
            setVoidEmperorSpawned: function(val) { combatState.voidEmperorSpawned = val; },
            getMonsterAttackInterval: function() { return monsterAttackInterval; },
            setMonsterAttackInterval: function(val) { monsterAttackInterval = val; },
            monsterAttackPlayer: function() { monsterAttackPlayer(); },
            initCharacterExp: function(charId) { initCharacterExperience(charId); },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            showToast: function(opts) { $P.showToast(opts); },
            showTipOnce: function(tipId, text) { if (tipShowTipOnce) tipShowTipOnce(tipId, text); },
            getSeasonScore: function() { return seasonScore; },
            getNormalBattleAdapter: function() { return normalBattleAdapter; },
            getPlayerHpScaling: function(pd) { return getPlayerHpScaling(pd || saveData); },
            getPlayerAtkScaling: function(pd) { return getPlayerAtkScaling(pd || saveData); },
            getAwakeStage: function(pd) { return getAwakeStage(pd || saveData); },
            getAwakeConfig: function() { return AWAKE_CONFIG; }
        });
        getMonsterInstance = function(monsterId, level) { return monsterSpawnSystem.getMonsterInstance(monsterId, level); };
        getAvailableMonsters = function(score) { return monsterSpawnSystem.getAvailableMonsters(score); };
        getAvailableBosses = function(score) { return monsterSpawnSystem.getAvailableBosses(score); };
        getRandomMonster = function(score) { return monsterSpawnSystem.getRandomMonster(score); };
        getMonsterTypeByScore = function(score) { return monsterSpawnSystem.getMonsterTypeByScore(score); };
        getBossTypeByScore = function(score) { return monsterSpawnSystem.getBossTypeByScore(score); };
        createMonster = function(type, x, y, options) { return monsterSpawnSystem.createMonster(type, x, y, options); };
        calculateMonsterPositions = function(count, baseY) { return monsterSpawnSystem.calculateMonsterPositions(count, baseY); };
        checkUnlockCharacter = function() { monsterSpawnSystem.checkUnlockCharacter(); };
        checkMonsterAppear = function() { if (_tutorial.active) return; monsterSpawnSystem.checkMonsterAppear(); };
        spawnMonster = function(type, options) { return monsterSpawnSystem.spawnMonster(type, options); };
        getActiveMonster = function() { return monsterSpawnSystem.getActiveMonster(); };
        getActiveMonsters = function() { return monsterSpawnSystem.getActiveMonsters(); };
        _log('怪物生成系统模块初始化完成');

        // 初始化毒液滩系统
        poisonPuddleSystem = createPoisonPuddleSystem({
            getScreenScale: getScreenScale,
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getCtx: function() { return ctx; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });

        // 初始化Boss灵韵机制
        bossStarSystem = createBossStarSystem({
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: getScreenScale,
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            getStars: function() { return stars; },
            setStars: function(val) { stars = val; },
            pushStar: function(star) { stars.push(star); },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            addMessage: function(msg, color, isImportant) { addGameMessage(msg, color, isImportant); },
            checkGameOver: function() { checkGameOver(); },
            vibrateShort: function(opts) { $P.vibrateShort(opts); }
        });
        triggerBossStarSkill = function(bossMonster) { bossStarSystem.triggerBossStarSkill(bossMonster); };
        checkBossStarPenalty = function(bossMonster) { bossStarSystem.checkBossStarPenalty(bossMonster); };
        resetBossStarMechanic = function() { bossStarSystem.resetBossStarMechanic(); };
        removeBossStar = function(bossStarId) { bossStarSystem.removeBossStar(bossStarId); };
        incrementBossAttackCount = function() { return bossStarSystem.incrementBossAttackCount(); };
        _log('Boss灵韵机制模块初始化完成');

        // 初始化渲染器
        uiCoreRenderer = createUICoreRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: getScreenScale,
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getStarThief: function() { return starThief; },
            getSEASON_STAR_TYPES: function() { return SEASON_STAR_TYPES; },
            BACK_BTN_WIDTH: BACK_BTN_WIDTH,
            BACK_BTN_HEIGHT: BACK_BTN_HEIGHT,
            BACK_BTN_COLOR: BACK_BTN_COLOR,
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        monsterDrawRenderer = createMonsterDrawRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: getScreenScale,
            uiCore: uiCoreRenderer,
            getFillRoundRect: function() { return fillRoundRect; },
            getMonsterTypes: function() { return MonsterTypes; },
            getActiveMonsters: function() { return getActiveMonsters(); },
            getStarThief: function() { return starThief; },
            getPoisonPuddleSystem: function() { return poisonPuddleSystem; },
            getAssets: function() { return Assets; },
            drawMonsterSkillAnimations: function(scale, x, y, m) { drawMonsterSkillAnimations(scale, x, y, m); },
            updateMonsterSkillAnimations: function() { updateMonsterSkillAnimations(); }
        });
        // 替换全局绘制函数为渲染器委托
        drawText = function(t, x, y, s, c) { uiCoreRenderer.drawText(t, x, y, s, c); };
        drawButton = function(t, x, y, w, h, c, e) { uiCoreRenderer.drawButton(t, x, y, w, h, c, e); };
        drawBackButton = function() { uiCoreRenderer.drawBackButton(); };
        isBackButtonClicked = function(x, y) { return uiCoreRenderer.isBackButtonClicked(x, y); };
        drawStar = function(obj, x, y, s, sc) { uiCoreRenderer.drawStar(obj, x, y, s, sc); };
        drawMonster = function() { monsterDrawRenderer.drawMonster(); };
        drawSingleMonster = function(m, i, t) { monsterDrawRenderer.drawSingleMonster(m, i, t); };
        drawPoisonPuddles = function(scale) { monsterDrawRenderer.drawPoisonPuddles(scale); };

        afkRenderer = createAFKRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getAfkSystem: function() { return afkSystem; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getCalculateAccumulatedAfkRewards: function() { return calculateAccumulatedAfkRewards; },
            getClaimAfkRewards: function() { return claimAfkRewards; },
            getFillRoundRect: function() { return fillRoundRect; },
            getGachaRoundRect: function() { return gachaRoundRect; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        renderAfkPopup = function() { afkRenderer.renderAfkPopup(); };
        renderAfkResultPopup = function() { afkRenderer.renderAfkResultPopup(); };
        renderAfkButton = function() { afkRenderer.renderAfkButton(); };
        handleAfkPopupTouch = function(x, y) { return afkRenderer.handleAfkPopupTouch(x, y); };
        handleAfkButtonTouch = function(x, y) { return afkRenderer.handleAfkButtonTouch(x, y); };
        handleAfkResultTouch = function(x, y) { return afkRenderer.handleAfkResultTouch(x, y); };

        menuRenderer = createMenuRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            uiCore: uiCoreRenderer,
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getBestScore: function() { return bestScore; },
            getScore: function() { return score; },
            getStarMode: function() { return starMode; },
            getSTAR_MODE: function() { return STAR_MODE; },
            getFALLING_CONFIG: function() { return FALLING_CONFIG; },
            getUiScrollState: function() { return uiScrollState; },
            getDebugPanelOpen: function() { return debugPanelOpen; },
            getCharacters: function() { return Characters; },
            getCharacterKey: getCharacterKey,
            isModeUnlocked: isModeUnlocked,
            getSkills: function() { return Skills; },
            getPets: function() { return Pets; },
            getCharacterExperience: function(cid) { return getCharacterExperience(cid); },
            getCharacterLevelBonus: function(cid) { return getCharacterLevelBonus(cid); },
            getCalculateTotalAttack: function() { return calculateTotalAttack(); },
            getHasClaimableRewards: function() { return hasClaimableRewards; },
            getLeaderboardSharedCanvas: function() { return leaderboardSharedCanvas; },
            getCurrentLeaderboardTab: function() { return currentLeaderboardTab; },
            setCurrentLeaderboardTab: function(tab) { currentLeaderboardTab = tab; },
            getGameState: function() { return GAME_STATE; },
            getSeasonScore: function() { return seasonScore; },
            getSeasonBestScore: function() { return seasonBestScore; },
            getMonstersKilled: function() { return saveData.taskProgress.stats.monstersKilled; },
            getSeasonRank: function() { return getSeasonRank(); },
            getSeasonContent: function() { return seasonContent; },
            getSeasonLeaderboard: function() { return seasonLeaderboard; },
            getSeasonSelection: function() { return seasonSelection; },
            getAdSystem: function() { return adSystem; },
            getTimeLeft: function() { return timeLeft; },
            uiConfig: uiConfig
        });
        renderMenu = function() { menuRenderer.renderMenu(); };
        renderMenuBar = function() { menuRenderer.renderMenuBar(); };
        renderGameOver = function() { menuRenderer.renderGameOver(); };
        renderPausedMenu = function() { menuRenderer.renderPausedMenu(); };
        renderLeaderboard = function() { menuRenderer.renderLeaderboard(); };
        renderSettings = function() { menuRenderer.renderSettings(); };

        seasonRenderer = createSeasonRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            uiCore: uiCoreRenderer,
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getStrokeRoundRect: function() { return strokeRoundRect; },
            getCharacters: function() { return Characters; },
            getSkills: function() { return Skills; },
            getPets: function() { return Pets; },
            getSeasonContent: function() { return seasonContent; },
            getSeasonSelection: function() { return seasonSelection; },
            setSeasonSelection: function(v) { seasonSelection = v; },
            getUiScrollState: function() { return uiScrollState; },
            getSeasonBestScore: function() { return seasonBestScore; },
            getSeasonRank: function() { return getSeasonRank(); },
            getSeasonLeaderboard: function() { return seasonLeaderboard; },
            getSEASON_STAR_TYPES: function() { return SEASON_STAR_TYPES; },
            getMAX_CHARACTER_LEVEL: function() { return MAX_CHARACTER_LEVEL; },
            getCharacterStatsAtLevel: function(cid, lv) { return getCharacterStatsAtLevel(cid, lv); },
            initSeasonContent: function() { initSeasonContent(); },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getLog: function() { return _log; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            // 交互委托 deps
            isBackButtonClicked: function(x, y) { return isBackButtonClicked(x, y); },
            transitionTo: function(s) { stateMachine.transitionTo(s); },
            getGameConst: function() { return GAME_STATE; },
            showToast: function(opts) { $P.showToast(opts); },
            savePlayerData: function() {},
            startSeasonGame: function() { startSeasonGame(); },
            initOpenDataContext: function() { initOpenDataContext(); },
            sendLeaderboardMessage: function(key, value) { sendLeaderboardMessage(key, value); },
            getCurrentLeaderboardTab: function() { return currentLeaderboardTab; },
            setCurrentLeaderboardTab: function(v) { currentLeaderboardTab = v; },
            getOpenDataContext: function() { return openDataContext; },
            getDataStore: function() { return dataStore; }
        });
        renderSeasonMenu = function() { seasonRenderer.renderSeasonMenu(); };
        renderSeasonSelect = function() { seasonRenderer.renderSeasonSelect(); };
        renderSeasonLeaderboard = function() { seasonRenderer.renderSeasonLeaderboard(); };

        taskRenderer = createTaskRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            uiCore: uiCoreRenderer,
            getAssets: function() { return Assets; },
            getTasksWithProgress: function(tab) { return getTasksWithProgress(tab); },
            getTasksTab: function() { return tasksTab; },
            getTasksScrollY: function() { return tasksScrollY; },
            setTasksScrollY: function(val) { tasksScrollY = val; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        renderTasks = function() { taskRenderer.renderTasks(); };

        debugRenderer = createDebugRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getFillRoundRect: function() { return fillRoundRect; },
            getStrokeRoundRect: function() { return strokeRoundRect; },
            getGodMode: function() { return godMode; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        renderDebugPanel = function() { debugRenderer.renderDebugPanel(); };

        shopRenderer = createShopRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            uiCore: uiCoreRenderer,
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getStrokeRoundRect: function() { return strokeRoundRect; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getUiScrollState: function() { return uiScrollState; },
            ShopItems: ShopItems,
            Pets: Pets,
            GACHA_POOLS: GACHA_POOLS,
            getGachaSystem: function() { return gachaSystem; },
            getMonthlyCardSystem: function() { return monthlyCardSystem; },
            getCombatState: function() { return combatState; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        renderShop = function() { shopRenderer.renderShop(); };
        renderShopMaterialsTab = function() { shopRenderer.renderShopMaterialsTab(); };
        renderShopBuffsTab = function() { shopRenderer.renderShopBuffsTab(); };
        renderShopItemsTab = function() { shopRenderer.renderShopItemsTab(); };
        renderShopGachaTab = function() { shopRenderer.renderShopGachaTab(); };
        renderShopPetsTab = function() { shopRenderer.renderShopPetsTab(); };
        renderShopMonthlyTab = function() { shopRenderer.renderShopMonthlyTab(); };

        backpackRenderer = createBackpackRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            uiCore: uiCoreRenderer,
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getStrokeRoundRect: function() { return strokeRoundRect; },
            getGachaRoundRect: function() { return gachaRoundRect; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getUiScrollState: function() { return uiScrollState; },
            Materials: Materials,
            Characters: Characters,
            getCharacterKey: getCharacterKey,
            Skills: Skills,
            SkillTypes: SkillTypes,
            Pets: Pets,
            PetRarity: PetRarity,
            Equipments: Equipments,
            EquipmentTypes: EquipmentTypes,
            EquipmentRarity: EquipmentRarity,
            SEASON_STAR_TYPES: SEASON_STAR_TYPES,
            MAX_CHARACTER_LEVEL: MAX_CHARACTER_LEVEL,
            getCharacterExperience: function(cid) { return getCharacterExperience(cid); },
            getCharacterStatsAtLevel: function(cid, lv) { return getCharacterStatsAtLevel(cid, lv); },
            calculateTotalAttack: function() { return calculateTotalAttack(); },
            getFaithSystem: function() { return faithSystem; },
            getCharacterFullStats: function(charId) { return getCharacterFullStats(charId); },
            savePlayerData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            showToast: function(opts) { $P.showToast(opts); },
            getMaxActiveSkills: function() { return MAX_ACTIVE_SKILLS; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        renderBackpack = function() { backpackRenderer.renderBackpack(); };
        renderMaterialsTab = function() { backpackRenderer.renderMaterialsTab(); };
        renderCharactersTab = function() { backpackRenderer.renderCharactersTab(); };
        renderStarsTab = function() { backpackRenderer.renderStarsTab(); };
        renderItemsTab = function() { backpackRenderer.renderItemsTab(); };
        renderEquipmentsTab = function() { backpackRenderer.renderEquipmentsTab(); };

        // ===== 融合系统实例化 =====
        fusionRegistry = createFusionRegistry({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ }
        });
        var fusionCharStrategy = createFusionCharacterStrategy({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getCharacters: function() { return Characters; }
        });
        var fusionPetStrategy = createFusionPetStrategy({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getPets: function() { return Pets; }
        });
        var fusionSkillStrategy = createFusionSkillStrategy({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getSkills: function() { return Skills; }
        });
        var fusionStarStrategy = createFusionStarStrategy({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getStarTypes: function() {
                var map = {};
                for (var i = 0; i < SEASON_STAR_TYPES.length; i++) {
                    map[SEASON_STAR_TYPES[i].id] = SEASON_STAR_TYPES[i];
                }
                return map;
            },
            getSeasonStarTypes: function() { return SEASON_STAR_TYPES; }
        });
        var fusionEquipStrategy = createFusionEquipmentStrategy({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getEquipments: function() { return Equipments; }
        });
        fusionEngine = createFusionEngine({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            showToast: function(opts) { $P.showToast(opts); },
            getRegistry: function() { return fusionRegistry; },
            strategies: {
                character: fusionCharStrategy,
                pet: fusionPetStrategy,
                skill: fusionSkillStrategy,
                star: fusionStarStrategy,
                equipment: fusionEquipStrategy
            }
        });

        // 跨会话恢复：把持久化的融合产物重新注册到配置表
        (function restoreFusionProducts() {
            var fr = saveData.fusionResults;
            if (!fr) return;
            var keys = Object.keys(fr);
            for (var i = 0; i < keys.length; i++) {
                var r = fr[keys[i]];
                if (!r || !r.type || !r.id) continue;
                if (r.type === 'pet' && Pets && !Pets[r.id]) {
                    Pets[r.id] = {
                        id: r.id, name: r.name, rarity: r.rarity,
                        attack: (r.stats && r.stats.attack) || 0,
                        attackSpeed: (r.stats && r.stats.attackSpeed) || 2,
                        description: '融合产物·' + (r.evolutionType || ''),
                        emoji: r.emoji || '🐾', skill: r.skill || null
                    };
                } else if (r.type === 'equipment' && Equipments && !Equipments[r.id]) {
                    Equipments[r.id] = {
                        id: r.id, name: r.name, type: r.slot, rarity: r.rarity,
                        description: '神锻装备·' + (r.forgeAffix || ''),
                        emoji: r.emoji || '⚔️',
                        attack: (r.stats && r.stats.attack) || 0,
                        critRate: (r.stats && r.stats.critRate) || 0,
                        critDamage: (r.stats && r.stats.critDamage) || 0
                    };
                } else if (r.type === 'skill' && Skills && !Skills[r.id]) {
                    Skills[r.id] = {
                        id: r.id, name: r.name, type: r.compositeType || 'attack',
                        rarity: r.rarity, cooldown: r.cooldown || 30,
                        description: '复合技能·' + (r.compositeType || ''),
                        emoji: r.emoji || '✨',
                        effect: r.compositeType || 'damage',
                        damage: (r.stats && r.stats.damage) || 0
                    };
                } else if (r.type === 'character' && Characters && !Characters[r.id]) {
                    Characters[r.id] = {
                        id: r.id, name: r.name, emoji: r.emoji || '⭐',
                        rarity: r.rarity, element: r.element || 'none',
                        description: '融合角色·' + (r.element || ''),
                        hp: (r.stats && r.stats.hp) || 100, hpGrowth: 10,
                        attack: (r.stats && r.stats.attack) || 10, attackGrowth: 2,
                        critRate: 5, critRateGrowth: 1,
                        critDamage: 10, critDamageGrowth: 0.1,
                        mana: 5, manaGrowth: 1,
                        faith: 5, faithGrowth: 1,
                        defense: 5, defenseGrowth: 1
                    };
                } else if (r.type === 'star' && typeof SEASON_STAR_TYPES !== 'undefined') {
                    var exists = false;
                    for (var s = 0; s < SEASON_STAR_TYPES.length; s++) {
                        if (SEASON_STAR_TYPES[s].id === r.starType) { exists = true; break; }
                    }
                    if (!exists) {
                        SEASON_STAR_TYPES.push({ id: r.starType, name: r.name || r.starType, rarity: 'SR' });
                    }
                }
            }
        })();
        fusionRenderer = createFusionRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getFusionEngine: function() { return fusionEngine; },
            getFusionRegistry: function() { return fusionRegistry; },
            uiCore: uiCoreRenderer,
            getFillRoundRect: function() { return fillRoundRect; },
            getAssets: function() { return Assets; },
            showToast: function(opts) { $P.showToast(opts); },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        var upgradeCharStrategy = createUpgradeCharacterStrategy({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getCharacters: function() { return Characters; }
        });
        var upgradeEquipStrategy = createUpgradeEquipmentStrategy({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getEquipments: function() { return Equipments; }
        });
        var upgradeSkillStrategy = createUpgradeSkillStrategy({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getSkills: function() { return Skills; }
        });
        var upgradePetStrategy = createUpgradePetStrategy({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getPets: function() { return Pets; }
        });
        var upgradeStarStrategy = createUpgradeStarStrategy({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getSeasonStarTypes: function() { return SEASON_STAR_TYPES; }
        });

        upgradeEngine = createUpgradeEngine({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            showToast: function(opts) { $P.showToast(opts); },
            strategies: {
                character: upgradeCharStrategy,
                equipment: upgradeEquipStrategy,
                skill: upgradeSkillStrategy,
                pet: upgradePetStrategy,
                star: upgradeStarStrategy
            }
        });

        upgradeRenderer = createUpgradeRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getUpgradeEngine: function() { return upgradeEngine; },
            uiCore: uiCoreRenderer,
            getFillRoundRect: function() { return fillRoundRect; },
            getAssets: function() { return Assets; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        renderSkillsTab = function() { backpackRenderer.renderSkillsTab(); };
        renderPetsTab = function() { backpackRenderer.renderPetsTab(); };
        renderFaithTab = function() { backpackRenderer.renderFaithTab(); };

        gachaRenderer = createGachaRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            uiCore: uiCoreRenderer,
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getGachaRoundRect: function() { return gachaRoundRect; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getGachaSystem: function() { return gachaSystem; },
            getStarSystem: function() { return starSystem; },
            getGachaAnimationConfig: function() { return GACHA_ANIMATION_CONFIG; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        renderGachaAnimation = function() { gachaRenderer.renderGachaAnimation(); };
        renderGachaStarfield = function() { gachaRenderer.renderGachaStarfield(); };
        renderFlyingStar = function(i) { gachaRenderer.renderFlyingStar(i); };
        renderRevealedStars = function() { gachaRenderer.renderRevealedStars(); };
        renderGachaConfirmButton = function() { gachaRenderer.renderGachaConfirmButton(); };

        stageRenderer = createStageRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            uiCore: uiCoreRenderer,
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getStrokeRoundRect: function() { return strokeRoundRect; },
            getGachaRoundRect: function() { return gachaRoundRect; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getSTAGES: function() { return STAGES; },
            getCHAPTERS: function() { return CHAPTERS; },
            getUiScrollState: function() { return uiScrollState; },
            getGameState: function() { return GAME_STATE; },
            getStarSystem: function() { return starSystem; },
            getSelectedChapter: function() { return selectedChapter; },
            setSelectedChapter: function(v) { selectedChapter = v; },
            getIsStageUnlocked: function(id) { return isStageUnlocked(id); },
            getDifficultyColor: function(d) { return getDifficultyColor(d); },
            getStageModeSystem: function() { return stageModeSystem; },
            getMaterials: function() { return Materials; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            // 交互委托 deps
            isBackButtonClicked: function(x, y) { return isBackButtonClicked(x, y); },
            transitionTo: function(s) { stateMachine.transitionTo(s); },
            showToast: function(opts) { $P.showToast(opts); },
            startStage: function(stageId) { startStage(stageId); },
            getStageModeCurrent: function() { return StageMode.currentStage; }
        });
        renderStageSelect = function() { stageRenderer.renderStageSelect(); };
        renderStageResult = function() { stageRenderer.renderStageResult(); };

        squadRenderer = createSquadRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            uiCore: uiCoreRenderer,
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getStrokeRoundRect: function() { return strokeRoundRect; },
            getGachaRoundRect: function() { return gachaRoundRect; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getUiScrollState: function() { return uiScrollState; },
            Characters: Characters,
            getCharacterKey: getCharacterKey,
            Skills: Skills,
            SkillTypes: SkillTypes,
            Pets: Pets,
            PetRarity: PetRarity,
            Equipments: Equipments,
            EquipmentTypes: EquipmentTypes,
            EquipmentRarity: EquipmentRarity,
            SEASON_STAR_TYPES: SEASON_STAR_TYPES,
            MAX_CHARACTER_LEVEL: MAX_CHARACTER_LEVEL,
            getCharacterExperience: function(cid) { return getCharacterExperience(cid); },
            getCharacterStatsAtLevel: function(cid, lv) { return getCharacterStatsAtLevel(cid, lv); },
            getCharacterFullStats: function(cid) { return getCharacterFullStats(cid); },
            calculateTotalAttack: function() { return calculateTotalAttack(); },
            getStarSystem: function() { return starSystem; },
            getSquadTab: function() { return squadTab; },
            getShowPortraitLarge: function() { return showPortraitLarge; },
            isBackButtonClicked: function(x, y) { return isBackButtonClicked(x, y); },
            setSquadTab: function(tab) { squadTab = tab; },
            setShowPortraitLarge: function(val) { showPortraitLarge = val; },
            getGameConst: function() { return GAME_STATE; },
            transitionTo: function(s) { stateMachine.transitionTo(s); },
            savePlayerData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            showToast: function(opts) { $P.showToast(opts); },
            log: function() { _log.apply(null, arguments); },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            onTutorialComplete: function() { _pendingSpaceKeyTutorial = false; }
        });
        renderSquad = function() {
            if (_pendingSpaceKeyTutorial && squadRenderer.setTutorialHighlight) {
                squadRenderer.setTutorialHighlight('dodge');
            }
            squadRenderer.renderSquad();
        };
        renderPortraitLarge = function() { squadRenderer.renderPortraitLarge(); };
        renderSquadCharacter = function() { squadRenderer.renderSquadCharacter(); };
        renderSquadEquipment = function() { squadRenderer.renderSquadEquipment(); };
        renderSquadSkills = function() { squadRenderer.renderSquadSkills(); };
        renderSquadPets = function() { squadRenderer.renderSquadPets(); };
        renderSquadStars = function() { squadRenderer.renderSquadStars(); };

        bossRenderer = createBossRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            uiCore: uiCoreRenderer,
            isBackButtonClicked: function(x, y) { return isBackButtonClicked(x, y); },
            transitionTo: function(s) { stateMachine.transitionTo(s); },
            GAME_STATE: GAME_STATE,
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getBossBattleSystem: function() { return bossBattleSystem; },
            getBossStarSystem: function() { return bossStarSystem; },
            getEquipments: function() { return Equipments; },
            getEquipmentRarity: function() { return EquipmentRarity; },
            BOSS_LIST: BOSS_LIST,
            getBossBattleMode: function() { return BossBattleMode; },
            getMaterials: function() { return Materials; },
            getSkills: function() { return Skills; },
            getBossSelectIsDragging: function() { return bossSelectIsDragging; },
            setBossSelectScrollY: function(v) { bossSelectScrollY = v; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            getModeLifecycle: function() { return modeLifecycle; }
        });
        renderBossBattleResult = function() { bossRenderer.renderBossBattleResult(); };
        renderBossSelect = function() { bossRenderer.renderBossSelect(); };

        towerRenderer = createTowerRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            uiCore: uiCoreRenderer,
            isBackButtonClicked: function(x, y) { return isBackButtonClicked(x, y); },
            transitionTo: function(s) { stateMachine.transitionTo(s); },
            getAudioSystem: function() { return audioSystem; },
            getWorldMapSystem: function() { return worldMapSystem; },
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getStrokeRoundRect: function() { return strokeRoundRect; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getTowerSystem: function() { return towerSystem; },
            getCombatState: function() { return combatState; },
            getComboState: function() { return comboState; },
            getTowerConfig: function() { return TOWER_CONFIG; },
            getGameState: function() { return GAME_STATE; },
            getCombatFeatures: function() { return getCombatFeatures(); },
            getCurrentCharacterConfig: function() {
                var cid = saveData.currentCharacterId || 'char_001';
                return Characters[getCharacterKey(cid)];
            },
            getUpdateCritAnimations: function() { return updateCritAnimations; },
            getDrawCritAnimations: function() { return drawCritAnimations; },
            getUpdateQuickTapAnimations: function() { return updateQuickTapAnimations; },
            getDrawQuickTapAnimations: function() { return drawQuickTapAnimations; },
            getUpdateMeteorAnimations: function() { return updateMeteorAnimations; },
            getDrawMeteorAnimations: function() { return drawMeteorAnimations; },
            getUpdateMeteorExplosions: function() { return updateMeteorExplosions; },
            getDrawMeteorExplosions: function() { return drawMeteorExplosions; },
            getUpdateMonsterProjectileAnimations: function() { return updateMonsterProjectileAnimations; },
            getDrawMonsterProjectileAnimations: function() { return drawMonsterProjectileAnimations; },
            getUpdateHpBarCounterAnimations: function() { return updateHpBarCounterAnimations; },
            getDrawHpBarCounterAnimations: function() { return drawHpBarCounterAnimations; },
            getUpdatePlayerDamageAnimations: function() { return updatePlayerDamageAnimations; },
            getDrawPlayerDamageAnimations: function() { return drawPlayerDamageAnimations; },
            getUpdateMonsterDamageAnimations: function() { return updateMonsterDamageAnimations; },
            getDrawMonsterDamageAnimations: function() { return drawMonsterDamageAnimations; },
            getUpdateStarBurstAnimations: function() { return updateStarBurstAnimations; },
            getDrawStarBurstAnimations: function() { return drawStarBurstAnimations; },
            getDrawGameMessages: function() { return drawGameMessages; },
            getUpdateTimeDamageAnimations: function() { return updateTimeDamageAnimations; },
            getDrawTimeDamageAnimations: function() { return drawTimeDamageAnimations; }
        });
        renderTower = function() { towerRenderer.renderTower(); };
        renderHiddenPathDialog = function() { towerRenderer.renderHiddenPathDialog(); };
        renderBattle = function() { towerRenderer.renderBattle(); };
        renderTowerResult = function() { towerRenderer.renderTowerResult(); };
        renderTowerResume = function() { towerRenderer.renderTowerResume(); };

        gameBattleRenderer = createGameBattleRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            uiCore: uiCoreRenderer,
            getAssets: function() { return Assets; },
            getFillRoundRect: function() { return fillRoundRect; },
            getStrokeRoundRect: function() { return strokeRoundRect; },
            getGachaRoundRect: function() { return gachaRoundRect; },
            getState: function() { return state; },
            getGameState: function() { return GAME_STATE; },
            getSaveData: function() { return dataStore.combined; },
            getRuntimeData: function() { return runtimeData; },
            getScore: function() { return score; },
            getTimeLeft: function() { return timeLeft; },
            getBestScore: function() { return bestScore; },
            getStarMode: function() { return starMode; },
            getStarSystem: function() { return starSystem; },
            getComboSystem: function() { return comboSystem; },
            getPetSystem: function() { return petSystem; },
            getActiveMonsters: function() { return getActiveMonsters(); },
            getCombatState: function() { return combatState; },
            getPlayerEffects: function() { return playerEffects; },
            getUiScrollState: function() { return uiScrollState; },
            getBossBattleMode: function() { return BossBattleMode; },
            getNormalBattleAdapter: function() { return normalBattleAdapter; },
            getTowerSystem: function() { return towerSystem; },
            getBossBattleSystem: function() { return bossBattleSystem; },
            getBossStarSystem: function() { return bossStarSystem; },
            getStageModeSystem: function() { return stageModeSystem; },
            getCombatFeatures: function() { return getCombatFeatures(); },
            getStarThief: function() { return starThief; },
            getAnimationSystem: function() { return animationSystem; },
            combatFontConfig: function() { return combatFontConfig; },
            getSEASON_STAR_TYPES: function() { return SEASON_STAR_TYPES; },
            getUpdatePoisonEffect: function() { return updatePoisonEffect; },
            getDrawPoisonEffect: function() { return drawPoisonEffect; },
            getUpdateCritAnimations: function() { return updateCritAnimations; },
            getDrawCritAnimations: function() { return drawCritAnimations; },
            getUpdateQuickTapAnimations: function() { return updateQuickTapAnimations; },
            getDrawQuickTapAnimations: function() { return drawQuickTapAnimations; },
            getUpdateMeteorAnimations: function() { return updateMeteorAnimations; },
            getDrawMeteorAnimations: function() { return drawMeteorAnimations; },
            getUpdateMeteorExplosions: function() { return updateMeteorExplosions; },
            getDrawMeteorExplosions: function() { return drawMeteorExplosions; },
            getUpdateMonsterProjectileAnimations: function() { return updateMonsterProjectileAnimations; },
            getDrawMonsterProjectileAnimations: function() { return drawMonsterProjectileAnimations; },
            getDrawGameMessages: function() { return drawGameMessages; },
            getUpdateStarBurstAnimations: function() { return updateStarBurstAnimations; },
            getDrawStarBurstAnimations: function() { return drawStarBurstAnimations; },
            getUpdateHpBarCounterAnimations: function() { return updateHpBarCounterAnimations; },
            getDrawHpBarCounterAnimations: function() { return drawHpBarCounterAnimations; },
            getUpdatePlayerDamageAnimations: function() { return updatePlayerDamageAnimations; },
            getDrawPlayerDamageAnimations: function() { return drawPlayerDamageAnimations; },
            getUpdateMonsterDamageAnimations: function() { return updateMonsterDamageAnimations; },
            getDrawMonsterDamageAnimations: function() { return drawMonsterDamageAnimations; },
            getDrawMonsterSkillAnimations: function(scale, x, y, m) { drawMonsterSkillAnimations(scale, x, y, m); },
            getUpdateMonsterSkillAnimations: function() { updateMonsterSkillAnimations(); },
            getUpdateTimeDamageAnimations: function() { return updateTimeDamageAnimations; },
            getDrawTimeDamageAnimations: function() { return drawTimeDamageAnimations; },
            STAR_MODE: STAR_MODE,
            MAX_STARS_ON_SCREEN: MAX_STARS_ON_SCREEN,
            BASE_STAR_INTERVAL: BASE_STAR_INTERVAL,
            MIN_STAR_INTERVAL: MIN_STAR_INTERVAL,
            FALLING_CONFIG: FALLING_CONFIG,
            SEASON_STAR_TYPES: SEASON_STAR_TYPES,
            checkComboTimeout: function() { checkComboTimeout(); },
            updateFallingStars: function(dt) { updateFallingStars(dt); },
            checkMonsterAppear: function() { checkMonsterAppear(); },
            updateSkillEffects: function() { updateSkillEffects(); },
            attackMonster: function(dmg, crit, type, target) { return attackMonster(dmg, crit, type, target); },
            updateMonsterAnimation: function() { updateMonsterAnimation(); },
            updateGoldDropAnimations: function() { updateGoldDropAnimations(); },
            drawGoldDropAnimations: function(s) { drawGoldDropAnimations(s); },
            updateSkillDamageAnimations: function() { updateSkillDamageAnimations(); },
            drawSkillDamageAnimations: function(s) { drawSkillDamageAnimations(s); },
            updatePetDamageAnimations: function() { updatePetDamageAnimations(); },
            drawPetDamageAnimations: function(s) { drawPetDamageAnimations(s); },
            drawElementalComboEffect: function(s) { drawElementalComboEffect(s); },
            updatePoisonEffect: function() { updatePoisonEffect(); },
            getMonster: function() { return monster; },
            getStars: function() { return stars; },
            getSeasonScore: function() { return seasonScore; },
            getPlayerHp: function() { return saveData.playerHp; },
            setStars: function(val) { stars = val; },
            setMonsters: function(val) { monsters = val; },
            setTimeLeft: function(val) { timeLeft = val; },
            comboState: comboState,
            Skills: Skills,
            SkillTypes: SkillTypes,
            COMBO_STAR_DURATION: COMBO_STAR_DURATION,
            COMBO_STAR_INTERVAL: COMBO_STAR_INTERVAL,
            GREEDY_SKILL_THRESHOLD: GREEDY_SKILL_THRESHOLD,
            MAX_AD_ITEMS: MAX_AD_ITEMS,
            getGameItems: function() { return gameItems; },
            getAdItems: function() { return adItems; },
            tipShowTipOnce: function(key, text) { tipShowTipOnce(key, text); },
            getCharacterFullStats: function(id) { return getCharacterFullStats(id); },
            calculateCritFn: function() { return normalBattleAdapter.calculateCrit(saveData); },
            getActiveMonster: function() { return monster; },
            createMeteorAnimation: function(x, y, dmg, crit, type, el, mul, cb) { createMeteorAnimation(x, y, dmg, crit, type, el, mul, cb); },
            getSkillRemainingCooldown: function(id) { return getSkillRemainingCooldown(id); },
            getCurrentCharacterConfig: function() { return getCurrentCharacterConfig(); },
            cleanupExpiredStars: function() { cleanupExpiredStars(); },
            updatePoisonPuddles: function() { updatePoisonPuddles(); },
            drawPoisonPuddles: function(s) { drawPoisonPuddles(s); },
            renderPausedMenu: function() { renderPausedMenu(); },
            drawMonster: function() { drawMonster(); },
            _log: function() { _log.apply(null, arguments); },
            getBirthTransform: function(star, now) { return getBirthTransform(star, now); },
            getRhythmSystem: function() { return rhythmSystem; },
            getChargeSystem: function() { return chargeSystem; },
            getDragSystem: function() { return dragSystem; },
            getLinkChainSystem: function() { return linkChainSystem; },
            getSaturationState: function() { return saturationState; },
            getRhythmSkillSystem: function() { return rhythmSkillSystem; }
        });
        renderGame = function() { gameBattleRenderer.renderGame(); };

        // MonsterBattleSystem 已删除，战斗逻辑全部走 NormalBattleAdapter
        singleMonsterAttack = function(m) { normalBattleAdapter.singleMonsterAttack(m); };
        monsterAttackPlayer = function() { normalBattleAdapter.monsterAttackPlayer(); };
        useGreedySkill = function() { return normalBattleAdapter.useGreedySkill(combatState.greedySkillUnlocked); };
        checkGameOver = function() { normalBattleAdapter.checkGameOver(); };
        updateMonsterAnimation = function() { normalBattleAdapter.updateMonsterAnimation(); };
        attackMonster = function(damage, isCritical, starType, targetMonster, skipKill) {
            return normalBattleAdapter.attackMonster(damage, isCritical, starType, targetMonster);
        };
        attackMonstersAOE = function(damagePlan) {
            return normalBattleAdapter.attackMonstersAOE(damagePlan);
        };
        killMonster = function(isElementalCombo, targetMonster) { normalBattleAdapter.killMonster(isElementalCombo, targetMonster); };
        onMonsterKilled = function(targetMonster) { normalBattleAdapter.onMonsterKilled(targetMonster); };
        updatePoisonEffect = function() { normalBattleAdapter.updatePoisonEffect(); };
        addMaterialToBackpack = function(matId, amount) { _log('addMaterialToBackpack: matId=', matId, 'amount=', amount, '(待实现)'); };
        endStage = function(killedMonster) {
            if (state === GAME_STATE.STAGE_PLAYING && stageModeSystem) {
                stageModeSystem.onMonsterDefeated(killedMonster);
            }
        };
        _log('怪物战斗系统模块初始化完成');

        // 初始化赛季系统
        seasonSystem = createSeasonSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getCharacters: function() { return Characters; },
            spawnDodgeStar: function() { spawnDodgeStar(); },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            getSeasonContent: function() { return seasonContent; },
            setSeasonContent: function(val) { seasonContent = val; },
            getSeasonSelection: function() { return seasonSelection; },
            setSeasonSelection: function(val) { seasonSelection = val; },
            getSeasonScore: function() { return seasonScore; },
            setSeasonScore: function(val) { seasonScore = val; },
            getSeasonBestScore: function() { return seasonBestScore; },
            setSeasonBestScore: function(val) { seasonBestScore = val; },
            getSeasonLeaderboard: function() { return seasonLeaderboard; },
            setSeasonLeaderboard: function(val) { seasonLeaderboard = val; }
        });
        getCurrentSeasonWeek = function() { return seasonSystem.getCurrentSeasonWeek(); };
        getMondayOfWeek = function() { return seasonSystem.getMondayOfWeek(); };
        getSeasonSeed = function() { return seasonSystem.getSeasonSeed(); };
        seededRandom = function(seed) { return seasonSystem.seededRandom(seed); };
        generateSeasonContent = function() { return seasonSystem.generateSeasonContent(); };
        initSeasonContent = function() { seasonSystem.initSeasonContent(); };
        generateMockSeasonLeaderboard = function() { return seasonSystem.generateMockSeasonLeaderboard(); };
        getSeasonRank = function() { return seasonSystem.getSeasonRank(); };
        startDodgeStarTimer = function() { seasonSystem.startDodgeStarTimer(); };
        stopDodgeStarTimer = function() { seasonSystem.stopDodgeStarTimer(); };
        _log('赛季系统模块初始化完成');

        // 初始化月卡系统
        monthlyCardSystem = createMonthlyCardSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getScreenWidth: function() { return screenWidth; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            showToast: function(opts) { $P.showToast(opts); },
            getRewardedVideoAd: function() { return adSystem ? adSystem.getRewardedVideoAd() : null; },
            isAdLoaded: function() { return adSystem ? adSystem.isAdLoaded() : false; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });
        isMonthlyCardClaimedToday = function(cardType) { return monthlyCardSystem.isMonthlyCardClaimedToday(cardType); };
        getTodayString = function() { return monthlyCardSystem.getTodayString(); };
        handleMonthlyCardClick = function(x, y, scale) { monthlyCardSystem.handleMonthlyCardClick(x, y, scale); };
        handleSmallMonthlyCardClick = function() { monthlyCardSystem.handleSmallMonthlyCardClick(); };
        handleLargeMonthlyCardClick = function() { monthlyCardSystem.handleLargeMonthlyCardClick(); };
        watchAdForMonthlyCard = function(cardType) { monthlyCardSystem.watchAdForMonthlyCard(cardType); };
        addMonthlyCardDays = function(cardType, days) { monthlyCardSystem.addMonthlyCardDays(cardType, days); };
        claimMonthlyCardReward = function(cardType) { monthlyCardSystem.claimMonthlyCardReward(cardType); };
        _log('月卡系统模块初始化完成');

        // 广告系统（已移除）
        adSystem = {
            initAds: function() {},
            showRewardedVideoAd: function() {},
            showItemAd: function() {},
            handleItemAdReward: function() {},
            showTimeCrystalAd: function() {},
            getRewardedVideoAd: function() { return null; },
            isAdLoaded: function() { return false; }
        };
        initAds = function() {};
        showRewardedVideoAd = function() {};
        showItemAd = function() {};
        handleItemAdReward = function() {};
        showTimeCrystalAd = function() {};

        // 闯关模式系统
        stageModeSystem = _gameModules.createStageModeSystem({
            getSTAGES: function() { return STAGES; },
            getMonsterTypes: function() { return MonsterTypes; },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getCharacterFullStats: function(charId) { return getCharacterFullStats(charId); },
            addCharacterExperience: function(charId, exp) { addCharacterExperience(charId, exp); },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            setGameState: function(s) { stateMachine.transitionTo(s); },
            getGameState: function() { return state; },
            GAME_STATE: GAME_STATE,
            getStageSelectScrollY: function() { return uiScrollState.stageSelectScrollY; },
            getSelectedChapter: function() { return selectedChapter; },
            getStageCriticalCount: function() { return stageCriticalCount; },
            getStagePerfectCount: function() { return stagePerfectCount; },
            getStageDamageTaken: function() { return stageDamageTaken; },
            // 全局状态
            getMonsters: function() { return monsters; },
            setMonsters: function(val) { monsters = val; },
            setStars: function(val) { stars = val; },
            addNewStar: function() { addNewStar(); },
            getCurrentStarInterval: function() { return comboState.currentStarInterval; },
            createMonster: function(type, x, y, options) { return createMonster(type, x, y, options); },
            // 全局定时器
            clearTimerInterval: function() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } },
            setTimerInterval: function(id) { timerInterval = id; },
            clearMoveInterval: function() { if (moveInterval) { clearInterval(moveInterval); moveInterval = null; } },
            setMoveInterval: function(id) { moveInterval = id; },
            clearMonsterAttackInterval: function() { if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; } },
            setMonsterAttackInterval: function(id) { monsterAttackInterval = id; },
            monsterAttackPlayer: function() { monsterAttackPlayer(); },
            startDodgeStarTimer: function() { startDodgeStarTimer(); },
            stopDodgeStarTimer: function() { stopDodgeStarTimer(); },
            startPetAttackTimer: function() { startPetAttackTimer(); },
            stopPetAttackTimer: function() { stopPetAttackTimer(); },
            resetCombo: function() { resetCombo(); },
            clearMessages: function() { clearMessages(); },
            clearAllAnimations: function() { clearAllAnimations(); },
            setTimeLeft: function(val) { timeLeft = val; },
            getNormalBattleAdapter: function() { return normalBattleAdapter; }
        });
        isStageUnlocked = function(stageId) { return stageModeSystem.isStageUnlocked(stageId); };
        getDifficultyColor = function(difficulty) { return stageModeSystem.getDifficultyColor(difficulty); };
        startStage = function(stageId) {
            stageCriticalCount = 0;
            stagePerfectCount = 0;
            stageDamageTaken = 0;
            modeLifecycle.transitionTo('stage', { stageId: stageId });
        };
        _log('闯关模式系统模块初始化完成');

        // Boss战系统（BattleEngine 适配器）
        bossBattleSystem = _gameModules.createBossBattleAdapter({
            getSaveData: function() { return dataStore.combined; },
            getRuntimeData: function() { return runtimeData; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getCharacterFullStats: function(charId) { return getCharacterFullStats(charId); },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            saveDataImmediate: function() { dataStore.flush(); },
            flushData: function() { dataStore.flush(); },
            saveBestScore: function() { saveBestScore(); },
            setGameState: function(s) { stateMachine.transitionTo(s); },
            getGameState: function() { return state; },
            GAME_STATE: GAME_STATE,
            getBOSS_LIST: function() { return BOSS_LIST; },
            getBOSS_BATTLE_CONFIG: function() { return BOSS_BATTLE_CONFIG; },
            getBOSS_STUN_CHANCE: function() { return BOSS_STUN_CHANCE; },
            getBOSS_STUN_DURATION: function() { return BOSS_STUN_DURATION; },
            getPlayerEffects: function() { return playerEffects; },
            clearTimerInterval: function() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } },
            clearMoveInterval: function() { if (moveInterval) { clearInterval(moveInterval); moveInterval = null; } },
            clearMonsterAttackInterval: function() { if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; } },
            setTimerInterval: function(id) { timerInterval = id; },
            setMoveInterval: function(id) { moveInterval = id; },
            setMonsterAttackInterval: function(id) { monsterAttackInterval = id; },
            getTimerInterval: function() { return timerInterval; },
            getMoveInterval: function() { return moveInterval; },
            getMonsterAttackInterval: function() { return monsterAttackInterval; },
            getScore: function() { return score; },
            setScore: function(val) { score = val; },
            getTimeLeft: function() { return timeLeft; },
            setTimeLeft: function(val) { timeLeft = val; },
            addTimeLeft: function(sec) { timeLeft += sec; },
            subtractTimeLeft: function(sec) { timeLeft = Math.max(0, timeLeft - sec); },
            getComboCount: function() { return comboState.count; },
            setComboCount: function(val) { if (val > comboState.count) { comboState.slideAnim = 0; comboState.slideTriggered = true; } comboState.count = val; },
            getLastComboTime: function() { return comboState.lastComboTime; },
            setLastComboTime: function(val) { comboState.lastComboTime = val; },
            getCurrentStarInterval: function() { return comboState.currentStarInterval; },
            setCurrentStarInterval: function(val) { comboState.currentStarInterval = val; },
            getStars: function() { return stars; },
            setStars: function(val) { stars = val; },
            getMonstersKilled: function() { return monstersKilled; },
            setMonstersKilled: function(val) { monstersKilled = val; },
            getMonsters: function() { return monsters; },
            setMonsters: function(val) { monsters = val; },
            getMonster: function() { return monster; },
            setMonsterHp: function(val) { monster.hp = val; },
            getStarMode: function() { return starMode; },
            getSTAR_MODE: function() { return STAR_MODE; },
            getFallingConfig: function() { return FALLING_CONFIG; },
            getBaseStarInterval: function() { return _getSpecAwareBaseStarInterval(); },
            resetCombo: function() { resetCombo(); },
            clearMessages: function() { clearMessages(); },
            addMessage: function(msg, color, isImportant) { addGameMessage(msg, color, isImportant); },
            createMonster: function(id, x, y, opts) { return createMonster(id, x, y, opts); },
            addNewStar: function() { addNewStar(); },
            startDodgeStarTimer: function() { startDodgeStarTimer(); },
            stopDodgeStarTimer: function() { stopDodgeStarTimer(); },
            startPetAttackTimer: function() { startPetAttackTimer(); },
            stopPetAttackTimer: function() { stopPetAttackTimer(); },
            getPauseStartTime: function() { return pauseStartTime; },
            setPauseStartTime: function(val) { pauseStartTime = val; },
            getGameItems: function() { return gameItems; },
            getAdItems: function() { return adItems; },
            getMAX_GAME_ITEMS: function() { return MAX_GAME_ITEMS; },
            getSkillSystem: function() { return skillSystem; },
            getComboStarActive: function() { return combatState.comboStarActive; },
            setComboStarActive: function(val) { combatState.comboStarActive = val; },
            getComboStarStartTime: function() { return combatState.comboStarStartTime; },
            setComboStarStartTime: function(val) { combatState.comboStarStartTime = val; },
            getComboStarLastAttackTime: function() { return combatState.comboStarLastAttackTime; },
            setComboStarLastAttackTime: function(val) { combatState.comboStarLastAttackTime = val; },
            getComboStarTimer: function() { return combatState.comboStarTimer; },
            setComboStarTimer: function(val) { combatState.comboStarTimer = val; },
            updateCombo: function() { updateCombo(); },
            getComboScoreBonus: function() { return getComboScoreBonus(); },
            calculateTotalAttack: function() { return calculateTotalAttack(); },
            getPlayerDodging: function() { return playerEffects.dodging; },
            setPlayerDodging: function(val) { playerEffects.dodging = val; },
            getPlayerDodgeEndTime: function() { return playerEffects.dodgeEndTime; },
            setPlayerDodgeEndTime: function(val) { playerEffects.dodgeEndTime = val; },
            getPlayerStunned: function() { return playerEffects.stunned; },
            setPlayerStunned: function(val) { playerEffects.stunned = val; },
            getPlayerStunEndTime: function() { return playerEffects.stunEndTime; },
            setPlayerStunEndTime: function(val) { playerEffects.stunEndTime = val; },
            getGreedyHpPool: function() { return combatState.greedyHpPool; },
            setGreedyHpPool: function(val) { combatState.greedyHpPool = val; },
            getGreedySkillUnlocked: function() { return combatState.greedySkillUnlocked; },
            setGreedySkillUnlocked: function(val) { combatState.greedySkillUnlocked = val; },
            getGreedySkillThreshold: function() { return GREEDY_SKILL_THRESHOLD; },
            getDodgeDuration: function() { return DODGE_DURATION; },
            createMeteorAnimation: function(x, y, dmg, crit, type, score, count, cb) { createMeteorAnimation(x, y, dmg, crit, type, score, count, cb); },
            createCritAnimation: function(x, y, dmg, delay, color) { createCritAnimation(x, y, dmg, delay, color); },
            createPlayerDamageAnimation: function(dmg, isBoss, isPoison, customText, isShield) { createPlayerDamageAnimation(dmg, isBoss, isPoison, customText, isShield); },
            createTimeDamageAnimation: function(dmg) { createTimeDamageAnimation(dmg); },
            createMonsterDamageAnimation: function(m, dmg) { createMonsterDamageAnimation(m, dmg); },
            createHpBarCounterAnimation: function() { createHpBarCounterAnimation(); },
            removeBossStar: function(id) { removeBossStar(id); },
            useItem: function(type) { useItem(type); },
            showItemAd: function(type) { showItemAd(type); },
            useSkill: function(id) { useSkill(id); },
            useGreedySkill: function() { useGreedySkill(); },
            vibrateShort: function(type) { try { $P.vibrateShort({ type: type }); } catch(e) {} },
            // 史莱姆王技能依赖
            setPlayerPoisoned: function(val) { playerEffects.poisoned = val; },
            setPlayerPoisonEndTime: function(val) { playerEffects.poisonEndTime = val; },
            setPlayerPoisonDamage: function(val) { playerEffects.poisonDamage = val; },
            setPlayerPoisonTickTime: function(val) { playerEffects.poisonTickTime = val; },
            addMonsterSkillAnimation: function(m, type, text) { if (monsterSkillSystem) monsterSkillSystem.addMonsterSkillAnimation(m, type, text); },
            spawnPoisonPuddles: function(mx, my, skill) { spawnPoisonPuddles(mx, my, skill); },
            getMonstersConfig: function() { return Monsters; },
            getMonsterTypes: function() { return MonsterTypes; },
            calculateMonsterPositions: function(count, y) { return calculateMonsterPositions(count, y); },
            clearPoisonPuddles: function() { poisonPuddleSystem.clearPoisonPuddles(); },
            // BattleEngine 额外动画依赖
            createStarBurstAnimation: function(x, y, t) { createStarBurstAnimation(x, y, t); },
            createScreenShake: function(i) { createScreenShake(i); },
            createQuickTapAnimation: function(x, y, s, t, f) { createQuickTapAnimation(x, y, s, t, f); },
            createMonsterProjectileAnimation: function(sx, sy, d, td, b, h) { createMonsterProjectileAnimation(sx, sy, d, td, b, h); },
            createPetDamageAnimation: function(x, y, d, e, c) { createPetDamageAnimation(x, y, d, e, c); },
            // BattleEngine 战斗依赖
            getSeasonStarTypes: function() { return SEASON_STAR_TYPES; },
            updateCombo: function() { updateCombo(); },
            getMonsterSkillType: function() { return MonsterSkillType; },
            getSkillsConfig: function() { return Skills; },
            getSkillTypes: function() { return SkillTypes; },
            // BattleEngine 音效依赖
            playCombo: function() { if (audioSystem) audioSystem.playCombo(); },
            playCritical: function() { if (audioSystem) audioSystem.playCritical(); },
            playHit: function() { if (audioSystem) audioSystem.playHit(); },
            playNormal: function() { if (audioSystem) audioSystem.playNormal(); },
            playPoisonClick: function() { if (audioSystem) audioSystem.playPoisonClick(); },
            playQuickTap: function() { if (audioSystem) audioSystem.playQuickTap(); },
            playHitEnemy: function() { if (audioSystem) audioSystem.playHitEnemy(); },
            playPetAttack: function() { if (audioSystem) audioSystem.playPetAttack(); },
            playRainbow: function(p) { if (audioSystem) audioSystem.playRainbow(p); },
            // NormalBattleAdapter 统一点击路径
            initBossEngineFn: function(engine, config, afterDamageHook) { normalBattleAdapter.initBossEngine(engine, config, afterDamageHook); },
            releaseBossEngineFn: function() { normalBattleAdapter.releaseEngine(); },
            updateStarSpawnInterval: function() { updateStarSpawnInterval(); }
        });
        getStarBaseScore = function(type) { return bossBattleSystem.getStarBaseScore(type); };
        _log('Boss战系统模块初始化完成');

        // D2-D5 战斗维度系统
        rhythmSystem = _gameModules.createRhythmSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            addMessage: function(msg, color) { addGameMessage(msg, color); },
            isTutorialComplete: function() { return runtimeData.tutorialCompleted; }
        });
        _log('D5 节拍判定系统初始化完成');

        saturationState = _gameModules.createSaturationState();
        _log('饱和度(体力条)系统初始化完成');

        chargeSystem = _gameModules.createChargeSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            isTutorialComplete: function() { return runtimeData.tutorialCompleted; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getStars: function() { return stars; },
            setStars: function(val) { stars = val; },
            getActiveMonsters: function() { 
                if (state === GAME_STATE.TOWER_COMBAT && towerSystem && towerSystem.combatMonster) {
                    return towerSystem.combatMonster.active !== false ? [towerSystem.combatMonster] : [];
                }
                return monsters.filter(function(m) { return m.active; }); 
            },
            addMessage: function(msg, color) { addGameMessage(msg, color); },
            createScreenShake: function(i) { createScreenShake(i); },
            applyDamageToMonster: function(m, dmg) { if (normalBattleAdapter) normalBattleAdapter.attackMonster(dmg, false, 'charge', m); },
            attackMonster: function(dmg, crit, type, target) { if (normalBattleAdapter) normalBattleAdapter.attackMonster(dmg, crit, type, target); },
            saturationState: saturationState,
            drawStar: function(starObj, x, y, size, sc) { if (drawStar) drawStar(starObj, x, y, size, sc); },
            addScore: function(pts) { score += pts; },
            addLinkCharge: function(pts) { if (linkChainSystem) linkChainSystem.addCharge(pts); },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            calculateTotalAttack: function() { return calculateTotalAttack(); },
            createMeteorAnimation: function(sx, sy, dmg, crit, st, ss, cm, cb, customEnd) { return createMeteorAnimation(sx, sy, dmg, crit, st, ss, cm, cb, customEnd); },
            playFocus: function() { if (audioSystem) audioSystem.playFocus(); },
            playFocusStage: function(p) { if (audioSystem) audioSystem.playFocusStage(p); },
            playChargeRelease: function() { if (audioSystem) audioSystem.playChargeRelease(); },
            playDragProjectile: function() { if (audioSystem) audioSystem.playDragProjectile(); },
            playNormal: function() { if (audioSystem) audioSystem.playNormal(); }
        });

        dragSystem = _gameModules.createDragSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            isTutorialComplete: function() { return runtimeData.tutorialCompleted; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getStars: function() { return stars; },
            setStars: function(val) { stars = val; },
            addMessage: function(msg, color) { addGameMessage(msg, color); },
            vibrateShort: function(type) { try { $P.vibrateShort({ type: type }); } catch(e) {} },
            saturationState: saturationState,
            getActiveMonsters: function() {
                if (state === GAME_STATE.TOWER_COMBAT && towerSystem && towerSystem.combatMonster) {
                    return towerSystem.combatMonster.active !== false ? [towerSystem.combatMonster] : [];
                }
                return monsters.filter(function(m) { return m.active; });
            },
            attackMonster: function(dmg, crit, type, target) { attackMonster(dmg, crit, type, target); },
            addScore: function(pts) { score += pts; },
            addLinkCharge: function(pts) { if (linkChainSystem) linkChainSystem.addCharge(pts); },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            createMeteorAnimation: function(sx, sy, dmg, crit, st, ss, cm, cb, customEnd) { return createMeteorAnimation(sx, sy, dmg, crit, st, ss, cm, cb, customEnd); },
            getStarImage: function() { return Assets.normalStarImage; },
            getTotalAttack: function() { return calculateTotalAttack ? calculateTotalAttack() : 0; },
            playDragProjectile: function() { if (audioSystem) audioSystem.playDragProjectile(); }
        });
        _log('D3 拖拽聚合系统初始化完成');

        linkChainSystem = _gameModules.createLinkChainSystem({
            getSaveData: function() { return saveData; },
            isTutorialComplete: function() { return runtimeData.tutorialCompleted; },
            getRuntimeData: function() { return runtimeData; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getStars: function() { return stars; },
            setStars: function(newStars) { stars = newStars; },
            getActiveMonsters: function() {
                if (state === GAME_STATE.TOWER_COMBAT && towerSystem && towerSystem.combatMonster) {
                    return towerSystem.combatMonster.active !== false ? [towerSystem.combatMonster] : [];
                }
                return monsters.filter(function(m) { return m.active; });
            },
            addMessage: function(msg, color, important) { addGameMessage(msg, color, important); },
            createScreenShake: function(i) { createScreenShake(i); },
            vibrateShort: function(type) { try { $P.vibrateShort({ type: type }); } catch(e) {} },
            attackMonster: function(dmg, crit, type, target) { attackMonster(dmg, crit, type, target); },
            attackMonstersAOE: function(plan) { attackMonstersAOE(plan); },
            addScore: function(pts) { score += pts; },
            saturationState: saturationState,
            getBeautyFrames: function() { return Assets.beautyFrames || []; },
            rhythmSkillSystem: null,  // 后注入
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            playLinkStart: function() { if (audioSystem) audioSystem.playLinkStart(); },
            playNormal: function() { if (audioSystem) audioSystem.playNormal(); },
            createMonsterDamageAnimation: function(obj, dmg) { animationSystem.createMonsterDamageAnimation(obj, dmg); },
            createMeteor: function(sx, sy, dmg, crit, st, ss, cm, cb, customEnd) { createMeteorAnimation(sx, sy, dmg, crit, st, ss, cm, cb, customEnd); },
            playRainbow: function(pitch) { if (audioSystem) audioSystem.playRainbow(pitch); },
            playQuickTap: function() { if (audioSystem) audioSystem.playQuickTap(); }
        });
        _log('D4 灵光联连系统初始化完成');

        // D4-节奏技系统（在 linkChainSystem 之后创建，通过回调通信）
        rhythmSkillSystem = _gameModules.createRhythmSkillSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getActiveMonsters: function() {
                if (state === GAME_STATE.TOWER_COMBAT && towerSystem && towerSystem.combatMonster) {
                    return towerSystem.combatMonster.active !== false ? [towerSystem.combatMonster] : [];
                }
                return monsters.filter(function(m) { return m.active; });
            },
            addMessage: function(msg, color, important) { addGameMessage(msg, color, important); },
            createScreenShake: function(i) { createScreenShake(i); },
            vibrateShort: function(type) { try { $P.vibrateShort({ type: type }); } catch(e) {} },
            addScore: function(pts) { score += pts; },
            saturationState: saturationState,
            getBeautyFrames: function() { return Assets.beautyFrames || []; },
            getStars: function() { return stars; },
            applyDamage: function(m, dmg) { if (normalBattleAdapter) normalBattleAdapter.attackMonster(dmg, false, 'charge', m); },
            attackMonster: function(dmg, crit, type, target) { if (normalBattleAdapter) normalBattleAdapter.attackMonster(dmg, crit, type, target); },
            attackMonstersAOE: function(plan) { if (normalBattleAdapter) normalBattleAdapter.attackMonstersAOE(plan); },
            createMeteor: function(sx, sy, dmg, crit, st, ss, cm, cb, customEnd) { createMeteorAnimation(sx, sy, dmg, crit, st, ss, cm, cb, customEnd); },
            playerEffects: playerEffects,
            onComplete: function() { linkChainSystem.onRhythmSkillComplete(); },
playQte: function() { if (audioSystem) audioSystem.playQte(); },
            playUiSkip: function() { if (audioSystem) audioSystem.playUiSkip(); },
            playQteActivate: function() { if (audioSystem) audioSystem.playQteActivate(); },
            calculateStarScore: function(t) { return calculateStarScore(t); },
            calculateTotalAttack: function() { return calculateTotalAttack(); },
            createMonsterDamageAnimation: function(obj, dmg) { animationSystem.createMonsterDamageAnimation(obj, dmg); }
        });
        // 后注入 rhythmSkillSystem 到 linkChainSystem
        linkChainSystem._injectRhythmSkillSystem(rhythmSkillSystem);
        _log('D4-节奏技系统初始化完成');

        touchGestureSystem = _gameModules.createTouchGestureSystem({
            chargeSystem: chargeSystem,
            dragSystem: dragSystem,
            linkChainSystem: linkChainSystem,
            rhythmSystem: rhythmSystem,
            getStars: function() { return stars; },
            getPlayerEffects: function() { return playerEffects; }
        });
        _log('手势协调系统初始化完成');

        // 统一触摸管道 — 待普通战斗适配器创建后初始化

        // 普通战斗适配器（BattleEngine — Phase 3 灵韵点击迁移）
        normalBattleAdapter = _gameModules.createNormalBattleAdapter({
            getGameState: function() { return state; },
            getGameConst: function() { return GAME_STATE; },
            getSaveData: function() { return dataStore.combined; },
            getRuntimeData: function() { return runtimeData; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            // 灵韵
            getStars: function() { return stars; },
            setStars: function(val) { stars = val; },
            // 怪物
            getActiveMonster: function() { return monster; },
            getActiveMonsters: function() {
                if (state === GAME_STATE.TOWER_COMBAT && towerSystem && towerSystem.combatMonster) {
                    return towerSystem.combatMonster.active !== false ? [towerSystem.combatMonster] : [];
                }
                return monsters.filter(function(m) { return m.active; });
            },
            getMonsters: function() { return monsters; },
            setMonsters: function(val) { monsters = val; },
            // 战斗系统
            getMonsterBattleSystem: function() { return normalBattleAdapter; },
            attackMonster: function(dmg, crit, type, target, skipKill) { return normalBattleAdapter.attackMonster(dmg, crit, type, target); },
            onMonsterKilled: function(target) { normalBattleAdapter.onMonsterKilled(target); },
            // 分数
            getScore: function() { return score; },
            setScore: function(val) { score = val; },
            getSeasonScore: function() { return seasonScore; },
            setSeasonScore: function(val) { seasonScore = val; },
            getStageModeSystem: function() { return stageModeSystem; },
            // 角色属性
            calculateTotalAttack: function() { return calculateTotalAttack(); },
            calculateStarScore: function(t) { return calculateStarScore(t); },
            getCharacterFullStats: function(id) { return getCharacterFullStats(id); },
            getCharacterStatsAtLevel: function(char, lvl) { return getCharacterStatsAtLevel(char, lvl); },
            getMaxCharacterLevel: function() { return MAX_CHARACTER_LEVEL; },
            addCharacterExperience: function(id, exp) { addCharacterExperience(id, exp); },
            // 连击
            updateCombo: function() { updateCombo(); },
            resetCombo: function() { resetCombo(); },
            getComboCount: function() { return comboState.count; },
            getComboState: function() { return comboState; },
            // 玩家效果
            getPlayerEffects: function() { return playerEffects; },
            getCombatState: function() { return combatState; },
            getDodgeDuration: function() { return DODGE_DURATION; },
            getGreedySkillThreshold: function() { return GREEDY_SKILL_THRESHOLD; },
            onMonsterDefeat: function(m) {
                if (audioSystem && m && (m.type === 'slime' || m.type === 'slime_king')) {
                    audioSystem.playMonsterDefeat();
                }
            },
            onMonsterDodge: function() {
                if (audioSystem) audioSystem.playMonsterDodge();
            },
            onPetAttack: function() {
                if (audioSystem) audioSystem.playPetAttack();
            },
            // 灵韵模式
            getStarMode: function() { return starMode; },
            getSTAR_MODE: function() { return STAR_MODE; },
            getFallingConfig: function() { return FALLING_CONFIG; },
            // 系统
            getStarThief: function() { return starThief; },
            getCaptureSystem: function() { return captureSystem; },
            getRhythmSystem: function() { return rhythmSystem; },
            getLinkChainSystem: function() { return linkChainSystem; },
            getRhythmSkillSystem: function() { return rhythmSkillSystem; },
            getDragSystem: function() { return dragSystem; },
            getPoisonPuddleSystem: function() { return poisonPuddleSystem; },
            getActiveBuffs: function() { return activeBuffs; },
            getSeasonSelection: function() { return seasonSelection; },
            getTowerSystem: function() { return towerSystem; },
            updateTaskProgress: function(t, n) { updateTaskProgress(t, n); },
            updateTaskStats: function(t, n) { updateTaskStats(t, n); },
            // 动画
            addMessage: function(msg, color, important) { addGameMessage(msg, color, important); },
            vibrateShort: function(type) { try { $P.vibrateShort({ type: type }); } catch(e) {} },
            createMeteorAnimation: function(x, y, dmg, crit, type, score, count, cb, target) { createMeteorAnimation(x, y, dmg, crit, type, score, count, cb, target); },
            createCritAnimation: function(x, y, dmg, delay, color) { createCritAnimation(x, y, dmg, delay, color); },
            createStarBurstAnimation: function(x, y, t) { createStarBurstAnimation(x, y, t); },
            createScreenShake: function(i) { createScreenShake(i); },
            createQuickTapAnimation: function(x, y, s, t, f) { createQuickTapAnimation(x, y, s, t, f); },
            createScorePopupAnimation: function(x, y, s, c) { createScorePopupAnimation(x, y, s, c); },
            createPlayerDamageAnimation: function(dmg, isBoss, isPoison, text, isShield) { createPlayerDamageAnimation(dmg, isBoss, isPoison, text, isShield); },
            removeBossStar: function(id) { removeBossStar(id); },
            getMonsterSkillType: function() { return MonsterSkillType; },
            tipShowTipOnce: function(key, text) { tipShowTipOnce(key, text); },
            // Phase 4: 击杀/掉落 deps
            getMonsterTypes: function() { return MonsterTypes; },
            getMonstersConfig: function() { return Monsters; },
            getMonsterSplitCount: function() { return combatState.monsterSplitCount; },
            setMonsterSplitCount: function(val) { combatState.monsterSplitCount = val; },
            getStageMonstersKilled: function() { return stageMonstersKilled; },
            setStageMonstersKilled: function(val) { stageMonstersKilled = val; },
            getStageMaxCombo: function() { return stageMaxCombo; },
            setStageMaxCombo: function(val) { stageMaxCombo = val; },
            getStageBossesKilled: function() { return stageBossesKilled; },
            setStageBossesKilled: function(val) { stageBossesKilled = val; },
            getStageCriticalCount: function() { return stageCriticalCount; },
            getStagePerfectCount: function() { return stagePerfectCount; },
            incrementStagePerfectCount: function() { stagePerfectCount++; },
            getCurrentStageData: function() { return StageMode ? StageMode.currentStage : null; },
            getStarDevourerEscaped: function() { return combatState.starDevourerEscaped; },
            setStarDevourerEscaped: function(val) { combatState.starDevourerEscaped = val; },
            getStarDevourerEscapeHpRatio: function() { return STAR_DEVOURER_ESCAPE_HP_RATIO; },
            getEquipments: function() { return Equipments; },
            getSkills: function() { return Skills; },
            getPets: function() { return Pets; },
            getMonsterAttackInterval: function() { return monsterAttackInterval; },
            setMonsterAttackInterval: function(id) { monsterAttackInterval = id; },
            getActiveBuffs: function() { return activeBuffs; },
            getSeasonSelection: function() { return seasonSelection; },
            dropEquipment: function(isBoss) { dropEquipment(isBoss); },
            dropSkill: function() { dropSkill(); },
            dropPet: function(isBoss) { dropPet(isBoss); },
            dropMaterial: function() { dropMaterial(); },
            addMaterialToBackpack: function(id, n) { addMaterialToBackpack(id, n); },
            createGoldDropAnimation: function(x, y, amt) { createGoldDropAnimation(x, y, amt); },
            createMonster: function(id, x, y, opts) { return createMonster(id, x, y, opts); },
            calculateMonsterPositions: function(count, y) { return calculateMonsterPositions(count, y); },
            savePlayerData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            spawnPoisonPuddles: function(mx, my, skill) { spawnPoisonPuddles(mx, my, skill); },
            monsterAttackPlayer: function() { monsterAttackPlayer(); },
            getPassiveSkillBonuses: function() { return getPassiveSkillBonuses(); },
            addTimeLeft: function(sec) { timeLeft += sec; },
            // Phase 5: attackMonster 防御逻辑 deps
            triggerMonsterSkill: function(m, type, ctx) { return triggerMonsterSkill(m, type, ctx); },
            setElementalComboState: function(active, time) { setElementalComboState(active, time); },
            addMonsterSkillAnimation: function(m, type, text) { if (monsterSkillSystem) monsterSkillSystem.addMonsterSkillAnimation(m, type, text); },
            resetBossStarMechanic: function() { resetBossStarMechanic(); },
            incrementBossAttackCount: function() { return incrementBossAttackCount(); },
            triggerBossStarSkill: function(m) { triggerBossStarSkill(m); },
            createMonsterProjectileAnimation: function(sx, sy, d, td, b, cb) { createMonsterProjectileAnimation(sx, sy, d, td, b, cb); },
            createMonsterDamageAnimation: function(m, d) { createMonsterDamageAnimation(m, d); },
            createHpBarCounterAnimation: function() { createHpBarCounterAnimation(); },
            getBossStunChance: function() { return BOSS_STUN_CHANCE; },
            getBossStunDuration: function() { return BOSS_STUN_DURATION; },
            setTimeLeft: function(val) { timeLeft = val; },
            getTimeLeft: function() { return timeLeft; },
            getStageDamageTaken: function() { return stageDamageTaken; },
            setStageDamageTaken: function(val) { stageDamageTaken = val; },
            getBOSS_STUN_COOLDOWN: function() { return 5000; },
            getLastBossStunTime: function() { return _lastBossStunTime; },
            setLastBossStunTime: function(val) { _lastBossStunTime = val; },
            createTimeDamageAnimation: function(dmg) { createTimeDamageAnimation(dmg); },
            endGame: function() { endGame(); },
            getIsTutorialBattle: function() { return _tutorial.active; },
            // 战斗音效
            playCombo: function() { if (audioSystem) audioSystem.playCombo(); },
            playCritical: function() { if (audioSystem) audioSystem.playCritical(); },
            playHit: function() { if (audioSystem) audioSystem.playHit(); },
            playNormal: function() { if (audioSystem) audioSystem.playNormal(); },
            playPoisonClick: function() { if (audioSystem) audioSystem.playPoisonClick(); },
            playQuickTap: function() { if (audioSystem) audioSystem.playQuickTap(); },
            playHitEnemy: function() { if (audioSystem) audioSystem.playHitEnemy(); },
            playPetAttack: function() { if (audioSystem) audioSystem.playPetAttack(); },
            playRainbow: function(p) { if (audioSystem) audioSystem.playRainbow(p); },
            // 觉醒系统
            getPlayerHpScaling: function(pd) { return getPlayerHpScaling(pd || saveData); },
            getPlayerScoreScaling: function(pd) { return getPlayerScoreScaling(pd || saveData); },
            getDropTier: function(pd) { return getDropTier(pd || saveData); },
            getAwakeConfig: function() { return AWAKE_CONFIG; },
            onEngineReady: function(engine) {
                if (starSystem && starSystem.onSpecChanged) {
                    engine.subscribe(starSystem.onSpecChanged);
                }
            },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; },
            victoryHealPlugin: victoryHealPlugin
        });
        _log('普通战斗适配器模块初始化完成');

        // 统一触摸管道（中间件模式，替换分散的 4 层触摸逻辑）
        touchPipeline = _gameModules.createTouchPipeline({
            normalBattleAdapter: normalBattleAdapter,
            linkChainSystem: linkChainSystem,
            chargeSystem: chargeSystem,
            dragSystem: dragSystem,
            rhythmSkillSystem: rhythmSkillSystem,
            poisonPuddleSystem: poisonPuddleSystem,
            touchGestureSystem: touchGestureSystem,
            playerEffects: playerEffects,
            handlePoisonPuddleStar: function(ps, pi) {
                audioSystem.playPoisonClick();
                audioSystem.playPetAttack();
                var pDmg = _COMBAT_SPEC.STATUS.POISON_STAR_DAMAGE;
                var _scale = getScreenScale();
                var _designBottom = Math.min(getDesignOffsetY() + Math.floor(812 * _scale), screenHeight);
                createMeteorAnimation(
                    ps.x, ps.y,
                    pDmg,
                    false,
                    'poison',
                    0,
                    1,
                    null,
                    { x: screenWidth / 2, y: _designBottom - Math.floor(50 * _scale) }
                );
                applyPoisonStarEffect(pDmg);
                poisonPuddleSystem.removePoisonStar(pi);
            }
        });
        _log('统一触摸管道初始化完成');

        // 运行时不变量检查器（调试模式每帧自动检查）
        invariantChecker = _gameModules.createInvariantChecker({
            getGameState: function() { return state; },
            getGameConst: function() { return GAME_STATE; },
            getMonsters: function() { return monsters; },
            getNormalBattleAdapter: function() { return normalBattleAdapter; },
            isDebug: function() { return debugPanelOpen; }
        });

        // 游戏生命周期系统
        gameLifecycleSystem = _gameModules.createGameLifecycleSystem({
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            setGameState: function(s) { stateMachine.transitionTo(s); },
            getGameState: function() { return state; },
            GAME_STATE: GAME_STATE,
            getScore: function() { return score; },
            setScore: function(val) { score = val; },
            getTimeLeft: function() { return timeLeft; },
            setTimeLeft: function(val) { timeLeft = val; },
            getNormalGameTime: function() { return NORMAL_GAME_TIME; },
            getBestScore: function() { return bestScore; },
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            saveDataImmediate: function() { dataStore.flush(); },
            flushData: function() { dataStore.flush(); },
            saveBestScore: function() { saveBestScore(); },
            getNormalBattleAdapter: function() { return normalBattleAdapter; },
            clearTimerInterval: function() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } },
            clearMoveInterval: function() { if (moveInterval) { clearInterval(moveInterval); moveInterval = null; } },
            clearMonsterAttackInterval: function() { if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; } },
            setTimerInterval: function(id) { timerInterval = id; },
            setMoveInterval: function(id) { moveInterval = id; },
            setMonsterAttackInterval: function(id) { monsterAttackInterval = id; },
            getStars: function() { return stars; },
            setStars: function(val) { stars = val; },
            getMonsters: function() { return monsters; },
            setMonsters: function(val) { monsters = val; },
            addNewStar: function() { addNewStar(); },
            resetStar: function() { resetStar(); },
            spawnMonster: function(type) { spawnMonster(type); },
            monsterAttackPlayer: function() { monsterAttackPlayer(); },
            getStarMode: function() { return starMode; },
            getSTAR_MODE: function() { return STAR_MODE; },
            getFallingConfig: function() { return FALLING_CONFIG; },
            getCurrentStarInterval: function() { return comboState.currentStarInterval; },
            getBaseStarInterval: function() { return _getSpecAwareBaseStarInterval(); },
            setCurrentStarInterval: function(val) { comboState.currentStarInterval = val; },
            clearMessages: function() { clearMessages(); },
            resetCombo: function() { resetCombo(); },
            clearAllAnimations: function() { clearAllAnimations(); },
            resetBossStarMechanic: function() { resetBossStarMechanic(); },
            stopPetAttackTimer: function() { stopPetAttackTimer(); },
            startPetAttackTimer: function() { startPetAttackTimer(); },
            startDodgeStarTimer: function() { startDodgeStarTimer(); },
            stopDodgeStarTimer: function() { stopDodgeStarTimer(); },
            getCharacterFullStats: function(charId) { return getCharacterFullStats(charId); },
            getCharacterStatsAtLevel: function(charId, level) { return getCharacterStatsAtLevel(charId, level); },
            getMAX_CHARACTER_LEVEL: function() { return MAX_CHARACTER_LEVEL; },
            getSkillSystem: function() { return skillSystem; },
            getActiveBuffs: function() { return activeBuffs; },
            getGameItems: function() { return gameItems; },
            getAdItems: function() { return adItems; },
            getMAX_GAME_ITEMS: function() { return MAX_GAME_ITEMS; },
            getMonsterSplitCount: function() { return combatState.monsterSplitCount; },
            setMonsterSplitCount: function(val) { combatState.monsterSplitCount = val; },
            getMonsterSplitType: function() { return combatState.monsterSplitType; },
            setMonsterSplitType: function(val) { combatState.monsterSplitType = val; },
            getPlayerEffects: function() { return playerEffects; },
            getPlayerPoisoned: function() { return playerEffects.poisoned; },
            setPlayerPoisoned: function(val) { playerEffects.poisoned = val; },
            getPlayerPoisonDamage: function() { return playerEffects.poisonDamage; },
            setPlayerPoisonDamage: function(val) { playerEffects.poisonDamage = val; },
            getGreedyHpPool: function() { return combatState.greedyHpPool; },
            setGreedyHpPool: function(val) { combatState.greedyHpPool = val; },
            getGreedySkillUnlocked: function() { return combatState.greedySkillUnlocked; },
            setGreedySkillUnlocked: function(val) { combatState.greedySkillUnlocked = val; },
            getComboStarActive: function() { return combatState.comboStarActive; },
            setComboStarActive: function(val) { combatState.comboStarActive = val; },
            getComboStarStartTime: function() { return combatState.comboStarStartTime; },
            setComboStarStartTime: function(val) { combatState.comboStarStartTime = val; },
            getComboStarLastAttackTime: function() { return combatState.comboStarLastAttackTime; },
            setComboStarLastAttackTime: function(val) { combatState.comboStarLastAttackTime = val; },
            getComboStarLastRemainingTime: function() { return combatState.comboStarLastRemainingTime; },
            setComboStarLastRemainingTime: function(val) { combatState.comboStarLastRemainingTime = val; },
            getComboStarTimer: function() { return combatState.comboStarTimer; },
            setComboStarTimer: function(val) { combatState.comboStarTimer = val; },
            getStarDevourerEscaped: function() { return combatState.starDevourerEscaped; },
            setStarDevourerEscaped: function(val) { combatState.starDevourerEscaped = val; },
            getVoidEmperorSpawned: function() { return combatState.voidEmperorSpawned; },
            setVoidEmperorSpawned: function(val) { combatState.voidEmperorSpawned = val; },
            getComboCount: function() { return comboState.count; },
            setLastComboTime: function(val) { comboState.lastComboTime = val; },
            getPauseStartTime: function() { return pauseStartTime; },
            setPauseStartTime: function(val) { pauseStartTime = val; },
            getCONFIG: function() { return CONFIG; },
            getSeasonScore: function() { return seasonScore; },
            setSeasonScore: function(val) { seasonScore = val; },
            getSeasonBestScore: function() { return seasonBestScore; },
            setSeasonBestScore: function(val) { seasonBestScore = val; },
            getSeasonSelection: function() { return seasonSelection; },
            setSeasonSelection: function(val) { seasonSelection = val; },
            getSeasonLeaderboard: function() { return seasonLeaderboard; },
            setSeasonLeaderboard: function(val) { seasonLeaderboard = val; },
            getStarThief: function() { return starThief; },
            setMonstersKilled: function(val) { monstersKilled = val; },
            uploadLeaderboardData: function() { if (storageSystem) storageSystem.uploadLeaderboardData(); },
            uploadSeasonScore: function(score) { if (storageSystem) storageSystem.uploadSeasonScore(score); },
            updateTaskProgress: function(task, val, isMax) { updateTaskProgress(task, val, isMax); },
            updateTaskStats: function(stat, val, isMax) { updateTaskStats(stat, val, isMax); },
            getBossBattleMode: function() { return BossBattleMode; },
            endStage: function(m) { if (stageModeSystem) stageModeSystem.onMonsterDefeated(m); },
            stageModeEnd: function(success) { if (stageModeSystem) stageModeSystem.end(success); },
            resumeStageTimers: function() { if (stageModeSystem) { stageModeSystem.resumeTimers(); } },
            getGameEndTime: function() { return gameEndTime; },
            setGameEndTime: function(val) { gameEndTime = val; },
            clearPoisonPuddles: function() { poisonPuddleSystem.clearPoisonPuddles(); },
            getIsTutorialBattle: function() { return _tutorial.active; },
            onTutorialFail: function() { if (onTutorialFail) onTutorialFail(); }
        });
        startGame = function() {
            modeLifecycle.transitionTo('normal');
        };
        endGame = function() {
            if (_tutorial.ending) return;
            if (_tutorial.active) {
                // 教学胜利：只有胜利走到这里（失败走 onTutorialFail）
                _tutorial.ending = true;
                _tutorial.active = false;
                godMode = false;
                runtimeData.godMode = false;

                if (audioSystem) { audioSystem.endBattle(); }
                if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
                if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
                if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; }
                if (stopPetAttackTimer) stopPetAttackTimer();
                if (normalBattleAdapter) normalBattleAdapter.destroy();
                monsters = [];

                worldMapSystem.onTutorialWin();
                worldMapSystem.markNeedsRespawn();
                if (_tutorial.entityId) {
                    worldMapSystem.resolveEntity(_tutorial.entityId);
                }
                worldMapSystem.restoreReturnPosition();
                worldMapSystem.saveProgress();

                _tutorial.victoryPopup = {
                    text: '教学完成！',
                    subtext: '新区域已解锁，继续探索吧',
                    createdAt: Date.now(),
                    onClose: function() {
                        _tutorial.victoryPopup = null;
                        _tutorial.ending = false;
                        _tutorial.retryCount = 0;
                        _tutorial.entityId = null;
                        _tutorial.completed = true;
                        runtimeData.tutorialCompleted = true;
                        // 确保初始角色在 ownedCharacters 中（否则菜单栏不会渲染）
                        if (!saveData.ownedCharacters || saveData.ownedCharacters.length === 0) {
                            saveData.ownedCharacters = ['char_001'];
                        } else if (saveData.ownedCharacters.indexOf('char_001') === -1) {
                            saveData.ownedCharacters.push('char_001');
                        }
                        if (!saveData.currentCharacterId) {
                            saveData.currentCharacterId = 'char_001';
                        }
                        // 强制重置初始角色经验数据，确保等级与属性面板一致
                        saveData.characterExperience = saveData.characterExperience || {};
                        saveData.characterExperience['char_001'] = { level: 1, exp: 0, maxExp: 100 };
                        dataStore.flush();
                        // 剧情场景：postBattle 由 SceneDispatcher 接管，它会在 onComplete 中切回 WORLDMAP
                        if (sceneDispatcher && sceneDispatcher.getActiveSceneId()) {
                            sceneDispatcher.onBattleEnd('win');
                        } else {
                            state = GAME_STATE.WORLDMAP;
                        }
                        modeLifecycle.setActiveMode(null);
                    }
                };
                state = GAME_STATE.TUTORIAL;
                return;
            }
            gameLifecycleSystem.endGame();
            if (_worldMapBattleEntityId && audioSystem) audioSystem.endBattle();
            if (_worldMapBattleEntityId) {
                worldMapSystem.resolveEntity(_worldMapBattleEntityId);
                worldMapSystem.saveProgress();
                _worldMapBattleEntityId = null;
            }
        };
        onTutorialFail = function() {
            if (_tutorial.ending) return;
            _tutorial.ending = true;
            _log('教学战斗失败，自动重开');

            if (normalBattleAdapter && normalBattleAdapter.cancelPendingVictory) {
                normalBattleAdapter.cancelPendingVictory();
            }

            // 关闭 overlay 引导（如果有）
            if (dialogueSystem && dialogueSystem.isActive()) {
                dialogueSystem.destroy();
            }

            _tutorial.retryCount++;
            if (_tutorial.retryCount > 3) {
                _log('教学重试次数已达上限');
                // 剧情场景失败上限：通知 SceneDispatcher
                if (sceneDispatcher && sceneDispatcher.getActiveSceneId()) {
                    modeLifecycle.cleanupMode('tutorial');
                    sceneDispatcher.onBattleEnd('lose');
                } else {
                    modeLifecycle.cleanupMode('tutorial');
                    worldMapSystem.restoreReturnPosition();
                    worldMapSystem.saveProgress();
                    state = GAME_STATE.WORLDMAP;
                }
                _tutorial.entityId = null;
                return;
            }

            // 用 tutorial restart 替代 startGame + 手动覆盖
            _tutorial.ending = false;
            modeLifecycle.restartMode('tutorial');
        };
        restartGame = function() {
            modeLifecycle.transitionTo('normal');
        };
        startSeasonGame = function() {
            modeLifecycle.transitionTo('season');
        };
        endSeasonGame = function() { gameLifecycleSystem.endSeasonGame(); };
        _log('游戏生命周期系统模块初始化完成');

        // ===== ModeLifecycleManager — 统一模式生命周期 =====
        modeLifecycle = createModeLifecycleManager({
            getGameState: function() { return state; },
            setGameState: function(s) { stateMachine.transitionTo(s); },
            GAME_STATE: GAME_STATE,
            saveData: function() { /* no-op: GameDataStore auto-flush via Proxy */ },
            getPreviousGameState: function() { return stateMachine.getPreviousState ? stateMachine.getPreviousState() : null; }
        });

        // 注册 6 个战斗模式
        modeLifecycle.registerMode('normal', {
            enter: function(ctx) {
                if (rhythmSystem) rhythmSystem.reset();
                if (chargeSystem) chargeSystem.reset();
                if (dragSystem) dragSystem.reset();
                if (linkChainSystem) linkChainSystem.reset();
                if (touchGestureSystem) touchGestureSystem.reset();
                _battleMusicTriggered = false;
                gameLifecycleSystem.startGame();
            },
            pause: function() {},
            resume: function(ctx) { gameLifecycleSystem.resumeNormalTimers(); },
            cleanup: function(ctx) {
                if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
                if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
                if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; }
                if (stopPetAttackTimer) stopPetAttackTimer();
                if (normalBattleAdapter) normalBattleAdapter.destroy();
                saveBestScore();
                if (audioSystem) audioSystem.endBattle();
                if (ctx && ctx.fullExit) endGame();
            },
            restart: function(ctx) {
                if (rhythmSystem) rhythmSystem.reset();
                if (chargeSystem) chargeSystem.reset();
                if (dragSystem) dragSystem.reset();
                if (linkChainSystem) linkChainSystem.reset();
                if (touchGestureSystem) touchGestureSystem.reset();
                _battleMusicTriggered = false;
                gameLifecycleSystem.startGame();
            },
            renderResult: function(rc) {
                var c = rc.ctx;
                var sw = rc.screenWidth;
                var sh = rc.screenHeight;
                var s = rc.scale;
                var doY = rc.designOffsetY;
                var db = rc.designBottom;
                var dt = rc.drawText;
                var dbt = rc.drawButton;
                var Assets = rc.Assets;
                // 背景
                if (Assets.backgroundImage && Assets.backgroundImage.complete && Assets.bgPositionCache) {
                    var cache = Assets.bgPositionCache;
                    c.drawImage(Assets.backgroundImage, cache.drawX, cache.drawY, cache.drawWidth, cache.drawHeight);
                    c.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    c.fillRect(0, 0, sw, sh);
                } else {
                    c.fillStyle = 'rgba(0, 0, 0, 0.9)';
                    c.fillRect(0, 0, sw, sh);
                }
                // 内容
                dt('净化中止', sw / 2, doY + Math.floor(DESIGN_HEIGHT / 3 * s), Math.floor(48 * s), '#ffd700');
                dt(rc.score.toString(), sw / 2, (doY + db) / 2, Math.floor(64 * s), '#ffd700');
                dt('最高分: ' + rc.bestScore, sw / 2, (doY + db) / 2 + 50 * s, Math.floor(24 * s), '#ffffff');
                var msg = '不错！继续加油！';
                if (rc.score >= rc.bestScore && rc.score > 0) msg = '新纪录！太棒了！';
                else if (rc.score >= 100) msg = '唤灵传说！';
                else if (rc.score >= 50) msg = '灵光璀璨！';
                dt(msg, sw / 2, doY + Math.floor(DESIGN_HEIGHT * 0.6 * s), Math.floor(24 * s), '#ffffff');
                var bw = Math.floor(200 * s);
                var bh = Math.floor(60 * s);
                dbt('再玩一次', sw / 2, doY + Math.floor(DESIGN_HEIGHT * 0.70 * s), bw, bh, '#ffd700');
                dbt('返回菜单', sw / 2, doY + Math.floor(DESIGN_HEIGHT * 0.78 * s), bw, bh, '#87CEEB');
            },
            handleResultTouch: function(x, y) {
                var s = getScreenScale();
                var doY = getDesignOffsetY();
                var sw = screenWidth;
                var sh = screenHeight;
                var db = Math.min(doY + Math.floor(DESIGN_HEIGHT * s), sh);
                var bw = Math.floor(200 * s);
                var bh = Math.floor(60 * s);
                // 再玩一次按钮
                var rby = doY + Math.floor(DESIGN_HEIGHT * 0.70 * s);
                if (x >= sw/2 - bw/2 && x <= sw/2 + bw/2 &&
                    y >= rby - bh/2 && y <= rby + bh/2) {
                    _log('点击再玩一次按钮');
                    if (audioSystem) { audioSystem.stopFail(); audioSystem.playAnswer1(); audioSystem.restartBattle(); }
                    modeLifecycle.restartMode('normal');
                    return true;
                }
                // 返回菜单按钮
                var mby = doY + Math.floor(DESIGN_HEIGHT * 0.78 * s);
                if (x >= sw/2 - bw/2 && x <= sw/2 + bw/2 &&
                    y >= mby - bh/2 && y <= mby + bh/2) {
                    _log('点击返回菜单按钮');
                    if (audioSystem) { audioSystem.stopFail(); }
                    seasonSelection = { character: null, skills: [], pet: null };
                    if (saveData.seasonData && saveData.seasonData.selection) {
                        saveData.seasonData.selection = null;
                    }
                    stateMachine.transitionTo(GAME_STATE.WORLDMAP);
                    return true;
                }
                return false;
            }
        }, GAME_STATE.PLAYING);

        // 教学战斗模式 — 区分于普通模式，restart 时保留教学状态
        modeLifecycle.registerMode('tutorial', {
            enter: function(ctx) {
                if (rhythmSystem) rhythmSystem.reset();
                if (chargeSystem) chargeSystem.reset();
                if (dragSystem) dragSystem.reset();
                if (linkChainSystem) linkChainSystem.reset();
                if (touchGestureSystem) touchGestureSystem.reset();
                _battleMusicTriggered = false;
                _tutorial.active = true;
                _tutorial.ending = false;
                _tutorial.retryCount = 0;
                if (ctx && ctx.entityId) _tutorial.entityId = ctx.entityId;
                godMode = true;
                runtimeData.godMode = true;
                gameLifecycleSystem.startGame();
                state = GAME_STATE.TUTORIAL;
                if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
                if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; }
                if (stopPetAttackTimer) stopPetAttackTimer();
                                spawnMonster('tutorial_jp');
                tipShowTipOnce('tutorial_start', '点击灵光阻止对手！');
            },
            pause: function() {},
            resume: function(ctx) { gameLifecycleSystem.resumeNormalTimers(); },
            cleanup: function(ctx) {
                if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
                if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
                if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; }
                if (stopPetAttackTimer) stopPetAttackTimer();
                if (normalBattleAdapter) normalBattleAdapter.destroy();
                saveBestScore();
                if (audioSystem) audioSystem.endBattle();
                monsters = [];
                _tutorial.active = false;
                _tutorial.ending = false;
                godMode = false;
                runtimeData.godMode = false;
                if (ctx && ctx.fullExit) stateMachine.transitionTo(GAME_STATE.WORLDMAP);
            },
            restart: function(ctx) {
                if (rhythmSystem) rhythmSystem.reset();
                if (chargeSystem) chargeSystem.reset();
                if (dragSystem) dragSystem.reset();
                if (linkChainSystem) linkChainSystem.reset();
                if (touchGestureSystem) touchGestureSystem.reset();
                _battleMusicTriggered = false;
                _tutorial.active = true;
                _tutorial.ending = false;
                godMode = true;
                runtimeData.godMode = true;
                gameLifecycleSystem.startGame();
                state = GAME_STATE.TUTORIAL;
                if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
                if (monsterAttackInterval) { clearInterval(monsterAttackInterval); monsterAttackInterval = null; }
                if (stopPetAttackTimer) stopPetAttackTimer();
                                spawnMonster('tutorial_jp');
                tipShowTipOnce('tutorial_retry', '再试一次！点击灵光阻止对手');
                if (sceneDispatcher && sceneDispatcher.getActiveSceneId()) {
                    var _sceneRef = _gameModules.STORY_SCENES[sceneDispatcher.getActiveSceneId()];
                    if (_sceneRef && _sceneRef.inBattle) {
                        sceneDispatcher.registerBattleTriggersRetry(_sceneRef.inBattle);
                    }
                }
            },
            renderResult: function(rc) { handlers['normal'].renderResult(rc); },
            handleResultTouch: function(x, y) { return false; }
        }, GAME_STATE.TUTORIAL);

        modeLifecycle.registerMode('boss', {
            enter: function(ctx) {
                if (ctx && ctx.level) BossBattleMode.init(ctx.level);
                BossBattleMode.start();
            },
            pause: function() {},
            resume: function(ctx) {},
            cleanup: function(ctx) {
                if (BossBattleMode) BossBattleMode.cleanup();
                saveBestScore();
                if (audioSystem) audioSystem.endBattle();
                if (ctx && ctx.fullExit) stateMachine.transitionTo(GAME_STATE.WORLDMAP);
            },
            restart: function(ctx) {
                BossBattleMode.cleanup();
                BossBattleMode.init(BossBattleMode.bossLevel);
                BossBattleMode.start();
            },
            renderResult: function() {},
            handleResultTouch: function() { return false; }
        }, GAME_STATE.BOSS_BATTLE);

        modeLifecycle.registerMode('tower', {
            enter: function(ctx) {},
            pause: function() {},
            resume: function(ctx) {},
            cleanup: function(ctx) {
                if (towerSystem) towerSystem.pauseTower();
            },
            restart: function(ctx) {
                if (towerSystem) towerSystem.restartCurrentCombat();
            },
            renderResult: function() {},
            handleResultTouch: function() { return false; }
        }, GAME_STATE.TOWER_COMBAT);

        modeLifecycle.registerMode('stage', {
            enter: function(ctx) {
                if (ctx && ctx.stageId) stageModeSystem.startStage(ctx.stageId);
            },
            pause: function() {},
            resume: function(ctx) { stageModeSystem.resumeTimers(); },
            cleanup: function(ctx) {
                if (stageModeSystem) stageModeSystem.end(false);
            },
            restart: function(ctx) {
                if (stageModeSystem) stageModeSystem.end(false);
                startStage(StageMode.currentStage);
            },
            renderResult: function() {},
            handleResultTouch: function() { return false; }
        }, GAME_STATE.STAGE_PLAYING);

        modeLifecycle.registerMode('season', {
            enter: function(ctx) {
                if (rhythmSystem) rhythmSystem.reset();
                if (chargeSystem) chargeSystem.reset();
                if (dragSystem) dragSystem.reset();
                if (linkChainSystem) linkChainSystem.reset();
                if (touchGestureSystem) touchGestureSystem.reset();
                gameLifecycleSystem.startSeasonGame();
            },
            pause: function() {},
            resume: function(ctx) { gameLifecycleSystem.resumeNormalTimers(); },
            cleanup: function(ctx) { gameLifecycleSystem.endSeasonGame(); },
            restart: function(ctx) {
                if (rhythmSystem) rhythmSystem.reset();
                if (chargeSystem) chargeSystem.reset();
                if (dragSystem) dragSystem.reset();
                if (linkChainSystem) linkChainSystem.reset();
                if (touchGestureSystem) touchGestureSystem.reset();
                gameLifecycleSystem.startSeasonGame();
            },
            renderResult: function(rc) {
                var c = rc.ctx;
                var sw = rc.screenWidth;
                var sh = rc.screenHeight;
                var s = rc.scale;
                var doY = rc.designOffsetY;
                var dt = rc.drawText;
                var dbt = rc.drawButton;
                var Assets = rc.Assets;
                var Characters = rc.Characters;
                var Skills = rc.Skills;
                var Pets = rc.Pets;
                var ss = rc.seasonSelection;
                // 背景
                if (Assets.backgroundImage && Assets.backgroundImage.complete && Assets.bgPositionCache) {
                    var cache = Assets.bgPositionCache;
                    c.drawImage(Assets.backgroundImage, cache.drawX, cache.drawY, cache.drawWidth, cache.drawHeight);
                    c.fillStyle = 'rgba(20, 10, 10, 0.8)';
                    c.fillRect(0, 0, sw, sh);
                } else {
                    c.fillStyle = 'rgba(30, 10, 10, 0.95)';
                    c.fillRect(0, 0, sw, sh);
                }
                // 内容
                dt('赛季结束', sw / 2, doY + Math.floor(DESIGN_HEIGHT / 4 * s), Math.floor(36 * s), '#E74C3C');
                dt(rc.seasonScore.toString(), sw / 2, doY + Math.floor(DESIGN_HEIGHT / 3 * s), Math.floor(64 * s), '#ffd700');
                dt('赛季最高分: ' + rc.seasonBestScore, sw / 2, doY + Math.floor(DESIGN_HEIGHT / 3 * s) + 50 * s, Math.floor(20 * s), '#ffffff');
                dt('排名: 第 ' + rc.seasonRank + ' 名', sw / 2, doY + Math.floor(DESIGN_HEIGHT / 3 * s) + 80 * s, Math.floor(18 * s), '#aaaaaa');
                // 配置信息
                var charData = Characters[ss.character];
                var skillNames = '';
                for (var si = 0; si < ss.skills.length; si++) {
                    var sid = ss.skills[si];
                    if (si > 0) skillNames += ', ';
                    skillNames += (Skills[sid] && Skills[sid].name) ? Skills[sid].name : sid;
                }
                var petName = (Pets[ss.pet] && Pets[ss.pet].name) ? Pets[ss.pet].name : '无';
                c.fillStyle = '#888888';
                c.font = Math.floor(12 * s) + 'px sans-serif';
                c.textAlign = 'center';
                c.fillText('配置: ' + (charData ? charData.name : '未知') + ' | ' + skillNames + ' | ' + petName, sw / 2, doY + Math.floor(DESIGN_HEIGHT * 0.5 * s));
                // 鼓励语
                var msg = '继续努力！';
                if (rc.seasonScore >= rc.seasonBestScore && rc.seasonScore > 0) msg = '新赛季最高分！';
                else if (rc.seasonScore >= 1000) msg = '传奇唤灵人！';
                else if (rc.seasonScore >= 500) msg = '出色的表现！';
                dt(msg, sw / 2, doY + Math.floor(DESIGN_HEIGHT * 0.58 * s), Math.floor(20 * s), '#ffffff');
                // 按钮
                var bw = Math.floor(160 * s);
                var bh = Math.floor(50 * s);
                dbt('再来一局', sw / 2, doY + Math.floor(DESIGN_HEIGHT * 0.68 * s), bw, bh, '#E74C3C');
                dbt('查看排行榜', sw / 2, doY + Math.floor(DESIGN_HEIGHT * 0.76 * s), bw, bh, '#9b59b6');
                dbt('返回菜单', sw / 2, doY + Math.floor(DESIGN_HEIGHT * 0.84 * s), bw, bh, '#4a4a6a');
            },
            handleResultTouch: function(x, y) {
                var s = getScreenScale();
                var doY = getDesignOffsetY();
                var sw = screenWidth;
                var bw = Math.floor(160 * s);
                var bh = Math.floor(50 * s);
                // 再来一局按钮
                var rby = doY + Math.floor(DESIGN_HEIGHT * 0.68 * s);
                if (x >= sw/2 - bw/2 && x <= sw/2 + bw/2 &&
                    y >= rby - bh/2 && y <= rby + bh/2) {
                    _log('点击再来一局按钮');
                    if (audioSystem) { audioSystem.stopSuccess(); audioSystem.playAnswer1(); }
                    modeLifecycle.restartMode('season');
                    return true;
                }
                // 查看排行榜按钮
                var lby = doY + Math.floor(DESIGN_HEIGHT * 0.76 * s);
                if (x >= sw/2 - bw/2 && x <= sw/2 + bw/2 &&
                    y >= lby - bh/2 && y <= lby + bh/2) {
                    _log('点击查看排行榜按钮');
                    if (audioSystem) { audioSystem.stopSuccess(); audioSystem.playAnswer1(); }
                    seasonSelection = { character: null, skills: [], pet: null };
                    if (saveData.seasonData && saveData.seasonData.selection) {
                        saveData.seasonData.selection = null;
                    }
                    stateMachine.transitionTo(GAME_STATE.LEADERBOARD);
                    currentLeaderboardTab = 'season_score';
                    if (!openDataContext) initOpenDataContext();
                    currentLeaderboardTab = 'season_score';
                    sendLeaderboardMessage('show', 'season_score');
                    return true;
                }
                // 返回菜单按钮
                var mby = doY + Math.floor(DESIGN_HEIGHT * 0.84 * s);
                if (x >= sw/2 - bw/2 && x <= sw/2 + bw/2 &&
                    y >= mby - bh/2 && y <= mby + bh/2) {
                    _log('点击返回菜单按钮');
                    if (audioSystem) { audioSystem.stopSuccess(); audioSystem.playUiSkip(); }
                    modeLifecycle.cleanupMode('season');
                    seasonSelection = { character: null, skills: [], pet: null };
                    if (saveData.seasonData && saveData.seasonData.selection) {
                        saveData.seasonData.selection = null;
                    }
                    stateMachine.transitionTo(GAME_STATE.WORLDMAP);
                    return true;
                }
                return false;
            }
        }, GAME_STATE.SEASON_PLAYING);

        _log('ModeLifecycleManager 初始化完成，已注册 6 个战斗模式');

        // ===== StateMachine — 状态转移校验 =====
        stateMachine = createStateMachine({
            getGameState: function() { return state; },
            setGameStateRaw: function(s) {
                var prevState = state;
                state = (typeof s === 'string' && GAME_STATE[s]) ? GAME_STATE[s] : s;
                // 离开战斗状态时立即清除屏幕震动，防止震动偏移污染非战斗界面
                var _combatStates = [GAME_STATE.PLAYING, GAME_STATE.SEASON_PLAYING, GAME_STATE.STAGE_PLAYING, GAME_STATE.BOSS_BATTLE, GAME_STATE.TOWER_COMBAT];
                if (_combatStates.indexOf(prevState) !== -1 && _combatStates.indexOf(state) === -1 && state !== GAME_STATE.PAUSED) {
                    if (clearScreenShake) clearScreenShake();
                }
                // 结算音效
                if (audioSystem) {
                    if (state === GAME_STATE.GAMEOVER) {
                        if (prevState === GAME_STATE.SEASON_PLAYING) {
                            audioSystem.playSuccess();
                        } else {
                            audioSystem.playFail();
                        }
                    }
                    if (state === GAME_STATE.STAGE_RESULT) {
                        var stageResult = (stageModeSystem && stageModeSystem.getResult) ? stageModeSystem.getResult() : null;
                        if (stageResult && stageResult.success) audioSystem.playSuccess();
                        else audioSystem.playFail();
                    }
                    if (state === GAME_STATE.BOSS_BATTLE_RESULT) {
                        var bossResult = (BossBattleMode && BossBattleMode.getResult) ? BossBattleMode.getResult() : null;
                        if (bossResult && bossResult.success) audioSystem.playSuccess();
                        else audioSystem.playFail();
                    }
                    if (state === GAME_STATE.TOWER_RESULT) {
                        audioSystem.playFail();
                    }
                }
                // 暂停音效
                if (state === GAME_STATE.PAUSED && audioSystem) {
                    audioSystem.playQuestion();
                }
                // 进入赛季战斗：淡出当前BGM，记忆它
                if (state === GAME_STATE.SEASON_PLAYING && prevState !== GAME_STATE.SEASON_PLAYING && prevState !== GAME_STATE.PAUSED && audioSystem) {
                    audioSystem.enterBattle();
                    _battleMusicTriggered = false;
                }
                // 进入塔探索：保存当前BGM，播放塔音乐
                if (state === GAME_STATE.TOWER && prevState !== GAME_STATE.TOWER && prevState !== GAME_STATE.TOWER_COMBAT && prevState !== GAME_STATE.TOWER_RESUME && audioSystem) {
                    audioSystem.enterTower();
                    audioSystem.playUiEnter2();
                    _battleMusicTriggered = false;
                }
                // 进入任务界面
                if (state === GAME_STATE.TASKS && prevState !== GAME_STATE.TASKS && audioSystem) {
                    audioSystem.playMenu2();
                }
                // 进入塔战斗：淡出当前BGM，记忆它
                if (state === GAME_STATE.TOWER_COMBAT && prevState !== GAME_STATE.TOWER_COMBAT && audioSystem) {
                    audioSystem.enterBattle();
                }
                // 赛季战斗结束
                if (prevState === GAME_STATE.SEASON_PLAYING && state !== GAME_STATE.SEASON_PLAYING && state !== GAME_STATE.PAUSED && audioSystem) {
                    audioSystem.endBattle();
                }
                // 塔战斗结束
                if (prevState === GAME_STATE.TOWER_COMBAT && state !== GAME_STATE.TOWER_COMBAT && audioSystem) {
                    if (state === GAME_STATE.TOWER) {
                        audioSystem.exitBattle(); // 回到探索：恢复塔探索音乐
                    } else {
                        audioSystem.endBattle(); // 结算/退出等：只淡出战斗音乐
                    }
                }
                // 回到大地图：恢复记忆的BGM
                if (state === GAME_STATE.WORLDMAP && worldMapSystem) {
                    if (audioSystem) {
                        if (prevState === GAME_STATE.TOWER || prevState === GAME_STATE.TOWER_COMBAT || prevState === GAME_STATE.TOWER_RESUME || prevState === GAME_STATE.TOWER_RESULT) {
                            audioSystem.exitTower();
                        } else if (prevState === GAME_STATE.GAMEOVER || prevState === GAME_STATE.PLAYING || prevState === GAME_STATE.SEASON_PLAYING || prevState === GAME_STATE.STAGE_RESULT || prevState === GAME_STATE.BOSS_BATTLE_RESULT) {
                            audioSystem.exitBattle();
                        }
                    }
                    worldMapSystem.markNeedsRespawn();
                    worldMapSystem.restoreReturnPosition();
                    worldMapSystem.saveProgress();
                }
            },
            getPreviousState: function() { return previousState; },
            setPreviousState: function(s) { previousState = s; }
        });
        _log('StateMachine 初始化完成');

        // 初始化广告（已移除）
        initAds();
        
        // 注册触摸事件
        $P.onTouchStart(handleTouchStart);
        $P.onTouchMove(handleTouchMove);
        $P.onTouchEnd(handleTouchEnd);
        
        // 启动渲染循环（requestAnimationFrame）— 移到所有系统初始化之后
        // （见文件末尾，大世界探索系统初始化之后）
        $P.onHide(function() {
            _log('游戏隐藏 - 保存数据并暂停战斗');
            dataStore.flush();
            // 如果当前处于战斗状态，自动暂停
            if (state === GAME_STATE.SEASON_PLAYING ||
                state === GAME_STATE.PLAYING ||
                state === GAME_STATE.STAGE_PLAYING ||
                state === GAME_STATE.BOSS_BATTLE ||
                state === GAME_STATE.TOWER_COMBAT) {
                previousState = state;
                PauseCoordinator.instance.pause();
                stateMachine.transitionTo(GAME_STATE.PAUSED);
            }
        });
        
        $P.onShow(function() {
            _log('游戏显示 - 继续挂机');
            // 持续挂机模式：不需要计算，玩家主动点击领取
        });
        
        // 初始化挂机时间（如果是新玩家）
        if (!saveData.afkData.lastClaimTime) {
            saveData.afkData.lastClaimTime = Date.now();
            dataStore.flush();
        }
        
        _log('游戏初始化完成');

        // ===== 大世界探索系统初始化 =====
        titleRenderer = _gameModules.createTitleRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getAssets: function() { return Assets; },
            onStartClick: function() {
                _log('点击开始游戏');
                if (audioSystem) { audioSystem.playUiEnter(); audioSystem.stopBgm(1500); }
                stateMachine.transitionTo(GAME_STATE.LOADING);
                setTimeout(function() {
                    stateMachine.transitionTo(GAME_STATE.CUTSCENE);
                    if (cutsceneRenderer) {
                        cutsceneRenderer.loadCutscene({
                            skippable: true,
                            frames: [
                                { text: '在人类出现之前，世界没有"灵"。', duration: 4, bgColor: '#0a0a15', textColor: '#8a7a5a' },
                                { text: '当第一个人类打磨出第一件石器——\n他的意识向那块石头投射了第一道意义能量。', duration: 5, bgColor: '#0a0a15', textColor: '#e8d5a3' },
                                { text: '这就是最早的"灵"。', duration: 3, bgColor: '#0a0a15', textColor: '#8a7a5a', onShow: function() { if (audioSystem) audioSystem.playUiEnter2(); } },
                                { text: '而你，即将踏入这片灵域……', duration: 4, bgColor: '#0a0a15', textColor: '#e8d5a3', onShow: function() { if (audioSystem) audioSystem.playUiEnter3(); } }
                            ]
                        });
                    }
                }, 100);
            }
        });

        cutsceneRenderer = _gameModules.createCutsceneRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            onComplete: function() {
                _log('过场播放完毕，进入大地图');
                stateMachine.transitionTo(GAME_STATE.WORLDMAP);
                if (worldMapSystem) {
                    var lastWorldId = (saveData && saveData.worldMapProgress && saveData.worldMapProgress.currentWorldId) || 'world_01';
                    if (audioSystem) {
                        if (lastWorldId === 'world_17') {
                            audioSystem.enterArdeacinerea();
                        } else {
                            audioSystem.playBgm('shuhanTheme', 0.4);
                            audioSystem.fadeBgmVolume(0.32, 5000);
                        }
                    }
                    worldMapSystem.loadWorld(lastWorldId);
                    _updateCatSpiritVisibility(lastWorldId);
                }
            }
        });

        // ===== 对话剧情系统初始化 =====
        dialogueSystem = createDialogueSystem({
            getAssets: function() { return Assets; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: getScreenScale,
            getDesignOffsetY: getDesignOffsetY,
            playClickAudio: function() { if (audioSystem) audioSystem.playClick(); },
            getCharacterImage: function(characterId) {
                var key = PORTRAIT_MAP[characterId];
                if (!key) return null;
                var img = (Assets.dialoguePortraits || {})[key];
                return (img && img.complete && img.naturalWidth > 0) ? img : null;
            },
            registerFirstStarClick: function(cb) {
                if (normalBattleAdapter && normalBattleAdapter.registerFirstStarClick) {
                    normalBattleAdapter.registerFirstStarClick(cb);
                }
            },
            unregisterFirstStarClick: function() {
                if (normalBattleAdapter && normalBattleAdapter.unregisterFirstStarClick) {
                    normalBattleAdapter.unregisterFirstStarClick();
                }
            },
        });

        sceneDispatcher = createSceneDispatcher({
            dialogueSystem: dialogueSystem,
            startBattle: function(context) {
                // 剧情场景进入教学战斗：全部状态由 tutorial enter handler 设置
                worldMapSystem.snapshotReturnPosition();
                modeLifecycle.transitionTo('tutorial', { entityId: context.entityId });
                if (audioSystem) audioSystem.enterBattle();
            },
            stateMachine: stateMachine,
            gameStateEnum: GAME_STATE,
            completeEventTask: function(taskId) { if (taskSystem && taskSystem.completeEventTask) taskSystem.completeEventTask(taskId); },
            onBeforeStarClickHook: { getAdapter: function() { return normalBattleAdapter; } },
        });

        worldMapSystem = _gameModules.createWorldMapSystem({
            showToast: function(opts) { $P.showToast(opts); },
            onTeleport: function() { if (audioSystem) audioSystem.playTeleport(); },
            flushData: function() { dataStore.flush(); },
            getSaveData: function() { return saveData; },
            getRuntimeData: function() { return runtimeData; },
            loadPlayerData: function() { /* no-op: handled by dataStore.load() */ },
            onInteractResult: function(result) {
                _log('实体交互结果:', result.type, result.entity ? result.entity.id : '');
                if (result.type === 'tutorial') {
                    _log('触发教学战斗');
                    // 剧情场景检测：有 storyScene 则交给 SceneDispatcher
                    if (result.entity && result.entity.storyScene) {
                        sceneDispatcher.start(result.entity.storyScene, { entityId: result.entity.id });
                        return;
                    }
                    worldMapSystem.snapshotReturnPosition();
                    if (audioSystem) audioSystem.enterBattle();
                    modeLifecycle.transitionTo('tutorial', { entityId: result.entity.id });
                }
                if (result.type === 'enemy') {
                    _log('触发敌人战斗:', result.entity.id);
                    _worldMapBattleEntityId = result.entity.id;
                    worldMapSystem.snapshotReturnPosition();
                    if (audioSystem) audioSystem.enterBattle();
                    startGame();
                }
                if (result.type === 'tower') {
                    _log('触发无尽之塔');
                    worldMapSystem.snapshotReturnPosition();
                    if (result.entity.unlockMenuId) {
                        worldMapSystem.unlockMenu(result.entity.unlockMenuId);
                        // 持久化塔解锁标记，让菜单按钮也解锁
                        saveData.towerUnlocked = true;
                    }
                    worldMapSystem.saveProgress();
                    if (saveData.infiniteTower && saveData.infiniteTower.isPaused) {
                        stateMachine.transitionTo(GAME_STATE.TOWER_RESUME);
                    } else {
                        towerSystem.init();
                        stateMachine.transitionTo(GAME_STATE.TOWER);
                    }
                }
                if (result.type === 'chest') {
                    _log('开启宝箱:', result.entity.id, '奖励:', JSON.stringify(result.reward));
                    audioSystem.playTreasureMisc();
                    if (result.reward) {
                        if (result.reward.currency) {
                            saveData.starSource = (saveData.starSource || 0) + result.reward.currency;
                        }
                        if (result.reward.spiritStones) {
                            saveData.spiritStones = (saveData.spiritStones || 0) + result.reward.spiritStones;
                        }
                        if (result.reward.characterExp) {
                            var currentCharId = saveData.currentCharacterId || 'char_001';
                            if (!saveData.characterExperience) saveData.characterExperience = {};
                            if (!saveData.characterExperience[currentCharId]) saveData.characterExperience[currentCharId] = { exp: 0, level: 1 };
                            saveData.characterExperience[currentCharId].exp += result.reward.characterExp;
                        }
                        if (result.reward.equipmentRarityRange && result.reward.equipmentCount) {
                            var allEquipKeys = Object.keys(_gameModules.Equipments);
                            var pool = [];
                            for (var ek = 0; ek < allEquipKeys.length; ek++) {
                                var eq = _gameModules.Equipments[allEquipKeys[ek]];
                                if (result.reward.equipmentRarityRange.indexOf(eq.rarity) >= 0) {
                                    pool.push(eq.id);
                                }
                            }
                            if (pool.length > 0) {
                                if (!saveData.equipments) saveData.equipments = { owned: [] };
                                for (var ec = 0; ec < result.reward.equipmentCount; ec++) {
                                    var picked = pool[Math.floor(Math.random() * pool.length)];
                                    saveData.equipments.owned.push({ id: picked });
                                }
                            }
                        }
                        if (result.reward.items) {
                            for (var ri = 0; ri < result.reward.items.length; ri++) {
                                if (!saveData.items) saveData.items = {};
                                saveData.items[result.reward.items[ri]] = (saveData.items[result.reward.items[ri]] || 0) + 1;
                            }
                        }
                    }
                    // 显示奖励 toast
                    var rewardMsg = '';
                    if (result.reward.spiritStones) rewardMsg += '灵石+' + result.reward.spiritStones + ' ';
                    if (result.reward.characterExp) rewardMsg += '经验+' + result.reward.characterExp + ' ';
                    if (result.reward.currency) rewardMsg += '灵币+' + result.reward.currency + ' ';
                    if (rewardMsg) $P.showToast({ title: rewardMsg, icon: 'success', duration: 2000 });
                    worldMapSystem.saveProgress();
                }
                if (result.type === 'portal') {
                    var _now = Date.now();
                    if (_now - _lastPortalTime < 3000) {
                        $P.showToast({ title: '传送冷却中...', icon: 'none', duration: 1000 });
                        return;
                    }
                    _lastPortalTime = _now;
                    _log('传送到:', result.targetWorld);
                    if (audioSystem) audioSystem.playTeleport();
                    var fromWorld = worldMapSystem.getWorldId();
                    // world_17 BGM 切换
                    if (fromWorld === 'world_17' && result.targetWorld !== 'world_17') {
                        if (audioSystem) {
                            audioSystem.exitArdeacinerea();
                            // 退出冥境后恢复大地图默认 BGM
                            audioSystem.playBgm('shuhanTheme', 0.32);
                        }
                    }
                    worldMapSystem.loadWorld(result.targetWorld, fromWorld);
                    _updateCatSpiritVisibility(result.targetWorld);
                    worldMapSystem.saveProgress();
                    if (result.targetWorld === 'world_17') {
                        if (audioSystem) audioSystem.enterArdeacinerea();
                    }
                }
                if (result.type === 'portal_locked') {
                    _log('传送门未解锁:', result.message);
                    var pct = Math.floor((result.current || 0) * 100);
                    var req = Math.floor((result.required || 0) * 100);
                    $P.showToast({ title: result.message || '探索度未达标', icon: 'none', duration: 2000 });
                }
                if (result.type === 'barrier') {
                    _log('屏障:', result.lockedMessage);
                    $P.showToast({ title: result.lockedMessage || '无法通行', icon: 'none', duration: 2000 });
                }
                if (result.type === 'npc') {
                    _log('NPC对话:', result.entity.id);
                    var driverId = result.entity && result.entity.npcDialogueDriver;
                    if (driverId && NPC_DIALOGUE_DRIVERS && NPC_DIALOGUE_DRIVERS[driverId]) {
                        _handleNpcDialogue(driverId);
                    } else if (worldMapRenderer && result.dialogue && result.dialogue.length > 0) {
                        worldMapRenderer.showDialogue(result.dialogue);
                        var firstLine = result.dialogue[0];
                        if (typeof firstLine === 'object' && firstLine.voice && audioSystem) {
                            audioSystem.playVo(firstLine.voice);
                        }
                    }
                }
            }
        });

        function _handleNpcDialogue(driverId) {
            var drv = NPC_DIALOGUE_DRIVERS[driverId];
            var pd = saveData;
            if (!pd.npcDialogState) pd.npcDialogState = {};
            if (!pd.npcDialogState[driverId]) {
                pd.npcDialogState[driverId] = drv.initState();
            }
            var state = pd.npcDialogState[driverId];

            var script = drv.getScript(state);
            if (!script || script.length === 0) return;

            worldMapRenderer.showDialogue(script, function (choiceKey) {
                if (choiceKey) {
                    var result = drv.onChoice(pd, driverId, state, choiceKey);
                    if (result && result.completeTask && completeEventTask) {
                        completeEventTask(result.completeTask);
                    }
                    if (result && result.toast) {
                        $P.showToast({ title: result.toast, icon: 'success', duration: 2500 });
                    }
                    worldMapSystem.saveProgress();

                    // 空格灵光引导：首次获得闪避灵光时触发
                    if (choiceKey === 'care' && driverId === 'cat_spirit' && pd.unlockedStarTypes.indexOf('dodge') !== -1 && !pd._spaceKeyTutorialShown) {
                        pd._spaceKeyTutorialShown = true;
                        _pendingSpaceKeyTutorial = true;
                    }
                }
            });
        }

        worldMapRenderer = _gameModules.createWorldMapRenderer({
            getCtx: function() { return ctx; },
            getScreenWidth: function() { return screenWidth; },
            getScreenHeight: function() { return screenHeight; },
            getScreenScale: function() { return getScreenScale(); },
            getWorldMapSystem: function() { return worldMapSystem; },
            getAssets: function() { return Assets; },
            getJoystickState: function() { return { active: _joystickActive, startX: _joystickStartX, startY: _joystickStartY, dx: _joystickDX, dy: _joystickDY }; },
            getDesignOffsetY: getDesignOffsetY,
            getAudioSystem: function() { return audioSystem; }
        });

        // 键盘事件
        document.addEventListener('keydown', function(e) {
            var key = e.key.toLowerCase();
            _keysDown[key] = true;
            // E 键交互（worldmap 状态）
            if (key === 'e' && state === GAME_STATE.WORLDMAP && worldMapSystem) {
                if (worldMapRenderer && worldMapRenderer.isDialogueOpen()) {
                    var nextLine = worldMapRenderer.advanceDialogue();
                    if (nextLine && typeof nextLine === 'object' && nextLine.voice && audioSystem) {
                        if (nextLine.stopVoice) audioSystem.stopVo(nextLine.stopVoice);
                        audioSystem.playVo(nextLine.voice);
                    }
                } else {
                    var nearEntity = worldMapSystem.getNearbyEntity();
                    if (nearEntity) {
                        _log('E键交互实体:', nearEntity.id);
                        worldMapSystem.interact(nearEntity.id);
                    }
                }
            }
            // 空格灵光触发
            if (e.key === ' ' && !e.repeat && !_spaceKeyHolding) {
                var _combatStates = [GAME_STATE.PLAYING, GAME_STATE.SEASON_PLAYING, GAME_STATE.STAGE_PLAYING, GAME_STATE.BOSS_BATTLE, GAME_STATE.TOWER_COMBAT];
                if (_combatStates.indexOf(state) !== -1 && saveData.spaceKeyStar) {
                    // 检查硬控和节奏技
                    if (playerEffects.isStunned && playerEffects.isStunned()) { return; }
                    if (rhythmSkillSystem && rhythmSkillSystem.isActive()) { return; }
                    // 遍历 stars[] 从后往前找目标灵光
                    var _found = null;
                    for (var si = stars.length - 1; si >= 0; si--) {
                        if (stars[si].type === saveData.spaceKeyStar && stars[si].visible) {
                            _found = stars[si];
                            break;
                        }
                    }
                    if (_found) {
                        _spaceKeyHolding = true;
                        _spaceKeyDownTime = Date.now();
                        _spaceKeyTargetStar = _found;
                    }
                }
            }
        });
        document.addEventListener('keyup', function(e) {
            _keysDown[e.key.toLowerCase()] = false;
            // 空格松手
            if (e.key === ' ' && _spaceKeyHolding) {
                var holdDuration = Date.now() - _spaceKeyDownTime;
                if (holdDuration < 150) {
                    // 短按：调用 handleStarClick
                    if (_spaceKeyTargetStar && _spaceKeyTargetStar.visible && normalBattleAdapter) {
                        normalBattleAdapter.handleStarClick(_spaceKeyTargetStar.x, _spaceKeyTargetStar.y);
                    }
                }
                // 长按释放由 ChargeSystem 处理（在 update 中检测）
                if (holdDuration >= 150 && chargeSystem) {
                    chargeSystem.releaseCharge();
                }
                _spaceKeyHolding = false;
                _spaceKeyDownTime = 0;
                _spaceKeyTargetStar = null;
            }
            // 键盘松手时输出位置
            if (state === GAME_STATE.WORLDMAP && worldMapSystem) {
                var _pp = worldMapSystem.getPlayerPos();
                console.log('[POS] worldId=' + worldMapSystem.getWorldId() + ' x=' + Math.round(_pp.x) + ' y=' + Math.round(_pp.y));
            }
        });

        _log('大世界探索系统初始化完成');

        // 启动渲染循环（所有系统初始化完成后）
        // 页面关闭时强制保存位置，绕过防抖
        window.addEventListener('beforeunload', function() {
            if (worldMapSystem) worldMapSystem.saveProgress();
            dataStore.flush();
        });
        function renderLoop() {
            render();
            dataStore.tryFlush();
            _rafId = requestAnimationFrame(renderLoop);
        }
        _rafId = requestAnimationFrame(renderLoop);

        // 验证玩家数据
        _log('=== 数据验证 ===');
        _log('ownedCharacters:', saveData.ownedCharacters);
        _log('currentCharacterId:', saveData.currentCharacterId);
        _log('unlockedStarTypes:', saveData.unlockedStarTypes);
        _log('materials:', JSON.stringify(saveData.materials));
        _log('characterExperience:', JSON.stringify(saveData.characterExperience));
        _log('==================');
        
        // 初始化开放数据域（用于好友排行榜）
        initOpenDataContext();
        
    } catch (error) {
        console.error('初始化失败:', error);
        $P.showToast({
            title: '初始化失败: ' + error.message,
            icon: 'none',
            duration: 3000
        });
    }
}

// 加载最高分

// 初始化广告

// 添加新灵韵
// 灵韵合成相关常量

// getCurrentCharacterConfig 保留在 game.js（被多处使用）

// 获取当前角色配置
var getCurrentCharacterConfig = null;


// ========== 连击系统结束 ==========

// 触摸事件处理
function handleTouchStart(res) {
    // 获取所有触点
    var touches = res.touches;
    var touch = touches[0];
    var x = touch.clientX;
    var y = touch.clientY;
    const scale = getScreenScale();
    var designBottom = Math.min(getDesignOffsetY() + Math.floor(812 * scale), screenHeight);

    // 点击音效
    if (audioSystem) audioSystem.playClick();

    // 点击波纹反馈动画（支持多指）
    for (let ti = 0; ti < touches.length; ti++) {
        createTapRippleAnimation(touches[ti].clientX, touches[ti].clientY, touches[ti].identifier);
    }

    _log('触摸点数:', touches.length, '状态:', state);

    // 教学胜利弹窗拦截（优先于所有状态判断，300ms保护期防误触）
    if (_tutorial.victoryPopup) {
        if (Date.now() - _tutorial.victoryPopup.createdAt >= 300) {
            _tutorial.victoryPopup.onClose();
        }
        return;
    }

    // ===== 调试面板关闭/操作（最高优先级，不受任何状态限制）=====
    if (debugPanelOpen && debugRenderer) {
        var _dpResult = debugRenderer.handleDebugPanelTouch(x, y);
        if (_dpResult === 'close') {
            debugPanelOpen = false;
            return;
        }
        if (_dpResult) {
            executeDebugAction(_dpResult);
            return;
        }
        return;
    }

    // ===== 开发者战斗调参工具（优先级最高）=====
    if (devBattleSystem && devBattleSystem.isVisible()) {
        devBattleSystem.handleTouch(x, y);
        return;
    }

    // ===== 调试按钮（WORLDMAP状态，不受教学状态限制）=====
    if (state === GAME_STATE.WORLDMAP) {
        var _dbSz = Math.floor(32 * scale);
        var _dbOv = uiConfig ? uiConfig.get('menu_debug_icon') : { dx: 0, dy: 0 };
        var _dbX = screenWidth - Math.floor(50 * scale) + _dbOv.dx * scale;
        var _dbY = getDesignOffsetY() + Math.floor(15 * scale) + _dbOv.dy * scale;
        if (x >= _dbX && x <= _dbX + _dbSz && y >= _dbY && y <= _dbY + _dbSz) {
            debugPanelOpen = true;
            _log('打开调试面板');
            return;
        }
    }

    // ===== 启动画面触摸 =====
    if (state === GAME_STATE.TITLE && titleRenderer) {
        var wasActivated = titleRenderer.isActivated && titleRenderer.isActivated();
        titleRenderer.handleTitleClick(x, y);
        if (!wasActivated && audioSystem) audioSystem.playBgm('mainMenu', 0.4);
        return;
    }

    // ===== 过场动画跳过 =====
    if (state === GAME_STATE.CUTSCENE && cutsceneRenderer) {
        if (cutsceneRenderer.hitTestSkipBtn(x, y)) {
            if (audioSystem) { audioSystem.playUiSkip(); audioSystem.fadeOutAudio('uiEnter', 250); audioSystem.fadeOutAudio('uiEnter2', 250); audioSystem.fadeOutAudio('uiEnter3', 250); }
            cutsceneRenderer.skip();
        } else {
            cutsceneRenderer.showSkipBtn();
        }
        return;
    }

    // ===== 对话剧情点击推进 =====
    if (state === GAME_STATE.CUTSCENE_DIALOGUE && dialogueSystem) {
        dialogueSystem.handleClick(x, y);
        return;
    }

    // ===== 大地图触摸 =====
    if (state === GAME_STATE.WORLDMAP && worldMapSystem) {
        // 对话框点击推进（优先处理选项点击）
        if (worldMapRenderer && worldMapRenderer.isDialogueOpen()) {
            var hotspot = worldMapRenderer.getChoiceHotspotAt(x, y);
            if (hotspot) {
                worldMapRenderer.advanceDialogue(hotspot.key);
                return;
            }
            // 无选项或未命中热区 → 触摸任意位置推进普通文本行
            var nextLine = worldMapRenderer.advanceDialogue();
            if (nextLine && typeof nextLine === 'object' && nextLine.voice && audioSystem) {
                if (nextLine.stopVoice) audioSystem.stopVo(nextLine.stopVoice);
                audioSystem.playVo(nextLine.voice);
            }
            return;
        }
        // 菜单栏按钮检测（优先于地图操作，教学完成前不显示）
        var _hasUnlockedStarter = saveData.ownedCharacters && saveData.ownedCharacters.indexOf('char_001') !== -1;
        if (_hasUnlockedStarter && _tutorial.completed) {
            var _menuBtnSize = Math.floor(50 * scale);
            var _menuBtnX = Math.floor(15 * scale);
            var _menuBtnY = designBottom - Math.floor(65 * scale);
            var _menuItemH = Math.floor(40 * scale);
            var _menuItemW = Math.floor(100 * scale);
            var _menuGap = Math.floor(8 * scale);

            // 展开菜单项点击
            if (uiScrollState.menuExpanded) {
                var _menuItems = [
                    { id: 'backpack', action: function() { if (audioSystem) audioSystem.playMenu2(); stateMachine.transitionTo(GAME_STATE.BACKPACK); updateTaskProgress('open_backpack', 1); updateTaskStats('backpackOpened', 1); } },
                    { id: 'shop', action: function() { if (audioSystem) audioSystem.playSpirit(); stateMachine.transitionTo(GAME_STATE.SHOP); uiScrollState.shopTab = 'materials'; updateTaskProgress('open_shop', 1); updateTaskStats('shopOpened', 1); } },
                    { id: 'leaderboard', action: function() { if (audioSystem) audioSystem.playMenu2(); stateMachine.transitionTo(GAME_STATE.LEADERBOARD); currentLeaderboardTab = 'best_score'; if (!openDataContext) initOpenDataContext(); currentLeaderboardTab = 'best_score'; sendLeaderboardMessage('show', 'best_score'); } },
                    { id: 'season', action: function() { if (audioSystem) audioSystem.playMenu2(); try { initSeasonContent(); seasonSelection = { character: null, skills: [], pet: null, starTypes: [] }; stateMachine.transitionTo(GAME_STATE.SEASON_MENU); } catch (e2) { console.error('进入赛季模式失败:', e2); $P.showToast({ title: '赛季暂不可用', icon: 'none' }); } } },
                    { id: 'boss', action: function() { if (audioSystem) audioSystem.playMenu2(); bossSelectScrollY = 0; stateMachine.transitionTo(GAME_STATE.BOSS_SELECT); } },
                    { id: 'tower', action: function() { if (audioSystem) audioSystem.playMenu2(); try { if (saveData.infiniteTower && saveData.infiniteTower.isPaused) { stateMachine.transitionTo(GAME_STATE.TOWER_RESUME); } else { towerSystem.init(); stateMachine.transitionTo(GAME_STATE.TOWER); } } catch (e3) { console.error('进入无尽之塔失败:', e3); $P.showToast({ title: '进入失败，请重试', icon: 'none' }); } } },
                    { id: 'idle', action: function() { if (audioSystem) audioSystem.playMenu2(); if (afkSystem) afkSystem.popupVisible = true; } },
                    // { id: 'fusion', action: function() { state = GAME_STATE.FUSION; } },
                    // { id: 'upgrade', action: function() { state = GAME_STATE.UPGRADE; } }
                ];
                for (var _mi = 0; _mi < _menuItems.length; _mi++) {
                    var _itemY = _menuBtnY - (_mi + 1) * (_menuItemH + _menuGap);
                    var _itemX = _menuBtnX - Math.floor(30 * scale);
                    if (x >= _itemX && x <= _itemX + _menuItemW && y >= _itemY && y <= _itemY + _menuItemH) {
                        uiScrollState.menuExpanded = false;
                        var _unlockCheck = isModeUnlocked(_menuItems[_mi].id, saveData, bestScore);
                        if (!_unlockCheck.unlocked) { $P.showToast({ title: _unlockCheck.hint, icon: 'none', duration: 1500 }); return; }
                        _log('大地图点击菜单项:', _menuItems[_mi].id);
                        _menuItems[_mi].action();
                        return;
                    }
                }
            }

            // 菜单按钮（收起/展开）
            var _tbX = _menuBtnX;
            var _tbY = _menuBtnY;
            var _tbSize = _menuBtnSize;
            if (!uiScrollState.menuExpanded) {
                _tbX = _menuBtnX - Math.floor(20 * scale);
                _tbSize = Math.floor(_menuBtnSize * 0.8);
                if (uiConfig) { var _mbo = uiConfig.get('menu_btn'); _tbX += _mbo.dx * scale; _tbY += _mbo.dy * scale; }
            }
            if (x >= _tbX && x <= _tbX + _tbSize && y >= _tbY && y <= _tbY + _tbSize) {
                _log('大地图点击展开菜单按钮');
                if (audioSystem) audioSystem.playAnswer2();
                uiScrollState.menuExpanded = !uiScrollState.menuExpanded;
                return;
            }

            // 展开时点击其他区域收起
            if (uiScrollState.menuExpanded) { uiScrollState.menuExpanded = false; return; }

            // 设置按钮
            var _setSz = Math.floor(32 * scale);
            var _sov = uiConfig ? uiConfig.get('menu_settings_icon') : { dx: 0, dy: 0 };
            var _setX = Math.floor(18 * scale) + _sov.dx * scale;
            var _setY = getDesignOffsetY() + Math.floor(15 * scale) + _sov.dy * scale;
            if (x >= _setX && x <= _setX + _setSz && y >= _setY && y <= _setY + _setSz) {
                _log('大地图点击设置按钮');
                stateMachine.transitionTo(GAME_STATE.SETTINGS);
                return;
            }

            // 任务按钮
            var _taskSz = Math.floor(40 * scale);
            var _taskY = getDesignOffsetY() + Math.floor(15 * scale) + _setSz + Math.floor(10 * scale);
            if (x >= Math.floor(15 * scale) && x <= Math.floor(15 * scale) + _taskSz && y >= _taskY && y <= _taskY + _taskSz) {
                _log('大地图点击任务按钮');
                stateMachine.transitionTo(GAME_STATE.TASKS);
                return;
            }
        }

        // 角色图标点击（进入编队系统，教学完成后可用）
        if (_tutorial.completed && saveData.ownedCharacters && saveData.ownedCharacters.length > 0 && saveData.currentCharacterId) {
            var _charBaseX = screenWidth - Math.floor(180 * scale);
            var _charBaseY = designBottom - Math.floor(92 * scale);
            var _charRightX = _charBaseX + Math.floor(90 * scale);
            var _charRightY = _charBaseY - Math.floor(2 * scale);
            var _charIconSz = Math.floor(50 * scale);
            if (x >= _charRightX && x <= _charRightX + _charIconSz && y >= _charRightY && y <= _charRightY + _charIconSz) {
                _log('大地图点击角色图标，进入编队');
                stateMachine.transitionTo(GAME_STATE.SQUAD);
                return;
            }
        }

        // 触屏实体交互（二次确认机制）
        console.log('[W17-DBG] touch x=' + x + ' y=' + y + ' confirmOpen=' + worldMapRenderer.isConfirmOpen());
        if (worldMapRenderer.isConfirmOpen()) {
            if (worldMapRenderer.checkConfirmHit(x, y)) {
                var cId = worldMapRenderer.getConfirmEntityId();
                _log('确认交互实体:', cId);
                worldMapRenderer.dismissConfirm();
                worldMapSystem.interact(cId);
                return;
            }
            worldMapRenderer.dismissConfirm();
        }
        var nearby = worldMapSystem.getNearbyEntity();
        console.log('[W17-DBG] nearby=' + (nearby ? nearby.id + ' type=' + nearby.type : 'null'));
        if (nearby) {
            var sp = worldMapRenderer.worldToScreen(nearby.x, nearby.y);
            var ir = (nearby.interactRadius || 40) * scale;
            console.log('[W17-DBG] sp=' + sp.x + ',' + sp.y + ' ir=' + ir + ' hitTest=' + (x >= sp.x - ir && x <= sp.x + ir && y >= sp.y - ir && y <= sp.y + ir));
            if (x >= sp.x - ir && x <= sp.x + ir && y >= sp.y - ir && y <= sp.y + ir) {
                _log('触屏弹出确认:', nearby.id);
                worldMapRenderer.showConfirm(nearby);
                return;
            }
        }
        // 摇杆起始
        // 调试：点击地图输出世界坐标
        var _camState = worldMapRenderer.getCameraState ? worldMapRenderer.getCameraState() : null;
        if (_camState) {
            var _ms = _camState.scale;
            var _wx = Math.round((x + _camState.camX) / _ms);
            var _wy = Math.round((y + _camState.camY) / _ms);
            console.log('[MAP] worldId=' + (worldMapSystem.getWorldId ? worldMapSystem.getWorldId() : '?') + ' x=' + _wx + ' y=' + _wy);
        }
        _joystickActive = true;
        _joystickStartX = x;
        _joystickStartY = y;
        _joystickDX = 0;
        _joystickDY = 0;
        return;
    }

    // ===== UI编辑器拦截（最高优先级）=====
    if (uiEditorSystem && uiEditorSystem.isActive()) {
        uiEditorSystem.handleTouchStart(x, y);
        return;
    }

    // ===== 挂机弹窗处理（最高优先级，阻止触摸穿透）=====
    if (afkSystem.popupVisible || afkSystem.resultVisible) {
        return;
    }

    // ===== 开发者战斗调参工具（优先级最高）=====
    if (devBattleSystem && devBattleSystem.isVisible()) {
        devBattleSystem.handleTouch(x, y);
        return;
    }

    // ===== 调试面板处理（优先级最高）=====
    if (debugPanelOpen) {
        var touchResult = debugRenderer.handleDebugPanelTouch(x, y);
        if (touchResult === 'close') {
            debugPanelOpen = false;
            _log('关闭调试面板');
            return;
        }
        if (touchResult) {
            executeDebugAction(touchResult);
            return;
        }
        return; // 调试面板打开时，不处理其他点击
    }
    
    // ===== 调试按钮点击（菜单界面右上角）=====
    if (state === GAME_STATE.MENU) {
        const debugIconSize = Math.floor(32 * scale);
        var debugOv = uiConfig ? uiConfig.get('menu_debug_icon') : { dx: 0, dy: 0 };
        const debugIconX = screenWidth - Math.floor(50 * scale) + debugOv.dx * scale;
        const debugIconY = getDesignOffsetY() + Math.floor(15 * scale) + debugOv.dy * scale;

        if (x >= debugIconX && x <= debugIconX + debugIconSize &&
            y >= debugIconY && y <= debugIconY + debugIconSize) {
            debugPanelOpen = true;
            _log('打开调试面板');
            return;
        }
    }

    // ===== 战斗中 DevBattle 浮动按钮（左下角）=====
    if (devBattleSystem && (state === GAME_STATE.PLAYING || state === GAME_STATE.PAUSED || state === GAME_STATE.BOSS_BATTLE || state === GAME_STATE.TOWER || state === GAME_STATE.TOWER_COMBAT || state === GAME_STATE.SEASON_PLAYING || state === GAME_STATE.STAGE_PLAYING)) {
        var devBtnSize = Math.floor(36 * scale);
        var devBtnX = Math.floor(12 * scale);
        var devBtnY = designBottom - Math.floor(56 * scale);
        if (x >= devBtnX && x <= devBtnX + devBtnSize &&
            y >= devBtnY && y <= devBtnY + devBtnSize) {
            devBattleSystem.toggle();
            return;
        }
    }

    // 如果是TOWER状态，记录触摸位置
    if (state === GAME_STATE.TOWER) {
        towerSystem.touchStartX = touches[0].clientX;
        towerSystem.touchStartY = touches[0].clientY;
        towerSystem.isDragging = false;
        return;
    }

    // 融合界面记录触摸位置用于滚动
    if (state === GAME_STATE.FUSION) {
        if (fusionRenderer) fusionRenderer.handleFusionTouchStart(touches[0].clientY);
    }

    // 升级界面记录触摸位置用于滚动
    if (state === GAME_STATE.UPGRADE) {
        if (upgradeRenderer) upgradeRenderer.handleUpgradeTouchStart(touches[0].clientY);
    }

    // 背包状态记录触摸位置用于滚动
    if (state === GAME_STATE.BACKPACK) {
        uiScrollState.backpackLastTouchY = touches[0].clientY;
        uiScrollState.backpackIsDragging = false;
        backpackTotalDragDistance = 0;  // 重置累计拖拽距离
        _log('背包触摸开始: Y=', touches[0].clientY, 'uiScrollState.backpackIsDragging=', uiScrollState.backpackIsDragging);
    }
    
    // Boss选择状态记录触摸位置用于滚动
    if (state === GAME_STATE.BOSS_SELECT) {
        bossSelectTouchStartY = touches[0].clientY;
        bossSelectIsDragging = false;
    }
    
    // 赛季选择状态记录触摸位置用于滚动
    if (state === GAME_STATE.SEASON_SELECT) {
        uiScrollState.seasonSelectLastTouchY = touches[0].clientY;
        uiScrollState.seasonSelectIsDragging = false;
        seasonSelectTotalDragDistance = 0;  // 重置累计拖拽距离
        uiScrollState.seasonSelectScrollY = uiScrollState.seasonSelectScrollY || 0;  // 确保滚动位置存在
        _log('赛季选择触摸开始: Y=', touches[0].clientY);
    }
    
    // 爬塔模式记录触摸位置
    if (state === GAME_STATE.TOWER) {
        towerSystem.touchStartX = touches[0].clientX;
        towerSystem.touchStartY = touches[0].clientY;
        towerSystem.isDragging = false;
    }
    
    // 抽卡动画状态处理
    if (state === GAME_STATE.GACHA_ANIMATION) {
        var touch = touches[0];
        handleGachaAnimationClick(touch.clientX, touch.clientY);
        return;
    }
    
    // 爬塔战斗模式处理（走共享触摸路径，胜利弹窗仍在此处理）
    if (state === GAME_STATE.TOWER_COMBAT) {
        // 如果有胜利弹窗，点击关闭
        if (towerSystem.victoryPopup) {
            towerSystem.victoryPopup = null;
            if (towerSystem.victoryPopupTimer) {
                clearTimeout(towerSystem.victoryPopupTimer);
                towerSystem.victoryPopupTimer = null;
            }
            // 返回爬塔地图
            stateMachine.transitionTo(GAME_STATE.TOWER);
            towerSystem.saveProgress();
            return;
        }
        // 塔战斗技能栏和灵韵攻击走共享路径
    }
    
    // 编队系统记录触摸位置用于滚动
    if (state === GAME_STATE.SQUAD && squadRenderer) {
        squadRenderer.handleScrollStart(touches);
    }
    
    // 记录触摸开始时的状态（用于防止跨界面点击）
    touchStartState = state;

    // 冷却期保护：游戏结束1.5秒内禁止点击
        if (state === GAME_STATE.GAMEOVER && gameEndTime > 0) {
            var timeSinceEnd = Date.now() - gameEndTime;
            if (timeSinceEnd < 1500) {  // 1.5秒冷却期
                _log('冷却期中，忽略点击，剩余时间:', (1500 - timeSinceEnd), 'ms');
                return;
            }
        }
    
        // 响应式缩放比例（已在函数开头声明）
        // const scale = getScreenScale();
        
        // 只用第一个触点检测暂停按钮（已在函数开头获取 x, y）
        // var firstTouch = touches[0];
        // var x = firstTouch.clientX;
        // var y = firstTouch.clientY;
    
        // 检查是否点击暂停按钮（仅在游戏中，包括赛季模式、Boss、塔）
        if (state === GAME_STATE.PLAYING || state === GAME_STATE.SEASON_PLAYING || state === GAME_STATE.STAGE_PLAYING || state === GAME_STATE.BOSS_BATTLE || state === GAME_STATE.TOWER_COMBAT || state === GAME_STATE.TUTORIAL) {
            const pauseBtnSize = Math.floor(50 * scale);
            if (x >= 15 && x <= 15 + pauseBtnSize && y >= getDesignOffsetY() + Math.floor(15 * scale) && y <= getDesignOffsetY() + Math.floor(15 * scale) + pauseBtnSize) {
                _log('点击暂停按钮');
                previousState = state;
                PauseCoordinator.instance.pause();
                stateMachine.transitionTo(GAME_STATE.PAUSED);
                return;
            }
            
            // 检查道具按钮点击（赛季模式禁用道具，Boss/塔无道具按钮）
            if (state !== GAME_STATE.SEASON_PLAYING && getCombatFeatures().itemButtons) {
            const itemBtnSize = Math.floor(45 * scale);
            const itemBtnY = getDesignOffsetY() + Math.floor(75 * scale);

            // 治疗药水按钮
            if (x >= 15 && x <= 15 + itemBtnSize && y >= itemBtnY && y <= itemBtnY + itemBtnSize) {
                if (gameItems.healPotion > 0) {
                    // 有道具时使用道具
                    _log('点击治疗药水按钮');
                    useItem('healPotion');
                } else {
                    $P.showToast({ title: '治疗药水已用完', icon: 'none', duration: 1500 });
                }
                return;
            }

            // 时间药水按钮
            const timeBtnY = itemBtnY + itemBtnSize + Math.floor(8 * scale);
            if (x >= 15 && x <= 15 + itemBtnSize && y >= timeBtnY && y <= timeBtnY + itemBtnSize) {
                if (gameItems.timePotion > 0) {
                    // 有道具时使用道具
                    _log('点击时间药水按钮');
                    useItem('timePotion');
                } else {
                    $P.showToast({ title: '时间药水已用完', icon: 'none', duration: 1500 });
                }
                return;
            }
            } // 结束赛季模式道具按钮点击条件
            
            // 时间灵韵主动技能按钮点击检测（需要解锁且装备到编队）
            const hasTimeStarUnlocked = saveData.unlockedStarTypes && saveData.unlockedStarTypes.indexOf('time') !== -1;
            const hasTimeStarEquipped = saveData.equippedStars && saveData.equippedStars.indexOf('time') !== -1;
            const hasTimeStar = hasTimeStarUnlocked && hasTimeStarEquipped;
            if (hasTimeStar && monster.active && state !== GAME_STATE.SEASON_PLAYING) {
                const skillBtnSize = Math.floor(45 * scale);
                const skillBtnY = getDesignOffsetY() + Math.floor(75 * scale) + (Math.floor(45 * scale) + 5) * 2 + 5; // 在道具按钮下方
                
                if (x >= 15 && x <= 15 + skillBtnSize && y >= skillBtnY && y <= skillBtnY + skillBtnSize) {
                    // 计算可消耗的时间（总时间 - 30秒）
                    const consumableTime = Math.max(0, timeLeft - TIME_STAR_MIN_TIME);
                    
                    if (consumableTime > 0) {
                        // 计算基础伤害：每秒×2
                        let damage = consumableTime * 2;
                        
                        // ===== 暴击判定 =====
                        // 获取角色暴击率和暴击伤害
                        var currentCharId = saveData.currentCharacterId;
                        var charStats = currentCharId ? getCharacterFullStats(currentCharId) : null;
                        var totalCritRate = (charStats ? charStats.critRate : 0) + (saveData.extraCritRate || 0) + (activeBuffs.critRateBonus || 0);
                        var baseCritDamage = charStats ? charStats.critDamage : 2.0;
                        baseCritDamage += (saveData.extraCritDamage || 0);
                        
                        // 暴击判定
                        var isCritical = Math.random() * 100 < totalCritRate;
                        var critText = '';
                        
                        if (isCritical) {
                            damage = Math.floor(damage * baseCritDamage);
                            critText = ' 💥暴击!';
                            _log('⏰ 时间灵韵技能暴击! 倍率:', baseCritDamage);
                            
                            // 创建暴击动画
                            createCritAnimation(screenWidth / 2, getDesignOffsetY() + Math.floor(DESIGN_HEIGHT / 3 * getScreenScale()), damage, 0);
                        }
                        
                        _log('⏰ 时间灵韵技能! 消耗时间:', consumableTime, '秒, 造成伤害:', damage, '暴击:', isCritical);
                        
                        // 扣除时间（保留最低时间）
                        timeLeft = TIME_STAR_MIN_TIME;
                        
                        // 对怪物造成伤害
                        monster.hp -= damage;
                        _log('时间灵韵技能命中! 怪物HP:', monster.hp, '伤害:', damage);
                        
                        // 显示提示
                        addGameMessage('⏰ 时间爆发!' + critText + ' -' + damage, '#00ccff');
                        
                        // 震动反馈（暴击震动更强）
                        $P.vibrateShort({ type: isCritical ? 'heavy' : 'medium' });
                        
                        // 检查怪物是否死亡
                        if (monster.hp <= 0) {
                            onMonsterKilled();
                            return;
                        }
                    } else {
                        addGameMessage('时间不足30秒', '#ff6b6b');
                    }
                    return;
                }
            }
            
            // 贪婪技能按钮点击检测（需要解锁且装备到编队）
            const hasGreedyStarUnlocked = saveData.unlockedStarTypes && saveData.unlockedStarTypes.indexOf('greedy') !== -1;
            const hasGreedyStarEquipped = saveData.equippedStars && saveData.equippedStars.indexOf('greedy') !== -1;
            const hasGreedyStar = hasGreedyStarUnlocked && hasGreedyStarEquipped;
            if (hasGreedyStar && state !== GAME_STATE.SEASON_PLAYING) {
                const greedyBtnSize = Math.floor(45 * scale);
                const greedyBtnY = getDesignOffsetY() + Math.floor(75 * scale) + (Math.floor(45 * scale) + 5) * 3 + 5; // 在时间灵韵技能按钮下方
                
                if (x >= 15 && x <= 15 + greedyBtnSize && y >= greedyBtnY && y <= greedyBtnY + greedyBtnSize) {
                    // 尝试使用贪婪技能
                    useGreedySkill();
                    return;
                }
            }
            
            // ==================== 技能栏点击检测 ====================
            // 非赛季模式下检测技能栏点击（圆形标签），Boss/塔通过 skillBar 特性控制
            if (state !== GAME_STATE.SEASON_PLAYING && getCombatFeatures().skillBar && saveData.skills && saveData.skills.equipped) {
                const equippedSkills = saveData.skills.equipped;
                // 过滤出主动技能
                const activeSkills = equippedSkills.filter(skillId => {
                    const skill = Skills[skillId];
                    return skill && (skill.type === SkillTypes.ATTACK || skill.type === SkillTypes.SUPPORT);
                });
                
                if (activeSkills.length > 0) {
                    // 圆形标签配置（与渲染一致）
                    const circleRadius = Math.floor(22 * scale);
                    const circleGap = Math.floor(8 * scale);
                    const startX = screenWidth - circleRadius - Math.floor(5 * scale);
                    // 从下方开始计算位置（向上排列）
                    const totalHeight = activeSkills.length * (circleRadius * 2) + (activeSkills.length - 1) * circleGap;
                    const startY = designBottom - Math.floor(100 * scale) - totalHeight;
                    
                    // 检测每个圆形技能点击
                    for (let i = 0; i < activeSkills.length; i++) {
                        const skillId = activeSkills[i];
                        const centerX = startX;
                        const centerY = startY + i * (circleRadius * 2 + circleGap) + circleRadius;
                        
                        // 计算点击位置与圆心的距离
                        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                        
                        if (distance <= circleRadius) {
                            _log('点击技能:', skillId);
                            useSkill(skillId);
                            return;  // 处理完一个技能后退出
                        }
                    }
                }
            }

            // 塔模式技能栏点击检测
            if (state === GAME_STATE.TOWER_COMBAT && towerSystem) {
                var towerActSkills = towerSystem.getActiveSkills();
                if (towerActSkills.length > 0) {
                    var tSkR = Math.floor(22 * scale);
                    var tSkGap = Math.floor(8 * scale);
                    var tSkStartX = screenWidth - tSkR - Math.floor(5 * scale);
                    var tSkTotalH = towerActSkills.length * (tSkR * 2) + (towerActSkills.length - 1) * tSkGap;
                    var tSkStartY = designBottom - Math.floor(100 * scale) - tSkTotalH;
                    for (var tski = 0; tski < towerActSkills.length; tski++) {
                        var tSkCX = tSkStartX;
                        var tSkCY = tSkStartY + tski * (tSkR * 2 + tSkGap) + tSkR;
                        var tSkDist = Math.sqrt(Math.pow(x - tSkCX, 2) + Math.pow(y - tSkCY, 2));
                        if (tSkDist <= tSkR) {
                            towerSystem.useSkillInCombat(towerActSkills[tski]);
                            return;
                        }
                    }
                }
            }
        }
        if (PauseCoordinator.instance.isPaused) {
            const btnWidth = Math.floor(200 * scale);
            const btnHeight = Math.floor(60 * scale);

            // 返回菜单按钮
            const menuBtnY = getDesignOffsetY() + Math.floor(DESIGN_HEIGHT * 0.60 * getScreenScale());
            if (x >= screenWidth/2 - btnWidth/2 && x <= screenWidth/2 + btnWidth/2 &&
                y >= menuBtnY - btnHeight/2 && y <= menuBtnY + btnHeight/2) {
                _log('点击返回菜单');
                // 教学剧情退出额外清理（cleanup handler 只清战斗状态）
                if (_tutorial.active) {
                    _tutorial.completed = false;
                    runtimeData.tutorialCompleted = false;
                    if (sceneDispatcher) sceneDispatcher.destroy();
                    if (dialogueSystem) dialogueSystem.destroy();
                    if (worldMapSystem) {
                        worldMapSystem.restoreReturnPosition();
                        worldMapSystem.unresolveEntity('tutorial_spirits');
                    }
                }
                var exitMode = modeLifecycle.getActiveMode();
                if (exitMode) {
                    modeLifecycle.cleanupMode(exitMode, { fullExit: true });
                } else {
                    endGame();
                }
                PauseCoordinator.instance.forceResetPaused();
                return;
            }

            // 重新开始按钮
            const restartBtnY = getDesignOffsetY() + Math.floor(DESIGN_HEIGHT * 0.70 * getScreenScale());
            if (x >= screenWidth/2 - btnWidth/2 && x <= screenWidth/2 + btnWidth/2 &&
                y >= restartBtnY - btnHeight/2 && y <= restartBtnY + btnHeight/2) {
                _log('点击重新开始');
                if (audioSystem) audioSystem.playMenu1();
                PauseCoordinator.instance.forceResetPaused();
                var rMode = modeLifecycle.getActiveMode();
                if (rMode) {
                    modeLifecycle.restartMode(rMode);
                } else {
                    startGame();
                }
                return;
            }

            // 继续游戏按钮 — 统一通过 ModeLifecycleManager
            const resumeBtnY = getDesignOffsetY() + Math.floor(DESIGN_HEIGHT * 0.80 * getScreenScale());
            if (x >= screenWidth/2 - btnWidth/2 && x <= screenWidth/2 + btnWidth/2 &&
                y >= resumeBtnY - btnHeight/2 && y <= resumeBtnY + btnHeight/2) {
                _log('点击继续游戏');
                PauseCoordinator.instance.resume();
                stateMachine.transitionTo(previousState);
                return;
            }
    
            return; // 暂停状态下，点击其他区域无效
        }
    
        if (state === GAME_STATE.PLAYING || state === GAME_STATE.SEASON_PLAYING || state === GAME_STATE.STAGE_PLAYING || state === GAME_STATE.BOSS_BATTLE || state === GAME_STATE.TOWER_COMBAT || state === GAME_STATE.TUTORIAL) {
            if (USE_TOUCH_PIPELINE && touchPipeline) {
                // ── 统一触摸管道模式 ──
                for (let t = 0; t < touches.length; t++) {
                    var ctx = touchPipeline.createContext({
                        x: touches[t].clientX,
                        y: touches[t].clientY,
                        touchId: touches[t].identifier,
                        timestamp: Date.now(),
                        stars: stars,
                        playerEffects: playerEffects,
                        isGrounded: true
                    });
                    touchPipeline.runStart(ctx);
                }
            } else {
                // ── 旧触摸逻辑（备用） ──
                if (playerEffects.stunned) {
                    if (Date.now() >= playerEffects.stunEndTime) {
                        playerEffects.stunned = false;
                    } else {
                        return;
                    }
                }

                for (let t = 0; t < touches.length; t++) {
                    var touch = touches[t];
                    var touchX = touch.clientX;
                    var touchY = touch.clientY;

                    if (rhythmSkillSystem && rhythmSkillSystem.isActive()) {
                        rhythmSkillSystem.handleTouch(touchX, touchY);
                        continue;
                    }

                    if (linkChainSystem && linkChainSystem.isReady()) {
                        if (linkChainSystem.handleTriggerTouch(touchX, touchY)) {
                            if (touchGestureSystem) {
                                touchGestureSystem.handleGestureStart(touchX, touchY, touch.identifier);
                            }
                            continue;
                        }
                    }

                    if (touchGestureSystem) {
                        var gestureConsumed = touchGestureSystem.handleGestureStart(touchX, touchY, touch.identifier);
                        if (gestureConsumed) continue;
                    }

                    if (normalBattleAdapter) {
                        if (normalBattleAdapter.handleStarClick(touchX, touchY)) continue;
                    }

                    for (let pi = poisonPuddleSystem.poisonStars.length - 1; pi >= 0; pi--) {
                    var ps = poisonPuddleSystem.poisonStars[pi];
                    var psDx = touchX - ps.x;
                    var psDy = touchY - ps.y;
                    if (psDx * psDx + psDy * psDy < ps.size * ps.size) {
                        audioSystem.playPoisonClick();
                        audioSystem.playPetAttack();
                        var pDmg = _COMBAT_SPEC.STATUS.POISON_STAR_DAMAGE;
                        createMeteorAnimation(
                            ps.x, ps.y,
                            pDmg,
                            false,
                            'poison',
                            0,
                            1,
                            null,
                            { x: screenWidth / 2, y: designBottom - Math.floor(50 * scale) }
                        );
                        applyPoisonStarEffect(pDmg);
                        poisonPuddleSystem.removePoisonStar(pi);
                    }
                }
                }
            }
        } else if (state === GAME_STATE.MENU) {
        // 响应式按钮尺寸（缩小一半）
        const btnWidth = Math.floor(100 * scale);
        const btnHeight = Math.floor(40 * scale);

        // 检查是否已解锁青铜小鼎（达到50分）
        const hasUnlockedStarter = saveData.ownedCharacters && saveData.ownedCharacters.indexOf('char_001') !== -1;

        // 开始按钮位置
        var startBtnOv = uiConfig ? uiConfig.get('menu_start_btn') : { dx: 0, dy: 0 };
        var btnY = getDesignOffsetY() + Math.floor(DESIGN_HEIGHT * 0.66 * getScreenScale()) + startBtnOv.dy * getScreenScale();
        var btnCenterX = screenWidth / 2 + startBtnOv.dx * scale;

        // 开始按钮点击检测（需要同时检查X和Y坐标）
        if (x >= btnCenterX - btnWidth/2 && x <= btnCenterX + btnWidth/2 &&
            y >= btnY - btnHeight/2 && y <= btnY + btnHeight/2) {
            _log('点击开始按钮');
            startGame();
            return;
        }

        // 闯关模式按钮（开始游戏下方）
        var stageBtnOv = uiConfig ? uiConfig.get('menu_stage_btn') : { dx: 0, dy: 0 };
        var stageBtnY = getDesignOffsetY() + Math.floor(DESIGN_HEIGHT * 0.74 * getScreenScale()) + stageBtnOv.dy * getScreenScale();
        var stageBtnCenterX = screenWidth / 2 + stageBtnOv.dx * scale;
        if (x >= stageBtnCenterX - btnWidth/2 && x <= stageBtnCenterX + btnWidth/2 &&
            y >= stageBtnY - btnHeight/2 && y <= stageBtnY + btnHeight/2) {
            _log('点击闯关模式按钮');
            selectedChapter = 1;
            stateMachine.transitionTo(GAME_STATE.STAGE_SELECT);
            return;
        }

        // 以下按钮只有解锁后才响应点击
        if (hasUnlockedStarter) {
            // 左下角展开菜单
            var menuBtnSize = Math.floor(50 * scale);
            var menuBtnX = Math.floor(15 * scale);
            var menuBtnY = designBottom - Math.floor(65 * scale);
            var menuItemHeight = Math.floor(40 * scale);
            var menuItemWidth = Math.floor(100 * scale);
            var menuGap = Math.floor(8 * scale);

            // 展开的菜单项点击检测
            if (uiScrollState.menuExpanded) {
                var menuItems = [
                    { id: 'backpack', action: () => { if (audioSystem) audioSystem.playMenu2(); stateMachine.transitionTo(GAME_STATE.BACKPACK); updateTaskProgress('open_backpack', 1); updateTaskStats('backpackOpened', 1); } },
                    { id: 'shop', action: () => { if (audioSystem) audioSystem.playSpirit(); stateMachine.transitionTo(GAME_STATE.SHOP); uiScrollState.shopTab = 'materials'; updateTaskProgress('open_shop', 1); updateTaskStats('shopOpened', 1); } },
                    { id: 'leaderboard', action: () => { if (audioSystem) audioSystem.playMenu2(); stateMachine.transitionTo(GAME_STATE.LEADERBOARD); currentLeaderboardTab = 'best_score'; if (!openDataContext) initOpenDataContext(); currentLeaderboardTab = 'best_score'; sendLeaderboardMessage('show', 'best_score'); } },
                    { id: 'season', action: () => { if (audioSystem) audioSystem.playMenu2();
                        try {
                            initSeasonContent(); 
                            seasonSelection = { character: null, skills: [], pet: null, starTypes: [] };
                                                        stateMachine.transitionTo(GAME_STATE.SEASON_MENU);                        } catch (e) {
                            console.error('进入赛季模式失败:', e);
                            $P.showToast({ title: '赛季暂不可用', icon: 'none' });
                        }
                    } },
                    { id: 'boss', action: () => { if (audioSystem) audioSystem.playMenu2(); bossSelectScrollY = 0; stateMachine.transitionTo(GAME_STATE.BOSS_SELECT); } },
                    { id: 'tower', action: () => {
                        if (audioSystem) audioSystem.playMenu2();
                        try {
                            // 检查是否有暂停的进度
                            if (saveData.infiniteTower && saveData.infiniteTower.isPaused) {
                                stateMachine.transitionTo(GAME_STATE.TOWER_RESUME); // 显示选择界面
                            } else {
                                towerSystem.init();
                                stateMachine.transitionTo(GAME_STATE.TOWER);
                            }
                        } catch (e) {
                            console.error('进入无尽之塔失败:', e);
                            $P.showToast({ title: '进入失败，请重试', icon: 'none' });
                        }
                    } },
                    { id: 'idle', action: () => { if (audioSystem) audioSystem.playMenu2(); if (afkSystem) afkSystem.popupVisible = true; } },
                    // { id: 'fusion', action: () => { state = GAME_STATE.FUSION; } },
                    // { id: 'upgrade', action: () => { state = GAME_STATE.UPGRADE; } }
                ];

                for (let mi = 0; mi < menuItems.length; mi++) {
                    var itemY = menuBtnY - (mi + 1) * (menuItemHeight + menuGap);
                    // 点击区域与渲染区域匹配（图标向左偏移了30*scale，所以点击区域也要调整）
                    var itemX = menuBtnX - Math.floor(30 * scale);
                    if (x >= itemX && x <= itemX + menuItemWidth &&
                        y >= itemY && y <= itemY + menuItemHeight) {
                        uiScrollState.menuExpanded = false;
                        var unlockCheck = isModeUnlocked(menuItems[mi].id, saveData, bestScore);
                        if (!unlockCheck.unlocked) {
                            $P.showToast({ title: unlockCheck.hint, icon: 'none', duration: 1500 });
                            return;
                        }
                        _log('点击菜单项:', menuItems[mi].id);
                        menuItems[mi].action();
                        return;
                    }
                }
            }

            // 主菜单按钮点击（收起状态应用UI编辑器偏移）
            var touchBtnX = menuBtnX;
            var touchBtnY = menuBtnY;
            var touchBtnSize = menuBtnSize;
            if (!uiScrollState.menuExpanded) {
                touchBtnX = menuBtnX - Math.floor(20 * scale);
                touchBtnSize = Math.floor(menuBtnSize * 0.8);
                if (uiConfig) {
                    var menuBtnOv = uiConfig.get('menu_btn');
                    touchBtnX += menuBtnOv.dx * scale;
                    touchBtnY += menuBtnOv.dy * scale;
                }
            }
            if (x >= touchBtnX && x <= touchBtnX + touchBtnSize &&
                y >= touchBtnY && y <= touchBtnY + touchBtnSize) {
                _log('点击展开菜单按钮');
                if (audioSystem) audioSystem.playMenuClick();
                uiScrollState.menuExpanded = !uiScrollState.menuExpanded;
                return;
            }

            // 如果菜单展开，点击其他区域收起菜单
            if (uiScrollState.menuExpanded) {
                uiScrollState.menuExpanded = false;
                return;
            }

            // 设置按钮位置（左上角图标）
            const settingIconSize = Math.floor(32 * scale);
            var settingsOv = uiConfig ? uiConfig.get('menu_settings_icon') : { dx: 0, dy: 0 };
            var settingsTapX = Math.floor(18 * scale) + settingsOv.dx * scale;
            var settingsTapY = getDesignOffsetY() + Math.floor(15 * scale) + settingsOv.dy * scale;
            if (x >= settingsTapX && x <= settingsTapX + settingIconSize &&
                y >= settingsTapY && y <= settingsTapY + settingIconSize) {
                _log('点击设置按钮');
                stateMachine.transitionTo(GAME_STATE.SETTINGS);
            }

            // 任务按钮位置（设置图标下方）
            const taskIconSize = Math.floor(40 * scale);
            const taskIconY = getDesignOffsetY() + Math.floor(15 * scale) + settingIconSize + Math.floor(10 * scale);
            if (x >= Math.floor(15 * scale) && x <= Math.floor(15 * scale) + taskIconSize &&
                y >= taskIconY && y <= taskIconY + taskIconSize) {
                _log('点击任务按钮');
                stateMachine.transitionTo(GAME_STATE.TASKS);
                tasksTab = 'guide';
            }

            // 角色图标点击（进入编队系统）
            var baseX = screenWidth - Math.floor(180 * scale);
            var baseY = designBottom - Math.floor(92 * scale);
            var rightX = baseX + Math.floor(90 * scale);
            var rightY = baseY - Math.floor(2 * scale);
            var iconSize = Math.floor(50 * scale);

            if (x >= rightX && x <= rightX + iconSize &&
                y >= rightY && y <= rightY + iconSize) {
                _log('点击角色图标，进入编队系统');
                stateMachine.transitionTo(GAME_STATE.SQUAD);
            }
        }
    } else if (state === GAME_STATE.BACKPACK) {
        // 背包点击检测统一在 handleTouchEnd 中处理
        // 这里不做任何处理，避免 touchstart 和 touchend 同时触发
    } else if (state === GAME_STATE.SHOP) {
        // 返回按钮（左下角）- 适用于所有标签页
        if (isBackButtonClicked(x, y)) {
            _log('点击商城返回按钮');
            stateMachine.transitionTo(GAME_STATE.WORLDMAP);
            return;
        }
        
        // 商城页面点击处理（单行6个标签）
        var tabWidth = Math.floor(50 * scale);
        var tabHeight = Math.floor(30 * scale);
        var tabGap = Math.floor(5 * scale);
        var startX = (screenWidth - (tabWidth * 6 + tabGap * 5)) / 2;
        var tabY = getDesignOffsetY() + Math.floor(110 * scale);

        // 材料标签按钮
        if (x >= startX && x <= startX + tabWidth &&
            y >= tabY && y <= tabY + tabHeight) {
            _log('点击材料标签');
            uiScrollState.shopTab = 'materials';
            uiScrollState.shopScrollY = 0;
            return;
        }

        // 增益标签按钮
        if (x >= startX + tabWidth + tabGap && x <= startX + tabWidth * 2 + tabGap &&
            y >= tabY && y <= tabY + tabHeight) {
            _log('点击增益标签');
            uiScrollState.shopTab = 'buffs';
            uiScrollState.shopScrollY = 0;
            return;
        }
        
        // 道具标签按钮
        if (x >= startX + (tabWidth + tabGap) * 2 && x <= startX + tabWidth * 3 + tabGap * 2 &&
            y >= tabY && y <= tabY + tabHeight) {
            _log('点击道具标签');
            uiScrollState.shopTab = 'items';
            uiScrollState.shopScrollY = 0;
            return;
        }
        
        // 抽卡标签按钮
        if (x >= startX + (tabWidth + tabGap) * 3 && x <= startX + tabWidth * 4 + tabGap * 3 &&
            y >= tabY && y <= tabY + tabHeight) {
            _log('点击抽卡标签');
            uiScrollState.shopTab = 'gacha';
            uiScrollState.shopScrollY = 0;
            return;
        }
        
        // 宠物标签按钮
        if (x >= startX + (tabWidth + tabGap) * 4 && x <= startX + tabWidth * 5 + tabGap * 4 &&
            y >= tabY && y <= tabY + tabHeight) {
            _log('点击宠物标签');
            uiScrollState.shopTab = 'pets';
            uiScrollState.shopScrollY = 0;
            return;
        }
        
        // 月卡标签按钮
        if (x >= startX + (tabWidth + tabGap) * 5 && x <= startX + tabWidth * 6 + tabGap * 5 &&
            y >= tabY && y <= tabY + tabHeight) {
            _log('点击月卡标签');
            uiScrollState.shopTab = 'monthly';
            uiScrollState.shopScrollY = 0;
            return;
        }
        
        // ===== 月卡界面特殊处理 =====
        if (uiScrollState.shopTab === 'monthly') {
            handleMonthlyCardClick(x, y, scale);
            return;
        }
        
        // ===== 抽卡界面特殊处理 =====
        if (uiScrollState.shopTab === 'gacha') {
            handleGachaClick(x, y, scale);
            return;
        }
        
        // 商品购买处理
        var startY = getDesignOffsetY() + Math.floor(160 * scale);
        var itemHeight = Math.floor(80 * scale);
        var padding = Math.floor(10 * scale);
        var btnW = Math.floor(80 * scale);
        var btnH = Math.floor(35 * scale);
        
        var items;
        if (uiScrollState.shopTab === 'materials') {
            items = ShopItems.materials;
        } else if (uiScrollState.shopTab === 'buffs') {
            items = ShopItems.buffs;
        } else if (uiScrollState.shopTab === 'items') {
            items = ShopItems.items;
        } else if (uiScrollState.shopTab === 'gacha') {
            items = ShopItems.gacha;
            startY += Math.floor(60 * scale);
            itemHeight = Math.floor(100 * scale);
            padding = Math.floor(15 * scale);
        } else if (uiScrollState.shopTab === 'pets') {
            var _purchasedPets = (saveData && saveData.purchasedShopPets) || [];
            items = ShopItems.pets.filter(function(p) { return _purchasedPets.indexOf(p.id) === -1; });
            startY += Math.floor(20 * scale);
            itemHeight = Math.floor(85 * scale);
        }
        
        if (items) {
            for (let i = 0; i < items.length; i++) {
                var item = items[i];
                var itemY = startY + i * (itemHeight + padding) - uiScrollState.shopScrollY;
                var btnX = screenWidth - Math.floor(100 * scale);
                var btnY = itemY + (uiScrollState.shopTab === 'gacha' ? Math.floor(30 * scale) : Math.floor(20 * scale));
                
                if (x >= btnX && x <= btnX + btnW &&
                    y >= btnY && y <= btnY + btnH) {
                    _log('点击购买按钮:', item.name);
                    purchaseShopItem(item);
                    return;
                }
            }
        }
        
        // 时间结晶商品点击检测（只有解锁后且在材料标签页才检测）
        if (uiScrollState.shopTab === 'materials' && combatState.timeCrystalUnlocked) {
            var tcItemY = startY + ShopItems.materials.length * (itemHeight + padding) - uiScrollState.shopScrollY;
            var tcBtnX = screenWidth - Math.floor(120 * scale);
            var tcBtnY = tcItemY + Math.floor(20 * scale);
            var tcBtnW = Math.floor(80 * scale);
            var tcBtnH = Math.floor(35 * scale);
            
            if (x >= tcBtnX && x <= tcBtnX + tcBtnW &&
                y >= tcBtnY && y <= tcBtnY + tcBtnH) {
                $P.showToast({ title: '比赛版本暂不开放', icon: 'none', duration: 1500 });
                return;
            }
        }
        
        // 返回按钮位置（左下角）
        if (isBackButtonClicked(x, y)) {
            _log('点击返回按钮');
            stateMachine.transitionTo(GAME_STATE.WORLDMAP);
        }
    } else if (state === GAME_STATE.LEADERBOARD) {
        // 排行榜页面点击处理
        const scale = getScreenScale();
        
        // 返回按钮（左下角）
        if (isBackButtonClicked(x, y)) {
            _log('点击排行榜返回按钮');
            sendLeaderboardMessage('hide');
            stateMachine.transitionTo(GAME_STATE.WORLDMAP);
            return;
        }

        // 排行榜标签页点击检测
        const tabWidth = Math.floor(100 * scale);
        const tabHeight = Math.floor(40 * scale);
        const tabGap = Math.floor(10 * scale);
        const tabY = getDesignOffsetY() + Math.floor(80 * scale);
        const totalTabWidth = tabWidth * 3 + tabGap * 2;
        const tabStartX = (screenWidth - totalTabWidth) / 2;

        // 最高分标签
        if (x >= tabStartX && x <= tabStartX + tabWidth &&
            y >= tabY - tabHeight/2 && y <= tabY + tabHeight/2) {
            _log('点击最高分标签');
            audioSystem.playUiSkip();
            currentLeaderboardTab = 'best_score';
            currentLeaderboardTab = 'best_score';
            sendLeaderboardMessage('switchTab', 'best_score');
            return;
        }

        // 击杀数标签
        const killsTabX = tabStartX + tabWidth + tabGap;
        if (x >= killsTabX && x <= killsTabX + tabWidth &&
            y >= tabY - tabHeight/2 && y <= tabY + tabHeight/2) {
            _log('点击击杀数标签');
            audioSystem.playUiSkip();
            currentLeaderboardTab = 'total_kills';
            currentLeaderboardTab = 'total_kills';
            sendLeaderboardMessage('switchTab', 'total_kills');
            return;
        }

        // 赛季分标签
        const seasonTabX = tabStartX + (tabWidth + tabGap) * 2;
        if (x >= seasonTabX && x <= seasonTabX + tabWidth &&
            y >= tabY - tabHeight/2 && y <= tabY + tabHeight/2) {
            _log('点击赛季分标签');
            audioSystem.playUiSkip();
            currentLeaderboardTab = 'season_score';
            currentLeaderboardTab = 'season_score';
            sendLeaderboardMessage('switchTab', 'season_score');
            return;
        }
    } else if (state === GAME_STATE.SETTINGS) {
        // 设置界面点击处理
        const scale = getScreenScale();
        
        // 返回按钮（左下角）
        if (isBackButtonClicked(x, y)) {
            _log('点击设置返回按钮');
            stateMachine.transitionTo(GAME_STATE.WORLDMAP);
            return;
        }
        
        const settingBtnWidth = Math.floor(140 * scale);
        const settingBtnHeight = Math.floor(40 * scale);
        const settingStartY = getDesignOffsetY() + Math.floor(160 * scale);
        const randomBtnY = settingStartY + Math.floor(40 * scale);
        const btnGap = Math.floor(20 * scale);

        // 随机模式按钮
        const randomBtnX = screenWidth/2 - settingBtnWidth/2 - btnGap/2;
        if (x >= randomBtnX - settingBtnWidth/2 && x <= randomBtnX + settingBtnWidth/2 &&
            y >= randomBtnY - settingBtnHeight/2 && y <= randomBtnY + settingBtnHeight/2) {
            _log('选择随机模式');
            starMode = STAR_MODE.RANDOM;
            saveData.starMode = starMode;
            if (starSystem) starSystem.setStarMode(starMode);
            dataStore.flush();
            // 任务：切换游戏模式
            updateTaskProgress('switch_mode', 1);
            updateTaskStats('modeSwitched', 1);
            $P.showToast({
                title: '已切换到随机生成模式',
                icon: 'none',
                duration: 1500
            });
            return;
        }

        // 下落模式按钮
        const fallingBtnX = screenWidth/2 + settingBtnWidth/2 + btnGap/2;
        if (x >= fallingBtnX - settingBtnWidth/2 && x <= fallingBtnX + settingBtnWidth/2 &&
            y >= randomBtnY - settingBtnHeight/2 && y <= randomBtnY + settingBtnHeight/2) {
            _log('选择下落模式');
            starMode = STAR_MODE.FALLING;
            saveData.starMode = starMode;
            if (starSystem) starSystem.setStarMode(starMode);
            dataStore.flush();
            // 任务：切换游戏模式
            updateTaskProgress('switch_mode', 1);
            updateTaskStats('modeSwitched', 1);
            $P.showToast({
                title: '已切换到下落模式',
                icon: 'none',
                duration: 1500
            });
            return;
        }

    } else if (state === GAME_STATE.TASKS) {
        // 任务界面触摸处理
        const scale = getScreenScale();
        var designBottom = Math.min(getDesignOffsetY() + Math.floor(812 * scale), screenHeight);
        const tabY = getDesignOffsetY() + Math.floor(100 * scale);
        const tabWidth = Math.floor(100 * scale);
        const tabHeight = Math.floor(36 * scale);
        const tabGap = Math.floor(10 * scale);
        const totalTabWidth = tabWidth * 3 + tabGap * 2;
        const tabStartX = (screenWidth - totalTabWidth) / 2;

        // 引导任务标签
        const guideTabX = tabStartX;
        if (x >= guideTabX && x <= guideTabX + tabWidth &&
            y >= tabY - tabHeight/2 && y <= tabY + tabHeight/2) {
            _log('切换到引导任务');
            tasksTab = 'guide';
            if (audioSystem) audioSystem.playUiSkip();
            return;
        }

        // 每日任务标签
        const dailyTabX = tabStartX + tabWidth + tabGap;
        if (x >= dailyTabX && x <= dailyTabX + tabWidth &&
            y >= tabY - tabHeight/2 && y <= tabY + tabHeight/2) {
            _log('切换到每日任务');
            tasksTab = 'daily';
            if (audioSystem) audioSystem.playUiSkip();
            return;
        }

        // 成就任务标签
        const achievementTabX = tabStartX + (tabWidth + tabGap) * 2;
        if (x >= achievementTabX && x <= achievementTabX + tabWidth &&
            y >= tabY - tabHeight/2 && y <= tabY + tabHeight/2) {
            _log('切换到成就任务');
            tasksTab = 'achievements';
            if (audioSystem) audioSystem.playUiSkip();
            return;
        }

        // 任务列表点击处理
        const tasks = getTasksWithProgress(tasksTab);
        const listStartY = getDesignOffsetY() + Math.floor(150 * scale);
        const itemHeight = tasksTab === 'guide' ? Math.floor(95 * scale) : Math.floor(85 * scale);

        tasks.forEach((task, index) => {
            const itemY = listStartY + index * itemHeight - tasksScrollY;
            if (itemY + itemHeight > designBottom - Math.floor(80 * scale) || itemY < listStartY) return;

            // 引导任务：未解锁的不可点击
            const isLocked = tasksTab === 'guide' && !task.unlocked;
            if (isLocked) return;

            // 领取按钮区域（与渲染位置匹配）
            const btnX = screenWidth - Math.floor(60 * scale);
            const btnY = itemY + Math.floor(52 * scale);
            const btnW = Math.floor(65 * scale);
            const btnH = Math.floor(28 * scale);

            if (x >= btnX - btnW/2 && x <= btnX + btnW/2 &&
                y >= btnY - btnH/2 && y <= btnY + btnH/2) {
                if (!task.claimed && task.completed) {
                    claimTaskReward(task.id, tasksTab);
                    if (audioSystem) audioSystem.playTreasureBox();
                }
            }
        });

        // 返回按钮
        if (isBackButtonClicked(x, y)) {
            _log('点击任务返回按钮');
            if (audioSystem) audioSystem.playMenu2();
            stateMachine.transitionTo(GAME_STATE.WORLDMAP);
            return;
        }
    } else if (state === GAME_STATE.SEASON_MENU) {
        // ===== 赛季模式入口点击处理 ===== 已委托至 seasonRenderer.handleClick
        if (seasonRenderer && seasonRenderer.handleClick(x, y, state)) return;
    } else if (state === GAME_STATE.SEASON_SELECT) {
        // ===== 赛季选择界面点击处理 ===== 已委托至 seasonRenderer.handleClick
        if (seasonRenderer && seasonRenderer.handleClick(x, y, state)) return;
    } else if (state === GAME_STATE.STAGE_SELECT) {
        // ===== 闯关模式选择界面点击处理 ===== 已委托至 stageRenderer.handleClick
        if (stageRenderer && stageRenderer.handleClick(x, y, state)) return;
    } else if (state === GAME_STATE.STAGE_RESULT) {
        // ===== 闯关结算界面点击处理 ===== 已委托至 stageRenderer.handleClick
        if (stageRenderer && stageRenderer.handleClick(x, y, state)) return;
    } else if (state === GAME_STATE.SQUAD) {
        // ===== 编队系统点击处理 =====
        squadRenderer.handleClick(x, y);
        return;
    } else if (state === GAME_STATE.BOSS_BATTLE) {
        // Boss战走共享触摸路径（不再提前return）
    } else if (state === GAME_STATE.BOSS_BATTLE_RESULT) {
        // ===== Boss战结算点击处理 =====
        bossRenderer.handleBossBattleResultTouch(x, y);
        return;
    } else if (state === GAME_STATE.BOSS_SELECT) {
        // ===== Boss选择点击处理 =====
        bossRenderer.handleBossSelectTouch(x, y);
        return;
    } else if (state === GAME_STATE.TOWER) {
        // ===== 爬塔模式点击处理 =====
        towerRenderer.handleTowerTouchEnd(x, y);
        return;
    } else if (state === GAME_STATE.TOWER_RESULT) {
        // ===== 爬塔结算界面点击处理 =====
        towerRenderer.handleTowerResultTouch(x, y);
        return;
    } else if (state === GAME_STATE.TOWER_RESUME) {
        // ===== 爬塔继续/放弃选择界面点击处理 =====
        towerRenderer.handleTowerResumeTouch(x, y);
        return;
    } else if (state === GAME_STATE.GAMEOVER) {
        modeLifecycle.handleResultTouch(x, y);
    }
}


// 攻击怪物
// starType: 'normal', 'ice', 'fire'
// targetMonster: 可选，指定攻击的怪物对象，不指定则攻击第一个激活的怪物
// 返回: { success: boolean, isElementalCombo: boolean, comboMultiplier: number, dodged: boolean, reflected: number }


// 更新毒素效果


// 开始游戏
// ========== startGame, startSeasonGame, endSeasonGame, restartGame, endGame ==========

// 显示激励视频广告

// 播放广告获取道具

// 处理广告播放完成（道具广告）

// 播放广告获取时间结晶（商城专用）


// 设计分辨率基准
var DESIGN_WIDTH = 375;
var DESIGN_HEIGHT = 812;

// 获取屏幕缩放比例（保留 — init() 中多系统初始化依赖）
function getScreenScale() {
    return Math.max(0.7, screenWidth / DESIGN_WIDTH);
}

// 设计区域垂直偏移：高屏居中，矮屏贴底
function getDesignOffsetY() {
    return Math.floor(Math.max(0, (screenHeight - DESIGN_HEIGHT * getScreenScale()) / 2));
}


// 渲染排行榜（好友排行榜 - 开放数据域）
var openDataContext = null;
var leaderboardSharedCanvas = null;
var currentLeaderboardTab = 'best_score';

function initOpenDataContext() {
    try {
        openDataContext = $P.getOpenDataContext();
        if (!openDataContext) return;
        leaderboardSharedCanvas = openDataContext.canvas;
        // 设置 sharedCanvas 尺寸（只能在主域设置）
        if (leaderboardSharedCanvas) {
            var scale = getScreenScale();
            var listStartY = getDesignOffsetY() + Math.floor(140 * scale);
            leaderboardSharedCanvas.width = screenWidth;
            leaderboardSharedCanvas.height = screenHeight - listStartY;
        }
        _log('开放数据域初始化完成');
    } catch (e) {
        console.error('初始化开放数据域失败:', e);
    }
}

function sendLeaderboardMessage(type, tab) {
    if (!openDataContext) return;
    var scale = getScreenScale();
    var listStartY = getDesignOffsetY() + Math.floor(140 * scale);
    var listH = screenHeight - listStartY;
    openDataContext.postMessage({
        type: type,
        tab: tab || currentLeaderboardTab,
        width: screenWidth,
        height: listH
    });
}


// ==================== 赛季模式渲染函数 ====================

// ==================== 赛季模式渲染函数 ====================


// 通用圆角矩形绘制函数（替换 fillRect/strokeRect）
// radius: 数字或对象 {tl: 0, tr: 0, br: 0, bl: 0}


// 清除游戏数据（用于测试）


// 升级系统临时渲染

// 主渲染循环
function render() {
    // 检测屏幕尺寸变更（浏览器缩放/窗口resize），在渲染帧开头统一处理
    if (_screenNeedsUpdate) {
        _screenNeedsUpdate = false;
        var info = $P.getSystemInfoSync();
        var newW = info.windowWidth;
        var newH = info.windowHeight;
        var newDpr = info.pixelRatio || 1;
        if (newW !== screenWidth || newH !== screenHeight) {
            screenWidth = newW;
            screenHeight = newH;
            canvas.width = screenWidth * newDpr;
            canvas.height = screenHeight * newDpr;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(newDpr, newDpr);
            _log('屏幕变更:', screenWidth, 'x', screenHeight, 'DPR:', newDpr);
        }
    }

    // 计算帧间隔
    var now = Date.now();
    if (!render._lastFrameTime) render._lastFrameTime = now;
    var dt = Math.min(0.1, (now - render._lastFrameTime) / 1000);
    render._lastFrameTime = now;

    // 饱和度(体力条)自然恢复
    if (saturationState) saturationState.update(dt);

    // D2 蓄力自动吸收
    if (chargeSystem) chargeSystem.update(dt);

    // D3 拖拽聚合每帧更新（闲置检测→蓄力转换）
    if (dragSystem) {
        var dragUpdateResult = dragSystem.update(dt);
        if (dragUpdateResult && dragUpdateResult.transitionToCharge && touchGestureSystem && chargeSystem) {
            chargeSystem.beginDragCharge(
                dragSystem.getCurrentX ? dragSystem.getCurrentX() : 0,
                dragSystem.getCurrentY ? dragSystem.getCurrentY() : 0,
                touchGestureSystem.getActiveGestureTouchId ? touchGestureSystem.getActiveGestureTouchId() : null,
                dragUpdateResult.aggregate
            );
            touchGestureSystem.switchGestureToCharge();
            dragSystem.finishDragTransition();
        }
    }

    // D4 联连系统更新（每帧）
    if (linkChainSystem) {
        linkChainSystem.update(dt);
    }

    // 大世界地图更新
    if (state === GAME_STATE.WORLDMAP && worldMapSystem) {
        // 猫灵可见性懒刷新（每帧幂等，开销极低）
        _updateCatSpiritVisibility(worldMapSystem.getWorldId());
        var _dialogueOpen = worldMapRenderer && worldMapRenderer.isDialogueOpen();
        var wdx = 0, wdy = 0;
        if (!_dialogueOpen) {
            if (_keysDown['w'] || _keysDown['arrowup']) wdy = -1;
            if (_keysDown['s'] || _keysDown['arrowdown']) wdy = 1;
            if (_keysDown['a'] || _keysDown['arrowleft']) wdx = -1;
            if (_keysDown['d'] || _keysDown['arrowright']) wdx = 1;
            if (_joystickActive) {
                var jLen = Math.sqrt(_joystickDX * _joystickDX + _joystickDY * _joystickDY);
                if (jLen > 10) {
                    var maxR = 60;
                    var normLen = Math.min(jLen, maxR);
                    wdx = (_joystickDX / jLen) * (normLen / maxR);
                    wdy = (_joystickDY / jLen) * (normLen / maxR);
                }
            }
            if (wdx !== 0 || wdy !== 0) {
                worldMapSystem.movePlayer(wdx, wdy, dt);
                if (audioSystem) audioSystem.playCharacterStep();
            } else {
                if (audioSystem) audioSystem.stopCharacterStep();
            }
        }
        worldMapSystem.update(dt);

        // 触发线自动切换地图
        var _tl = worldMapSystem.consumeTriggerLine();
        if (_tl && _tl.targetWorld) {
            if (audioSystem) audioSystem.playTeleport();
            worldMapSystem.loadWorld(_tl.targetWorld, worldMapSystem.getWorldId());
            _updateCatSpiritVisibility(_tl.targetWorld);
            worldMapSystem.saveProgress();
        }
    }
    // 无尽之塔键盘移动（WASD / 方向键）
    if (state === GAME_STATE.TOWER && towerSystem && !towerSystem.inCombat && !towerSystem.hiddenPathDialog) {
        if (_towerKeyMoveCooldown > 0) _towerKeyMoveCooldown -= dt * 1000;
        if (_towerKeyMoveCooldown <= 0) {
            var tdx = 0, tdy = 0;
            if (_keysDown['w'] || _keysDown['arrowup']) tdy = -1;
            if (_keysDown['s'] || _keysDown['arrowdown']) tdy = 1;
            if (_keysDown['a'] || _keysDown['arrowleft']) tdx = -1;
            if (_keysDown['d'] || _keysDown['arrowright']) tdx = 1;
            // 网格移动只取主方向
            if (tdx !== 0 && tdy !== 0) {
                if (Math.abs(tdx) >= Math.abs(tdy)) tdy = 0; else tdx = 0;
            }
            if (tdx !== 0 || tdy !== 0) {
                towerSystem.movePlayer(tdx, tdy);
                _towerKeyMoveCooldown = 150;
            }
        }
    }
    if (state === GAME_STATE.TITLE && titleRenderer) titleRenderer.update(dt);
    if (state === GAME_STATE.CUTSCENE && cutsceneRenderer) cutsceneRenderer.update(dt);
    if (state === GAME_STATE.CUTSCENE_DIALOGUE && dialogueSystem) dialogueSystem.update(dt);

    // 更新视觉屏幕震动
    updateScreenShake();
    // 每帧清屏，防止跨状态渲染残留导致闪白屏
    ctx.clearRect(0, 0, screenWidth, screenHeight);
    var shakeOffset = getScreenShakeOffset();
    var isCombatState = state === GAME_STATE.PLAYING || state === GAME_STATE.PAUSED ||
        state === GAME_STATE.SEASON_PLAYING || state === GAME_STATE.STAGE_PLAYING ||
        state === GAME_STATE.BOSS_BATTLE || state === GAME_STATE.TOWER_COMBAT;
    if (isCombatState && (shakeOffset.offsetX !== 0 || shakeOffset.offsetY !== 0)) {
        ctx.save();
        ctx.translate(shakeOffset.offsetX, shakeOffset.offsetY);
    }
    try {
        // 渲染分发表 — 替代 25 分支 if/else
        if (!render._dispatch) {
            render._dispatch = {};
            render._dispatch[GAME_STATE.TITLE] = function() { if (titleRenderer) titleRenderer.renderTitle(); };
            render._dispatch[GAME_STATE.LOADING] = function() {
                ctx.fillStyle = '#0a0a15';
                ctx.fillRect(0, 0, screenWidth, screenHeight);
                ctx.fillStyle = '#e8d5a3';
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('加载中...', screenWidth / 2, screenHeight / 2);
            };
            render._dispatch[GAME_STATE.CUTSCENE] = function() { if (cutsceneRenderer) cutsceneRenderer.renderCutscene(); };
            render._dispatch[GAME_STATE.CUTSCENE_DIALOGUE] = function() {
                if (worldMapRenderer) {
                    worldMapRenderer.updateCamera(1/60);
                    worldMapRenderer.renderWorldMap();
                }
                if (dialogueSystem) dialogueSystem.render(ctx, screenWidth, screenHeight);
            };
            render._dispatch[GAME_STATE.WORLDMAP] = function() {
                if (worldMapRenderer) {
                    worldMapRenderer.updateCamera(1/60);
                    worldMapRenderer.renderWorldMap();
                }
                if (state === GAME_STATE.WORLDMAP && renderMenuBar && _tutorial.completed) renderMenuBar();
            };
            render._dispatch[GAME_STATE.TUTORIAL] = function() {
                if (_tutorial.victoryPopup) {
                    // 弹窗渲染：半透明底 + 文字（adapter 已 destroy，跳过战斗场景）
                    ctx.fillStyle = 'rgba(10, 10, 21, 0.85)';
                    ctx.fillRect(0, 0, screenWidth, screenHeight);
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#e8d5a3';
                    ctx.font = 'bold 28px sans-serif';
                    ctx.fillText(_tutorial.victoryPopup.text, screenWidth / 2, screenHeight / 2 - 30);
                    ctx.fillStyle = '#a89870';
                    ctx.font = '18px sans-serif';
                    ctx.fillText(_tutorial.victoryPopup.subtext, screenWidth / 2, screenHeight / 2 + 20);
                    ctx.fillStyle = '#666';
                    ctx.font = '14px sans-serif';
                    ctx.fillText('点击任意处继续', screenWidth / 2, screenHeight / 2 + 60);
                    ctx.restore();
                } else {
                    renderGame();
                    // overlay 引导对话叠加渲染
                    if (dialogueSystem && dialogueSystem.isActive()) {
                        dialogueSystem.render(ctx, screenWidth, screenHeight);
                    }
                }
            };
            render._dispatch[GAME_STATE.MENU] = renderMenu;
            render._dispatch[GAME_STATE.PLAYING] = renderGame;
            render._dispatch[GAME_STATE.PAUSED] = function() { renderGame(); renderPausedMenu(); };
            render._dispatch[GAME_STATE.GAMEOVER] = function() {
                modeLifecycle.renderResult({
                    ctx: ctx,
                    screenWidth: screenWidth,
                    screenHeight: screenHeight,
                    scale: getScreenScale(),
                    designOffsetY: getDesignOffsetY(),
                    designBottom: Math.min(getDesignOffsetY() + Math.floor(812 * getScreenScale()), screenHeight),
                    drawText: uiCoreRenderer.drawText,
                    drawButton: uiCoreRenderer.drawButton,
                    Assets: Assets,
                    pd: saveData,
                    bestScore: bestScore,
                    score: score,
                    seasonScore: seasonScore,
                    seasonBestScore: seasonBestScore,
                    seasonRank: getSeasonRank(),
                    seasonSelection: seasonSelection,
                    Characters: Characters,
                    Skills: Skills,
                    Pets: Pets,
                    GAME_STATE: GAME_STATE,
                    timeLeft: timeLeft
                });
            };
            render._dispatch[GAME_STATE.BACKPACK] = renderBackpack;
            render._dispatch[GAME_STATE.SHOP] = renderShop;
            render._dispatch[GAME_STATE.FUSION] = function() { if (fusionRenderer) fusionRenderer.renderFusion(); };
            render._dispatch[GAME_STATE.UPGRADE] = function() { if (upgradeRenderer) upgradeRenderer.renderUpgrade(); };
            render._dispatch[GAME_STATE.LEADERBOARD] = renderLeaderboard;
            render._dispatch[GAME_STATE.SETTINGS] = renderSettings;
            render._dispatch[GAME_STATE.TASKS] = renderTasks;
            render._dispatch[GAME_STATE.SEASON_MENU] = renderSeasonMenu;
            render._dispatch[GAME_STATE.SEASON_SELECT] = renderSeasonSelect;
            render._dispatch[GAME_STATE.SEASON_PLAYING] = renderGame;
            render._dispatch[GAME_STATE.STAGE_SELECT] = renderStageSelect;
            render._dispatch[GAME_STATE.STAGE_PLAYING] = renderGame;
            render._dispatch[GAME_STATE.STAGE_RESULT] = renderStageResult;
            render._dispatch[GAME_STATE.SQUAD] = renderSquad;
            render._dispatch[GAME_STATE.BOSS_BATTLE] = renderGame;
            render._dispatch[GAME_STATE.BOSS_BATTLE_RESULT] = renderBossBattleResult;
            render._dispatch[GAME_STATE.BOSS_SELECT] = renderBossSelect;
            render._dispatch[GAME_STATE.TOWER] = renderTower;
            render._dispatch[GAME_STATE.TOWER_COMBAT] = renderGame;
            render._dispatch[GAME_STATE.TOWER_RESULT] = renderTowerResult;
            render._dispatch[GAME_STATE.TOWER_RESUME] = renderTowerResume;
            render._dispatch[GAME_STATE.GACHA_ANIMATION] = renderGachaAnimation;
        }
        var _renderer = render._dispatch[state];
        if (_renderer) _renderer();
        
        // 主界面显示挂机按钮（Boss首杀后解锁）
        if (state === GAME_STATE.MENU && saveData.firstBossKilled) {
            renderAfkButton();
        }
        
        // 挂机界面弹窗
        if (afkSystem.popupVisible) {
            renderAfkPopup();
        }
        
        // 挂机奖励结果弹窗
        if (afkSystem.resultVisible) {
            renderAfkResultPopup();
        }

        // 战斗动画：仅在战斗状态执行，非战斗状态清理残留
        var isCombat = state === GAME_STATE.PLAYING || state === GAME_STATE.PAUSED ||
            state === GAME_STATE.BOSS_BATTLE || state === GAME_STATE.TOWER_COMBAT ||
            state === GAME_STATE.SEASON_PLAYING || state === GAME_STATE.STAGE_PLAYING ||
            state === GAME_STATE.TUTORIAL;

        if (isCombat) {
            // BattleEngine 每帧 tick（处理 pendingDeaths、攻击者、时间倒计时等）
            if (normalBattleAdapter) normalBattleAdapter.update();

            // 空格灵光长按检测：超过150ms进入蓄力
            if (_spaceKeyHolding && _spaceKeyTargetStar && Date.now() - _spaceKeyDownTime >= 150) {
                // 灵光被其他系统消费则取消蓄力
                if (!_spaceKeyTargetStar.visible) {
                    _spaceKeyHolding = false;
                    _spaceKeyDownTime = 0;
                    _spaceKeyTargetStar = null;
                } else if (chargeSystem && chargeSystem.beginMonitoring) {
                    chargeSystem.beginMonitoring(
                        _spaceKeyTargetStar.x, _spaceKeyTargetStar.y,
                        'spacekey', _spaceKeyTargetStar
                    );
                    // beginMonitoring 成功后不再重复调用
                    _spaceKeyDownTime = 0; // 防止重复触发
                }
            }

            // overlay 引导对话更新
            if (dialogueSystem && dialogueSystem.isActive()) {
                dialogueSystem.update(dt);
            }

            // 普通战斗 / 塔战斗：第一个灵光出现时播放战斗音乐
            if ((state === GAME_STATE.PLAYING || state === GAME_STATE.TOWER_COMBAT || state === GAME_STATE.SEASON_PLAYING) && !_battleMusicTriggered && stars && stars.length > 0) {
                _battleMusicTriggered = true;
                if (audioSystem) audioSystem.playBattleBgm();
            }

            // 运行时不变量检查（仅调试模式）
            if (invariantChecker) invariantChecker.check();

            // 灵韵点击粒子爆发
            updateStarBurstAnimations();
            drawStarBurstAnimations(getScreenScale());

            // 灵韵合成聚拢动画
            updateMergeAnimations();
            drawMergeAnimations(getScreenScale());

            // 点击得分飘字
            updateScorePopupAnimations();
            drawScorePopupAnimations(getScreenScale());
        } else {
            // 非战斗状态：一次性清理所有战斗动画残留
            clearBattleAnimations();
        }

        // 点击波纹动画（全局，所有状态可见）
        updateTapRippleAnimations();
        drawTapRippleAnimations(getScreenScale());

        // 新手提示
        tipUpdateTip();
        tipRenderTip(getScreenScale());

        // 调试面板覆盖层（在所有界面上显示）
        if (debugPanelOpen) {
            renderDebugPanel();
        }

        // UI编辑器覆盖层（在所有界面上显示）
        if (uiEditorSystem && uiEditorSystem.isActive()) {
            uiEditorSystem.render();
        }

        // 战斗中 DevBattle 浮动按钮（左下角，面板未打开时显示）
        if (devBattleSystem && (state === GAME_STATE.PLAYING || state === GAME_STATE.PAUSED || state === GAME_STATE.BOSS_BATTLE || state === GAME_STATE.TOWER || state === GAME_STATE.TOWER_COMBAT || state === GAME_STATE.SEASON_PLAYING || state === GAME_STATE.STAGE_PLAYING)) {
            if (!devBattleSystem.isVisible()) {
                var dbtnScale = getScreenScale();
                var dbDesignBottom = Math.min(getDesignOffsetY() + Math.floor(812 * dbtnScale), screenHeight);
                var dbtnSize = Math.floor(36 * dbtnScale);
                var dbtnX = Math.floor(12 * dbtnScale);
                var dbtnY = dbDesignBottom - Math.floor(56 * dbtnScale);
                ctx.save();
                ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
                ctx.fillRect(dbtnX, dbtnY, dbtnSize, dbtnSize);
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.strokeRect(dbtnX, dbtnY, dbtnSize, dbtnSize);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold ' + Math.floor(16 * dbtnScale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('D', Math.floor(dbtnX + dbtnSize / 2), Math.floor(dbtnY + dbtnSize / 2));
                ctx.restore();
            }
        }

        // 开发者战斗调参工具覆盖层
        if (devBattleSystem && devBattleSystem.isVisible()) {
            devBattleSystem.render(ctx);
        }
    } catch (error) {
        console.error('Render error:', error);
    }
    // 恢复屏幕震动偏移（仅战斗状态）
    if (isCombatState && (shakeOffset.offsetX !== 0 || shakeOffset.offsetY !== 0)) {
        ctx.restore();
    }
}

// ==================== 闯关模式独立模块 ====================
// 渲染复用普通模式 renderGame()，触摸复用普通模式 handleTouchStart()

const StageMode = {
    // 逻辑代理
    init(stageId) { return stageModeSystem.init(stageId); },
    start() { stageModeSystem.start(); },
    togglePause() { stageModeSystem.togglePause(); },
    end(success) { stageModeSystem.end(success); },

    // 状态访问器（供结算界面等使用）
    get currentStage() { return stageModeSystem.getCurrentStage(); },
    get currentStageData() { return stageModeSystem.getCurrentStageData(); },
    get score() { return stageModeSystem.getScore(); },
    get timeLeft() { return stageModeSystem.getTimeLeft(); },
    get monstersKilled() { return stageModeSystem.getMonstersKilled(); },
    get maxCombo() { return stageModeSystem.getMaxCombo(); },
    get isPaused() { return stageModeSystem.getIsPaused(); },
    get result() { return stageModeSystem.getResult(); },
    get rewardsObtained() { return stageModeSystem.getRewardsObtained(); },
    checkCondition(condition) { return stageModeSystem.checkCondition(condition); },

    // 渲染和触摸已复用普通模式，以下方法已移除：
    // render/renderMonster/renderStar/renderUI/renderPlayerHpBar/renderPauseMenu
    // handleTouch/attackMonster/onMonsterDefeated/handleStarClick
};

// ==================== 闯关模式核心函数 ====================

// 渲染关卡选择界面
// 检查关卡是否解锁
// 检查星级条件是否达成
// 计算获得的星级
// 获取难度对应的颜色
// 开始闯关

_log('Game loading...');
init();

// 触摸移动处理（背包滚动）
// 拖拽阈值：移动距离超过此值才认为是拖拽（单位：像素）
// 注意：阈值设为5像素，轻微移动不会被认为是拖拽，便于标签点击
const DRAG_THRESHOLD = 5;  // 拖拽阈值（像素），超过此距离才认为是拖拽
let backpackTotalDragDistance = 0;  // 累计拖拽距离
let seasonSelectTotalDragDistance = 0;  // 赛季选择累计拖拽距离

function handleTouchMove(res) {
    // 更新长按波纹动画位置（支持多指）
    var moveTouches = res.touches;
    if (moveTouches) {
        for (let mi = 0; mi < moveTouches.length; mi++) {
            moveTapRipple(moveTouches[mi].identifier, moveTouches[mi].clientX, moveTouches[mi].clientY);
        }
    }

    // D2-D5 手势移动
    if (USE_TOUCH_PIPELINE && touchPipeline && res.touches && res.touches[0]) {
        var moveCtx = touchPipeline.createContext({
            x: res.touches[0].clientX,
            y: res.touches[0].clientY,
            touchId: res.touches[0].identifier,
            timestamp: Date.now(),
            stars: stars,
            playerEffects: playerEffects,
            isGrounded: true
        });
        touchPipeline.runMove(moveCtx);
    } else if (touchGestureSystem && res.touches && res.touches[0]) {
        touchGestureSystem.handleGestureMove(res.touches[0].clientX, res.touches[0].clientY);
    }

    // 挂机弹窗显示时阻止触摸穿透
    if (afkSystem.popupVisible || afkSystem.resultVisible) return;

    // UI编辑器拖拽
    if (uiEditorSystem && uiEditorSystem.isActive()) {
        if (res.touches && res.touches[0]) {
            uiEditorSystem.handleTouchMove(res.touches[0].clientX, res.touches[0].clientY);
        }
        return;
    }

    // 开发者调参工具显示时阻止触摸穿透
    if (devBattleSystem && devBattleSystem.isVisible()) return;

    // 大世界地图摇杆移动
    if (state === GAME_STATE.WORLDMAP && _joystickActive && res.touches && res.touches[0]) {
        var jx = res.touches[0].clientX;
        var jy = res.touches[0].clientY;
        _joystickDX = jx - _joystickStartX;
        _joystickDY = jy - _joystickStartY;
    }

    // 背包滑动
    if (state === GAME_STATE.BACKPACK) {
        var touches = res.touches;
        if (touches.length === 0) return;
        
        var touch = touches[0];
        var currentY = touch.clientY;
        
        if (uiScrollState.backpackLastTouchY > 0) {
            var deltaY = uiScrollState.backpackLastTouchY - currentY;
            uiScrollState.backpackScrollY += deltaY;
            
            // 累计拖拽距离，只有超过阈值才认为是拖拽
            backpackTotalDragDistance += Math.abs(deltaY);
            if (backpackTotalDragDistance > DRAG_THRESHOLD) {
                uiScrollState.backpackIsDragging = true;
            }
            
            // 实时限制滚动范围，避免弹簧回弹
            var scale = getScreenScale();
            var startY = getDesignOffsetY() + Math.floor(100 * scale);
            var clipOffset = Math.floor(30 * scale); // contentTop(20) + contentBottom(10)
            var visibleHeight = screenHeight - startY - clipOffset;
            var maxScroll = 0;

            if (uiScrollState.backpackTab === 'characters') {
                var ownedCharacters = saveData.ownedCharacters || [];
                var uniqueCharIds = [...new Set(ownedCharacters)];
                var charItemHeight = Math.floor(100 * scale);
                var charPadding = Math.floor(15 * scale);
                var totalHeight = uniqueCharIds.length * (charItemHeight + charPadding);
                maxScroll = Math.max(0, totalHeight - visibleHeight);
            } else if (uiScrollState.backpackTab === 'materials') {
                var materialIds = Object.keys(saveData.materials);
                var matItemHeight = Math.floor(80 * scale);
                var matPadding = Math.floor(10 * scale);
                var visibleCount = 0;
                for (let j = 0; j < materialIds.length; j++) {
                    if (saveData.materials[materialIds[j]].quantity > 0) visibleCount++;
                }
                var totalHeight = visibleCount * (matItemHeight + matPadding);
                maxScroll = Math.max(0, totalHeight - visibleHeight);
            } else if (uiScrollState.backpackTab === 'stars') {
                var starItemHeight = Math.floor(80 * scale);
                var starPadding = Math.floor(10 * scale);
                // 计算已解锁灵韵数量（与渲染函数一致）
                var starCount = 1; // 灵韵始终解锁
                if (saveData.unlockedStarTypes) {
                    for (let s = 0; s < saveData.unlockedStarTypes.length; s++) {
                        // 排除 normal，因为已经计算了
                        if (saveData.unlockedStarTypes[s] !== 'normal') {
                            starCount++;
                        }
                    }
                }
                var totalHeight = starCount * (starItemHeight + starPadding);
                maxScroll = Math.max(0, totalHeight - visibleHeight);
            } else if (uiScrollState.backpackTab === 'items') {
                var itemsItemHeight = Math.floor(80 * scale);
                var itemsPadding = Math.floor(10 * scale);
                var itemsConfigArr = ['starChest', 'healPotion', 'timePotion', 'expPotionSmall', 'expPotionMedium', 'expPotionLarge'];
                var itemCount = 0;
                for (let k = 0; k < itemsConfigArr.length; k++) {
                    if (saveData.items && saveData.items[itemsConfigArr[k]] && saveData.items[itemsConfigArr[k]].quantity > 0) {
                        itemCount++;
                    }
                }
                var totalHeight = itemCount * (itemsItemHeight + itemsPadding);
                maxScroll = Math.max(0, totalHeight - visibleHeight);
            } else if (uiScrollState.backpackTab === 'equipments') {
                var ownedEquipments = saveData.equipments ? saveData.equipments.owned : [];
                var equipItemHeight = Math.floor(85 * scale);
                var equipPadding = Math.floor(10 * scale);
                // 只计算有效装备数量（排除Equipments中找不到的）
                var validEquipCount = 0;
                for (let ei = 0; ei < ownedEquipments.length; ei++) {
                    var eKey = typeof ownedEquipments[ei] === 'string' ? ownedEquipments[ei] : (ownedEquipments[ei].id || ownedEquipments[ei]);
                    if (Equipments[eKey]) validEquipCount++;
                }
                var totalHeight = validEquipCount * (equipItemHeight + equipPadding);
                maxScroll = Math.max(0, totalHeight - visibleHeight);
            } else if (uiScrollState.backpackTab === 'skills') {
                var ownedSkills = saveData.skills ? saveData.skills.owned : [];
                var skillItemHeight = Math.floor(85 * scale);
                var skillPadding = Math.floor(10 * scale);
                var totalHeight = ownedSkills.length * (skillItemHeight + skillPadding);
                maxScroll = Math.max(0, totalHeight - visibleHeight);
            } else if (uiScrollState.backpackTab === 'pets') {
                var ownedPets = saveData.pets ? saveData.pets.owned : [];
                var petItemHeight = Math.floor(85 * scale);
                var petPadding = Math.floor(10 * scale);
                var totalHeight = ownedPets.length * (petItemHeight + petPadding);
                maxScroll = Math.max(0, totalHeight - visibleHeight);
            } else if (uiScrollState.backpackTab === 'faith') {
                var totalHeight = Math.floor(400 * scale);
                maxScroll = Math.max(0, totalHeight - visibleHeight);
            }
            
            // 实时限制
            if (uiScrollState.backpackScrollY < 0) uiScrollState.backpackScrollY = 0;
            if (uiScrollState.backpackScrollY > maxScroll) uiScrollState.backpackScrollY = maxScroll;
        }
        
        uiScrollState.backpackLastTouchY = currentY;
    }
    
    // 任务列表滑动
    if (state === GAME_STATE.TASKS) {
        var touches = res.touches;
        if (touches.length === 0) return;
        
        var touch = touches[0];
        var currentY = touch.clientY;
        
        if (typeof tasksLastTouchY !== 'undefined' && tasksLastTouchY > 0) {
            var deltaY = tasksLastTouchY - currentY;
            tasksScrollY += deltaY;
        }
        
        tasksLastTouchY = currentY;
    }

    // 融合界面滚动处理
    if (state === GAME_STATE.FUSION) {
        var touches = res.touches;
        if (fusionRenderer && touches && touches.length > 0) {
            fusionRenderer.handleFusionTouchMove(touches[0].clientY);
        }
        return;
    }

    // 升级界面滚动处理
    if (state === GAME_STATE.UPGRADE) {
        var touches = res.touches;
        if (upgradeRenderer && touches && touches.length > 0) {
            upgradeRenderer.handleUpgradeTouchMove(touches[0].clientY);
        }
        return;
    }

    // 商城滑动
    if (state === GAME_STATE.SHOP) {
        var touches = res.touches;
        if (touches.length === 0) return;
        
        var touch = touches[0];
        var currentY = touch.clientY;
        
        if (uiScrollState.shopLastTouchY > 0) {
            var deltaY = uiScrollState.shopLastTouchY - currentY;
            uiScrollState.shopScrollY += deltaY;
        }
        
        uiScrollState.shopLastTouchY = currentY;
    }
    
    // 排行榜滑动
    if (state === GAME_STATE.LEADERBOARD) {
        var touches = res.touches;
        if (touches.length === 0) return;
        
        var touch = touches[0];
        var currentY = touch.clientY;
        
        if (uiScrollState.leaderboardLastTouchY > 0) {
            var deltaY = uiScrollState.leaderboardLastTouchY - currentY;
            uiScrollState.leaderboardScrollY += deltaY;
        }
        
        uiScrollState.leaderboardLastTouchY = currentY;
    }
    
    // 编队系统滑动
    if (state === GAME_STATE.SQUAD && squadRenderer) {
        if (res.touches.length > 0) squadRenderer.handleScrollMove(res.touches);
    }

    // 闯关选择滑动
    if (state === GAME_STATE.STAGE_SELECT) {
        var touches = res.touches;
        if (touches.length === 0) return;

        var touch = touches[0];
        var currentY = touch.clientY;

        if (uiScrollState.stageSelectLastTouchY > 0) {
            var deltaY = uiScrollState.stageSelectLastTouchY - currentY;
            uiScrollState.stageSelectScrollY += deltaY;
        }

        uiScrollState.stageSelectLastTouchY = currentY;
    }

    // 赛季选择滑动
    if (state === GAME_STATE.SEASON_SELECT) {
        var touches = res.touches;
        if (touches.length === 0) return;
        
        var touch = touches[0];
        var currentY = touch.clientY;
        
        if (uiScrollState.seasonSelectLastTouchY > 0) {
            var deltaY = uiScrollState.seasonSelectLastTouchY - currentY;
            uiScrollState.seasonSelectScrollY += deltaY;
            
            // 累积拖拽距离，超过阈值才认为是拖拽
            seasonSelectTotalDragDistance += Math.abs(deltaY);
            if (seasonSelectTotalDragDistance > DRAG_THRESHOLD) {
                uiScrollState.seasonSelectIsDragging = true;
            }

            // 实时限制滚动范围
            seasonRenderer.clampSeasonSelectScroll();
        }
        
        uiScrollState.seasonSelectLastTouchY = currentY;
    }
    
    // Boss选择滑动
    if (state === GAME_STATE.BOSS_SELECT) {
        var touches = res.touches;
        if (touches.length === 0) return;

        var touch = touches[0];
        var currentY = touch.clientY;

        if (bossSelectTouchStartY > 0) {
            var deltaY = bossSelectTouchStartY - currentY;
            bossSelectScrollY += deltaY;
            // 边界检查：不能滚到负数（列表顶部）
            if (bossSelectScrollY < 0) bossSelectScrollY = 0;
            bossSelectIsDragging = true;
        }
        
        bossSelectTouchStartY = currentY;
    }
    
    // 爬塔模式触摸移动
    if (state === GAME_STATE.TOWER) {
        var touches = res.touches;
        if (touches.length === 0) return;
        
        var touch = touches[0];
        towerRenderer.handleTowerTouchMove(touch.clientX, touch.clientY);
    }
}

// 触摸结束处理
function handleTouchEnd(res) {
    _log('handleTouchEnd 触发, 当前状态:', state);
    
    // 松手时释放对应触点的长按波纹动画（支持多指）
    var endTouches = res.changedTouches;
    if (endTouches) {
        for (let ei = 0; ei < endTouches.length; ei++) {
            releaseTapRipple(endTouches[ei].identifier);
        }
    }

    // D2-D5 手势结束
    if (USE_TOUCH_PIPELINE && touchPipeline && res.changedTouches && res.changedTouches[0]) {
        var endCtx = touchPipeline.createContext({
            x: res.changedTouches[0].clientX,
            y: res.changedTouches[0].clientY,
            touchId: res.changedTouches[0].identifier,
            timestamp: Date.now(),
            stars: stars,
            playerEffects: playerEffects,
            isGrounded: true
        });
        touchPipeline.runEnd(endCtx);
    } else if (touchGestureSystem) {
        var gestureEndResult = touchGestureSystem.handleGestureEnd();
        // D2 监控回退：触发 D1 灵光点击
        if (gestureEndResult && gestureEndResult.d1Fallback) {
            var lastTouch = res.changedTouches && res.changedTouches[0];
            if (lastTouch && normalBattleAdapter) {
                normalBattleAdapter.handleStarClick(lastTouch.clientX, lastTouch.clientY);
            }
        }
    }

    var touch = res.changedTouches && res.changedTouches[0];
    if (touch) {
        var x = touch.clientX;
        var y = touch.clientY;

        // UI编辑器触摸结束
        if (uiEditorSystem && uiEditorSystem.isActive()) {
            uiEditorSystem.handleTouchEnd();
            return;
        }

        // 挂机界面触摸处理（最高优先级，Boss首杀后解锁）
        if (saveData.firstBossKilled && afkSystem.popupVisible && handleAfkPopupTouch(x, y)) {
            return;
        }

        // 开发者调参工具显示时阻止触摸穿透
        if (devBattleSystem && devBattleSystem.isVisible()) return;

        // 大世界地图摇杆释放
        if (state === GAME_STATE.WORLDMAP) {
            _joystickActive = false;
            _joystickDX = 0;
            _joystickDY = 0;
            if (worldMapSystem) {
                var _pp = worldMapSystem.getPlayerPos();
                console.log('[POS] worldId=' + worldMapSystem.getWorldId() + ' x=' + Math.round(_pp.x) + ' y=' + Math.round(_pp.y));
            }
        }

        // 挂机奖励结果弹窗触摸处理
        if (saveData.firstBossKilled && afkSystem.resultVisible && handleAfkResultTouch(x, y)) {
            return;
        }

        // 主界面挂机按钮触摸
        if (state === GAME_STATE.MENU && saveData.firstBossKilled && handleAfkButtonTouch(x, y)) {
            return;
        }

        // 融合界面点击处理（松手时判断，拖拽中不触发点击）
        if (state === GAME_STATE.FUSION) {
            if (fusionRenderer && !fusionRenderer.getIsDragging()) {
                var fResult = fusionRenderer.handleFusionTouch(x, y);
                _log('[融合] x=', Math.floor(x), 'y=', Math.floor(y), 'result=', fResult, 'selectedCount=', fusionRenderer.getSelectedCount ? fusionRenderer.getSelectedCount() : '?');
                if (fResult === 'back') {
                    if (worldMapSystem) { worldMapSystem.markNeedsRespawn(); worldMapSystem.restoreReturnPosition(); worldMapSystem.saveProgress(); }
                    state = GAME_STATE.WORLDMAP;
                }
            }
            return;
        }

        // 升级界面点击处理
        if (state === GAME_STATE.UPGRADE) {
            if (upgradeRenderer && !upgradeRenderer.getIsDragging()) {
                var uResult = upgradeRenderer.handleUpgradeTouch(x, y);
                if (uResult === 'back') {
                    if (worldMapSystem) { worldMapSystem.markNeedsRespawn(); worldMapSystem.restoreReturnPosition(); worldMapSystem.saveProgress(); }
                    state = GAME_STATE.WORLDMAP;
                }
            }
            return;
        }
    }
    
    // ===== 爬塔模式触摸结束处理（优先处理） =====
    if (state === GAME_STATE.TOWER) {
        var endTouch = res.changedTouches && res.changedTouches[0];
        if (endTouch) {
            towerRenderer.handleTowerTouchEnd(endTouch.clientX, endTouch.clientY);
        }
        return;
    }

    // ===== 抽卡动画状态触摸处理 =====
    if (state === GAME_STATE.GACHA_ANIMATION) {
        return;
    }

    // ===== 爬塔结算界面触摸处理 =====
    if (state === GAME_STATE.TOWER_RESULT) {
        var endTouch = res.changedTouches && res.changedTouches[0];
        if (endTouch) {
            towerRenderer.handleTowerResultTouch(endTouch.clientX, endTouch.clientY);
        }
        return;
    }

    // ===== 爬塔继续/放弃选择界面触摸处理 =====
    if (state === GAME_STATE.TOWER_RESUME) {
        var endTouch = res.changedTouches && res.changedTouches[0];
        if (endTouch) {
            towerRenderer.handleTowerResumeTouch(endTouch.clientX, endTouch.clientY);
        }
        return;
    }
    
    if (state === GAME_STATE.BACKPACK) {
        // 检查是否是点击（非拖拽）
        var wasDragging = uiScrollState.backpackIsDragging;
        uiScrollState.backpackLastTouchY = 0;
        uiScrollState.backpackIsDragging = false;
        backpackTotalDragDistance = 0;  // 重置累计拖拽距离
        
        // 获取触摸结束位置（用于点击检测）
        var endTouch = res.changedTouches && res.changedTouches[0];
        var endX = endTouch ? endTouch.clientX : 0;
        var endY = endTouch ? endTouch.clientY : 0;
        
        // 只有触摸开始时就在背包状态，才处理物品点击（防止从其他界面切换过来时误触发）
        var wasInBackpackAtStart = (touchStartState === GAME_STATE.BACKPACK);
        
        _log('背包触摸结束: wasDragging=', wasDragging, 'wasInBackpackAtStart=', wasInBackpackAtStart, 'endX=', endX, 'endY=', endY);
        
        // ===== 标签点击检测（最高优先级，不受拖拽影响）=====
        if (endTouch && wasInBackpackAtStart) {
            var scale = getScreenScale();
            var tabWidth = Math.floor(50 * scale);
            var tabHeight = Math.floor(45 * scale);
            var tabGap = Math.floor(5 * scale);
            var tabX = screenWidth - tabWidth;
            var startTabY = getDesignOffsetY() + Math.floor(100 * scale);
            var tabLabels = ['materials', 'characters', 'stars', 'items', 'equipments', 'skills', 'pets', 'faith'];
            var tabNames = ['材料', '角色', '灵韵', '道具', '装备', '技能', '宠物', '信仰'];
            
            _log('标签点击检测: endX=' + endX + ', endY=' + endY + ', tabX=' + tabX + ', screenWidth=' + screenWidth);
            
            for (let t = 0; t < tabLabels.length; t++) {
                var tabY = startTabY + t * (tabHeight + tabGap);
                if (endX >= tabX && endX <= screenWidth && endY >= tabY && endY <= tabY + tabHeight) {
                    _log('点击' + tabNames[t] + '标签');
                    uiScrollState.backpackTab = tabLabels[t];
                    uiScrollState.backpackScrollY = 0;
                    return;  // 标签点击后直接返回，不执行物品检测
                }
            }
            
            // ===== 返回按钮检测（不受拖拽影响）=====
            if (isBackButtonClicked(endX, endY)) {
                _log('点击返回按钮');
                if (audioSystem) audioSystem.playBackpack();
                stateMachine.transitionTo(previousState || GAME_STATE.MENU);
                return;
            }
        }
        
        // ===== 物品点击检测（标签检测之后，需要检查是否拖拽）=====
        
        // 材料使用按钮点击检测
        if (!wasDragging && wasInBackpackAtStart && uiScrollState.backpackTab === 'materials' && endTouch) {
            var scale = getScreenScale();
            var startY = getDesignOffsetY() + Math.floor(100 * scale);
            var contentTop = startY + Math.floor(20 * scale);
            var materialItemHeight = Math.floor(80 * scale);
            var padding = Math.floor(10 * scale);
            var tabAreaWidth = Math.floor(60 * scale);
            
            var useBtnW = Math.floor(50 * scale);
            var useBtnH = Math.floor(25 * scale);
            var useBtnX = screenWidth - tabAreaWidth - useBtnW - Math.floor(50 * scale);
            
            var materialIds = Object.keys(saveData.materials);
            var displayIndex = 0;
            
            for (let i = 0; i < materialIds.length; i++) {
                var materialId = materialIds[i];
                var material = Materials[materialId];
                var materialData = saveData.materials[materialId];
                
                // 与渲染函数一致的过滤条件
                if (!material || !material.name || !material.emoji) {
                    continue;
                }
                if (!materialData || materialData.quantity <= 0) {
                    continue;
                }
                
                var itemY = contentTop + displayIndex * (materialItemHeight + padding) - uiScrollState.backpackScrollY;
                var useBtnY = itemY + Math.floor(12 * scale);
                displayIndex++;  // 与渲染函数一致：在计算位置后增加索引
                
                // 检查是否点击了使用按钮
                if (endX >= useBtnX && endX <= useBtnX + useBtnW && endY >= useBtnY && endY <= useBtnY + useBtnH) {
                    _log('点击材料使用按钮:', materialId);
                    useMaterial(materialId);
                    return;
                }
            }
        }
        
        // 道具点击检测（灵韵宝箱等）
        if (!wasDragging && wasInBackpackAtStart && uiScrollState.backpackTab === 'items' && endTouch) {
            var scale = getScreenScale();
            var startY = getDesignOffsetY() + Math.floor(100 * scale);
            var contentTop = startY + Math.floor(20 * scale);
            var itemHeight = Math.floor(80 * scale);
            var padding = Math.floor(10 * scale);
            
            var itemsConfig = [
                { id: 'starChest', name: '灵韵宝箱', emoji: '🎁', description: '开启随机获得抽卡券' },
                { id: 'healPotion', name: '治疗药水', emoji: '🧪', description: '恢复50点HP' },
                { id: 'timePotion', name: '时间药水', emoji: '⏳', description: '增加10秒时间' },
                { id: 'expPotionSmall', name: '经验药水(小)', emoji: '📜', description: '+50经验' },
                { id: 'expPotionMedium', name: '经验药水(中)', emoji: '📔', description: '+100经验' },
                { id: 'expPotionLarge', name: '经验药水(大)', emoji: '📖', description: '+150经验' }
            ];
            
            var displayIndex = 0;
            for (let i = 0; i < itemsConfig.length; i++) {
                var itemConfig = itemsConfig[i];
                var itemData = saveData.items ? saveData.items[itemConfig.id] : null;
                
                if (!itemData || itemData.quantity <= 0) continue;
                
                var itemY = contentTop + displayIndex * (itemHeight + padding) - uiScrollState.backpackScrollY;
                displayIndex++;
                
                // 检查是否点击了道具项
                if (endY >= itemY && endY <= itemY + itemHeight) {
                    // 使用道具
                    if (itemConfig.id === 'starChest') {
                        useItem('starChest');
                    } else if (itemConfig.id.startsWith('expPotion')) {
                        useItem(itemConfig.id);
                    }
                    return;
                }
            }
        }
        
        // 灵韵升级按钮点击检测
        if (!wasDragging && wasInBackpackAtStart && uiScrollState.backpackTab === 'stars' && endTouch) {
            var scale = getScreenScale();
            var startY = getDesignOffsetY() + Math.floor(100 * scale);
            var contentTop = startY + Math.floor(20 * scale);
            var starItemHeight = Math.floor(80 * scale);
            var padding = Math.floor(10 * scale);
            var tabAreaWidth = Math.floor(60 * scale);
            
            var upgradeBtnW = Math.floor(50 * scale);
            var upgradeBtnH = Math.floor(25 * scale);
            var upgradeBtnX = screenWidth - tabAreaWidth - upgradeBtnW - Math.floor(50 * scale);
            
            // 构建灵韵列表（与渲染函数一致）
            var allStarTypes = SEASON_STAR_TYPES.map(function(s) {
                return { id: s.id, name: s.name };
            });
            
            var unlockedStars = [];
            for (let j = 0; j < allStarTypes.length; j++) {
                var starId = allStarTypes[j].id;
                if (starId === 'normal') {
                    unlockedStars.push(allStarTypes[j]);
                } else if (saveData.unlockedStarTypes && saveData.unlockedStarTypes.indexOf(starId) !== -1) {
                    unlockedStars.push(allStarTypes[j]);
                }
            }
            
            for (let i = 0; i < unlockedStars.length; i++) {
                var starType = unlockedStars[i];
                var isIceStar = (starType.id === 'ice');
                var isFireStar = (starType.id === 'fire');
                
                if (!isIceStar && !isFireStar) continue;
                
                var starLevel = isIceStar ? (saveData.iceStarLevel || 0) : (saveData.fireStarLevel || 0);
                var maxLevel = isIceStar ? (saveData.maxIceStarLevel || 10) : (saveData.maxFireStarLevel || 10);
                
                if (starLevel >= maxLevel) continue; // 已满级，没有升级按钮
                
                var itemY = contentTop + i * (starItemHeight + padding) - uiScrollState.backpackScrollY;
                var upgradeBtnY = itemY + Math.floor(12 * scale);
                
                // 检查是否点击了升级按钮
                if (endX >= upgradeBtnX && endX <= upgradeBtnX + upgradeBtnW && endY >= upgradeBtnY && endY <= upgradeBtnY + upgradeBtnH) {
                    _log('点击灵韵升级按钮:', starType.id);
                    if (isIceStar) {
                        upgradeIceStar();
                    } else {
                        upgradeFireStar();
                    }
                    return;
                }
            }
        }
        
        // 角色点击检测（仅在非拖拽状态下，且触摸开始时就在背包）
        if (!wasDragging && wasInBackpackAtStart && uiScrollState.backpackTab === 'characters' && endTouch) {
            var scale = getScreenScale();
            var startY = getDesignOffsetY() + Math.floor(100 * scale);
            var contentTop = startY + Math.floor(20 * scale);
            var characterItemHeight = Math.floor(100 * scale);
            var padding = Math.floor(15 * scale);

            if (saveData.ownedCharacters && saveData.ownedCharacters.length > 0) {
                var clickCharIds = [...new Set(saveData.ownedCharacters)];
                for (let i = 0; i < clickCharIds.length; i++) {
                    var currentCharId = clickCharIds[i];
                    var itemY = contentTop + i * (characterItemHeight + padding) - uiScrollState.backpackScrollY;

                    // 检查是否点击了角色项
                    if (endY >= itemY && endY <= itemY + characterItemHeight) {
                        // 切换到该角色
                        _log('切换角色到:', currentCharId);
                        saveData.currentCharacterId = currentCharId;
                        dataStore.flush();

                        // 显示提示
                        var mappedCharId = getCharacterKey(currentCharId);
                        var character = Characters[mappedCharId];

                        if (character) {
                            $P.showToast({
                                title: '已切换到：' + character.name,
                                icon: 'none',
                                duration: 1500
                            });
                        }
                        return;
                    }
                }
            }
        }
        
        // ===== 装备点击检测 =====
        if (!wasDragging && wasInBackpackAtStart && uiScrollState.backpackTab === 'equipments' && endTouch) {
            if (backpackRenderer && backpackRenderer.handleEquipClick(endX, endY)) return;
        }
        
        // ===== 技能点击检测 =====
        if (!wasDragging && wasInBackpackAtStart && uiScrollState.backpackTab === 'skills' && endTouch) {
            if (backpackRenderer && backpackRenderer.handleSkillClick(endX, endY)) return;
        }

        // ===== 宠物点击检测 =====
        if (!wasDragging && wasInBackpackAtStart && uiScrollState.backpackTab === 'pets' && endTouch) {
            if (backpackRenderer && backpackRenderer.handlePetClick(endX, endY)) return;
        }

        // 信仰标签页点击检测
        if (!wasDragging && wasInBackpackAtStart && uiScrollState.backpackTab === 'faith' && endTouch) {
            var scale = getScreenScale();
            var btnY = getDesignOffsetY() + Math.floor(100 * scale) + Math.floor(130 * scale) + Math.floor(130 * scale);
            var contentWidth = screenWidth - Math.floor(60 * scale);
            
            var currentCharId = saveData.currentCharacterId;
            if (!currentCharId) {
                $P.showToast({ title: '请先选择角色', icon: 'none', duration: 1500 });
                return;
            }
            
            // 投入虔诚印记按钮
            if (endX >= Math.floor(20 * scale) && endX <= Math.floor(140 * scale) &&
                endY >= btnY && endY <= btnY + Math.floor(35 * scale)) {
                if (useFaithResource(currentCharId, 'devoutMark', 10)) {
                    $P.showToast({ title: '投入虔诚印记×10', icon: 'none', duration: 1500 });
                } else {
                    $P.showToast({ title: '虔诚印记不足', icon: 'none', duration: 1500 });
                }
                return;
            }
            
            // 投入神恩精华按钮
            if (endX >= Math.floor(160 * scale) && endX <= Math.floor(280 * scale) &&
                endY >= btnY && endY <= btnY + Math.floor(35 * scale)) {
                if (useFaithResource(currentCharId, 'divineEssence', 5)) {
                    $P.showToast({ title: '投入神恩精华×5', icon: 'none', duration: 1500 });
                } else {
                    $P.showToast({ title: '神恩精华不足', icon: 'none', duration: 1500 });
                }
                return;
            }
            
            // 专精路线按钮（50级解锁）
            var faithData = getCharacterFaithData(currentCharId);
            if (faithData.level >= FAITH_CONFIG.SPECIALIZATION_LEVEL) {
                var specY = btnY + Math.floor(50 * scale);
                var specs = ['offense', 'survival', 'support', 'balance'];
                
                for (let s = 0; s < specs.length; s++) {
                    var specBtnX = Math.floor(100 * scale) + s * Math.floor(70 * scale);
                    if (endX >= specBtnX && endX <= specBtnX + Math.floor(60 * scale) &&
                        endY >= specY + Math.floor(10 * scale) && endY <= specY + Math.floor(40 * scale)) {
                        
                        if (faithData.specializationUnlocked && faithData.specialization === specs[s]) {
                            $P.showToast({ title: '已选择该专精', icon: 'none', duration: 1500 });
                        } else if (!faithData.specializationUnlocked) {
                            if (unlockSpecialization(currentCharId, specs[s])) {
                                $P.showToast({ title: '解锁专精成功！', icon: 'none', duration: 1500 });
                            } else {
                                $P.showToast({ title: '本源结晶不足', icon: 'none', duration: 1500 });
                            }
                        } else {
                            // 切换专精（需要重置券或消耗资源）
                            $P.showToast({ title: '请购买专精重置券', icon: 'none', duration: 1500 });
                        }
                        return;
                    }
                }
            }
            
            // 破格技能按钮（100级解锁）
            if (faithData.level >= FAITH_CONFIG.BREAKTHROUGH_LEVEL) {
                var skillY = btnY + Math.floor(120 * scale);
                var skills = Object.keys(FAITH_CONFIG.breakthroughSkills);
                
                for (let sk = 0; sk < Math.min(skills.length, 4); sk++) {
                    var skillId = skills[sk];
                    var skillBtnX = Math.floor(20 * scale) + sk * Math.floor(75 * scale);
                    
                    if (endX >= skillBtnX && endX <= skillBtnX + Math.floor(70 * scale) &&
                        endY >= skillY + Math.floor(10 * scale) && endY <= skillY + Math.floor(50 * scale)) {
                        
                        if (faithData.breakthroughSkills.includes(skillId)) {
                            $P.showToast({ title: '已拥有该技能', icon: 'none', duration: 1500 });
                        } else {
                            if (unlockBreakthroughSkill(currentCharId, skillId)) {
                                $P.showToast({ title: '解锁技能成功！', icon: 'none', duration: 1500 });
                            } else {
                                $P.showToast({ title: '本源结晶不足', icon: 'none', duration: 1500 });
                            }
                        }
                        return;
                    }
                }
            }
            
            // 传承按钮（500级解锁）
            if (faithData.level >= FAITH_CONFIG.INHERIT_LEVEL && !faithData.inherited) {
                var inheritY = btnY + Math.floor(200 * scale);
                
                if (endX >= contentWidth - Math.floor(85 * scale) && endX <= contentWidth - Math.floor(35 * scale) &&
                    endY >= inheritY + Math.floor(12 * scale) && endY <= inheritY + Math.floor(38 * scale)) {
                    
                    if (performInheritance(currentCharId)) {
                        $P.showToast({ title: '传承成功！全队获得永久加成！', icon: 'none', duration: 2000 });
                    }
                    return;
                }
            }
        }
        
        // 限制滚动范围
        var scale = getScreenScale();
        var startY = getDesignOffsetY() + Math.floor(100 * scale);
        var itemHeight = Math.floor(85 * scale);
        var padding = Math.floor(10 * scale);
        var clipOffset = Math.floor(30 * scale);
        var visibleHeight = screenHeight - startY - clipOffset;
        var maxScroll = 0;

        // 计算最大滚动量
        if (uiScrollState.backpackTab === 'characters') {
            var ownedCharacters = saveData.ownedCharacters || [];
            var uniqueCharIds = [...new Set(ownedCharacters)];
            var charItemHeight = Math.floor(100 * scale);
            var charPadding = Math.floor(15 * scale);
            var totalHeight = uniqueCharIds.length * (charItemHeight + charPadding);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        } else if (uiScrollState.backpackTab === 'materials') {
            var materialIds = Object.keys(saveData.materials);
            var matItemHeight = Math.floor(80 * scale);
            var matPadding = Math.floor(10 * scale);
            var visibleCount = 0;
            for (let j = 0; j < materialIds.length; j++) {
                if (saveData.materials[materialIds[j]].quantity > 0) visibleCount++;
            }
            var totalHeight = visibleCount * (matItemHeight + matPadding);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        } else if (uiScrollState.backpackTab === 'stars') {
            var starItemHeight = Math.floor(80 * scale);
            var starPadding = Math.floor(10 * scale);
            var starCount = 1;
            if (saveData.unlockedStarTypes) {
                for (let s = 0; s < saveData.unlockedStarTypes.length; s++) {
                    if (saveData.unlockedStarTypes[s] !== 'normal') {
                        starCount++;
                    }
                }
            }
            var totalHeight = starCount * (starItemHeight + starPadding);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        } else if (uiScrollState.backpackTab === 'items') {
            var itemsItemHeight = Math.floor(80 * scale);
            var itemsPadding = Math.floor(10 * scale);
            var itemsConfig = ['starChest', 'healPotion', 'timePotion', 'expPotionSmall', 'expPotionMedium', 'expPotionLarge'];
            var itemCount = 0;
            for (let k = 0; k < itemsConfig.length; k++) {
                if (saveData.items && saveData.items[itemsConfig[k]] && saveData.items[itemsConfig[k]].quantity > 0) {
                    itemCount++;
                }
            }
            var totalHeight = itemCount * (itemsItemHeight + itemsPadding);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        } else if (uiScrollState.backpackTab === 'equipments') {
            var ownedEquipments = saveData.equipments ? saveData.equipments.owned : [];
            var totalHeight = ownedEquipments.length * (itemHeight + padding);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        } else if (uiScrollState.backpackTab === 'skills') {
            var ownedSkills = saveData.skills ? saveData.skills.owned : [];
            var totalHeight = ownedSkills.length * (itemHeight + padding);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        } else if (uiScrollState.backpackTab === 'pets') {
            var ownedPets = saveData.pets ? saveData.pets.owned : [];
            var totalHeight = ownedPets.length * (itemHeight + padding);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        } else if (uiScrollState.backpackTab === 'faith') {
            var totalHeight = Math.floor(400 * scale);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        }
        
        // 限制滚动范围
        if (uiScrollState.backpackScrollY < 0) uiScrollState.backpackScrollY = 0;
        if (uiScrollState.backpackScrollY > maxScroll) uiScrollState.backpackScrollY = maxScroll;
    }
    
    // 任务列表滚动限制
    if (state === GAME_STATE.TASKS) {
        tasksLastTouchY = 0;
        
        var scale = getScreenScale();
        var tasks = getTasksWithProgress(tasksTab);
        var listStartY = getDesignOffsetY() + Math.floor(150 * scale);
        var itemHeight = tasksTab === 'guide' ? Math.floor(95 * scale) : Math.floor(85 * scale);
        var totalHeight = tasks.length * itemHeight;
        var visibleHeight = screenHeight - listStartY - Math.floor(80 * scale);
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        
        if (tasksScrollY < 0) tasksScrollY = 0;
        if (tasksScrollY > maxScroll) tasksScrollY = maxScroll;
    }
    
    // 商城滚动限制
    if (state === GAME_STATE.SHOP) {
        uiScrollState.shopLastTouchY = 0;
        
        var scale = getScreenScale();
        var startY = getDesignOffsetY() + Math.floor(160 * scale);
        var itemHeight = Math.floor(80 * scale);
        var padding = Math.floor(10 * scale);
        var visibleHeight = screenHeight - startY - Math.floor(80 * scale);
        
        var items;
        if (uiScrollState.shopTab === 'materials') items = ShopItems.materials;
        else if (uiScrollState.shopTab === 'buffs') items = ShopItems.buffs;
        else if (uiScrollState.shopTab === 'items') items = ShopItems.items;
        else if (uiScrollState.shopTab === 'pets') items = ShopItems.pets;
        else items = [];
        
        var totalHeight = items.length * (itemHeight + padding);
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        
        if (uiScrollState.shopScrollY < 0) uiScrollState.shopScrollY = 0;
        if (uiScrollState.shopScrollY > maxScroll) uiScrollState.shopScrollY = maxScroll;
    }
    
    // 排行榜滚动限制
    if (state === GAME_STATE.LEADERBOARD) {
        uiScrollState.leaderboardLastTouchY = 0;
        
        var scale = getScreenScale();
        var startY = getDesignOffsetY() + Math.floor(120 * scale);
        var itemHeight = Math.floor(50 * scale);
        var visibleHeight = screenHeight - startY - Math.floor(80 * scale);
        var totalHeight = 10 * itemHeight;  // 10条记录
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        
        if (uiScrollState.leaderboardScrollY < 0) uiScrollState.leaderboardScrollY = 0;
        if (uiScrollState.leaderboardScrollY > maxScroll) uiScrollState.leaderboardScrollY = maxScroll;
    }
    
    // 编队系统滚动限制
    if (state === GAME_STATE.SQUAD && squadRenderer) {
        squadRenderer.handleScrollEnd();
    }

    // 闯关选择滚动限制
    if (state === GAME_STATE.STAGE_SELECT) {
        uiScrollState.stageSelectLastTouchY = 0;
        
        var scale = getScreenScale();
        var startY = getDesignOffsetY() + Math.floor(100 * scale);
        var itemHeight = Math.floor(80 * scale);
        var visibleHeight = screenHeight - startY - Math.floor(100 * scale);
        var totalHeight = 9 * itemHeight;  // 9个关卡
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        
        if (uiScrollState.stageSelectScrollY < 0) uiScrollState.stageSelectScrollY = 0;
        if (uiScrollState.stageSelectScrollY > maxScroll) uiScrollState.stageSelectScrollY = maxScroll;
    }
    
    // 赛季选择滚动限制
    if (state === GAME_STATE.SEASON_SELECT) {
        uiScrollState.seasonSelectLastTouchY = 0;
        uiScrollState.seasonSelectIsDragging = false;

        seasonRenderer.clampSeasonSelectScroll();
    }
}


// ==================== 编队系统 ====================

// 编队系统当前标签页
let squadTab = 'character'; // 'character', 'equipment', 'skills', 'pets', 'stars'
let showPortraitLarge = false; // 是否显示立绘大图

// ==================== Boss战模式独立模块 ====================
// 设计思路：复用普通模式的全局变量和渲染逻辑，只改变怪物生成逻辑

const BossBattleMode = {
    init(bossLevel) { return bossBattleSystem.init(bossLevel); },
    start() { bossBattleSystem.start(); },
    end(success) { bossBattleSystem.end(success); },
    cleanup() { bossBattleSystem.cleanup(); },
    attackBoss(damage) { bossBattleSystem.dealDamage(damage); },
    togglePause() { bossBattleSystem.togglePause(); },
    calculateRewards(success) { return bossBattleSystem.calculateRewards(success); },
    setBossHp(val) { bossBattleSystem.setBossHp(val); },
    update() { bossBattleSystem.update(); },

    // 状态访问器（供渲染和触摸处理使用）
    get currentBoss() { return bossBattleSystem.getCurrentBoss(); },
    get bossHp() { return bossBattleSystem.getBossHp(); },
    get bossMaxHp() { return bossBattleSystem.getBossMaxHp(); },
    get maxCombo() { return bossBattleSystem.getMaxCombo(); },
    get isPaused() { return bossBattleSystem.getIsPaused(); },
    get result() { return bossBattleSystem.getResult(); },
    get rewardsObtained() { return bossBattleSystem.getRewardsObtained(); },
    get bossLevel() { return bossBattleSystem.getBossLevel(); },

    // Boss选择界面滚动偏移（渲染和触摸共用同一数据源）
    get bossSelectScrollY() { return bossSelectScrollY; },
    set bossSelectScrollY(v) { bossSelectScrollY = v; },

    // handleTouch 已统一到 handleTouchStart() 共享路径
    // render/renderBoss/renderComboUI/renderPlayerHP/renderPauseMenu 已统一到 renderGame()
};
// 获取灵韵基础分数（辅助函数）



// Boss选择界面滚动变量
let bossSelectScrollY = 0;
let bossSelectTouchStartY = 0;
let bossSelectIsDragging = false;

// Boss选择界面渲染


// 渲染爬塔界面

// 渲染隐藏之路弹窗

// 共享战斗渲染（塔模式 / 普通模式共用）

// 渲染爬塔战斗界面
// renderTowerCombat 已统一到 renderGame()

// 爬塔点击处理

// 爬塔触摸结束处理

// Simulator 环境条件导出（Node.js only，浏览器环境无 module 对象）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // 状态
        getState: function() { return state; },
        getScore: function() { return score; },
        getSeasonScore: function() { return typeof seasonScore !== 'undefined' ? seasonScore : 0; },
        getTimeLeft: function() { return timeLeft; },
        getStars: function() { return stars; },
        getMonsters: function() { return monsters; },
        getSaveData: function() { return saveData; },
        getRuntimeData: function() { return runtimeData; },
        getPlayerHp: function() { return saveData.playerHp; },
        getBestScore: function() { return bestScore; },
        getMonstersKilled: function() { return monstersKilled; },
        getPauseStartTime: function() { return pauseStartTime; },
        getGameEndTime: function() { return gameEndTime; },
        getCurrentMonster: function() { return currentMonster; },
        getGAME_STATE: function() { return GAME_STATE; },
        getScreenScale: function() { return getScreenScale(); },
        getScreenWidth: function() { return screenWidth; },
        getScreenHeight: function() { return screenHeight; },

        // 控制
        startGame: function() { if (startGame) startGame(); },
        endGame: function() { if (endGame) endGame(); },
        startSeasonGame: function() { if (startSeasonGame) startSeasonGame(); },
        initSeasonContent: function() { if (initSeasonContent) initSeasonContent(); },
        setSeasonSelection: function(val) { seasonSelection = val; },
        getSeasonSelection: function() { return seasonSelection; },

        // 系统
        getStarSystem: function() { return starSystem; },
        getBattleEngine: function() { return battleEngine; },
        getNormalBattleAdapter: function() { return normalBattleAdapter; },
        getBossBattleSystem: function() { return bossBattleSystem; },
        getBossBattleMode: function() { return BossBattleMode; },
        getTowerSystem: function() { return towerSystem; },
        getComboSystem: function() { return comboSystem; },
        getSkillSystem: function() { return skillSystem; },
        getCharacterSystem: function() { return characterSystem; },
        getGameStateMachine: function() { return stateMachine; },
        getUpgradeEngine: function() { return upgradeEngine; },
        getFusionEngine: function() { return fusionEngine; },

        // UI编辑器
        getUIConfig: function() { return uiConfig; },
        getUIEditorSystem: function() { return uiEditorSystem; },

        // 桥接变量（让 simulator 可以直接操作）
        _executeDebugAction: function() { return executeDebugAction; }
    };
}

