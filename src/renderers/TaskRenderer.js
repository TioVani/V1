/**
 * TaskRenderer — 任务界面渲染
 */
function createTaskRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var uiCore = deps.uiCore;
    var getAssets = deps.getAssets;
    var getTasksWithProgress = deps.getTasksWithProgress;
    var getTasksTab = deps.getTasksTab;
    var getTasksScrollY = deps.getTasksScrollY;
    var setTasksScrollY = deps.setTasksScrollY;
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };
    var DESIGN_HEIGHT = 812;

    function drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    function renderTasks() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
        var Assets = getAssets();
        var tasksTab = getTasksTab();
        var tasksScrollY = getTasksScrollY();
        var tasks = getTasksWithProgress(tasksTab);

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold ' + Math.floor(32 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📋 任务', screenWidth / 2, designOffsetY + Math.floor(50 * scale));

        var tabY = designOffsetY + Math.floor(100 * scale);
        var tabWidth = Math.floor(100 * scale);
        var tabHeight = Math.floor(36 * scale);
        var tabGap = Math.floor(10 * scale);
        var totalTabWidth = tabWidth * 3 + tabGap * 2;
        var tabStartX = (screenWidth - totalTabWidth) / 2;

        var guideTabColor = tasksTab === 'guide' ? '#2196F3' : '#4a4a6a';
        uiCore.drawButton('📖 引导', tabStartX + tabWidth / 2, tabY, tabWidth, tabHeight, guideTabColor);

        var dailyTabColor = tasksTab === 'daily' ? '#4CAF50' : '#4a4a6a';
        uiCore.drawButton('📅 每日', tabStartX + tabWidth + tabGap + tabWidth / 2, tabY, tabWidth, tabHeight, dailyTabColor);

        var achievementTabColor = tasksTab === 'achievements' ? '#FF9800' : '#4a4a6a';
        uiCore.drawButton('🏆 成就', tabStartX + (tabWidth + tabGap) * 2 + tabWidth / 2, tabY, tabWidth, tabHeight, achievementTabColor);

        var listStartY = designOffsetY + Math.floor(150 * scale);
        var itemHeight = tasksTab === 'guide' ? Math.floor(95 * scale) : Math.floor(85 * scale);
        var listHeight = screenHeight - listStartY - Math.floor(80 * scale);
        var totalHeight = tasks.length * itemHeight;
        var maxScroll = Math.max(0, totalHeight - listHeight);

        if (tasksScrollY < 0) tasksScrollY = 0;
        if (tasksScrollY > maxScroll) tasksScrollY = maxScroll;
        setTasksScrollY(tasksScrollY);

        for (var index = 0; index < tasks.length; index++) {
            var task = tasks[index];
            var y = listStartY + index * itemHeight - tasksScrollY;
            if (y + itemHeight > designBottom - Math.floor(80 * scale) || y < listStartY) continue;

            var isLocked = tasksTab === 'guide' && !task.unlocked;

            var bgAlpha = isLocked ? 0.15 : (task.claimed ? 0.3 : (task.completed ? 0.6 : 0.4));
            ctx.fillStyle = 'rgba(60, 60, 80, ' + bgAlpha + ')';
            drawRoundedRect(ctx, Math.floor(20 * scale), y, screenWidth - Math.floor(40 * scale), itemHeight - Math.floor(8 * scale), Math.floor(8 * scale));
            ctx.fill();

            if (tasksTab === 'guide' && task.order) {
                ctx.fillStyle = isLocked ? '#444444' : '#ffd700';
                ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(task.order + '.', Math.floor(28 * scale), y + Math.floor(22 * scale));
            }

            ctx.fillStyle = isLocked ? '#555555' : (task.claimed ? '#888888' : '#ffffff');
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(task.name, Math.floor(50 * scale), y + Math.floor(22 * scale));

            ctx.fillStyle = isLocked ? '#444444' : (task.claimed ? '#666666' : '#aaaaaa');
            ctx.font = Math.floor(13 * scale) + 'px sans-serif';
            ctx.fillText(task.description, Math.floor(50 * scale), y + Math.floor(42 * scale));

            var progressBgX = Math.floor(35 * scale);
            var progressBgY = y + Math.floor(55 * scale);
            var progressBgWidth = Math.floor(200 * scale);
            var progressBgHeight = Math.floor(12 * scale);

            ctx.fillStyle = '#2a2a3a';
            drawRoundedRect(ctx, progressBgX, progressBgY, progressBgWidth, progressBgHeight, Math.floor(6 * scale));
            ctx.fill();

            var progress = Math.min(task.currentProgress / task.target, 1);
            var progressWidth = progressBgWidth * progress;
            var progressColor = task.completed ? '#4CAF50' : '#ffd700';

            if (progressWidth > 0) {
                ctx.fillStyle = progressColor;
                drawRoundedRect(ctx, progressBgX, progressBgY, progressWidth, progressBgHeight, Math.floor(6 * scale));
                ctx.fill();
            }

            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(11 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(task.currentProgress + '/' + task.target, progressBgX + progressBgWidth / 2, progressBgY + Math.floor(7 * scale));

            if (tasksTab === 'guide' && task.tip && !isLocked && !task.claimed) {
                ctx.fillStyle = '#6ab04c';
                ctx.font = Math.floor(11 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('💡 ' + task.tip, Math.floor(50 * scale), y + Math.floor(80 * scale));
            }

            ctx.textAlign = 'right';
            var rewardX = screenWidth - Math.floor(35 * scale);
            var rewardOffsetX = rewardX;
            var rewardIconSize = Math.floor(14 * scale);

            if (task.rewards.gold) {
                if (Assets.goldIcon && Assets.goldIcon.complete) {
                    ctx.drawImage(Assets.goldIcon, rewardOffsetX - rewardIconSize, y + Math.floor(8 * scale), rewardIconSize, rewardIconSize);
                    ctx.fillStyle = isLocked ? '#555555' : (task.claimed ? '#888888' : '#FFD700');
                    ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                    ctx.fillText(task.rewards.gold, rewardOffsetX - rewardIconSize - Math.floor(5 * scale), y + Math.floor(22 * scale));
                } else {
                    ctx.fillStyle = isLocked ? '#555555' : (task.claimed ? '#888888' : '#FFD700');
                    ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                    ctx.fillText('💰' + task.rewards.gold, rewardOffsetX, y + Math.floor(22 * scale));
                }
                rewardOffsetX -= Math.floor(60 * scale);
            }

            if (task.rewards.exp) {
                ctx.fillStyle = isLocked ? '#555555' : (task.claimed ? '#888888' : '#87CEEB');
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.fillText('⭐' + task.rewards.exp, rewardOffsetX, y + Math.floor(22 * scale));
                rewardOffsetX -= Math.floor(50 * scale);
            }

            if (task.rewards.healPotion) {
                ctx.fillStyle = isLocked ? '#555555' : (task.claimed ? '#888888' : '#ff6b6b');
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.fillText('❤️' + task.rewards.healPotion, rewardOffsetX, y + Math.floor(22 * scale));
                rewardOffsetX -= Math.floor(50 * scale);
            }

            if (task.rewards.timePotion) {
                ctx.fillStyle = isLocked ? '#555555' : (task.claimed ? '#888888' : '#87CEEB');
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.fillText('⏱️' + task.rewards.timePotion, rewardOffsetX, y + Math.floor(22 * scale));
            }

            var btnX = screenWidth - Math.floor(60 * scale);
            var btnY = y + Math.floor(52 * scale);
            var btnW = Math.floor(65 * scale);
            var btnH = Math.floor(28 * scale);

            if (task.claimed) {
                uiCore.drawButton('已领取', btnX, btnY, btnW, btnH, '#666666');
            } else if (task.completed) {
                uiCore.drawButton('领取', btnX, btnY, btnW, btnH, '#4CAF50');
            } else {
                uiCore.drawButton('进行中', btnX, btnY, btnW, btnH, '#3a3a5a');
            }
        }

        uiCore.drawBackButton();
    }

    return {
        renderTasks: renderTasks
    };
}

export { createTaskRenderer };
