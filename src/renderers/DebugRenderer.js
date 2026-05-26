/**
 * DebugRenderer — 调试面板渲染 + 触摸处理
 */
function createDebugRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getFillRoundRect = deps.getFillRoundRect;
    var getStrokeRoundRect = deps.getStrokeRoundRect;
    var getGodMode = deps.getGodMode || function() { return false; };
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };
    var DESIGN_HEIGHT = 812;

    var DEBUG_BUTTONS = [
        { id: 'unlock_chars', label: '🔓 解锁所有角色', color: '#4CAF50' },
        { id: 'unlock_stars', label: '⭐ 解锁所有灵光', color: '#2196F3' },
        { id: 'add_gold', label: '💰 +10000灵币', color: '#FFD700' },
        { id: 'add_materials', label: '📦 满材料', color: '#9C27B0' },
        { id: 'add_starSource', label: '💎 +1000灵石', color: '#00BCD4' },
        { id: 'max_level', label: '📈 角色满级', color: '#FF9800' },
        { id: 'unlock_equips', label: '⚔️ 解锁所有装备', color: '#795548' },
        { id: 'unlock_skills', label: '🔮 解锁所有技能', color: '#607D8B' },
        { id: 'unlock_pets', label: '🐾 解锁所有宠物', color: '#E91E63' },
        { id: 'unlock_all', label: '🌟 解锁所有功能', color: '#FF5722' },
        { id: 'dev_battle', label: '⚔ 战斗调参', color: '#FF69B4' },
        { id: 'ui_editor', label: 'UI编辑器', color: '#9370DB' },
        { id: 'god_mode', label: '🛡️ 无敌模式', color: '#00E676' }
    ];

    function getLayout(scale) {
        var btnWidth = Math.floor(130 * scale);
        var btnHeight = Math.floor(35 * scale);
        var btnGap = Math.floor(10 * scale);
        var rows = Math.ceil(DEBUG_BUTTONS.length / 2);
        var contentHeight = Math.floor(50 * scale) + rows * (btnHeight + btnGap) + Math.floor(30 * scale);
        var panelWidth = Math.floor(300 * scale);
        var panelHeight = Math.max(Math.floor(450 * scale), contentHeight);
        return {
            btnWidth: btnWidth,
            btnHeight: btnHeight,
            btnGap: btnGap,
            panelWidth: panelWidth,
            panelHeight: panelHeight
        };
    }

    function renderDebugPanel() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var fillRoundRect = getFillRoundRect();
        var strokeRoundRect = getStrokeRoundRect();
        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);

        var layout = getLayout(scale);
        var panelWidth = layout.panelWidth;
        var panelHeight = layout.panelHeight;
        var panelX = (screenWidth - panelWidth) / 2;
        var panelY = (designOffsetY + designBottom - panelHeight) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = Math.floor(2 * scale);
        var panelRadius = Math.floor(15 * scale);
        fillRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, panelRadius);
        strokeRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, panelRadius);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔧 调试面板', panelX + panelWidth / 2, panelY + Math.floor(25 * scale));

        var closeBtnSize = Math.floor(30 * scale);
        var closeBtnX = panelX + panelWidth - closeBtnSize - Math.floor(5 * scale);
        var closeBtnY = panelY + Math.floor(5 * scale);
        ctx.fillStyle = '#FF6B6B';
        fillRoundRect(ctx, closeBtnX, closeBtnY, closeBtnSize, closeBtnSize, Math.floor(4 * scale));
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillText('✕', closeBtnX + closeBtnSize / 2, closeBtnY + closeBtnSize / 2);

        var btnWidth = layout.btnWidth;
        var btnHeight = layout.btnHeight;
        var btnGap = layout.btnGap;
        var startY = panelY + Math.floor(50 * scale);

        for (var i = 0; i < DEBUG_BUTTONS.length; i++) {
            var btn = DEBUG_BUTTONS[i];
            var row = Math.floor(i / 2);
            var col = i % 2;
            var bx = panelX + Math.floor(15 * scale) + col * (btnWidth + btnGap);
            var by = startY + row * (btnHeight + btnGap);

            var isGodBtn = btn.id === 'god_mode';
            var isGodActive = isGodBtn && getGodMode();
            ctx.fillStyle = isGodActive ? '#FF1744' : btn.color;
            fillRoundRect(ctx, bx, by, btnWidth, btnHeight, Math.floor(6 * scale));

            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isGodActive ? '🛡️ 无敌 ON' : btn.label, bx + btnWidth / 2, by + btnHeight / 2);
        }

        ctx.fillStyle = '#888888';
        ctx.font = Math.floor(10 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('点击功能按钮执行操作', panelX + panelWidth / 2, panelY + panelHeight - Math.floor(15 * scale));
    }

    function handleDebugPanelTouch(x, y) {
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);

        var layout = getLayout(scale);
        var panelWidth = layout.panelWidth;
        var panelHeight = layout.panelHeight;
        var panelX = (screenWidth - panelWidth) / 2;
        var panelY = (designOffsetY + designBottom - panelHeight) / 2;

        var closeBtnSize = Math.floor(30 * scale);
        var closeBtnX = panelX + panelWidth - closeBtnSize - Math.floor(5 * scale);
        var closeBtnY = panelY + Math.floor(5 * scale);

        if (x >= closeBtnX && x <= closeBtnX + closeBtnSize && y >= closeBtnY && y <= closeBtnY + closeBtnSize) {
            return 'close';
        }

        var btnWidth = layout.btnWidth;
        var btnHeight = layout.btnHeight;
        var btnGap = layout.btnGap;
        var startY = panelY + Math.floor(50 * scale);

        for (var i = 0; i < DEBUG_BUTTONS.length; i++) {
            var row = Math.floor(i / 2);
            var col = i % 2;
            var bx = panelX + Math.floor(15 * scale) + col * (btnWidth + btnGap);
            var by = startY + row * (btnHeight + btnGap);

            if (x >= bx && x <= bx + btnWidth && y >= by && y <= by + btnHeight) {
                return DEBUG_BUTTONS[i].id;
            }
        }

        // 点击面板外关闭
        if (x < panelX || x > panelX + panelWidth || y < panelY || y > panelY + panelHeight) {
            return 'close';
        }

        return null;
    }

    return {
        renderDebugPanel: renderDebugPanel,
        handleDebugPanelTouch: handleDebugPanelTouch
    };
}

export { createDebugRenderer };
