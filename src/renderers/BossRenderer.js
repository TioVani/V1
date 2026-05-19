/**
 * BossRenderer — Boss挑战结果渲染 + Boss选择列表渲染
 */
function createBossRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var uiCore = deps.uiCore;
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getPlayerData = deps.getPlayerData;
    var getBossStarSystem = deps.getBossStarSystem;
    var getEquipments = deps.getEquipments;
    var getEquipmentRarity = deps.getEquipmentRarity;
    var BOSS_LIST = deps.BOSS_LIST;
    var getBossBattleMode = deps.getBossBattleMode;
    var getMaterials = deps.getMaterials;
    var getSkills = deps.getSkills;

    function renderBossBattleResult() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var Equipments = getEquipments();
        var Materials = getMaterials();
        var Skills = getSkills();
        var fillRoundRect = getFillRoundRect();
        var BossBattleMode = getBossBattleMode();
        var result = BossBattleMode.result;
        var rewards = BossBattleMode.rewardsObtained;

        // 背景
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 结果面板
        var panelWidth = Math.floor(320 * scale);
        var panelHeight = Math.floor(450 * scale);
        var panelX = (screenWidth - panelWidth) / 2;
        var panelY = (screenHeight - panelHeight) / 2;

        ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
        fillRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, Math.floor(15 * scale));

        // 标题
        var titleColor = result.success ? '#4CAF50' : '#E74C3C';
        ctx.fillStyle = titleColor;
        ctx.font = 'bold ' + Math.floor(28 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(result.success ? '🎉 挑战成功! 🎉' : '💔 挑战失败 💔', screenWidth / 2, panelY + Math.floor(50 * scale));

        // Boss名称
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
        ctx.fillText(result.bossName, screenWidth / 2, panelY + Math.floor(90 * scale));

        // 统计信息
        var lineY = panelY + Math.floor(130 * scale);
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';

        ctx.fillText(`得分: ${result.score}`, panelX + Math.floor(30 * scale), lineY);
        lineY += Math.floor(30 * scale);
        ctx.fillText(`最高连击: ${result.maxCombo}`, panelX + Math.floor(30 * scale), lineY);
        lineY += Math.floor(30 * scale);
        ctx.fillText(`剩余时间: ${result.time}s`, panelX + Math.floor(30 * scale), lineY);

        // 奖励（仅成功时显示）
        if (result.success && rewards) {
            lineY += Math.floor(20 * scale);
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
            ctx.fillText('获得奖励:', panelX + Math.floor(30 * scale), lineY);
            lineY += Math.floor(30 * scale);

            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';

            const rewardIconSize = Math.floor(14 * scale);

            if (rewards.gold > 0) {
                // 星币图标
                if (Assets.goldIcon && Assets.goldIcon.complete) {
                    ctx.drawImage(Assets.goldIcon, panelX + Math.floor(30 * scale), lineY - Math.floor(10 * scale), rewardIconSize, rewardIconSize);
                    ctx.fillText(`星币: +${rewards.gold}`, panelX + Math.floor(50 * scale), lineY);
                } else {
                    ctx.fillText(`💰 星币: +${rewards.gold}`, panelX + Math.floor(30 * scale), lineY);
                }
                lineY += Math.floor(25 * scale);
            }
            if (rewards.starSource > 0) {
                // 星源石图标
                if (Assets.starSourceIcon && Assets.starSourceIcon.complete) {
                    ctx.drawImage(Assets.starSourceIcon, panelX + Math.floor(30 * scale), lineY - Math.floor(10 * scale), rewardIconSize, rewardIconSize);
                    ctx.fillText(`星源石: +${rewards.starSource}`, panelX + Math.floor(50 * scale), lineY);
                } else {
                    ctx.fillText(`💎 星源石: +${rewards.starSource}`, panelX + Math.floor(30 * scale), lineY);
                }
                lineY += Math.floor(25 * scale);
            }
            if (Object.keys(rewards.materials).length > 0) {
                for (let matId in rewards.materials) {
                    var matName = (Materials && Materials[matId]) ? Materials[matId].name : matId;
                    ctx.fillText(`📦 材料: ${matName} x${rewards.materials[matId]}`, panelX + Math.floor(30 * scale), lineY);
                    lineY += Math.floor(25 * scale);
                }
            }
            if (rewards.equipment) {
                var equipName = (Equipments && Equipments[rewards.equipment]) ? Equipments[rewards.equipment].name : rewards.equipment;
                ctx.fillStyle = '#FF69B4';
                ctx.fillText(`⚔️ 装备: ${equipName}`, panelX + Math.floor(30 * scale), lineY);
                lineY += Math.floor(25 * scale);
            }
            if (rewards.skill) {
                var skillName = (Skills && Skills[rewards.skill]) ? Skills[rewards.skill].name : rewards.skill;
                ctx.fillStyle = '#87CEEB';
                ctx.fillText(`📖 技能: ${skillName}`, panelX + Math.floor(30 * scale), lineY);
            }
        }

        // 按钮
        var btnWidth = Math.floor(140 * scale);
        var btnHeight = Math.floor(45 * scale);
        var btnY = panelY + panelHeight - Math.floor(70 * scale);

        // 再战一次按钮（居中）
        ctx.fillStyle = '#FFD700';
        fillRoundRect(ctx, screenWidth/2 - btnWidth/2, btnY, btnWidth, btnHeight, 8);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('再战一次', screenWidth/2, btnY + btnHeight / 2);

        // 返回按钮（左下角统一）
        uiCore.drawBackButton();
    }

    function renderBossSelect() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var fillRoundRect = getFillRoundRect();
        var BossBattleMode = getBossBattleMode();
        var bossSelectScrollY = BossBattleMode.bossSelectScrollY || 0;

        // 背景
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 标题区域（固定）
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, screenWidth, Math.floor(80 * scale));
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(28 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️ Boss挑战 ⚔️', screenWidth / 2, Math.floor(50 * scale));

        // 计算列表区域
        var listTop = Math.floor(85 * scale);
        var listBottom = screenHeight - Math.floor(70 * scale);
        var listHeight = listBottom - listTop;
        var itemHeight = Math.floor(100 * scale);
        var itemGap = Math.floor(10 * scale);
        var itemWidth = screenWidth - Math.floor(40 * scale);
        var itemX = Math.floor(20 * scale);

        // 计算最大滚动距离
        var totalContentHeight = BOSS_LIST.length * (itemHeight + itemGap) - itemGap;
        var maxScroll = Math.max(0, totalContentHeight - listHeight);

        // 限制滚动范围
        if (bossSelectScrollY < 0) bossSelectScrollY = 0;
        if (bossSelectScrollY > maxScroll) bossSelectScrollY = maxScroll;

        // 保存当前状态并设置裁剪区域
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, listTop, screenWidth, listHeight);
        ctx.clip();

        // Boss列表（应用滚动偏移）
        var startY = listTop - bossSelectScrollY;

        for (let i = 0; i < BOSS_LIST.length; i++) {
            var boss = BOSS_LIST[i];
            var itemY = startY + i * (itemHeight + itemGap);

            // 跳过屏幕外的项
            if (itemY + itemHeight < listTop || itemY > listBottom) continue;

            // 背景框
            ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
            fillRoundRect(ctx, itemX, itemY, itemWidth, itemHeight, 8);

            // Boss图标
            ctx.font = Math.floor(50 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(boss.emoji, itemX + Math.floor(15 * scale), itemY + Math.floor(55 * scale));

            // Boss信息
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
            ctx.fillText(boss.name, itemX + Math.floor(80 * scale), itemY + Math.floor(30 * scale));

            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText('Lv.' + boss.level + ' | HP: ' + boss.hp + ' | 攻击: ' + boss.attack, itemX + Math.floor(80 * scale), itemY + Math.floor(55 * scale));

            ctx.fillStyle = '#87CEEB';
            ctx.font = Math.floor(11 * scale) + 'px sans-serif';
            ctx.fillText(boss.description, itemX + Math.floor(80 * scale), itemY + Math.floor(78 * scale));

            // 挑战按钮
            var btnW = Math.floor(70 * scale);
            var btnH = Math.floor(35 * scale);
            var btnX = itemX + itemWidth - btnW - Math.floor(15 * scale);
            var btnY = itemY + (itemHeight - btnH) / 2;

            ctx.fillStyle = '#FF6B6B';
            fillRoundRect(ctx, btnX, btnY, btnW, btnH, 8);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('挑战', btnX + btnW / 2, btnY + btnH / 2);
        }

        // 恢复状态
        ctx.restore();

        // 底部固定区域
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, listBottom, screenWidth, screenHeight - listBottom);

        // 返回按钮（统一）
        uiCore.drawBackButton();
    }

    return { renderBossBattleResult, renderBossSelect };
}
export { createBossRenderer };
