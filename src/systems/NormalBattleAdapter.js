import Logger from '../utils/Logger.js';
import { createBattleEngine } from './BattleEngine.js';
import { SATURATION_COSTS } from './SaturationState.js';

/**
 * NormalBattleAdapter — BattleEngine 委托模式
 *
 * 星星点击委托给 BattleEngine，战斗逻辑改一处全局生效：
 * - handleStarClick → battleEngine.handleStarClick + 扩展钩子
 * - 邪灵消散 + 分裂 + 掉落（adapter 回调处理）
 * - 怪物攻击玩家（含闪避修复）
 * - 中毒效果
 */

var NON_DAMAGE_TYPES = ['heal', 'shield', 'time', 'greedy', 'unlucky', 'boss_star', 'dodge', 'capture'];

function createNormalBattleAdapter(deps) {

    // ═══ 核心依赖 ═══
    var getGameState = deps.getGameState;
    var getGameConst = deps.getGameConst;
    var getPlayerData = deps.getPlayerData;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var onEngineReady = deps.onEngineReady || null;

    // ═══ 星星 ═══
    var getStars = deps.getStars;
    var setStars = deps.setStars;

    // ═══ 怪物 ═══
    var getActiveMonster = deps.getActiveMonster;
    var getActiveMonsters = deps.getActiveMonsters;
    var getMonsters = deps.getMonsters;
    var setMonsters = deps.setMonsters;

    // ═══ 战斗系统 ═══
    var triggerMonsterSkillFn = deps.triggerMonsterSkill;
    var setElementalComboStateFn = deps.setElementalComboState;
    var addMonsterSkillAnimationFn = deps.addMonsterSkillAnimation;
    var resetBossStarMechanicFn = deps.resetBossStarMechanic;
    var incrementBossAttackCountFn = deps.incrementBossAttackCount;
    var triggerBossStarSkillFn = deps.triggerBossStarSkill;
    var createMonsterProjectileAnimationFn = deps.createMonsterProjectileAnimation;
    var createMonsterDamageAnimationFn = deps.createMonsterDamageAnimation;
    var createHpBarCounterAnimationFn = deps.createHpBarCounterAnimation;
    var getBossStunChanceFn = deps.getBossStunChance;
    var getBossStunDurationFn = deps.getBossStunDuration;
    var setTimeLeftFn = deps.setTimeLeft;
    var getTimeLeftFn = deps.getTimeLeft;
    var getStageDamageTakenFn = deps.getStageDamageTaken;
    var setStageDamageTakenFn = deps.setStageDamageTaken;
    var getLastBossStunTimeFn = deps.getLastBossStunTime;
    var setLastBossStunTimeFn = deps.setLastBossStunTime;

    // ═══ 分数 ═══
    var getScore = deps.getScore;
    var setScore = deps.setScore;
    var getSeasonScore = deps.getSeasonScore;
    var setSeasonScore = deps.setSeasonScore;
    var getStageModeSystem = deps.getStageModeSystem;

    // ═══ 角色属性 ═══
    var calculateTotalAttack = deps.calculateTotalAttack;
    var calculateStarScore = deps.calculateStarScore;
    var getCharacterFullStats = deps.getCharacterFullStats;
    var getCharacterStatsAtLevel = deps.getCharacterStatsAtLevel;
    var getMaxCharacterLevel = deps.getMaxCharacterLevel;
    var addCharacterExperience = deps.addCharacterExperience;

    // ═══ 连击 ═══
    var updateCombo = deps.updateCombo;
    var resetCombo = deps.resetCombo;
    var getComboCount = deps.getComboCount;
    var getComboState = deps.getComboState;

    // ═══ 玩家效果 ═══
    var getPlayerEffects = deps.getPlayerEffects;
    var getCombatState = deps.getCombatState;
    var getDodgeDuration = deps.getDodgeDuration;
    var getGreedySkillThreshold = deps.getGreedySkillThreshold;
    var onMonsterHit = deps.onMonsterHit || function() {};
    var onMonsterDefeat = deps.onMonsterDefeat || function() {};
    var onPetAttackFn = deps.onPetAttack || function() {};
    var onMonsterDodgeFn = deps.onMonsterDodge || function() {};

    // ═══ 星星模式 ═══
    var getStarMode = deps.getStarMode;
    var getSTAR_MODE = deps.getSTAR_MODE;
    var getFallingConfig = deps.getFallingConfig;

    // ═══ 系统 ═══
    var getStarThief = deps.getStarThief;
    var getTowerSystem = deps.getTowerSystem;
    var getPoisonPuddleSystem = deps.getPoisonPuddleSystem;
    var getActiveBuffs = deps.getActiveBuffs;
    var getSeasonSelection = deps.getSeasonSelection;
    var getCaptureSystem = deps.getCaptureSystem || function() { return null; };

    // ═══ D2-D5 战斗维度 ═══
    var getRhythmSystem = deps.getRhythmSystem || function() { return null; };
    var getLinkChainSystem = deps.getLinkChainSystem || function() { return null; };
    var getDragSystem = deps.getDragSystem || function() { return null; };
    var getSaturationState = deps.getSaturationState || function() { return null; };

    // ═══ 任务 ═══
    var updateTaskProgress = deps.updateTaskProgress;
    var updateTaskStats = deps.updateTaskStats;

    // ═══ 动画 ═══
    var addMessage = deps.addMessage;
    var vibrateShort = deps.vibrateShort;
    var createMeteorAnimation = deps.createMeteorAnimation;
    var createCritAnimation = deps.createCritAnimation;
    var createStarBurstAnimation = deps.createStarBurstAnimation;
    var createScreenShake = deps.createScreenShake;
    var createQuickTapAnimation = deps.createQuickTapAnimation;
    var createPlayerDamageAnimation = deps.createPlayerDamageAnimation;
    var removeBossStar = deps.removeBossStar;
    var tipShowTipOnce = deps.tipShowTipOnce;

    // ═══ 净化/掉落 deps ═══
    var getMonsterTypes = deps.getMonsterTypes;
    var getMonstersConfig = deps.getMonstersConfig;
    var getMonsterSkillType = deps.getMonsterSkillType;
    var getMonsterSplitCount = deps.getMonsterSplitCount;
    var setMonsterSplitCount = deps.setMonsterSplitCount;
    var getStageMonstersKilled = deps.getStageMonstersKilled;
    var setStageMonstersKilled = deps.setStageMonstersKilled;
    var getStageMaxCombo = deps.getStageMaxCombo;
    var setStageMaxCombo = deps.setStageMaxCombo;
    var incrementStagePerfectCount = deps.incrementStagePerfectCount || null;
    var getStageBossesKilled = deps.getStageBossesKilled;
    var setStageBossesKilled = deps.setStageBossesKilled;
    var getCurrentStageData = deps.getCurrentStageData;
    var getStarDevourerEscaped = deps.getStarDevourerEscaped;
    var setStarDevourerEscaped = deps.setStarDevourerEscaped;
    var getStarDevourerEscapeHpRatio = deps.getStarDevourerEscapeHpRatio;
    var getEquipments = deps.getEquipments;
    var getSkillsConfig = deps.getSkillsConfig;
    var getPets = deps.getPets;
    var getMonsterAttackInterval = deps.getMonsterAttackInterval;
    var setMonsterAttackInterval = deps.setMonsterAttackInterval;
    var dropEquipmentFn = deps.dropEquipment;
    var dropSkillFn = deps.dropSkill;
    var dropPetFn = deps.dropPet;
    var dropMaterialFn = deps.dropMaterial;
    var addMaterialToBackpackFn = deps.addMaterialToBackpack;
    var createGoldDropAnimationFn = deps.createGoldDropAnimation;
    var createMonsterFn = deps.createMonster;
    var calculateMonsterPositionsFn = deps.calculateMonsterPositions;
    var savePlayerDataFn = deps.savePlayerData;
    var spawnPoisonPuddlesFn = deps.spawnPoisonPuddles;
    var monsterAttackPlayerFn = deps.monsterAttackPlayer;
    var getPassiveSkillBonusesFn = deps.getPassiveSkillBonuses;
    var addTimeLeft = deps.addTimeLeft;

    // ═══ 觉醒系统 ═══
    var getPlayerHpScalingFn = deps.getPlayerHpScaling;
    var getPlayerScoreScalingFn = deps.getPlayerScoreScaling;
    var getDropTierFn = deps.getDropTier;
    var getAwakeConfigFn = deps.getAwakeConfig;

    // ═══ 教学战斗 ═══
    var getIsTutorialBattle = deps.getIsTutorialBattle || null;
    var _pendingVictoryTimeout = null;

    // ═══ BattleEngine 实例 ═══
    var battleEngine = null;
    var active = false;
    var _afterDamageHook = null;

    // ═══════════════════════════════════════════════════════
    // BattleEngine 依赖构建
    // ═══════════════════════════════════════════════════════

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
                createStarBurst: function(x, y, t) { if (createStarBurstAnimation) createStarBurstAnimation(x, y, t); },
                createScreenShake: function(i) { if (createScreenShake) createScreenShake(i); },
                createMonsterDamage: function(x, y, d) { createMonsterDamageAnimationFn(x, y, d); },
                createPlayerDamage: function(d, b, p, t, s) { createPlayerDamageAnimation(d, b, p, t, s); },
                createMeteor: function(sx, sy, d, c, st, ss, cm, cb, ce) { createMeteorAnimation(sx, sy, d, c, st, ss, cm || 1, cb, ce); },
                createCrit: function(x, y, d, s, c) { createCritAnimation(x, y, d, s, c); },
                createQuickTap: function(x, y, s, t, f) { if (createQuickTapAnimation) createQuickTapAnimation(x, y, s, t, f); },
                createScorePopup: function(x, y, s, c) { if (deps.createScorePopupAnimation) deps.createScorePopupAnimation(x, y, s, c); },
                createMonsterProjectile: function(sx, sy, d, td, b, h) { if (createMonsterProjectileAnimationFn) createMonsterProjectileAnimationFn(sx, sy, d, td, b, h); else if (h) h(); },
                createHpBarCounter: function() { createHpBarCounterAnimationFn(); },
                createTimeDamage: function(d) { if (deps.createTimeDamageAnimation) deps.createTimeDamageAnimation(d); },
                createPetDamage: function() {},
                addMessage: addMessage,
                vibrateShort: vibrateShort
            },
            combat: {
                getSeasonStarTypes: function() { return []; },
                updateCombo: updateCombo,
                getComboCount: getComboCount,
                calculateStarScore: calculateStarScore,
                getMonsterSkillType: getMonsterSkillType
            },
            skills: {
                getConfig: function() { return getSkillsConfig(); },
                getTypes: function() { return { PASSIVE: 'passive' }; }
            }
        };
    }

    // ═══════════════════════════════════════════════════════
    // 扩展钩子
    // ═══════════════════════════════════════════════════════

    // 前置处理：偷星者/毒星/毒液滩/掉落区域限制/收服灵光
    function onBeforeStarClickHook(star, x, y, index) {
        // 跳过蓄力持有的灵光
        if (star._charging) return { skip: true };

        // 收服灵光
        if (star.isCaptureStar || star.type === 'capture') {
            var capSys = getCaptureSystem();
            if (capSys) {
                var monster2 = getActiveMonster();
                // 判定快速/超速点击
                var tapInfo2 = { isPerfect: false, isSuperQuick: false };
                if (star.falling && getStarMode() === getSTAR_MODE().FALLING) {
                    var fcfg2 = getFallingConfig();
                    var sh2 = getScreenHeight();
                    var scl2 = getScreenScale();
                    var totalZone2 = fcfg2.bottomHitZone;
                    var superPerfectH2 = fcfg2.superPerfectZone;
                    var hpBarTop2 = sh2 - Math.floor(50 * scl2);
                    var zoneGap2 = Math.floor(10 * scl2);
                    var superPerfectTopY2 = hpBarTop2 - zoneGap2 - totalZone2 + fcfg2.perfectZone;
                    var superPerfectBotY2 = superPerfectTopY2 + superPerfectH2;
                    if (star.y >= superPerfectTopY2 && star.y < superPerfectBotY2) {
                        tapInfo2.isSuperQuick = true;
                    } else {
                        var perfectTopY2 = hpBarTop2 - zoneGap2 - totalZone2;
                        if (star.y >= perfectTopY2 && star.y < perfectTopY2 + totalZone2) {
                            tapInfo2.isPerfect = true;
                        }
                    }
                }
                var capResult = capSys.handleCaptureStarClick(star, monster2, tapInfo2);
                return capResult;
            }
        }
        // 掉落星星区域限制
        if (star.falling && getStarMode() === getSTAR_MODE().FALLING) {
            if (star.y < getScreenHeight() * 0.6) {
                return { skip: true };
            }
        }

        // 偷星者
        if (star.isThiefStar) {
            var starThief = getStarThief();
            if (starThief) {
                starThief.handleStarClick(star._external || star);
                return { handled: true };
            }
        }

        // 毒星
        if (star.isPoisonStar) {
            handlePoisonStarEffect(star);
            return { handled: true };
        }

        // 毒液滩星星
        var puddleSys = getPoisonPuddleSystem();
        if (puddleSys && puddleSys.poisonPuddles) {
            for (var pdi = 0; pdi < puddleSys.poisonPuddles.length; pdi++) {
                var pp = puddleSys.poisonPuddles[pdi];
                var pdx = star.x - pp.x;
                var pdy = star.y - pp.y;
                if (pdx * pdx + pdy * pdy < pp.radius * pp.radius) {
                    handlePuddleStarEffect(star);
                    return { handled: true };
                }
            }
        }

        return undefined;
    }

    // 攻击目标选择
    function getAttackTargetHook(star) {
        var state = getGameState();
        var GAME_STATE = getGameConst();
        if (state === GAME_STATE.TOWER_COMBAT) return null;
        return getActiveMonster();
    }

    // 伤害计算覆盖（game.js 公式）
    function calculateDamageOverrideHook(star, stats, pd) {
        var state = getGameState();
        var GAME_STATE = getGameConst();
        var isSeasonMode = (state === GAME_STATE.SEASON_PLAYING);
        var seasonSel = getSeasonSelection();

        var starType = star.type || 'normal';
        var isBigStar = starType === 'big';
        var bigType = star.bigType || 'normal';

        var starScore;
        if (isBigStar) {
            starScore = calculateStarScore(bigType) * 3;
        } else {
            starScore = calculateStarScore(starType);
        }

        var totalAttack = calculateTotalAttack();
        var isNonDamageStar = NON_DAMAGE_TYPES.indexOf(starType) !== -1;
        var totalDamage = isNonDamageStar ? 0 : (starScore + totalAttack);

        // 快速点击判定
        var isSuperQuickTap = false;
        var isQuickTap = false;
        var quickTapMultiplier = 1;

        if (star.falling && getStarMode() === getSTAR_MODE().FALLING) {
            var fallingCfg = getFallingConfig();
            var screenHeight = getScreenHeight();
            var scale = getScreenScale();
            var totalZone = fallingCfg.bottomHitZone;
            var perfectHeight = fallingCfg.perfectZone;
            var superPerfectHeight = fallingCfg.superPerfectZone;
            var hpBarTop = screenHeight - Math.floor(50 * scale);
            var zoneGap = Math.floor(10 * scale);
            var perfectTopY = hpBarTop - zoneGap - totalZone;
            var superPerfectTopY = perfectTopY + perfectHeight;
            var superPerfectBottomY = superPerfectTopY + superPerfectHeight;

            var starVisSize = (star.size || fallingCfg.starSize) * (star.scale || 1);
            var starHalfH = starVisSize / 2;
            var sTop = star.y - starHalfH;
            var sBot = star.y + starHalfH;
            var zoneBottom = hpBarTop - zoneGap;

            if (star.y >= superPerfectTopY && star.y < superPerfectBottomY) {
                isSuperQuickTap = true;
                quickTapMultiplier = 4;
            } else if (sBot > perfectTopY && sTop < zoneBottom) {
                isQuickTap = true;
                quickTapMultiplier = 2;
            }
        } else {
            var clickTime = Date.now();
            var starCreateTime = star.createTime || star.spawnTime || clickTime;
            var clickDelay = clickTime - starCreateTime;
            isSuperQuickTap = clickDelay <= 200;
            isQuickTap = clickDelay <= 250 && !isSuperQuickTap;
            quickTapMultiplier = isSuperQuickTap ? 4 : (isQuickTap ? 2 : 1);
        }

        if (quickTapMultiplier > 1 && !isNonDamageStar) {
            starScore = starScore * quickTapMultiplier;
            totalAttack = totalAttack * quickTapMultiplier;
            totalDamage = totalDamage * quickTapMultiplier;
        }

        // 暴击
        var isCritical = false;
        var critDamageMult = 1.0;
        if (!isNonDamageStar) {
            var critResult = calculateCrit(pd, isSeasonMode, seasonSel);
            isCritical = critResult.isCritical;
            critDamageMult = critResult.critDamageMult;
            if (isCritical) {
                starScore = Math.floor(starScore * critDamageMult);
                totalAttack = Math.floor(totalAttack * critDamageMult);
                totalDamage = Math.floor(totalDamage * critDamageMult);
            }
        }

        // 连击
        updateCombo();
        var comboCount = getComboCount();

        // D5: 节拍判定
        var rhythmResult = { grade: 'normal', damageMult: 1, scoreBonus: 0 };
        var rhythmSys = getRhythmSystem();
        if (rhythmSys && rhythmSys.isUnlocked()) {
            rhythmResult = rhythmSys.judgeTiming(star);
            if (rhythmResult.damageMult > 1 && !isNonDamageStar) {
                starScore = Math.floor(starScore * rhythmResult.damageMult);
                totalAttack = Math.floor(totalAttack * rhythmResult.damageMult);
                totalDamage = Math.floor(totalDamage * rhythmResult.damageMult);
            }
        }

        // D3: 拖拽聚合攻击加成
        var dragSys = getDragSystem();
        if (dragSys && dragSys.isUnlocked() && !isNonDamageStar) {
            var dragBonus = dragSys.getAttackBonus();
            if (dragBonus > 1) {
                starScore = Math.floor(starScore * dragBonus);
                totalAttack = Math.floor(totalAttack * dragBonus);
                totalDamage = Math.floor(totalDamage * dragBonus);
            }
        }

        return {
            damage: totalDamage,
            isCrit: isCritical,
            critDamageMult: critDamageMult,
            comboMultiplier: 1,
            comboCount: comboCount,
            isQuickTap: isQuickTap,
            isSuperQuickTap: isSuperQuickTap,
            starScore: starScore,
            totalAttack: totalAttack,
            isNonDamageStar: isNonDamageStar,
            rhythmGrade: rhythmResult.grade
        };
    }

    // 怪物防御（吸收/闪避/元素汽伤/护甲/护盾）
    function onStarHitMonsterHook(star, monster, damage, isCrit) {
        if (!monster || !monster.active) {
            return { prevented: true };
        }

        // 偷星者免疫
        var starThief = getStarThief();
        if (monster.type === 'star_thief' && starThief && !starThief.isBrokenState()) {
            return { prevented: true };
        }

        var MonsterSkillType = getMonsterSkillType();
        var now = Date.now();
        var finalDamage = damage;
        var comboMultiplier = 1;
        var isElementalCombo = false;

        // 怪物吸收
        if (monster.absorbType) {
            var shouldAbsorb = monster.absorbType === 'all' || monster.absorbType === star.type;
            if (shouldAbsorb && Math.random() < (monster.absorbRatio || 0.2)) {
                monster.empowered = true;
                monster.empowerType = star.type;
                var healAmount = Math.floor(damage * (monster.healRate || 0.5));
                monster.hp = Math.min(monster.hp + healAmount, monster.maxHp);
                addMonsterSkillAnimationFn(monster, 'absorb', '+' + healAmount + ' 灵能');
                addMessage('邪灵吸收! +' + healAmount + '灵能', '#ff6b6b');
                vibrateShort({ type: 'heavy' });
                return { prevented: true, absorbed: true, healAmount: healAmount };
            }
        }

        // 怪物闪避
        if (monster.skills) {
            for (var di = 0; di < monster.skills.length; di++) {
                if (monster.skills[di].type === MonsterSkillType.DODGE) {
                    if (Math.random() < (monster.skills[di].chance || 0)) {
                        monster._dodgeAnimTime = Date.now();
                        addMonsterSkillAnimationFn(monster, 'dodge', '闪避!');
                        addMessage('邪灵闪避了灵光冲击!', '#ff6b6b');
                        onMonsterDodgeFn(monster);
                        return { prevented: false, dodged: true, modifiedDamage: 0 };
                    }
                    break;
                }
            }
        }

        // 元素汽伤
        if (star.type === 'ice' || star.type === 'fire') {
            if (monster.comboCooldown <= now) {
                if (star.type === 'ice') monster.lastIceAttackTime = now;
                else monster.lastFireAttackTime = now;
                var iceTime = monster.lastIceAttackTime;
                var fireTime = monster.lastFireAttackTime;
                if (iceTime > 0 && fireTime > 0 && Math.abs(iceTime - fireTime) <= 2000) {
                    isElementalCombo = true;
                    comboMultiplier = 2;
                    monster.comboCooldown = now + 2000;
                    monster.lastIceAttackTime = 0;
                    monster.lastFireAttackTime = 0;
                    setElementalComboStateFn(true, now);
                    vibrateShort({ type: 'heavy' });
                }
            }
        }

        finalDamage = damage * comboMultiplier;

        // 觉醒闪避
        if (monster.awakeDodge && Math.random() < monster.awakeDodge) {
            monster._dodgeAnimTime = Date.now();
            addMonsterSkillAnimationFn(monster, 'dodge', '觉醒闪避!');
            addMessage('💨 邪灵觉醒闪避!', '#ff6b6b');
            return { prevented: false, dodged: true, modifiedDamage: 0 };
        }

        // 觉醒护甲减伤
        if (monster.awakeArmor) {
            finalDamage = Math.floor(finalDamage * (1 - monster.awakeArmor));
        }

        // 觉醒元素抗性（冰/火伤害减半）
        if (monster.awakeResist && (star.type === 'ice' || star.type === 'fire')) {
            finalDamage = Math.floor(finalDamage * (1 - monster.awakeResist));
        }

        // 护甲减伤
        if (monster.skills) {
            for (var ai = 0; ai < monster.skills.length; ai++) {
                if (monster.skills[ai].type === MonsterSkillType.ARMOR) {
                    finalDamage = Math.floor(finalDamage * (1 - monster.skills[ai].reduction));
                    break;
                }
            }
        }
        if (monster.armor > 0) {
            finalDamage = Math.max(1, finalDamage - monster.armor);
        }

        // 怪物护盾
        var shieldBlocked = false;
        if (monster.shield > 0) {
            var shieldAbsorb = Math.min(monster.shield, finalDamage);
            monster.shield -= shieldAbsorb;
            finalDamage -= shieldAbsorb;
            if (shieldAbsorb > 0) addMonsterSkillAnimationFn(monster, 'shield', '护盾-' + shieldAbsorb);
            if (finalDamage <= 0) shieldBlocked = true;
        }

        return {
            prevented: false,
            modifiedDamage: finalDamage,
            comboMultiplier: comboMultiplier,
            isElementalCombo: isElementalCombo,
            shieldBlocked: shieldBlocked
        };
    }

    // 分数/经验/任务/后置效果（反弹/狂暴/毒液分裂/吞噬者逃跑）
    function onScoreEarnedHook(star, result, damage, prevented) {
        var GAME_STATE = getGameConst();
        var state = getGameState();
        var isSeasonMode = (state === GAME_STATE.SEASON_PLAYING);
        var pd = getPlayerData();
        var m = getActiveMonster();

        // 任务统计（无论是否 prevented 都计数）
        updateTaskProgress('click_stars', 1);
        updateTaskProgress('total_clicks', 1);
        updateTaskStats('totalClicks', 1);

        if (prevented) {
            resetCombo();
            return;
        }

        // 快速点击任务
        if (result.isSuperQuickTap) {
            updateTaskProgress('perfect_clicks', 1);
            updateTaskProgress('super_perfect_clicks', 1);
            updateTaskStats('totalPerfects', 1);
            if (incrementStagePerfectCount) incrementStagePerfectCount();
        } else if (result.isQuickTap) {
            updateTaskProgress('perfect_clicks', 1);
            updateTaskStats('totalPerfects', 1);
            if (incrementStagePerfectCount) incrementStagePerfectCount();
        }

        // 暴击
        if (result.isCrit) {
            updateTaskProgress('critical_hits', 1);
            updateTaskStats('totalCriticals', 1);
            handleThiefCrownCrit(pd);
        }

        // D4: 联连充能
        var rhythmGrade = result.rhythmGrade || 'normal';
        var linkSys = getLinkChainSystem();
        if (linkSys && linkSys.isUnlocked() && !result.isNonDamageStar) {
            if (rhythmGrade === 'perfect') {
                linkSys.addCharge(12);
            } else if (rhythmGrade === 'great') {
                linkSys.addCharge(8);
            } else {
                linkSys.addCharge(5);
            }
        }

        // D1 Perfect: 饱和度恢复
        var satState = getSaturationState();
        if (satState && !result.isNonDamageStar && rhythmGrade === 'perfect') {
            satState.recover(SATURATION_COSTS.PERFECT_RECOVERY);
        }

        // 后置效果
        if (m && m.active) {
            var MonsterSkillType = getMonsterSkillType();

            // 反弹
            if (m.skills) {
                for (var ri = 0; ri < m.skills.length; ri++) {
                    if (m.skills[ri].type === MonsterSkillType.REFLECT) {
                        if (damage > 0) {
                            var reflectedDamage = Math.floor(damage * m.skills[ri].ratio);
                            if (reflectedDamage > 0) {
                                if (pd.playerShield > 0) {
                                    var pAbsorb = Math.min(pd.playerShield, reflectedDamage);
                                    pd.playerShield -= pAbsorb;
                                    reflectedDamage -= pAbsorb;
                                }
                                var _oldHp1 = pd.playerHp;
                                pd.playerHp = Math.max(0, pd.playerHp - reflectedDamage);
                                Logger.info('[HP] reflect | -' + reflectedDamage + ' | ' + _oldHp1 + ' → ' + pd.playerHp + ' | ' + m.type + ' ratio:' + m.skills[ri].ratio);
                                addMonsterSkillAnimationFn(m, 'reflect', '反弹' + reflectedDamage);
                            }
                        }
                        break;
                    }
                }
            }

            // 受击动画
            m.scale = 0.9;
            m.animationFrame = 5;
            if (!result.isElementalCombo) vibrateShort({ type: 'medium' });

            // 狂暴
            triggerMonsterSkillFn(m, MonsterSkillType.RAGE);

            // 碎瓷聚合体碎片溅射
            if (m.hp > 0 && !m.hasPoisonSplit) {
                var poisonSplitSkill = null;
                if (m.skills) {
                    for (var psi = 0; psi < m.skills.length; psi++) {
                        if (m.skills[psi].type === MonsterSkillType.POISON_SPLIT) {
                            poisonSplitSkill = m.skills[psi];
                            break;
                        }
                    }
                }
                if (poisonSplitSkill && m.hp <= m.maxHp * poisonSplitSkill.hpThreshold) {
                    m.hasPoisonSplit = true;
                    var poisonDmg = poisonSplitSkill.damage || 20;
                    if (pd.playerShield > 0) {
                        var psAbsorb = Math.min(pd.playerShield, poisonDmg);
                        pd.playerShield -= psAbsorb;
                        poisonDmg -= psAbsorb;
                    }
                    var _oldHp2 = pd.playerHp;
                    pd.playerHp = Math.max(0, pd.playerHp - poisonDmg);
                    Logger.info('[HP] poison_split | -' + poisonDmg + ' | ' + _oldHp2 + ' → ' + pd.playerHp + ' | ' + m.type);
                    var fx = getPlayerEffects();
                    fx.poisoned = true;
                    fx.poisonEndTime = Date.now() + (poisonSplitSkill.poisonDuration || 5) * 1000;
                    fx.poisonDamage = poisonSplitSkill.poisonDamage || 8;
                    fx.poisonTickTime = Date.now() + 1000;
                    addMonsterSkillAnimationFn(m, 'poison_split', '毒液飞溅!');
                    addMessage('☠️ 聚合邪灵溅射碎片! -' + (poisonSplitSkill.damage || 20) + '灵能', '#00ff00', true);
                    if (spawnPoisonPuddlesFn) spawnPoisonPuddlesFn(m.x, m.y, poisonSplitSkill);
                    vibrateShort({ type: 'heavy' });
                }
            }

            // 灵脉吞噬者逃跑
            var starDevourerEscaped = getStarDevourerEscaped();
            if (m.id === 'star_devourer' && !starDevourerEscaped && m.hp > 0 && m.hp <= m.maxHp * getStarDevourerEscapeHpRatio()) {
                setStarDevourerEscaped(true);
                var monsters = getMonsters();
                for (var ei = 0; ei < monsters.length; ei++) {
                    if (monsters[ei].id === m.id) { monsters.splice(ei, 1); break; }
                }
                pd.bossKillCount = 0;
                resetBossStarMechanicFn();
                addMonsterSkillAnimationFn(m, 'escape', '遁入灵隙!');
                addMessage('🌀 灵脉吞噬者遁入灵隙，逃离了战斗！', '#ff6b6b');
                vibrateShort({ type: 'heavy' });
                return;
            }
        }

        // 分数
        if (!result.isNonDamageStar) {
            var earnedScore = (result.starScore + Math.floor(damage * 0.1)) * result.comboMultiplier;
            // 觉醒分数补偿（独立缩放，低于难度增长）
            if (getPlayerScoreScalingFn && state !== GAME_STATE.SEASON_PLAYING && state !== GAME_STATE.STAGE_PLAYING) {
                var awakeScoreScale = getPlayerScoreScalingFn(pd);
                if (awakeScoreScale > 1) {
                    earnedScore = Math.floor(earnedScore * awakeScoreScale);
                }
            }
            addScore(earnedScore, state, GAME_STATE, isSeasonMode);
            if (!isSeasonMode && state !== GAME_STATE.STAGE_PLAYING && pd.currentCharacterId) {
                addCharacterExperience(pd.currentCharacterId, earnedScore);
            }
        }

        // 大星星震动
        if (star.type === 'big' || star.bigType) {
            vibrateShort({ type: 'heavy' });
        }

        // 连击提示
        var comboState = getComboState();
        if (comboState.count >= 20) {
            tipShowTipOnce('first_high_combo', '连灵加成生效中！连续触碰灵光翻倍');
        }
    }

    // 特殊星星后处理（模式特有追加效果）
    function onAfterSpecialStarHook(star) {
        var pd = getPlayerData();
        var fx = getPlayerEffects();
        var m = getActiveMonster();
        var state = getGameState();
        var GAME_STATE = getGameConst();
        var combatState = getCombatState();

        switch (star.type) {
            case 'time':
                // 时序星等级加成
                if (pd.timeStarLevel && pd.timeStarLevel > 0) {
                    addTimeLeft(pd.timeStarLevel);
                }
                break;

            case 'greedy':
                // 贪婪星：对怪物造成 1 点伤害 + 净化检查
                if (m && m.active) {
                    m.hp = Math.max(0, m.hp - 1);
                }
                if (combatState.greedyHpPool >= getGreedySkillThreshold() && !combatState.greedySkillUnlocked) {
                    combatState.greedySkillUnlocked = true;
                    addMessage('🌀 贪婪技能已解锁!', '#ff6b6b');
                    vibrateShort({ type: 'heavy' });
                }
                if (m && m.active && m.hp <= 0) {
                    handleMonsterDeath(false, m, state, GAME_STATE, pd);
                }
                break;

            case 'unlucky':
                // 厄运星：怒气暴击净化检查
                if (pd.playerRage === 0 && m && m.active && m.hp <= 0) {
                    handleMonsterDeath(false, m, state, GAME_STATE, pd);
                }
                break;

            case 'boss_star':
                // Boss 星星：移除 + 加分
                var bossStarId = star.bossStarId;
                if (bossStarId) removeBossStar(bossStarId);
                setScore(getScore() + 1);
                break;

            case 'combo':
                // 连击星：同步到 game.js combatState
                combatState.comboStarActive = true;
                combatState.comboStarStartTime = Date.now();
                combatState.comboStarLastAttackTime = 0;
                combatState.comboStarOriginX = star.x;
                combatState.comboStarOriginY = star.y;
                updateCombo();
                break;
        }

        // 任务统计
        updateTaskProgress('click_stars', 1);
        updateTaskProgress('total_clicks', 1);
        updateTaskStats('totalClicks', 1);
    }

    // 星星从 game.js 数组移除
    function onStarConsumedHook(star) {
        if (!star._external) return;
        var stars = getStars();
        for (var i = 0; i < stars.length; i++) {
            if (stars[i] === star._external) {
                stars.splice(i, 1);
                return;
            }
        }
    }

    // 邪灵消散回调（由 BattleEngine preventFinish 触发）
    function onMonsterDeathCallback(ctx) {
        var m = ctx.monster;
        if (!m) return;
        var state = getGameState();
        var GAME_STATE = getGameConst();
        var pd = getPlayerData();

        // 检查 isElementalCombo — 从引擎状态读取
        var engineState = battleEngine.getState();
        handleMonsterDeath(false, m, state, GAME_STATE, pd);
    }

    // ═══════════════════════════════════════════════════════
    // 公共 API
    // ═══════════════════════════════════════════════════════

    function init() {
        active = true;
        battleEngine = createBattleEngine(buildEngineDeps());

        var pd = getPlayerData();
        var charStats = getCharacterFullStats(pd.currentCharacterId);

        Logger.info('[HP] adapter_init | pd.playerHp=' + pd.playerHp + ' maxHp=' + (charStats ? charStats.hp : 100) + ' charId=' + pd.currentCharacterId);

        battleEngine.init({
            mode: 'normal',
            skipAutoTimers: true,
            monster: null,
            playerHp: pd.playerHp || 100,
            playerMaxHp: charStats ? charStats.hp : 100,
            playerShield: pd.playerShield || 0,
            timeLimit: getTimeLeftFn() || 60,
            combatOverrides: {},
            features: {},
            extensions: {
                onBeforeStarClick: onBeforeStarClickHook,
                getAttackTarget: getAttackTargetHook,
                calculateDamageOverride: calculateDamageOverrideHook,
                onStarHitMonster: onStarHitMonsterHook,
                onScoreEarned: onScoreEarnedHook,
                onStarConsumed: onStarConsumedHook,
                onAfterSpecialStar: onAfterSpecialStarHook,
                preventFinish: true
            },
            onMonsterDeath: onMonsterDeathCallback,
            onDamageDealt: function(info) { onMonsterHit(info.monster); },
            onPetAttack: onPetAttackFn,
            deathDelayMs: 0
        });

        if (onEngineReady) onEngineReady(battleEngine);
        Logger.info('[NormalBattleAdapter] init — BattleEngine 委托模式');
    }

    function destroy() {
        active = false;
        if (battleEngine) {
            battleEngine.destroy();
            battleEngine = null;
        }
    }

    function update() {
        if (battleEngine) battleEngine.update();
        // 收服灵光生成
        var capSys = getCaptureSystem();
        if (capSys) {
            var monster2 = getActiveMonster();
            if (capSys.shouldSpawnCaptureStar(monster2)) {
                var captureStar = capSys.spawnCaptureStar();
                var currentStars = getStars();
                currentStars.push(captureStar);
                setStars(currentStars);
            }
        }
    }

    function isActive() {
        return active;
    }

    // ═══════════════════════════════════════════════════════
    // 星星点击 — 委托 BattleEngine
    // ═══════════════════════════════════════════════════════

    function handleStarClick(touchX, touchY) {
        var GAME_STATE = getGameConst();
        var state = getGameState();
        var isTower = (state === GAME_STATE.TOWER_COMBAT);
        var isBoss = (state === GAME_STATE.BOSS_BATTLE);

        if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.SEASON_PLAYING && state !== GAME_STATE.STAGE_PLAYING && !isTower && !isBoss) {
            return false;
        }

        var engine = battleEngine;
        if (!engine) return false;

        // 眩晕检查
        var playerEffects = getPlayerEffects();
        if (playerEffects.stunned) {
            if (Date.now() >= playerEffects.stunEndTime) {
                playerEffects.stunned = false;
            } else {
                return false;
            }
        }

        // 统一同步：玩家状态 → BattleEngine
        var pd = getPlayerData();
        Logger.info('[HP] set_state_to_engine | pd.playerHp=' + pd.playerHp + ' shield=' + pd.playerShield);
        engine.setPlayerState(
            pd.playerHp, pd.playerShield,
            playerEffects.dodging, playerEffects.dodgeEndTime,
            false, 0
        );

        // 设置攻击目标
        if (isTower) {
            var ts = getTowerSystem();
            if (ts && ts.combatMonster) {
                engine.setTargetMonster(ts.combatMonster);
            }
        } else if (isBoss) {
            // Boss 模式：取第一只活着的怪物（分裂后死怪仍留在数组中）
            var bossMons = getMonsters();
            for (var bti = 0; bti < bossMons.length; bti++) {
                if (bossMons[bti].hp > 0 && bossMons[bti].active) {
                    engine.setTargetMonster(bossMons[bti]);
                    break;
                }
            }
        } else {
            engine.setTargetMonster(getActiveMonster());
        }

        // 防御断言：确保不会对渲染副本施加伤害
        var _target = engine.getTargetMonster && engine.getTargetMonster();
        if (_target && _target._isCopy) {
            Logger.error('[NormalBattleAdapter] 试图攻击渲染副本！已阻止。');
            return false;
        }

        // 直接传 stars 给引擎处理，不再 syncStars 双向同步
        var result = engine.handleStarClick(touchX, touchY, getStars());

        if (result) {
            syncEngineStateBack();
            // 教学战斗 HP 阈值胜利检查
            if (checkTutorialVictory()) return true;
        }

        return result;
    }

    // 教学战斗：检查怪物 HP 是否降到阈值以下，直接触发胜利
    function checkTutorialVictory() {
        if (!getIsTutorialBattle || !getIsTutorialBattle()) return false;
        var m = getActiveMonster();
        if (!m || !m.active) return false;
        if (m.hp / m.maxHp <= 0.3) {
            if (deps.endGame) deps.endGame();
            return true;
        }
        return false;
    }

    function syncEngineStateBack(engineOverride) {
        var eng = engineOverride || battleEngine;
        if (!eng) return;
        var es = eng.getState();
        var pd = getPlayerData();
        var fx = getPlayerEffects();

        Logger.info('[HP] sync_back | engine:' + es.playerHp + ' pd:' + pd.playerHp + ' delta:' + (es.playerHp - pd.playerHp));
        pd.playerHp = es.playerHp;
        pd.playerShield = es.playerShield;
        fx.dodging = es.dodging;
        fx.dodgeEndTime = es.dodgeEndTime;
        fx.stunned = es.isStunned;
        fx.stunEndTime = es.stunEndTime;

        var combatState = getCombatState();
        combatState.greedyHpPool = es.greedyHpPool;
        pd.playerRage = es.playerRage;
    }

    // ═══════════════════════════════════════════════════════
    // 毒星/毒液滩效果（onBeforeStarClick 使用）
    // ═══════════════════════════════════════════════════════

    function handlePoisonStarEffect(star) {
        var pd = getPlayerData();
        var poisonDmg = 15;
        if (pd.playerShield > 0) {
            var absorb = Math.min(pd.playerShield, poisonDmg);
            pd.playerShield -= absorb;
            poisonDmg -= absorb;
        }
        var _oldHp4 = pd.playerHp;
        pd.playerHp = Math.max(0, pd.playerHp - poisonDmg);
        Logger.info('[HP] poison_star_before | -' + poisonDmg + ' | ' + _oldHp4 + ' → ' + pd.playerHp);
        var fx = getPlayerEffects();
        fx.poisoned = true;
        fx.poisonEndTime = Date.now() + 3000;
        fx.poisonDamage = 5;
        fx.poisonTickTime = Date.now() + 1000;
        addMessage('☠️ 毒灵爆发! -15灵能+中毒!', '#00ff00', true);
        vibrateShort({ type: 'heavy' });
    }

    function handlePuddleStarEffect(star) {
        var pd = getPlayerData();
        var poisonDmg = 15;
        createMeteorAnimation(
            star.x, star.y, poisonDmg, false, 'poison', 0, 1, null,
            { x: getScreenWidth() / 2, y: getScreenHeight() - 50 * getScreenScale() }
        );
        if (pd.playerShield > 0) {
            var absorb = Math.min(pd.playerShield, poisonDmg);
            pd.playerShield -= absorb;
            poisonDmg -= absorb;
        }
        var _oldHp5 = pd.playerHp;
        pd.playerHp = Math.max(0, pd.playerHp - poisonDmg);
        Logger.info('[HP] poison_star_puddle | -' + poisonDmg + ' | ' + _oldHp5 + ' → ' + pd.playerHp);
        var fx = getPlayerEffects();
        fx.poisoned = true;
        fx.poisonEndTime = Date.now() + 3000;
        fx.poisonDamage = 5;
        fx.poisonTickTime = Date.now() + 1000;
        addMessage('☠️ 毒灵爆发! -15灵能+中毒!', '#00ff00', true);
        vibrateShort({ type: 'heavy' });
    }

    // ═══════════════════════════════════════════════════════
    // 邪灵消散处理
    // ═══════════════════════════════════════════════════════

    function handleMonsterDeath(isElementalCombo, m, state, GAME_STATE, playerData) {
        if (!m) return;

        // 教学战斗中：胜利由 endGame 处理，跳过普通死亡流程
        if (getIsTutorialBattle && getIsTutorialBattle()) {
            Logger.info('教学战斗中怪物死亡，跳过普通死亡处理');
            var monsters2 = getMonsters();
            for (var mi = 0; mi < monsters2.length; mi++) {
                if (monsters2[mi].id === m.id) { monsters2.splice(mi, 1); break; }
            }
            return;
        }

        var MonsterTypes = getMonsterTypes();
        var MonstersConfig = getMonstersConfig();
        var MonsterSkillType = getMonsterSkillType();
        var monsterType = MonsterTypes[m.type];
        var wasBoss = (monsterType && monsterType.isBoss) || m.type === 'boss';

        // ===== 怪物分裂检查 =====
        var splitSkill = null;
        if (m.skills) {
            for (var ssi = 0; ssi < m.skills.length; ssi++) {
                if (m.skills[ssi].type === MonsterSkillType.SPLIT) {
                    splitSkill = m.skills[ssi];
                    break;
                }
            }
        }
        if (splitSkill && !m.hasSplit && m.hp <= m.maxHp * splitSkill.hpThreshold) {
            m.hasSplit = true;
            var splitMonsterConfig = MonstersConfig[splitSkill.splitInto];
            var splitCount = splitSkill.count || 2;

            if (splitMonsterConfig) {
                var splitMonsterType = MonsterTypes[splitSkill.splitInto];
                m.type = splitSkill.splitInto;
                m.maxHp = Math.floor(splitMonsterConfig.baseHp * 1.2);
                m.hp = m.maxHp;
                m.skills = splitMonsterConfig.skills || [];
                m.shield = 0;
                m.hasRaged = false;
                m.skillStates = {};
                m.attack = splitMonsterConfig.baseAttack || 10;
                m.attackInterval = splitMonsterConfig.attackInterval || 2000;
                m.splitFrom = 'boss';

                var positions = calculateMonsterPositionsFn(splitCount, getScreenHeight() / 3);
                m.x = positions[0].x;
                m.y = positions[0].y;

                var monsters = getMonsters();
                for (var si = 1; si < splitCount; si++) {
                    var newMonster = createMonsterFn(splitSkill.splitInto, positions[si].x, positions[si].y, {
                        maxHp: Math.floor(splitMonsterConfig.baseHp * 1.2),
                        hp: Math.floor(splitMonsterConfig.baseHp * 1.2),
                        attack: splitMonsterConfig.baseAttack || 10,
                        attackInterval: splitMonsterConfig.attackInterval || 2000,
                        skills: splitMonsterConfig.skills || [],
                        splitFrom: 'boss'
                    });
                    monsters.push(newMonster);
                }

                addMessage('🌫️ 分裂成' + splitCount + '只' + (splitMonsterType ? splitMonsterType.name : '小怪') + '!', '#ff6b6b');
                Logger.info('怪物分裂! 生成', splitCount, '只');

                if (wasBoss) {
                    playerData.bossKillCount = 0;
                }
                return;
            }
        }

        // ===== 处理邪灵消散 =====
        var isSplitFromBoss = m.splitFrom === 'boss';

        onMonsterDefeat(m);

        var monsters2 = getMonsters();
        for (var mi = 0; mi < monsters2.length; mi++) {
            if (monsters2[mi].id === m.id) {
                monsters2.splice(mi, 1);
                break;
            }
        }

        var remaining = getActiveMonsters();
        if (remaining.length > 0) {
            var positions2 = calculateMonsterPositionsFn(remaining.length, getScreenHeight() / 3);
            for (var ri = 0; ri < remaining.length; ri++) {
                if (positions2[ri]) {
                    remaining[ri].x = positions2[ri].x;
                    remaining[ri].y = positions2[ri].y;
                }
            }
        }

        if (isSplitFromBoss) {
            var splitCount2 = getMonsterSplitCount() - 1;
            setMonsterSplitCount(splitCount2);
            var hasMoreSplit = false;
            for (var hi = 0; hi < remaining.length; hi++) {
                if (remaining[hi].splitFrom === 'boss') {
                    hasMoreSplit = true;
                    break;
                }
            }
            if (hasMoreSplit) {
                addMessage('还有分裂小怪!', '#ff6b6b');
                return;
            } else {
                addMessage('所有分裂小怪已击败!', '#00ff88');
                playerData.totalMonstersKilled++;
                var timeReward = monsterType ? monsterType.timeReward || 8 : 8;
                addTimeLeft(timeReward);
                addScore(20, state, GAME_STATE, state === GAME_STATE.SEASON_PLAYING);
                dropMaterialFn();
                updateTaskProgress('kill_boss', 1);
                updateTaskProgress('kill_monsters', 1);
                savePlayerDataFn();
                return;
            }
        }

        if (wasBoss) {
            var attackInterval = getMonsterAttackInterval();
            if (attackInterval) clearInterval(attackInterval);
            var newInterval = setInterval(function() {
                monsterAttackPlayerFn();
            }, 2000);
            setMonsterAttackInterval(newInterval);
        }

        var timeReward2 = monsterType ? monsterType.timeReward || 0 : 0;
        if (timeReward2 > 0) {
            addTimeLeft(timeReward2);
        }

        playerData.totalMonstersKilled++;
        if (wasBoss) {
            playerData.bossKillCount = 0;
        } else {
            playerData.bossKillCount++;
        }

        if (state === GAME_STATE.STAGE_PLAYING) {
            var stageKilled = getStageMonstersKilled() + 1;
            setStageMonstersKilled(stageKilled);
            setStageMaxCombo(Math.max(getStageMaxCombo(), getComboCount()));
            if (wasBoss) {
                setStageBossesKilled(getStageBossesKilled() + 1);
            }
        }

        if (state === GAME_STATE.STAGE_PLAYING) {
            var stageSys = getStageModeSystem();
            if (stageSys && stageSys.onMonsterDefeated) {
                stageSys.onMonsterDefeated(m);
            }
            return;
        }

        var isSeasonMode = (state === GAME_STATE.SEASON_PLAYING);
        var rarityScoreBonus = { 'N': 10, 'R': 15, 'SR': 20, 'SSR': 30, 'UR': 50 };
        var killScore = rarityScoreBonus[monsterType ? monsterType.rarity : ''] || (wasBoss ? 20 : 10);
        if (isElementalCombo) {
            killScore *= 2;
        }
        addScore(killScore, state, GAME_STATE, isSeasonMode);

        if (!isSeasonMode) {
            var goldDrop = wasBoss ? 80 + Math.floor(Math.random() * 40) : Math.floor(Math.random() * 31);
            var skillBonuses = getPassiveSkillBonusesFn ? getPassiveSkillBonusesFn() : { goldBonus: 1 };
            var activeBuffs = getActiveBuffs();
            goldDrop = Math.floor(goldDrop * (activeBuffs.goldBonus || 1) * skillBonuses.goldBonus);
            if (goldDrop > 0) {
                playerData.gold += goldDrop;
                createGoldDropAnimationFn(m.x, m.y - 50, goldDrop);
            }
        }

        // 觉醒掉落补偿
        var awakeDropBonus = 0;
        var awakeBossExtraDrops = 0;
        if (getDropTierFn && getAwakeConfigFn && !isSeasonMode && state !== GAME_STATE.STAGE_PLAYING) {
            var dropTier = getDropTierFn(playerData);
            if (dropTier > 0) {
                var awakeCfg = getAwakeConfigFn();
                awakeDropBonus = dropTier * awakeCfg.dropRatePerTier;
                awakeBossExtraDrops = Math.floor(dropTier / awakeCfg.bossExtraDropPerTiers);
            }
        }

        var equipDropRate = wasBoss ? 0.075 : 0.0125;
        var skillDropRate = wasBoss ? 0.1 : 0.01;
        var petDropRate = wasBoss ? 0.01 : 0.005;

        if (Math.random() < equipDropRate + awakeDropBonus) dropEquipmentFn(wasBoss);
        if (wasBoss && Math.random() < skillDropRate + awakeDropBonus) dropSkillFn();
        if (Math.random() < petDropRate + awakeDropBonus * 0.5) dropPetFn(wasBoss);

        // Boss额外材料掉落（觉醒阶梯）
        if (wasBoss && awakeBossExtraDrops > 0) {
            for (var edi = 0; edi < awakeBossExtraDrops; edi++) {
                dropMaterialFn();
            }
            Logger.info('觉醒Boss额外掉落:', awakeBossExtraDrops, '个材料');
        }

        if (wasBoss && monsterType && monsterType.id === 'star_devourer') {
            handleStarDevourerDrops(m, monsterType, playerData);
        }

        if (monsterType && monsterType.id === 'slime_king') {
            handleSlimeKingDeathPoison(m, monsterType, playerData);
        }

        var starThief = getStarThief();
        if (monsterType && monsterType.isStarThief && starThief) {
            starThief.handleKill(m, Date.now());
        }

        updateTaskProgress('kill_monsters', 1);
        updateTaskStats('monstersKilled', 1);
        if (m.type === 'boss') {
            dropMaterialFn();
            updateTaskProgress('kill_boss', 1);
        }

        savePlayerDataFn();
        Logger.info('净化邪灵:', (monsterType ? monsterType.name : ''), '累积:', playerData.bossKillCount);
    }

    function handleStarDevourerDrops(m, monsterType, playerData) {
        var drops = monsterType.drops;
        if (!drops) return;

        var Equipments = getEquipments();
        var Skills = getSkillsConfig();
        var Pets = getPets();
        var rarityColors = { 'UC': '#7CCD7C', 'N': '#aaaaaa', 'R': '#4A90D9', 'SR': '#9B59B6', 'SSR': '#FFD700', 'UR': '#E74C3C', 'LR': '#FF6B9D', 'SP': '#00D4FF' };

        if (drops.gold && Array.isArray(drops.gold)) {
            var devGold = drops.gold[0] + Math.floor(Math.random() * (drops.gold[1] - drops.gold[0] + 1));
            playerData.gold += devGold;
            createGoldDropAnimationFn(m.x, m.y - 50, devGold);
        }

        if (drops.equipment && Math.random() < drops.equipmentChance) {
            var equipId = drops.equipment[Math.floor(Math.random() * drops.equipment.length)];
            var equip = Equipments[equipId];
            if (equip) {
                if (!playerData.equipments) playerData.equipments = { owned: [], equipped: {} };
                if (!playerData.equipments.owned) playerData.equipments.owned = [];
                playerData.equipments.owned.push({ id: equipId, rarity: equip.rarity, level: 1 });
                addMessage('获得装备: ' + equip.emoji + equip.name, rarityColors[equip.rarity] || '#FF9ECF', true);
            }
        }

        if (drops.skill && Math.random() < drops.skillChance) {
            var skillId = drops.skill[Math.floor(Math.random() * drops.skill.length)];
            var skill = Skills[skillId];
            if (skill) {
                if (!playerData.skills) playerData.skills = { owned: [], equipped: [] };
                if (!playerData.skills.owned) playerData.skills.owned = [];
                playerData.skills.owned.push({ uid: 'skill_' + Date.now() + '_' + Math.floor(Math.random() * 10000), id: skillId, level: 1 });
                addMessage('获得技能: ' + skill.emoji + skill.name, rarityColors[skill.rarity] || '#FF9ECF', true);
            }
        }

        if (drops.pet && Math.random() < drops.petChance) {
            var petId = drops.pet[Math.floor(Math.random() * drops.pet.length)];
            var pet = Pets[petId];
            if (pet) {
                if (!playerData.pets) playerData.pets = { owned: [], equipped: null };
                if (!playerData.pets.owned) playerData.pets.owned = [];
                if (playerData.pets.owned.indexOf(petId) === -1) {
                    playerData.pets.owned.push(petId);
                    addMessage('获得宠物: ' + pet.emoji + pet.name, rarityColors[pet.rarity] || '#FF9ECF', true);
                }
            }
        }

        if (drops.materials && Math.random() < drops.materialChance) {
            var matId = drops.materials[Math.floor(Math.random() * drops.materials.length)];
            addMaterialToBackpackFn(matId, 1);
        }

        if (drops.devourerResidue && Array.isArray(drops.devourerResidue)) {
            var amount = drops.devourerResidue[0] + Math.floor(Math.random() * (drops.devourerResidue[1] - drops.devourerResidue[0] + 1));
            addMaterialToBackpackFn('devourerResidue', amount);
            addMessage('获得吞噬残辉 x' + amount, '#FF9ECF', true);
        }
    }

    function handleSlimeKingDeathPoison(m, monsterType, playerData) {
        var MonsterSkillType = getMonsterSkillType();
        var deathPoisonSkill = null;
        if (monsterType.skills) {
            for (var dpsi = 0; dpsi < monsterType.skills.length; dpsi++) {
                if (monsterType.skills[dpsi].type === MonsterSkillType.POISON_SPLIT) {
                    deathPoisonSkill = monsterType.skills[dpsi];
                    break;
                }
            }
        }
        if (deathPoisonSkill && spawnPoisonPuddlesFn) {
            var playerEffects = getPlayerEffects();
            var deathDmg = deathPoisonSkill.damage || 20;
            if (playerData.playerShield > 0) {
                var absorb = Math.min(playerData.playerShield, deathDmg);
                playerData.playerShield -= absorb;
                deathDmg -= absorb;
            }
            playerData.playerHp = Math.max(0, playerData.playerHp - deathDmg);
            playerEffects.poisoned = true;
            playerEffects.poisonEndTime = Date.now() + (deathPoisonSkill.poisonDuration || 5) * 1000;
            playerEffects.poisonDamage = deathPoisonSkill.poisonDamage || 8;
            playerEffects.poisonTickTime = Date.now() + 1000;
            var instantKill = !m.hasPoisonSplit;
            var deathSkill = Object.assign({}, deathPoisonSkill);
            if (instantKill) {
                deathSkill.puddleCount = 6;
                addMessage('☠️ 碎瓷聚合体被秒杀! 碎片爆发!', '#00ff00', true);
            } else {
                addMessage('☠️ 碎瓷聚合体临死反扑! 碎片飞溅!', '#00ff00', true);
            }
            spawnPoisonPuddlesFn(m.x || getScreenWidth() / 2, m.y || getScreenHeight() / 3, deathSkill);
        }
    }

    // ═══════════════════════════════════════════════════════
    // 辅助方法
    // ═══════════════════════════════════════════════════════

    function addScore(earned, state, GAME_STATE, isSeasonMode) {
        if (isSeasonMode) {
            setSeasonScore(getSeasonScore() + earned);
        } else if (state === GAME_STATE.STAGE_PLAYING) {
            var stageSys = getStageModeSystem();
            if (stageSys) stageSys.addScore(earned);
        } else {
            setScore(getScore() + earned);
        }
    }

    function calculateCrit(playerData, isSeasonMode, seasonSel) {
        var totalCritRate = 0;
        var baseCritDamage = 2.0;

        if (isSeasonMode && seasonSel && seasonSel.character) {
            var maxLvl = getMaxCharacterLevel();
            var maxLevelStats = getCharacterStatsAtLevel(seasonSel.character, maxLvl);
            totalCritRate = maxLevelStats.critRate || 0;
            baseCritDamage = maxLevelStats.critDamage || 2.0;
        } else {
            var charStats = playerData.currentCharacterId ? getCharacterFullStats(playerData.currentCharacterId) : null;
            var buffs = getActiveBuffs();
            totalCritRate = (charStats ? charStats.critRate : 0) + (buffs.critRateBonus || 0);
            baseCritDamage = charStats ? charStats.critDamage : 2.0;
        }

        var isCritical = totalCritRate > 0 && Math.random() * 100 < totalCritRate;
        return { isCritical: isCritical, critDamageMult: isCritical ? baseCritDamage : 1.0 };
    }

    function handleThiefCrownCrit(playerData) {
        var equippedSetId = playerData.equipments && playerData.equipments.equipped ? playerData.equipments.equipped.set : null;
        if (!equippedSetId || !playerData.equipments || !playerData.equipments.owned) return;
        var setDefId = equippedSetId;
        for (var _si = 0; _si < playerData.equipments.owned.length; _si++) {
            var _sd = playerData.equipments.owned[_si];
            var _sid = _sd.uid || ('idx_' + _si);
            if (_sid === equippedSetId) {
                setDefId = typeof _sd === 'string' ? _sd : (_sd.id || _sd);
                break;
            }
        }
        if (setDefId === 'thief_crown') {
            var healAmt = 5;
            var maxHp = getCharacterFullStats(playerData.currentCharacterId);
            maxHp = maxHp ? maxHp.hp : 100;
            var newHp = Math.min(playerData.playerHp + healAmt, maxHp);
            playerData.playerHp = newHp;
            if (battleEngine) battleEngine.setPlayerState(newHp);
            addMessage('窃灵冠 会心回复 +' + healAmt + '灵能', '#00ff88', true);
        }
    }

    // ═══════════════════════════════════════════════════════
    // 怪物攻击玩家（含闪避修复）
    // ═══════════════════════════════════════════════════════

    function singleMonsterAttack(m) {
        if (m.type === 'star_thief') return;

        var MonsterTypes = getMonsterTypes();
        var MonsterSkillType = getMonsterSkillType();
        var monsterType = MonsterTypes[m.type];
        var isBoss = (monsterType && monsterType.isBoss) || m.type === 'boss';

        if (isBoss && m.id === 'star_devourer') {
            if (incrementBossAttackCountFn()) {
                triggerBossStarSkillFn(m);
            }
        }

        var damage = m.attack || (isBoss ? 20 : 10);
        if (m.rageMultiplier) damage = Math.floor(damage * m.rageMultiplier);

        // 无敌模式：伤害归零
        var pd0 = getPlayerData();
        if (pd0.godMode) damage = 0;

        // 觉醒狂暴：HP低于30%时攻击力增加
        if (m.awakeRage && m.hp <= m.maxHp * 0.3) {
            damage = Math.floor(damage * (1 + m.awakeRage));
            if (!m._awakeRageNotified) {
                m._awakeRageNotified = true;
                addMessage('🔥 邪灵觉醒狂暴！冲击力+' + Math.floor(m.awakeRage * 100) + '%', '#ff4444');
            }
        }

        var score = getScore();
        if (score >= 2000) damage = Math.floor(damage * (isBoss ? 1.5 : 2));

        var doubleResult = triggerMonsterSkillFn(m, MonsterSkillType.DOUBLE_ATTACK);
        if (doubleResult && doubleResult.triggered) {
            damage *= 2;
            addMonsterSkillAnimationFn(m, 'doubleAttack', '连灵!');
        }
        if (m.damageBonus > 0) damage += m.damageBonus;

        var timeDamage = 0; // 被攻击不再减少时间

        createMonsterProjectileAnimationFn(m.x, m.y, damage, timeDamage, isBoss, function() {
            try {
                var GAME_STATE = getGameConst();
                var state = getGameState();
                if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.SEASON_PLAYING && state !== GAME_STATE.STAGE_PLAYING) return;

                var fx = getPlayerEffects();
                if (fx.dodging && Date.now() < fx.dodgeEndTime) {
                    var counterDamage = damage;
                    m.hp = Math.max(0, m.hp - counterDamage);
                    addMessage('💫 闪避成功! -' + counterDamage + '冲击', '#00ff88');
                    vibrateShort({ type: 'medium' });
                    createMeteorAnimation(getScreenWidth() / 2, getScreenHeight() / 2, counterDamage, false, 'dodge', 0, 1, null, null);
                    createMonsterDamageAnimationFn(m, counterDamage);
                    createHpBarCounterAnimationFn();
                    if (m.hp <= 0) {
                        handleMonsterDeath(false, m, state, GAME_STATE, getPlayerData());
                    }
                    fx.dodging = false;
                    fx.dodgeEndTime = 0;
                    return;
                }
                if (fx.dodging && Date.now() >= fx.dodgeEndTime) {
                    fx.dodging = false;
                    fx.dodgeEndTime = 0;
                }

                var pd = getPlayerData();
                var shieldAbsorb = 0;
                if (pd.playerShield > 0) {
                    shieldAbsorb = Math.min(pd.playerShield, damage);
                    pd.playerShield -= shieldAbsorb;
                    damage -= shieldAbsorb;
                }
                var _oldHp6 = pd.playerHp;
                pd.playerHp = Math.max(0, pd.playerHp - damage);
                Logger.info('[HP] monster_atk | -' + damage + ' | ' + _oldHp6 + ' → ' + pd.playerHp + ' | ' + m.type + ' shieldAbsorb:' + shieldAbsorb);

                if (pd.playerHp <= 0) { checkGameOver(); return; }

                if (state === GAME_STATE.STAGE_PLAYING) {
                    setStageDamageTakenFn(getStageDamageTakenFn() + damage);
                }

                if (damage > 0) {
                    setTimeLeftFn(Math.max(0, getTimeLeftFn() - timeDamage));
                }

                if (shieldAbsorb > 0) createPlayerDamageAnimation(shieldAbsorb, false, false, null, true);
                if (damage > 0) {
                    vibrateShort({ type: isBoss ? 'heavy' : 'medium' });
                    createPlayerDamageAnimation(damage, isBoss);
                    if (deps.createTimeDamageAnimation) deps.createTimeDamageAnimation(timeDamage);
                }

                if (m.skills) {
                    for (var si = 0; si < m.skills.length; si++) {
                        if (m.skills[si].type === MonsterSkillType.STUN && Math.random() < (m.skills[si].chance || 0)) {
                            fx.stunned = true;
                            fx.stunEndTime = Date.now() + (m.skills[si].duration || 1000);
                            addMonsterSkillAnimationFn(m, 'stun', '打断!');
                            addMessage('被邪灵打断!', '#ff6b6b');
                            break;
                        }
                    }
                    for (var pi = 0; pi < m.skills.length; pi++) {
                        if (m.skills[pi].type === MonsterSkillType.POISON) {
                            fx.poisoned = true;
                            fx.poisonEndTime = Date.now() + (m.skills[pi].duration || 3) * 1000;
                            fx.poisonDamage = m.skills[pi].damage || 5;
                            fx.poisonTickTime = Date.now() + 1000;
                            var pLabel = pd.playerShield > 0 ? '腐蚀!' : '中毒!';
                            createPlayerDamageAnimation(0, false, true, pLabel);
                            addMessage('☠️ ' + pLabel + ' 每秒-' + (m.skills[pi].damage || 5) + '灵能', '#ff6b6b');
                            break;
                        }
                    }
                    var summonResult = triggerMonsterSkillFn(m, MonsterSkillType.SUMMON);
                    if (summonResult && summonResult.triggered) {
                        var summonSkill = null;
                        for (var ssi = 0; ssi < m.skills.length; ssi++) {
                            if (m.skills[ssi].type === MonsterSkillType.SUMMON) { summonSkill = m.skills[ssi]; break; }
                        }
                        if (summonSkill) {
                            var MonstersConfig = getMonstersConfig();
                            var summonCount = summonSkill.count || 1;
                            var summonedMonster = MonstersConfig[summonSkill.monster];
                            if (summonedMonster) {
                                var shieldGain = (summonedMonster.baseHp || 20) * summonCount * 0.3;
                                m.shield = (m.shield || 0) + Math.floor(shieldGain);
                                var summonDamage = (summonedMonster.baseAttack || 5) * summonCount;
                                pd = getPlayerData();
                                if (pd.playerShield > 0) {
                                    var sAbsorb = Math.min(pd.playerShield, summonDamage);
                                    pd.playerShield -= sAbsorb;
                                    summonDamage -= sAbsorb;
                                }
                                var _oldHp7 = pd.playerHp;
                                pd.playerHp = Math.max(0, pd.playerHp - summonDamage);
                                Logger.info('[HP] summon | -' + summonDamage + ' | ' + _oldHp7 + ' → ' + pd.playerHp + ' | ' + m.type);
                                addMonsterSkillAnimationFn(m, 'summon', '召唤' + summonCount + '只' + summonedMonster.name + '!');
                                addMessage('🌫️ 召唤' + summonCount + '只' + summonedMonster.name + '! -' + summonDamage + '灵能', '#ff6b6b');
                            }
                        }
                    }
                }

                if (isBoss) addMessage('💥 守护灵冲击！-' + damage + '灵能', '#ff6b6b');

                var bossNow = Date.now();
                if (score >= 2000 && m.type === 'boss' && !fx.stunned && bossNow - getLastBossStunTimeFn() >= 5000) {
                    if (Math.random() < getBossStunChanceFn()) {
                        setLastBossStunTimeFn(bossNow);
                        fx.stunned = true;
                        fx.stunEndTime = bossNow + getBossStunDurationFn();
                        addMessage('💥 守护灵打断！无法操作1秒', '#ff6b6b');
                    }
                }

                if (pd.playerHp <= 0) {
                    Logger.info('[HP] game_over | ' + pd.playerHp + ' → 0 | ' + m.type);
                    pd.playerHp = 0; checkGameOver();
                }
            } catch (e) {
                Logger.error('singleMonsterAttack callback 异常:', e.message);
            }
        });
    }

    function monsterAttackPlayer() {
        var GAME_STATE = getGameConst();
        var state = getGameState();
        if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.SEASON_PLAYING && state !== GAME_STATE.STAGE_PLAYING) return;

        var activeMonsters = getActiveMonsters();
        if (activeMonsters.length === 0) return;
        for (var i = 0; i < activeMonsters.length; i++) {
            singleMonsterAttack(activeMonsters[i]);
        }
    }

    function updateMonsterAnimation() {
        var activeMonsters = getActiveMonsters();
        for (var i = 0; i < activeMonsters.length; i++) {
            var m = activeMonsters[i];
            if (m.animationFrame > 0) {
                m.animationFrame--;
                m.scale += 0.02;
                if (m.scale > 1) m.scale = 1;
            }
        }
    }

    function updatePoisonEffect() {
        var fx = getPlayerEffects();
        if (!fx.poisoned) return;
        var pd = getPlayerData();
        var now = Date.now();
        if (now >= fx.poisonEndTime) {
            fx.poisoned = false;
            fx.poisonDamage = 0;
            return;
        }
        if (now >= fx.poisonTickTime) {
            if (pd.godMode) { fx.poisonTickTime = now + 1000; return; }
            var poisonDmg = fx.poisonDamage;
            var shieldAbsorb = 0;
            if (pd.playerShield > 0) {
                shieldAbsorb = Math.min(pd.playerShield, poisonDmg);
                pd.playerShield -= shieldAbsorb;
                poisonDmg -= shieldAbsorb;
            }
            var _oldHp8 = pd.playerHp;
            pd.playerHp = Math.max(0, pd.playerHp - poisonDmg);
            Logger.info('[HP] poison_tick | -' + poisonDmg + ' | ' + _oldHp8 + ' → ' + pd.playerHp);
            fx.poisonTickTime = now + 1000;
            if (shieldAbsorb > 0) createPlayerDamageAnimation(shieldAbsorb, false, false, null, true);
            if (poisonDmg > 0) createPlayerDamageAnimation(poisonDmg, false, true);
            checkGameOver();
        }
    }

    function checkGameOver() {
        if (getTimeLeftFn() <= 0 || getPlayerData().playerHp <= 0) {
            if (deps.endGame) deps.endGame();
        }
    }

    function attackMonsterInternal(damage, isCritical, starType, targetMonster) {
        var m = targetMonster || getActiveMonster();
        if (!m || !m.active) {
            return { success: false, isElementalCombo: false, comboMultiplier: 1, dodged: false, reflected: 0 };
        }

        var starThief = getStarThief();
        if (m.type === 'star_thief' && starThief && !starThief.isBrokenState()) {
            return { success: false, isElementalCombo: false, comboMultiplier: 1, dodged: false, reflected: 0 };
        }

        var MonsterSkillType = getMonsterSkillType();
        var isElementalCombo = false;
        var comboMultiplier = 1;
        var isAbsorbed = false;
        var isDodged = false;
        var reflectedDamage = 0;
        var now = Date.now();

        if (m.absorbType) {
            var shouldAbsorb = m.absorbType === 'all' || m.absorbType === starType;
            if (shouldAbsorb) {
                var absorbRatio = m.absorbRatio || 0.2;
                if (Math.random() < absorbRatio) {
                    isAbsorbed = true;
                    m.empowered = true;
                    m.empowerType = starType;
                    var healAmount = Math.floor(damage * (m.healRate || 0.5));
                    m.hp = Math.min(m.hp + healAmount, m.maxHp);
                    addMonsterSkillAnimationFn(m, 'absorb', '+' + healAmount + ' 灵能');
                    addMessage('邪灵吸收! +' + healAmount + '灵能', '#ff6b6b');
                    vibrateShort({ type: 'heavy' });
                    return { success: true, isElementalCombo: false, comboMultiplier: 0, isAbsorbed: true, dodged: false, reflected: 0 };
                }
            }
        }

        if (m.skills) {
            for (var di = 0; di < m.skills.length; di++) {
                if (m.skills[di].type === MonsterSkillType.DODGE) {
                    if (Math.random() < (m.skills[di].chance || 0)) {
                        isDodged = true;
                        m._dodgeAnimTime = Date.now();
                        addMonsterSkillAnimationFn(m, 'dodge', '闪避!');
                        addMessage('邪灵闪避了灵光冲击!', '#ff6b6b');
                        onMonsterDodgeFn(m);
                        return { success: true, isElementalCombo: false, comboMultiplier: 0, isAbsorbed: false, dodged: true, reflected: 0 };
                    }
                    break;
                }
            }
        }

        if (starType === 'ice' || starType === 'fire') {
            if (m.comboCooldown <= now) {
                if (starType === 'ice') m.lastIceAttackTime = now;
                else m.lastFireAttackTime = now;
                var iceTime = m.lastIceAttackTime;
                var fireTime = m.lastFireAttackTime;
                if (iceTime > 0 && fireTime > 0 && Math.abs(iceTime - fireTime) <= 2000) {
                    isElementalCombo = true;
                    comboMultiplier = 2;
                    m.comboCooldown = now + 2000;
                    m.lastIceAttackTime = 0;
                    m.lastFireAttackTime = 0;
                    setElementalComboStateFn(true, now);
                    vibrateShort({ type: 'heavy' });
                }
            }
        }

        var finalDamage = damage * comboMultiplier;

        if (m.skills) {
            for (var ai = 0; ai < m.skills.length; ai++) {
                if (m.skills[ai].type === MonsterSkillType.ARMOR) {
                    finalDamage = Math.floor(finalDamage * (1 - m.skills[ai].reduction));
                    break;
                }
            }
        }
        if (m.armor > 0) {
            finalDamage = Math.max(1, finalDamage - m.armor);
        }

        if (m.shield > 0) {
            var shieldAbsorb = Math.min(m.shield, finalDamage);
            m.shield -= shieldAbsorb;
            finalDamage -= shieldAbsorb;
            if (shieldAbsorb > 0) addMonsterSkillAnimationFn(m, 'shield', '护盾-' + shieldAbsorb);
        }

        if (m.skills) {
            for (var ri = 0; ri < m.skills.length; ri++) {
                if (m.skills[ri].type === MonsterSkillType.REFLECT) {
                    if (damage > 0) {
                        reflectedDamage = Math.floor(damage * m.skills[ri].ratio);
                        if (reflectedDamage > 0) {
                            var pd = getPlayerData();
                            if (pd.playerShield > 0) {
                                var pAbsorb = Math.min(pd.playerShield, reflectedDamage);
                                pd.playerShield -= pAbsorb;
                                reflectedDamage -= pAbsorb;
                            }
                            var _oldHp9 = pd.playerHp;
                            pd.playerHp = Math.max(0, pd.playerHp - reflectedDamage);
                            Logger.info('[HP] reflect_internal | -' + reflectedDamage + ' | ' + _oldHp9 + ' → ' + pd.playerHp + ' | ' + m.type);
                            addMonsterSkillAnimationFn(m, 'reflect', '反弹' + reflectedDamage);
                        }
                    }
                    break;
                }
            }
        }

        if (finalDamage > 0) {
            m.hp -= finalDamage;
            onMonsterHit(m);
        }

        m.scale = 0.9;
        m.animationFrame = 5;
        if (!isElementalCombo) vibrateShort({ type: 'medium' });

        triggerMonsterSkillFn(m, MonsterSkillType.RAGE);

        if (m.hp > 0 && !m.hasPoisonSplit) {
            var poisonSplitSkill = null;
            if (m.skills) {
                for (var psi = 0; psi < m.skills.length; psi++) {
                    if (m.skills[psi].type === MonsterSkillType.POISON_SPLIT) {
                        poisonSplitSkill = m.skills[psi];
                        break;
                    }
                }
            }
            if (poisonSplitSkill && m.hp <= m.maxHp * poisonSplitSkill.hpThreshold) {
                m.hasPoisonSplit = true;
                var pd2 = getPlayerData();
                var poisonDmg = poisonSplitSkill.damage || 20;
                if (pd2.playerShield > 0) {
                    var psAbsorb = Math.min(pd2.playerShield, poisonDmg);
                    pd2.playerShield -= psAbsorb;
                    poisonDmg -= psAbsorb;
                }
                pd2.playerHp = Math.max(0, pd2.playerHp - poisonDmg);
                var fx = getPlayerEffects();
                fx.poisoned = true;
                fx.poisonEndTime = Date.now() + (poisonSplitSkill.poisonDuration || 5) * 1000;
                fx.poisonDamage = poisonSplitSkill.poisonDamage || 8;
                fx.poisonTickTime = Date.now() + 1000;
                addMonsterSkillAnimationFn(m, 'poison_split', '毒液飞溅!');
                addMessage('☠️ 聚合邪灵溅射碎片! -' + (poisonSplitSkill.damage || 20) + '灵能', '#00ff00', true);
                if (spawnPoisonPuddlesFn) spawnPoisonPuddlesFn(m.x, m.y, poisonSplitSkill);
                vibrateShort({ type: 'heavy' });
            }
        }

        var starDevourerEscaped = getStarDevourerEscaped();
        if (m.id === 'star_devourer' && !starDevourerEscaped && m.hp > 0 && m.hp <= m.maxHp * getStarDevourerEscapeHpRatio()) {
            setStarDevourerEscaped(true);
            var monsters = getMonsters();
            for (var ei = 0; ei < monsters.length; ei++) {
                if (monsters[ei].id === m.id) { monsters.splice(ei, 1); break; }
            }
            var pd3 = getPlayerData();
            pd3.bossKillCount = 0;
            resetBossStarMechanicFn();
            addMonsterSkillAnimationFn(m, 'escape', '遁入灵隙!');
            addMessage('🌀 灵脉吞噬者遁入灵隙，逃离了战斗！', '#ff6b6b');
            vibrateShort({ type: 'heavy' });
            return { success: true, isElementalCombo: isElementalCombo, comboMultiplier: comboMultiplier, isAbsorbed: false, dodged: false, reflected: reflectedDamage, escaped: true };
        }

        if (_afterDamageHook) {
            _afterDamageHook(m, finalDamage);
        }

        return { success: true, isElementalCombo: isElementalCombo, comboMultiplier: comboMultiplier, isAbsorbed: false, dodged: false, reflected: reflectedDamage };
    }

    function useGreedySkill(greedySkillUnlocked) {
        if (!greedySkillUnlocked) {
            addMessage('贪婪技能未解锁', '#ff6b6b');
            return false;
        }
        var pd = getPlayerData();
        var currentHp = pd.playerHp != null ? pd.playerHp : 100;
        if (currentHp <= 1) {
            addMessage('灵核活性不足', '#ff6b6b');
            return false;
        }
        var hpToSacrifice = currentHp - 1;
        var totalDamage = hpToSacrifice * 5;
        Logger.info('[HP] greedy_skill | -' + hpToSacrifice + ' | ' + currentHp + ' → 1');
        pd.playerHp = 1;

        var m = getActiveMonster();
        var state = getGameState();
        var GAME_STATE = getGameConst();

        if (m && m.active) {
            m.hp -= totalDamage;
            if (m.hp <= 0) {
                m.hp = 0;
                onMonsterKilled(m);
            }
        }

        addMessage('🌀 贪婪爆发! -' + hpToSacrifice + '灵能 → ' + totalDamage + '冲击', '#ff6b6b');
        vibrateShort({ type: 'heavy' });
        setTimeout(function() { vibrateShort({ type: 'heavy' }); }, 100);
        setTimeout(function() { vibrateShort({ type: 'heavy' }); }, 200);
        return true;
    }

    function killMonster(isElementalCombo, targetMonster) {
        var m = targetMonster || getActiveMonster();
        if (!m) return;
        var state = getGameState();
        var GAME_STATE = getGameConst();
        var pd = getPlayerData();

        if (state === GAME_STATE.STAGE_PLAYING) {
            if (m.hp > 0) return;
            var monstersArr = getMonsters();
            for (var mi = 0; mi < monstersArr.length; mi++) {
                if (monstersArr[mi].id === m.id) {
                    monstersArr.splice(mi, 1);
                    break;
                }
            }
            var stageSys = getStageModeSystem();
            if (stageSys && stageSys.onMonsterDefeated) {
                stageSys.onMonsterDefeated(m);
            }
            return;
        }

        handleMonsterDeath(isElementalCombo, m, state, GAME_STATE, pd);
    }

    function onMonsterKilled(targetMonster) {
        killMonster(false, targetMonster);
    }

    function addMonster(monster) {}
    function removeMonster(monsterId) {}

    function initTowerEngine(engine, towerConfig) {
        // 塔模式：复用 adapter 统一点击路径，指向塔的 BattleEngine
        active = true;
        battleEngine = engine;
        // 注入 NormalBattleAdapter 扩展钩子
        towerConfig.extensions = {
            onBeforeStarClick: onBeforeStarClickHook,
            getAttackTarget: getAttackTargetHook,
            calculateDamageOverride: calculateDamageOverrideHook,
            onStarHitMonster: onStarHitMonsterHook,
            onScoreEarned: onScoreEarnedHook,
            onStarConsumed: onStarConsumedHook,
            onAfterSpecialStar: onAfterSpecialStarHook,
            preventFinish: true
        };
        engine.init(towerConfig);
        if (onEngineReady) onEngineReady(engine);
        Logger.info('[NormalBattleAdapter] initTowerEngine — 塔模式统一路径');
    }

    function releaseEngine() {
        if (!active || !battleEngine) return;
        active = false;
        battleEngine = null;
        _afterDamageHook = null;
        Logger.info('[NormalBattleAdapter] releaseEngine — 释放外部引擎引用');
    }

    function initBossEngine(engine, bossConfig, afterDamageHook) {
        active = true;
        battleEngine = engine;
        _afterDamageHook = afterDamageHook || null;
        bossConfig.extensions = {
            onBeforeStarClick: onBeforeStarClickHook,
            getAttackTarget: getAttackTargetHook,
            calculateDamageOverride: calculateDamageOverrideHook,
            onStarHitMonster: onStarHitMonsterHook,
            onScoreEarned: onScoreEarnedHook,
            onStarConsumed: onStarConsumedHook,
            onAfterSpecialStar: onAfterSpecialStarHook,
            preventFinish: true
        };
        engine.init(bossConfig);
        if (onEngineReady) onEngineReady(engine);
        Logger.info('[NormalBattleAdapter] initBossEngine — Boss 模式统一路径');
    }

    return {
        init: init,
        destroy: destroy,
        update: update,
        handleStarClick: handleStarClick,
        attackMonster: attackMonsterInternal,
        singleMonsterAttack: singleMonsterAttack,
        monsterAttackPlayer: monsterAttackPlayer,
        updateMonsterAnimation: updateMonsterAnimation,
        updatePoisonEffect: updatePoisonEffect,
        checkGameOver: checkGameOver,
        useGreedySkill: useGreedySkill,
        killMonster: killMonster,
        onMonsterKilled: onMonsterKilled,
        addMonster: addMonster,
        removeMonster: removeMonster,
        isActive: isActive,
        initTowerEngine: initTowerEngine,
        initBossEngine: initBossEngine,
        releaseEngine: releaseEngine,
        getBattleEngine: function() { return battleEngine; },
        calculateCrit: calculateCrit,
        cancelPendingVictory: function() {
            if (_pendingVictoryTimeout) {
                clearTimeout(_pendingVictoryTimeout);
                _pendingVictoryTimeout = null;
            }
        }
    };
}

export { createNormalBattleAdapter };
