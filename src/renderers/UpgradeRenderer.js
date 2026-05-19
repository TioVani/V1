/**
 * UpgradeRenderer — 升级+升星界面渲染+触摸处理
 */
import { UPGRADE_CONFIG } from '../config/UpgradeConfig.js';

function createUpgradeRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getPlayerData = deps.getPlayerData;
    var getUpgradeEngine = deps.getUpgradeEngine;
    var uiCore = deps.uiCore;
    var getFillRoundRect = deps.getFillRoundRect;
    var getAssets = deps.getAssets;

    var selectedType = 'character';
    var selectedEntity = null;
    var scrollY = 0;
    var lastTouchY = 0;
    var isDragging = false;

    var TYPE_CONFIG = {
        character: { name: '角色', emoji: '👤', color: '#FF6B6B' },
        equipment: { name: '装备', emoji: '⚔️', color: '#E74C3C' },
        skill:     { name: '技能', emoji: '✨', color: '#9B59B6' },
        pet:       { name: '宠物', emoji: '🐾', color: '#4ECDC4' },
        star:      { name: '星星', emoji: '⭐', color: '#F1C40F' }
    };

    // ==================== renderUpgrade ====================
    function renderUpgrade() {
        var ctx = getCtx();
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var scale = getScreenScale();
        var Assets = getAssets();
        var fillRoundRect = getFillRoundRect();
        var drawText = uiCore.drawText;
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
        drawText('⬆ 升级升星', sw / 2, 40, Math.floor(28 * scale), '#ffd700');

        // 类型标签
        renderTypeTabs(ctx, sw, scale, fillRoundRect);

        if (selectedEntity) {
            renderDetailPanel(ctx, sw, sh, scale, fillRoundRect, drawText);
        } else {
            renderEntityList(ctx, sw, sh, scale, fillRoundRect, drawText);
        }

        drawBackButton();
    }

    // ==================== 类型标签 ====================
    function renderTypeTabs(ctx, sw, scale, fillRoundRect) {
        var types = ['character', 'equipment', 'skill', 'pet', 'star'];
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

    // ==================== 实体列表 ====================
    function renderEntityList(ctx, sw, sh, scale, fillRoundRect, drawText) {
        var engine = getUpgradeEngine();
        var entities = engine.getAvailableEntities(selectedType);
        var config = UPGRADE_CONFIG.entities[selectedType];
        var itemH = Math.floor(55 * scale);
        var padding = Math.floor(6 * scale);
        var listW = sw - Math.floor(40 * scale);
        var listX = Math.floor(20 * scale);
        var startY = Math.floor(120 * scale);
        var visibleH = sh - startY - Math.floor(60 * scale);
        var totalH = entities.length * (itemH + padding);
        var maxScroll = Math.max(0, totalH - visibleH);
        if (scrollY < 0) scrollY = 0;
        if (scrollY > maxScroll) scrollY = maxScroll;
        var bottom = startY + visibleH;

        if (entities.length === 0) {
            drawText('暂无' + TYPE_CONFIG[selectedType].name, sw / 2, startY + visibleH / 2, Math.floor(14 * scale), '#666');
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, startY, sw, bottom - startY);
        ctx.clip();

        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            var iy = startY + i * (itemH + padding) - scrollY;
            if (iy + itemH < startY || iy > bottom) continue;

            var starLv = entity.starLevel || 0;
            var maxStar = config.maxStar;
            var atMax = entity.level >= config.maxLevel && starLv >= maxStar;

            // 卡片背景
            ctx.fillStyle = atMax ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.08)';
            fillRoundRect(ctx, listX, iy, listW, itemH, 8);

            // 名称
            ctx.fillStyle = atMax ? '#ffd700' : '#eee';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(entity.name || entity.uid, listX + Math.floor(12 * scale), iy + itemH * 0.35);

            // 等级 + 星级
            var starStr = '';
            for (var s = 0; s < maxStar; s++) {
                starStr += s < starLv ? '★' : '☆';
            }
            ctx.fillStyle = '#888';
            ctx.font = Math.floor(11 * scale) + 'px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('Lv.' + entity.level + (starStr ? '  ' + starStr : ''), listX + listW - Math.floor(12 * scale), iy + itemH * 0.35);

            // 升星材料提示
            if (starLv < maxStar) {
                var needed = config.starMaterials[starLv];
                var rate = config.starRates[starLv];
                var ratePercent = Math.floor(rate * 100);
                var barW = listW - Math.floor(24 * scale);
                var barH = Math.floor(6 * scale);
                var barX = listX + Math.floor(12 * scale);
                var barY = iy + itemH * 0.65;

                ctx.fillStyle = '#666';
                ctx.font = Math.floor(9 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('★' + (starLv + 1) + ' 需' + needed + '份同ID  ' + ratePercent + '%成功率', barX, barY + barH);
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.font = Math.floor(10 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('已满星', listX + Math.floor(12 * scale), iy + itemH * 0.75);
            }
        }

        ctx.restore();
    }

    // ==================== 详情面板 ====================
    function renderDetailPanel(ctx, sw, sh, scale, fillRoundRect, drawText) {
        var engine = getUpgradeEngine();
        var info = engine.getUpgradeInfo(selectedEntity.uid, selectedType);
        if (!info) {
            selectedEntity = null;
            return;
        }
        var config = UPGRADE_CONFIG.entities[selectedType];
        var panelX = Math.floor(15 * scale);
        var panelW = sw - Math.floor(30 * scale);
        var startY = Math.floor(120 * scale);
        var rowH = Math.floor(28 * scale);
        var y = startY;

        // 实体名称卡片
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        fillRoundRect(ctx, panelX, y, panelW, Math.floor(50 * scale), 8);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(selectedEntity.name, sw / 2, y + Math.floor(20 * scale));

        // 星级显示
        var starStr = '';
        for (var s = 0; s < config.maxStar; s++) {
            starStr += s < info.starLevel ? '★' : '☆';
        }
        ctx.fillStyle = '#ffd700';
        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillText(starStr || '', sw / 2, y + Math.floor(40 * scale));
        y += Math.floor(60 * scale);

        // 信息行
        var rows = [
            { label: '等级', value: 'Lv.' + info.level + ' / ' + info.maxLevel },
        ];
        if (info.currentMultiplier && info.currentMultiplier > 1) {
            rows.push({ label: '星级倍率', value: '×' + info.currentMultiplier });
        }

        for (var r = 0; r < rows.length; r++) {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            fillRoundRect(ctx, panelX, y, panelW, rowH, 4);
            ctx.fillStyle = '#aaa';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(rows[r].label, panelX + Math.floor(15 * scale), y + rowH / 2);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.fillText(rows[r].value, panelX + panelW - Math.floor(15 * scale), y + rowH / 2);
            y += rowH + Math.floor(4 * scale);
        }

        y += Math.floor(10 * scale);

        // 可用材料列表（升星消耗的同ID副本）
        if (!info.atMaxStar && info.materialDetails) {
            var mats = info.materialDetails;
            drawText('可用材料 (' + mats.length + '份)', sw / 2, y + Math.floor(8 * scale), Math.floor(12 * scale), '#aaa');
            y += Math.floor(20 * scale);

            var matItemH = Math.floor(30 * scale);
            var maxShow = Math.min(mats.length, 4);
            for (var mi = 0; mi < maxShow; mi++) {
                ctx.fillStyle = 'rgba(255,152,0,0.08)';
                fillRoundRect(ctx, panelX, y, panelW, matItemH, 4);
                ctx.fillStyle = '#ccc';
                ctx.font = Math.floor(11 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                var matLabel = (mi + 1) + '. ' + mats[mi].name;
                if (mats[mi].level > 1) matLabel += ' Lv.' + mats[mi].level;
                ctx.fillText(matLabel, panelX + Math.floor(10 * scale), y + matItemH / 2);
                if (mats[mi].rarity) {
                    ctx.fillStyle = '#888';
                    ctx.font = Math.floor(10 * scale) + 'px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText('[' + mats[mi].rarity + ']', panelX + panelW - Math.floor(10 * scale), y + matItemH / 2);
                }
                y += matItemH + Math.floor(3 * scale);
            }
            if (mats.length > maxShow) {
                ctx.fillStyle = '#666';
                ctx.font = Math.floor(10 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('... 还有' + (mats.length - maxShow) + '份', sw / 2, y + Math.floor(10 * scale));
                y += Math.floor(20 * scale);
            }
            y += Math.floor(5 * scale);
        }

        // 升级按钮区
        if (!info.atMaxLevel) {
            var cost = info.upgradeCost;
            var costStr = _formatCost(cost);
            var playerData = getPlayerData();
            var canUp = _canAffordCost(playerData, cost);

            ctx.fillStyle = canUp ? '#4CAF50' : '#444';
            fillRoundRect(ctx, panelX, y, panelW, Math.floor(42 * scale), 8);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('升级 → Lv.' + (info.level + 1), sw / 2, y + Math.floor(14 * scale));
            ctx.font = Math.floor(11 * scale) + 'px sans-serif';
            ctx.fillStyle = canUp ? '#ddd' : '#888';
            ctx.fillText('消耗: ' + costStr, sw / 2, y + Math.floor(32 * scale));
            y += Math.floor(52 * scale);
        } else {
            ctx.fillStyle = '#333';
            fillRoundRect(ctx, panelX, y, panelW, Math.floor(42 * scale), 8);
            ctx.fillStyle = '#888';
            ctx.font = Math.floor(13 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('已达最高等级', sw / 2, y + Math.floor(21 * scale));
            y += Math.floor(52 * scale);
        }

        // 升星按钮区
        if (!info.atMaxStar) {
            var needed = info.starMaterialCount;
            var available = info.availableMaterials;
            var rate = info.starRate;
            var ratePercent = Math.floor(rate * 100);
            var canStarUp = available >= needed;

            ctx.fillStyle = canStarUp ? '#FF9800' : '#444';
            fillRoundRect(ctx, panelX, y, panelW, Math.floor(55 * scale), 8);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('升星 ★' + (info.starLevel + 1), sw / 2, y + Math.floor(14 * scale));
            ctx.font = Math.floor(11 * scale) + 'px sans-serif';
            ctx.fillStyle = canStarUp ? '#ddd' : '#888';
            ctx.fillText('消耗同ID: ' + available + '/' + needed + '  成功率: ' + ratePercent + '%', sw / 2, y + Math.floor(32 * scale));
            ctx.fillStyle = rate >= 0.8 ? '#4CAF50' : (rate >= 0.5 ? '#FF9800' : '#FF5252');
            ctx.font = Math.floor(10 * scale) + 'px sans-serif';
            ctx.fillText('→ 倍率 ×' + info.starMultiplier, sw / 2, y + Math.floor(46 * scale));
            y += Math.floor(65 * scale);
        } else {
            ctx.fillStyle = 'rgba(255,215,0,0.15)';
            fillRoundRect(ctx, panelX, y, panelW, Math.floor(42 * scale), 8);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold ' + Math.floor(13 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('已满星 ★' + info.starLevel, sw / 2, y + Math.floor(21 * scale));
            y += Math.floor(52 * scale);
        }

        // 返回列表按钮
        var backBtnW = Math.floor(100 * scale);
        var backBtnH = Math.floor(32 * scale);
        var backBtnX = sw / 2 - backBtnW / 2;
        var backBtnY = Math.min(y + Math.floor(10 * scale), sh - Math.floor(80 * scale));
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        fillRoundRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 6);
        ctx.fillStyle = '#aaa';
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('返回列表', sw / 2, backBtnY + backBtnH / 2);
    }

    // ==================== 触摸处理 ====================
    function handleUpgradeTouch(x, y) {
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var scale = getScreenScale();

        // 返回按钮
        if (x < Math.floor(60 * scale) && y > sh - Math.floor(60 * scale)) {
            return 'back';
        }

        // 类型标签
        var types = ['character', 'equipment', 'skill', 'pet', 'star'];
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
                    selectedEntity = null;
                    scrollY = 0;
                }
                return 'handled';
            }
        }

        // 详情面板触摸
        if (selectedEntity) {
            return handleDetailTouch(x, y, sw, sh, scale);
        }

        // 实体列表点击
        var engine = getUpgradeEngine();
        var entities = engine.getAvailableEntities(selectedType);
        var itemH = Math.floor(55 * scale);
        var padding = Math.floor(6 * scale);
        var listX = Math.floor(20 * scale);
        var listStartY = Math.floor(120 * scale);
        var listBottom = sh - Math.floor(60 * scale);

        for (var j = 0; j < entities.length; j++) {
            var iy = listStartY + j * (itemH + padding) - scrollY;
            if (iy >= listBottom || iy + itemH < listStartY) continue;
            if (x >= listX && x <= listX + (sw - Math.floor(40 * scale)) && y >= iy && y <= iy + itemH) {
                selectedEntity = entities[j];
                return 'handled';
            }
        }

        return 'handled';
    }

    function handleDetailTouch(x, y, sw, sh, scale) {
        var engine = getUpgradeEngine();
        var info = engine.getUpgradeInfo(selectedEntity.uid, selectedType);
        if (!info) { selectedEntity = null; return 'handled'; }

        var panelX = Math.floor(15 * scale);
        var panelW = sw - Math.floor(30 * scale);
        var startY = Math.floor(120 * scale);
        var config = UPGRADE_CONFIG.entities[selectedType];

        // 计算按钮位置（与渲染逻辑一致）
        var rowH = Math.floor(28 * scale);
        var y2 = startY + Math.floor(60 * scale);

        // 信息行
        var rowCount = 1;
        if (info.currentMultiplier && info.currentMultiplier > 1) rowCount++;
        y2 += rowCount * (rowH + Math.floor(4 * scale));
        y2 += Math.floor(10 * scale);

        // 材料列表区域高度
        if (!info.atMaxStar && info.materialDetails) {
            var mats = info.materialDetails;
            y2 += Math.floor(20 * scale);
            var maxShow = Math.min(mats.length, 4);
            var matItemH = Math.floor(30 * scale);
            y2 += maxShow * (matItemH + Math.floor(3 * scale));
            if (mats.length > maxShow) y2 += Math.floor(20 * scale);
            y2 += Math.floor(5 * scale);
        }

        // 升级按钮
        if (!info.atMaxLevel) {
            if (x >= panelX && x <= panelX + panelW && y >= y2 && y <= y2 + Math.floor(42 * scale)) {
                var result = engine.upgrade(selectedEntity.uid, selectedType);
                if (result.success) {
                    selectedEntity = engine.getAvailableEntities(selectedType).filter(function(e) {
                        return e.uid === selectedEntity.uid;
                    })[0] || selectedEntity;
                }
                return 'handled';
            }
            y2 += Math.floor(52 * scale);
        } else {
            y2 += Math.floor(52 * scale);
        }

        // 升星按钮
        if (!info.atMaxStar) {
            if (x >= panelX && x <= panelX + panelW && y >= y2 && y <= y2 + Math.floor(55 * scale)) {
                var result = engine.starUpgrade(selectedEntity.uid, selectedType);
                if (result.success) {
                    selectedEntity = engine.getAvailableEntities(selectedType).filter(function(e) {
                        return e.uid === selectedEntity.uid;
                    })[0] || selectedEntity;
                }
                return 'handled';
            }
            y2 += Math.floor(65 * scale);
        } else {
            y2 += Math.floor(52 * scale);
        }

        // 返回列表按钮
        var backBtnW = Math.floor(100 * scale);
        var backBtnH = Math.floor(32 * scale);
        var backBtnX = sw / 2 - backBtnW / 2;
        var backBtnY = Math.min(y2 + Math.floor(10 * scale), sh - Math.floor(80 * scale));
        if (x >= backBtnX && x <= backBtnX + backBtnW && y >= backBtnY && y <= backBtnY + backBtnH) {
            selectedEntity = null;
            return 'handled';
        }

        return 'handled';
    }

    // ==================== 工具函数 ====================
    function _formatCost(cost) {
        if (!cost) return '无';
        var parts = [];
        var names = { gold: '金币', starSource: '星源石', iceCrystal: '冰晶', fireSource: '火源', timeCrystal: '时间结晶' };
        for (var k in cost) {
            if (!cost.hasOwnProperty(k)) continue;
            parts.push((names[k] || k) + ' ' + cost[k]);
        }
        return parts.join('  ') || '无';
    }

    function _canAffordCost(playerData, cost) {
        if (!cost) return true;
        for (var k in cost) {
            if (!cost.hasOwnProperty(k)) continue;
            var matData = playerData.materials && playerData.materials[k];
            var have = matData ? (matData.quantity || 0) : (playerData[k] || 0);
            if (have < cost[k]) return false;
        }
        return true;
    }

    function handleUpgradeTouchStart(y) {
        lastTouchY = y;
        isDragging = false;
    }

    function handleUpgradeTouchMove(y) {
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

    return {
        renderUpgrade: renderUpgrade,
        handleUpgradeTouch: handleUpgradeTouch,
        handleUpgradeTouchStart: handleUpgradeTouchStart,
        handleUpgradeTouchMove: handleUpgradeTouchMove,
        getIsDragging: getIsDragging
    };
}

export { createUpgradeRenderer };
