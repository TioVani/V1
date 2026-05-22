/**
 * GameBattleRenderer — 核心战斗渲染函数
 *
 * 从 game.js renderGame() 提取，包含所有战斗模式的渲染逻辑：
 * - 普通模式、Boss模式、塔模式、闯关模式、赛季模式
 * - 背景、UI、星星、怪物、动画、技能栏等全部绘制
 * - 状态同步（combo star attacks, poison ticks, monster spawn checks）
 */
import { createDelayedHpTracker } from '../utils/DelayedHpTracker.js';
var _battleHpTracker = createDelayedHpTracker();
function createGameBattleRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };
    var DESIGN_HEIGHT = 812;
    var uiCore = deps.uiCore;
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getStrokeRoundRect = deps.getStrokeRoundRect;
    var getGachaRoundRect = deps.getGachaRoundRect;
    // State accessors
    var getState = deps.getState;
    var getGameState = deps.getGameState;
    var getPlayerData = deps.getPlayerData;
    var getScore = deps.getScore;
    var getTimeLeft = deps.getTimeLeft;
    var getBestScore = deps.getBestScore;
    var getStarMode = deps.getStarMode;
    var getStarSystem = deps.getStarSystem;
    var getComboSystem = deps.getComboSystem;
    var getPetSystem = deps.getPetSystem;
    var getActiveMonsters = deps.getActiveMonsters;
    var getCombatState = deps.getCombatState;
    var getPlayerEffects = deps.getPlayerEffects;
    var getUiScrollState = deps.getUiScrollState;
    var getBossBattleMode = deps.getBossBattleMode;
    var getNormalBattleAdapter = deps.getNormalBattleAdapter;
    var getTowerSystem = deps.getTowerSystem;
    var getBossBattleSystem = deps.getBossBattleSystem;
    var getBossStarSystem = deps.getBossStarSystem;
    var getStageModeSystem = deps.getStageModeSystem;
    var getCombatFeatures = deps.getCombatFeatures;
    var getStarThief = deps.getStarThief;
    var getAnimationSystem = deps.getAnimationSystem;
    var _combatFontConfig = deps.combatFontConfig || function() { return null; };
    function getFont(token, sc, extra) {
        var cfg = _combatFontConfig();
        if (cfg) return cfg.getFont(token, sc, extra);
        return '16px sans-serif';
    }
    var getSEASON_STAR_TYPES = deps.getSEASON_STAR_TYPES;
    // Animation bridges
    var getUpdatePoisonEffect = deps.getUpdatePoisonEffect;
    var getDrawPoisonEffect = deps.getDrawPoisonEffect;
    var getUpdateCritAnimations = deps.getUpdateCritAnimations;
    var getDrawCritAnimations = deps.getDrawCritAnimations;
    var getUpdateQuickTapAnimations = deps.getUpdateQuickTapAnimations;
    var getDrawQuickTapAnimations = deps.getDrawQuickTapAnimations;
    var getUpdateMeteorAnimations = deps.getUpdateMeteorAnimations;
    var getDrawMeteorAnimations = deps.getDrawMeteorAnimations;
    var getUpdateMeteorExplosions = deps.getUpdateMeteorExplosions;
    var getDrawMeteorExplosions = deps.getDrawMeteorExplosions;
    var getUpdateMonsterProjectileAnimations = deps.getUpdateMonsterProjectileAnimations;
    var getDrawMonsterProjectileAnimations = deps.getDrawMonsterProjectileAnimations;
    var getDrawGameMessages = deps.getDrawGameMessages;
    var getUpdateStarBurstAnimations = deps.getUpdateStarBurstAnimations;
    var getDrawStarBurstAnimations = deps.getDrawStarBurstAnimations;
    var getUpdateHpBarCounterAnimations = deps.getUpdateHpBarCounterAnimations;
    var getDrawHpBarCounterAnimations = deps.getDrawHpBarCounterAnimations;
    var getUpdatePlayerDamageAnimations = deps.getUpdatePlayerDamageAnimations;
    var getDrawPlayerDamageAnimations = deps.getDrawPlayerDamageAnimations;
    var getUpdateMonsterDamageAnimations = deps.getUpdateMonsterDamageAnimations;
    var getDrawMonsterDamageAnimations = deps.getDrawMonsterDamageAnimations;
    var getDrawMonsterSkillAnimations = deps.getDrawMonsterSkillAnimations;
    var getUpdateMonsterSkillAnimations = deps.getUpdateMonsterSkillAnimations;
    var getUpdateTimeDamageAnimations = deps.getUpdateTimeDamageAnimations;
    var getDrawTimeDamageAnimations = deps.getDrawTimeDamageAnimations;
    // STAR_MODE and other configs
    var STAR_MODE = deps.STAR_MODE;
    var MAX_STARS_ON_SCREEN = deps.MAX_STARS_ON_SCREEN;
    var BASE_STAR_INTERVAL = deps.BASE_STAR_INTERVAL;
    var MIN_STAR_INTERVAL = deps.MIN_STAR_INTERVAL;
    var FALLING_CONFIG = deps.FALLING_CONFIG;
    var SEASON_STAR_TYPES = deps.SEASON_STAR_TYPES;
    // Additional function bridges
    var checkComboTimeout = deps.checkComboTimeout;
    var updateFallingStars = deps.updateFallingStars;
    var checkMonsterAppear = deps.checkMonsterAppear;
    var updateSkillEffects = deps.updateSkillEffects;
    var attackMonster = deps.attackMonster;
    var updateMonsterAnimation = deps.updateMonsterAnimation;
    var updateGoldDropAnimations = deps.updateGoldDropAnimations;
    var drawGoldDropAnimations = deps.drawGoldDropAnimations;
    var updateSkillDamageAnimations = deps.updateSkillDamageAnimations;
    var drawSkillDamageAnimations = deps.drawSkillDamageAnimations;
    var updatePetDamageAnimations = deps.updatePetDamageAnimations;
    var drawPetDamageAnimations = deps.drawPetDamageAnimations;
    var drawElementalComboEffect = deps.drawElementalComboEffect;
    var updatePoisonEffect = deps.updatePoisonEffect;
    var getMonster = deps.getMonster;
    var getStars = deps.getStars;
    var getSeasonScore = deps.getSeasonScore;
    var getPlayerHp = deps.getPlayerHp;
    // State setters (for tower mode sync)
    var setStars = deps.setStars;
    var setMonsters = deps.setMonsters;
    var setTimeLeft = deps.setTimeLeft;
    // Shared state objects
    var comboState = deps.comboState;
    // Config objects
    var Skills = deps.Skills;
    var SkillTypes = deps.SkillTypes;
    var COMBO_STAR_DURATION = deps.COMBO_STAR_DURATION;
    var COMBO_STAR_INTERVAL = deps.COMBO_STAR_INTERVAL;
    var GREEDY_SKILL_THRESHOLD = deps.GREEDY_SKILL_THRESHOLD;
    var MAX_AD_ITEMS = deps.MAX_AD_ITEMS;
    // Game state getters
    var getGameItems = deps.getGameItems;
    var getAdItems = deps.getAdItems;
    // Function bridges
    var tipShowTipOnce = deps.tipShowTipOnce;
    var getCharacterFullStats = deps.getCharacterFullStats;
    var calculateCritFn = deps.calculateCritFn;
    var getActiveMonster = deps.getActiveMonster;
    var createMeteorAnimation = deps.createMeteorAnimation;
    var getSkillRemainingCooldown = deps.getSkillRemainingCooldown;
    var getCurrentCharacterConfig = deps.getCurrentCharacterConfig;
    var cleanupExpiredStars = deps.cleanupExpiredStars;
    var updatePoisonPuddles = deps.updatePoisonPuddles;
    var drawPoisonPuddles = deps.drawPoisonPuddles;
    var renderPausedMenu = deps.renderPausedMenu;
    var drawMonster = deps.drawMonster;
    var _log = deps._log;
    var getBirthTransform = deps.getBirthTransform;

    // uiCore helpers
    var drawStar = uiCore.drawStar;
    var drawText = uiCore.drawText;
    var drawButton = uiCore.drawButton;
    var drawBackButton = uiCore.drawBackButton;

    // D2-D5 战斗维度系统
    var getRhythmSystem = deps.getRhythmSystem || function () { return null; };
    var getChargeSystem = deps.getChargeSystem || function () { return null; };
    var getDragSystem = deps.getDragSystem || function () { return null; };
    var getLinkChainSystem = deps.getLinkChainSystem || function () { return null; };
    var getSaturationState = deps.getSaturationState || function () { return null; };

    function renderGame() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var Assets = getAssets();
        var playerData = getPlayerData();
        var fillRoundRect = getFillRoundRect();
        var strokeRoundRect = getStrokeRoundRect();
        var gachaRoundRect = getGachaRoundRect();
        var state = getState();
        var GAME_STATE = getGameState();
        var monster = getMonster();
        var stars = getStars();
        var seasonScore = getSeasonScore();
        var gameItems = getGameItems();
        var adItems = getAdItems();
        // Animation bridge extractions (getter → local function ref)
        var updateCritAnimations = getUpdateCritAnimations();
        var drawCritAnimations = getDrawCritAnimations();
        var updateQuickTapAnimations = getUpdateQuickTapAnimations();
        var drawQuickTapAnimations = getDrawQuickTapAnimations();
        var updateMeteorAnimations = getUpdateMeteorAnimations();
        var drawMeteorAnimations = getDrawMeteorAnimations();
        var updateMeteorExplosions = getUpdateMeteorExplosions();
        var drawMeteorExplosions = getDrawMeteorExplosions();
        var updateMonsterProjectileAnimations = getUpdateMonsterProjectileAnimations();
        var drawMonsterProjectileAnimations = getDrawMonsterProjectileAnimations();
        var drawGameMessages = getDrawGameMessages();
        var updateStarBurstAnimations = getUpdateStarBurstAnimations();
        var drawStarBurstAnimations = getDrawStarBurstAnimations();
        var updateHpBarCounterAnimations = getUpdateHpBarCounterAnimations();
        var drawHpBarCounterAnimations = getDrawHpBarCounterAnimations();
        var updatePlayerDamageAnimations = getUpdatePlayerDamageAnimations();
        var drawPlayerDamageAnimations = getDrawPlayerDamageAnimations();
        var updateMonsterDamageAnimations = getUpdateMonsterDamageAnimations();
        var drawMonsterDamageAnimations = getDrawMonsterDamageAnimations();
        var drawMonsterSkillAnimations = getDrawMonsterSkillAnimations();
        var updateMonsterSkillAnimations = getUpdateMonsterSkillAnimations();
        var updateTimeDamageAnimations = getUpdateTimeDamageAnimations();
        var drawTimeDamageAnimations = getDrawTimeDamageAnimations();

        // === Boss/塔模式状态同步 ===
        var _isBoss = (state === GAME_STATE.BOSS_BATTLE);
        var _isTower = (state === GAME_STATE.TOWER_COMBAT);
        var _cf = getCombatFeatures();
        var _paused = (state === GAME_STATE.PAUSED);
        var _bossPaused = false;
        if (_isBoss) {
            var _bbs = getBossBattleSystem();
            _bossPaused = _bbs && _bbs.getIsPaused && _bbs.getIsPaused();
        }
        if (_bossPaused) _paused = true;

        if (_isBoss) {
            // Boss模式：同步 BattleEngine 状态到 game.js 全局变量
            var BossBattleMode = getBossBattleMode();
            BossBattleMode.update();
        }

        // === 普通/赛季/闯关模式状态同步（Phase 0: 空操作） ===
        var normalBattleAdapter = getNormalBattleAdapter();
        if ((state === GAME_STATE.PLAYING || state === GAME_STATE.SEASON_PLAYING || state === GAME_STATE.STAGE_PLAYING) && normalBattleAdapter) {
            normalBattleAdapter.update();
        }

        if (_isTower) {
            var towerSystem = getTowerSystem();
            // 塔战斗：同步塔战斗数据到 game.js 全局变量
            if (towerSystem.victoryPopup) {
                // 有胜利弹窗时只渲染弹窗
                var popup = towerSystem.victoryPopup;
                ctx.save();
                ctx.globalAlpha = popup.alpha;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, screenWidth, screenHeight);
                var boxWidth = screenWidth * 0.75;
                var boxHeight = Math.floor(180 * scale);
                var boxX = (screenWidth - boxWidth) / 2;
                var boxY = (screenHeight - boxHeight) / 2;
                ctx.fillStyle = '#1a1a2e';
                fillRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, 15);
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                strokeRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, 15);
                ctx.fillStyle = '#FFD700';
                ctx.font = getFont('victory', scale);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🎉 战斗胜利！', screenWidth / 2, boxY + Math.floor(40 * scale));
                ctx.fillStyle = '#ffffff';
                ctx.font = getFont('reward', scale);
                var rewardY = boxY + Math.floor(80 * scale);
                if (popup.gold > 0) {
                    ctx.textAlign = 'center';
                    ctx.fillText('💰 灵币 +' + popup.gold, screenWidth / 2, rewardY);
                    rewardY += Math.floor(28 * scale);
                }
                if (popup.exp > 0) {
                    ctx.textAlign = 'center';
                    ctx.fillText('&#x2728; 感悟 +' + popup.exp, screenWidth / 2, rewardY);
                    rewardY += Math.floor(28 * scale);
                }
                if (popup.material) {
                    var matNames = {
                        'iceCrystal': '💧 水灵晶',
                        'fireSource': '🔥 火灵源',
                        'critCrystal': '💠 水灵暴晶',
                        'critFireSource': '💥 火灵爆源',
                        'devourerResidue': '✨ 吞噬残辉'
                    };
                    ctx.fillText(matNames[popup.material.id] + ' x' + popup.material.amount, screenWidth / 2, rewardY);
                }
                ctx.restore();
                return;
            }

            if (!towerSystem.combatMonster) return;
            towerSystem.updateCombatTick();

            // 星星由 StarSystem 统一管理到 game.js stars[]
            // 不再从 BattleEngine/combatStars 同步
            var tMon = towerSystem.combatMonster;
            if (tMon) {
                var tMonCopy = Object.assign({}, tMon);
                tMonCopy._isCopy = true;
                tMonCopy.active = true;
                // 塔模式怪物可能没有位置，设置默认位置（屏幕中央偏上）
                if (!tMonCopy.x) tMonCopy.x = screenWidth / 2;
                if (!tMonCopy.y) tMonCopy.y = designOffsetY + Math.floor(DESIGN_HEIGHT / 3 * scale);
                if (!tMonCopy.size) tMonCopy.size = 60 * scale;
                if (!tMonCopy.scale) tMonCopy.scale = 1;
                setMonsters([tMonCopy]);
            } else {
                setMonsters([]);
            }
            // 优先从 BattleEngine 读取实时战斗状态（隐藏之路 Boss 不走 BattleEngine）
            if (towerSystem.battleEngine && !towerSystem.isHiddenPathBoss) {
                var _es = towerSystem.battleEngine.getState();
                playerData.playerHp = _es.playerHp;
                playerData.maxPlayerHp = _es.playerMaxHp;
                playerData.playerShield = _es.playerShield;
                var playerEffects = getPlayerEffects();
                playerEffects.stunned = _es.isStunned;
                playerEffects.stunEndTime = _es.stunEndTime;
                var _ct = _es.timeLeft != null ? _es.timeLeft : (towerSystem.combatTime || 0);
                setTimeLeft(_ct);
            } else {
                playerData.playerHp = towerSystem.playerHp != null ? towerSystem.playerHp : playerData.playerHp;
                playerData.maxPlayerHp = towerSystem.playerMaxHp || playerData.maxPlayerHp;
                playerData.playerShield = towerSystem.playerShield || 0;
                var playerEffects = getPlayerEffects();
                playerEffects.stunned = towerSystem.playerStunned || false;
                playerEffects.stunEndTime = towerSystem.playerStunEndTime || 0;
                setTimeLeft(towerSystem.combatTime || 0);
            }
        }

        // === 以下为所有模式共享的逻辑 ===

        // 连击超时检查（每帧都检查，不只是怪物出现时）
        if (!_isTower && !_paused) {
            checkComboTimeout();
        }

        // 更新毒素效果（仅Boss模式通过BattleEngine管理，塔模式不需要）
        if (!_isBoss && !_isTower) {
            updatePoisonEffect();
        }

        // 检查是否出现怪物（仅普通/闯关/赛季模式自动生成怪物）
        if (!_isBoss && !_isTower) {
            var hadMonsterBefore = monster && monster.active;
            checkMonsterAppear();
            if (!hadMonsterBefore && monster && monster.active) {
                if (monster.isBoss) {
                    tipShowTipOnce('first_boss', '守护灵来了！它更强但净化后奖励丰厚');
                } else {
                    tipShowTipOnce('first_monster', '邪灵出现了！触碰灵光可以净化它');
                }
            }
        }

        // 低血量提示（仅普通模式）
        if (!_isBoss && !_isTower) {
            if (playerData.playerHp > 0 && playerData.playerHp < (playerData.maxPlayerHp || 100) * 0.3) {
                tipShowTipOnce('low_hp', '灵核濒危！可以携带治疗和防御类灵光哦');
            }
        }

        // 连击星星效果更新（所有模式统一路径）
        var combatState = getCombatState();
        if (combatState.comboStarActive) {
            const now = Date.now();
            const elapsed = now - combatState.comboStarStartTime;

            // 检查是否已过期
            if (elapsed >= COMBO_STAR_DURATION) {
                combatState.comboStarActive = false;
                _log('连击星星效果结束');
            } else if (monster && monster.active) {
                // 检查是否需要发射攻击
                const timeSinceLastAttack = now - combatState.comboStarLastAttackTime;
                if (timeSinceLastAttack >= COMBO_STAR_INTERVAL) {
                    // 发射一次攻击
                    combatState.comboStarLastAttackTime = now;

                    // 计算攻击伤害（含暴击判定）
                    const charStats = getCharacterFullStats(playerData.currentCharacterId);
                    var attackDamage = charStats ? charStats.attack : 10;
                    var isCrit = false;
                    if (calculateCritFn) {
                        var critResult = calculateCritFn();
                        if (critResult.isCritical) {
                            attackDamage = Math.floor(attackDamage * critResult.critDamageMult);
                            isCrit = true;
                        }
                    }

                    // 创建流星动画
                    var targetMon = null;
                    if (_isTower) {
                        var ts = getTowerSystem();
                        targetMon = ts ? ts.combatMonster : null;
                    } else {
                        targetMon = getActiveMonster ? getActiveMonster() : null;
                    }
                    var startX, startY;
                    if (combatState.comboStarOriginX != null) {
                        // 第一颗：从连击星星位置发射到怪物
                        startX = combatState.comboStarOriginX;
                        startY = combatState.comboStarOriginY;
                        combatState.comboStarOriginX = null;
                        combatState.comboStarOriginY = null;
                    } else {
                        // 后续：从怪物附近随机位置发射
                        var baseY = targetMon && targetMon.y ? targetMon.y + screenHeight * 0.25 : screenHeight * 0.55;
                        startX = screenWidth / 2 + (Math.random() - 0.5) * screenWidth * 0.25;
                        startY = baseY + (Math.random() - 0.5) * screenHeight * 0.1;
                    }
                    createMeteorAnimation(startX, startY, attackDamage, isCrit, 'combo', 0, 1, null);

                    // 统一伤害路由：所有模式走 attackMonster
                    attackMonster(attackDamage, isCrit, 'combo', targetMon);

                    // 击杀处理
                    if (_isTower && targetMon && targetMon.hp <= 0) {
                        var ts2 = getTowerSystem();
                        if (ts2) ts2.defeatMonster();
                    }

                    // 剩余时间提示（每秒显示一次）
                    const remainingTime = Math.ceil((COMBO_STAR_DURATION - elapsed) / 1000);
                    if (remainingTime !== combatState.comboStarLastRemainingTime) {
                        combatState.comboStarLastRemainingTime = remainingTime;
                    }
                }
            }
        }

        // 根据分数选择战斗背景图（2000分解锁第二张背景）
        var score = getScore();
        var useSecondBg = !_isTower && score >= 2000 && Assets.fightBgImage2;
        var bgImage = _isTower ? (Assets.fightBg1 || Assets.fightBgImage || Assets.backgroundImage)
            : (useSecondBg ? Assets.fightBgImage2 : (Assets.fightBgImage || Assets.backgroundImage));
        var bgCacheKey = _isTower ? 'towerFightBgCache' : (useSecondBg ? 'fightBgPositionCache2' : 'fightBgPositionCache');
        var bgCache = Assets[bgCacheKey];

        // 绘制背景图片
        if (bgImage && bgImage.complete) {
            // 检查是否需要重新计算位置（屏幕尺寸变化或首次渲染）
            if (!bgCache ||
                bgCache.screenWidth !== screenWidth ||
                bgCache.screenHeight !== screenHeight) {

                const imgRatio = bgImage.width / bgImage.height;
                const screenRatio = screenWidth / screenHeight;

                let drawWidth, drawHeight, drawX, drawY;

                if (imgRatio > screenRatio) {
                    // 图片更宽，以高度为基准
                    drawHeight = screenHeight;
                    drawWidth = screenHeight * imgRatio;
                    drawX = (screenWidth - drawWidth) / 2;
                    drawY = 0;
                } else {
                    // 图片更高，以宽度为基准
                    drawWidth = screenWidth;
                    drawHeight = screenWidth / imgRatio;
                    drawX = 0;
                    drawY = (screenHeight - drawHeight) / 2;
                }

                // 缓存计算结果
                Assets[bgCacheKey] = {
                    screenWidth: screenWidth,
                    screenHeight: screenHeight,
                    drawX: drawX,
                    drawY: drawY,
                    drawWidth: drawWidth,
                    drawHeight: drawHeight
                };
            }

            // 使用缓存的位置绘制
            const cache = Assets[bgCacheKey];
            ctx.drawImage(bgImage, cache.drawX, cache.drawY, cache.drawWidth, cache.drawHeight);

            // 添加半透明遮罩，使背景变暗，文字更清晰
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
        } else {
            // 使用纯色背景
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
        }

        // 暂停按钮（左上角）
        const pauseBtnSize = Math.floor(50 * scale);
        ctx.fillStyle = '#4a4a6a';
        fillRoundRect(ctx, 15, 15, pauseBtnSize, pauseBtnSize, 4);
        ctx.fillStyle = '#ffffff';
        ctx.font = getFont('pause', scale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⏸', 15 + pauseBtnSize/2, 15 + pauseBtnSize/2);

        // 道具快捷使用按钮（暂停按钮下方）- 赛季模式禁用，Boss/塔模式无道具按钮
        const isSeasonMode = (state === GAME_STATE.SEASON_PLAYING);
        if (!isSeasonMode && _cf.itemButtons) {
        const itemBtnSize = Math.floor(45 * scale);
        const itemBtnY = 75;

        // 治疗药水按钮
        var healCount = gameItems.healPotion;
        var healAdLeft = MAX_AD_ITEMS - adItems.healPotion;  // 剩余广告次数
        if (healCount > 0) {
            // 有道具时显示道具按钮
            ctx.fillStyle = '#2d5a3d';
            fillRoundRect(ctx, 15, itemBtnY, itemBtnSize, itemBtnSize, 4);
            ctx.font = Math.floor(24 * scale) + 'px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('🧪', 15 + itemBtnSize/2, itemBtnY + itemBtnSize/2);
            ctx.font = getFont('itemCount', scale);
            ctx.fillStyle = '#ffd700';
            ctx.fillText('x' + healCount, 15 + itemBtnSize - 5, itemBtnY + itemBtnSize - 5);
        } else if (healAdLeft > 0) {
            // 道具用完但有广告次数时显示广告按钮
            ctx.fillStyle = '#8B4513';  // 棕色表示广告
            fillRoundRect(ctx, 15, itemBtnY, itemBtnSize, itemBtnSize, 4);
            ctx.font = Math.floor(18 * scale) + 'px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('📹', 15 + itemBtnSize/2, itemBtnY + itemBtnSize/2 - 5);
            ctx.font = 'bold ' + Math.floor(10 * scale) + 'px sans-serif';
            ctx.fillStyle = '#ffd700';
            ctx.fillText('x' + healAdLeft, 15 + itemBtnSize - 5, itemBtnY + itemBtnSize - 5);
        } else {
            // 道具和广告次数都用完时显示灰色
            ctx.fillStyle = '#3a3a3a';
            fillRoundRect(ctx, 15, itemBtnY, itemBtnSize, itemBtnSize, 4);
            ctx.font = Math.floor(24 * scale) + 'px sans-serif';
            ctx.fillStyle = '#666666';
            ctx.fillText('🧪', 15 + itemBtnSize/2, itemBtnY + itemBtnSize/2);
        }

        // 时间药水按钮
        var timeCount = gameItems.timePotion;
        var timeAdLeft = MAX_AD_ITEMS - adItems.timePotion;  // 剩余广告次数
        const timeBtnY = itemBtnY + itemBtnSize + Math.floor(8 * scale);
        if (timeCount > 0) {
            // 有道具时显示道具按钮
            ctx.fillStyle = '#3d3d5a';
            fillRoundRect(ctx, 15, timeBtnY, itemBtnSize, itemBtnSize, 4);
            ctx.font = Math.floor(24 * scale) + 'px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('⏳', 15 + itemBtnSize/2, timeBtnY + itemBtnSize/2);
            ctx.font = getFont('itemCount', scale);
            ctx.fillStyle = '#ffd700';
            ctx.fillText('x' + timeCount, 15 + itemBtnSize - 5, timeBtnY + itemBtnSize - 5);
        } else if (timeAdLeft > 0) {
            // 道具用完但有广告次数时显示广告按钮
            ctx.fillStyle = '#8B4513';  // 棕色表示广告
            fillRoundRect(ctx, 15, timeBtnY, itemBtnSize, itemBtnSize, 4);
            ctx.font = Math.floor(18 * scale) + 'px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('📹', 15 + itemBtnSize/2, timeBtnY + itemBtnSize/2 - 5);
            ctx.font = 'bold ' + Math.floor(10 * scale) + 'px sans-serif';
            ctx.fillStyle = '#ffd700';
            ctx.fillText('x' + timeAdLeft, 15 + itemBtnSize - 5, timeBtnY + itemBtnSize - 5);
        } else {
            // 道具和广告次数都用完时显示灰色
            ctx.fillStyle = '#3a3a3a';
            fillRoundRect(ctx, 15, timeBtnY, itemBtnSize, itemBtnSize, 4);
            ctx.font = Math.floor(24 * scale) + 'px sans-serif';
            ctx.fillStyle = '#666666';
            ctx.fillText('⏳', 15 + itemBtnSize/2, timeBtnY + itemBtnSize/2);
        }
        } // 结束赛季模式道具按钮条件

        // 时序星主动技能按钮（只有解锁了时序星且装备到编队且有怪物时才显示）
        const hasTimeStarUnlocked = playerData.unlockedStarTypes && playerData.unlockedStarTypes.indexOf('time') !== -1;
        const hasTimeStarEquipped = playerData.equippedStars && playerData.equippedStars.indexOf('time') !== -1;
        const hasTimeStar = hasTimeStarUnlocked && hasTimeStarEquipped;
        var timeLeft = getTimeLeft();
        if (hasTimeStar && monster.active && !isSeasonMode && _cf.itemButtons) {
            const skillBtnSize = Math.floor(45 * scale);
            const skillBtnY = 75 + (Math.floor(45 * scale) + 5) * 2 + 5; // 在道具按钮下方

            // 计算可消耗的时间（总时间 - 30秒）
            const consumableTime = Math.max(0, timeLeft - 30);
            const potentialDamage = consumableTime * 2; // 每秒×2伤害

            if (consumableTime > 0) {
                // 有可消耗时间，显示可用技能按钮
                ctx.fillStyle = '#5a3d5a'; // 紫色表示时序星技能
                fillRoundRect(ctx, 15, skillBtnY, skillBtnSize, skillBtnSize, 4);
                ctx.font = Math.floor(24 * scale) + 'px sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('⏰', 15 + skillBtnSize/2, skillBtnY + skillBtnSize/2);
                ctx.font = 'bold ' + Math.floor(10 * scale) + 'px sans-serif';
                ctx.fillStyle = '#ffd700';
                ctx.fillText(Math.floor(potentialDamage), 15 + skillBtnSize - 5, skillBtnY + skillBtnSize - 5);
            } else {
                // 时间不足30秒，显示灰色禁用按钮
                ctx.fillStyle = '#3a3a3a';
                fillRoundRect(ctx, 15, skillBtnY, skillBtnSize, skillBtnSize, 4);
                ctx.font = Math.floor(24 * scale) + 'px sans-serif';
                ctx.fillStyle = '#666666';
                ctx.fillText('⏰', 15 + skillBtnSize/2, skillBtnY + skillBtnSize/2);
            }
        }

        // 贪婪技能按钮（只有解锁了贪婪星星且装备到编队才显示相关UI）
        const hasGreedyStarUnlocked = playerData.unlockedStarTypes && playerData.unlockedStarTypes.indexOf('greedy') !== -1;
        const hasGreedyStarEquipped = playerData.equippedStars && playerData.equippedStars.indexOf('greedy') !== -1;
        const hasGreedyStar = hasGreedyStarUnlocked && hasGreedyStarEquipped;
        if (hasGreedyStar && !isSeasonMode && _cf.greedySkill) {
            const greedyBtnSize = Math.floor(45 * scale);
            const greedyBtnY = 75 + (Math.floor(45 * scale) + 5) * 3 + 5; // 在时序星技能按钮下方

            if (combatState.greedySkillUnlocked) {
                // 已解锁，显示可用技能按钮
                const currentHp = playerData.playerHp != null ? playerData.playerHp : 100;
                const potentialDamage = (currentHp - 1) * 5;

                ctx.fillStyle = '#8b0000'; // 深红色表示贪婪技能
                fillRoundRect(ctx, 15, greedyBtnY, greedyBtnSize, greedyBtnSize, 4);
                ctx.font = Math.floor(24 * scale) + 'px sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('🌀', 15 + greedyBtnSize/2, greedyBtnY + greedyBtnSize/2);
                ctx.font = 'bold ' + Math.floor(10 * scale) + 'px sans-serif';
                ctx.fillStyle = '#ffd700';
                ctx.fillText(Math.floor(potentialDamage), 15 + greedyBtnSize - 5, greedyBtnY + greedyBtnSize - 5);
            } else {
                // 未解锁，显示进度
                ctx.fillStyle = '#4a2020'; // 暗红色
                fillRoundRect(ctx, 15, greedyBtnY, greedyBtnSize, greedyBtnSize, 4);
                ctx.font = Math.floor(20 * scale) + 'px sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('🌀', 15 + greedyBtnSize/2, greedyBtnY + greedyBtnSize/2);
                ctx.font = 'bold ' + Math.floor(9 * scale) + 'px sans-serif';
                ctx.fillStyle = '#ffd700';
                ctx.fillText(combatState.greedyHpPool + '/' + GREEDY_SKILL_THRESHOLD, 15 + greedyBtnSize/2, greedyBtnY + greedyBtnSize - 3);
            }
        }

        // ==================== 技能栏UI ====================
        // 显示已装备的主动技能（非赛季模式）- 右侧圆形标签样式
        if (!isSeasonMode && getCombatFeatures().skillBar && playerData.skills && playerData.skills.equipped) {
            const equippedSkills = playerData.skills.equipped;
            // 过滤出主动技能（攻击和辅助）
            const activeSkills = equippedSkills.filter(skillId => {
                const skill = Skills[skillId];
                return skill && (skill.type === SkillTypes.ATTACK || skill.type === SkillTypes.SUPPORT);
            });

            if (activeSkills.length > 0) {
                // 圆形标签配置（类似背包右侧标签，大小减半）
                const circleRadius = Math.floor(22 * scale);  // 圆形半径（约为原来50的一半）
                const circleGap = Math.floor(8 * scale);      // 圆形间距
                const startX = screenWidth - circleRadius - Math.floor(5 * scale);  // 贴右边缘
                // 从下方开始计算位置（向上排列）
                const totalHeight = activeSkills.length * (circleRadius * 2) + (activeSkills.length - 1) * circleGap;
                const startY = screenHeight - totalHeight - Math.floor(100 * scale);  // 距底部100像素

                // 绘制每个技能圆形标签
                activeSkills.forEach((skillId, index) => {
                    const skill = Skills[skillId];
                    const centerX = startX;
                    const centerY = startY + index * (circleRadius * 2 + circleGap) + circleRadius;

                    // 获取冷却状态
                    const remainingCooldown = getSkillRemainingCooldown(skillId);
                    const isReady = remainingCooldown <= 0;

                    // 绘制圆形背景
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);

                    if (isReady) {
                        // 就绪状态：根据技能类型着色
                        if (skill.type === SkillTypes.ATTACK) {
                            ctx.fillStyle = '#8B0000';  // 深红色背景
                        } else {
                            ctx.fillStyle = '#006400';  // 深绿色背景
                        }
                    } else {
                        // 冷却中：灰色
                        ctx.fillStyle = '#3a3a3a';
                    }
                    ctx.fill();

                    // 圆形边框
                    ctx.strokeStyle = isReady ? '#ffd700' : '#666666';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // 冷却遮罩（从底部向上填充）
                    if (!isReady) {
                        const cooldownPercent = remainingCooldown / skill.cooldown;
                        // 绘制冷却扇形（从顶部顺时针）
                        ctx.beginPath();
                        ctx.moveTo(centerX, centerY);
                        ctx.arc(centerX, centerY, circleRadius - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cooldownPercent), false);
                        ctx.closePath();
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        ctx.fill();
                    }

                    // 技能图标
                    ctx.font = Math.floor(18 * scale) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = isReady ? '#ffffff' : '#888888';
                    ctx.fillText(skill.emoji, centerX, centerY - 2);

                    // 冷却数字显示在图标下方
                    if (!isReady) {
                        ctx.font = 'bold ' + Math.floor(10 * scale) + 'px sans-serif';
                        ctx.fillStyle = '#ff6b6b';
                        ctx.fillText(remainingCooldown + 's', centerX, centerY + circleRadius - 8);
                    }
                });

                ctx.textAlign = 'left';  // 重置对齐
            }
        }

        // 更新技能效果
        if (!_paused) updateSkillEffects();

        // 绘制技能伤害动画
        if (getCombatFeatures().skillBar) { updateSkillDamageAnimations(); drawSkillDamageAnimations(scale); }

        // 绘制宠物攻击动画
        if (getCombatFeatures().petAutoAttack) { updatePetDamageAnimations(); drawPetDamageAnimations(scale); }

        // 得分
        const isStageMode = (state === GAME_STATE.STAGE_PLAYING);
        var stageModeSystem = getStageModeSystem();
        if (_isTower) {
            // 塔模式显示层数
            var towerFloor = towerSystem.currentFloor || 1;
            drawText('层: ' + towerFloor, screenWidth/2, designOffsetY + Math.floor(50 * scale), Math.floor(32 * scale), '#ffd700');
        } else {
            const displayScore = (state === GAME_STATE.SEASON_PLAYING) ? seasonScore : isStageMode ? stageModeSystem.getScore() : score;
            const scoreLabel = (state === GAME_STATE.SEASON_PLAYING) ? '🏆 灵辉值: ' : '灵辉值: ';
            drawText(scoreLabel + displayScore, screenWidth/2, designOffsetY + Math.floor(50 * scale), Math.floor(32 * scale), '#ffd700');
        }

        // 时间
        if (_isTower) {
            var displayTime = towerSystem.combatTime || 0;
            var tTimeColor = displayTime <= 10 ? '#ff6b6b' : '#ffffff';
            drawText('时间: ' + displayTime + 's', screenWidth/2, designOffsetY + Math.floor(90 * scale), Math.floor(24 * scale), tTimeColor);
        } else {
            const displayTimeLeft = isStageMode ? stageModeSystem.getTimeLeft() : timeLeft;
            const timeColor = displayTimeLeft <= 10 ? '#ff6b6b' : '#ffffff';
            drawText('时间: ' + displayTimeLeft + 's', screenWidth/2, designOffsetY + Math.floor(90 * scale), Math.floor(24 * scale), timeColor);
        }

        // 闯关模式：显示击杀数
        if (isStageMode) {
            var stageData = stageModeSystem.getCurrentStageData();
            var settings = stageData ? stageData.settings : null;
            drawText('净化: ' + stageModeSystem.getMonstersKilled() + '/' + (settings && settings.monsterCount || '?'), screenWidth/2, designOffsetY + Math.floor(115 * scale), Math.floor(16 * scale), '#87CEEB');
        }

        // 打断状态显示（屏幕变暗 + 红色脉冲 + 提示文字）
        var playerEffects = getPlayerEffects();
        if (playerEffects.stunned) {
            // 检查打断是否结束
            if (Date.now() >= playerEffects.stunEndTime) {
                playerEffects.stunned = false;
            } else {
                const remainingTime = Math.ceil((playerEffects.stunEndTime - Date.now()) / 1000 * 10) / 10;
                // 屏幕整体变暗，营造被控制感
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, screenWidth, screenHeight);
                // 红色边缘脉冲效果
                const pulseAlpha = 0.2 + 0.15 * Math.sin(Date.now() / 100);
                ctx.fillStyle = 'rgba(255, 0, 0, ' + pulseAlpha.toFixed(2) + ')';
                ctx.fillRect(0, 0, screenWidth, screenHeight);
                // 提示文字
                ctx.font = getFont('stun', scale);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ff0000';
                ctx.fillText('💥 被打断！', screenWidth/2, screenHeight/2);
                ctx.font = getFont('stunTimer', scale);
                ctx.fillStyle = '#ffffff';
                ctx.fillText('无法操作 ' + remainingTime.toFixed(1) + '秒', screenWidth/2, screenHeight/2 + 40);
            }
        }

        // 连击UI显示
        if (comboState.count > 0 && !_paused) {
            // 检查连击是否超时
            checkComboTimeout();

            // 连击滑入动画
            if (comboState.slideTriggered) {
                comboState.slideAnim += 0.08;
                if (comboState.slideAnim >= 1) {
                    comboState.slideAnim = 1;
                    comboState.slideTriggered = false;
                }
            }
            // 缓动函数：easeOutCubic
            var slideEased = 1 - Math.pow(1 - comboState.slideAnim, 3);
            var slideOffset = Math.floor(200 * scale * (1 - slideEased)); // 从右侧200px外滑入

            // 连击数显示
            const charConfig = getCurrentCharacterConfig();
            const comboLevel = charConfig ? Math.floor(comboState.count / charConfig.comboThreshold) : 0;

            // 连击文字（根据层级变色）
            let comboColor = '#ffffff';
            if (comboLevel >= 3) {
                comboColor = '#ff00ff';  // 紫色 - 高连击
            } else if (comboLevel >= 2) {
                comboColor = '#ffd700';  // 金色 - 中连击
            } else if (comboLevel >= 1) {
                comboColor = '#00ff00';  // 绿色 - 初级连击
            }

            // 连击数字显示（靠右，固定位置）
            const comboX = screenWidth - 20;  // 屏幕右侧
            // 统一使用怪物下方的位置（怪物在屏幕1/3处，下方约150像素）
            const comboY = designOffsetY + Math.floor(DESIGN_HEIGHT / 3 * scale + 150 * scale);

            // 数字40xp大小，COMBO文字20xp大小
            var comboNumSize = Math.floor(40 * scale);
            var comboLabelSize = Math.floor(20 * scale);
            ctx.textBaseline = 'middle';
            ctx.fillStyle = comboColor;
            // 绘制数字
            ctx.font = getFont('comboNum', scale);
            ctx.textAlign = 'right';
            var comboNumWidth = ctx.measureText(comboState.count.toString()).width;
            ctx.fillText(comboState.count, comboX - comboLabelSize - 4 - Math.floor(55 * scale) + slideOffset, comboY);
            // 绘制COMBO文字（在数字右侧，垂直居中对齐）
            ctx.font = getFont('comboLabel', scale);
            ctx.fillText('连灵', comboX + slideOffset, comboY + comboNumSize * 0.15);

            // 连击层级指示
            if (comboLevel > 0) {
                ctx.font = getFont('comboLevel', scale);
                ctx.fillStyle = '#87CEEB';
                ctx.fillText('Lv.' + comboLevel, comboX, comboY + Math.floor(25 * scale));

                // 显示当前星星生成速度
                const speedPercent = Math.floor((BASE_STAR_INTERVAL / comboState.currentStarInterval) * 100);
                ctx.fillText('SPEED ' + speedPercent + '%', comboX, comboY + Math.floor(45 * scale));
            }

            ctx.textAlign = 'left';  // 重置对齐
        }

        // 连击星星效果UI显示已禁用
        // if (combatState.comboStarActive) { ... }

        // 显示玩家血量（游戏中始终显示，避免击杀怪物间隙闪烁）
        if (state === GAME_STATE.PLAYING || state === GAME_STATE.STAGE_PLAYING || state === GAME_STATE.BOSS_BATTLE || state === GAME_STATE.SEASON_PLAYING || state === GAME_STATE.TOWER_COMBAT) {
            const currentHp = playerData.playerHp != null ? playerData.playerHp : 100;
            const maxHp = playerData.maxPlayerHp || 100;
            const hpPercent = currentHp / maxHp;
            const hpBarWidth = Math.floor(200 * scale);
            const hpBarHeight = Math.floor(12 * scale);
            const hpBarX = screenWidth/2 - hpBarWidth/2;
            const hpBarY = screenHeight - Math.floor(50 * scale);  // 屏幕最下方

            // 护盾条（显示在血条上方）
            const currentShield = playerData.playerShield || 0;
            if (currentShield > 0) {
                const shieldBarY = hpBarY - Math.floor(16 * scale);
                const shieldPercent = Math.min(1, currentShield / 50);  // 50点护盾满条
                ctx.fillStyle = '#333333';
                fillRoundRect(ctx, hpBarX, shieldBarY, hpBarWidth, Math.floor(10 * scale), Math.floor(3 * scale));
                ctx.fillStyle = '#00BFFF';  // 冰蓝色护盾
                fillRoundRect(ctx, hpBarX, shieldBarY, hpBarWidth * shieldPercent, Math.floor(10 * scale), Math.floor(3 * scale));
                ctx.fillStyle = '#ffffff';
                ctx.font = getFont('hpBadge', scale);
                ctx.textAlign = 'center';
                ctx.fillText(`🛡️${currentShield}`, screenWidth/2, shieldBarY + Math.floor(5 * scale));
            }

            // 怒气值显示（显示在护盾条上方或血条上方）
            const currentRage = playerData.playerRage || 0;
            if (currentRage > 0) {
                const rageBarY = currentShield > 0 ? hpBarY - Math.floor(30 * scale) : hpBarY - Math.floor(16 * scale);
                const ragePercent = currentRage / 3;  // 3点怒气满
                ctx.fillStyle = '#333333';
                fillRoundRect(ctx, hpBarX, rageBarY, hpBarWidth, Math.floor(10 * scale), Math.floor(3 * scale));
                ctx.fillStyle = '#FF4500';  // 红橙色怒气
                fillRoundRect(ctx, hpBarX, rageBarY, hpBarWidth * ragePercent, Math.floor(10 * scale), Math.floor(3 * scale));
                ctx.fillStyle = '#ffffff';
                ctx.font = getFont('hpBadge', scale);
                ctx.textAlign = 'center';
                ctx.fillText(`💢${currentRage}/3`, screenWidth/2, rageBarY + Math.floor(5 * scale));
            }

            // 血条背景
            ctx.fillStyle = '#333333';
            fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth, hpBarHeight, Math.floor(4 * scale));

            // 白色残影血条（统一 DelayedHpTracker）
            var _pDelay = _battleHpTracker.get(getPlayerData(), currentHp, maxHp);
            if (_pDelay.delayedHp > currentHp) {
                ctx.save();
                ctx.globalAlpha = 0.45;
                ctx.fillStyle = '#ffffff';
                fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth * _pDelay.ratio, hpBarHeight, Math.floor(4 * scale));
                ctx.restore();
            }

            // 血条颜色（根据血量百分比变化）
            let hpColor = '#4CAF50';
            if (hpPercent <= 0.25) {
                hpColor = '#ff6b6b';
            } else if (hpPercent <= 0.5) {
                hpColor = '#FF9800';
            }

            // 血条
            ctx.fillStyle = hpColor;
            fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth * Math.max(0, hpPercent), hpBarHeight, Math.floor(4 * scale));

            // 血量文字
            ctx.fillStyle = '#ffffff';
            ctx.font = getFont('hp', scale);
            ctx.textAlign = 'center';
            ctx.fillText(`灵能: ${Math.floor(currentHp)}/${maxHp}`, screenWidth/2, hpBarY + hpBarHeight + Math.floor(15 * scale));

            // 闪避状态指示
            if (playerEffects.dodging && Date.now() < playerEffects.dodgeEndTime) {
                var dodgeRemaining = Math.max(0, (playerEffects.dodgeEndTime - Date.now()) / 1000);
                ctx.fillStyle = '#DA70D6';
                ctx.font = getFont('dodge', scale);
                ctx.textAlign = 'center';
                ctx.fillText('闪避 ' + dodgeRemaining.toFixed(1) + 's', screenWidth / 2, hpBarY - Math.floor(28 * scale));
            }
        }

        // 更新怪物动画
        updateMonsterAnimation();

        // 下落模式：绘制透视放射轨道线（只在屏幕下方60%显示）
        // 先绘制线条，再绘制怪物，这样怪物会覆盖在线条上方
        // 互动型怪物（偷星者等）出现时隐藏轨道
        var starThief = getStarThief();
        var starMode = getStarMode();
        var hideFallingTrack = starThief && starThief.isActive() && !starThief.isBrokenState();
        if (starMode === STAR_MODE.FALLING && !hideFallingTrack) {
            const laneWidth = screenWidth / FALLING_CONFIG.lanes;

            // 透视参数
            const vanishY = -Math.floor(150 * scale);  // 消失点在屏幕上方
            const vanishX = screenWidth / 2;            // 消失点水平居中
            const bottomY = screenHeight;               // 底部位置

            // 线条起始位置：屏幕40%处（下方60%区域显示线条）
            const lineStartY = screenHeight * 0.4;

            // 线条始终画到屏幕底部
            const lineEndY = bottomY;

            // 绘制透视轨道线（只显示下方60%）- 带渐变透明效果
            ctx.lineWidth = 2;

            for (let i = 0; i <= FALLING_CONFIG.lanes; i++) {
                // 计算起始位置的x坐标
                const startRatio = (lineStartY - vanishY) / (bottomY - vanishY);
                const startWidth = screenWidth * startRatio;
                const startX = vanishX - startWidth / 2 + (i / FALLING_CONFIG.lanes) * startWidth;

                // 计算终点位置的x坐标
                const endRatio = (lineEndY - vanishY) / (bottomY - vanishY);
                const endWidth = screenWidth * endRatio;
                const endX = vanishX - endWidth / 2 + (i / FALLING_CONFIG.lanes) * endWidth;

                // 创建垂直渐变：从透明到不透明
                const gradient = ctx.createLinearGradient(0, lineStartY, 0, lineEndY);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');      // 断裂处完全透明
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0.35)');  // 底部最大透明度

                ctx.strokeStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(startX, lineStartY);  // 从屏幕40%处开始
                ctx.lineTo(endX, lineEndY);      // 到屏幕底部
                ctx.stroke();
            }

            // 绘制水平参考线（只在下方60%区域）- 带渐变透明效果
            ctx.lineWidth = 1;
            const refLines = 3;
            for (let i = 1; i <= refLines; i++) {
                const y = lineStartY + (i * (lineEndY - lineStartY) / (refLines + 1));
                const ratio = (y - vanishY) / (bottomY - vanishY);
                const width = screenWidth * ratio;
                const startX = vanishX - width / 2;
                const endX = vanishX + width / 2;

                // 计算当前水平线的透明度（基于Y位置）
                const lineProgress = (y - lineStartY) / (lineEndY - lineStartY);
                const alpha = lineProgress * 0.2;  // 渐变到最大0.2

                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
                ctx.stroke();
            }
        }

        // 绘制怪物（在线条之后，这样怪物会覆盖在线条上方）
        if (monster.active) {
            drawMonster();
        }

        // 下落模式：绘制判定区域（互动怪出现时隐藏）
        if (starMode === STAR_MODE.FALLING && !hideFallingTrack) {
            // 底部判定区域（在血条上方）
            const totalZone = FALLING_CONFIG.bottomHitZone;
            const perfectHeight = FALLING_CONFIG.perfectZone;
            const superPerfectHeight = FALLING_CONFIG.superPerfectZone;

            // 血条位置参考
            const hpBarTop = screenHeight - Math.floor(50 * scale);
            const hpBarHeight = Math.floor(12 * scale);
            const hpBarBottom = hpBarTop + hpBarHeight;

            // 判定区域在血条上方（留出间距）
            const zoneGap = Math.floor(10 * scale);  // 与血条的间距
            const perfectTopY = hpBarTop - zoneGap - totalZone;
            const superPerfectTopY = perfectTopY + perfectHeight;
            const superPerfectBottomY = superPerfectTopY + superPerfectHeight;

            // 完美点击区域（×2）- 上部
            ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
            ctx.fillRect(0, perfectTopY, screenWidth, perfectHeight);

            // 完美点击区域（×2）- 下部
            ctx.fillRect(0, superPerfectBottomY, screenWidth, perfectHeight);

            // 超级完美点击区域（×4）- 中间
            ctx.fillStyle = 'rgba(255, 165, 0, 0.25)';
            ctx.fillRect(0, superPerfectTopY, screenWidth, superPerfectHeight);
        }

        // 更新下落模式星星位置
        if (!_paused) updateFallingStars();

        // 绘制星星（遍历数组绘制所有星星）
        cleanupExpiredStars();  // 清理超时的星星（内部已有暂停保护）
        // 偷星者系统更新
        if (!_paused && starThief) starThief.update();
        var _now = Date.now();
        for (let i = 0; i < stars.length; i++) {
            if (stars[i].visible) {
                var _birthScale = getBirthTransform(stars[i], _now);
                drawStar(stars[i], stars[i].x, stars[i].y, stars[i].size, stars[i].scale * _birthScale);
            }
        }

        // D2-D5 战斗维度渲染
        var _rhythmSys = getRhythmSystem();
        if (_rhythmSys) _rhythmSys.render(ctx, screenWidth, screenHeight, scale, getStars);
        var _chargeSys = getChargeSystem();
        if (_chargeSys) _chargeSys.render(ctx, screenWidth, screenHeight, scale);
        var _dragSys = getDragSystem();
        if (_dragSys) _dragSys.render(ctx, screenWidth, screenHeight, scale);
        var _linkSys = getLinkChainSystem();
        if (_linkSys) _linkSys.render(ctx, screenWidth, screenHeight, scale);
        var _satState = getSaturationState();
        if (_satState) _satState.render(ctx, screenWidth, screenHeight, scale);

        // 更新和绘制暴击动画
        var _ncf = getCombatFeatures();
        if (_ncf.critDisplay) { updateCritAnimations(); drawCritAnimations(scale); }

        // 更新和绘制快速点击动画
        if (_ncf.quickTapDisplay) { updateQuickTapAnimations(); drawQuickTapAnimations(scale); }

        // 更新和绘制灵币掉落动画
        updateGoldDropAnimations();
        drawGoldDropAnimations(scale);

        // 更新和绘制流星攻击动画
        if (_ncf.starAttackEffects) {
            updateMeteorAnimations(); drawMeteorAnimations(scale);
            updateMeteorExplosions(); drawMeteorExplosions(scale);
        }

        // 更新和绘制怪物攻击弹幕
        if (_ncf.monsterProjectile) { updateMonsterProjectileAnimations(); drawMonsterProjectileAnimations(scale); }

        // 更新和绘制血条反击动画（闪避成功）
        updateHpBarCounterAnimations();
        drawHpBarCounterAnimations();

        // 更新和绘制玩家受击动画
        updatePlayerDamageAnimations();
        drawPlayerDamageAnimations(scale);

        // 更新和绘制怪物受击动画（闪避反击）
        updateMonsterDamageAnimations();
        drawMonsterDamageAnimations(scale);

        // 更新和绘制时间扣除动画
        updateTimeDamageAnimations();
        drawTimeDamageAnimations(scale);

        // 绘制汽伤触发效果
        drawElementalComboEffect(scale);

        // 更新和绘制毒液滩
        if (!_paused) updatePoisonPuddles();
        drawPoisonPuddles(scale);

        // 绘制左侧滚动消息
        drawGameMessages(scale);

        // === Boss/塔模式特有 UI ===

        // Boss HP 条（Boss模式专属）
        if (_cf.bossHpBar && _isBoss) {
            var BossBattleMode = getBossBattleMode();
            var bossHp = BossBattleMode.bossHp;
            var bossMaxHp = BossBattleMode.bossMaxHp;
            if (bossMaxHp > 0) {
                var bossHpPercent = Math.max(0, bossHp / bossMaxHp);
                var bossBarW = Math.floor(250 * scale);
                var bossBarH = Math.floor(16 * scale);
                var bossBarX = screenWidth / 2 - bossBarW / 2;
                var bossBarY = designOffsetY + Math.floor(130 * scale);
                var bossBarR = Math.floor(4 * scale);

                ctx.fillStyle = '#333333';
                fillRoundRect(ctx, bossBarX, bossBarY, bossBarW, bossBarH, bossBarR);

                // Boss白色残影血条（统一 DelayedHpTracker，自动处理 maxHp 变化）
                var _bossDelay = _battleHpTracker.get(BossBattleMode, bossHp, bossMaxHp);
                if (_bossDelay.delayedHp > bossHp) {
                    ctx.save();
                    ctx.globalAlpha = 0.45;
                    ctx.fillStyle = '#ffffff';
                    fillRoundRect(ctx, bossBarX, bossBarY, bossBarW * _bossDelay.ratio, bossBarH, bossBarR);
                    ctx.restore();
                }

                var bossHpColor = bossHpPercent > 0.5 ? '#ff4444' : (bossHpPercent > 0.25 ? '#ff8800' : '#ff2222');
                ctx.fillStyle = bossHpColor;
                fillRoundRect(ctx, bossBarX, bossBarY, bossBarW * bossHpPercent, bossBarH, bossBarR);

                ctx.fillStyle = '#ffffff';
                ctx.font = getFont('bossHp', scale);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                var bossData = BossBattleMode.currentBoss;
                ctx.fillText((bossData ? bossData.name : '守护灵') + ' ' + Math.ceil(bossHp) + '/' + bossMaxHp, screenWidth / 2, bossBarY + bossBarH / 2);
            }
        }

        // 塔模式技能栏（右侧圆形标签）
        if (_isTower && towerSystem) {
            var towerActiveSkills = towerSystem.getActiveSkills();
            if (towerActiveSkills.length > 0) {
                var tCircleRadius = Math.floor(22 * scale);
                var tCircleGap = Math.floor(8 * scale);
                var tStartX = screenWidth - tCircleRadius - Math.floor(5 * scale);
                var tTotalHeight = towerActiveSkills.length * (tCircleRadius * 2) + (towerActiveSkills.length - 1) * tCircleGap;
                var tStartY = screenHeight - tTotalHeight - Math.floor(100 * scale);

                for (var tsi = 0; tsi < towerActiveSkills.length; tsi++) {
                    var tSkillId = towerActiveSkills[tsi];
                    var tSkill = Skills[tSkillId];
                    if (!tSkill) continue;
                    var tCenterX = tStartX;
                    var tCenterY = tStartY + tsi * (tCircleRadius * 2 + tCircleGap) + tCircleRadius;
                    var tRemaining = towerSystem.getSkillCooldownRemaining(tSkillId);
                    var tReady = tRemaining <= 0;

                    ctx.beginPath();
                    ctx.arc(tCenterX, tCenterY, tCircleRadius, 0, Math.PI * 2);
                    ctx.fillStyle = tReady ? (tSkill.type === SkillTypes.ATTACK ? '#8B0000' : '#006400') : '#3a3a3a';
                    ctx.fill();
                    ctx.strokeStyle = tReady ? '#ffd700' : '#666666';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    ctx.font = Math.floor(tCircleRadius * 1.2) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(tSkill.emoji || '?', tCenterX, tCenterY);

                    if (!tReady) {
                        ctx.globalAlpha = 0.6;
                        ctx.beginPath();
                        ctx.arc(tCenterX, tCenterY, tCircleRadius, 0, Math.PI * 2);
                        ctx.fillStyle = '#000000';
                        ctx.fill();
                        ctx.globalAlpha = 1;
                        ctx.fillStyle = '#ffffff';
                        ctx.font = getFont('bossHp', scale);
                        ctx.fillText(tRemaining + 's', tCenterX, tCenterY);
                    }
                }
            }
        }

        // Boss暂停菜单（Boss使用内部暂停标志，不走全局PAUSED状态）
        var bossBattleSystem = getBossBattleSystem();
        if (_isBoss && bossBattleSystem && bossBattleSystem.getIsPaused && bossBattleSystem.getIsPaused()) {
            renderPausedMenu();
        }

    }

    return { renderGame: renderGame };
}
export { createGameBattleRenderer };
