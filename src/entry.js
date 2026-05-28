/**
 * 游戏模块入口 - Rollup 打包入口
 *
 * 所有从 game.js 中提取的独立模块在此汇总导出。
 * Rollup 会将此文件及其依赖打包为 dist/game-modules.js。
 *
 * 新增模块时：
 * 1. 在 src/systems/ 下创建模块文件
 * 2. 在此文件中 import 并添加到 GameModules 对象
 */
import { createStarThiefSystem } from './systems/StarThiefSystem.js';
import { createVictoryHealPlugin } from './systems/VictoryHealPlugin.js';
import { createTaskSystem, GUIDE_TASKS, DAILY_TASKS, ACHIEVEMENT_TASKS } from './systems/TaskSystem.js';
import { createFaithSystem, FAITH_CONFIG } from './systems/FaithSystem.js';
import { createTowerSystem, TOWER_CONFIG } from './systems/TowerSystem.js';
import { createAFKSystem } from './systems/AFKSystem.js';
import {
    GACHA_POOL_TYPES, GACHA_POOL_ROTATION_DAYS, GACHA_ANIMATION_CONFIG,
    GACHA_POOLS, STAR_CHEST_REWARDS, STAR_CHEST_DROP_RATE,
    createGachaSystem
} from './systems/GachaSystem.js';
import { MAX_CHARACTER_LEVEL, createCharacterSystem } from './systems/CharacterSystem.js';
import { createDropSystem } from './systems/DropSystem.js';
import { createMaterialSystem } from './systems/MaterialSystem.js';
import { createAnimationSystem } from './systems/AnimationSystem.js';
import { createComboSystem } from './systems/ComboSystem.js';
import { createPetSystem } from './systems/PetSystem.js';
import { createSkillSystem } from './systems/SkillSystem.js';
import { MonsterSkillType, createMonsterSkillSystem } from './systems/MonsterSkillSystem.js';
import { STAR_MODE, FALLING_CONFIG, MAX_STARS_ON_SCREEN, BIRTH_ANIMS, getBirthTransform, createStarSystem } from './systems/StarSystem.js';
import { ShopItems, createShopSystem } from './systems/ShopSystem.js';
import { createMonsterSpawnSystem } from './systems/MonsterSpawnSystem.js';
import {
    BOSS_STAR_COUNT, BOSS_STAR_MISS_THRESHOLD, BOSS_STAR_DURATION,
    BOSS_FIRST_TRIGGER, BOSS_REPEAT_TRIGGER, BOSS_STUN_CHANCE, BOSS_STUN_DURATION,
    createBossStarSystem
} from './systems/BossStarSystem.js';
import { SEASON_STAR_TYPES as SeasonStarTypes, createSeasonSystem } from './systems/SeasonSystem.js';
import { createMonthlyCardSystem } from './systems/MonthlyCardSystem.js';
import { createStorageSystem } from './systems/StorageSystem.js';
import { createAdSystem } from './systems/AdSystem.js';
import { createStageModeSystem } from './systems/StageModeSystem.js';
import { EquipmentTypes, EquipmentRarity, Equipments } from './config/EquipmentConfig.js';
import { SkillTypes, Skills } from './config/SkillConfig.js';
import { PetRarity, Pets } from './config/PetConfig.js';
import { Materials } from './config/MaterialConfig.js';
import { STAGES, CHAPTERS } from './config/StageConfig.js';
import { Monsters, MonsterRarityWeights, MonsterGrowth, BOSS_LIST, MonsterTypes } from './config/MonsterConfig.js';
import { Characters, getCharacterKey } from './config/CharacterConfig.js';
import { CONFIG, BOSS_BATTLE_CONFIG, BASE_STAR_INTERVAL, MIN_STAR_INTERVAL, DODGE_DURATION, DODGE_STAR_SPAWN_INTERVAL, DODGE_STAR_LIFETIME, MONSTER_ABSORB_SCORE, MONSTER_ARMOR_GAIN, MONSTER_HP_GAIN, MONSTER_DAMAGE_GAIN, NORMAL_GAME_TIME, TIME_STAR_MIN_TIME, STAR_DEVOURER_ESCAPE_HP_RATIO, GREEDY_SKILL_THRESHOLD, COMBO_STAR_DURATION, COMBO_STAR_INTERVAL, SKILL_SLOT_SIZE, MAX_ACTIVE_SKILLS, RARITY_COLORS, BACK_BTN_WIDTH, BACK_BTN_HEIGHT, BACK_BTN_COLOR, MODE_UNLOCK, isModeUnlocked, AWAKE_CONFIG, getPlayerHpScaling, getPlayerAtkScaling, getPlayerScoreScaling, getAwakeStage, getDropTier } from './config/GameConfig.js';
import { drawRoundRect, fillRoundRect, strokeRoundRect, gachaRoundRect } from './utils/DrawUtils.js';
import { createDelayedHpTracker } from './utils/DelayedHpTracker.js';
import { createGameLifecycleSystem } from './systems/GameLifecycleSystem.js';
import { createPlayerDataSystem } from './systems/PlayerDataSystem.js';
import { createDebugSystem } from './systems/DebugSystem.js';
import { createGameDataStore } from './systems/GameDataStore.js';
import { createMigrationPipeline } from './systems/MigrationPipeline.js';
import { createUIConfig } from './config/UIConfig.js';
import { createCombatFontConfig } from './config/CombatFontConfig.js';
import { createUIEditorSystem } from './systems/UIEditorSystem.js';
import { createPoisonPuddleSystem } from './systems/PoisonPuddleSystem.js';
import { createTipSystem } from './systems/TipSystem.js';
import { createAudioSystem } from './systems/AudioSystem.js';
import { createBattleEngine, BATTLE_CONSTANTS } from './systems/BattleEngine.js';
import { createBossBattleAdapter } from './systems/BossBattleAdapter.js';
import { createDevBattleSystem } from './systems/DevBattleSystem.js';
import { createNormalBattleAdapter } from './systems/NormalBattleAdapter.js';
import { createCaptureSystem, CAPTURE_STAR_TYPE, CAPTURE_CONFIG } from './systems/CaptureSystem.js';
import { createInvariantChecker } from './systems/InvariantChecker.js';
import { createModeLifecycleManager } from './systems/ModeLifecycleManager.js';
import { createUICoreRenderer } from './renderers/UICoreRenderer.js';
import { createMonsterDrawRenderer } from './renderers/MonsterDrawRenderer.js';
import { createAFKRenderer } from './renderers/AFKRenderer.js';
import { createMenuRenderer } from './renderers/MenuRenderer.js';
import { createSeasonRenderer } from './renderers/SeasonRenderer.js';
import { createTaskRenderer } from './renderers/TaskRenderer.js';
import { createDebugRenderer } from './renderers/DebugRenderer.js';
import { createShopRenderer } from './renderers/ShopRenderer.js';
import { createBackpackRenderer } from './renderers/BackpackRenderer.js';
import { createGachaRenderer } from './renderers/GachaRenderer.js';
import { createStageRenderer } from './renderers/StageRenderer.js';
import { createSquadRenderer } from './renderers/SquadRenderer.js';
import { createBossRenderer } from './renderers/BossRenderer.js';
import { createTowerRenderer } from './renderers/TowerRenderer.js';
import { createGameBattleRenderer } from './renderers/GameBattleRenderer.js';
import { playerEffects, combatState, uiScrollState, comboState } from './state/GameState.js';
import { createStateMachine } from './state/StateMachine.js';
import {
    COMBAT_SPEC, COMBAT_FEATURES, FEATURE_ENUMS, FEATURE_CONSTRAINTS,
    BOSS_COMBAT_FEATURES, TOWER_COMBAT_FEATURES,
    BOSS_COMBAT_OVERRIDES, TOWER_COMBAT_OVERRIDES,
    specResolver, getSpecValue, flattenSpec,
    validateOverrides, validateFeatures, getWeakWarnings
} from './config/CombatSpec.js';
import { FUSION_LAYERS, FUSION_TYPES, FUSION_CONFIG, RARITY_ORDER, getNextRarity } from './config/FusionConfig.js';
import { createFusionRegistry } from './systems/FusionRegistry.js';
import { createFusionEngine } from './systems/fusion/FusionEngine.js';
import { createFusionCharacterStrategy } from './systems/fusion/strategies/FusionCharacterStrategy.js';
import { createFusionPetStrategy } from './systems/fusion/strategies/FusionPetStrategy.js';
import { createFusionSkillStrategy } from './systems/fusion/strategies/FusionSkillStrategy.js';
import { createFusionStarStrategy } from './systems/fusion/strategies/FusionStarStrategy.js';
import { createFusionEquipmentStrategy } from './systems/fusion/strategies/FusionEquipmentStrategy.js';
import { createFusionRenderer } from './renderers/FusionRenderer.js';
import { UPGRADE_CONFIG, UPGRADE_TYPES } from './config/UpgradeConfig.js';
import { createUpgradeEngine } from './systems/upgrade/UpgradeEngine.js';
import { createUpgradeCharacterStrategy } from './systems/upgrade/strategies/UpgradeCharacterStrategy.js';
import { createUpgradeEquipmentStrategy } from './systems/upgrade/strategies/UpgradeEquipmentStrategy.js';
import { createUpgradeSkillStrategy } from './systems/upgrade/strategies/UpgradeSkillStrategy.js';
import { createUpgradePetStrategy } from './systems/upgrade/strategies/UpgradePetStrategy.js';
import { createUpgradeStarStrategy } from './systems/upgrade/strategies/UpgradeStarStrategy.js';
import { createUpgradeRenderer } from './renderers/UpgradeRenderer.js';
import { createRhythmSystem } from './systems/RhythmSystem.js';
import { createRhythmSkillSystem } from './systems/RhythmSkillSystem.js';
import { createChargeSystem } from './systems/ChargeSystem.js';
import { createDragSystem } from './systems/DragSystem.js';
import { createLinkChainSystem } from './systems/LinkChainSystem.js';
import { createTouchGestureSystem } from './systems/TouchGestureSystem.js';
import { createSaturationState, SATURATION_COSTS } from './systems/SaturationState.js';
import { PauseCoordinator } from './utils/PauseCoordinator.js';
import * as BrowserAPI from './platform/BrowserAPI.js';

