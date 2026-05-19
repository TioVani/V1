/**
 * UIEditorSystem — 游戏内可视化UI编辑器
 *
 * 功能：虚线高亮可选元素、拖拽移动、工具栏(Save/Reset/ResetAll/Close)
 * 仅在 isActive() 时渲染和拦截触摸，否则零开销
 */
function createUIEditorSystem(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getGameState = deps.getGameState;
    var getFillRoundRect = deps.getFillRoundRect;
    var uiConfig = deps.uiConfig;
    var showToast = deps.showToast;

    var _active = false;
    var _selectedIndex = -1;
    var _selectedId = null;
    var _isDragging = false;
    var _dragStartX = 0;
    var _dragStartY = 0;
    var _dragStartDx = 0;
    var _dragStartDy = 0;

    // 浮动工具栏状态
    var TOOLBAR_H = 44;
    var TOOLBAR_INFO_H = 22;
    var _toolbarX = -1; // -1 表示未初始化
    var _toolbarY = -1;
    var _isDraggingToolbar = false;
    var _toolbarDragOffX = 0;
    var _toolbarDragOffY = 0;

    var toolbarButtons = [
        { id: 'save', label: 'Save', color: '#4CAF50' },
        { id: 'export', label: 'Export', color: '#2196F3' },
        { id: 'reset', label: 'Reset', color: '#FF9800' },
        { id: 'reset_all', label: 'ResetAll', color: '#f44336' },
        { id: 'close', label: 'Close', color: '#9E9E9E' }
    ];

    function isActive() {
        return _active;
    }

    function toggle() {
        _active = !_active;
        _selectedIndex = -1;
        _selectedId = null;
        _isDragging = false;
    }

    // 获取所有注册元素（编辑器不按状态过滤，方便跨状态编辑）
    function getAllElements() {
        return uiConfig.getAllElements();
    }

    // 获取元素的实际绘制矩形（含override）
    function getElementRect(el) {
        var pos = el.getPosition();
        var ov = uiConfig.get(el.id);
        var scale = getScreenScale();
        return {
            x: pos.x + ov.dx * scale,
            y: pos.y + ov.dy * scale,
            width: pos.width,
            height: pos.height
        };
    }

    // ===== 渲染 =====

    function render() {
        if (!_active) return;
        var ctx = getCtx();
        var screenW = getScreenWidth();
        var screenH = getScreenHeight();
        var scale = getScreenScale();

        var elements = getAllElements();

        // 绘制所有元素的虚线边框
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            var rect = getElementRect(el);
            var isSelected = (i === _selectedIndex);

            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = isSelected ? '#FFD700' : 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(rect.x - 2, rect.y - 2, rect.width + 4, rect.height + 4);
            ctx.setLineDash([]);

            // 标签
            if (rect.y > 18) {
                var labelSize = Math.max(9, Math.floor(10 * scale));
                ctx.font = labelSize + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                var labelW = ctx.measureText(el.label).width + 6;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(rect.x - 2, rect.y - 2 - labelSize - 4, labelW, labelSize + 4);
                ctx.fillStyle = isSelected ? '#FFD700' : '#ffffff';
                ctx.fillText(el.label, rect.x + 1, rect.y - 4);
            }

            // 选中时画角标
            if (isSelected) {
                var handleSize = 6;
                var corners = [
                    [rect.x - 2, rect.y - 2],
                    [rect.x + rect.width + 2 - handleSize, rect.y - 2],
                    [rect.x - 2, rect.y + rect.height + 2 - handleSize],
                    [rect.x + rect.width + 2 - handleSize, rect.y + rect.height + 2 - handleSize]
                ];
                ctx.fillStyle = '#FFD700';
                for (var ci = 0; ci < corners.length; ci++) {
                    ctx.fillRect(corners[ci][0], corners[ci][1], handleSize, handleSize);
                }
            }
            ctx.restore();
        }

        // 绘制浮动工具栏
        if (_toolbarX < 0) {
            _toolbarX = 10;
            _toolbarY = screenH - TOOLBAR_H - TOOLBAR_INFO_H - 10;
        }
        var tbX = _toolbarX;
        var tbY = _toolbarY;
        var tbTotalH = TOOLBAR_INFO_H + TOOLBAR_H;

        ctx.save();
        // 圆角背景
        var tbW = Math.min(screenW - 20, 280);
        ctx.fillStyle = 'rgba(30, 30, 50, 0.92)';
        var fillRoundRect = getFillRoundRect();
        fillRoundRect(ctx, tbX, tbY, tbW, tbTotalH, 8);

        // 信息栏（可拖拽把手）
        var infoText = _selectedId ? ('[' + _selectedId + '] dx=' + uiConfig.get(_selectedId).dx + ' dy=' + uiConfig.get(_selectedId).dy) : '拖拽此处移动 | 点击元素选择';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = Math.floor(9 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('UI Editor | ' + infoText, tbX + 6, tbY + TOOLBAR_INFO_H / 2);

        // 拖拽指示器（右侧三条横线）
        var gripX = tbX + tbW - 20;
        var gripY = tbY + TOOLBAR_INFO_H / 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        for (var gi = -1; gi <= 1; gi++) {
            ctx.beginPath();
            ctx.moveTo(gripX, gripY + gi * 4);
            ctx.lineTo(gripX + 12, gripY + gi * 4);
            ctx.stroke();
        }

        // 按钮行
        var btnRowY = tbY + TOOLBAR_INFO_H;
        var btnW = Math.floor((tbW - 10) / toolbarButtons.length);
        var btnH = 28;
        var btnY2 = btnRowY + (TOOLBAR_H - btnH) / 2;

        for (var bi = 0; bi < toolbarButtons.length; bi++) {
            var btn = toolbarButtons[bi];
            var btnX = tbX + 5 + bi * btnW;
            ctx.fillStyle = btn.color;
            fillRoundRect(ctx, btnX, btnY2, btnW - 4, btnH, 4);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.floor(11 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.label, btnX + (btnW - 4) / 2, btnY2 + btnH / 2);
        }

        ctx.restore();
    }

    // ===== 触摸处理 =====

    function handleTouchStart(x, y) {
        if (!_active) return false;

        var screenH = getScreenHeight();
        var screenW = getScreenWidth();

        // 0. 初始化工具栏位置
        if (_toolbarX < 0) {
            _toolbarX = 10;
            _toolbarY = screenH - TOOLBAR_H - TOOLBAR_INFO_H - 10;
        }

        var tbW = Math.min(screenW - 20, 280);
        var tbTotalH = TOOLBAR_INFO_H + TOOLBAR_H;

        // 1. 浮动工具栏区域检测
        if (x >= _toolbarX && x <= _toolbarX + tbW &&
            y >= _toolbarY && y <= _toolbarY + tbTotalH) {

            // 信息栏区域 → 拖拽移动工具栏
            if (y < _toolbarY + TOOLBAR_INFO_H) {
                _isDraggingToolbar = true;
                _toolbarDragOffX = x - _toolbarX;
                _toolbarDragOffY = y - _toolbarY;
                return true;
            }

            // 按钮区域 → 检测按钮
            var btnW = Math.floor((tbW - 10) / toolbarButtons.length);
            var btnRowY = _toolbarY + TOOLBAR_INFO_H;
            var btnH = 28;
            var btnY2 = btnRowY + (TOOLBAR_H - btnH) / 2;
            for (var bi = 0; bi < toolbarButtons.length; bi++) {
                var btnX = _toolbarX + 5 + bi * btnW;
                if (x >= btnX && x <= btnX + btnW - 4 && y >= btnY2 && y <= btnY2 + btnH) {
                    handleToolbarButton(toolbarButtons[bi].id);
                    return true;
                }
            }
            return true; // 工具栏区域消费触摸
        }

        // 2. 元素命中检测（后注册的在上层，倒序检测）
        var elements = getAllElements();
        for (var i = elements.length - 1; i >= 0; i--) {
            var rect = getElementRect(elements[i]);
            if (x >= rect.x - 4 && x <= rect.x + rect.width + 4 &&
                y >= rect.y - 4 && y <= rect.y + rect.height + 4) {
                _selectedIndex = i;
                _selectedId = elements[i].id;
                _isDragging = true;
                _dragStartX = x;
                _dragStartY = y;
                var ov = uiConfig.get(elements[i].id);
                _dragStartDx = ov.dx;
                _dragStartDy = ov.dy;
                return true;
            }
        }

        // 3. 点空白取消选择
        _selectedIndex = -1;
        _selectedId = null;
        return true;
    }

    function handleTouchMove(x, y) {
        if (!_active) return false;

        // 工具栏拖拽
        if (_isDraggingToolbar) {
            var screenW = getScreenWidth();
            var screenH = getScreenHeight();
            var tbW = Math.min(screenW - 20, 280);
            _toolbarX = Math.max(0, Math.min(screenW - tbW, x - _toolbarDragOffX));
            _toolbarY = Math.max(0, Math.min(screenH - TOOLBAR_INFO_H - TOOLBAR_H, y - _toolbarDragOffY));
            return true;
        }

        if (!_isDragging || !_selectedId) return false;

        var scale = getScreenScale();
        if (scale === 0) scale = 1;
        var deltaX = (x - _dragStartX) / scale;
        var deltaY = (y - _dragStartY) / scale;

        var rawDx = _dragStartDx + deltaX;
        var rawDy = _dragStartDy + deltaY;

        uiConfig.set(_selectedId, rawDx, rawDy);
        return true;
    }

    function handleTouchEnd() {
        if (!_active) return false;
        _isDraggingToolbar = false;
        _isDragging = false;
        return _selectedId !== null;
    }

    function handleToolbarButton(btnId) {
        if (btnId === 'save') {
            uiConfig.save();
            showToast({ title: 'UI布局已保存', icon: 'success', duration: 1500 });
        } else if (btnId === 'export') {
            var json = uiConfig.exportDefaults();
            try {
                wx.request({
                    url: 'http://localhost:9527/ui-sync',
                    method: 'POST',
                    data: json,
                    success: function(res) {
                        if (res.data && res.data.ok) {
                            showToast({ title: '已写入代码，自动生效', icon: 'success', duration: 2000 });
                        } else {
                            showToast({ title: '同步失败', icon: 'none', duration: 2000 });
                        }
                    },
                    fail: function() {
                        console.log('UI Export:', json);
                        showToast({ title: '同步失败，请确认服务已启动', icon: 'none', duration: 2000 });
                    }
                });
            } catch (e) {
                showToast({ title: '同步失败', icon: 'none', duration: 2000 });
            }
        } else if (btnId === 'reset') {
            if (_selectedId) {
                uiConfig.reset(_selectedId);
                showToast({ title: '已重置: ' + _selectedId, icon: 'none', duration: 1000 });
            }
        } else if (btnId === 'reset_all') {
            uiConfig.resetAll();
            showToast({ title: '全部重置', icon: 'none', duration: 1000 });
        } else if (btnId === 'close') {
            _active = false;
            _selectedIndex = -1;
            _selectedId = null;
            _isDragging = false;
        }
    }

    return {
        isActive: isActive,
        toggle: toggle,
        render: render,
        handleTouchStart: handleTouchStart,
        handleTouchMove: handleTouchMove,
        handleTouchEnd: handleTouchEnd
    };
}

export { createUIEditorSystem };
