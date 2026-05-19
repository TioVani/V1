import Logger from '../utils/Logger.js';
import { createBattleEngine, BATTLE_CONSTANTS } from './BattleEngine.js';
import { BOSS_COMBAT_OVERRIDES, BOSS_COMBAT_FEATURES } from '../config/CombatSpec.js';

/**
 * BossBattleAdapter - BattleEngine 适配器，统一 Boss 战斗逻辑
 *
 * 包装 BattleEngine，提供 Boss 战斗逻辑。
 * Boss 特有功能（分裂、毒液、Boss 星星、暂停、奖励）在适配器内管理。
 */

function createBossBattleAdapter(deps) {

    // ═══ 核心依赖 ═══
    var getPlayerData = deps.getPlayerData;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getCharacterFullStats = deps.getCharacterFullStats;
    var saveData = deps.saveData;
    var saveDataImmediate = deps.saveDataImmediate;
    var saveBestScore = deps.saveBestScore;
    var setGameState = deps.setGameState;
    var getGameState = deps.getGameState;
    var GAME_STATE = deps.GAME_STATE;
    var getBOSS_LIST = deps.getBOSS_LIST;
    var getBOSS_BATTLE_CONFIG = deps.getBOSS_BATTLE_CONFIG;
    var getBOSS_STUN_CHANCE = deps.getBOSS_STUN_CHANCE;
    var getBOSS_STUN_DURATION = deps.getBOSS_STUN_DURATION;

    // 定时器
    var clearTimerInterval = deps.clearTimerInterval;
    var clearMoveInterval = deps.clearMoveInterval;
    var clearMonsterAttackInterval = deps.clearMonsterAttackInterval;
    var setTimerInterval = deps.setTimerInterval;
    var setMoveInterval = deps.setMoveInterval;
    var setMonsterAttackInterval = deps.setMonsterAttackInterval;

    var getScore = deps.getScore;
    var setScore = deps.setScore;
    var getTimeLeft = deps.getTimeLeft;
    var setTimeLeft = deps.setTimeLeft;
    var getComboCount = deps.getComboCount;
    var setComboCount = deps.setComboCount;
    var getLastComboTime = deps.getLastComboTime;
    var setLastComboTime = deps.setLastComboTime;
    var getStars = deps.getStars;
    var setStars = deps.setStars;
    var getMonstersKilled = deps.getMonstersKilled;
    var setMonstersKilled = deps.setMonstersKilled;
    var getMonsters = deps.getMonsters;
    var setMonsters = deps.setMonsters;
    var getMonster = deps.getMonster;
    var getBaseStarInterval = deps.getBaseStarInterval;

    var resetCombo = deps.resetCombo;
    var clearMessages = deps.clearMessages;
    var addMessage = deps.addMessage;
    var createMonster = deps.createMonster;
    var startDodgeStarTimer = deps.startDodgeStarTimer;
    var stopDodgeStarTimer = deps.stopDodgeStarTimer;
    var startPetAttackTimer = deps.startPetAttackTimer;
    var stopPetAttackTimer = deps.stopPetAttackTimer;
    var getPauseStartTime = deps.getPauseStartTime;
    var setPauseStartTime = deps.setPauseStartTime;

    var getGameItems = deps.getGameItems;
    var getAdItems = deps.getAdItems;
    var getMAX_GAME_ITEMS = deps.getMAX_GAME_ITEMS;
    var getSkillSystem = deps.getSkillSystem;

    // 连击星星
    var getComboStarActive = deps.getComboStarActive;
    var setComboStarActive = deps.setComboStarActive;
    var getComboStarStartTime = deps.getComboStarStartTime;
    var setComboStarStartTime = deps.setComboStarStartTime;

    // 状态效果
    var setPlayerDodging = deps.setPlayerDodging;
    var setPlayerDodgeEndTime = deps.setPlayerDodgeEndTime;
    var setPlayerStunned = deps.setPlayerStunned;
    var setPlayerStunEndTime = deps.setPlayerStunEndTime;
    var setPlayerPoisoned = deps.setPlayerPoisoned;
    var setPlayerPoisonEndTime = deps.setPlayerPoisonEndTime;
    var setPlayerPoisonDamage = deps.setPlayerPoisonDamage;
    var setPlayerPoisonTickTime = deps.setPlayerPoisonTickTime;

    // 动画
    var createMeteorAnimation = deps.createMeteorAnimation;
    var createCritAnimation = deps.createCritAnimation;
    var createPlayerDamageAnimation = deps.createPlayerDamageAnimation;
    var createTimeDamageAnimation = deps.createTimeDamageAnimation;
    var createMonsterDamageAnimation = deps.createMonsterDamageAnimation;
    var createHpBarCounterAnimation = deps.createHpBarCounterAnimation;
    var vibrateShort = deps.vibrateShort;
    var addMonsterSkillAnimation = deps.addMonsterSkillAnimation;
    var spawnPoisonPuddles = deps.spawnPoisonPuddles;
    var getMonstersConfig = deps.getMonstersConfig;
    var getMonsterTypes = deps.getMonsterTypes;
    var calculateMonsterPositions = deps.calculateMonsterPositions;

    // NormalBattleAdapter 统一点击路径
    var initBossEngineFn = deps.initBossEngineFn;
    var releaseBossEngineFn = deps.releaseBossEngineFn;
    var updateStarSpawnIntervalFn = deps.updateStarSpawnInterval || null;

    // ═══ BattleEngine 实例 ═══
    var battleEngine = null;

    // ═══ Boss 专属状态 ═══
    var currentBoss = null;
    var bossHp = 0;
    var bossMaxHp = 0;
    var maxCombo = 0;
    var isPaused = false;
    var result = null;
    var rewardsObtained = null;
    var bossLevel = 1;
    var engineActive = false;

    // 分裂状态
    var splitMonsters = [];
    var hasSplit = false;
    var hasPoisonSplit = false;

    // ═══ 工具函数 ═══

    function safeCall(fn, ctx) {
        if (typeof fn !== 'function') return;
        try { fn(ctx); } catch (e) { Logger.error('BossAdapter 回调异常:', e.message); }
    }

    // ═══ BattleEngine 依赖构建 ═══

    function buildEngineDeps() {
        return {
            screen: {
                getWidth: getScreenWidth,
                getHeight: getScreenHeight,
                getScale: getScreenScale
            },
            player: {
                getData: getPlayerData,
                getCharFullStats: getCharacterFullStats
            },
            animation: {
                createStarBurst: function(x, y, t) { if (deps.createStarBurstAnimation) deps.createStarBurstAnimation(x, y, t); },
                createScreenShake: function(i) { if (deps.createScreenShake) deps.createScreenShake(i); },
                createMonsterDamage: function(x, y, d) { createMonsterDamageAnimation(x, y, d); },
                createPlayerDamage: function(d, b, p, t, s) { createPlayerDamageAnimation(d, b, p, t, s); },
                createMeteor: function(sx, sy, d, c, st, ss, cm, cb, ce) { createMeteorAnimation(sx, sy, d, c, st, ss, cm || 1, cb, ce); },
                createCrit: function(x, y, d, s, c) { createCritAnimation(x, y, d, s, c); },
                createQuickTap: function(x, y, s, t, f) { if (deps.createQuickTapAnimation) deps.createQuickTapAnimation(x, y, s, t, f); },
                createMonsterProjectile: function(sx, sy, d, td, b, h) { if (deps.createMonsterProjectileAnimation) deps.createMonsterProjectileAnimation(sx, sy, d, td, b, h); else if (h) h(); },
                createHpBarCounter: function() { createHpBarCounterAnimation(); },
                createTimeDamage: function(d) { createTimeDamageAnimation(d); },
                createPetDamage: function(x, y, d, e, c) { if (deps.createPetDamageAnimation) deps.createPetDamageAnimation(x, y, d, e, c); },
                addMessage: addMessage,
                vibrateShort: vibrateShort
            },
            combat: {
                getSeasonStarTypes: function() { return deps.getSeasonStarTypes ? deps.getSeasonStarTypes() : []; },
                updateCombo: deps.updateCombo,
                getComboCount: getComboCount,
                calculateStarScore: function(t) { return getStarBaseScore(t); },
                getMonsterSkillType: function() { return deps.getMonsterSkillType ? deps.getMonsterSkillType() : { POISON: 'poison' }; }
            },
            skills: {
                getConfig: function() { return deps.getSkillsConfig ? deps.getSkillsConfig() : {}; },
                getTypes: function() { return deps.getSkillTypes ? deps.getSkillTypes() : { PASSIVE: 'passive' }; }
            }
        };
    }

    // ═══ Boss 特有回调 ═══

    function onDamageDealtHandler(ctx) {
        if (!currentBoss || !ctx.monster) return;

        if (hasSplit) {
            // 分裂模式：清理死亡怪 + 切换 BattleEngine 目标
            if (ctx.monster.hp <= 0) {
                ctx.monster.active = false;
                var monsters = getMonsters();
                var alive = [];
                for (var i = 0; i < monsters.length; i++) {
                    if (monsters[i].hp > 0) alive.push(monsters[i]);
                }
                setMonsters(alive);
                if (alive.length === 0) {
                    if (currentBoss.id === 'slime_king' && spawnPoisonPuddles) {
                        triggerDeathPoison();
                    }
                    // 不直接 end(true)，由 pendingMonsterDeath 延迟结算
                } else if (battleEngine) {
                    battleEngine.setTargetMonster(alive[0]);
                }
            }
            return;
        }

        var monster = ctx.monster;

        // 毒液分裂检查（史莱姆王 HP <= 70%）
        if (currentBoss.id === 'slime_king' && !hasPoisonSplit && monster.hp <= bossMaxHp * 0.7) {
            triggerPoisonSplit();
        }

        // 分裂检查（史莱姆王 HP <= 50%）
        if (currentBoss.id === 'slime_king' && !hasSplit && monster.hp <= bossMaxHp * 0.5) {
            triggerSplit();
        }
    }

    function onBeforeMonsterDeathHandler(ctx) {
        if (!currentBoss) return;

        // 分裂后：由 attackBoss 手动管理，不在 engine 死亡流程中触发
        if (hasSplit) return;

        // 死亡前毒液
        if (currentBoss.id === 'slime_king' && spawnPoisonPuddles) {
            triggerDeathPoison();
        }
    }

    function onMonsterDeathHandler(ctx) {
        if (hasSplit) {
            // 分裂模式：检查是否所有小怪都已死亡
            var currentMonsters = getMonsters();
            var aliveCount = 0;
            for (var ai = 0; ai < currentMonsters.length; ai++) {
                if (currentMonsters[ai].hp > 0) aliveCount++;
            }
            if (aliveCount > 0) return;
            // 所有小怪死亡 → 结算
            Logger.info('[BossDelay] 分裂小怪全部死亡 → end(true)');
        } else {
            Logger.info('[BossDelay] onMonsterDeathHandler 被调用 → end(true)');
        }
        setMonsters([]);
        engineActive = false;
        end(true);
    }

    function onPlayerDeathHandler() {
        engineActive = false;
        end(false);
    }

    function onTimeUpHandler() {
        engineActive = false;
        end(false);
    }

    // ═══ 分裂/毒液触发 ═══

    function triggerPoisonSplit() {
        var poisonSplitSkill = findBossSkill('poison_split');
        if (!poisonSplitSkill) return;

        hasPoisonSplit = true;
        var pd = getPlayerData();
        var poisonDmg = poisonSplitSkill.damage || 20;

        if (pd.playerShield > 0) {
            var sa = Math.min(pd.playerShield, poisonDmg);
            pd.playerShield -= sa;
            poisonDmg -= sa;
        }
        pd.playerHp = Math.max(0, pd.playerHp - poisonDmg);
        setPlayerPoisoned(true);
        setPlayerPoisonEndTime(Date.now() + (poisonSplitSkill.poisonDuration || 5) * 1000);
        setPlayerPoisonDamage(poisonSplitSkill.poisonDamage || 8);
        setPlayerPoisonTickTime(Date.now() + 1000);

        if (addMonsterSkillAnimation) addMonsterSkillAnimation(getMonster(), 'poison_split', '毒液飞溅!');
        addMessage('☠️ 史莱姆王吐出毒液! -' + poisonDmg + 'HP', '#00ff00', true);
        if (spawnPoisonPuddles) {
            spawnPoisonPuddles(getScreenWidth() / 2, getScreenHeight() / 3, poisonSplitSkill);
        }
        vibrateShort({ type: 'heavy' });
    }

    function triggerSplit() {
        var splitSkill = findBossSkill('split');
        if (!splitSkill || !getMonstersConfig || !getMonsterTypes || !calculateMonsterPositions) return;

        hasSplit = true;
        var MonstersConfig = getMonstersConfig();
        var MonsterTypes = getMonsterTypes();
        var splitMonsterConfig = MonstersConfig[splitSkill.splitInto];
        var splitMonsterType = MonsterTypes[splitSkill.splitInto];
        var splitCount = splitSkill.count || 3;

        if (!splitMonsterConfig) return;

        var positions = calculateMonsterPositions(splitCount, getScreenHeight() / 3);
        var monsters = getMonsters();

        // Boss → 第一只分裂小怪
        if (monsters.length > 0) {
            var m = monsters[0];
            m.type = splitSkill.splitInto;
            m.maxHp = Math.floor(splitMonsterConfig.baseHp * 1.2);
            m.hp = m.maxHp;
            m._delayedHp = undefined;
            m.skills = splitMonsterConfig.skills || [];
            m.shield = 0;
            m.attack = splitMonsterConfig.baseAttack || 10;
            m.attackInterval = splitMonsterConfig.attackInterval || 2000;
            m.splitFrom = 'boss';
            m.x = positions[0].x;
            m.y = positions[0].y;
        }

        // 额外分裂小怪
        for (var si = 1; si < splitCount; si++) {
            var newMonster = createMonster(splitSkill.splitInto, positions[si].x, positions[si].y, {
                maxHp: Math.floor(splitMonsterConfig.baseHp * 1.2),
                hp: Math.floor(splitMonsterConfig.baseHp * 1.2),
                attack: splitMonsterConfig.baseAttack || 10,
                attackInterval: splitMonsterConfig.attackInterval || 2000,
                skills: splitMonsterConfig.skills || [],
                splitFrom: 'boss'
            });
            monsters.push(newMonster);
        }

        setMonsters(monsters);
        splitMonsters = monsters;

        // 用第一个分裂怪物替换 BattleEngine 怪物（作为星星点击目标）
        if (battleEngine && monsters.length > 0) {
            battleEngine.replaceMonster(monsters[0]);
            // 统一攻击系统：清空旧攻击者，注册所有分裂怪物
            battleEngine.clearAttackers();
            for (var ai = 0; ai < monsters.length; ai++) {
                battleEngine.addAttacker(monsters[ai], monsters[ai].attackInterval);
            }
        }

        if (addMonsterSkillAnimation) addMonsterSkillAnimation(getMonster(), 'split', '分裂成' + splitCount + '只' + (splitMonsterType ? splitMonsterType.name : '小怪') + '!');
        addMessage('👾 分裂成' + splitCount + '只' + (splitMonsterType ? splitMonsterType.name : '小怪') + '!', '#ff6b6b');
        vibrateShort({ type: 'heavy' });
    }

    function triggerDeathPoison() {
        var deathPoisonSkill = findBossSkill('poison_split');
        if (!deathPoisonSkill) return;

        var pd = getPlayerData();
        var deathDmg = deathPoisonSkill.damage || 20;
        if (pd.playerShield > 0) {
            var sa = Math.min(pd.playerShield, deathDmg);
            pd.playerShield -= sa;
            deathDmg -= sa;
        }
        pd.playerHp = Math.max(0, pd.playerHp - deathDmg);
        setPlayerPoisoned(true);
        setPlayerPoisonEndTime(Date.now() + (deathPoisonSkill.poisonDuration || 5) * 1000);
        setPlayerPoisonDamage(deathPoisonSkill.poisonDamage || 8);
        setPlayerPoisonTickTime(Date.now() + 1000);

        var instantKill = !hasPoisonSplit;
        var deathSkill = Object.assign({}, deathPoisonSkill);
        if (instantKill) {
            deathSkill.puddleCount = 6;
            addMessage('☠️ 史莱姆王被秒杀! 毒液爆发!', '#00ff00', true);
        } else {
            addMessage('☠️ 史莱姆王临死反扑! 毒液飞溅!', '#00ff00', true);
        }
        spawnPoisonPuddles(getScreenWidth() / 2, getScreenHeight() / 3, deathSkill);
    }

    function findBossSkill(type) {
        if (!currentBoss || !currentBoss.skills) return null;
        for (var i = 0; i < currentBoss.skills.length; i++) {
            if (currentBoss.skills[i].type === type) return currentBoss.skills[i];
        }
        return null;
    }

    // ═══ 分裂后伤害处理（不走 BattleEngine） ═══

    function dealDamageSplitMode(damage) {
        var monsters = getMonsters();
        var target = null;
        var targetIndex = -1;
        for (var ti = 0; ti < monsters.length; ti++) {
            if (monsters[ti].hp > 0) {
                target = monsters[ti];
                targetIndex = ti;
                break;
            }
        }
        if (!target) {
            var recheck = getMonsters();
            var hasAlive = false;
            for (var ri = 0; ri < recheck.length; ri++) {
                if (recheck[ri].hp > 0) { hasAlive = true; break; }
            }
            if (!hasAlive) {
                // 不直接 end(true)，等 pending 延迟结算
                return;
            }
            return;
        }

        Logger.info('[BossAdapter] split mode, hit monster[' + targetIndex + '] hp:' + target.hp + ' damage:' + damage);
        target.hp -= damage;
        if (target.hp <= 0) {
            target.hp = 0;
            var aliveMonsters = [];
            var currentMonsters = getMonsters();
            for (var ai = 0; ai < currentMonsters.length; ai++) {
                if (currentMonsters[ai].hp > 0) aliveMonsters.push(currentMonsters[ai]);
            }
            setMonsters(aliveMonsters);
            if (aliveMonsters.length === 0) {
                if (currentBoss.id === 'slime_king' && spawnPoisonPuddles) {
                    triggerDeathPoison();
                }
                // 不直接 end(true)，等 pending 延迟结算
            } else {
                // 切换星星点击目标（不重启单怪物定时器，用多攻击者系统）
                if (battleEngine) battleEngine.setTargetMonster(aliveMonsters[0]);
            }
        }
    }

    // ═══ 奖励计算 ═══

    function calculateRewards(success) {
        var rewards = { gold: 0, starSource: 0, materials: {}, equipment: null, skill: null };
        if (!success || !currentBoss) return rewards;

        var playerData = getPlayerData();
        var bossRewards = currentBoss.rewards;

        if (bossRewards.gold) {
            rewards.gold = bossRewards.gold[0] + Math.floor(Math.random() * (bossRewards.gold[1] - bossRewards.gold[0]));
            playerData.gold += rewards.gold;
        }
        if (bossRewards.starSource) {
            rewards.starSource = bossRewards.starSource[0] + Math.floor(Math.random() * (bossRewards.starSource[1] - bossRewards.starSource[0]));
            playerData.starSource = (playerData.starSource || 0) + rewards.starSource;
        }
        if (bossRewards.materials && Math.random() < bossRewards.materialChance) {
            var matId = bossRewards.materials[Math.floor(Math.random() * bossRewards.materials.length)];
            if (!playerData.materials[matId]) playerData.materials[matId] = { quantity: 0, usedCount: 0 };
            playerData.materials[matId].quantity += 1;
            rewards.materials[matId] = 1;
        }
        if (bossRewards.equipment && Math.random() < bossRewards.equipmentChance) {
            rewards.equipment = bossRewards.equipment[Math.floor(Math.random() * bossRewards.equipment.length)];
            if (!playerData.equipments) playerData.equipments = {};
            if (!playerData.equipments.owned) playerData.equipments.owned = [];
            if (playerData.equipments.owned.indexOf(rewards.equipment) === -1) {
                playerData.equipments.owned.push(rewards.equipment);
            }
        }
        if (bossRewards.skill && Math.random() < bossRewards.skillChance) {
            rewards.skill = bossRewards.skill;
            if (!playerData.skills) playerData.skills = {};
            if (!playerData.skills.owned) playerData.skills.owned = [];
            var alreadyHasSkill = playerData.skills.owned.some(function(s) { return (typeof s === 'string' ? s : s.id) === rewards.skill; });
                if (!alreadyHasSkill) {
                    playerData.skills.owned.push({ uid: 'skill_' + Date.now() + '_' + Math.floor(Math.random() * 10000), id: rewards.skill, level: 1 });
                }
        }

        saveData();
        return rewards;
    }

    // ═══ 星星基础分数 ═══

    function getStarBaseScore(type) {
        switch (type) {
            case 'ice': return 3;
            case 'fire': return 4;
            case 'thunder': return 3;
            case 'holy': return 5;
            case 'dark': return 4;
            case 'wind': return 2;
            case 'earth': return 2;
            case 'light': return 3;
            case 'shadow': return 3;
            case 'rainbow': return 6;
            case 'gold': return 5;
            case 'crystal': return 4;
            case 'meteor': return 5;
            case 'cosmic': return 7;
            case 'time': return 2;
            default: return 1;
        }
    }

    // ═══ 公共 API ═══

    function init(level) {
        // 清理全局定时器
        clearTimerInterval();
        clearMoveInterval();
        clearMonsterAttackInterval();

        var BOSS_LIST = getBOSS_LIST();
        var BOSS_BATTLE_CONFIG = getBOSS_BATTLE_CONFIG();

        // 根据等级选择 Boss
        var boss = null;
        for (var i = BOSS_LIST.length - 1; i >= 0; i--) {
            if (BOSS_LIST[i].level <= level) { boss = BOSS_LIST[i]; break; }
        }
        if (!boss) boss = BOSS_LIST[0];

        currentBoss = boss;
        currentBoss._hasPoisonSplit = false;
        currentBoss._hasSplit = false;
        bossHp = boss.hp;
        bossMaxHp = boss.hp;
        maxCombo = 0;
        isPaused = false;
        result = null;
        rewardsObtained = null;
        bossLevel = level;
        hasSplit = false;
        hasPoisonSplit = false;
        splitMonsters = [];
        engineActive = false;

        // 重置全局状态
        setScore(0);
        setTimeLeft(BOSS_BATTLE_CONFIG.baseTime);
        resetCombo();
        setLastComboTime(0);
        setStars([]);
        setMonstersKilled(0);
        clearMessages();
        setComboStarActive(false);
        setComboStarStartTime(0);
        setPlayerDodging(false);
        setPlayerDodgeEndTime(0);
        setPlayerStunned(false);
        setPlayerStunEndTime(0);

        var playerData = getPlayerData();
        playerData.playerRage = 0;
        playerData.tempAttackBonus = 0;

        if (deps.setGreedyHpPool) deps.setGreedyHpPool(0);
        if (deps.setGreedySkillUnlocked) deps.setGreedySkillUnlocked(false);
        playerData.playerShield = 0;

        // 重置玩家血量
        var charStats = getCharacterFullStats(playerData.currentCharacterId);
        playerData.maxPlayerHp = charStats ? charStats.hp : 100;
        playerData.playerHp = playerData.maxPlayerHp;

        // 创建 Boss 怪物
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        setMonsters([]);
        var bossMonster = createMonster(boss.id, sw / 2, sh / 3, {
            maxHp: boss.hp, hp: boss.hp,
            size: Math.floor(80 * getScreenScale()),
            attack: boss.attack || 20,
            skills: boss.skills || [],
            attackInterval: boss.attackInterval || 1500
        });
        var mons = getMonsters();
        mons.push(bossMonster);
        setMonsters(mons);

        // 初始化道具
        var gameItems = getGameItems();
        var MAX_GAME_ITEMS = getMAX_GAME_ITEMS();
        gameItems.healPotion = Math.min(
            playerData.items && playerData.items.healPotion ? playerData.items.healPotion.quantity : 0,
            MAX_GAME_ITEMS
        );
        gameItems.timePotion = Math.min(
            playerData.items && playerData.items.timePotion ? playerData.items.timePotion.quantity : 0,
            MAX_GAME_ITEMS
        );
        var adItems = getAdItems();
        adItems.healPotion = 0;
        adItems.timePotion = 0;

        // 技能冷却重置
        var skillSys = getSkillSystem();
        if (skillSys) skillSys.resetSystem();

        // 创建并初始化 BattleEngine
        if (battleEngine) battleEngine.destroy();
        battleEngine = createBattleEngine(buildEngineDeps());

        var bossInitConfig = {
            monster: bossMonster,
            playerHp: playerData.playerHp,
            playerMaxHp: playerData.maxPlayerHp,
            playerShield: 0,
            playerStats: charStats,
            playerSkills: playerData.skills ? playerData.skills.equipped : [],
            activePet: playerData.activePet || null,
            mode: 'boss',
            floor: level,
            combatOverrides: BOSS_COMBAT_OVERRIDES,
            features: BOSS_COMBAT_FEATURES,
            timeLimit: BOSS_BATTLE_CONFIG.baseTime,
            timeDamageOnHit: 8,
            bossStunChance: getBOSS_STUN_CHANCE(),
            bossStunDuration: getBOSS_STUN_DURATION(),
            onDamageDealt: onDamageDealtHandler,
            onBeforeMonsterDeath: onBeforeMonsterDeathHandler,
            onMonsterDeath: onMonsterDeathHandler,
            onPlayerDeath: onPlayerDeathHandler,
            onTimeUp: onTimeUpHandler,
            extensions: {
                splitEnabled: true,
                poisonPuddles: true,
                onBattleUpdate: function(ctx) {
                    if (!engineActive || isPaused) return;
                },
                onBattleEnd: function(ctx) {
                    Logger.info('[BossAdapter] extension onBattleEnd:', ctx.reason);
                }
            },
            getBlockedPositionsFn: function() {
                var allStars = getStars();
                var blocked = [];
                for (var i = 0; i < allStars.length; i++) {
                    var s = allStars[i];
                    if (s.visible && !s._engineStar) {
                        blocked.push({ x: s.x, y: s.y });
                    }
                }
                return blocked;
            }
        };

        // 通过 NormalBattleAdapter 统一点击路径
        if (initBossEngineFn) {
            initBossEngineFn(battleEngine, bossInitConfig, function(m, dmg) {
                bossBattleSystem.applyBossSkills(dmg, m);
            });
        } else {
            battleEngine.init(bossInitConfig);
        }

        Logger.info('BossAdapter 初始化:', boss.name, 'HP:', boss.hp);
        return true;
    }

    function start() {
        setGameState(GAME_STATE.BOSS_BATTLE);
        engineActive = true;

        // 启动 StarSystem 星星生成（统一星星机制和动画）
        if (updateStarSpawnIntervalFn) updateStarSpawnIntervalFn();

        Logger.info('BossAdapter 开始! 目标:', currentBoss.name);
    }

    function end(success) {
        // 分裂后安全检查
        if (success && hasSplit) {
            var currentMonsters = getMonsters();
            var aliveCount = 0;
            for (var i = 0; i < currentMonsters.length; i++) {
                if (currentMonsters[i].hp > 0) aliveCount++;
            }
            if (aliveCount > 0) {
                Logger.info('[BossAdapter] end(true) blocked! ' + aliveCount + ' monsters still alive');
                return;
            }
        }

        // 停止 BattleEngine
        if (battleEngine) {
            battleEngine.destroy();
            battleEngine = null;
        }
        engineActive = false;

        // 释放 NormalBattleAdapter 引擎引用
        if (releaseBossEngineFn) releaseBossEngineFn();

        // 停止全局定时器
        clearTimerInterval();
        clearMoveInterval();
        clearMonsterAttackInterval();
        stopDodgeStarTimer();

        rewardsObtained = calculateRewards(success);
        result = {
            success: success,
            score: getScore(),
            time: getTimeLeft(),
            maxCombo: maxCombo,
            bossName: currentBoss ? currentBoss.name : ''
        };

        setGameState(GAME_STATE.BOSS_BATTLE_RESULT);
        Logger.info('BossAdapter 战斗结束! 成功:', success);
    }

    function cleanup() {
        if (battleEngine) {
            battleEngine.destroy();
            battleEngine = null;
        }
        engineActive = false;

        // 释放 NormalBattleAdapter 引擎引用
        if (releaseBossEngineFn) releaseBossEngineFn();

        clearTimerInterval();
        clearMoveInterval();
        clearMonsterAttackInterval();
        stopDodgeStarTimer();

        currentBoss = null;
        bossHp = 0;
        bossMaxHp = 0;
        maxCombo = 0;
        isPaused = false;
        result = null;
        rewardsObtained = null;
        hasSplit = false;
        hasPoisonSplit = false;
        splitMonsters = [];

        setScore(0);
        setTimeLeft(60);
        setComboCount(0);
        setStars([]);
        setMonstersKilled(0);
        setMonsters([]);

        if (deps.clearPoisonPuddles) deps.clearPoisonPuddles();
        setPlayerPoisoned(false);
        setPlayerPoisonEndTime(0);
        setPlayerPoisonDamage(0);
        setPlayerPoisonTickTime(0);

        Logger.info('BossAdapter 状态已清理');
    }

    /**
     * 每帧调用：更新 BattleEngine + 同步状态到 game.js
     */
    function update() {
        if (!engineActive || isPaused || !battleEngine) return;

        battleEngine.update();

        // battleEngine.update() 可能同步触发回调链导致 battleEngine 被 destroy
        if (!battleEngine) return;

        var S = battleEngine.getState();

        // BattleEngine 内部触发了战斗结束（回调已处理）
        if (S.phase === 'finished') {
            if (S.finishReason === 'monsterDeath') {
                if (hasSplit) {
                    // 分裂后小怪死亡：检查剩余存活怪物
                    var currentMonsters = getMonsters();
                    var aliveMonsters = [];
                    for (var ai = 0; ai < currentMonsters.length; ai++) {
                        if (currentMonsters[ai].hp > 0) aliveMonsters.push(currentMonsters[ai]);
                    }
                    if (aliveMonsters.length === 0) {
                        if (currentBoss.id === 'slime_king' && spawnPoisonPuddles) {
                            triggerDeathPoison();
                        }
                        setMonsters([]);
                        engineActive = false;
                        end(true);
                    } else {
                        setMonsters(aliveMonsters);
                        battleEngine.replaceMonster(aliveMonsters[0]);
                    }
                }
                // 非分裂：onMonsterDeath 回调已处理
            } else if (S.finishReason === 'playerDeath' || S.finishReason === 'timeUp') {
                engineActive = false;
                end(false);
            }
            return;
        }

        // 同步状态到 game.js
        var pd = getPlayerData();
        pd.playerHp = S.playerHp;
        pd.playerShield = S.playerShield;
        setTimeLeft(S.timeLeft);

        // 同步状态效果
        setPlayerStunned(S.isStunned);
        setPlayerStunEndTime(S.stunEndTime);
        setPlayerPoisoned(S.isPoisoned);
        setPlayerPoisonEndTime(S.poisonEndTime);
        setPlayerPoisonDamage(S.poisonDamage);
        setPlayerPoisonTickTime(S.poisonTickTime);
        setPlayerDodging(S.dodging);
        setPlayerDodgeEndTime(S.dodgeEndTime);

        // 同步怪物状态
        if (!hasSplit && S.monster) {
            bossHp = S.monster.hp;
            var mons = getMonsters();
            if (mons.length > 0) mons[0] = S.monster;
        }

        // 星星由 StarSystem 统一管理，不再从 BattleEngine 同步

        // 更新最大连击
        var cc = getComboCount();
        if (cc > maxCombo) maxCombo = cc;

        // 同步怪物击杀数（用于显示）
        if (S.monster && S.monster.hp <= 0) {
            setMonstersKilled(1);
        }
    }

    /**
     * 星星点击 → 走 BattleEngine
     */
    function handleStarClick(x, y) {
        if (!battleEngine || !engineActive) return false;
        return battleEngine.handleStarClick(x, y);
    }

    /**
     * 外部伤害入口（时间星星技能、贪婪、怒气等）
     * 游戏内处理完特殊逻辑后调用此方法
     */
    function dealDamage(damage) {
        if (!currentBoss) return;

        if (hasSplit) {
            dealDamageSplitMode(damage);
            return;
        }

        // 通过 BattleEngine 怪物扣血
        if (battleEngine && engineActive) {
            var S = battleEngine.getState();
            if (S.monster && S.monster.hp > 0) {
                S.monster.hp -= damage;
                safeCall(onDamageDealtHandler, { monster: S.monster, damage: damage });
                if (S.monster.hp <= 0) {
                    battleEngine.addPendingDeath(S.monster);
                }
            }
        } else {
            // BattleEngine 不活跃时直接扣 bossHp
            bossHp -= damage;
            if (bossHp <= 0) {
                bossHp = 0;
                if (currentBoss.id === 'slime_king' && spawnPoisonPuddles) {
                    triggerDeathPoison();
                }
                engineActive = false;
                end(true);
            }
        }
    }

    function togglePause() {
        isPaused = !isPaused;

        if (isPaused) {
            setPauseStartTime(Date.now());
            if (battleEngine) battleEngine.pause();
            clearMoveInterval();
            stopDodgeStarTimer();
            stopPetAttackTimer();
            saveDataImmediate();
        } else {
            if (battleEngine) battleEngine.resume();

            // 补偿 game.js 星星的消失时间（与普通模式 resumeGame 对齐）
            if (getPauseStartTime() > 0) {
                var pauseDuration = Date.now() - getPauseStartTime();
                var starsArr = getStars();
                for (var i = 0; i < starsArr.length; i++) {
                    if (starsArr[i].disappearTime) {
                        starsArr[i].disappearTime += pauseDuration;
                    }
                    if (starsArr[i].createTime) {
                        starsArr[i].createTime += pauseDuration;
                    }
                }
                setPauseStartTime(0);
            }

            // 补偿连击时间
            if (getComboCount() > 0) {
                setLastComboTime(Date.now());
            }

            // 重启星生成
            if (updateStarSpawnIntervalFn) updateStarSpawnIntervalFn();

            // 重启闪避星 + 宠物攻击
            startDodgeStarTimer();
            startPetAttackTimer();
        }
    }

    function useSkill(skillId) {
        if (!battleEngine || !engineActive) return false;
        return battleEngine.useSkill(skillId);
    }

    // ═══ Getters ═══

    function getCurrentBoss() { return currentBoss; }
    function getBossHp() {
        if (hasSplit) {
            var monsters = getMonsters();
            for (var i = 0; i < monsters.length; i++) {
                if (monsters[i].hp > 0) return monsters[i].hp;
            }
            return 0;
        }
        return battleEngine ? battleEngine.getState().monster.hp : bossHp;
    }
    function setBossHp(val) { bossHp = val; }
    function getBossMaxHp() {
        if (hasSplit) {
            var monsters = getMonsters();
            for (var i = 0; i < monsters.length; i++) {
                if (monsters[i].hp > 0) return monsters[i].maxHp;
            }
        }
        return bossMaxHp;
    }
    function getMaxCombo() { return maxCombo; }
    function getIsPaused() { return isPaused; }
    function getResult() { return result; }
    function getRewardsObtained() { return rewardsObtained; }
    function getBossLevel() { return bossLevel; }
    function getBattleEngine() { return battleEngine; }

    function updateMaxCombo() {
        var cc = getComboCount();
        if (cc > maxCombo) maxCombo = cc;
    }

    return {
        init: init,
        start: start,
        end: end,
        cleanup: cleanup,
        update: update,
        handleStarClick: handleStarClick,
        dealDamage: dealDamage,
        attackBoss: dealDamage,
        togglePause: togglePause,
        useSkill: useSkill,
        calculateRewards: calculateRewards,
        getStarBaseScore: getStarBaseScore,
        updateMaxCombo: updateMaxCombo,
        // Getters
        getCurrentBoss: getCurrentBoss,
        getBossHp: getBossHp,
        setBossHp: setBossHp,
        getBossMaxHp: getBossMaxHp,
        getMaxCombo: getMaxCombo,
        getIsPaused: getIsPaused,
        getResult: getResult,
        getRewardsObtained: getRewardsObtained,
        getBossLevel: getBossLevel,
        getBattleEngine: getBattleEngine
    };
}

export { createBossBattleAdapter };
