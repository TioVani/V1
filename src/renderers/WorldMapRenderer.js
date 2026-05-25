/**
 * WorldMapRenderer — 大世界地图渲染
 * 地图绘制、角色渲染、摄像机跟随、实体绘制
 */
function createWorldMapRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getWorldMapSystem = deps.getWorldMapSystem;
    var getAssets = deps.getAssets;
    var getJoystickState = deps.getJoystickState || function() { return { active: false, startX: 0, startY: 0, dx: 0, dy: 0 }; };

    var CAMERA_SMOOTHING = 0.1;
    var JOYSTICK_MAX_RADIUS = 60;
    var _camX = 0;
    var _camY = 0;
    var _mapScale = 1;

    // 地图专用缩放：确保地图图片覆盖整个屏幕（cover 模式）
    function _computeMapScale() {
        var wms = getWorldMapSystem();
        if (!wms) return;
        var config = wms.getConfig();
        if (!config) return;
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        _mapScale = Math.max(sw / config.width, sh / config.height);
    }
    var _dialogue = null;       // { lines: [], index: 0 }
    var _dialogueCallback = null;
    var _confirmEntity = null;  // { id, type, x, y, label }

    function showDialogue(lines, callback) {
        _dialogue = { lines: lines, index: 0 };
        _dialogueCallback = callback;
    }

    function dismissDialogue() {
        _dialogue = null;
        _dialogueCallback = null;
    }

    function isDialogueOpen() {
        return _dialogue !== null;
    }

    function advanceDialogue() {
        if (!_dialogue) return null;
        _dialogue.index++;
        if (_dialogue.index >= _dialogue.lines.length) {
            if (_dialogueCallback) _dialogueCallback();
            dismissDialogue();
            return null;
        }
        return _dialogue.lines[_dialogue.index];
    }

    function showConfirm(entity) {
        _confirmEntity = {
            id: entity.id,
            type: entity.type,
            x: entity.x,
            y: entity.y,
            label: _getInteractLabel(entity.type).replace('按 E ', '')
        };
    }

    function dismissConfirm() {
        _confirmEntity = null;
    }

    function isConfirmOpen() {
        return _confirmEntity !== null;
    }

    function getConfirmEntityId() {
        return _confirmEntity ? _confirmEntity.id : null;
    }

    function checkConfirmHit(x, y) {
        if (!_confirmEntity) return false;
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var sp = worldToScreen(_confirmEntity.x, _confirmEntity.y);
        var ir = (_confirmEntity.interactRadius || 40) * _mapScale;
        var btnW = Math.floor(80 * _mapScale);
        var btnH = Math.floor(36 * _mapScale);
        var btnX = sp.x - btnW / 2;
        var btnY = sp.y - ir - Math.floor(40 * _mapScale);
        return x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH;
    }

    function worldToScreen(wx, wy) {
        return {
            x: wx * _mapScale - _camX,
            y: wy * _mapScale - _camY
        };
    }

    function updateCamera(dt) {
        var wms = getWorldMapSystem();
        if (!wms) return;
        var config = wms.getConfig();
        if (!config) return;
        _computeMapScale();
        var pos = wms.getPlayerPos();
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var targetCamX = pos.x * _mapScale - sw / 2;
        var targetCamY = pos.y * _mapScale - sh / 2;
        _camX += (targetCamX - _camX) * CAMERA_SMOOTHING;
        _camY += (targetCamY - _camY) * CAMERA_SMOOTHING;
        // 摄像机边界夹紧：不让镜头超出地图图片范围
        var mapW = config.width * _mapScale;
        var mapH = config.height * _mapScale;
        var maxCamX = Math.max(0, mapW - sw);
        var maxCamY = Math.max(0, mapH - sh);
        _camX = Math.max(0, Math.min(_camX, maxCamX));
        _camY = Math.max(0, Math.min(_camY, maxCamY));
    }

    function renderWorldMap() {
        var ctx = getCtx();
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var wms = getWorldMapSystem();
        if (!wms) return;
        _computeMapScale();
        var scale = _mapScale;

        ctx.save();

        // 背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, sw, sh);
        var config = wms.getConfig();
        var bgImg = null;
        var assets = getAssets();
        if (config) {
            var assetKey = 'worldMapBg' + config.worldId.replace('world_', '');
            var assetVal = assets[assetKey];
            if (assetVal) bgImg = assetVal;
        }
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            ctx.drawImage(bgImg, -_camX, -_camY, config.width * scale, config.height * scale);
        }

        // 地图区域
        var entities = wms.getDiscoveredEntities();
        var nearby = wms.getNearbyEntity();

        // 绘制网格参考线
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        var gridSize = 100 * scale;
        for (var gx = -(_camX % gridSize); gx < sw; gx += gridSize) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, sh);
            ctx.stroke();
        }
        for (var gy = -(_camY % gridSize); gy < sh; gy += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(sw, gy);
            ctx.stroke();
        }

        // 绘制实体
        for (var i = 0; i < entities.length; i++) {
            var e = entities[i];
            if (wms.isEntityResolved(e.id) && e.once) continue;
            var sp = worldToScreen(e.x, e.y);
            var ir = (e.interactRadius || 40) * scale;
            var isNearby = nearby && nearby.id === e.id;

            ctx.save();
            ctx.globalAlpha = isNearby ? 1 : 0.7;

            if (e.type === 'tutorial') {
                ctx.fillStyle = '#ff6b35';
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, ir, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', sp.x, sp.y);
            } else if (e.type === 'chest') {
                var resolved = wms.isEntityResolved(e.id);
                ctx.fillStyle = resolved ? '#555' : '#f0c040';
                ctx.fillRect(sp.x - ir / 2, sp.y - ir / 2, ir, ir);
                if (!resolved) {
                    ctx.fillStyle = '#fff';
                    ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('箱', sp.x, sp.y);
                }
            } else if (e.type === 'enemy') {
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, ir * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('敌', sp.x, sp.y);
            } else if (e.type === 'tower') {
                ctx.fillStyle = '#9b59b6';
                ctx.fillRect(sp.x - ir / 2, sp.y - ir, ir, ir * 2);
                ctx.fillStyle = '#fff';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('塔', sp.x, sp.y);
            } else if (e.type === 'portal') {
                ctx.strokeStyle = '#3498db';
                ctx.lineWidth = Math.floor(3 * scale);
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, ir, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = 'rgba(52,152,219,0.2)';
                ctx.fill();
                ctx.fillStyle = '#3498db';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('门', sp.x, sp.y);
            } else if (e.type === 'npc') {
                ctx.fillStyle = '#2ecc71';
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, ir * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('灵', sp.x, sp.y);
            } else if (e.type === 'barrier') {
                var bResolved = wms.isEntityResolved(e.id);
                if (!bResolved) {
                    ctx.fillStyle = 'rgba(192,57,43,0.4)';
                    ctx.fillRect(sp.x - ir * 2, sp.y - ir * 3, ir * 4, ir * 6);
                    ctx.fillStyle = '#c0392b';
                    ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('障', sp.x, sp.y);
                }
            }

            // 交互提示
            if (isNearby && !wms.isEntityResolved(e.id)) {
                ctx.fillStyle = '#e8d5a3';
                ctx.font = Math.floor(11 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                var label = _getInteractLabel(e.type);
                ctx.fillText(label, sp.x, sp.y - ir - Math.floor(10 * scale));
            }

            ctx.restore();
        }

        // 确认交互按钮
        if (_confirmEntity) {
            var ce = null;
            var centities = wms.getDiscoveredEntities();
            for (var ci = 0; ci < centities.length; ci++) {
                if (centities[ci].id === _confirmEntity.id) { ce = centities[ci]; break; }
            }
            if (ce) {
                var csp = worldToScreen(ce.x, ce.y);
                var cir = (ce.interactRadius || 40) * scale;
                var cbtnW = Math.floor(80 * scale);
                var cbtnH = Math.floor(36 * scale);
                var cbtnX = csp.x - cbtnW / 2;
                var cbtnY = csp.y - cir - Math.floor(40 * scale);

                ctx.fillStyle = 'rgba(232,213,163,0.9)';
                ctx.strokeStyle = '#e8d5a3';
                ctx.lineWidth = Math.floor(1.5 * scale);
                var cr = Math.floor(6 * scale);
                ctx.beginPath();
                ctx.moveTo(cbtnX + cr, cbtnY);
                ctx.lineTo(cbtnX + cbtnW - cr, cbtnY);
                ctx.arcTo(cbtnX + cbtnW, cbtnY, cbtnX + cbtnW, cbtnY + cr, cr);
                ctx.lineTo(cbtnX + cbtnW, cbtnY + cbtnH - cr);
                ctx.arcTo(cbtnX + cbtnW, cbtnY + cbtnH, cbtnX + cbtnW - cr, cbtnY + cbtnH, cr);
                ctx.lineTo(cbtnX + cr, cbtnY + cbtnH);
                ctx.arcTo(cbtnX, cbtnY + cbtnH, cbtnX, cbtnY + cbtnH - cr, cr);
                ctx.lineTo(cbtnX, cbtnY + cr);
                ctx.arcTo(cbtnX, cbtnY, cbtnX + cr, cbtnY, cr);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#1a1a2e';
                ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(_confirmEntity.label, cbtnX + cbtnW / 2, cbtnY + cbtnH / 2);
            }
        }

        // 绘制玩家角色
        var pos = wms.getPlayerPos();
        var psp = worldToScreen(pos.x, pos.y);
        var playerR = Math.floor(12 * scale);
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(psp.x, psp.y, playerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = Math.floor(2 * scale);
        ctx.stroke();

        // 探索度 HUD
        var exp = wms.getExplorationPercent();
        var hudSize = Math.floor(12 * scale);
        ctx.font = hudSize + 'px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('探索度 ' + Math.floor(exp * 100) + '%', sw - Math.floor(15 * scale), Math.floor(15 * scale));

        // 世界名称
        var worldId = wms.getWorldId();
        var worldName = config ? config.name : worldId;
        ctx.textAlign = 'left';
        ctx.fillText(worldName, Math.floor(15 * scale), Math.floor(15 * scale));

        // NPC 对话框
        if (_dialogue && _dialogue.lines.length > 0) {
            var dlgW = sw - Math.floor(40 * scale);
            var dlgH = Math.floor(120 * scale);
            var dlgX = (sw - dlgW) / 2;
            var dlgY = sh - dlgH - Math.floor(20 * scale);

            ctx.fillStyle = 'rgba(10,10,21,0.9)';
            ctx.strokeStyle = '#e8d5a3';
            ctx.lineWidth = Math.floor(1.5 * scale);
            var dr = Math.floor(8 * scale);
            ctx.beginPath();
            ctx.moveTo(dlgX + dr, dlgY);
            ctx.lineTo(dlgX + dlgW - dr, dlgY);
            ctx.arcTo(dlgX + dlgW, dlgY, dlgX + dlgW, dlgY + dr, dr);
            ctx.lineTo(dlgX + dlgW, dlgY + dlgH - dr);
            ctx.arcTo(dlgX + dlgW, dlgY + dlgH, dlgX + dlgW - dr, dlgY + dlgH, dr);
            ctx.lineTo(dlgX + dr, dlgY + dlgH);
            ctx.arcTo(dlgX, dlgY + dlgH, dlgX, dlgY + dlgH - dr, dr);
            ctx.lineTo(dlgX, dlgY + dr);
            ctx.arcTo(dlgX, dlgY, dlgX + dr, dlgY, dr);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            var lineIdx = Math.min(_dialogue.index, _dialogue.lines.length - 1);
            var line = _dialogue.lines[lineIdx];
            var lineText = typeof line === 'object' ? line.text : line;
            var dlgFontSize = Math.floor(15 * scale);
            ctx.font = dlgFontSize + 'px sans-serif';
            ctx.fillStyle = '#e8d5a3';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(lineText, dlgX + Math.floor(20 * scale), dlgY + Math.floor(20 * scale), dlgW - Math.floor(40 * scale));

            // 继续提示
            var hintSize = Math.floor(11 * scale);
            ctx.font = hintSize + 'px sans-serif';
            ctx.fillStyle = 'rgba(232,213,163,0.5)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText('点击继续', dlgX + dlgW - Math.floor(15 * scale), dlgY + dlgH - Math.floor(10 * scale));
        }

        // 虚拟摇杆
        var js = getJoystickState();
        if (js.active) {
            var jsBaseX = js.startX;
            var jsBaseY = js.startY;
            var jsBaseR = Math.floor(50 * scale);
            var jsThumbR = Math.floor(22 * scale);

            // 摇杆底座
            ctx.beginPath();
            ctx.arc(jsBaseX, jsBaseY, jsBaseR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = Math.floor(2 * scale);
            ctx.stroke();

            // 拇指位置（钳制在最大半径内）
            var jLen = Math.sqrt(js.dx * js.dx + js.dy * js.dy);
            var jNorm = Math.min(jLen, JOYSTICK_MAX_RADIUS * scale);
            var jtx = jsBaseX;
            var jty = jsBaseY;
            if (jLen > 0) {
                jtx = jsBaseX + (js.dx / jLen) * jNorm;
                jty = jsBaseY + (js.dy / jLen) * jNorm;
            }
            ctx.beginPath();
            ctx.arc(jtx, jty, jsThumbR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(52,152,219,0.5)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(52,152,219,0.8)';
            ctx.lineWidth = Math.floor(2 * scale);
            ctx.stroke();
        }

        ctx.restore();
    }

    function _getInteractLabel(type) {
        var labels = {
            tutorial: '按 E 介入',
            chest: '按 E 开启',
            enemy: '按 E 挑战',
            tower: '按 E 进入',
            portal: '按 E 传送',
            npc: '按 E 对话',
            barrier: '按 E 查看'
        };
        return labels[type] || '按 E 交互';
    }

    function getCameraState() {
        return { camX: _camX, camY: _camY, scale: _mapScale };
    }

    return {
        updateCamera: updateCamera,
        renderWorldMap: renderWorldMap,
        worldToScreen: worldToScreen,
        getCameraState: getCameraState,
        showDialogue: showDialogue,
        dismissDialogue: dismissDialogue,
        isDialogueOpen: isDialogueOpen,
        advanceDialogue: advanceDialogue,
        showConfirm: showConfirm,
        dismissConfirm: dismissConfirm,
        isConfirmOpen: isConfirmOpen,
        getConfirmEntityId: getConfirmEntityId,
        checkConfirmHit: checkConfirmHit
    };
}

export { createWorldMapRenderer };
