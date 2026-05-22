/**
 * TowerRenderer — 无尽之塔渲染（主界面、隐藏之路弹窗、战斗渲染、结算、恢复提示）
 */
import Logger from '../utils/Logger.js';
import { createDelayedHpTracker } from '../utils/DelayedHpTracker.js';
var _towerHpTracker = createDelayedHpTracker();
function createTowerRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };
    var DESIGN_HEIGHT = 812;
    var uiCore = deps.uiCore;
    var isBackButtonClicked = deps.isBackButtonClicked || (uiCore && uiCore.isBackButtonClicked);
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getStrokeRoundRect = deps.getStrokeRoundRect;
    var getPlayerData = deps.getPlayerData;
    var getTowerSystem = deps.getTowerSystem;
    var getCombatState = deps.getCombatState;
    var getComboState = deps.getComboState;
    var getTowerConfig = deps.getTowerConfig;
    var getGameState = deps.getGameState;
    var getCombatFeatures = deps.getCombatFeatures;
    var getCurrentCharacterConfig = deps.getCurrentCharacterConfig;
    var transitionTo = deps.transitionTo;
    var getAudioSystem = deps.getAudioSystem || function() { return null; };
    // 动画系统桥接函数
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
    var getUpdateHpBarCounterAnimations = deps.getUpdateHpBarCounterAnimations;
    var getDrawHpBarCounterAnimations = deps.getDrawHpBarCounterAnimations;
    var getUpdatePlayerDamageAnimations = deps.getUpdatePlayerDamageAnimations;
    var getDrawPlayerDamageAnimations = deps.getDrawPlayerDamageAnimations;
    var getUpdateMonsterDamageAnimations = deps.getUpdateMonsterDamageAnimations;
    var getDrawMonsterDamageAnimations = deps.getDrawMonsterDamageAnimations;
    var getUpdateStarBurstAnimations = deps.getUpdateStarBurstAnimations;
    var getDrawStarBurstAnimations = deps.getDrawStarBurstAnimations;
    var getDrawGameMessages = deps.getDrawGameMessages;
    var getUpdateTimeDamageAnimations = deps.getUpdateTimeDamageAnimations;
    var getDrawTimeDamageAnimations = deps.getDrawTimeDamageAnimations;

    // ==================== renderTower ====================
    function renderTower() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var towerSystem = getTowerSystem();
        var playerData = getPlayerData();
        var TOWER_CONFIG = getTowerConfig();
        var fillRoundRect = getFillRoundRect();

        // 背景
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 标题栏
        ctx.fillStyle = '#1a1a2e';
        fillRoundRect(ctx, 0, 0, screenWidth, Math.floor(60 * scale), 8);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏰 无尽之塔 - 第 ' + towerSystem.currentFloor + ' 层', screenWidth / 2, Math.floor(38 * scale));

        // 层数信息
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText('最高: ' + (playerData.infiniteTower.highestFloor || 0) + '层', screenWidth - Math.floor(20 * scale), Math.floor(55 * scale));

        // 迷雾状态显示
        if (towerSystem.blindSteps > 0) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#9b59b6';
            ctx.fillText('🌫️ 视野受限 ' + towerSystem.blindSteps + '步', screenWidth / 2, Math.floor(55 * scale));
        }

        // 更新视图偏移
        towerSystem.updateViewOffset();

        // 渲染地图区域
        var mapTop = Math.floor(70 * scale);
        var mapBottom = screenHeight - Math.floor(80 * scale);
        var cellSize = Math.floor(30 * scale);

        // 设置裁剪区域
        ctx.save();
        ctx.beginPath();
        ctx.rect(Math.floor(20 * scale), mapTop, screenWidth - Math.floor(40 * scale), mapBottom - mapTop);
        ctx.clip();

        // 渲染格子
        for (var y = 0; y < TOWER_CONFIG.gridSize; y++) {
            for (var x = 0; x < TOWER_CONFIG.gridSize; x++) {
                var cell = towerSystem.grid[y][x];
                var cellX = Math.floor(20 * scale) + x * cellSize + towerSystem.viewOffsetX;
                var cellY = mapTop + y * cellSize + towerSystem.viewOffsetY;

                // 跳过视图外的格子
                if (cellX + cellSize < 0 || cellX > screenWidth ||
                    cellY + cellSize < mapTop || cellY > mapBottom) {
                    continue;
                }

                // 绘制格子背景
                if (cell.explored) {
                    ctx.fillStyle = '#2a2a3e';
                } else {
                    ctx.fillStyle = '#1a1a2e';
                }
                ctx.fillRect(cellX, cellY, cellSize - 1, cellSize - 1);

                // 绘制格子内容
                if (cell.explored) {
                    ctx.font = (cellSize - 6) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    switch (cell.type) {
                        case 'empty':
                            ctx.fillStyle = '#3a3a4e';
                            ctx.fillText('·', cellX + cellSize / 2, cellY + cellSize / 2);
                            break;
                        case 'monster':
                            // 大型怪物显示在多格中心
                            if (cell.monster.sizeType && cell.monster.sizeType !== 'normal') {
                                var mw = cell.monster.sizeWidth || 1;
                                var mh = cell.monster.sizeHeight || 1;
                                // 计算中心位置
                                var centerX = cellX + (mw * cellSize) / 2;
                                var centerY = cellY + (mh * cellSize) / 2;
                                // 放大emoji
                                ctx.font = Math.floor((cellSize - 6) * Math.max(mw, mh) * 0.7) + 'px sans-serif';
                                ctx.fillText(cell.monster.emoji, centerX, centerY);
                                ctx.font = (cellSize - 6) + 'px sans-serif';
                                // 显示体型标签
                                var label = cell.monster.sizeType === 'elite' ? '精英' : 'BOSS';
                                ctx.font = Math.floor(cellSize * 0.3) + 'px sans-serif';
                                ctx.fillStyle = cell.monster.sizeType === 'elite' ? '#FFD700' : '#FF4500';
                                ctx.textAlign = 'center';
                                ctx.fillText(label, centerX, centerY + mh * cellSize * 0.4);
                                ctx.font = (cellSize - 6) + 'px sans-serif';
                            } else {
                                ctx.fillText(cell.monster.emoji, cellX + cellSize / 2, cellY + cellSize / 2);
                            }
                            // 显示锁定资源数量角标
                            if (cell.monster.lockedCells && cell.monster.lockedCells.length > 0) {
                                ctx.font = Math.floor(cellSize * 0.35) + 'px sans-serif';
                                ctx.fillStyle = '#FF6B6B';
                                ctx.textAlign = 'right';
                                ctx.fillText('🔒' + cell.monster.lockedCells.length, cellX + cellSize - 2, cellY + cellSize * 0.3);
                                ctx.textAlign = 'center';
                                ctx.font = (cellSize - 6) + 'px sans-serif';
                            }
                            break;
                        case 'monster_part':
                            // 大型怪物占据的格子，显示阴影效果
                            ctx.fillStyle = 'rgba(80, 40, 40, 0.3)';
                            ctx.fillRect(cellX, cellY, cellSize - 1, cellSize - 1);
                            break;
                        case 'treasure':
                            if (cell.treasure.opened) {
                                ctx.fillStyle = '#666666';
                                ctx.fillText('📭', cellX + cellSize / 2, cellY + cellSize / 2);
                            } else {
                                ctx.fillText(cell.treasure.emoji, cellX + cellSize / 2, cellY + cellSize / 2);
                                // 显示锁定图标（多怪物锁定）
                                if (towerSystem.isResourceLocked(cell)) {
                                    var gCount = towerSystem.getAliveGuardianCount(cell);
                                    ctx.font = Math.floor(cellSize * 0.35) + 'px sans-serif';
                                    ctx.fillStyle = '#FF6B6B';
                                    ctx.textAlign = 'right';
                                    ctx.fillText('🔒' + gCount, cellX + cellSize - 2, cellY + cellSize * 0.3);
                                    ctx.textAlign = 'center';
                                    ctx.font = (cellSize - 6) + 'px sans-serif';
                                }
                            }
                            break;
                        case 'material':
                            if (cell.material.collected) {
                                ctx.fillStyle = '#666666';
                                ctx.fillText('✓', cellX + cellSize / 2, cellY + cellSize / 2);
                            } else {
                                ctx.fillText(cell.material.emoji, cellX + cellSize / 2, cellY + cellSize / 2);
                                // 显示锁定图标（多怪物锁定）
                                if (towerSystem.isResourceLocked(cell)) {
                                    var gCountMat = towerSystem.getAliveGuardianCount(cell);
                                    ctx.font = Math.floor(cellSize * 0.35) + 'px sans-serif';
                                    ctx.fillStyle = '#FF6B6B';
                                    ctx.textAlign = 'right';
                                    ctx.fillText('🔒' + gCountMat, cellX + cellSize - 2, cellY + cellSize * 0.3);
                                    ctx.textAlign = 'center';
                                    ctx.font = (cellSize - 6) + 'px sans-serif';
                                }
                            }
                            break;
                        case 'hiddenPath':
                            if (cell.guardianDefeated) {
                                // Boss已击败，显示跳层图标
                                ctx.fillStyle = '#9b59b6';
                                ctx.fillText('🌀', cellX + cellSize / 2, cellY + cellSize / 2);
                            } else {
                                // Boss未击败，显示Boss图标
                                ctx.fillStyle = '#FF0000';
                                ctx.fillText(cell.guardian ? cell.guardian.emoji : '🏛️', cellX + cellSize / 2, cellY + cellSize / 2);
                            }
                            break;
                        case 'trap':
                            if (cell.trap.triggered) {
                                ctx.fillStyle = '#666666';
                                ctx.fillText('✗', cellX + cellSize / 2, cellY + cellSize / 2);
                            } else {
                                ctx.fillText(cell.trap.emoji, cellX + cellSize / 2, cellY + cellSize / 2);
                            }
                            break;
                        case 'exit':
                            ctx.fillStyle = '#00FF00';
                            ctx.fillText('🚪', cellX + cellSize / 2, cellY + cellSize / 2);
                            break;
                    }

                    // 被锁定的格子显示红色半透明覆盖层
                    if (towerSystem.isResourceLocked(cell)) {
                        var guardianCount = towerSystem.getAliveGuardianCount(cell);
                        ctx.fillStyle = 'rgba(255, 80, 80, 0.5)';
                        ctx.fillRect(cellX, cellY, cellSize - 1, cellSize - 1);
                        // 绘制锁链效果
                        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        // 绘制交叉的锁链
                        ctx.moveTo(cellX + 2, cellY + 2);
                        ctx.lineTo(cellX + cellSize - 3, cellY + cellSize - 3);
                        ctx.moveTo(cellX + cellSize - 3, cellY + 2);
                        ctx.lineTo(cellX + 2, cellY + cellSize - 3);
                        ctx.stroke();
                        // 显示守卫数量
                        if (guardianCount > 1) {
                            ctx.font = Math.floor(cellSize * 0.4) + 'px sans-serif';
                            ctx.fillStyle = '#FFFFFF';
                            ctx.textAlign = 'center';
                            ctx.fillText('x' + guardianCount, cellX + cellSize / 2, cellY + cellSize * 0.15);
                        }
                    }
                } else {
                    // 未探索的格子显示迷雾
                    ctx.fillStyle = '#0a0a15';
                    ctx.fillRect(cellX, cellY, cellSize - 1, cellSize - 1);
                    ctx.fillStyle = '#3a3a4e';
                    ctx.font = (cellSize - 6) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('?', cellX + cellSize / 2, cellY + cellSize / 2);
                }
            }
        }

        // 绘制玩家
        var playerX = Math.floor(20 * scale) + towerSystem.playerX * cellSize + towerSystem.viewOffsetX;
        var playerY = mapTop + towerSystem.playerY * cellSize + towerSystem.viewOffsetY;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(playerX + cellSize / 2, playerY + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = (cellSize - 8) + 'px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', playerX + cellSize / 2, playerY + cellSize / 2);

        ctx.restore(); // 恢复裁剪区域

        // 底部信息栏
        ctx.fillStyle = '#1a1a2e';
        fillRoundRect(ctx, 0, screenHeight - Math.floor(70 * scale), screenWidth, Math.floor(70 * scale), 8);

        // 血条
        var hpBarWidth = screenWidth - Math.floor(40 * scale);
        var hpBarHeight = Math.floor(12 * scale);
        var hpBarX = Math.floor(20 * scale);
        var hpBarY = screenHeight - Math.floor(60 * scale);
        var hpBarRadius = Math.floor(4 * scale);

        ctx.fillStyle = '#333333';
        fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth, hpBarHeight, hpBarRadius);

        // 塔地图玩家白色残影血条（统一 DelayedHpTracker）
        var tPlayerHp = towerSystem.playerHp;
        var tPlayerMaxHp = towerSystem.playerMaxHp;
        var _tPlayerDelay = _towerHpTracker.get(towerSystem, tPlayerHp, tPlayerMaxHp);
        if (_tPlayerDelay.delayedHp > tPlayerHp) {
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = '#ffffff';
            fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth * _tPlayerDelay.ratio, hpBarHeight, hpBarRadius);
            ctx.restore();
        }

        ctx.fillStyle = towerSystem.playerHp > towerSystem.playerMaxHp * 0.3 ? '#4CAF50' : '#e74c3c';
        fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth * (towerSystem.playerHp / towerSystem.playerMaxHp), hpBarHeight, hpBarRadius);

        // 提示文字
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.textAlign = 'center';
        ctx.fillText('滑动移动 | 点击格子查看详情', screenWidth / 2, screenHeight - Math.floor(35 * scale));

        // 返回按钮
        uiCore.drawBackButton();

        // 更新并渲染奖励飘字（宝箱/材料堆）
        towerSystem.updateRewardFloatTexts();
        for (var ti = 0; ti < towerSystem.combatRewardTexts.length; ti++) {
            var text = towerSystem.combatRewardTexts[ti];
            ctx.save();
            ctx.globalAlpha = text.alpha;
            ctx.fillStyle = text.color;
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(text.text, text.x, text.y);
            ctx.restore();
        }

        // 渲染隐藏之路弹窗
        renderHiddenPathDialog();
    }

    // ==================== renderHiddenPathDialog ====================
    function renderHiddenPathDialog() {
        var towerSystem = getTowerSystem();
        if (!towerSystem.hiddenPathDialog) return;

        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var fillRoundRect = getFillRoundRect();
        var strokeRoundRect = getStrokeRoundRect();

        // 半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 弹窗背景
        var boxWidth = Math.floor(320 * scale);
        var boxHeight = Math.floor(280 * scale);
        var boxX = (screenWidth - boxWidth) / 2;
        var boxY = (screenHeight - boxHeight) / 2;

        ctx.fillStyle = '#1a1a2e';
        fillRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, 15);
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 3;
        strokeRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, 15);

        // 标题
        ctx.fillStyle = '#9b59b6';
        ctx.font = 'bold ' + Math.floor(22 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌀 隐藏之路', screenWidth / 2, boxY + Math.floor(35 * scale));

        // 当前层数
        ctx.fillStyle = '#aaaaaa';
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillText('当前: 第 ' + towerSystem.hiddenPathDialog.currentFloor + ' 层', screenWidth / 2, boxY + Math.floor(65 * scale));

        // 提示
        ctx.fillStyle = '#FFD700';
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillText('选择跳层数量：', screenWidth / 2, boxY + Math.floor(95 * scale));

        // 三个跳层选项按钮
        var options = towerSystem.hiddenPathDialog.options;
        var optBtnWidth = Math.floor(90 * scale);
        var optBtnHeight = Math.floor(50 * scale);
        var optBtnY = boxY + Math.floor(120 * scale);
        var optSpacing = Math.floor(15 * scale);
        var totalOptWidth = options.length * optBtnWidth + (options.length - 1) * optSpacing;
        var optStartX = (screenWidth - totalOptWidth) / 2;

        options.forEach(function(opt, i) {
            var btnX = optStartX + i * (optBtnWidth + optSpacing);

            // 按钮背景（渐变色）
            var gradient = ctx.createLinearGradient(btnX, optBtnY, btnX, optBtnY + optBtnHeight);
            gradient.addColorStop(0, '#9b59b6');
            gradient.addColorStop(1, '#8e44ad');
            ctx.fillStyle = gradient;
            fillRoundRect(ctx, btnX, optBtnY, optBtnWidth, optBtnHeight, 6);

            // 按钮边框
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            strokeRoundRect(ctx, btnX, optBtnY, optBtnWidth, optBtnHeight, 6);

            // 跳层数
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
            ctx.fillText('+' + opt.skip + '层', btnX + optBtnWidth / 2, optBtnY + Math.floor(20 * scale));

            // 目标层数
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText('→ ' + opt.targetFloor + '层', btnX + optBtnWidth / 2, optBtnY + Math.floor(38 * scale));
        });

        // 等一下按钮
        var waitBtnWidth = Math.floor(120 * scale);
        var waitBtnHeight = Math.floor(40 * scale);
        var waitBtnX = (screenWidth - waitBtnWidth) / 2;
        var waitBtnY = boxY + boxHeight - Math.floor(55 * scale);

        ctx.fillStyle = '#555555';
        fillRoundRect(ctx, waitBtnX, waitBtnY, waitBtnWidth, waitBtnHeight, 6);
        ctx.fillStyle = '#aaaaaa';
        ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillText('离开', waitBtnX + waitBtnWidth / 2, waitBtnY + waitBtnHeight / 2);
    }

    // ==================== renderBattle ====================
    function renderBattle(monster, stars, hp, maxHp, shield, stunned, stunEndTime) {
        if (!monster) return;
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var fillRoundRect = getFillRoundRect();
        var comboState = getComboState();

        // === 怪物显示 ===
        var monsterEmoji = monster.emoji || '🌫️';
        var monsterName = monster.name || '邪灵';
        var monsterSize = Math.floor(60 * scale);
        var monsterX = screenWidth / 2;
        var monsterY = getDesignOffsetY() + Math.floor(DESIGN_HEIGHT / 3 * scale);

        ctx.font = monsterSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(monsterEmoji, monsterX, monsterY);

        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(monsterName, monsterX, monsterY + monsterSize / 2 + 5);

        // 怪物血条
        var mHpBarWidth = Math.floor(120 * scale);
        var mHpBarHeight = 8;
        var mHpBarX = monsterX - mHpBarWidth / 2;
        var mHpBarY = monsterY - monsterSize / 2 - 15;
        var mHpPercent = Math.max(0, Math.min(1, monster.hp / monster.maxHp));

        ctx.fillStyle = '#333333';
        fillRoundRect(ctx, mHpBarX, mHpBarY, mHpBarWidth, mHpBarHeight, 3);

        // 塔怪物白色残影血条（统一 DelayedHpTracker）
        var _tMonDelay = _towerHpTracker.get(monster, monster.hp, monster.maxHp);
        if (_tMonDelay.delayedHp > monster.hp) {
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = '#ffffff';
            fillRoundRect(ctx, mHpBarX, mHpBarY, mHpBarWidth * _tMonDelay.ratio, mHpBarHeight, 3);
            ctx.restore();
        }

        var mHpColor = mHpPercent > 0.5 ? '#4CAF50' : (mHpPercent > 0.25 ? '#FF9800' : '#ff6b6b');
        ctx.fillStyle = mHpColor;
        fillRoundRect(ctx, mHpBarX, mHpBarY, mHpBarWidth * mHpPercent, mHpBarHeight, 3);

        // === 连击显示 ===
        if (comboState.count > 0) {
            if (comboState.slideTriggered) {
                comboState.slideAnim += 0.08;
                if (comboState.slideAnim >= 1) {
                    comboState.slideAnim = 1;
                    comboState.slideTriggered = false;
                }
            }
            var slideEased = 1 - Math.pow(1 - comboState.slideAnim, 3);
            var slideOffset = Math.floor(200 * scale * (1 - slideEased));

            var charConfig = getCurrentCharacterConfig();
            var comboLevel = charConfig ? Math.floor(comboState.count / charConfig.comboThreshold) : 0;

            var comboColor = '#ffffff';
            if (comboLevel >= 3) comboColor = '#ff00ff';
            else if (comboLevel >= 2) comboColor = '#ffd700';
            else if (comboLevel >= 1) comboColor = '#00ff00';

            var comboX = screenWidth - 20;
            var comboY = getDesignOffsetY() + Math.floor(DESIGN_HEIGHT / 3 * scale + 150 * scale);
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'right';

            ctx.fillStyle = comboColor;
            var comboNumSize = Math.floor(40 * scale);
            ctx.font = 'bold ' + comboNumSize + 'px sans-serif';
            ctx.fillText(comboState.count, comboX - Math.floor(20 * scale) - Math.floor(55 * scale) + slideOffset, comboY);

            ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
            ctx.fillText(' 连灵', comboX + slideOffset, comboY + comboNumSize * 0.15);

            var _cf = getCombatFeatures();
            if (comboLevel > 0 && _cf.comboDisplay === 'full') {
                ctx.font = Math.floor(16 * scale) + 'px sans-serif';
                ctx.fillStyle = '#87CEEB';
                ctx.fillText('Lv.' + comboLevel, comboX + slideOffset, comboY + Math.floor(25 * scale));
            }
            ctx.textAlign = 'left';
        }

        // === 星星渲染 ===
        var now = Date.now();
        for (var i = stars.length - 1; i >= 0; i--) {
            var star = stars[i];
            if (now - star.spawnTime > star.lifetime) {
                stars.splice(i, 1);
                continue;
            }
            var remaining = star.lifetime - (now - star.spawnTime);
            var alpha = 1;
            if (remaining < 500) alpha = remaining / 500;

            ctx.save();
            ctx.globalAlpha = alpha;
            var starDrawObj = { type: star.type, size: star.size, scale: 1, visible: true };
            uiCore.drawStar(starDrawObj, star.x, star.y, star.size, 1);
            ctx.restore();
        }

        // === 动画渲染 ===
        var _cf = getCombatFeatures();
        if (_cf.critDisplay) { getUpdateCritAnimations()(); getDrawCritAnimations()(scale); }
        if (_cf.quickTapDisplay) { getUpdateQuickTapAnimations()(); getDrawQuickTapAnimations()(scale); }
        if (_cf.starAttackEffects) {
            getUpdateMeteorAnimations()(); getDrawMeteorAnimations()(scale);
            getUpdateMeteorExplosions()(); getDrawMeteorExplosions()(scale);
        }
        if (_cf.monsterProjectile) { getUpdateMonsterProjectileAnimations()(); getDrawMonsterProjectileAnimations()(scale); }
        getUpdateHpBarCounterAnimations()(); getDrawHpBarCounterAnimations()(scale);
        getUpdatePlayerDamageAnimations()(); getDrawPlayerDamageAnimations()(scale);
        getUpdateMonsterDamageAnimations()(); getDrawMonsterDamageAnimations()(scale);
        getUpdateStarBurstAnimations()(); getDrawStarBurstAnimations()(scale);
        getDrawGameMessages()(scale);
        getUpdateTimeDamageAnimations()(); getDrawTimeDamageAnimations()(scale);

        // === 玩家血条 + 护盾 ===
        var hpBarWidth = Math.floor(200 * scale);
        var hpBarHeight = Math.floor(12 * scale);
        var hpBarX = screenWidth / 2 - hpBarWidth / 2;
        var hpBarY = screenHeight - Math.floor(50 * scale);

        if (shield > 0) {
            var shieldBarY = hpBarY - Math.floor(16 * scale);
            var shieldPercent = Math.min(1, shield / 50);
            ctx.fillStyle = '#333333';
            fillRoundRect(ctx, hpBarX, shieldBarY, hpBarWidth, Math.floor(10 * scale), Math.floor(3 * scale));
            ctx.fillStyle = '#00BFFF';
            fillRoundRect(ctx, hpBarX, shieldBarY, hpBarWidth * shieldPercent, Math.floor(10 * scale), Math.floor(3 * scale));
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(10 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🛡️' + shield, screenWidth / 2, shieldBarY + Math.floor(5 * scale));
        }

        ctx.fillStyle = '#333333';
        fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth, hpBarHeight, Math.floor(4 * scale));

        // 塔战斗玩家白色残影血条（统一 DelayedHpTracker）
        var _tCombatDelay = _towerHpTracker.get(towerSystem, hp, maxHp);
        if (_tCombatDelay.delayedHp > hp) {
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = '#ffffff';
            fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth * _tCombatDelay.ratio, hpBarHeight, Math.floor(4 * scale));
            ctx.restore();
        }

        var hpPercent = hp / maxHp;
        var hpColor = '#4CAF50';
        if (hpPercent <= 0.25) hpColor = '#ff6b6b';
        else if (hpPercent <= 0.5) hpColor = '#FF9800';

        ctx.fillStyle = hpColor;
        fillRoundRect(ctx, hpBarX, hpBarY, hpBarWidth * Math.max(0, hpPercent), hpBarHeight, Math.floor(4 * scale));

        // === 眩晕提示 ===
        if (stunned && Date.now() < stunEndTime) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
            var stunRemaining = Math.ceil((stunEndTime - Date.now()) / 1000 * 10) / 10;
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold ' + Math.floor(24 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡ 被打断! ' + stunRemaining + 's', screenWidth / 2, screenHeight / 2);
        }
    }

    // ==================== renderTowerResult ====================
    function renderTowerResult() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var towerSystem = getTowerSystem();
        var playerData = getPlayerData();
        var Assets = getAssets();
        var fillRoundRect = getFillRoundRect();
        var strokeRoundRect = getStrokeRoundRect();

        // 背景
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 标题
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold ' + Math.floor(32 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔻 挑战失败 🔻', screenWidth / 2, Math.floor(80 * scale));

        // 结算面板
        var panelWidth = Math.floor(300 * scale);
        var panelHeight = Math.floor(300 * scale);
        var panelX = (screenWidth - panelWidth) / 2;
        var panelY = Math.floor(120 * scale);

        // 面板背景（圆角）
        ctx.fillStyle = 'rgba(30, 30, 50, 0.9)';
        var panelRadius = Math.floor(15 * scale);
        fillRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, panelRadius);
        ctx.strokeStyle = '#4a90d9';
        ctx.lineWidth = 2;
        strokeRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, panelRadius);

        // 结算内容
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(20 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';

        var yOffset = panelY + Math.floor(50 * scale);

        // 到达层数
        ctx.fillStyle = '#FFD700';
        ctx.fillText('到达层数', screenWidth / 2, yOffset);
        yOffset += Math.floor(30 * scale);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(28 * scale) + 'px sans-serif';
        ctx.fillText('第 ' + (towerSystem.resultData ? towerSystem.resultData.highestFloor : 1) + ' 层', screenWidth / 2, yOffset);

        // 最高记录
        yOffset += Math.floor(40 * scale);
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('最高记录: 第 ' + (playerData.infiniteTower.highestFloor || 1) + ' 层', screenWidth / 2, yOffset);

        // 获得灵币
        yOffset += Math.floor(35 * scale);
        ctx.font = Math.floor(20 * scale) + 'px sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('获得灵币', screenWidth / 2, yOffset);
        yOffset += Math.floor(30 * scale);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(24 * scale) + 'px sans-serif';

        // 灵币图标
        var resultIconSize = Math.floor(20 * scale);
        var goldAmount = towerSystem.resultData ? towerSystem.resultData.earnedGold : 0;
        if (Assets.goldIcon && Assets.goldIcon.complete) {
            var goldText = ' ' + goldAmount;
            var textWidth = ctx.measureText(goldText).width;
            var totalWidth = resultIconSize + textWidth;
            var startX = screenWidth / 2 - totalWidth / 2;
            ctx.drawImage(Assets.goldIcon, startX, yOffset - Math.floor(16 * scale), resultIconSize, resultIconSize);
            ctx.fillText(goldText, startX + resultIconSize, yOffset);
        } else {
            ctx.fillText('💰 ' + goldAmount, screenWidth / 2, yOffset);
        }

        // 按钮
        var btnWidth = Math.floor(200 * scale);
        var btnHeight = Math.floor(50 * scale);
        var btnY = panelY + panelHeight + Math.floor(30 * scale);

        // 重新开始按钮
        var restartBtnY = btnY;
        ctx.fillStyle = '#4CAF50';
        fillRoundRect(ctx, (screenWidth - btnWidth) / 2, restartBtnY, btnWidth, btnHeight, 8);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('重新开始', screenWidth / 2, restartBtnY + btnHeight / 2);

        // 退出无尽按钮
        var exitBtnY = restartBtnY + btnHeight + Math.floor(15 * scale);
        ctx.fillStyle = '#f44336';
        fillRoundRect(ctx, (screenWidth - btnWidth) / 2, exitBtnY, btnWidth, btnHeight, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('退出无尽', screenWidth / 2, exitBtnY + btnHeight / 2);

        ctx.textBaseline = 'alphabetic';
    }

    // ==================== renderTowerResume ====================
    function renderTowerResume() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var playerData = getPlayerData();
        var fillRoundRect = getFillRoundRect();
        var strokeRoundRect = getStrokeRoundRect();

        // 背景
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 标题
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(28 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏰 无尽之塔', screenWidth / 2, Math.floor(80 * scale));

        // 发现存档提示
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(20 * scale) + 'px sans-serif';
        ctx.fillText('发现未完成的挑战', screenWidth / 2, Math.floor(130 * scale));

        // 存档信息面板
        var panelWidth = Math.floor(280 * scale);
        var panelHeight = Math.floor(180 * scale);
        var panelX = (screenWidth - panelWidth) / 2;
        var panelY = Math.floor(160 * scale);

        ctx.fillStyle = 'rgba(30, 30, 50, 0.9)';
        fillRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, 15);
        ctx.strokeStyle = '#4a90d9';
        ctx.lineWidth = 2;
        strokeRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, 15);

        // 存档详情
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(18 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';

        var yOffset = panelY + Math.floor(40 * scale);

        // 当前层数
        ctx.fillStyle = '#FFD700';
        ctx.fillText('第 ' + (playerData.infiniteTower.currentFloor || 1) + ' 层', screenWidth / 2, yOffset);
        yOffset += Math.floor(35 * scale);

        // 当前血量
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('灵能: ' + (playerData.infiniteTower.currentHp || 100) + '/' + (playerData.infiniteTower.maxHp || 100), screenWidth / 2, yOffset);
        yOffset += Math.floor(35 * scale);

        // 已收集奖励
        var totalGold = 0;
        (playerData.infiniteTower.collectedRewards || []).forEach(function(r) {
            if (r.type === 'gold') totalGold += r.amount;
        });
        ctx.fillStyle = '#FFD700';
        ctx.fillText('已收集: ' + totalGold + ' 灵币', screenWidth / 2, yOffset);
        yOffset += Math.floor(35 * scale);

        // 最高记录
        ctx.fillStyle = '#aaaaaa';
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillText('最高记录: 第 ' + (playerData.infiniteTower.highestFloor || 0) + ' 层', screenWidth / 2, yOffset);

        // 按钮
        var btnWidth = Math.floor(200 * scale);
        var btnHeight = Math.floor(50 * scale);
        var btnY = panelY + panelHeight + Math.floor(30 * scale);

        // 继续挑战按钮
        ctx.fillStyle = '#4CAF50';
        fillRoundRect(ctx, (screenWidth - btnWidth) / 2, btnY, btnWidth, btnHeight, 8);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('继续挑战', screenWidth / 2, btnY + btnHeight / 2);

        // 放弃进度按钮
        var giveUpBtnY = btnY + btnHeight + Math.floor(15 * scale);
        ctx.fillStyle = '#e74c3c';
        fillRoundRect(ctx, (screenWidth - btnWidth) / 2, giveUpBtnY, btnWidth, btnHeight, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('放弃进度', screenWidth / 2, giveUpBtnY + btnHeight / 2);

        // 提示
        ctx.fillStyle = '#888888';
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        ctx.fillText('放弃进度将结算已收集的奖励', screenWidth / 2, giveUpBtnY + btnHeight + Math.floor(25 * scale));
    }

    // ==================== 触摸处理 ====================

    function handleTowerClick(x, y) {
        Logger.info('handleTowerClick', x, y, getTowerSystem().grid.length);

        var scale = getScreenScale();
        var towerSystem = getTowerSystem();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var playerData = getPlayerData();
        var GAME_STATE = getGameState();

        // 隐藏之路弹窗处理（优先处理）
        if (towerSystem.hiddenPathDialog) {
            var boxWidth = Math.floor(320 * scale);
            var boxHeight = Math.floor(280 * scale);
            var boxX = (screenWidth - boxWidth) / 2;
            var boxY = (screenHeight - boxHeight) / 2;

            var options = towerSystem.hiddenPathDialog.options;
            var optBtnWidth = Math.floor(90 * scale);
            var optBtnHeight = Math.floor(50 * scale);
            var optBtnY = boxY + Math.floor(120 * scale);
            var optSpacing = Math.floor(15 * scale);
            var totalOptWidth = options.length * optBtnWidth + (options.length - 1) * optSpacing;
            var optStartX = (screenWidth - totalOptWidth) / 2;

            for (var i = 0; i < options.length; i++) {
                var btnX = optStartX + i * (optBtnWidth + optSpacing);
                if (x >= btnX && x <= btnX + optBtnWidth &&
                    y >= optBtnY && y <= optBtnY + optBtnHeight) {
                    towerSystem.enterHiddenPath(options[i].targetFloor);
                    towerSystem.hiddenPathDialog = null;
                    return;
                }
            }

            var waitBtnWidth = Math.floor(120 * scale);
            var waitBtnHeight = Math.floor(40 * scale);
            var waitBtnX = (screenWidth - waitBtnWidth) / 2;
            var waitBtnY = boxY + boxHeight - Math.floor(55 * scale);

            if (x >= waitBtnX && x <= waitBtnX + waitBtnWidth &&
                y >= waitBtnY && y <= waitBtnY + waitBtnHeight) {
                towerSystem.hiddenPathDialog = null;
                return;
            }
            return;
        }

        // 如果在战斗中
        if (towerSystem.inCombat) {
            var btnWidth = Math.floor(120 * scale);
            var btnHeight = Math.floor(45 * scale);
            var btnY = (screenHeight - Math.floor(350 * scale)) / 2 + Math.floor(350 * scale) - Math.floor(100 * scale);

            if (x >= screenWidth / 2 - btnWidth / 2 && x <= screenWidth / 2 + btnWidth / 2 &&
                y >= btnY && y <= btnY + btnHeight) {
                towerSystem.attackMonster();
                return;
            }

            var fleeBtnY = btnY + btnHeight + Math.floor(15 * scale);
            if (x >= screenWidth / 2 - btnWidth / 2 && x <= screenWidth / 2 + btnWidth / 2 &&
                y >= fleeBtnY && y <= fleeBtnY + Math.floor(35 * scale)) {
                towerSystem.playerHp -= Math.floor(towerSystem.playerMaxHp * 0.1);
                towerSystem.inCombat = false;
                towerSystem.combatMonster = null;
                towerSystem.currentCell = null;

                if (towerSystem.playerHp <= 0) {
                    towerSystem.playerDeath();
                }
                return;
            }
            return;
        }

        if (isBackButtonClicked(x, y)) {
            towerSystem.pauseTower();
            return;
        }

        var mapTop = Math.floor(70 * scale);
        var mapBottom = screenHeight - Math.floor(80 * scale);
        var cellSize = Math.floor(30 * scale);
        var mapLeft = Math.floor(20 * scale);

        if (x >= mapLeft && x <= screenWidth - mapLeft && y >= mapTop && y <= mapBottom) {
            var clickCellX = Math.floor((x - mapLeft - towerSystem.viewOffsetX) / cellSize);
            var clickCellY = Math.floor((y - mapTop - towerSystem.viewOffsetY) / cellSize);

            var dx = clickCellX - towerSystem.playerX;
            var dy = clickCellY - towerSystem.playerY;

            if (Math.abs(dx) + Math.abs(dy) === 1) {
                towerSystem.movePlayer(dx, dy);
                return;
            }
        }
    }

    function handleTowerTouchEnd(x, y) {
        var towerSystem = getTowerSystem();
        var audioSystem = getAudioSystem();

        if (isBackButtonClicked(x, y)) {
            towerSystem.touchStartX = 0;
            towerSystem.touchStartY = 0;
            if (audioSystem) audioSystem.playTowerExit();
            towerSystem.pauseTower();
            return;
        }

        if (towerSystem.touchStartX === 0 && towerSystem.touchStartY === 0) {
            return;
        }

        towerSystem.touchStartX = 0;
        towerSystem.touchStartY = 0;

        handleTowerClick(x, y);
    }

    function handleTowerTouchMove(x, y) {
        var towerSystem = getTowerSystem();
        if (towerSystem.inCombat) return;

        if (towerSystem.touchStartX > 0 && towerSystem.touchStartY > 0) {
            var dx = x - towerSystem.touchStartX;
            var dy = y - towerSystem.touchStartY;
            var threshold = 30;

            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    towerSystem.movePlayer(dx > 0 ? 1 : -1, 0);
                } else {
                    towerSystem.movePlayer(0, dy > 0 ? 1 : -1);
                }
                towerSystem.isDragging = true;
                towerSystem.touchStartX = 0;
                towerSystem.touchStartY = 0;
            }
        }
    }

    function handleTowerResultTouch(x, y) {
        var towerSystem = getTowerSystem();
        var audioSystem = getAudioSystem();
        var GAME_STATE = getGameState();

        if (towerSystem.resultEndTime > 0) {
            var timeSinceEnd = Date.now() - towerSystem.resultEndTime;
            if (timeSinceEnd < 1500) {
                return false;
            }
        }

        var scale = getScreenScale();
        var screenWidth = getScreenWidth();
        var btnWidth = Math.floor(200 * scale);
        var btnHeight = Math.floor(50 * scale);
        var panelHeight = Math.floor(300 * scale);
        var panelY = Math.floor(120 * scale);
        var btnY = panelY + panelHeight + Math.floor(30 * scale);

        var restartBtnY = btnY;
        if (x >= (screenWidth - btnWidth) / 2 && x <= (screenWidth + btnWidth) / 2 &&
            y >= restartBtnY && y <= restartBtnY + btnHeight) {
            towerSystem.restartTower();
            return true;
        }

        var exitBtnY = restartBtnY + btnHeight + Math.floor(15 * scale);
        if (x >= (screenWidth - btnWidth) / 2 && x <= (screenWidth + btnWidth) / 2 &&
            y >= exitBtnY && y <= exitBtnY + btnHeight) {
            towerSystem.resultData = null;
            if (audioSystem) audioSystem.playTowerExit();
            transitionTo(GAME_STATE.MENU);
            return true;
        }

        return false;
    }

    function handleTowerResumeTouch(x, y) {
        var towerSystem = getTowerSystem();
        var playerData = getPlayerData();
        var audioSystem = getAudioSystem();
        var GAME_STATE = getGameState();

        var scale = getScreenScale();
        var screenWidth = getScreenWidth();
        var btnWidth = Math.floor(200 * scale);
        var btnHeight = Math.floor(50 * scale);
        var panelHeight = Math.floor(180 * scale);
        var panelY = Math.floor(160 * scale);
        var btnY = panelY + panelHeight + Math.floor(30 * scale);

        if (x >= (screenWidth - btnWidth) / 2 && x <= (screenWidth + btnWidth) / 2 &&
            y >= btnY && y <= btnY + btnHeight) {
            towerSystem.init();
            transitionTo(GAME_STATE.TOWER);
            return true;
        }

        var giveUpBtnY = btnY + btnHeight + Math.floor(15 * scale);
        if (x >= (screenWidth - btnWidth) / 2 && x <= (screenWidth + btnWidth) / 2 &&
            y >= giveUpBtnY && y <= giveUpBtnY + btnHeight) {
            if (audioSystem) audioSystem.playTowerExit();
            towerSystem.currentFloor = playerData.infiniteTower.currentFloor || 1;
            towerSystem.collectedRewards = JSON.parse(JSON.stringify(playerData.infiniteTower.collectedRewards || []));
            towerSystem.playerMaxHp = playerData.infiniteTower.maxHp || 100;
            towerSystem.giveUp();
            return true;
        }

        return false;
    }

    return {
        renderTower: renderTower,
        renderHiddenPathDialog: renderHiddenPathDialog,
        renderBattle: renderBattle,
        renderTowerResult: renderTowerResult,
        renderTowerResume: renderTowerResume,
        handleTowerClick: handleTowerClick,
        handleTowerTouchEnd: handleTowerTouchEnd,
        handleTowerTouchMove: handleTowerTouchMove,
        handleTowerResultTouch: handleTowerResultTouch,
        handleTowerResumeTouch: handleTowerResumeTouch
    };
}

export { createTowerRenderer };