// 大世界探索系统
import { createTitleRenderer } from './renderers/TitleRenderer.js';
import { createCutsceneRenderer } from './renderers/CutsceneRenderer.js';
import { createWorldMapSystem } from './systems/WorldMapSystem.js';
import { createWorldMapRenderer } from './renderers/WorldMapRenderer.js';
import { WORLDS, getWorldConfig, getAllWorldIds } from './config/WorldMapConfig.js';
import { createWorldMapPlayer } from './systems/worldmap/WorldMapPlayer.js';
import { createWorldMapEntity } from './systems/worldmap/WorldMapEntity.js';
import { createWorldMapExploration } from './systems/worldmap/WorldMapExploration.js';
import { createWorldMapUnlock } from './systems/worldmap/WorldMapUnlock.js';
import { COLLISION_BITMAPS } from './config/CollisionBitmapConfig.js';
import { IMAGE_GROUPS, BEAUTY_CONFIG, AUDIO_CONFIG, CHARACTER_MAP } from './config/AssetConfig.js';
import { createAssetManager } from './systems/AssetManager.js';
import { createDialogueSystem } from './systems/DialogueSystem.js';
import { createSceneDispatcher } from './systems/SceneDispatcher.js';
import { PORTRAIT_MAP, PROLOGUE_DIALOGUE, PROLOGUE_AFTER_BATTLE, STORY_SCENES } from './config/DialogueConfig.js';

