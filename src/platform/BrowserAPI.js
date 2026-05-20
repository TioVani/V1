/**
 * BrowserAPI — 浏览器平台 API 层
 * 所有浏览器原生能力统一封装
 *
 * 设计原则：
 * - 零外部依赖，纯浏览器原生 API
 * - ES module 导出，供 game.js 和 src/systems 使用
 */

// ==================== 基础配置 ====================

var _isMocked = true;

function getCanvas() {
    return document.getElementById('game-canvas');
}

// ==================== 系统信息 ====================

export function getSystemInfoSync() {
    var canvas = getCanvas();
    var dpr = window.devicePixelRatio || 1;
    var w = canvas ? canvas.clientWidth : window.innerWidth;
    var h = canvas ? canvas.clientHeight : window.innerHeight;
    return {
        screenWidth: w,
        screenHeight: h,
        windowWidth: w,
        windowHeight: h,
        pixelRatio: dpr,
        platform: 'browser',
        system: navigator.platform || 'Unknown',
        brand: 'browser',
        model: 'browser'
    };
}

// ==================== Canvas & Image ====================

export function createCanvas() {
    return getCanvas();
}

export function createImage() {
    return new Image();
}

// ==================== Touch 事件 ====================

var _touchStartHandlers = [];
var _touchMoveHandlers = [];
var _touchEndHandlers = [];
var _hideHandlers = [];
var _showHandlers = [];

function _wrapTouch(e) {
    var result = [];
    var canvas = getCanvas();
    var rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };

    if (e.touches && e.touches.length > 0) {
        for (var i = 0; i < e.touches.length; i++) {
            result.push({
                clientX: e.touches[i].clientX - rect.left,
                clientY: e.touches[i].clientY - rect.top,
                identifier: e.touches[i].identifier || i,
                force: 1
            });
        }
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        for (var j = 0; j < e.changedTouches.length; j++) {
            result.push({
                clientX: e.changedTouches[j].clientX - rect.left,
                clientY: e.changedTouches[j].clientY - rect.top,
                identifier: e.changedTouches[j].identifier || j,
                force: 1
            });
        }
    } else {
        var clientX = e.clientX || e.pageX || 0;
        var clientY = e.clientY || e.pageY || 0;
        result.push({
            clientX: clientX - rect.left,
            clientY: clientY - rect.top,
            identifier: 0,
            force: 1
        });
    }
    return result;
}

export function onTouchStart(fn) { _touchStartHandlers.push(fn); }
export function onTouchMove(fn) { _touchMoveHandlers.push(fn); }
export function onTouchEnd(fn) { _touchEndHandlers.push(fn); }
export function onHide(fn) { _hideHandlers.push(fn); }
export function onShow(fn) { _showHandlers.push(fn); }

export function offTouchStart(fn) {
    _touchStartHandlers = _touchStartHandlers.filter(function(h) { return h !== fn; });
}
export function offTouchMove(fn) {
    _touchMoveHandlers = _touchMoveHandlers.filter(function(h) { return h !== fn; });
}
export function offTouchEnd(fn) {
    _touchEndHandlers = _touchEndHandlers.filter(function(h) { return h !== fn; });
}

// 绑定 DOM 事件
function _bindTouchEvents() {
    var canvas = getCanvas();

    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        var res = { touches: _wrapTouch(e), changedTouches: _wrapTouch(e) };
        _touchStartHandlers.forEach(function(fn) { fn(res); });
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        var res = { touches: _wrapTouch(e), changedTouches: _wrapTouch(e) };
        _touchMoveHandlers.forEach(function(fn) { fn(res); });
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
        var res = { touches: [], changedTouches: _wrapTouch(e) };
        _touchEndHandlers.forEach(function(fn) { fn(res); });
    }, { passive: false });

    // 鼠标事件作为 fallback
    canvas.addEventListener('mousedown', function(e) {
        var res = { touches: _wrapTouch(e), changedTouches: _wrapTouch(e) };
        _touchStartHandlers.forEach(function(fn) { fn(res); });
    });

    canvas.addEventListener('mousemove', function(e) {
        if (!e.buttons) return;
        var res = { touches: _wrapTouch(e), changedTouches: _wrapTouch(e) };
        _touchMoveHandlers.forEach(function(fn) { fn(res); });
    });

    canvas.addEventListener('mouseup', function(e) {
        var res = { touches: [], changedTouches: _wrapTouch(e) };
        _touchEndHandlers.forEach(function(fn) { fn(res); });
    });
}

