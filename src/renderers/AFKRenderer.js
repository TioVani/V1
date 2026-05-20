/**
 * AFKRenderer — 挂机系统渲染 + 触摸处理
 */
import { RARITY_COLORS } from '../config/GameConfig.js';
function createAFKRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getAfkSystem = deps.getAfkSystem;
    var getPlayerData = deps.getPlayerData;
    var getCalculateAccumulatedAfkRewards = deps.getCalculateAccumulatedAfkRewards;
    var getClaimAfkRewards = deps.getClaimAfkRewards;
    var getFillRoundRect = deps.getFillRoundRect;
    var getGachaRoundRect = deps.getGachaRoundRect;

    function renderAfkPopup() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var playerData = getPlayerData();
        var afkSystem = getAfkSystem();
        var calculateAccumulatedAfkRewards = getCalculateAccumulatedAfkRewards();
        var gachaRoundRect = getGachaRoundRect();
        var rewards = calculateAccumulatedAfkRewards();

        var popupWidth = screenWidth * 0.85;
        var popupHeight = screenHeight * 0.7;
        var popupX = (screenWidth - popupWidth) / 2;
        var popupY = (screenHeight - popupHeight) / 2 - 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        gachaRoundRect(ctx, popupX, popupY, popupWidth, popupHeight, 15);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold ' + Math.floor(26 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌙 挂机收益', screenWidth / 2, popupY + 35);

        ctx.strokeStyle = '#333366';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(popupX + 20, popupY + 55);
        ctx.lineTo(popupX + popupWidth - 20, popupY + 60);
        ctx.stroke();

        var yOffset = popupY + 95;
        var lineHeight = 32 * scale;

        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(18 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('⏱️ 挂机时长: ' + rewards.hours.toFixed(1) + ' 小时', popupX + 25, yOffset);
        yOffset += lineHeight;

        if (rewards.elapsedHours > rewards.hours) {
            ctx.fillStyle = '#888888';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.fillText('   (已达 ' + (playerData.afkData.maxOfflineHours || 8) + ' 小时上限)', popupX + 25, yOffset);
            yOffset += lineHeight * 0.8;
        }

        ctx.fillStyle = '#00ff88';
        ctx.font = Math.floor(18 * scale) + 'px sans-serif';
        ctx.fillText('✨ 收益加成: ×' + rewards.bonusMultiplier.toFixed(2), popupX + 25, yOffset);
        yOffset += lineHeight * 1.5;

        ctx.strokeStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(popupX + 20, yOffset - 10);
        ctx.lineTo(popupX + popupWidth - 20, yOffset - 10);
        ctx.stroke();
        yOffset += Math.floor(15 * scale);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
        ctx.fillText('🎁 累积奖励:', popupX + 25, yOffset);
        yOffset += lineHeight;

        ctx.fillStyle = '#ffcc00';
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillText('   💰 灵币: ' + rewards.gold, popupX + 25, yOffset);
        yOffset += lineHeight;

        ctx.fillStyle = '#00ccff';
        ctx.fillText('   ⭐ 感悟: ' + rewards.exp, popupX + 25, yOffset);
        yOffset += lineHeight;

        var matNames = { iceCrystal: '水灵晶', fireSource: '火灵源', critCrystal: '水灵暴晶', timeCrystal: '时序结晶' };
        var matEmojis = { iceCrystal: '💧', fireSource: '🔥', critCrystal: '💠', timeCrystal: '⏰' };
        var matCount = 0;
        for (var mat in rewards.materials) {
            if (rewards.materials[mat] > 0) matCount += rewards.materials[mat];
        }
        ctx.fillStyle = '#cc88ff';
        ctx.fillText('   📦 材料: ' + matCount + ' 个', popupX + 25, yOffset);
        yOffset += lineHeight;
        ctx.fillStyle = '#aa66dd';
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        for (var mat2 in rewards.materials) {
            if (rewards.materials[mat2] > 0) {
                ctx.fillText('      ' + (matEmojis[mat2] || '') + ' ' + (matNames[mat2] || mat2) + ' x' + rewards.materials[mat2], popupX + 25, yOffset);
                yOffset += lineHeight * 0.85;
            }
        }

        ctx.fillStyle = '#ff8866';
        ctx.fillText('   ⚔️ 装备: ' + rewards.equipments + ' 次掉落机会', popupX + 25, yOffset);

        var btnWidth = popupWidth * 0.6;
        var btnHeight = Math.floor(50 * scale);
        var btnX = (screenWidth - btnWidth) / 2;
        var btnY = popupY + popupHeight - btnHeight - 25;

        var gradient = ctx.createLinearGradient(btnX, btnY, btnX + btnWidth, btnY);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(1, '#ffaa00');
        ctx.fillStyle = gradient;
        gachaRoundRect(ctx, btnX, btnY, btnWidth, btnHeight, 10);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('领取奖励', screenWidth / 2, btnY + btnHeight / 2);

        var closeBtnSize = Math.floor(30 * scale);
        var closeBtnX = popupX + popupWidth - closeBtnSize - 10;
        var closeBtnY = popupY + 10;

        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(closeBtnX + closeBtnSize / 2, closeBtnY + closeBtnSize / 2, closeBtnSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×', closeBtnX + closeBtnSize / 2, closeBtnY + closeBtnSize / 2);
    }

    function renderAfkResultPopup() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var afkSystem = getAfkSystem();
        var fillRoundRect = getFillRoundRect();
        var gachaRoundRect = getGachaRoundRect();

        if (!afkSystem.claimedResult) return;
        var result = afkSystem.claimedResult;
        var matNames = { iceCrystal: '水灵晶', fireSource: '火灵源', critCrystal: '水灵暴晶', timeCrystal: '时序结晶' };
        var matEmojis = { iceCrystal: '💧', fireSource: '🔥', critCrystal: '💠', timeCrystal: '⏰' };
        var rarityColors = RARITY_COLORS;

        var popupWidth = screenWidth * 0.85;
        var popupHeight = screenHeight * 0.7;
        var popupX = (screenWidth - popupWidth) / 2;
        var popupY = (screenHeight - popupHeight) / 2 - 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;
        gachaRoundRect(ctx, popupX, popupY, popupWidth, popupHeight, 15);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold ' + Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎉 奖励已领取', screenWidth / 2, popupY + 40);

        ctx.strokeStyle = '#333366';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(popupX + 20, popupY + 55);
        ctx.lineTo(popupX + popupWidth - 20, popupY + 55);
        ctx.stroke();

        var yOffset = popupY + 85;
        var lineHeight = Math.floor(30 * scale);
        var leftX = popupX + 30;

        ctx.fillStyle = '#888888';
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('⏱️ 挂机 ' + result.hours + ' 小时 | 加成 ×' + result.bonus, leftX, yOffset);
        yOffset += lineHeight * 1.2;

        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(popupX + 20, yOffset - 8);
        ctx.lineTo(popupX + popupWidth - 20, yOffset - 8);
        ctx.stroke();
        yOffset += Math.floor(15 * scale);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
        ctx.fillText('📋 奖励明细', leftX, yOffset);
        yOffset += lineHeight * 1.1;

        ctx.fillStyle = '#ffcc00';
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillText('💰 灵币  +' + result.gold, leftX + 10, yOffset);
        yOffset += lineHeight;

        if (result.exp > 0) {
            ctx.fillStyle = '#00ccff';
            ctx.fillText('⭐ 感悟  +' + result.exp, leftX + 10, yOffset);
            yOffset += lineHeight;
        }

        var hasMaterial = false;
        for (var m in result.materials) {
            if (result.materials[m] > 0) { hasMaterial = true; break; }
        }
        if (hasMaterial) {
            ctx.fillStyle = '#cc88ff';
            ctx.font = Math.floor(16 * scale) + 'px sans-serif';
            ctx.fillText('📦 材料', leftX + 10, yOffset);
            yOffset += lineHeight * 0.9;
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            for (var m2 in result.materials) {
                if (result.materials[m2] > 0) {
                    ctx.fillStyle = '#aa66dd';
                    ctx.fillText('    ' + (matEmojis[m2] || '') + ' ' + (matNames[m2] || m2) + '  x' + result.materials[m2], leftX + 15, yOffset);
                    yOffset += lineHeight * 0.85;
                }
            }
        }

        if (result.equipments > 0) {
            ctx.fillStyle = '#ff8866';
            ctx.font = Math.floor(16 * scale) + 'px sans-serif';
            ctx.fillText('⚔️ 装备  +' + result.equipments + ' 件', leftX + 10, yOffset);
            yOffset += lineHeight * 0.9;
            if (result.equipList && result.equipList.length > 0) {
                ctx.font = Math.floor(13 * scale) + 'px sans-serif';
                for (var e = 0; e < Math.min(result.equipList.length, 5); e++) {
                    var eq = result.equipList[e];
                    var eqLabel = (eq.emoji || '⚔️') + ' ' + (eq.name || eq.id) + ' [' + (eq.rarity || 'N') + ']';
                    ctx.fillStyle = rarityColors[eq.rarity] || '#ffffff';
                    ctx.fillText('    ' + eqLabel, leftX + 15, yOffset);
                    yOffset += lineHeight * 0.8;
                }
                if (result.equipList.length > 5) {
                    ctx.fillStyle = '#888888';
                    ctx.fillText('    ...等' + result.equipList.length + '件', leftX + 15, yOffset);
                    yOffset += lineHeight * 0.8;
                }
            }
        }

        var btnWidth = popupWidth * 0.5;
        var btnHeight = Math.floor(50 * scale);
        var btnX = (screenWidth - btnWidth) / 2;
        var btnY2 = popupY + popupHeight - btnHeight - 25;

        var gradient = ctx.createLinearGradient(btnX, btnY2, btnX + btnWidth, btnY2);
        gradient.addColorStop(0, '#4CAF50');
        gradient.addColorStop(1, '#45a049');
        ctx.fillStyle = gradient;
        fillRoundRect(ctx, btnX, btnY2, btnWidth, btnHeight, 8);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('确认', screenWidth / 2, btnY2 + btnHeight / 2);
        ctx.textBaseline = 'alphabetic';

        var closeBtnSize = Math.floor(30 * scale);
        var closeBtnX = popupX + popupWidth - closeBtnSize - 10;
        var closeBtnY = popupY + 10;

        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(closeBtnX + closeBtnSize / 2, closeBtnY + closeBtnSize / 2, closeBtnSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×', closeBtnX + closeBtnSize / 2, closeBtnY + closeBtnSize / 2);
    }

    function renderAfkButton() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var scale = getScreenScale();
        var calculateAccumulatedAfkRewards = getCalculateAccumulatedAfkRewards();
        var gachaRoundRect = getGachaRoundRect();
        var rewards = calculateAccumulatedAfkRewards();

        var btnSize = Math.floor(50 * scale);
        var btnX = screenWidth - btnSize - 15;
        var btnY = 80;

        ctx.fillStyle = '#2a2a4e';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        gachaRoundRect(ctx, btnX, btnY, btnSize, btnSize, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌙', btnX + btnSize / 2, btnY + btnSize / 2);

        if (rewards.hours >= 0.1) {
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(btnX + btnSize - 5, btnY + 5, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function handleAfkPopupTouch(x, y) {
        var afkSystem = getAfkSystem();
        if (!afkSystem.popupVisible) return false;

        var scale = getScreenScale();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();

        var popupWidth = screenWidth * 0.85;
        var popupHeight = screenHeight * 0.7;
        var popupX = (screenWidth - popupWidth) / 2;
        var popupY = (screenHeight - popupHeight) / 2 - 20;

        var closeBtnSize = Math.floor(30 * scale);
        var closeBtnX = popupX + popupWidth - closeBtnSize - 10;
        var closeBtnY = popupY + 10;

        if (x >= closeBtnX && x <= closeBtnX + closeBtnSize && y >= closeBtnY && y <= closeBtnY + closeBtnSize) {
            afkSystem.popupVisible = false;
            return true;
        }

        var btnWidth = popupWidth * 0.6;
        var btnHeight = Math.floor(50 * scale);
        var btnX = (screenWidth - btnWidth) / 2;
        var btnY = popupY + popupHeight - btnHeight - 25;

        if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
            getClaimAfkRewards()();
            return true;
        }

        return true;
    }

    function handleAfkButtonTouch(x, y) {
        var afkSystem = getAfkSystem();
        var scale = getScreenScale();
        var screenWidth = getScreenWidth();
        var btnSize = Math.floor(50 * scale);
        var btnX = screenWidth - btnSize - 15;
        var btnY = 80;

        if (x >= btnX && x <= btnX + btnSize && y >= btnY && y <= btnY + btnSize) {
            afkSystem.popupVisible = true;
            return true;
        }
        return false;
    }

    function handleAfkResultTouch(x, y) {
        var afkSystem = getAfkSystem();
        if (!afkSystem.resultVisible) return false;

        var scale = getScreenScale();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();

        var popupWidth = screenWidth * 0.85;
        var popupHeight = screenHeight * 0.7;
        var popupX = (screenWidth - popupWidth) / 2;
        var popupY = (screenHeight - popupHeight) / 2 - 20;

        var closeBtnSize = Math.floor(30 * scale);
        var closeBtnX = popupX + popupWidth - closeBtnSize - 10;
        var closeBtnY = popupY + 10;

        if (x >= closeBtnX && x <= closeBtnX + closeBtnSize && y >= closeBtnY && y <= closeBtnY + closeBtnSize) {
            afkSystem.resultVisible = false;
            afkSystem.claimedResult = null;
            return true;
        }

        var btnWidth = popupWidth * 0.5;
        var btnHeight = Math.floor(50 * scale);
        var btnX = (screenWidth - btnWidth) / 2;
        var btnY = popupY + popupHeight - btnHeight - 25;

        if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
            afkSystem.resultVisible = false;
            afkSystem.claimedResult = null;
            return true;
        }

        return true;
    }

    return {
        renderAfkPopup: renderAfkPopup,
        renderAfkResultPopup: renderAfkResultPopup,
        renderAfkButton: renderAfkButton,
        handleAfkPopupTouch: handleAfkPopupTouch,
        handleAfkButtonTouch: handleAfkButtonTouch,
        handleAfkResultTouch: handleAfkResultTouch
    };
}

export { createAFKRenderer };
