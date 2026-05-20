/**
 * StageRenderer — 闯关模式选择 + 结算渲染
 */
function createStageRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var uiCore = deps.uiCore;
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getPlayerData = deps.getPlayerData;
    var getSTAGES = deps.getSTAGES;
    var getCHAPTERS = deps.getCHAPTERS;
    var getUiScrollState = deps.getUiScrollState;
    var getGameState = deps.getGameState;
    var getIsStageUnlocked = deps.getIsStageUnlocked;
    var getDifficultyColor = deps.getDifficultyColor;
    var getSelectedChapter = deps.getSelectedChapter;
    var getStageModeSystem = deps.getStageModeSystem;
    var getMaterials = deps.getMaterials;

    function renderStageSelect() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var STAGES = getSTAGES();
        var CHAPTERS = getCHAPTERS();
        var playerData = getPlayerData();
        var uiScrollState = getUiScrollState();
        var selectedChapter = getSelectedChapter();
        var fillRoundRect = getFillRoundRect();
        var drawButton = uiCore.drawButton;
        var drawBackButton = uiCore.drawBackButton;
        var isStageUnlocked = getIsStageUnlocked;
        var getDifficultyColorFn = getDifficultyColor;

        // 背景
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 标题
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(32 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️ 闯关模式 ⚔️', screenWidth / 2, Math.floor(50 * scale));

        // 章节标题
        var chapter = CHAPTERS[selectedChapter];
        ctx.fillStyle = '#87CEEB';
        ctx.font = 'bold ' + Math.floor(24 * scale) + 'px sans-serif';
        ctx.fillText('第' + selectedChapter + '章: ' + chapter.name, screenWidth / 2, Math.floor(100 * scale));

        // 关卡列表
        var startY = Math.floor(150 * scale);
        var stageHeight = Math.floor(120 * scale);
        var padding = Math.floor(15 * scale);

        for (let i = 0; i < chapter.stages.length; i++) {
            var stageId = chapter.stages[i];
            var stage = STAGES[stageId];
            var stageProgress = playerData.stageProgress && playerData.stageProgress[stageId];
            var stars = stageProgress ? stageProgress.stars : 0;
            var isUnlocked = isStageUnlocked(stageId);

            var itemY = startY + i * (stageHeight + padding) - uiScrollState.stageSelectScrollY; // 添加滚动偏移

            // 背景（圆角）
            ctx.fillStyle = isUnlocked ? 'rgba(255, 255, 255, 0.1)' : 'rgba(100, 100, 100, 0.2)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), stageHeight, Math.floor(8 * scale));

            if (isUnlocked) {
                // 关卡名称
                ctx.fillStyle = getDifficultyColorFn(stage.difficulty);
                ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(stage.name, Math.floor(40 * scale), itemY + Math.floor(30 * scale));

                // 描述
                ctx.fillStyle = '#aaaaaa';
                ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                ctx.fillText(stage.description, Math.floor(40 * scale), itemY + Math.floor(55 * scale));

                // 星级
                var starText = '';
                for (let s = 0; s < 3; s++) {
                    starText += s < stars ? '⭐' : '☆';
                }
                ctx.fillStyle = '#FFD700';
                ctx.font = Math.floor(24 * scale) + 'px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(starText, screenWidth - Math.floor(40 * scale), itemY + Math.floor(30 * scale));

                // 难度标签
                ctx.fillStyle = getDifficultyColorFn(stage.difficulty);
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.fillText('[' + stage.difficulty.toUpperCase() + ']', screenWidth - Math.floor(40 * scale), itemY + Math.floor(55 * scale));
            } else {
                // 未解锁
                ctx.fillStyle = '#666666';
                ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🔒 未解锁', screenWidth / 2, itemY + stageHeight / 2);
            }
        }

        // 返回按钮
        drawBackButton();

        // 章节切换
        if (selectedChapter > 1) {
            drawButton('◀', Math.floor(50 * scale), Math.floor(100 * scale), Math.floor(40 * scale), Math.floor(30 * scale), '#4CAF50');
        }
        if (selectedChapter < Object.keys(CHAPTERS).length) {
            drawButton('▶', screenWidth - Math.floor(50 * scale), Math.floor(100 * scale), Math.floor(40 * scale), Math.floor(30 * scale), '#4CAF50');
        }
    }

    function renderStageResult() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var stageModeSystem = getStageModeSystem();
        var Materials = getMaterials();
        var drawButton = uiCore.drawButton;
        var drawBackButton = uiCore.drawBackButton;

        var result = stageModeSystem.getResult();
        var stageData = stageModeSystem.getCurrentStageData();

        if (!result || !stageData) return;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 标题
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(36 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';

        var titleText = result.stars > 0 ? '🎉 通关成功！' : '💔 挑战失败';
        ctx.fillText(titleText, screenWidth / 2, Math.floor(80 * scale));

        // 关卡名称
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(24 * scale) + 'px sans-serif';
        ctx.fillText(stageData.name, screenWidth / 2, Math.floor(130 * scale));

        // 星级显示
        var starText = '';
        for (let s = 0; s < 3; s++) {
            starText += s < result.stars ? '⭐' : '☆';
        }
        ctx.fillStyle = '#FFD700';
        ctx.font = Math.floor(48 * scale) + 'px sans-serif';
        ctx.fillText(starText, screenWidth / 2, Math.floor(200 * scale));

        // 条件完成情况
        var startY = Math.floor(260 * scale);
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';

        for (let i = 0; i < stageData.starConditions.length; i++) {
            var condition = stageData.starConditions[i];
            var met = stageModeSystem.checkCondition(condition);
            var y = startY + i * Math.floor(30 * scale);

            ctx.fillStyle = met ? '#4CAF50' : '#FF4444';
            ctx.fillText((met ? '✓ ' : '✗ ') + condition.description, Math.floor(50 * scale), y);
        }

        // 统计数据
        ctx.fillStyle = '#aaaaaa';
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillText('灵辉值: ' + result.score + '  连灵: ' + result.maxCombo + '  净化: ' + result.monstersKilled, Math.floor(50 * scale), startY + Math.floor(120 * scale));

        // 奖励显示（只显示实际获得的奖励）
        var rewardsObtained = stageModeSystem.getRewardsObtained() || { gold: 0, exp: 0, materials: {} };
        var hasRewards = rewardsObtained.gold > 0 || rewardsObtained.exp > 0 || Object.keys(rewardsObtained.materials).length > 0;

        if (hasRewards) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('获得奖励:', screenWidth / 2, startY + Math.floor(160 * scale));

            const stageRewardIconSize = Math.floor(16 * scale);
            var rewardLineY = startY + Math.floor(190 * scale);

            // 灵币奖励
            if (rewardsObtained.gold > 0) {
                if (Assets.goldIcon && Assets.goldIcon.complete) {
                    const goldText = '灵币×' + rewardsObtained.gold;
                    const textWidth = ctx.measureText(goldText).width;
                    const totalWidth = stageRewardIconSize + Math.floor(5 * scale) + textWidth;
                    const startX = screenWidth / 2 - totalWidth / 2;
                    ctx.drawImage(Assets.goldIcon, startX, rewardLineY - Math.floor(12 * scale), stageRewardIconSize, stageRewardIconSize);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = Math.floor(16 * scale) + 'px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillText(goldText, startX + stageRewardIconSize + Math.floor(5 * scale), rewardLineY);
                    ctx.textAlign = 'center';
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = Math.floor(16 * scale) + 'px sans-serif';
                    ctx.fillText('💰 灵币×' + rewardsObtained.gold, screenWidth / 2, rewardLineY);
                }
                rewardLineY += Math.floor(25 * scale);
            }

            // 经验奖励
            if (rewardsObtained.exp > 0) {
                ctx.fillStyle = '#ffffff';
                ctx.font = Math.floor(16 * scale) + 'px sans-serif';
                ctx.fillText('&#x2728; 感悟×' + rewardsObtained.exp, screenWidth / 2, rewardLineY);
                rewardLineY += Math.floor(25 * scale);
            }

            // 材料奖励
            for (let matId in rewardsObtained.materials) {
                ctx.fillStyle = '#ffffff';
                ctx.font = Math.floor(16 * scale) + 'px sans-serif';
                var matName = (Materials && Materials[matId]) ? Materials[matId].name : matId;
                var matEmoji = (Materials && Materials[matId]) ? Materials[matId].emoji : '📦';
                ctx.fillText(matEmoji + ' ' + matName + '×' + rewardsObtained.materials[matId], screenWidth / 2, rewardLineY);
                rewardLineY += Math.floor(25 * scale);
            }
        } else if (result.stars > 0) {
            // 已获得过奖励，不再重复发放
            ctx.fillStyle = '#888888';
            ctx.font = Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('已获得过该星级奖励', screenWidth / 2, startY + Math.floor(160 * scale));
        }

        // 按钮
        var btnY = screenHeight - Math.floor(100 * scale);
        drawButton('重试', screenWidth / 2, btnY, Math.floor(120 * scale), Math.floor(45 * scale), '#4CAF50');
        drawBackButton();
    }

    return { renderStageSelect: renderStageSelect, renderStageResult: renderStageResult };
}
export { createStageRenderer };