// 页面可见性
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        _hideHandlers.forEach(function(fn) { fn(); });
    } else {
        _showHandlers.forEach(function(fn) { fn(); });
    }
});

// ==================== 存储 ====================

export function getStorageSync(key) {
    try {
        var val = localStorage.getItem('game_' + key);
        return val ? JSON.parse(val) : '';
    } catch (e) {
        return '';
    }
}

export function setStorageSync(key, val) {
    try {
        localStorage.setItem('game_' + key, JSON.stringify(val));
    } catch (e) {
        console.warn('localStorage.setItem failed:', e);
    }
}

export function removeStorageSync(key) {
    try {
        localStorage.removeItem('game_' + key);
    } catch (e) {}
}

export function setUserCloudStorage(opts) {
    if (opts && opts.data) {
        try {
            localStorage.setItem('game_cloudData', JSON.stringify(opts.data));
        } catch (e) {}
    }
    if (opts && opts.success) opts.success();
}

// ==================== Toast ====================

var _toastEl = null;
var _toastTimer = null;

export function showToast(opts) {
    if (!_toastEl) {
        _toastEl = document.createElement('div');
        _toastEl.id = 'game-toast';
        _toastEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 24px;border-radius:8px;font-size:16px;z-index:9999;pointer-events:none;transition:opacity 0.3s;white-space:nowrap;font-family:sans-serif;';
        document.body.appendChild(_toastEl);
    }
    _toastEl.textContent = (opts && opts.icon === 'success' ? '✓ ' : '') + ((opts && opts.title) || '');
    _toastEl.style.opacity = '1';
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function() {
        _toastEl.style.opacity = '0';
    }, (opts && opts.duration) || 1500);
}

// ==================== Modal ====================

export function showModal(opts) {
    var result = confirm((opts && opts.title || '') + '\n\n' + (opts && opts.content || ''));
    if (result && opts && opts.success) {
        opts.success({ confirm: true, cancel: false });
    } else if (!result && opts && opts.fail) {
        opts.fail({ confirm: false, cancel: true });
    }
}

// ==================== 振动 ====================

export function vibrateShort(opts) {
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

export function vibrateLong(opts) {
    if (navigator.vibrate) {
        navigator.vibrate(400);
    }
}

// ==================== 音频 ====================

export function createWebAudioContext() {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        return new AudioContext();
    }
    return null;
}

// ==================== 文件系统 ====================

export function getFileSystemManager() {
    return {
        readFile: function(opts) {
            if (opts && opts.fail) opts.fail({ errMsg: 'readFile:fail not supported in browser' });
        }
    };
}

export var env = {
    USER_DATA_PATH: '/browser-storage'
};

// ==================== 开放数据域 ====================

export function getOpenDataContext() {
    return {
        canvas: null,
        postMessage: function() {}
    };
}

// ==================== 广告（浏览器空壳） ====================

export function createBannerAd() {
    return { show: function() {}, hide: function() {}, destroy: function() {}, onLoad: function() {}, onError: function() {} };
}
export function createRewardedVideoAd() {
    return { show: function() {}, load: function() {}, onLoad: function() {}, onError: function() {}, onClose: function() {} };
}

// ==================== 网络请求 ====================

export function request(opts) {
    var url = opts && opts.url;
    if (!url) {
        if (opts && opts.fail) opts.fail({ errMsg: 'request:fail invalid url' });
        return;
    }
    fetch(url, {
        method: (opts && opts.method) || 'GET',
        headers: (opts && opts.header) || {},
        body: (opts && opts.data) ? JSON.stringify(opts.data) : undefined
    }).then(function(res) {
        return res.json();
    }).then(function(data) {
        if (opts && opts.success) opts.success({ data: data, statusCode: 200 });
    }).catch(function(err) {
        if (opts && opts.fail) opts.fail({ errMsg: 'request:fail ' + err.message });
    });
}

// ==================== 初始化 ====================

_bindTouchEvents();

console.log('[BrowserAPI] 浏览器平台 API 已就绪');