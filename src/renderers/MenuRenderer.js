/**
 * MenuRenderer — 主菜单、游戏结束、暂停、排行榜、设置 渲染模块
 */
function createMenuRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var uiCore = deps.uiCore;
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getPlayerData = deps.getPlayerData;
    var getBestScore = deps.getBestScore;
    var getScore = deps.getScore;
    var getStarMode = deps.getStarMode;
    var getSTAR_MODE = deps.getSTAR_MODE;
    var getFALLING_CONFIG = deps.getFALLING_CONFIG;
    var getUiScrollState = deps.getUiScrollState;
    var getDebugPanelOpen = deps.getDebugPanelOpen;
    var getCharacters = deps.getCharacters;
    var getCharacterKey = deps.getCharacterKey;
    var isModeUnlocked = deps.isModeUnlocked;
    var getSkills = deps.getSkills;
    var getPets = deps.getPets;
    var getCharacterExperience = deps.getCharacterExperience;
    var getCharacterLevelBonus = deps.getCharacterLevelBonus;
    var getCalculateTotalAttack = deps.getCalculateTotalAttack;
    var getHasClaimableRewards = deps.getHasClaimableRewards;
    var getLeaderboardSharedCanvas = deps.getLeaderboardSharedCanvas;
    var getCurrentLeaderboardTab = deps.getCurrentLeaderboardTab;
    var setCurrentLeaderboardTab = deps.setCurrentLeaderboardTab;
    var getGameState = deps.getGameState;
    var getSeasonScore = deps.getSeasonScore;
    var getSeasonBestScore = deps.getSeasonBestScore;
    var getSeasonRank = deps.getSeasonRank;
    var getSeasonContent = deps.getSeasonContent;
    var getSeasonSelection = deps.getSeasonSelection;
    var getAdSystem = deps.getAdSystem;
    var getTimeLeft = deps.getTimeLeft;
    var uiConfig = deps.uiConfig || null;

    // 注册可编辑UI元素
    if (uiConfig) {
        uiConfig.register({
            id: 'menu_start_btn', renderer: 'menu', state: 'menu',
            label: '踏入灵域', category: 'button',
            getPosition: function() {
                var sc = getScreenScale();
                var sw = getScreenWidth();
                var sh = getScreenHeight();
                var bw = Math.floor(130 * sc);
                var bh = Math.floor(45 * sc);
                return { x: sw / 2 - bw / 2, y: sh * 0.66 - bh / 2, width: bw, height: bh };
            }
        });
        uiConfig.register({
            id: 'menu_stage_btn', renderer: 'menu', state: 'menu',
            label: '闯关模式', category: 'button',
            getPosition: function() {
                var sc = getScreenScale();
                var sw = getScreenWidth();
                var sh = getScreenHeight();
                var bw = Math.floor(130 * sc);
                var bh = Math.floor(45 * sc);
                return { x: sw / 2 - bw / 2, y: sh * 0.74 - bh / 2, width: bw, height: bh };
            }
        });
        uiConfig.register({
            id: 'menu_settings_icon', renderer: 'menu', state: 'menu',
            label: '设置图标', category: 'icon',
            getPosition: function() {
                var sc = getScreenScale();
                var sz = Math.floor(32 * sc);
                return { x: Math.floor(18 * sc), y: Math.floor(15 * sc), width: sz, height: sz };
            }
        });
        uiConfig.register({
            id: 'menu_debug_icon', renderer: 'menu', state: 'menu',
            label: '调试图标', category: 'icon',
            getPosition: function() {
                var sc = getScreenScale();
                var sw = getScreenWidth();
                var sz = Math.floor(32 * sc);
                return { x: sw - Math.floor(50 * sc), y: Math.floor(15 * sc), width: sz, height: sz };
            }
        });
        uiConfig.register({
            id: 'menu_btn', renderer: 'menu', state: 'menu',
            label: '菜单按钮(收起)', category: 'button',
            getPosition: function() {
                var sc = getScreenScale();
                var sh = getScreenHeight();
                var sz = Math.floor(50 * sc);
                var collapsedSz = Math.floor(sz * 0.8);
                return { x: Math.floor(15 * sc) - Math.floor(20 * sc), y: sh - Math.floor(65 * sc), width: collapsedSz, height: collapsedSz };
            }
        });
        uiConfig.register({
            id: 'menu_title', renderer: 'menu', state: 'menu',
            label: '游戏标题', category: 'text',
            getPosition: function() {
                var sh = getScreenHeight();
                return { x: 50, y: sh / 3 - 30, width: getScreenWidth() - 100, height: 60 };
            }
        });
    }

    function renderMenu() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var playerData = getPlayerData();
        var bestScore = getBestScore();
        var uiScrollState = getUiScrollState();
        var debugPanelOpen = getDebugPanelOpen();
        var Characters = getCharacters();
        var hasClaimableRewards = getHasClaimableRewards();
        var getCharacterExperience = deps.getCharacterExperience;
        var getCharacterLevelBonus = deps.getCharacterLevelBonus;
        var calculateTotalAttack = getCalculateTotalAttack();
        var fillRoundRect = getFillRoundRect();

        var drawText = uiCore.drawText;
        var drawButton = uiCore.drawButton;

        // 绘制背景图片
        if (Assets.backgroundImage && Assets.backgroundImage.complete) {
            // 检查是否需要重新计算位置（屏幕尺寸变化或首次渲染）
            if (!Assets.bgPositionCache ||
                Assets.bgPositionCache.screenWidth !== screenWidth ||
                Assets.bgPositionCache.screenHeight !== screenHeight) {

                var bgImg = Assets.backgroundImage;
                var imgRatio = bgImg.width / bgImg.height;
                var screenRatio = screenWidth / screenHeight;

                var drawWidth, drawHeight, drawX, drawY;

                if (imgRatio > screenRatio) {
                    drawHeight = screenHeight;
                    drawWidth = screenHeight * imgRatio;
                    drawX = (screenWidth - drawWidth) / 2;
                    drawY = 0;
                } else {
                    drawWidth = screenWidth;
                    drawHeight = screenWidth / imgRatio;
                    drawX = 0;
                    drawY = (screenHeight - drawHeight) / 2;
                }

                Assets.bgPositionCache = {
                    screenWidth: screenWidth,
                    screenHeight: screenHeight,
                    drawX: drawX,
                    drawY: drawY,
                    drawWidth: drawWidth,
                    drawHeight: drawHeight
                };
            }

            var cache = Assets.bgPositionCache;
            ctx.drawImage(Assets.backgroundImage, cache.drawX, cache.drawY, cache.drawWidth, cache.drawHeight);

            ctx.fillStyle = 'rgba(15, 15, 26, 0.7)';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
        } else {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
        }

        // 检查是否已解锁青铜小鼎（达到50分）
        var hasUnlockedStarter = playerData.ownedCharacters && playerData.ownedCharacters.indexOf('char_001') !== -1;

        // 标题
        var titleOv = uiConfig ? uiConfig.get('menu_title') : { dx: 0, dy: 0 };
        drawText('🏺 器落山河 🏺', screenWidth / 2 + titleOv.dx * scale, screenHeight / 3 + titleOv.dy * scale, Math.floor(48 * scale), '#ffd700');

        // 说明
        drawText('收集灵韵，唤醒器灵', screenWidth / 2, screenHeight / 2 - 30 * scale, Math.floor(24 * scale), '#ffffff');
        drawText('60秒内尽可能多地收集！', screenWidth / 2, screenHeight / 2 + 10 * scale, Math.floor(24 * scale), '#ffffff');

        // 最高分
        if (bestScore > 0) {
            drawText('最高分: ' + bestScore, screenWidth / 2, screenHeight / 2 + 50 * scale, Math.floor(20 * scale), '#ffd700');
        }

        // 开始按钮
        var btnWidth = Math.floor(100 * scale);
        var btnHeight = Math.floor(40 * scale);
        var startOv = uiConfig ? uiConfig.get('menu_start_btn') : { dx: 0, dy: 0 };
        drawButton('踏入灵域', screenWidth / 2 + startOv.dx * scale, screenHeight * 0.66 + startOv.dy * scale, btnWidth, btnHeight, '#ffd700');

        // 以下UI只有在解锁玉蝉仙（达到50分）后才显示
        if (hasUnlockedStarter) {
            // 闯关模式按钮（开始游戏下方）
            var stageOv = uiConfig ? uiConfig.get('menu_stage_btn') : { dx: 0, dy: 0 };
            drawButton('闯关模式', screenWidth / 2 + stageOv.dx * scale, screenHeight * 0.74 + stageOv.dy * scale, btnWidth, btnHeight, '#FF6B6B');

            // 左下角展开菜单
            var menuBtnSize = Math.floor(50 * scale);
            var menuBtnX = Math.floor(15 * scale);
            var menuBtnY = screenHeight - Math.floor(65 * scale);
            var menuItemHeight = Math.floor(40 * scale);
            var menuItemWidth = Math.floor(100 * scale);
            var menuGap = Math.floor(8 * scale);

            // 展开的菜单项（从下往上：背包、商城、排行榜、赛季）
            var menuItems = [
                { id: 'backpack', name: '背包', icon: '🎒', color: '#87CEEB' },
                { id: 'shop', name: '商城', icon: '🛒', color: '#FF8C00' },
                { id: 'leaderboard', name: '排行榜', icon: '🏆', color: '#9b59b6' },
                { id: 'season', name: '赛季', icon: '⏳', color: '#E74C3C' },
                { id: 'boss', name: '守护灵战', icon: '🏛️', color: '#FF6B6B' },
                { id: 'tower', name: '无尽之塔', icon: '🏰', color: '#8B5CF6' },
                { id: 'fusion', name: '融合', icon: '🔮', color: '#C084FC' },
                { id: 'upgrade', name: '升级', icon: '⬆️', color: '#22C55E' }
            ];

            // 如果菜单展开，先绘制展开的按钮
            if (uiScrollState.menuExpanded) {
                for (var mi = 0; mi < menuItems.length; mi++) {
                    var item = menuItems[mi];
                    var itemY = menuBtnY - (mi + 1) * (menuItemHeight + menuGap);
                    var iconSize = Math.floor(32 * scale);
                    var unlockResult = isModeUnlocked(item.id, playerData, getBestScore());
                    var isLocked = !unlockResult.unlocked;

                    ctx.save();
                    if (isLocked) ctx.globalAlpha = 0.4;

                    if (!isLocked) {
                        if (item.id === 'backpack' && Assets.backpackImage && Assets.backpackImage.complete) {
                            ctx.drawImage(Assets.backpackImage, menuBtnX + (menuItemWidth - iconSize) / 2 - Math.floor(30 * scale), itemY + (menuItemHeight - iconSize) / 2, iconSize, iconSize);
                        } else if (item.id === 'leaderboard' && Assets.leaderboardIcon && Assets.leaderboardIcon.complete) {
                            ctx.drawImage(Assets.leaderboardIcon, menuBtnX + (menuItemWidth - iconSize) / 2 - Math.floor(30 * scale), itemY + (menuItemHeight - iconSize) / 2, iconSize, iconSize);
                        } else if (item.id === 'season' && Assets.seasonIcon && Assets.seasonIcon.complete) {
                            ctx.drawImage(Assets.seasonIcon, menuBtnX + (menuItemWidth - iconSize) / 2 - Math.floor(30 * scale), itemY + (menuItemHeight - iconSize) / 2, iconSize, iconSize);
                        } else if (item.id === 'shop' && Assets.shopIcon && Assets.shopIcon.complete) {
                            ctx.drawImage(Assets.shopIcon, menuBtnX + (menuItemWidth - iconSize) / 2 - Math.floor(30 * scale), itemY + (menuItemHeight - iconSize) / 2, iconSize, iconSize);
                        } else if (item.id === 'tower' && Assets.towerIcon && Assets.towerIcon.complete) {
                            ctx.drawImage(Assets.towerIcon, menuBtnX + (menuItemWidth - iconSize) / 2 - Math.floor(30 * scale), itemY + (menuItemHeight - iconSize) / 2, iconSize, iconSize);
                        } else if (item.id === 'boss' && Assets.bossImage && Assets.bossImage.complete) {
                            ctx.drawImage(Assets.bossImage, menuBtnX + (menuItemWidth - iconSize) / 2 - Math.floor(30 * scale), itemY + (menuItemHeight - iconSize) / 2, iconSize, iconSize);
                        } else {
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(item.icon + ' ' + item.name, menuBtnX + menuItemWidth / 2, itemY + menuItemHeight / 2);
                        }
                    } else {
                        ctx.fillStyle = '#999999';
                        ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🔒 ' + item.name, menuBtnX + menuItemWidth / 2, itemY + menuItemHeight / 2);
                    }
                    ctx.restore();
                }
            }

            // 主菜单按钮（只显示图标，无背景）
            var menuImg = uiScrollState.menuExpanded ? Assets.menuButtonImage : Assets.menuButtonImageCollapsed;
            var collapsedOffset = !uiScrollState.menuExpanded;
            if (menuImg && menuImg.complete) {
                var menuImgRatio = menuImg.width / menuImg.height;
                var drawSize = collapsedOffset ? Math.floor(menuBtnSize * 0.8) : menuBtnSize;
                var drawX = collapsedOffset ? menuBtnX - Math.floor(20 * scale) : menuBtnX;
                var drawY = menuBtnY;
                if (collapsedOffset && uiConfig) {
                    var menuBtnOv = uiConfig.get('menu_btn');
                    drawX += menuBtnOv.dx * scale;
                    drawY += menuBtnOv.dy * scale;
                }
                var drawW, drawH;
                if (menuImgRatio >= 1) {
                    drawH = drawSize;
                    drawW = Math.floor(drawSize * menuImgRatio);
                } else {
                    drawW = drawSize;
                    drawH = Math.floor(drawSize / menuImgRatio);
                }
                ctx.drawImage(menuImg, drawX, drawY, drawW, drawH);
            } else {
                var fallbackX = menuBtnX + menuBtnSize / 2;
                var fallbackY = menuBtnY + menuBtnSize / 2;
                if (collapsedOffset && uiConfig) {
                    var menuBtnOv2 = uiConfig.get('menu_btn');
                    fallbackX += menuBtnOv2.dx * scale;
                    fallbackY += menuBtnOv2.dy * scale;
                }
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(24 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(uiScrollState.menuExpanded ? '✕' : '☰', fallbackX, fallbackY);
            }

            // 设置按钮（左上角图标）
            var settingIconSize = Math.floor(32 * scale);
            var settingsOv = uiConfig ? uiConfig.get('menu_settings_icon') : { dx: 0, dy: 0 };
            var settingIconX = Math.floor(18 * scale) + settingsOv.dx * scale;
            var settingIconY = Math.floor(15 * scale) + settingsOv.dy * scale;

            if (Assets.settingsIcon && Assets.settingsIcon.complete) {
                ctx.drawImage(Assets.settingsIcon, settingIconX, settingIconY, settingIconSize, settingIconSize);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(24 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚙️', settingIconX + settingIconSize / 2, settingIconY + settingIconSize / 2);
            }

            // 调试按钮（右上角）
            var debugOv = uiConfig ? uiConfig.get('menu_debug_icon') : { dx: 0, dy: 0 };
            var debugIconSize = Math.floor(32 * scale);
            var debugIconX = screenWidth - Math.floor(50 * scale) + debugOv.dx * scale;
            var debugIconY = Math.floor(15 * scale) + debugOv.dy * scale;

            ctx.fillStyle = debugPanelOpen ? '#FF6B6B' : '#4a4a6a';
            fillRoundRect(ctx, debugIconX, debugIconY, debugIconSize, debugIconSize, 4);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔧', debugIconX + debugIconSize / 2, debugIconY + debugIconSize / 2);

            // 任务按钮（设置图标下方）
            var taskIconSize = Math.floor(40 * scale);
            var taskIconY = Math.floor(15 * scale) + settingIconSize + Math.floor(10 * scale);
            var taskIconX = Math.floor(15 * scale);

            if (Assets.taskIcon && Assets.taskIcon.complete) {
                ctx.drawImage(Assets.taskIcon, taskIconX, taskIconY, taskIconSize, taskIconSize);
            } else {
                ctx.fillStyle = '#4a4a6a';
                fillRoundRect(ctx, taskIconX, taskIconY, taskIconSize, taskIconSize, 4);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(22 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('📋', taskIconX + taskIconSize / 2, taskIconY + taskIconSize / 2);
            }

            // 任务红点角标（有可领取奖励时显示）
            if (hasClaimableRewards()) {
                var redDotX = Math.floor(15 * scale) + taskIconSize - Math.floor(6 * scale);
                var redDotY = taskIconY + Math.floor(6 * scale);
                var redDotRadius = Math.floor(8 * scale);

                ctx.beginPath();
                ctx.arc(redDotX, redDotY, redDotRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#FF0000';
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.floor(2 * scale);
                ctx.stroke();
            }

            // 角色图标（右下角）
            if (playerData.ownedCharacters && playerData.ownedCharacters.length > 0 && playerData.currentCharacterId) {
                var currentCharId = playerData.currentCharacterId;

                var mappedCharId = getCharacterKey(currentCharId);
                var character = Characters[mappedCharId];

                if (character) {
                    var baseX = screenWidth - 180;
                    var baseY = screenHeight - 92;

                    var charExp = getCharacterExperience(currentCharId);
                    var expPercent = charExp.exp / charExp.maxExp;

                    var rightX = baseX + 90;
                    var rightY = baseY - 2;
                    var charIconSize = 50;

                    if (Assets.characterImages[mappedCharId] && Assets.characterImages[mappedCharId].complete) {
                        ctx.drawImage(Assets.characterImages[mappedCharId], rightX, rightY, charIconSize, charIconSize);
                    } else {
                        ctx.font = '48px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('👤', rightX + charIconSize / 2, rightY + charIconSize / 2);
                    }

                    var expBarWidth = charIconSize;
                    var expBarHeight = 8;
                    var expBarX = rightX;
                    var expBarY = rightY + charIconSize + 5;

                    ctx.fillStyle = '#333333';
                    fillRoundRect(ctx, expBarX, expBarY, expBarWidth, expBarHeight, 3);

                    ctx.fillStyle = '#4CAF50';
                    fillRoundRect(ctx, expBarX, expBarY, expBarWidth * expPercent, expBarHeight, 3);

                    ctx.fillStyle = '#aaaaaa';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText('Lv.' + charExp.level, rightX + expBarWidth / 2, expBarY + expBarHeight + 3);
                }
            }
        }
    }

    function renderLeaderboard() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var leaderboardSharedCanvas = getLeaderboardSharedCanvas();
        var currentLeaderboardTab = getCurrentLeaderboardTab();

        var drawText = uiCore.drawText;
        var drawButton = uiCore.drawButton;
        var drawBackButton = uiCore.drawBackButton;

        // 绘制背景
        if (Assets.backgroundImage && Assets.backgroundImage.complete) {
            var cache = Assets.bgPositionCache;
            if (cache) {
                ctx.drawImage(Assets.backgroundImage, cache.drawX, cache.drawY, cache.drawWidth, cache.drawHeight);
            }
            ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
        } else {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
        }

        // 标题
        drawText('🏆 排行榜 🏆', screenWidth / 2, Math.floor(40 * scale), Math.floor(36 * scale), '#ffd700');

        // 标签页切换按钮
        var tabWidth = Math.floor(100 * scale);
        var tabHeight = Math.floor(40 * scale);
        var tabY = Math.floor(80 * scale);
        var tabGap = Math.floor(10 * scale);
        var totalTabWidth = tabWidth * 3 + tabGap * 2;
        var tabStartX = (screenWidth - totalTabWidth) / 2;

        // 最高分标签
        var bestScoreTabColor = currentLeaderboardTab === 'best_score' ? '#ffd700' : '#4a4a6a';
        drawButton('⭐ 最高分', tabStartX + tabWidth / 2, tabY, tabWidth, tabHeight, bestScoreTabColor);

        // 净化数标签
        var killsTabColor = currentLeaderboardTab === 'total_kills' ? '#ff6b6b' : '#4a4a6a';
        drawButton('✨ 净化数', tabStartX + tabWidth + tabGap + tabWidth / 2, tabY, tabWidth, tabHeight, killsTabColor);

        // 赛季分标签
        var seasonTabColor = currentLeaderboardTab === 'season_score' ? '#E74C3C' : '#4a4a6a';
        drawButton('🏅 赛季分', tabStartX + (tabWidth + tabGap) * 2 + tabWidth / 2, tabY, tabWidth, tabHeight, seasonTabColor);

        // 排行榜列表区域
        if (leaderboardSharedCanvas) {
            var listStartY = Math.floor(140 * scale);
            var listH = screenHeight - listStartY;
            ctx.drawImage(leaderboardSharedCanvas, 0, 0, leaderboardSharedCanvas.width, leaderboardSharedCanvas.height, 0, listStartY, screenWidth, listH);
        }

        // 返回按钮
        drawBackButton();
    }

    function renderSettings() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var starMode = getStarMode();
        var STAR_MODE = getSTAR_MODE();
        var FALLING_CONFIG = getFALLING_CONFIG();

        var drawButton = uiCore.drawButton;
        var drawBackButton = uiCore.drawBackButton;

        // 背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold ' + Math.floor(36 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚙️ 设置', screenWidth / 2, Math.floor(80 * scale));

        // 星星模式设置
        var settingStartY = Math.floor(160 * scale);

        // 模式标题
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('灵韵显示模式', Math.floor(40 * scale), settingStartY);

        // 随机模式按钮
        var randomBtnY = settingStartY + Math.floor(40 * scale);
        var btnWidth = Math.floor(140 * scale);
        var btnHeight = Math.floor(40 * scale);
        var btnGap = Math.floor(20 * scale);
        var randomBtnX = screenWidth / 2 - btnWidth / 2 - btnGap / 2;
        var fallingBtnX = screenWidth / 2 + btnWidth / 2 + btnGap / 2;
        var randomBtnColor = starMode === STAR_MODE.RANDOM ? '#4CAF50' : '#4a4a6a';
        drawButton('🎲 随机生成', randomBtnX, randomBtnY, btnWidth, btnHeight, randomBtnColor);

        // 下落模式按钮
        var fallingBtnColor = starMode === STAR_MODE.FALLING ? '#4CAF50' : '#4a4a6a';
        drawButton('🎵 下落模式', fallingBtnX, randomBtnY, btnWidth, btnHeight, fallingBtnColor);

        // 当前模式说明
        ctx.fillStyle = '#aaaaaa';
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        var modeDesc = starMode === STAR_MODE.RANDOM
            ? '灵韵随机出现在屏幕上，点击收集'
            : '灵韵从上方下落，像音游一样点击';
        ctx.fillText(modeDesc, screenWidth / 2, randomBtnY + Math.floor(50 * scale));

        // 分隔线
        ctx.strokeStyle = '#444466';
        ctx.beginPath();
        ctx.moveTo(Math.floor(40 * scale), settingStartY + Math.floor(110 * scale));
        ctx.lineTo(screenWidth - Math.floor(40 * scale), settingStartY + Math.floor(110 * scale));
        ctx.stroke();

        // 下落模式详细设置（仅在下落模式时显示）
        if (starMode === STAR_MODE.FALLING) {
            var fallingSettingsY = settingStartY + Math.floor(140 * scale);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('下落模式设置', Math.floor(40 * scale), fallingSettingsY);

            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.fillText('下落速度: ' + FALLING_CONFIG.fallSpeed, Math.floor(40 * scale), fallingSettingsY + Math.floor(30 * scale));

            ctx.fillText('轨道数量: ' + FALLING_CONFIG.lanes, Math.floor(40 * scale), fallingSettingsY + Math.floor(55 * scale));
        }

        // 返回按钮
        drawBackButton();
    }

    function renderGameOver() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var playerData = getPlayerData();
        var bestScore = getBestScore();
        var score = getScore();
        var state = getGameState();
        var Characters = getCharacters();
        var Skills = getSkills();
        var Pets = getPets();
        var seasonScore = getSeasonScore();
        var seasonBestScore = getSeasonBestScore();
        var seasonRank = getSeasonRank();
        var seasonSelection = getSeasonSelection();
        var adSystem = getAdSystem();
        var timeLeft = getTimeLeft();

        var GAME_STATE = deps.getGAME_STATE ? deps.getGAME_STATE() : {};
        var drawText = uiCore.drawText;
        var drawButton = uiCore.drawButton;

        // 判断是否是赛季模式
        var isSeasonMode = (state === GAME_STATE.SEASON_PLAYING ||
            (playerData.seasonData && playerData.seasonData.selection &&
                playerData.seasonData.selection.character));

        // 绘制背景图片（使用缓存的背景位置）
        if (Assets.backgroundImage && Assets.backgroundImage.complete && Assets.bgPositionCache) {
            var cache = Assets.bgPositionCache;
            ctx.drawImage(Assets.backgroundImage, cache.drawX, cache.drawY, cache.drawWidth, cache.drawHeight);

            ctx.fillStyle = isSeasonMode ? 'rgba(20, 10, 10, 0.8)' : 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
        } else {
            ctx.fillStyle = isSeasonMode ? 'rgba(30, 10, 10, 0.95)' : 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
        }

        if (isSeasonMode) {
            // ===== 赛季模式结束界面 =====
            drawText('🏆 赛季结束 🏆', screenWidth / 2, screenHeight / 4, Math.floor(36 * scale), '#E74C3C');

            drawText(seasonScore.toString(), screenWidth / 2, screenHeight / 3, Math.floor(64 * scale), '#ffd700');

            drawText('赛季最高分: ' + seasonBestScore, screenWidth / 2, screenHeight / 3 + 50 * scale, Math.floor(20 * scale), '#ffffff');

            drawText('排名: 第 ' + seasonRank + ' 名', screenWidth / 2, screenHeight / 3 + 80 * scale, Math.floor(18 * scale), '#aaaaaa');

            // 配置信息
            var charData = Characters[seasonSelection.character];
            var skillNames = '';
            for (var si = 0; si < seasonSelection.skills.length; si++) {
                var sid = seasonSelection.skills[si];
                if (si > 0) skillNames += ', ';
                skillNames += (Skills[sid] && Skills[sid].name) ? Skills[sid].name : sid;
            }
            var petName = (Pets[seasonSelection.pet] && Pets[seasonSelection.pet].name) ? Pets[seasonSelection.pet].name : '无';

            ctx.fillStyle = '#888888';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('配置: ' + (charData ? charData.name : '未知') + ' | ' + skillNames + ' | ' + petName, screenWidth / 2, screenHeight * 0.5);

            // 鼓励语
            var message = '继续努力！';
            if (seasonScore >= seasonBestScore && seasonScore > 0) {
                message = '新赛季最高分！';
            } else if (seasonScore >= 1000) {
                message = '传奇唤灵人！';
            } else if (seasonScore >= 500) {
                message = '出色的表现！';
            }
            drawText(message, screenWidth / 2, screenHeight * 0.58, Math.floor(20 * scale), '#ffffff');

            // 按钮
            var seasonBtnWidth = Math.floor(160 * scale);
            var seasonBtnHeight = Math.floor(50 * scale);

            drawButton('再来一局', screenWidth / 2, screenHeight * 0.68, seasonBtnWidth, seasonBtnHeight, '#E74C3C');
            drawButton('查看排行榜', screenWidth / 2, screenHeight * 0.76, seasonBtnWidth, seasonBtnHeight, '#9b59b6');
            drawButton('返回菜单', screenWidth / 2, screenHeight * 0.84, seasonBtnWidth, seasonBtnHeight, '#4a4a6a');
        } else {
            // ===== 普通模式结束界面 =====
            drawText('净化中止', screenWidth / 2, screenHeight / 3, Math.floor(48 * scale), '#ffd700');

            drawText(score.toString(), screenWidth / 2, screenHeight / 2, Math.floor(64 * scale), '#ffd700');

            drawText('最高分: ' + bestScore, screenWidth / 2, screenHeight / 2 + 50 * scale, Math.floor(24 * scale), '#ffffff');

            // 鼓励语
            var normalMsg = '不错！继续加油！';
            if (score >= bestScore && score > 0) {
                normalMsg = '新纪录！太棒了！';
            } else if (score >= 100) {
                normalMsg = '唤灵传说！';
            } else if (score >= 50) {
                normalMsg = '灵光璀璨！';
            }
            drawText(normalMsg, screenWidth / 2, screenHeight * 0.6, Math.floor(24 * scale), '#ffffff');

            // 重新开始按钮
            var normalBtnWidth = Math.floor(200 * scale);
            var normalBtnHeight = Math.floor(60 * scale);
            drawButton('再玩一次', screenWidth / 2, screenHeight * 0.70, normalBtnWidth, normalBtnHeight, '#ffd700');

            // 返回菜单按钮
            drawButton('返回菜单', screenWidth / 2, screenHeight * 0.78, normalBtnWidth, normalBtnHeight, '#87CEEB');

        }
    }

    function renderPausedMenu() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();

        var drawText = uiCore.drawText;
        var drawButton = uiCore.drawButton;

        // 添加半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 标题
        drawText('灵域暂停', screenWidth / 2, screenHeight * 0.35, Math.floor(48 * scale), '#ffd700');

        // 返回菜单按钮
        drawButton('返回菜单', screenWidth / 2, screenHeight * 0.60, Math.floor(200 * scale), Math.floor(60 * scale), '#87CEEB');

        // 重新开始按钮
        drawButton('重新开始', screenWidth / 2, screenHeight * 0.70, Math.floor(200 * scale), Math.floor(60 * scale), '#4CAF50');

        // 继续游戏按钮
        drawButton('继续净化', screenWidth / 2, screenHeight * 0.80, Math.floor(200 * scale), Math.floor(60 * scale), '#FFA500');
    }

    return {
        renderMenu: renderMenu,
        renderLeaderboard: renderLeaderboard,
        renderSettings: renderSettings,
        renderGameOver: renderGameOver,
        renderPausedMenu: renderPausedMenu
    };
}

export { createMenuRenderer };
