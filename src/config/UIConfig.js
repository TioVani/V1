/**
 * UIConfig — UI元素位置注册/覆盖/持久化
 *
 * 核心设计：存储未缩放的偏移量(dx, dy)，渲染器照常计算响应式位置后加delta
 * 最终位置 = 原始位置 + override.dx * scale + override.dy * scale
 *
 * 优先级：localStorage覆盖 > DEFAULT_OVERRIDES(代码) > {dx:0, dy:0}
 */

// 代码内置默认值（编辑器 Export 生成，所有设备生效）
var DEFAULT_OVERRIDES = {
  "menu_debug_icon": {
    "dx": -304,
    "dy": 104
  },
  "menu_btn": {
    "dx": 17,
    "dy": 5
  }
};

function createUIConfig(deps) {
    var _registry = {};
    var _overrides = {};
    var _loaded = false;

    var storageSet = deps.storageSet;
    var storageGet = deps.storageGet;

    function register(def) {
        _registry[def.id] = def;
    }

    function get(id) {
        if (_overrides[id]) {
            return _overrides[id];
        }
        if (DEFAULT_OVERRIDES[id]) {
            return DEFAULT_OVERRIDES[id];
        }
        return { dx: 0, dy: 0 };
    }

    function set(id, dx, dy) {
        _overrides[id] = { dx: dx, dy: dy };
    }

    function load() {
        if (_loaded) return;
        _loaded = true;
        try {
            var raw = storageGet('ui_layout_overrides');
            if (!raw) return;
            var data = (typeof raw === 'string') ? JSON.parse(raw) : raw;
            if (data && data.version === 1 && data.elements) {
                var keys = Object.keys(data.elements);
                for (var i = 0; i < keys.length; i++) {
                    var e = data.elements[keys[i]];
                    _overrides[keys[i]] = { dx: e.dx || 0, dy: e.dy || 0 };
                }
            }
        } catch (ex) {
            // 静默失败，使用默认值
        }
    }

    function save() {
        var data = { version: 1, elements: {} };
        var keys = Object.keys(_overrides);
        for (var i = 0; i < keys.length; i++) {
            var o = _overrides[keys[i]];
            if (Math.abs(o.dx) > 0.5 || Math.abs(o.dy) > 0.5) {
                data.elements[keys[i]] = { dx: Math.round(o.dx), dy: Math.round(o.dy) };
            }
        }
        storageSet('ui_layout_overrides', JSON.stringify(data));
    }

    // 导出当前所有覆盖为JSON字符串（用于粘贴到 DEFAULT_OVERRIDES）
    function exportDefaults() {
        var result = {};
        // 合并 DEFAULT_OVERRIDES 和 _overrides
        var defKeys = Object.keys(DEFAULT_OVERRIDES);
        for (var i = 0; i < defKeys.length; i++) {
            result[defKeys[i]] = DEFAULT_OVERRIDES[defKeys[i]];
        }
        var ovKeys = Object.keys(_overrides);
        for (var j = 0; j < ovKeys.length; j++) {
            var o = _overrides[ovKeys[j]];
            if (Math.abs(o.dx) > 0.5 || Math.abs(o.dy) > 0.5) {
                result[ovKeys[j]] = { dx: Math.round(o.dx), dy: Math.round(o.dy) };
            } else {
                delete result[ovKeys[j]];
            }
        }
        return JSON.stringify(result, null, 2);
    }

    function getElementsForState(gameState) {
        var result = [];
        var keys = Object.keys(_registry);
        for (var i = 0; i < keys.length; i++) {
            var el = _registry[keys[i]];
            if (el.state === gameState) {
                result.push(el);
            }
        }
        return result;
    }

    function getAllElements() {
        var result = [];
        var keys = Object.keys(_registry);
        for (var i = 0; i < keys.length; i++) {
            result.push(_registry[keys[i]]);
        }
        return result;
    }

    function reset(id) {
        delete _overrides[id];
    }

    function resetAll() {
        _overrides = {};
    }

    return {
        register: register,
        get: get,
        set: set,
        load: load,
        save: save,
        exportDefaults: exportDefaults,
        getElementsForState: getElementsForState,
        getAllElements: getAllElements,
        reset: reset,
        resetAll: resetAll
    };
}

export { createUIConfig };
