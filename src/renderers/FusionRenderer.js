/**
 * FusionRenderer — 融合界面渲染+触摸处理
 */
import { FUSION_CONFIG } from '../config/FusionConfig.js';

function createFusionRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getPlayerData = deps.getPlayerData;
    var getFusionEngine = deps.getFusionEngine;
    var getFusionRegistry = deps.getFusionRegistry;
    var uiCore = deps.uiCore;
    var getFillRoundRect = deps.getFillRoundRect;
    var getAssets = deps.getAssets;
    var showToast = deps.showToast;

    var selectedType = 'character';
    var selectedMaterials = [];
    var showCodex = false;
    var scrollY = 0;
    var lastTouchY = 0;
    var isDragging = false;

    var TYPE_CONFIG = {
        character: { name: '共进', emoji: '👤', color: '#FF6B6B' },
        pet: { name: '超然', emoji: '🐾', color: '#4ECDC4' },
        skill: { name: '泉涌', emoji: '✨', color: '#9B59B6' },
        star: { name: '坍缩', emoji: '⭐', color: '#F1C40F' },
        equipment: { name: '祝融', emoji: '⚔️', color: '#E74C3C' }
    };

    // ==================== renderFusion ====================
    function renderFusion() {
        var ctx = getCtx();
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var scale = getScreenScale();
        var playerData = getPlayerData();
        var Assets = getAssets();
        var fillRoundRect = getFillRoundRect();
        var drawText = uiCore.drawText;
        var drawButton = uiCore.drawButton;
        var drawBackButton = uiCore.drawBackButton;

        // 背景
        if (Assets.backgroundImage && Assets.backgroundImage.complete && Assets.bgPositionCache) {
            var cache = Assets.bgPositionCache;
            ctx.drawImage(Assets.backgroundImage, cache.drawX, cache.drawY, cache.drawWidth, cache.drawHeight);
            ctx.fillStyle = 'rgba(15, 15, 26, 0.6)';
            ctx.fillRect(0, 0, sw, sh);
        } else {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, sw, sh);
        }

        // 标题
        drawText('🔮 融合', sw / 2, 40, Math.floor(32 * scale), '#ffd700');

        if (showCodex) {
            renderCodexView(ctx, sw, sh, scale, fillRoundRect, drawText);
        } else {
            renderTypeTabs(ctx, sw, scale, fillRoundRect);
            renderMaterialSlots(ctx, sw, sh, scale, fillRoundRect, drawText, playerData);
            renderActionArea(ctx, sw, sh, scale, fillRoundRect, drawText, drawButton, playerData);
        }

        drawBackButton();
    }

    // ==================== 类型标签 ====================
    function renderTypeTabs(ctx, sw, scale, fillRoundRect) {
        var types = ['character', 'pet', 'skill', 'star', 'equipment'];
        var tabW = Math.floor(52 * scale);
        var tabH = Math.floor(30 * scale);
        var gap = Math.floor(6 * scale);
        var totalW = types.length * tabW + (types.length - 1) * gap;
        var startX = (sw - totalW) / 2;
        var tabY = Math.floor(75 * scale);

        for (var i = 0; i < types.length; i++) {
            var tc = TYPE_CONFIG[types[i]];
            var tx = startX + i * (tabW + gap);
            var active = selectedType === types[i];

            ctx.fillStyle = active ? tc.color : 'rgba(255,255,255,0.1)';
            fillRoundRect(ctx, tx, tabY, tabW, tabH, 6);

            ctx.fillStyle = active ? '#fff' : '#888';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tc.emoji + tc.name, tx + tabW / 2, tabY + tabH / 2);
        }
    }

    // ==================== 材料槽 ====================
    function renderMaterialSlots(ctx, sw, sh, scale, fillRoundRect, drawText, playerData) {
        var slotSize = Math.floor(65 * scale);
        var gap = Math.floor(15 * scale);
        var totalW = FUSION_MATERIAL_COUNT * slotSize + (FUSION_MATERIAL_COUNT - 1) * gap;
        var startX = (sw - totalW) / 2;
        var slotY = Math.floor(130 * scale);

        drawText('选择材料（' + selectedMaterials.length + '/' + FUSION_MATERIAL_COUNT + '）',
            sw / 2, slotY - Math.floor(12 * scale), Math.floor(14 * scale), '#aaa');

        for (var i = 0; i < FUSION_MATERIAL_COUNT; i++) {
            var sx = startX + i * (slotSize + gap);

            if (i < selectedMaterials.length) {
                // 已选材料
                ctx.fillStyle = 'rgba(255,215,0,0.15)';
                fillRoundRect(ctx, sx, slotY, slotSize, slotSize, 8);
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2;
                ctx.strokeRect(sx + 1, slotY + 1, slotSize - 2, slotSize - 2);

                ctx.fillStyle = '#fff';
                ctx.font = Math.floor(11 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                var name = selectedMaterials[i].name || '?';
                if (name.length > 4) name = name.substring(0, 4);
                ctx.fillText(name, sx + slotSize / 2, slotY + slotSize / 2);
            } else {
                // 空槽
                ctx.fillStyle = 'rgba(255,255,255,0.05)';
                fillRoundRect(ctx, sx, slotY, slotSize, slotSize, 8);
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx + 1, slotY + 1, slotSize - 2, slotSize - 2);

                ctx.fillStyle = '#555';
                ctx.font = Math.floor(24 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('+', sx + slotSize / 2, slotY + slotSize / 2);
            }
        }

        // 材料列表
        renderMaterialList(ctx, sw, sh, scale, fillRoundRect, slotY + slotSize + Math.floor(15 * scale));
    }

    // ==================== 材料列表 ====================
    function renderMaterialList(ctx, sw, sh, scale, fillRoundRect, startY) {
        var engine = getFusionEngine();
        var available = _filterCompatible(engine.getAvailableMaterials(selectedType));
        var itemH = Math.floor(40 * scale);
        var padding = Math.floor(5 * scale);
        var listW = sw - Math.floor(40 * scale);
        var listX = Math.floor(20 * scale);

        var visibleH = sh - startY - Math.floor(120 * scale);
        var totalH = available.length * (itemH + padding);
        var maxScroll = Math.max(0, totalH - visibleH);
        if (scrollY < 0) scrollY = 0;
        if (scrollY > maxScroll) scrollY = maxScroll;

        var bottom = startY + visibleH;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, startY, sw, bottom - startY);
        ctx.clip();

        for (var i = 0; i < available.length; i++) {
            var item = available[i];
            var iy = startY + i * (itemH + padding) - scrollY;
            if (iy + itemH < startY || iy > bottom) continue;

            var isSelected = selectedMaterials.some(function(m) {
                if (item.uid && m.uid) return m.uid === item.uid;
                return m.id === item.id;
            });

            ctx.fillStyle = isSelected ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.08)';
            fillRoundRect(ctx, listX, iy, listW, itemH, 6);

            ctx.fillStyle = isSelected ? '#ffd700' : '#ddd';
            ctx.font = Math.floor(13 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText((item.name || item.id), listX + Math.floor(10 * scale), iy + itemH / 2);

            if (item.rarity) {
                ctx.fillStyle = '#888';
                ctx.font = Math.floor(10 * scale) + 'px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText('[' + item.rarity + ']', listX + listW - Math.floor(10 * scale), iy + itemH / 2);
            }
        }

        ctx.restore();
    }

    // ==================== 操作区 ====================
    function renderActionArea(ctx, sw, sh, scale, fillRoundRect, drawText, drawButton, playerData) {
        var engine = getFusionEngine();
        var registry = getFusionRegistry();
        var btnY = sh - Math.floor(100 * scale);
        var btnW = Math.floor(140 * scale);
        var btnH = Math.floor(45 * scale);
        var btnX = sw / 2 - btnW / 2;

        // 成功率预览
        if (selectedMaterials.length >= FUSION_MATERIAL_COUNT) {
            var ids = selectedMaterials.map(function(m) { return m.uid || m.id; });
            var rate = engine.getSuccessRate(ids, selectedType);
            if (rate <= 0) {
                var check = engine.validateSelection(ids, selectedType);
                drawText(check.valid ? '无法计算成功率' : check.error,
                    sw / 2, btnY - Math.floor(15 * scale), Math.floor(13 * scale), '#FF6B6B');
            } else {
                var pityCount = registry.getPityCount(selectedType);
                drawText('成功率: ' + rate + '%' + (pityCount > 0 ? '  保底: ' + pityCount + '/3' : ''),
                    sw / 2, btnY - Math.floor(15 * scale), Math.floor(14 * scale), '#aaa');
            }
        }

        // 融合按钮
        var canFuse = selectedMaterials.length >= FUSION_MATERIAL_COUNT;
        ctx.fillStyle = canFuse ? (TYPE_CONFIG[selectedType] || {}).color || '#4CAF50' : '#444';
        fillRoundRect(ctx, btnX, btnY, btnW, btnH, 8);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔮 融合', btnX + btnW / 2, btnY + btnH / 2);

        // 图鉴按钮（右下角，融合按钮上方）
        var codexBtnX = sw - Math.floor(80 * scale);
        var codexBtnY = sh - Math.floor(155 * scale);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        fillRoundRect(ctx, codexBtnX, codexBtnY, Math.floor(60 * scale), Math.floor(30 * scale), 6);
        ctx.fillStyle = '#aaa';
        ctx.font = Math.floor(11 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📖图鉴', codexBtnX + Math.floor(30 * scale), codexBtnY + Math.floor(15 * scale));
    }

    // ==================== 图鉴视图 ====================
    function renderCodexView(ctx, sw, sh, scale, fillRoundRect, drawText) {
        var registry = getFusionRegistry();
        drawText('📖 融合图鉴', sw / 2, 80, Math.floor(22 * scale), '#ffd700');

        var types = ['character', 'pet', 'skill', 'star', 'equipment'];
        var y = Math.floor(120 * scale);
        for (var i = 0; i < types.length; i++) {
            var tc = TYPE_CONFIG[types[i]];
            var count = registry.getCodexCount(types[i]);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            fillRoundRect(ctx, Math.floor(20 * scale), y, sw - Math.floor(40 * scale), Math.floor(35 * scale), 6);
            ctx.fillStyle = tc.color;
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(tc.emoji + ' ' + tc.name + ': ' + count + '种', Math.floor(35 * scale), y + Math.floor(22 * scale));
            y += Math.floor(45 * scale);
        }

        // 返回
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        fillRoundRect(ctx, sw / 2 - Math.floor(50 * scale), sh - Math.floor(100 * scale), Math.floor(100 * scale), Math.floor(35 * scale), 6);
        ctx.fillStyle = '#fff';
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('返回', sw / 2, sh - Math.floor(83 * scale));
    }

    // ==================== 触摸处理 ====================
    function handleFusionTouch(x, y) {
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var scale = getScreenScale();

        // 返回按钮
        if (x < Math.floor(60 * scale) && y > sh - Math.floor(60 * scale)) {
            return 'back';
        }

        if (showCodex) {
            var backX = sw / 2 - Math.floor(50 * scale);
            var backY = sh - Math.floor(100 * scale);
            if (x >= backX && x <= backX + Math.floor(100 * scale) && y >= backY && y <= backY + Math.floor(35 * scale)) {
                showCodex = false;
                return 'handled';
            }
            return 'handled';
        }

        // 类型标签
        var types = ['character', 'pet', 'skill', 'star', 'equipment'];
        var tabW = Math.floor(52 * scale);
        var tabH = Math.floor(30 * scale);
        var gap = Math.floor(6 * scale);
        var totalW = types.length * tabW + (types.length - 1) * gap;
        var startX = (sw - totalW) / 2;
        var tabY = Math.floor(75 * scale);

        for (var i = 0; i < types.length; i++) {
            var tx = startX + i * (tabW + gap);
            if (x >= tx && x <= tx + tabW && y >= tabY && y <= tabY + tabH) {
                if (selectedType !== types[i]) {
                    selectedType = types[i];
                    selectedMaterials = [];
                    scrollY = 0;
                }
                return 'handled';
            }
        }

        // 图鉴按钮（右下角）
        var codexBtnX = sw - Math.floor(80 * scale);
        var codexBtnY = sh - Math.floor(155 * scale);
        if (x >= codexBtnX && x <= codexBtnX + Math.floor(60 * scale) && y >= codexBtnY && y <= codexBtnY + Math.floor(30 * scale)) {
            showCodex = true;
            return 'handled';
        }

        // 材料槽点击（卸下已选材料）
        var slotSize = Math.floor(65 * scale);
        var slotGap = Math.floor(15 * scale);
        var slotTotalW = FUSION_MATERIAL_COUNT * slotSize + (FUSION_MATERIAL_COUNT - 1) * slotGap;
        var slotStartX = (sw - slotTotalW) / 2;
        var slotY = Math.floor(130 * scale);

        for (var si = 0; si < FUSION_MATERIAL_COUNT; si++) {
            var sx = slotStartX + si * (slotSize + slotGap);
            if (si < selectedMaterials.length && x >= sx && x <= sx + slotSize && y >= slotY && y <= slotY + slotSize) {
                selectedMaterials.splice(si, 1);
                return 'handled';
            }
        }

        // 材料列表点击
        var engine = getFusionEngine();
        var available = _filterCompatible(engine.getAvailableMaterials(selectedType));
        var itemH = Math.floor(40 * scale);
        var padding = Math.floor(5 * scale);
        var listStartY = Math.floor(130 * scale) + Math.floor(65 * scale) + Math.floor(15 * scale);
        var listX = Math.floor(20 * scale);
        var listW = sw - Math.floor(40 * scale);
        var listBottom = sh - Math.floor(120 * scale);

        for (var j = 0; j < available.length; j++) {
            var iy = listStartY + j * (itemH + padding) - scrollY;
            if (iy >= listBottom || iy + itemH < listStartY) continue;
            if (x >= listX && x <= listX + listW && y >= iy && y <= iy + itemH) {
                var item = available[j];
                var alreadyIdx = -1;
                for (var k = 0; k < selectedMaterials.length; k++) {
                    var sm = selectedMaterials[k];
                    if (item.uid && sm.uid) {
                        if (sm.uid === item.uid) { alreadyIdx = k; break; }
                    } else if (sm.id === item.id) {
                        alreadyIdx = k; break;
                    }
                }
                if (alreadyIdx >= 0) {
                    selectedMaterials.splice(alreadyIdx, 1);
                } else if (selectedMaterials.length < FUSION_MATERIAL_COUNT) {
                    var testIds = selectedMaterials.concat([item]).map(function(m) { return m.uid || m.id; });
                    if (testIds.length >= FUSION_MATERIAL_COUNT) {
                        var check = engine.validateSelection(testIds, selectedType);
                        if (!check.valid) {
                            if (showToast) showToast({ title: check.error, icon: 'none', duration: 1500 });
                            return 'handled';
                        }
                    }
                    selectedMaterials.push(item);
                }
                return 'handled';
            }
        }

        // 融合按钮
        var btnW = Math.floor(140 * scale);
        var btnH = Math.floor(45 * scale);
        var btnX = sw / 2 - btnW / 2;
        var btnY = sh - Math.floor(100 * scale);

        if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
            if (selectedMaterials.length >= FUSION_MATERIAL_COUNT) {
                var ids = selectedMaterials.map(function(m) { return m.uid || m.id; });
                var result = engine.perform(ids, selectedType);
                selectedMaterials = [];
                return result.success ? 'fusion_success' : 'fusion_fail';
            }
            return 'handled';
        }

        return 'handled';
    }

    // 常量引用
    var FUSION_MATERIAL_COUNT = FUSION_CONFIG.materialCount;

    function _getCompatKey(item) {
        if (selectedType === 'equipment') return (item.slot || '') + '_' + (item.rarity || '');
        if (selectedType === 'star') return item.starType || '';
        return item.rarity || '';
    }

    function _filterCompatible(available) {
        if (selectedMaterials.length === 0) return available;
        var firstKey = _getCompatKey(selectedMaterials[0]);
        var filtered = [];
        for (var i = 0; i < available.length; i++) {
            if (_getCompatKey(available[i]) === firstKey) filtered.push(available[i]);
        }
        return filtered;
    }

    function handleFusionTouchStart(y) {
        lastTouchY = y;
        isDragging = false;
    }

    function handleFusionTouchMove(y) {
        var deltaY = lastTouchY - y;
        if (Math.abs(deltaY) > 10) {
            scrollY += deltaY;
            isDragging = true;
        }
        lastTouchY = y;
    }

    function getIsDragging() {
        return isDragging;
    }

    function getSelectedCount() {
        return selectedMaterials.length;
    }

    return {
        renderFusion: renderFusion,
        handleFusionTouch: handleFusionTouch,
        handleFusionTouchStart: handleFusionTouchStart,
        handleFusionTouchMove: handleFusionTouchMove,
        getIsDragging: getIsDragging,
        getSelectedCount: getSelectedCount
    };
}

export { createFusionRenderer };
