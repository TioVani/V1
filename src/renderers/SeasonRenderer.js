/**
 * SeasonRenderer — 赛季竞技场界面渲染
 */
import { RARITY_COLORS } from '../config/GameConfig.js';
function createSeasonRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var uiCore = deps.uiCore;
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getStrokeRoundRect = deps.getStrokeRoundRect;
    var getCharacters = deps.getCharacters;
    var getSkills = deps.getSkills;
    var getPets = deps.getPets;
    var getSeasonContent = deps.getSeasonContent;
    var getSeasonSelection = deps.getSeasonSelection;
    var setSeasonSelection = deps.setSeasonSelection;
    var getUiScrollState = deps.getUiScrollState;
    var getSeasonBestScore = deps.getSeasonBestScore;
    var getSeasonRank = deps.getSeasonRank;
    var getSeasonLeaderboard = deps.getSeasonLeaderboard;
    var getSEASON_STAR_TYPES = deps.getSEASON_STAR_TYPES;
    var getMAX_CHARACTER_LEVEL = deps.getMAX_CHARACTER_LEVEL;
    var getCharacterStatsAtLevel = deps.getCharacterStatsAtLevel;
    var initSeasonContent = deps.initSeasonContent;
    var getSaveData = deps.getSaveData;
    var getLog = deps.getLog || function() {};
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };
    // 交互委托 deps（参考 SquadRenderer 模式）
    var isBackButtonClicked = deps.isBackButtonClicked;
    var transitionTo = deps.transitionTo;
    var getGameConst = deps.getGameConst;
    var showToast = deps.showToast;
    var savePlayerData = deps.savePlayerData;
    var getAudioSystem = deps.getAudioSystem;
    var startSeasonGame = deps.startSeasonGame;
    var initOpenDataContext = deps.initOpenDataContext;
    var sendLeaderboardMessage = deps.sendLeaderboardMessage;
    var getCurrentLeaderboardTab = deps.getCurrentLeaderboardTab;
    var setCurrentLeaderboardTab = deps.setCurrentLeaderboardTab;
    var getOpenDataContext = deps.getOpenDataContext;
    var getDataStore = deps.getDataStore;
    var DESIGN_HEIGHT = 812;

    // shorthand for uiCore methods
    var drawText = uiCore.drawText;
    var drawButton = uiCore.drawButton;
    var drawBackButton = uiCore.drawBackButton;

    /**
     * 赛季竞技场入口界面
     */
    function renderSeasonMenu() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
        var Assets = getAssets();
        var fillRoundRect = getFillRoundRect();

        try {
            // 绘制背景
            if (Assets.backgroundImage && Assets.backgroundImage.complete) {
                var cache = Assets.bgPositionCache;
                if (cache) {
                    ctx.drawImage(Assets.backgroundImage, cache.drawX, cache.drawY, cache.drawWidth, cache.drawHeight);
                }
                ctx.fillStyle = 'rgba(15, 15, 26, 0.9)';
                ctx.fillRect(0, 0, screenWidth, screenHeight);
            } else {
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(0, 0, screenWidth, screenHeight);
            }

            // 初始化赛季内容
            var seasonContent = getSeasonContent();
            if (!seasonContent) {
                initSeasonContent();
                seasonContent = getSeasonContent();
            }

            // 安全检查：确保 seasonContent 有效
            if (!seasonContent || !seasonContent.character) {
                console.error('renderSeasonMenu: seasonContent 无效');
                drawText('赛季数据加载中...', screenWidth / 2, (designOffsetY + designBottom) / 2, Math.floor(20 * scale), '#ffffff');
                drawBackButton();
                return;
            }

            // 标题
            drawText('🏆 赛季竞技场 🏆', screenWidth / 2, designOffsetY + Math.floor(50 * scale), Math.floor(32 * scale), '#E74C3C');

            // 赛季信息
            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('第 ' + (seasonContent.weekId || 'N/A') + ' 赛季', screenWidth / 2, designOffsetY + Math.floor(85 * scale));
            ctx.fillText('刷新时间: ' + (seasonContent.monday || 'N/A'), screenWidth / 2, designOffsetY + Math.floor(105 * scale));

            // 规则说明
            var ruleY = designOffsetY + Math.floor(140 * scale);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.fillText('📋 赛季规则', screenWidth / 2, ruleY);

            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            var rules = [
                '• 每周一刷新角色、技能、宠物池',
                '• 唤灵人只能从赛季池中选择搭配',
                '• 禁止使用自带装备、道具、增益',
                '• 公平竞技，比拼最高灵辉值'
            ];
            for (var ri = 0; ri < rules.length; ri++) {
                ctx.fillText(rules[ri], screenWidth / 2, ruleY + Math.floor(25 * scale) * (ri + 1));
            }

            // 本周可用内容预览
            var previewY = ruleY + Math.floor(130 * scale);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.fillText('📦 本周可用', screenWidth / 2, previewY);

            // 角色预览
            var Characters = getCharacters();
            var charData = Characters[seasonContent.character];
            var charName = charData ? charData.name : seasonContent.character;
            ctx.fillStyle = '#87CEEB';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.fillText('角色: ' + charName, screenWidth / 2, previewY + Math.floor(25 * scale));

            // 技能预览
            ctx.fillStyle = '#90EE90';
            var Skills = getSkills();
            var skills = seasonContent.skills || [];
            var skillNames = [];
            for (var si = 0; si < skills.length; si++) {
                var skill = Skills[skills[si]];
                skillNames.push(skill ? skill.name : skills[si]);
            }
            ctx.fillText('技能: ' + skillNames.join(', '), screenWidth / 2, previewY + Math.floor(45 * scale));

            // 宠物预览
            ctx.fillStyle = '#FFB6C1';
            var Pets = getPets();
            var pets = seasonContent.pets || [];
            var petNames = [];
            for (var pi = 0; pi < pets.length; pi++) {
                var pet = Pets[pets[pi]];
                petNames.push(pet ? pet.name : pets[pi]);
            }
            ctx.fillText('宠物: ' + petNames.join(', '), screenWidth / 2, previewY + Math.floor(65 * scale));

            // 我的最佳成绩
            var seasonBestScore = getSeasonBestScore();
            if (seasonBestScore > 0) {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
                ctx.fillText('🏆 我的最高分: ' + seasonBestScore, screenWidth / 2, previewY + Math.floor(100 * scale));
                ctx.fillStyle = '#aaaaaa';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.fillText('排名: 第 ' + getSeasonRank() + ' 名', screenWidth / 2, previewY + Math.floor(120 * scale));
            }

            // 按钮
            var btnWidth = Math.floor(140 * scale);
            var btnHeight = Math.floor(45 * scale);

            // 开始赛季按钮
            drawButton('⚔️ 开始赛季', screenWidth / 2, designBottom - Math.floor(203 * scale), btnWidth, btnHeight, '#E74C3C');

            // 赛季排行榜按钮
            drawButton('📊 赛季排行', screenWidth / 2, designBottom - Math.floor(134 * scale), btnWidth, btnHeight, '#9b59b6');

            // 返回按钮
            drawBackButton();
        } catch (e) {
            console.error('renderSeasonMenu 异常:', e);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
            drawText('赛季加载失败', screenWidth / 2, (designOffsetY + designBottom) / 2, Math.floor(24 * scale), '#ff6b6b');
            drawBackButton();
        }
    }

    /**
     * 赛季选择界面 — 选择角色/技能/宠物/星星类型
     */
    function renderSeasonSelect() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
        var fillRoundRect = getFillRoundRect();
        var strokeRoundRect = getStrokeRoundRect();
        var Characters = getCharacters();
        var Skills = getSkills();
        var Pets = getPets();
        var seasonContent = getSeasonContent();
        var seasonSelection = getSeasonSelection();
        var uiScrollState = getUiScrollState();
        var MAX_CHARACTER_LEVEL = getMAX_CHARACTER_LEVEL();

        try {
            // 绘制背景
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, screenWidth, screenHeight);

            // 安全检查
            if (!seasonContent || !seasonContent.character) {
                console.error('renderSeasonSelect: seasonContent 无效');
                initSeasonContent();
                seasonContent = getSeasonContent();
            }

            if (!seasonContent || !seasonContent.character) {
                drawText('赛季数据加载失败', screenWidth / 2, (designOffsetY + designBottom) / 2, Math.floor(20 * scale), '#ff6b6b');
                drawBackButton();
                return;
            }

            // 标题
            drawText('🔮 选择你的配置', screenWidth / 2, designOffsetY + Math.floor(40 * scale), Math.floor(24 * scale), '#ffd700');

            var currentY = designOffsetY + Math.floor(80 * scale) - uiScrollState.seasonSelectScrollY;

            // ===== 角色选择 =====
            ctx.fillStyle = '#87CEEB';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('👤 角色 (必选1个)', Math.floor(20 * scale), currentY);
            currentY += Math.floor(25 * scale);

            var charData = Characters[seasonContent.character];

            if (charData) {
                var isSelected = seasonSelection.character === seasonContent.character;
                var charItemX = Math.floor(30 * scale);
                var charItemWidth = screenWidth - Math.floor(60 * scale);
                var charItemHeight = Math.floor(60 * scale);

                // 背景
                ctx.fillStyle = isSelected ? 'rgba(135, 206, 235, 0.3)' : 'rgba(255, 255, 255, 0.1)';
                fillRoundRect(ctx, charItemX, currentY, charItemWidth, charItemHeight, 8);

                // 边框
                if (isSelected) {
                    ctx.strokeStyle = '#87CEEB';
                    ctx.lineWidth = 2;
                    strokeRoundRect(ctx, charItemX, currentY, charItemWidth, charItemHeight, 8);
                }

                // 角色信息
                var charMaxStats = getCharacterStatsAtLevel(seasonSelection.character || seasonContent.character, MAX_CHARACTER_LEVEL);
                ctx.fillStyle = '#ffffff';
                ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(charData.name + ' (满级)', charItemX + Math.floor(10 * scale), currentY + Math.floor(20 * scale));
                ctx.fillStyle = '#aaaaaa';
                ctx.font = Math.floor(10 * scale) + 'px sans-serif';
                ctx.fillText('攻击:' + charMaxStats.attack + ' 暴击:' + charMaxStats.critRate.toFixed(1) + '%', charItemX + Math.floor(10 * scale), currentY + Math.floor(40 * scale));
                ctx.fillText('灵能:' + charMaxStats.hp + ' 爆伤:' + charMaxStats.critDamage.toFixed(1) + 'x', charItemX + Math.floor(10 * scale), currentY + Math.floor(55 * scale));

                // 选中标记
                if (isSelected) {
                    ctx.fillStyle = '#4CAF50';
                    ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText('✓ 已选择', charItemX + charItemWidth - Math.floor(10 * scale), currentY + Math.floor(35 * scale));
                }
            } else {
                // 角色数据不存在，显示后备信息
                var charItemX = Math.floor(30 * scale);
                var charItemWidth = screenWidth - Math.floor(60 * scale);
                var charItemHeight = Math.floor(60 * scale);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                fillRoundRect(ctx, charItemX, currentY, charItemWidth, charItemHeight, 8);

                ctx.fillStyle = '#ff6b6b';
                ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('角色数据加载失败', screenWidth / 2, currentY + Math.floor(35 * scale));

                console.error('角色数据不存在:', seasonContent.character, '可用角色:', Object.keys(Characters));
            }
            currentY += Math.floor(75 * scale);

            // ===== 技能选择 =====
            ctx.fillStyle = '#90EE90';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('✨ 技能 (最多选2个)', Math.floor(20 * scale), currentY);
            currentY += Math.floor(25 * scale);

            var seasonSkills = seasonContent.skills || [];
            for (var ski = 0; ski < seasonSkills.length; ski++) {
                var skillId = seasonSkills[ski];
                var skill = Skills[skillId];
                if (!skill) continue;

                var isSkillSelected = seasonSelection.skills.indexOf(skillId) !== -1;
                var itemX = Math.floor(30 * scale);
                var itemWidth = screenWidth - Math.floor(60 * scale);
                var itemHeight = Math.floor(50 * scale);
                var itemY = currentY + ski * (itemHeight + Math.floor(5 * scale));

                // 背景
                ctx.fillStyle = isSkillSelected ? 'rgba(144, 238, 144, 0.3)' : 'rgba(255, 255, 255, 0.1)';
                fillRoundRect(ctx, itemX, itemY, itemWidth, itemHeight, 8);

                // 边框
                if (isSkillSelected) {
                    ctx.strokeStyle = '#90EE90';
                    ctx.lineWidth = 2;
                    strokeRoundRect(ctx, itemX, itemY, itemWidth, itemHeight, 8);
                }

                // 技能信息
                ctx.fillStyle = '#ffffff';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(skill.emoji + ' ' + skill.name, itemX + Math.floor(10 * scale), itemY + Math.floor(18 * scale));
                ctx.fillStyle = '#aaaaaa';
                ctx.font = Math.floor(10 * scale) + 'px sans-serif';
                ctx.fillText(skill.description, itemX + Math.floor(10 * scale), itemY + Math.floor(35 * scale));

                // 稀有度标签
                var rarityColors = RARITY_COLORS;
                ctx.fillStyle = rarityColors[skill.rarity] || '#ffffff';
                ctx.font = 'bold ' + Math.floor(10 * scale) + 'px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText('[' + skill.rarity + ']', itemX + itemWidth - Math.floor(10 * scale), itemY + Math.floor(15 * scale));
            }
            currentY += Math.floor(180 * scale);

            // ===== 宠物选择 =====
            ctx.fillStyle = '#FFB6C1';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('🐾 宠物 (最多选1个)', Math.floor(20 * scale), currentY);
            currentY += Math.floor(25 * scale);

            var seasonPets = seasonContent.pets || [];
            for (var peti = 0; peti < seasonPets.length; peti++) {
                var petId = seasonPets[peti];
                var pet = Pets[petId];
                if (!pet) continue;

                var isPetSelected = seasonSelection.pet === petId;
                var petItemX = Math.floor(30 * scale);
                var petItemWidth = screenWidth - Math.floor(60 * scale);
                var petItemHeight = Math.floor(50 * scale);
                var petItemY = currentY + peti * (petItemHeight + Math.floor(5 * scale));

                // 背景
                ctx.fillStyle = isPetSelected ? 'rgba(255, 182, 193, 0.3)' : 'rgba(255, 255, 255, 0.1)';
                fillRoundRect(ctx, petItemX, petItemY, petItemWidth, petItemHeight, 8);

                // 边框
                if (isPetSelected) {
                    ctx.strokeStyle = '#FFB6C1';
                    ctx.lineWidth = 2;
                    strokeRoundRect(ctx, petItemX, petItemY, petItemWidth, petItemHeight, 8);
                }

                // 宠物信息
                ctx.fillStyle = '#ffffff';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(pet.emoji + ' ' + pet.name, petItemX + Math.floor(10 * scale), petItemY + Math.floor(18 * scale));
                ctx.fillStyle = '#aaaaaa';
                ctx.font = Math.floor(10 * scale) + 'px sans-serif';
                ctx.fillText('攻击:' + pet.attack + ' 攻速:' + pet.attackSpeed + 's', petItemX + Math.floor(10 * scale), petItemY + Math.floor(35 * scale));

                // 稀有度标签
                var petRarityColors = { 'N': '#ffffff', 'R': '#4A90D9', 'SR': '#E6B800', 'SSR': '#FFD700', 'UR': '#FF00FF' };
                ctx.fillStyle = petRarityColors[pet.rarity] || '#ffffff';
                ctx.font = 'bold ' + Math.floor(10 * scale) + 'px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText('[' + pet.rarity + ']', petItemX + petItemWidth - Math.floor(10 * scale), petItemY + Math.floor(15 * scale));
            }
            currentY += Math.floor(180 * scale);

            // ===== 星星类型选择 =====
            var SEASON_STAR_TYPES = getSEASON_STAR_TYPES();
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            var selectedStarCount = seasonSelection.starTypes ? seasonSelection.starTypes.length : 0;
            ctx.fillText('⭐ 灵光类型 (已选' + selectedStarCount + '/3，至少选1个)', Math.floor(20 * scale), currentY);
            currentY += Math.floor(25 * scale);

            var seasonStarTypes = seasonContent.starTypes || [];
            for (var sti = 0; sti < seasonStarTypes.length; sti++) {
                var starTypeId = seasonStarTypes[sti];
                var starType = null;
                for (var ss = 0; ss < SEASON_STAR_TYPES.length; ss++) {
                    if (SEASON_STAR_TYPES[ss].id === starTypeId) {
                        starType = SEASON_STAR_TYPES[ss];
                        break;
                    }
                }
                if (!starType) continue;

                var isStarSelected = seasonSelection.starTypes && seasonSelection.starTypes.indexOf(starTypeId) !== -1;
                var starItemX = Math.floor(30 * scale);
                var starItemWidth = screenWidth - Math.floor(60 * scale);
                var starItemHeight = Math.floor(45 * scale);
                var starItemY = currentY + sti * (starItemHeight + Math.floor(5 * scale));

                // 背景
                ctx.fillStyle = isStarSelected ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)';
                fillRoundRect(ctx, starItemX, starItemY, starItemWidth, starItemHeight, 8);

                // 边框
                if (isStarSelected) {
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 2;
                    strokeRoundRect(ctx, starItemX, starItemY, starItemWidth, starItemHeight, 8);
                }

                // 星星信息
                ctx.fillStyle = '#ffffff';
                ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(starType.emoji + ' ' + starType.name, starItemX + Math.floor(10 * scale), starItemY + Math.floor(18 * scale));
                ctx.fillStyle = '#aaaaaa';
                ctx.font = Math.floor(10 * scale) + 'px sans-serif';
                ctx.fillText(starType.description, starItemX + Math.floor(10 * scale), starItemY + Math.floor(35 * scale));

                // 选中标记
                if (isStarSelected) {
                    ctx.fillStyle = '#4CAF50';
                    ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText('✓', starItemX + starItemWidth - Math.floor(10 * scale), starItemY + Math.floor(25 * scale));
                }
            }

            // 底部按钮
            var btnY = designBottom - Math.floor(70 * scale);
            var btnWidth = Math.floor(100 * scale);
            var btnHeight = Math.floor(40 * scale);

            // 开始游戏按钮（需要选择至少1个星星类型）
            var canStart = seasonSelection.character && seasonSelection.skills.length > 0 && seasonSelection.starTypes && seasonSelection.starTypes.length > 0;
            var startBtnColor = canStart ? '#4CAF50' : '#666666';
            drawButton('踏入灵域', screenWidth / 2, btnY, Math.floor(120 * scale), btnHeight, startBtnColor);

            // 返回按钮（左下角）
            drawBackButton();

            // 重置按钮
            drawButton('重置', screenWidth / 2 + Math.floor(130 * scale), btnY, btnWidth, btnHeight, '#E74C3C');
        } catch (e) {
            console.error('renderSeasonSelect 异常:', e);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
            drawText('赛季选择加载失败', screenWidth / 2, (designOffsetY + designBottom) / 2, Math.floor(24 * scale), '#ff6b6b');
            drawBackButton();
        }
    }

    /**
     * 赛季排行榜界面
     */
    function renderSeasonLeaderboard() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var fillRoundRect = getFillRoundRect();
        var seasonContent = getSeasonContent();
        var seasonBestScore = getSeasonBestScore();
        var seasonLeaderboard = getSeasonLeaderboard();

        // 绘制背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 标题
        drawText('🏆 赛季排行榜 🏆', screenWidth / 2, designOffsetY + Math.floor(40 * scale), Math.floor(28 * scale), '#E74C3C');
        ctx.fillStyle = '#aaaaaa';
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        if (seasonContent && seasonContent.weekId) {
            ctx.fillText('第 ' + seasonContent.weekId + ' 赛季', screenWidth / 2, designOffsetY + Math.floor(70 * scale));
        }

        // 排行榜列表
        var listStartY = designOffsetY + Math.floor(100 * scale);
        var itemHeight = Math.floor(50 * scale);

        // 列表背景
        ctx.fillStyle = 'rgba(30, 30, 50, 0.8)';
        fillRoundRect(ctx, Math.floor(20 * scale), listStartY - Math.floor(10 * scale), screenWidth - Math.floor(40 * scale), itemHeight * displayCount + Math.floor(20 * scale), 8);

        // 表头
        ctx.fillStyle = '#aaaaaa';
        ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('排名', Math.floor(40 * scale), listStartY);
        ctx.fillText('唤灵人', Math.floor(90 * scale), listStartY);
        ctx.textAlign = 'right';
        ctx.fillText('灵辉值', screenWidth - Math.floor(40 * scale), listStartY);
        ctx.textAlign = 'left';

        // 排行榜项目
        var leaderboardLen = seasonLeaderboard ? seasonLeaderboard.length : 0;
        var displayCount = Math.min(leaderboardLen, 25);   // 最多显示25位，实际占位15位
        for (var li = 0; li < displayCount; li++) {
            var item = seasonLeaderboard[li];
            var lItemY = listStartY + Math.floor(25 * scale) + li * itemHeight;

            // 前三名特殊背景
            var bgColor = 'transparent';
            if (item.rank === 1) {
                bgColor = 'rgba(255, 215, 0, 0.1)';
            } else if (item.rank === 2) {
                bgColor = 'rgba(192, 192, 192, 0.1)';
            } else if (item.rank === 3) {
                bgColor = 'rgba(205, 127, 50, 0.1)';
            }

            // 玩家自己
            if (item.name === '我' || (seasonBestScore > 0 && item.score === seasonBestScore)) {
                bgColor = 'rgba(231, 76, 60, 0.2)';
            }

            // 背景色
            if (bgColor !== 'transparent') {
                ctx.fillStyle = bgColor;
                fillRoundRect(ctx, Math.floor(25 * scale), lItemY - Math.floor(18 * scale), screenWidth - Math.floor(50 * scale), itemHeight - Math.floor(5 * scale), 8);
            }

            // 排名（前三名用特效文字）
            var rankCenterX = Math.floor(50 * scale);
            var rankLabels = ['冠军', '亚军', '季军'];
            if (item.rank === 1) {
                uiCore.drawSPText(rankLabels[0], rankCenterX, lItemY, 13, scale);
            } else if (item.rank === 2) {
                uiCore.drawLRText(rankLabels[1], rankCenterX, lItemY, 13, scale);
            } else if (item.rank === 3) {
                uiCore.drawURText(rankLabels[2], rankCenterX, lItemY, 13, scale);
            } else {
                ctx.fillStyle = '#aaaaaa';
                ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('' + item.rank, rankCenterX, lItemY);
            }

            // 头像
            ctx.font = Math.floor(20 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.avatar, Math.floor(100 * scale), lItemY);

            // 玩家名
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.name, Math.floor(130 * scale), lItemY);

            // 分数（前三名用特效）
            var scoreStr = item.score.toLocaleString();
            ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
            var scoreX = screenWidth - Math.floor(40 * scale);
            if (item.rank === 1) {
                uiCore.drawSPText(scoreStr, scoreX, lItemY, 14, scale);
            } else if (item.rank === 2) {
                uiCore.drawLRText(scoreStr, scoreX, lItemY, 14, scale);
            } else if (item.rank === 3) {
                uiCore.drawURText(scoreStr, scoreX, lItemY, 14, scale);
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(scoreStr, scoreX, lItemY);
            }
        }

        // 我的排名
        if (seasonBestScore > 0) {
            var myRankY = listStartY + itemHeight * 10 + Math.floor(40 * scale);

            ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
            fillRoundRect(ctx, Math.floor(25 * scale), myRankY - Math.floor(15 * scale), screenWidth - Math.floor(50 * scale), Math.floor(40 * scale), 8);

            ctx.fillStyle = '#E74C3C';
            ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('我的排名', Math.floor(40 * scale), myRankY);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.fillText('#' + getSeasonRank(), Math.floor(130 * scale), myRankY);

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(seasonBestScore.toLocaleString(), screenWidth - Math.floor(40 * scale), myRankY);
        }

        // 返回按钮
        drawBackButton();
    }

    // ==================== 赛季记忆恢复 & 滚动限制 ====================

    function restoreSeasonSelection() {
        var _log = getLog();
        _log('[赛季记忆] restoreSeasonSelection called');
        var seasonContent = getSeasonContent();
        var pd = getSaveData();
        if (!seasonContent || !pd || !pd.seasonData || !pd.seasonData.selection) {
            _log('[赛季记忆] 条件不满足，跳过恢复');
            return;
        }
        var saved = pd.seasonData.selection;
        if (!saved || (!saved.character && (!saved.skills || saved.skills.length === 0) && !saved.pet && (!saved.starTypes || saved.starTypes.length === 0))) {
            _log('[赛季记忆] saved为空，跳过恢复');
            return;
        }
        var restored = { character: null, skills: [], pet: null, starTypes: [] };
        if (saved.character && seasonContent.character === saved.character) {
            restored.character = saved.character;
        }
        if (saved.skills && Array.isArray(saved.skills)) {
            for (var i = 0; i < saved.skills.length; i++) {
                if (seasonContent.skills && seasonContent.skills.indexOf(saved.skills[i]) !== -1 && restored.skills.length < 2) {
                    restored.skills.push(saved.skills[i]);
                }
            }
        }
        if (saved.pet && seasonContent.pets && seasonContent.pets.indexOf(saved.pet) !== -1) {
            restored.pet = saved.pet;
        }
        if (saved.starTypes && Array.isArray(saved.starTypes)) {
            for (var j = 0; j < saved.starTypes.length; j++) {
                if (seasonContent.starTypes && seasonContent.starTypes.indexOf(saved.starTypes[j]) !== -1 && restored.starTypes.length < 3) {
                    restored.starTypes.push(saved.starTypes[j]);
                }
            }
        }
        if (setSeasonSelection) {
            setSeasonSelection(restored);
        }
        _log('恢复上次赛季选择:', JSON.stringify(restored));
    }

    function clampSeasonSelectScroll() {
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var screenHeight = getScreenHeight();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
        var uiScrollState = getUiScrollState();
        var roleHeight = Math.floor(100 * scale);
        var skillsHeight = Math.floor(190 * scale);
        var petsHeight = Math.floor(190 * scale);
        var starsHeight = Math.floor(275 * scale);
        var totalHeight = roleHeight + skillsHeight + petsHeight + starsHeight;
        var startY = designOffsetY + Math.floor(80 * scale);
        var bottomBtnHeight = Math.floor(80 * scale);
        var visibleHeight = screenHeight - startY - bottomBtnHeight;
        var maxScroll = Math.max(0, totalHeight - visibleHeight + Math.floor(50 * scale));
        if (uiScrollState.seasonSelectScrollY < 0) uiScrollState.seasonSelectScrollY = 0;
        if (uiScrollState.seasonSelectScrollY > maxScroll) uiScrollState.seasonSelectScrollY = maxScroll;
    }

    function handleClick(x, y, currentState) {
        var GAME_STATE = getGameConst();
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
        var log = getLog();

        // --- SEASON_MENU ---
        if (currentState === GAME_STATE.SEASON_MENU) {
            var btnWidth = Math.floor(140 * scale);
            var btnHeight = Math.floor(45 * scale);

            // 返回按钮（总是最先检测）
            if (isBackButtonClicked && isBackButtonClicked(x, y)) {
                log('点击返回按钮');
                transitionTo(GAME_STATE.WORLDMAP);
                return true;
            }

            // 开始赛季按钮（与 renderSeasonMenu 中 drawButton 的 Y 坐标完全一致）
            var startBtnY = designBottom - Math.floor(203 * scale);
            if (x >= screenWidth / 2 - btnWidth / 2 && x <= screenWidth / 2 + btnWidth / 2 &&
                y >= startBtnY - btnHeight / 2 && y <= startBtnY + btnHeight / 2) {
                log('点击开始赛季按钮');
                transitionTo(GAME_STATE.SEASON_SELECT);
                restoreSeasonSelection();
                return true;
            }

            // 赛季排行榜按钮（与 renderSeasonMenu 中 drawButton 的 Y 坐标完全一致）
            var leaderboardBtnY = designBottom - Math.floor(134 * scale);
            if (x >= screenWidth / 2 - btnWidth / 2 && x <= screenWidth / 2 + btnWidth / 2 &&
                y >= leaderboardBtnY - btnHeight / 2 && y <= leaderboardBtnY + btnHeight / 2) {
                log('点击赛季排行榜按钮');
                var clt = getCurrentLeaderboardTab ? getCurrentLeaderboardTab() : null;
                if (setCurrentLeaderboardTab) setCurrentLeaderboardTab('season_score');
                if (initOpenDataContext) initOpenDataContext();
                if (setCurrentLeaderboardTab) setCurrentLeaderboardTab('season_score');
                if (sendLeaderboardMessage) sendLeaderboardMessage('show', 'season_score');
                transitionTo(GAME_STATE.LEADERBOARD);
                return true;
            }

            return false;
        }

        // --- SEASON_SELECT ---
        if (currentState === GAME_STATE.SEASON_SELECT) {
            var uiScrollState = getUiScrollState();

            // 拖拽中忽略点击
            if (uiScrollState.seasonSelectIsDragging) {
                log('赛季选择拖拽中，忽略点击');
                uiScrollState.seasonSelectIsDragging = false;
                return true;
            }

            // 返回按钮（最先检测）
            if (isBackButtonClicked && isBackButtonClicked(x, y)) {
                log('点击返回按钮');
                transitionTo(GAME_STATE.SEASON_MENU);
                return true;
            }

            // 底部按钮区域
            var btnY = designBottom - Math.floor(70 * scale);
            var selBtnWidth = Math.floor(100 * scale);
            var selBtnHeight = Math.floor(40 * scale);

            // 重置按钮
            if (x >= screenWidth / 2 + Math.floor(130 * scale) - selBtnWidth / 2 &&
                x <= screenWidth / 2 + Math.floor(130 * scale) + selBtnWidth / 2 &&
                y >= btnY - selBtnHeight / 2 && y <= btnY + selBtnHeight / 2) {
                log('点击重置按钮');
                var seasonSelection = getSeasonSelection();
                setSeasonSelection({ character: null, skills: [], pet: null, starTypes: [] });
                var dataStore = getDataStore ? getDataStore() : null;
                var saveData = getSaveData();
                if (saveData && saveData.seasonData) {
                    saveData.seasonData.selection = { character: null, skills: [], pet: null, starTypes: [] };
                    if (dataStore && dataStore.flush) dataStore.flush();
                }
                return true;
            }

            // 开始游戏按钮
            var seasonSelection2 = getSeasonSelection();
            var canStart = seasonSelection2.character && seasonSelection2.skills && seasonSelection2.skills.length > 0 &&
                seasonSelection2.starTypes && seasonSelection2.starTypes.length > 0;
            if (canStart && x >= screenWidth / 2 - Math.floor(60 * scale) &&
                x <= screenWidth / 2 + Math.floor(60 * scale) &&
                y >= btnY - selBtnHeight / 2 && y <= btnY + selBtnHeight / 2) {
                log('开始赛季游戏');
                if (startSeasonGame) startSeasonGame();
                return true;
            }

            // 内容区域点击（与 renderSeasonSelect 中的 currentY 累加逻辑完全一致）
            var seasonContent = getSeasonContent();
            var seasonSelection3 = getSeasonSelection();
            var currentY = designOffsetY + Math.floor(80 * scale) - uiScrollState.seasonSelectScrollY;
            var charItemX = Math.floor(30 * scale);
            var charItemWidth = screenWidth - Math.floor(60 * scale);

            // 角色选择
            currentY += Math.floor(25 * scale);
            var charItemHeight = Math.floor(60 * scale);
            if (x >= charItemX && x <= charItemX + charItemWidth &&
                y >= currentY && y <= currentY + charItemHeight) {
                seasonSelection3.character = seasonContent.character;
                setSeasonSelection(seasonSelection3);
                log('选择角色:', seasonContent.character);
                return true;
            }
            currentY += Math.floor(75 * scale);

            // 技能选择
            currentY += Math.floor(25 * scale);
            for (var i = 0; i < seasonContent.skills.length; i++) {
                var skillId = seasonContent.skills[i];
                var itemHeight = Math.floor(50 * scale);
                var itemY = currentY + i * (itemHeight + Math.floor(5 * scale));
                if (x >= charItemX && x <= charItemX + charItemWidth &&
                    y >= itemY && y <= itemY + itemHeight) {
                    var idx = seasonSelection3.skills.indexOf(skillId);
                    if (idx !== -1) {
                        seasonSelection3.skills.splice(idx, 1);
                        log('取消选择技能:', skillId);
                    } else if (seasonSelection3.skills.length < 2) {
                        seasonSelection3.skills.push(skillId);
                        log('选择技能:', skillId);
                    }
                    setSeasonSelection(seasonSelection3);
                    return true;
                }
            }
            currentY += Math.floor(180 * scale);

            // 宠物选择
            currentY += Math.floor(25 * scale);
            for (var j = 0; j < seasonContent.pets.length; j++) {
                var petId = seasonContent.pets[j];
                var petItemHeight = Math.floor(50 * scale);
                var petItemY = currentY + j * (petItemHeight + Math.floor(5 * scale));
                if (x >= charItemX && x <= charItemX + charItemWidth &&
                    y >= petItemY && y <= petItemY + petItemHeight) {
                    seasonSelection3.pet = seasonSelection3.pet === petId ? null : petId;
                    setSeasonSelection(seasonSelection3);
                    log(seasonSelection3.pet ? '选择宠物:' : '取消选择宠物:', petId);
                    return true;
                }
            }
            currentY += Math.floor(180 * scale);

            // 灵韵类型选择
            currentY += Math.floor(25 * scale);
            for (var k = 0; k < seasonContent.starTypes.length; k++) {
                var starTypeId = seasonContent.starTypes[k];
                var starItemHeight = Math.floor(45 * scale);
                var starItemY = currentY + k * (starItemHeight + Math.floor(5 * scale));
                if (x >= charItemX && x <= charItemX + charItemWidth &&
                    y >= starItemY && y <= starItemY + starItemHeight) {
                    var sidx = seasonSelection3.starTypes.indexOf(starTypeId);
                    if (sidx !== -1) {
                        seasonSelection3.starTypes.splice(sidx, 1);
                        log('取消选择灵韵类型:', starTypeId);
                    } else if (seasonSelection3.starTypes.length < 3) {
                        seasonSelection3.starTypes.push(starTypeId);
                        log('选择灵韵类型:', starTypeId);
                    } else {
                        if (showToast) showToast({ title: '最多选择3个灵韵', icon: 'none', duration: 1000 });
                    }
                    setSeasonSelection(seasonSelection3);
                    return true;
                }
            }

            return false;
        }

        return false;
    }

    return {
        renderSeasonMenu: renderSeasonMenu,
        renderSeasonSelect: renderSeasonSelect,
        renderSeasonLeaderboard: renderSeasonLeaderboard,
        restoreSeasonSelection: restoreSeasonSelection,
        clampSeasonSelectScroll: clampSeasonSelectScroll,
        handleClick: handleClick
    };
}

export { createSeasonRenderer };
