/**
 * ShopRenderer — 商城渲染模块
 * 从 game.js 提取的7个商城渲染函数
 */
import { RARITY_COLORS } from '../config/GameConfig.js';
function createShopRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var uiCore = deps.uiCore; // has drawText, drawButton, drawBackButton
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getStrokeRoundRect = deps.getStrokeRoundRect;
    var getPlayerData = deps.getPlayerData;
    var getUiScrollState = deps.getUiScrollState;
    // Config objects (imported constants, pass directly)
    var ShopItems = deps.ShopItems;
    var Pets = deps.Pets;
    var GACHA_POOLS = deps.GACHA_POOLS;
    // Helper functions / systems
    var getGachaSystem = deps.getGachaSystem;
    var getMonthlyCardSystem = deps.getMonthlyCardSystem;
    var getCombatState = deps.getCombatState;

    // ==================== renderShop ====================
    function renderShop() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var playerData = getPlayerData();
        var uiState = getUiScrollState();
        var drawText = uiCore.drawText;
        var drawButton = uiCore.drawButton;
        var drawBackButton = uiCore.drawBackButton;

        // 绘制背景图片（使用缓存的背景位置）
        if (Assets.backgroundImage && Assets.backgroundImage.complete && Assets.bgPositionCache) {
            var cache = Assets.bgPositionCache;
            ctx.drawImage(Assets.backgroundImage, cache.drawX, cache.drawY, cache.drawWidth, cache.drawHeight);

            // 添加半透明遮罩
            ctx.fillStyle = 'rgba(15, 15, 26, 0.5)';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
        } else {
            // 使用纯色背景
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
        }

        // 标题
        drawText('🛒 商城', screenWidth / 2, 50, Math.floor(36 * scale), '#ffd700');

        // 显示货币
        var goldIconSize = Math.floor(16 * scale);

        // 灵币
        if (Assets.goldIcon && Assets.goldIcon.complete) {
            ctx.drawImage(Assets.goldIcon, Math.floor(20 * scale), Math.floor(74 * scale), goldIconSize, goldIconSize);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('🪙', Math.floor(20 * scale), Math.floor(85 * scale));
        }
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(' ' + playerData.gold, Math.floor(40 * scale), Math.floor(85 * scale));

        // 灵石
        var starSourceIconSize = Math.floor(16 * scale);
        if (Assets.starSourceIcon && Assets.starSourceIcon.complete) {
            ctx.drawImage(Assets.starSourceIcon, Math.floor(130 * scale), Math.floor(74 * scale), starSourceIconSize, starSourceIconSize);
        } else {
            ctx.fillStyle = '#87CEEB';
            ctx.fillText('💎', Math.floor(130 * scale), Math.floor(85 * scale));
        }
        ctx.fillStyle = '#87CEEB';
        ctx.fillText(' ' + (playerData.starSource || 0), Math.floor(150 * scale), Math.floor(85 * scale));

        // 标签按钮配置（单行6个标签）
        var tabWidth = Math.floor(50 * scale);
        var tabHeight = Math.floor(30 * scale);
        var tabGap = Math.floor(5 * scale);
        var startX = (screenWidth - (tabWidth * 6 + tabGap * 5)) / 2;
        var tabY = Math.floor(110 * scale);

        // 材料标签按钮
        var materialsColor = uiState.shopTab === 'materials' ? '#ffd700' : '#87CEEB';
        drawButton('材料', startX + tabWidth / 2, tabY + tabHeight / 2, tabWidth, tabHeight, materialsColor);

        // 增益标签按钮
        var buffsColor = uiState.shopTab === 'buffs' ? '#ffd700' : '#87CEEB';
        drawButton('增益', startX + tabWidth + tabGap + tabWidth / 2, tabY + tabHeight / 2, tabWidth, tabHeight, buffsColor);

        // 道具标签按钮
        var itemsColor = uiState.shopTab === 'items' ? '#ffd700' : '#87CEEB';
        drawButton('道具', startX + (tabWidth + tabGap) * 2 + tabWidth / 2, tabY + tabHeight / 2, tabWidth, tabHeight, itemsColor);

        // 唤灵标签按钮
        var gachaColor = uiState.shopTab === 'gacha' ? '#ffd700' : '#87CEEB';
        drawButton('唤灵', startX + (tabWidth + tabGap) * 3 + tabWidth / 2, tabY + tabHeight / 2, tabWidth, tabHeight, gachaColor);

        // 宠物标签按钮
        var petsColor = uiState.shopTab === 'pets' ? '#ffd700' : '#87CEEB';
        drawButton('宠物', startX + (tabWidth + tabGap) * 4 + tabWidth / 2, tabY + tabHeight / 2, tabWidth, tabHeight, petsColor);

        // 月卡标签按钮
        var monthlyColor = uiState.shopTab === 'monthly' ? '#ffd700' : '#87CEEB';
        drawButton('月卡', startX + (tabWidth + tabGap) * 5 + tabWidth / 2, tabY + tabHeight / 2, tabWidth, tabHeight, monthlyColor);

        // 根据当前标签显示内容
        if (uiState.shopTab === 'materials') {
            renderShopMaterialsTab();
        } else if (uiState.shopTab === 'buffs') {
            renderShopBuffsTab();
        } else if (uiState.shopTab === 'items') {
            renderShopItemsTab();
        } else if (uiState.shopTab === 'gacha') {
            renderShopGachaTab();
        } else if (uiState.shopTab === 'pets') {
            renderShopPetsTab();
        } else if (uiState.shopTab === 'monthly') {
            renderShopMonthlyTab();
        }

        // 返回按钮（左下角）
        drawBackButton();
    }

    // ==================== renderShopMaterialsTab ====================
    function renderShopMaterialsTab() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var playerData = getPlayerData();
        var uiState = getUiScrollState();
        var fillRoundRect = getFillRoundRect();
        var combatState = getCombatState();

        var startY = Math.floor(160 * scale);
        var itemHeight = Math.floor(80 * scale);
        var padding = Math.floor(10 * scale);

        // 计算滚动限制
        var items = ShopItems.materials;
        var visibleHeight = screenHeight - startY - Math.floor(80 * scale);
        var totalHeight = items.length * (itemHeight + padding);
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        if (uiState.shopScrollY < 0) uiState.shopScrollY = 0;
        if (uiState.shopScrollY > maxScroll) uiState.shopScrollY = maxScroll;

        // 内容区域裁剪
        var contentTop = startY;
        var contentBottom = screenHeight - Math.floor(50 * scale);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentTop, screenWidth, contentBottom - contentTop);
        ctx.clip();

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var itemY = startY + i * (itemHeight + padding) - uiState.shopScrollY;

            // 商品背景（圆角）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), itemHeight, Math.floor(8 * scale));

            // 商品图标
            ctx.font = Math.floor(40 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.emoji, Math.floor(60 * scale), itemY + itemHeight / 2);

            // 商品名称
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(item.name, Math.floor(100 * scale), itemY + Math.floor(28 * scale));

            // 商品描述
            ctx.fillStyle = '#cccccc';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText(item.description, Math.floor(100 * scale), itemY + Math.floor(50 * scale));

            // 购买按钮
            var btnX = screenWidth - Math.floor(120 * scale);
            var btnY = itemY + Math.floor(20 * scale);
            var btnW = Math.floor(80 * scale);
            var btnH = Math.floor(35 * scale);

            // 检查是否买得起
            var canAfford = false;
            if (item.currency === 'gold') {
                canAfford = playerData.gold >= item.price;
            } else if (item.currency === 'starSource') {
                canAfford = (playerData.starSource || 0) >= item.price;
            }

            ctx.fillStyle = canAfford ? '#4CAF50' : '#666666';
            fillRoundRect(ctx, btnX, btnY, btnW, btnH, 6);

            // 价格文字（使用图片或emoji）
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (item.currency === 'gold' && Assets.goldIcon && Assets.goldIcon.complete) {
                var iconSize = Math.floor(11 * scale);
                ctx.drawImage(Assets.goldIcon, btnX + btnW / 2 - Math.floor(22 * scale), btnY + btnH / 2 - iconSize / 2, iconSize, iconSize);
                ctx.fillText(item.price, btnX + btnW / 2 + Math.floor(2 * scale), btnY + btnH / 2);
            } else if (item.currency === 'starSource' && Assets.starSourceIcon && Assets.starSourceIcon.complete) {
                var iconSize2 = Math.floor(11 * scale);
                ctx.drawImage(Assets.starSourceIcon, btnX + btnW / 2 - Math.floor(22 * scale), btnY + btnH / 2 - iconSize2 / 2, iconSize2, iconSize2);
                ctx.fillText(item.price, btnX + btnW / 2 + Math.floor(2 * scale), btnY + btnH / 2);
            } else {
                var priceText = (item.currency === 'gold' ? '🪙' : '💎') + item.price;
                ctx.fillText(priceText, btnX + btnW / 2, btnY + btnH / 2);
            }
        }

        // 时序结晶商品（只有解锁后才显示）
        if (combatState.timeCrystalUnlocked) {
            var timeCrystalItem = { id: 'timeCrystal', name: '时序结晶', emoji: '⏰', price: 0, currency: 'ad', description: '看广告获取，解锁时序星' };
            var tcItemY = startY + items.length * (itemHeight + padding) - uiState.shopScrollY;

            // 商品背景（圆角）
            ctx.fillStyle = 'rgba(100, 50, 150, 0.3)';  // 紫色调背景
            fillRoundRect(ctx, Math.floor(20 * scale), tcItemY, screenWidth - Math.floor(40 * scale), itemHeight, Math.floor(8 * scale));

            // 商品图标
            ctx.font = Math.floor(40 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(timeCrystalItem.emoji, Math.floor(60 * scale), tcItemY + itemHeight / 2);

            // 商品名称
            ctx.fillStyle = '#E6E6FA';  // 淡紫色
            ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(timeCrystalItem.name, Math.floor(100 * scale), tcItemY + Math.floor(28 * scale));

            // 商品描述
            ctx.fillStyle = '#cccccc';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText(timeCrystalItem.description, Math.floor(100 * scale), tcItemY + Math.floor(50 * scale));

            // 额外描述：当前持有数量
            var tcCount = playerData.materials && playerData.materials.timeCrystal ? playerData.materials.timeCrystal.quantity : 0;
            ctx.fillStyle = '#ffd700';
            ctx.fillText('持有: ' + tcCount, Math.floor(100 * scale), tcItemY + Math.floor(68 * scale));

            // 购买按钮（看广告）
            var tcBtnX = screenWidth - Math.floor(120 * scale);
            var tcBtnY = tcItemY + Math.floor(20 * scale);
            var tcBtnW = Math.floor(80 * scale);
            var tcBtnH = Math.floor(35 * scale);

            ctx.fillStyle = '#9370DB';  // 紫色按钮
            fillRoundRect(ctx, tcBtnX, tcBtnY, tcBtnW, tcBtnH, 6);

            // 按钮文字
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('📺 免费', tcBtnX + tcBtnW / 2, tcBtnY + tcBtnH / 2);
        }

        ctx.restore(); // 恢复裁剪区域
    }

    // ==================== renderShopBuffsTab ====================
    function renderShopBuffsTab() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var playerData = getPlayerData();
        var uiState = getUiScrollState();
        var fillRoundRect = getFillRoundRect();

        var startY = Math.floor(160 * scale);
        var itemHeight = Math.floor(80 * scale);
        var padding = Math.floor(10 * scale);

        var items = ShopItems.buffs;

        // 计算滚动限制
        var visibleHeight = screenHeight - startY - Math.floor(80 * scale);
        var totalHeight = items.length * (itemHeight + padding);
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        if (uiState.shopScrollY < 0) uiState.shopScrollY = 0;
        if (uiState.shopScrollY > maxScroll) uiState.shopScrollY = maxScroll;

        // 内容区域裁剪
        var contentTop = startY;
        var contentBottom = screenHeight - Math.floor(50 * scale);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentTop, screenWidth, contentBottom - contentTop);
        ctx.clip();

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var itemY = startY + i * (itemHeight + padding) - uiState.shopScrollY;

            // 商品背景（圆角）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), itemHeight, Math.floor(8 * scale));

            // 商品图标
            ctx.font = Math.floor(40 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.emoji, Math.floor(60 * scale), itemY + itemHeight / 2);

            // 商品名称
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(item.name, Math.floor(100 * scale), itemY + Math.floor(28 * scale));

            // 商品描述
            ctx.fillStyle = '#cccccc';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText(item.description + '（单局生效）', Math.floor(100 * scale), itemY + Math.floor(50 * scale));

            // 购买按钮
            var btnX = screenWidth - Math.floor(120 * scale);
            var btnY = itemY + Math.floor(20 * scale);
            var btnW = Math.floor(80 * scale);
            var btnH = Math.floor(35 * scale);

            var canAfford = (playerData.starSource || 0) >= item.price;

            ctx.fillStyle = canAfford ? '#4CAF50' : '#666666';
            fillRoundRect(ctx, btnX, btnY, btnW, btnH, 6);

            // 价格（使用图片或emoji）
            var iconSize = Math.floor(14 * scale);
            if (Assets.starSourceIcon && Assets.starSourceIcon.complete) {
                ctx.drawImage(Assets.starSourceIcon, btnX + btnW / 2 - Math.floor(22 * scale), btnY + btnH / 2 - iconSize / 2, iconSize, iconSize);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.price, btnX + btnW / 2 + Math.floor(6 * scale), btnY + btnH / 2);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('💎' + item.price, btnX + btnW / 2, btnY + btnH / 2);
            }
        }

        ctx.restore(); // 恢复裁剪区域
    }

    // ==================== renderShopItemsTab ====================
    function renderShopItemsTab() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var playerData = getPlayerData();
        var uiState = getUiScrollState();
        var fillRoundRect = getFillRoundRect();

        var startY = Math.floor(160 * scale);
        var itemHeight = Math.floor(80 * scale);
        var padding = Math.floor(10 * scale);

        var items = ShopItems.items;

        // 计算滚动限制
        var visibleHeight = screenHeight - startY - Math.floor(80 * scale);
        var totalHeight = items.length * (itemHeight + padding);
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        if (uiState.shopScrollY < 0) uiState.shopScrollY = 0;
        if (uiState.shopScrollY > maxScroll) uiState.shopScrollY = maxScroll;

        // 内容区域裁剪
        var contentTop = startY;
        var contentBottom = screenHeight - Math.floor(50 * scale);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentTop, screenWidth, contentBottom - contentTop);
        ctx.clip();

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var itemY = startY + i * (itemHeight + padding) - uiState.shopScrollY;

            // 商品背景（圆角）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), itemHeight, Math.floor(8 * scale));

            // 商品图标
            ctx.font = Math.floor(40 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.emoji, Math.floor(60 * scale), itemY + itemHeight / 2);

            // 商品名称
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(item.name, Math.floor(100 * scale), itemY + Math.floor(28 * scale));

            // 商品描述
            ctx.fillStyle = '#cccccc';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText(item.description, Math.floor(100 * scale), itemY + Math.floor(50 * scale));

            // 购买按钮
            var btnX = screenWidth - Math.floor(120 * scale);
            var btnY = itemY + Math.floor(20 * scale);
            var btnW = Math.floor(80 * scale);
            var btnH = Math.floor(35 * scale);

            var canAfford = playerData.gold >= item.price;

            ctx.fillStyle = canAfford ? '#4CAF50' : '#666666';
            fillRoundRect(ctx, btnX, btnY, btnW, btnH, 6);

            // 价格（使用图片或emoji）
            var iconSize = Math.floor(14 * scale);
            if (Assets.goldIcon && Assets.goldIcon.complete) {
                ctx.drawImage(Assets.goldIcon, btnX + btnW / 2 - Math.floor(22 * scale), btnY + btnH / 2 - iconSize / 2, iconSize, iconSize);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.price, btnX + btnW / 2 + Math.floor(6 * scale), btnY + btnH / 2);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🪙' + item.price, btnX + btnW / 2, btnY + btnH / 2);
            }
        }

        ctx.restore(); // 恢复裁剪区域
    }

    // ==================== renderShopGachaTab ====================
    function renderShopGachaTab() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var playerData = getPlayerData();
        var uiState = getUiScrollState();
        var fillRoundRect = getFillRoundRect();
        var gachaSystem = getGachaSystem();

        // 检查卡池轮换
        gachaSystem.checkGachaPoolRotation();

        // 卡池选择标签从商城标签下方开始
        var startY = Math.floor(150 * scale);

        // ===== 卡池选择标签（水平排列） =====
        var poolTabs = [
            { id: 'stars', name: '⭐', label: '灵光' },
            { id: 'pets', name: '🐾', label: '宠物' },
            { id: 'characters', name: '👤', label: '角色' },
            { id: 'skills', name: '✨', label: '技能' }
        ];

        var tabWidth = Math.floor(55 * scale);
        var tabHeight = Math.floor(35 * scale);
        var tabGap = Math.floor(5 * scale);
        var totalTabsWidth = poolTabs.length * tabWidth + (poolTabs.length - 1) * tabGap;
        var tabsStartX = (screenWidth - totalTabsWidth) / 2;

        for (var i = 0; i < poolTabs.length; i++) {
            var tab = poolTabs[i];
            var tabX = tabsStartX + i * (tabWidth + tabGap);
            var isActive = gachaSystem.currentPool === tab.id;

            ctx.fillStyle = isActive ? '#ffd700' : '#4a4a6a';
            fillRoundRect(ctx, tabX, startY, tabWidth, tabHeight, 6);

            ctx.fillStyle = isActive ? '#1a1a2e' : '#ffffff';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tab.name, tabX + tabWidth / 2, startY + tabHeight / 2);
        }

        // ===== 当前卡池信息 =====
        var pool = GACHA_POOLS[gachaSystem.currentPool];
        if (!pool) return;

        var infoY = startY + tabHeight + Math.floor(20 * scale);

        // 卡池标题
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(22 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pool.emoji + ' ' + pool.name, screenWidth / 2, infoY);

        // 卡池描述
        ctx.fillStyle = '#aaaaaa';
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillText(pool.description, screenWidth / 2, infoY + Math.floor(25 * scale));

        // 限定倒计时
        var remainingDays = gachaSystem.getGachaPoolRemainingDays();
        ctx.fillStyle = remainingDays <= 7 ? '#ff6b6b' : '#87CEEB';
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        ctx.fillText('限定剩余: ' + remainingDays + '天', screenWidth / 2, infoY + Math.floor(45 * scale));

        // 货币显示
        var currencyIconSize = Math.floor(16 * scale);
        var currencyText = '灵石: ' + (playerData.starSource || 0);
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        var textWidth = ctx.measureText(currencyText).width;
        var totalWidth = currencyIconSize + Math.floor(5 * scale) + textWidth;
        var currencyStartX = screenWidth / 2 - totalWidth / 2;

        if (Assets.starSourceIcon && Assets.starSourceIcon.complete) {
            ctx.drawImage(Assets.starSourceIcon, currencyStartX, infoY + Math.floor(62 * scale), currencyIconSize, currencyIconSize);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(currencyText, currencyStartX + currencyIconSize + Math.floor(5 * scale), infoY + Math.floor(70 * scale));
            ctx.textAlign = 'center';
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillText('💎 ' + currencyText, screenWidth / 2, infoY + Math.floor(70 * scale));
        }

        // 技能卡池时显示唤灵券数量
        if (gachaSystem.currentPool === 'skills') {
            var gachaTickets = (playerData.skills && playerData.skills.gachaTickets) ? playerData.skills.gachaTickets : 0;
            ctx.fillStyle = '#FFD700';
            ctx.fillText('&#x1F3AB; 唤灵券: ' + gachaTickets, screenWidth / 2, infoY + Math.floor(90 * scale));
        }

        // ===== 抽卡按钮 =====
        var btnY = infoY + Math.floor(100 * scale);
        var btnWidth = Math.floor(120 * scale);
        var btnHeight = Math.floor(45 * scale);
        var btnGap = Math.floor(20 * scale);

        // 获取技能唤灵券数量
        var gachaTickets = (playerData.skills && playerData.skills.gachaTickets) ? playerData.skills.gachaTickets : 0;
        var isSkillPool = (gachaSystem.currentPool === 'skills');

        // 单抽按钮
        var singleBtnX = screenWidth / 2 - btnWidth - btnGap / 2;
        var canAffordSingleWithTicket = isSkillPool && gachaTickets >= 1;
        var canAffordSingleWithStar = (playerData.starSource || 0) >= pool.singlePrice;
        var canAffordSingle = canAffordSingleWithTicket || canAffordSingleWithStar;

        ctx.fillStyle = canAffordSingle ? '#9b59b6' : '#666666';
        fillRoundRect(ctx, singleBtnX, btnY, btnWidth, btnHeight, 8);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('单次唤灵', singleBtnX + btnWidth / 2, btnY + Math.floor(15 * scale));
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        // 技能卡池优先显示唤灵券价格
        if (isSkillPool && gachaTickets >= 1) {
            ctx.fillText('🎫1张', singleBtnX + btnWidth / 2, btnY + Math.floor(32 * scale));
        } else {
            var gachaIconSize = Math.floor(14 * scale);
            if (Assets.starSourceIcon && Assets.starSourceIcon.complete) {
                ctx.drawImage(Assets.starSourceIcon, singleBtnX + btnWidth / 2 - Math.floor(18 * scale), btnY + Math.floor(25 * scale), gachaIconSize, gachaIconSize);
                ctx.fillText(pool.singlePrice, singleBtnX + btnWidth / 2 + Math.floor(8 * scale), btnY + Math.floor(32 * scale));
            } else {
                ctx.fillText('💎' + pool.singlePrice, singleBtnX + btnWidth / 2, btnY + Math.floor(32 * scale));
            }
        }

        // 十连抽按钮
        var tenBtnX = screenWidth / 2 + btnGap / 2;
        var canAffordTenWithTicket = isSkillPool && gachaTickets >= 10;
        var canAffordTenWithStar = (playerData.starSource || 0) >= pool.tenPrice;
        var canAffordTen = canAffordTenWithTicket || canAffordTenWithStar;

        ctx.fillStyle = canAffordTen ? '#e74c3c' : '#666666';
        fillRoundRect(ctx, tenBtnX, btnY, btnWidth, btnHeight, 8);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillText('古灵共鸣', tenBtnX + btnWidth / 2, btnY + Math.floor(15 * scale));
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        // 技能卡池优先显示唤灵券价格
        if (isSkillPool && gachaTickets >= 10) {
            ctx.fillText('🎫10张', tenBtnX + btnWidth / 2, btnY + Math.floor(32 * scale));
        } else {
            var gachaIconSize2 = Math.floor(14 * scale);
            if (Assets.starSourceIcon && Assets.starSourceIcon.complete) {
                ctx.drawImage(Assets.starSourceIcon, tenBtnX + btnWidth / 2 - Math.floor(18 * scale), btnY + Math.floor(25 * scale), gachaIconSize2, gachaIconSize2);
                ctx.fillText(pool.tenPrice, tenBtnX + btnWidth / 2 + Math.floor(8 * scale), btnY + Math.floor(32 * scale));
            } else {
                ctx.fillText('💎' + pool.tenPrice, tenBtnX + btnWidth / 2, btnY + Math.floor(32 * scale));
            }
        }

        // ===== 保底说明 =====
        var pityY = btnY + btnHeight + Math.floor(20 * scale);
        ctx.fillStyle = '#888888';
        ctx.font = Math.floor(11 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('保底: ' + pool.pity.sr + '必定唤来SR, ' + pool.pity.ssr + '必定唤来SSR', screenWidth / 2, pityY);

        // 当前保底计数
        var pityCount = gachaSystem.pityCount[gachaSystem.currentPool] || { sr: 0, ssr: 0 };
        ctx.fillStyle = '#ffd700';
        ctx.font = Math.floor(11 * scale) + 'px sans-serif';
        ctx.fillText('已唤灵: SR保底' + pityCount.sr + '/' + pool.pity.sr + '  SSR保底' + pityCount.ssr + '/' + pool.pity.ssr, screenWidth / 2, pityY + Math.floor(18 * scale));
    }

    // ==================== renderShopPetsTab ====================
    function renderShopPetsTab() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var playerData = getPlayerData();
        var uiState = getUiScrollState();
        var fillRoundRect = getFillRoundRect();

        var startY = Math.floor(160 * scale);
        var itemHeight = Math.floor(85 * scale);
        var padding = Math.floor(10 * scale);

        // 标题
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('宠物商店', Math.floor(20 * scale), startY - Math.floor(5 * scale));

        var purchasedShopPets = playerData.purchasedShopPets || [];
        var items = ShopItems.pets.filter(function(p) {
            return purchasedShopPets.indexOf(p.id) === -1;
        });

        // 计算滚动限制
        var listStartY = startY + Math.floor(20 * scale);
        var visibleHeight = screenHeight - listStartY - Math.floor(80 * scale);
        var totalHeight = items.length * (itemHeight + padding);
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        if (uiState.shopScrollY < 0) uiState.shopScrollY = 0;
        if (uiState.shopScrollY > maxScroll) uiState.shopScrollY = maxScroll;

        // 内容区域裁剪
        var contentTop = listStartY;
        var contentBottom = screenHeight - Math.floor(50 * scale);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentTop, screenWidth, contentBottom - contentTop);
        ctx.clip();

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var pet = Pets[item.id];
            var itemY = listStartY + i * (itemHeight + padding) - uiState.shopScrollY;

            // 商品背景（圆角）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), itemHeight, Math.floor(8 * scale));

            // 宠物图标
            ctx.font = Math.floor(40 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.emoji, Math.floor(55 * scale), itemY + itemHeight / 2);

            // 宠物名称
            var rarityColors = RARITY_COLORS;
            ctx.fillStyle = rarityColors[pet.rarity] || '#FFFFFF';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText('[' + pet.rarity + '] ' + item.name, Math.floor(90 * scale), itemY + Math.floor(25 * scale));

            // 宠物属性
            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            var attrText = '攻击:' + pet.attack + ' 攻速:' + pet.attackSpeed + 's';
            ctx.fillText(attrText, Math.floor(90 * scale), itemY + Math.floor(50 * scale));

            // 商品描述
            ctx.fillStyle = '#666666';
            ctx.font = Math.floor(11 * scale) + 'px sans-serif';
            ctx.fillText(item.description, Math.floor(90 * scale), itemY + Math.floor(70 * scale));

            // 购买按钮
            var btnX = screenWidth - Math.floor(100 * scale);
            var btnY = itemY + Math.floor(25 * scale);
            var btnW = Math.floor(80 * scale);
            var btnH = Math.floor(35 * scale);

            var canAfford = playerData.gold >= item.price;

            ctx.fillStyle = canAfford ? '#4CAF50' : '#666666';
            fillRoundRect(ctx, btnX, btnY, btnW, btnH, 6);

            // 价格（使用图片或emoji）
            var petIconSize = Math.floor(14 * scale);
            if (Assets.goldIcon && Assets.goldIcon.complete) {
                ctx.drawImage(Assets.goldIcon, btnX + btnW / 2 - Math.floor(20 * scale), btnY + btnH / 2 - petIconSize / 2, petIconSize, petIconSize);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(11 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.price, btnX + btnW / 2 + Math.floor(6 * scale), btnY + btnH / 2);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(11 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🪙' + item.price, btnX + btnW / 2, btnY + btnH / 2);
            }
        }

        ctx.restore(); // 恢复裁剪区域
    }

    // ==================== renderShopMonthlyTab ====================
    function renderShopMonthlyTab() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var playerData = getPlayerData();
        var fillRoundRect = getFillRoundRect();
        var strokeRoundRect = getStrokeRoundRect();
        var monthlyCardSystem = getMonthlyCardSystem();

        // 初始化月卡数据（如果不存在）
        if (!playerData.monthlyCards) {
            playerData.monthlyCards = {
                small: { days: 0, lastClaimDate: null, adsWatched: 0 },
                large: { days: 0, lastClaimDate: null, adsWatched: 0 }
            };
        }

        var startY = Math.floor(150 * scale);
        var cardWidth = screenWidth - Math.floor(40 * scale);
        var cardHeight = Math.floor(140 * scale);  // 减小卡片高度
        var cardGap = Math.floor(15 * scale);

        // 标题
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(22 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎁 月卡特权', screenWidth / 2, startY);

        // ===== 小月卡 =====
        var smallCardY = startY + Math.floor(35 * scale);

        // 小月卡背景（圆角）
        ctx.fillStyle = 'rgba(100, 150, 255, 0.2)';
        fillRoundRect(ctx, Math.floor(20 * scale), smallCardY, cardWidth, cardHeight, Math.floor(12 * scale));
        ctx.strokeStyle = '#6496FF';
        ctx.lineWidth = 2;
        strokeRoundRect(ctx, Math.floor(20 * scale), smallCardY, cardWidth, cardHeight, Math.floor(12 * scale));

        // 小月卡标题
        ctx.fillStyle = '#6496FF';
        ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('📅 小月卡', Math.floor(40 * scale), smallCardY + Math.floor(25 * scale));

        // 小月卡状态
        var smallDays = playerData.monthlyCards.small.days;
        var smallClaimedToday = monthlyCardSystem.isMonthlyCardClaimedToday('small');
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        ctx.fillText('剩余: ' + smallDays + '天 | 每日: 10💎', Math.floor(40 * scale), smallCardY + Math.floor(50 * scale));
        ctx.fillStyle = '#aaaaaa';
        ctx.font = Math.floor(11 * scale) + 'px sans-serif';
        ctx.fillText('看1个广告+30天（上限180天）', Math.floor(40 * scale), smallCardY + Math.floor(70 * scale));

        // 小月卡按钮
        var smallBtnX = screenWidth - Math.floor(110 * scale);
        var smallBtnY = smallCardY + Math.floor(40 * scale);
        var smallBtnW = Math.floor(85 * scale);
        var smallBtnH = Math.floor(35 * scale);

        if (smallDays > 0) {
            if (smallClaimedToday) {
                // 已领取
                ctx.fillStyle = '#666666';
                fillRoundRect(ctx, smallBtnX, smallBtnY, smallBtnW, smallBtnH, 6);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('今日已领', smallBtnX + smallBtnW / 2, smallBtnY + smallBtnH / 2);
            } else {
                // 可领取
                ctx.fillStyle = '#4CAF50';
                fillRoundRect(ctx, smallBtnX, smallBtnY, smallBtnW, smallBtnH, 6);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('领取奖励', smallBtnX + smallBtnW / 2, smallBtnY + smallBtnH / 2);
            }
        } else {
            // 无月卡，看广告获取
            ctx.fillStyle = '#FF9800';
            fillRoundRect(ctx, smallBtnX, smallBtnY, smallBtnW, smallBtnH, 6);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('看广告+1天', smallBtnX + smallBtnW / 2, smallBtnY + smallBtnH / 2);
        }

        // ===== 大月卡 =====
        var largeCardY = smallCardY + cardHeight + cardGap;

        // 大月卡背景（圆角）
        ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
        fillRoundRect(ctx, Math.floor(20 * scale), largeCardY, cardWidth, cardHeight, Math.floor(12 * scale));
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        strokeRoundRect(ctx, Math.floor(20 * scale), largeCardY, cardWidth, cardHeight, Math.floor(12 * scale));

        // 大月卡标题
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('👑 大月卡', Math.floor(40 * scale), largeCardY + Math.floor(25 * scale));

        // 大月卡状态
        var largeDays = playerData.monthlyCards.large.days;
        var largeClaimedToday = monthlyCardSystem.isMonthlyCardClaimedToday('large');
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        ctx.fillText('剩余: ' + largeDays + '天 | 每日: 20💎', Math.floor(40 * scale), largeCardY + Math.floor(50 * scale));
        ctx.fillStyle = '#aaaaaa';
        ctx.font = Math.floor(11 * scale) + 'px sans-serif';
        ctx.fillText('看1个广告+6天（上限180天）', Math.floor(40 * scale), largeCardY + Math.floor(70 * scale));

        // 大月卡按钮
        var largeBtnX = screenWidth - Math.floor(110 * scale);
        var largeBtnY = largeCardY + Math.floor(40 * scale);
        var largeBtnW = Math.floor(85 * scale);
        var largeBtnH = Math.floor(35 * scale);

        if (largeDays > 0) {
            if (largeClaimedToday) {
                // 已领取
                ctx.fillStyle = '#666666';
                fillRoundRect(ctx, largeBtnX, largeBtnY, largeBtnW, largeBtnH, 6);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('今日已领', largeBtnX + largeBtnW / 2, largeBtnY + largeBtnH / 2);
            } else {
                // 可领取
                ctx.fillStyle = '#4CAF50';
                fillRoundRect(ctx, largeBtnX, largeBtnY, largeBtnW, largeBtnH, 6);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('领取奖励', largeBtnX + largeBtnW / 2, largeBtnY + largeBtnH / 2);
            }
        } else {
            // 无月卡，看广告获取
            ctx.fillStyle = '#FF9800';
            fillRoundRect(ctx, largeBtnX, largeBtnY, largeBtnW, largeBtnH, 6);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('看广告', largeBtnX + largeBtnW / 2, largeBtnY + largeBtnH / 2);
            ctx.font = Math.floor(10 * scale) + 'px sans-serif';
            // 确保 monthlyCards 存在
            var largeAdsWatched = (playerData.monthlyCards && playerData.monthlyCards.large) ? playerData.monthlyCards.large.adsWatched : 0;
            ctx.fillText('(' + largeAdsWatched + '/5)', largeBtnX + largeBtnW / 2, largeBtnY + largeBtnH / 2 + Math.floor(18 * scale));
        }
    }

    return {
        renderShop: renderShop,
        renderShopMaterialsTab: renderShopMaterialsTab,
        renderShopBuffsTab: renderShopBuffsTab,
        renderShopItemsTab: renderShopItemsTab,
        renderShopGachaTab: renderShopGachaTab,
        renderShopPetsTab: renderShopPetsTab,
        renderShopMonthlyTab: renderShopMonthlyTab
    };
}

export { createShopRenderer };
