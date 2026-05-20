import Logger from '../utils/Logger.js';
/**
 * 怪物生成系统（Monster Spawn System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 *
 * 包含：怪物实例创建、类型选择、生成逻辑、位置计算、角色解锁检查
 * 不包含：怪物渲染（drawSingleMonster 暂留 game.js）、怪物战斗逻辑（暂留 game.js）
 */

function createMonsterSpawnSystem(deps) {
    // 依赖注入
    var getMonsters = deps.getMonsters;
    var setMonsters = deps.setMonsters;
    var getScore = deps.getScore;
    var getBestScore = deps.getBestScore;
    var getPlayerData = deps.getPlayerData;
    var getGameState = deps.getGameState;
    var getGameConst = deps.getGameConst;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getConfig = deps.getConfig;
    var getMonsterTypes = deps.getMonsterTypes;
    var getMonstersConfig = deps.getMonstersConfig;
    var getMonsterGrowth = deps.getMonsterGrowth;
    var getMonsterRarityWeights = deps.getMonsterRarityWeights;
    var getMonstersKilled = deps.getMonstersKilled;
    var getStarThief = deps.getStarThief;
    var getMonsterSkillType = deps.getMonsterSkillType;
    var getMonsterAbsorbScore = deps.getMonsterAbsorbScore;
    var getStarDevourerEscaped = deps.getStarDevourerEscaped;
    var setStarDevourerEscaped = deps.setStarDevourerEscaped;
    var getVoidEmperorSpawned = deps.getVoidEmperorSpawned;
    var setVoidEmperorSpawned = deps.setVoidEmperorSpawned;
    var getMonsterAttackInterval = deps.getMonsterAttackInterval;
    var setMonsterAttackInterval = deps.setMonsterAttackInterval;
    var monsterAttackPlayerFn = deps.monsterAttackPlayer;
    var initCharacterExp = deps.initCharacterExp;
    var saveData = deps.saveData;
    var showToast = deps.showToast;
    var showTipOnce = deps.showTipOnce;
    var getSeasonScore = deps.getSeasonScore || function() { return 0; };

    // 普通战斗适配器
    var getNormalBattleAdapter = deps.getNormalBattleAdapter;

    // ═══ 觉醒系统 ═══
    var getAwakeHpScale = deps.getPlayerHpScaling;
    var getAwakeAtkScale = deps.getPlayerAtkScaling;
    var getAwakeStages = deps.getAwakeStage;
    var getAwakeConfig = deps.getAwakeConfig;

    // ==================== 内部方法 ====================

    /**
     * 获取怪物实例（根据层数计算属性）
     */
    function getMonsterInstance(monsterId, level) {
        level = level || 1;
        var base = getMonstersConfig()[monsterId];
        if (!base) {
            console.error('怪物不存在:', monsterId);
            return null;
        }

        var MonsterGrowth = getMonsterGrowth();
        var levelMultiplier = Math.pow(MonsterGrowth.hpPerLevel, level - 1);
        var attackMultiplier = Math.pow(MonsterGrowth.attackPerLevel, level - 1);
        var defenseMultiplier = Math.pow(MonsterGrowth.defensePerLevel, level - 1);

        return {
            id: base.id,
            name: base.name,
            emoji: base.emoji,
            hp: Math.floor(base.baseHp * levelMultiplier),
            maxHp: Math.floor(base.baseHp * levelMultiplier),
            attack: Math.floor(base.baseAttack * attackMultiplier),
            defense: Math.floor(base.baseDefense * defenseMultiplier),
            level: level,
            skillStates: {},
            shield: 0,
            hasRaged: false
        };
    }

    /**
     * 根据分数获取可用怪物列表
     */
    function getAvailableMonsters(score) {
        var MonstersConfig = getMonstersConfig();
        return Object.keys(MonstersConfig).filter(function(id) {
            var m = MonstersConfig[id];
            // 排除Boss和偷星者（偷星者只能通过shouldReplace触发）
            return !m.mechanics.isBoss && !m.isStarThief && m.unlockScore <= score;
        });
    }

    /**
     * 根据分数获取可用Boss列表
     */
    function getAvailableBosses(score) {
        var MonstersConfig = getMonstersConfig();
        return Object.keys(MonstersConfig).filter(function(id) {
            var m = MonstersConfig[id];
            return m.mechanics.isBoss && m.unlockScore <= score;
        });
    }

    /**
     * 随机选择怪物（按稀有度权重）
     */
    function getRandomMonster(score) {
        var available = getAvailableMonsters(score);
        if (available.length === 0) return 'slime';

        var MonstersConfig = getMonstersConfig();
        var MonsterRarityWeights = getMonsterRarityWeights();

        var weighted = available.map(function(id) {
            return {
                id: id,
                weight: MonsterRarityWeights[MonstersConfig[id].rarity] || 1
            };
        });

        var totalWeight = weighted.reduce(function(sum, m) { return sum + m.weight; }, 0);
        var random = Math.random() * totalWeight;

        for (let i = 0; i < weighted.length; i++) {
            random -= weighted[i].weight;
            if (random <= 0) return weighted[i].id;
        }

        return weighted[0].id;
    }

    /**
     * 根据分数获取普通怪物类型
     */
    function getMonsterTypeByScore(score) {
        if (score < 300) return 'slime';
        if (score < 600) return Math.random() < 0.5 ? 'slime' : 'goblin';
        if (score < 1000) return Math.random() < 0.4 ? 'slime' : (Math.random() < 0.5 ? 'goblin' : 'wolf');
        if (score < 1500) return Math.random() < 0.3 ? 'goblin' : (Math.random() < 0.5 ? 'wolf' : 'skeleton');
        return Math.random() < 0.2 ? 'wolf' : (Math.random() < 0.5 ? 'skeleton' : 'demon');
    }

    /**
     * 根据分数获取Boss类型
     */
    function getBossTypeByScore(score) {
        var starDevourerEscaped = getStarDevourerEscaped();
        var voidEmperorSpawned = getVoidEmperorSpawned();

        if (score < 500) return 'slime_king';  // 史莱姆王
        if (score < 1000) return Math.random() < 0.5 ? 'slime_king' : 'goblin_king';
        if (score < 1400) return Math.random() < 0.4 ? 'goblin_king' : (Math.random() < 0.5 ? 'flame_lord' : 'ice_queen');
        if (score < 2000) {
            var roll = Math.random();
            // 灵脉吞噬者 15%
            if (roll < 0.15 && !starDevourerEscaped) return 'star_devourer';
            // 灵脉邪灵 5%（必须在灵脉吞噬者判断之后独立判断）
            if (!voidEmperorSpawned && roll >= 0.15 && roll < 0.20) {
                setVoidEmperorSpawned(true);
                return 'void_emperor';
            }
            return roll < 0.525 ? 'flame_lord' : 'ice_queen';
        }
        // 2000分以上
        var roll2 = Math.random();
        // 灵脉吞噬者 20%
        if (roll2 < 0.2 && !starDevourerEscaped) return 'star_devourer';
        // 灵脉邪灵 5%
        if (!voidEmperorSpawned && roll2 >= 0.2 && roll2 < 0.25) {
            setVoidEmperorSpawned(true);
            return 'void_emperor';
        }
        return roll2 < 0.525 ? 'ice_queen' : 'flame_lord';
    }

    /**
     * 创建怪物对象
     */
    function createMonster(type, x, y, options) {
        options = options || {};
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();

        var result = {
            id: Date.now() + Math.random(),
            active: true,
            x: x || screenWidth / 2,
            y: y || screenHeight / 3,
            size: 60,
            hp: 0,
            maxHp: 0,
            type: type,
            scale: 1,
            animationFrame: 0,
            lastIceAttackTime: 0,
            lastFireAttackTime: 0,
            comboCooldown: 0,
            armor: 0,
            hpBonus: 0,
            damageBonus: 0,
            empowered: false,
            empowerType: null,
            absorbType: null,
            skills: [],
            skillStates: {},
            shield: 0,
            hasRaged: false,
            hasSplit: false,
            birthTime: Date.now(),
            attack: 10,
            attackInterval: 2000,
            rageMultiplier: 1,
            splitFrom: null
        };

        // 合并 options
        var keys = Object.keys(options);
        for (let i = 0; i < keys.length; i++) {
            result[keys[i]] = options[keys[i]];
        }

        return result;
    }

    /**
     * 计算多怪物位置
     */
    function calculateMonsterPositions(count, baseY) {
        var screenWidth = getScreenWidth();
        var positions = [];
        var baseX = screenWidth / 2;
        var spacing = 100;

        if (count === 1) {
            positions.push({ x: baseX, y: baseY });
        } else if (count === 2) {
            positions.push({ x: baseX - spacing / 2, y: baseY });
            positions.push({ x: baseX + spacing / 2, y: baseY });
        } else if (count === 3) {
            positions.push({ x: baseX, y: baseY - 30 });
            positions.push({ x: baseX - spacing, y: baseY + 20 });
            positions.push({ x: baseX + spacing, y: baseY + 20 });
        } else {
            var startX = baseX - (spacing * (count - 1)) / 2;
            for (let i = 0; i < count; i++) {
                positions.push({ x: startX + spacing * i, y: baseY });
            }
        }

        return positions;
    }

    /**
     * 检查是否解锁新角色
     */
    function checkUnlockCharacter() {
        var score = getScore();
        var playerData = getPlayerData();
        var CONFIG = getConfig();

        // 玉蝉仙：达到50分解锁
        var starUnlockScore = CONFIG.starUnlockScore;
        var starUnlockCharId = 'char_001';

        if (playerData.ownedCharacters.indexOf(starUnlockCharId) === -1) {
            if (score >= starUnlockScore) {
                playerData.ownedCharacters.push(starUnlockCharId);
                initCharacterExp(starUnlockCharId);
                if (showTipOnce) showTipOnce('unlock_char_001', '获得新角色玉蝉仙！去背包出战吧');
                Logger.info('解锁新角色:', starUnlockCharId, '当前仍使用:', playerData.currentCharacterId);
                saveData();
            }
        }

        // 鼎魂：达到200分解锁
        var warriorUnlockScore = CONFIG.warriorUnlockScore;
        var warriorUnlockCharId = 'char_002';

        if (playerData.ownedCharacters.indexOf(warriorUnlockCharId) === -1) {
            if (score >= warriorUnlockScore) {
                playerData.ownedCharacters.push(warriorUnlockCharId);
                initCharacterExp(warriorUnlockCharId);
                if (showTipOnce) showTipOnce('unlock_char_002', '获得新角色鼎魂！去背包出战吧');
                Logger.info('解锁新角色:', warriorUnlockCharId, '当前仍使用:', playerData.currentCharacterId);
                saveData();
            }
        }
    }

    /**
     * 检查是否出现怪物
     */
    function checkMonsterAppear() {
        var state = getGameState();
        var GAME_STATE = getGameConst();

        if (state === GAME_STATE.STAGE_PLAYING) {
            return;
        }

        checkUnlockCharacter();

        var monsters = getMonsters();
        var activeMonsters = monsters.filter(function(m) { return m.active; });
        if (activeMonsters.length > 0) {
            return;
        }

        var isSeason = (state === GAME_STATE.SEASON_PLAYING);
        var score = isSeason ? getSeasonScore() : getScore();
        var bestScore = getBestScore();
        var playerData = getPlayerData();
        var CONFIG = getConfig();

        if (score >= CONFIG.monsterAppearScore || bestScore >= CONFIG.monsterAppearScore) {
            var requiredKills = (bestScore >= 2000) ? 30 : 8;
            if (playerData.bossKillCount >= requiredKills) {
                spawnMonster('boss');
            } else {
                spawnMonster('slime');
            }
        }
    }

    /**
     * 生成怪物（支持多怪物）
     */
    function spawnMonster(type, options) {
        options = options || {};
        var score = getScore();
        var playerData = getPlayerData();
        var screenHeight = getScreenHeight();
        var MonsterTypes = getMonsterTypes();
        var MonsterSkillType = getMonsterSkillType();
        var MONSTER_ABSORB_SCORE = getMonsterAbsorbScore();
        var starThief = getStarThief();

        // 根据分数动态选择怪物类型（使用稀有度权重系统）
        var actualType = type;
        if (type === 'slime') {
            actualType = getRandomMonster(score);
        } else if (type === 'boss') {
            actualType = getBossTypeByScore(score);
        }

        // 偷星者：5%概率替换Boss怪物（不替换小怪）
        var monstersKilled = getMonstersKilled();
        var monsterTypePreview = MonsterTypes[actualType];
        var isActualBoss = (monsterTypePreview && monsterTypePreview.isBoss) || actualType === 'boss';
        if (starThief && isActualBoss && starThief.shouldReplace(actualType, monstersKilled)) {
            actualType = 'star_thief';
        }

        var monsterType = MonsterTypes[actualType];
        if (!monsterType) {
            Logger.info('未知怪物类型:', actualType);
            return null;
        }

        // 2000分后怪物增强
        var isEnhanced = score >= 2000;
        var rarity = monsterType.rarity || 'N';
        var isBoss = monsterType.isBoss || false;

        // 计算HP（使用统一成长公式）
        var killCount = playerData.bossKillCount || 0;
        var levelMultiplier = Math.pow(1.15, killCount);

        var maxHp;
        if (isBoss) {
            maxHp = monsterType.baseHp;
            if (isEnhanced) {
                maxHp = Math.floor(maxHp * 2);
            }
        } else {
            maxHp = Math.floor(monsterType.baseHp * levelMultiplier);
            if (isEnhanced) {
                maxHp = Math.floor(maxHp * 1.5);
            }
        }

        if (isNaN(maxHp) || maxHp <= 0) {
            maxHp = 50;
        }

        // 觉醒系统：基于玩家等级的怪物缩放（仅普通模式）
        var awakeHpScale = 1;
        var awakeAtkScale = 1;
        var awakeAbilities = [];
        var state = getGameState();
        var GAME_STATE = getGameConst();
        if (state === GAME_STATE.PLAYING && getAwakeHpScale && getAwakeAtkScale) {
            awakeHpScale = getAwakeHpScale(playerData);
            awakeAtkScale = getAwakeAtkScale(playerData);
            if (awakeHpScale > 1) {
                maxHp = Math.floor(maxHp * awakeHpScale);
                if (getAwakeStages) {
                    awakeAbilities = getAwakeStages(playerData);
                }
            }
        }

        // 计算位置
        var monsters = getMonsters();
        var activeMonsters = monsters.filter(function(m) { return m.active; });
        var totalAfterSpawn = activeMonsters.length + 1;
        var positions = calculateMonsterPositions(totalAfterSpawn, screenHeight / 3);

        // 重新布局所有怪物的位置
        for (let i = 0; i < activeMonsters.length; i++) {
            if (positions[i]) {
                activeMonsters[i].x = positions[i].x;
                activeMonsters[i].y = positions[i].y;
            }
        }

        // 新怪物的位置
        var newPosition = positions[positions.length - 1];
        var x = options.x || newPosition.x;
        var y = options.y || newPosition.y;

        // 创建新怪物对象
        var monsterAttack = monsterType.attack || 10;
        if (awakeAtkScale > 1) {
            monsterAttack = Math.floor(monsterAttack * awakeAtkScale);
        }
        var newMonster = createMonster(actualType, x, y, {
            maxHp: maxHp,
            hp: maxHp,
            attack: monsterAttack,
            attackInterval: monsterType.attackInterval || 2000,
            skills: monsterType.skills || [],
            skillStates: {}
        });

        // 觉醒能力附加
        if (awakeAbilities.length > 0) {
            newMonster.awakeAbilities = awakeAbilities;
            for (var ai = 0; ai < awakeAbilities.length; ai++) {
                var ab = awakeAbilities[ai];
                if (ab.effect === 'armor') newMonster.awakeArmor = ab.value;
                else if (ab.effect === 'dodge') newMonster.awakeDodge = ab.value;
                else if (ab.effect === 'resist') newMonster.awakeResist = ab.value;
                else if (ab.effect === 'rage') newMonster.awakeRage = ab.value;
            }
            Logger.info('觉醒能力:', awakeAbilities.map(function(a) { return a.mark; }).join(''), 'HP缩放:', awakeHpScale.toFixed(1), 'ATK缩放:', awakeAtkScale.toFixed(1));
        }

        // 2000分后，怪物根据技能配置获得吸收能力
        if (monsterType.skills) {
            var absorbSkill = null;
            for (let si = 0; si < monsterType.skills.length; si++) {
                if (monsterType.skills[si].type === MonsterSkillType.ABSORB) {
                    absorbSkill = monsterType.skills[si];
                    break;
                }
            }
            if (absorbSkill && (isBoss || score >= MONSTER_ABSORB_SCORE)) {
                newMonster.absorbType = absorbSkill.starType;
                newMonster.absorbRatio = absorbSkill.ratio;
                newMonster.healRate = absorbSkill.healRate;
                Logger.info('怪物获得吸收能力:', newMonster.absorbType, '比例:', newMonster.absorbRatio);
            }
        }

        // 添加到数组
        monsters.push(newMonster);
        setMonsters(monsters);

        // 注册到普通战斗适配器（多攻击者系统）
        if (getNormalBattleAdapter && getNormalBattleAdapter() && getNormalBattleAdapter().isActive()) {
            getNormalBattleAdapter().addMonster(newMonster);
        }

        // 偷星者特殊初始化
        if (monsterType.isStarThief && starThief) {
            starThief.initOnSpawn(newMonster, screenHeight);
        }

        // Boss 攻击间隔调整
        if (isBoss) {
            var monsterAttackInterval = getMonsterAttackInterval();
            if (monsterAttackInterval) clearInterval(monsterAttackInterval);
            var newInterval = setInterval(function() {
                monsterAttackPlayerFn();
            }, newMonster.attackInterval);
            setMonsterAttackInterval(newInterval);
            Logger.info('Boss 攻击间隔:', newMonster.attackInterval, 'ms');
        }

        // 显示怪物信息
        var rarityText = rarity !== 'N' ? '[' + rarity + '] ' : '';
        Logger.info('生成怪物:', rarityText + monsterType.name, 'HP:', newMonster.hp, '/', newMonster.maxHp, '技能数:', newMonster.skills.length, '当前怪物数:', monsters.length);

        return newMonster;
    }

    // 获取第一个激活的怪物
    function getActiveMonster() {
        var monsters = getMonsters();
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i].active) return monsters[i];
        }
        return null;
    }

    // 获取所有激活的怪物
    function getActiveMonsters() {
        var monsters = getMonsters();
        var result = [];
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i].active) result.push(monsters[i]);
        }
        return result;
    }

    return {
        // 核心方法
        getMonsterInstance: getMonsterInstance,
        getAvailableMonsters: getAvailableMonsters,
        getAvailableBosses: getAvailableBosses,
        getRandomMonster: getRandomMonster,
        getMonsterTypeByScore: getMonsterTypeByScore,
        getBossTypeByScore: getBossTypeByScore,
        createMonster: createMonster,
        calculateMonsterPositions: calculateMonsterPositions,
        checkUnlockCharacter: checkUnlockCharacter,
        checkMonsterAppear: checkMonsterAppear,
        spawnMonster: spawnMonster,
        getActiveMonster: getActiveMonster,
        getActiveMonsters: getActiveMonsters
    };
}

export { createMonsterSpawnSystem };