var GameModules = {
    createStarThiefSystem: createStarThiefSystem,
    createVictoryHealPlugin: createVictoryHealPlugin,
    createTaskSystem: createTaskSystem,
    GUIDE_TASKS: GUIDE_TASKS,
    DAILY_TASKS: DAILY_TASKS,
    ACHIEVEMENT_TASKS: ACHIEVEMENT_TASKS,
    createFaithSystem: createFaithSystem,
    FAITH_CONFIG: FAITH_CONFIG,
    createTowerSystem: createTowerSystem,
    TOWER_CONFIG: TOWER_CONFIG,
    createAFKSystem: createAFKSystem,
    GACHA_POOL_TYPES: GACHA_POOL_TYPES,
    GACHA_POOL_ROTATION_DAYS: GACHA_POOL_ROTATION_DAYS,
    GACHA_ANIMATION_CONFIG: GACHA_ANIMATION_CONFIG,
    GACHA_POOLS: GACHA_POOLS,
    STAR_CHEST_REWARDS: STAR_CHEST_REWARDS,
    STAR_CHEST_DROP_RATE: STAR_CHEST_DROP_RATE,
    createGachaSystem: createGachaSystem,
    MAX_CHARACTER_LEVEL: MAX_CHARACTER_LEVEL,
    createCharacterSystem: createCharacterSystem,
    createDropSystem: createDropSystem,
    createMaterialSystem: createMaterialSystem,
    createAnimationSystem: createAnimationSystem,
    createComboSystem: createComboSystem,
    createPetSystem: createPetSystem,
    createSkillSystem: createSkillSystem,
    MonsterSkillType: MonsterSkillType,
    createMonsterSkillSystem: createMonsterSkillSystem,
    STAR_MODE: STAR_MODE,
    FALLING_CONFIG: FALLING_CONFIG,
    MAX_STARS_ON_SCREEN: MAX_STARS_ON_SCREEN,
    BIRTH_ANIMS: BIRTH_ANIMS,
    getBirthTransform: getBirthTransform,
    createStarSystem: createStarSystem,
    ShopItems: ShopItems,
    createShopSystem: createShopSystem,
    createMonsterSpawnSystem: createMonsterSpawnSystem,
    BOSS_STAR_COUNT: BOSS_STAR_COUNT,
    BOSS_STAR_MISS_THRESHOLD: BOSS_STAR_MISS_THRESHOLD,
    BOSS_STAR_DURATION: BOSS_STAR_DURATION,
    BOSS_FIRST_TRIGGER: BOSS_FIRST_TRIGGER,
    BOSS_REPEAT_TRIGGER: BOSS_REPEAT_TRIGGER,
    BOSS_STUN_CHANCE: BOSS_STUN_CHANCE,
    BOSS_STUN_DURATION: BOSS_STUN_DURATION,
    createBossStarSystem: createBossStarSystem,
    SEASON_STAR_TYPES: SeasonStarTypes,
    createSeasonSystem: createSeasonSystem,
    createMonthlyCardSystem: createMonthlyCardSystem,
    createStorageSystem: createStorageSystem,
    createAdSystem: createAdSystem,
    createStageModeSystem: createStageModeSystem,
    createAudioSystem: createAudioSystem,
    createTipSystem: createTipSystem,
    EquipmentTypes: EquipmentTypes,
    EquipmentRarity: EquipmentRarity,
    Equipments: Equipments,
    SkillTypes: SkillTypes,
    Skills: Skills,
    PetRarity: PetRarity,
    Pets: Pets,
    Materials: Materials,
    STAGES: STAGES,
    CHAPTERS: CHAPTERS,
    Monsters: Monsters,
    MonsterRarityWeights: MonsterRarityWeights,
    MonsterGrowth: MonsterGrowth,
    BOSS_LIST: BOSS_LIST,
    MonsterTypes: MonsterTypes,
    Characters: Characters,
    getCharacterKey: getCharacterKey,
    CONFIG: CONFIG,
    BOSS_BATTLE_CONFIG: BOSS_BATTLE_CONFIG,
    BASE_STAR_INTERVAL: BASE_STAR_INTERVAL,
    MIN_STAR_INTERVAL: MIN_STAR_INTERVAL,
    DODGE_DURATION: DODGE_DURATION,
    DODGE_STAR_SPAWN_INTERVAL: DODGE_STAR_SPAWN_INTERVAL,
    DODGE_STAR_LIFETIME: DODGE_STAR_LIFETIME,
    MONSTER_ABSORB_SCORE: MONSTER_ABSORB_SCORE,
    MONSTER_ARMOR_GAIN: MONSTER_ARMOR_GAIN,
    MONSTER_HP_GAIN: MONSTER_HP_GAIN,
    MONSTER_DAMAGE_GAIN: MONSTER_DAMAGE_GAIN,
    NORMAL_GAME_TIME: NORMAL_GAME_TIME,
    TIME_STAR_MIN_TIME: TIME_STAR_MIN_TIME,
    STAR_DEVOURER_ESCAPE_HP_RATIO: STAR_DEVOURER_ESCAPE_HP_RATIO,
    GREEDY_SKILL_THRESHOLD: GREEDY_SKILL_THRESHOLD,
    COMBO_STAR_DURATION: COMBO_STAR_DURATION,
    COMBO_STAR_INTERVAL: COMBO_STAR_INTERVAL,
    SKILL_SLOT_SIZE: SKILL_SLOT_SIZE,
    MAX_ACTIVE_SKILLS: MAX_ACTIVE_SKILLS,
    RARITY_COLORS: RARITY_COLORS,
    BACK_BTN_WIDTH: BACK_BTN_WIDTH,
    BACK_BTN_HEIGHT: BACK_BTN_HEIGHT,
    BACK_BTN_COLOR: BACK_BTN_COLOR,
    MODE_UNLOCK: MODE_UNLOCK,
    isModeUnlocked: isModeUnlocked,
    AWAKE_CONFIG: AWAKE_CONFIG,
    getPlayerHpScaling: getPlayerHpScaling,
    getPlayerAtkScaling: getPlayerAtkScaling,
    getPlayerScoreScaling: getPlayerScoreScaling,
    getAwakeStage: getAwakeStage,
    getDropTier: getDropTier,
    drawRoundRect: drawRoundRect,
    fillRoundRect: fillRoundRect,
    strokeRoundRect: strokeRoundRect,
    gachaRoundRect: gachaRoundRect,
    createGameLifecycleSystem: createGameLifecycleSystem,
    createPlayerDataSystem: createPlayerDataSystem,
    createGameDataStore: createGameDataStore,
    createMigrationPipeline: createMigrationPipeline,
    createDebugSystem: createDebugSystem,
    createPoisonPuddleSystem: createPoisonPuddleSystem,
    playerEffects: playerEffects,
    combatState: combatState,
    uiScrollState: uiScrollState,
    comboState: comboState,
    createBattleEngine: createBattleEngine,
    BATTLE_CONSTANTS: BATTLE_CONSTANTS,
    createBossBattleAdapter: createBossBattleAdapter,
    createNormalBattleAdapter: createNormalBattleAdapter,
    createCaptureSystem: createCaptureSystem,
    CAPTURE_STAR_TYPE: CAPTURE_STAR_TYPE,
    CAPTURE_CONFIG: CAPTURE_CONFIG,
    createInvariantChecker: createInvariantChecker,
    createModeLifecycleManager: createModeLifecycleManager,
    createStateMachine: createStateMachine,
    createDelayedHpTracker: createDelayedHpTracker,
    createUICoreRenderer: createUICoreRenderer,
    createMonsterDrawRenderer: createMonsterDrawRenderer,
    createAFKRenderer: createAFKRenderer,
    createMenuRenderer: createMenuRenderer,
    createSeasonRenderer: createSeasonRenderer,
    createTaskRenderer: createTaskRenderer,
    createDebugRenderer: createDebugRenderer,
    createShopRenderer: createShopRenderer,
    createBackpackRenderer: createBackpackRenderer,
    createGachaRenderer: createGachaRenderer,
    createStageRenderer: createStageRenderer,
    createSquadRenderer: createSquadRenderer,
    createBossRenderer: createBossRenderer,
    createTowerRenderer: createTowerRenderer,
    createGameBattleRenderer: createGameBattleRenderer,
    createDevBattleSystem: createDevBattleSystem,
    COMBAT_SPEC: COMBAT_SPEC,
    COMBAT_FEATURES: COMBAT_FEATURES,
    FEATURE_ENUMS: FEATURE_ENUMS,
    FEATURE_CONSTRAINTS: FEATURE_CONSTRAINTS,
    BOSS_COMBAT_FEATURES: BOSS_COMBAT_FEATURES,
    TOWER_COMBAT_FEATURES: TOWER_COMBAT_FEATURES,
    BOSS_COMBAT_OVERRIDES: BOSS_COMBAT_OVERRIDES,
    TOWER_COMBAT_OVERRIDES: TOWER_COMBAT_OVERRIDES,
    specResolver: specResolver,
    getSpecValue: getSpecValue,
    flattenSpec: flattenSpec,
    validateOverrides: validateOverrides,
    validateFeatures: validateFeatures,
    getWeakWarnings: getWeakWarnings,
    FUSION_LAYERS: FUSION_LAYERS,
    FUSION_TYPES: FUSION_TYPES,
    FUSION_CONFIG: FUSION_CONFIG,
    RARITY_ORDER: RARITY_ORDER,
    getNextRarity: getNextRarity,
    createFusionRegistry: createFusionRegistry,
    createFusionEngine: createFusionEngine,
    createFusionCharacterStrategy: createFusionCharacterStrategy,
    createFusionPetStrategy: createFusionPetStrategy,
    createFusionSkillStrategy: createFusionSkillStrategy,
    createFusionStarStrategy: createFusionStarStrategy,
    createFusionEquipmentStrategy: createFusionEquipmentStrategy,
    createFusionRenderer: createFusionRenderer,
    UPGRADE_CONFIG: UPGRADE_CONFIG,
    UPGRADE_TYPES: UPGRADE_TYPES,
    createUpgradeEngine: createUpgradeEngine,
    createUpgradeCharacterStrategy: createUpgradeCharacterStrategy,
    createUpgradeEquipmentStrategy: createUpgradeEquipmentStrategy,
    createUpgradeSkillStrategy: createUpgradeSkillStrategy,
    createUpgradePetStrategy: createUpgradePetStrategy,
    createUpgradeStarStrategy: createUpgradeStarStrategy,
    createUpgradeRenderer: createUpgradeRenderer,

    // D2-D5 战斗维度
    createRhythmSystem: createRhythmSystem,
    createRhythmSkillSystem: createRhythmSkillSystem,
    createChargeSystem: createChargeSystem,
    createDragSystem: createDragSystem,
    createLinkChainSystem: createLinkChainSystem,
    createTouchGestureSystem: createTouchGestureSystem,
    createSaturationState: createSaturationState,
    SATURATION_COSTS: SATURATION_COSTS,

    // UI编辑器
    createUIConfig: createUIConfig,
    createCombatFontConfig: createCombatFontConfig,
    createUIEditorSystem: createUIEditorSystem,

    // 浏览器平台 API
    BrowserAPI: BrowserAPI,

    // 大世界探索系统
    createTitleRenderer: createTitleRenderer,
    createCutsceneRenderer: createCutsceneRenderer,
    createWorldMapSystem: createWorldMapSystem,
    createWorldMapRenderer: createWorldMapRenderer,
    WORLDS: WORLDS,
    getWorldConfig: getWorldConfig,
    getAllWorldIds: getAllWorldIds,
    createWorldMapPlayer: createWorldMapPlayer,
    createWorldMapEntity: createWorldMapEntity,
    createWorldMapExploration: createWorldMapExploration,
    createWorldMapUnlock: createWorldMapUnlock,
    COLLISION_BITMAPS: COLLISION_BITMAPS,
    IMAGE_GROUPS: IMAGE_GROUPS,
    BEAUTY_CONFIG: BEAUTY_CONFIG,
    AUDIO_CONFIG: AUDIO_CONFIG,
    CHARACTER_MAP: CHARACTER_MAP,
    createAssetManager: createAssetManager,
    PauseCoordinator: PauseCoordinator,

    // 对话剧情系统
    createDialogueSystem: createDialogueSystem,
    createSceneDispatcher: createSceneDispatcher,
    PORTRAIT_MAP: PORTRAIT_MAP,
    PROLOGUE_DIALOGUE: PROLOGUE_DIALOGUE,
    PROLOGUE_AFTER_BATTLE: PROLOGUE_AFTER_BATTLE,
    STORY_SCENES: STORY_SCENES
};

// CommonJS 环境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameModules;
}

// 浏览器环境 - 全局挂载
if (typeof window !== 'undefined') {
    window.GameModules = GameModules;
}
