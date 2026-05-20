/**
 * mock-platform.js — 游戏 API mock
 * 在 require('../game.js') 之前加载，注入 global.__platform 和其他环境变量
 */

// ============================================================
// Draw Command Capture（截图替代方案）
// ============================================================
var _captureMode = false;   // 是否记录绘制命令
var _drawCommands = [];     // 帧内记录的命令
var _currentStyles = {};    // 当前样式状态

/**
 * 开启/关闭绘制命令捕获
 */
function setCaptureMode(on) {
    _captureMode = !!on;
}

/**
 * 获取本帧的绘制命令，并清空
 */
function getDrawCommands() {
    var cmds = _drawCommands.slice();
    _drawCommands.length = 0;
    return cmds;
}

/**
 * 获取绘制命令的结构化摘要（文字、形状、图像）
 */
function getDrawSummary() {
    var texts = [];
    var shapes = [];
    var images = [];
    for (var i = 0; i < _drawCommands.length; i++) {
        var c = _drawCommands[i];
        if (c.type === 'fillText' || c.type === 'strokeText') {
            texts.push({ text: c.args[0], x: c.args[1], y: c.args[2], color: c.styles.fillStyle });
        } else if (c.type === 'fillRect' || c.type === 'strokeRect' || c.type === 'clearRect') {
            shapes.push({ type: c.type, x: c.args[0], y: c.args[1], w: c.args[2], h: c.args[3], color: c.styles.fillStyle });
        } else if (c.type === 'drawImage') {
            images.push({ x: c.args[1], y: c.args[2], w: c.args[3], h: c.args[4] });
        }
    }
    _drawCommands.length = 0;
    return { texts: texts, shapes: shapes, images: images };
}

/**
 * 清空绘制命令
 */
function clearDrawCommands() {
    _drawCommands.length = 0;
}

// ============================================================
// Canvas 2D Context — no-op，可选记录绘制命令
// ============================================================
function createNoopCtx() {
    var noop = function() { return ctx; };

    function recordCmd(type, args) {
        if (!_captureMode) return;
        _drawCommands.push({
            type: type,
            args: Array.prototype.slice.call(args),
            styles: {
                fillStyle: _currentStyles.fillStyle,
                strokeStyle: _currentStyles.strokeStyle,
                font: _currentStyles.font,
                globalAlpha: _currentStyles.globalAlpha
            }
        });
    }

    var ctx = {
        fillRect: function() { recordCmd('fillRect', arguments); return ctx; },
        strokeRect: function() { recordCmd('strokeRect', arguments); return ctx; },
        clearRect: function() { recordCmd('clearRect', arguments); return ctx; },
        fillText: function() { recordCmd('fillText', arguments); return ctx; },
        strokeText: function() { recordCmd('strokeText', arguments); return ctx; },
        measureText: function() { return { width: 10 }; },
        drawImage: function() { recordCmd('drawImage', arguments); return ctx; },
        beginPath: noop,
        closePath: noop,
        moveTo: noop,
        lineTo: noop,
        arc: noop,
        arcTo: noop,
        quadraticCurveTo: noop,
        bezierCurveTo: noop,
        rect: noop,
        fill: noop,
        stroke: noop,
        clip: noop,
        save: noop,
        restore: noop,
        translate: noop,
        rotate: noop,
        scale: noop,
        setTransform: noop,
        resetTransform: noop,
        createLinearGradient: function() { return { addColorStop: function() {} }; },
        createRadialGradient: function() { return { addColorStop: function() {} }; },
        createPattern: function() { return {}; },
        set fillStyle(v) { _currentStyles.fillStyle = v; },
        get fillStyle() { return _currentStyles.fillStyle || '#000'; },
        set strokeStyle(v) { _currentStyles.strokeStyle = v; },
        get strokeStyle() { return _currentStyles.strokeStyle || '#000'; },
        set font(v) { _currentStyles.font = v; },
        get font() { return _currentStyles.font || '10px sans-serif'; },
        set textAlign(v) {},
        get textAlign() { return 'left'; },
        set textBaseline(v) {},
        get textBaseline() { return 'alphabetic'; },
        set globalAlpha(v) { _currentStyles.globalAlpha = v; },
        get globalAlpha() { return _currentStyles.globalAlpha != null ? _currentStyles.globalAlpha : 1; },
        set globalCompositeOperation(v) {},
        get globalCompositeOperation() { return 'source-over'; },
        set lineWidth(v) {},
        get lineWidth() { return 1; },
        set lineCap(v) {},
        get lineCap() { return 'butt'; },
        set shadowColor(v) {},
        get shadowColor() { return 'rgba(0,0,0,0)'; },
        set shadowBlur(v) {},
        get shadowBlur() { return 0; },
        set shadowOffsetX(v) {},
        get shadowOffsetX() { return 0; },
        set shadowOffsetY(v) {},
        get shadowOffsetY() { return 0; },
        canvas: null
    };
    return ctx;
}

// ============================================================
// Mock Canvas
// ============================================================
function createMockCanvas() {
    var c = {
        width: 375,
        height: 667,
        _ctx: createNoopCtx()
    };
    c.getContext = function(type) {
        if (type === '2d') {
            c._ctx.canvas = c;
            return c._ctx;
        }
        return null;
    };
    return c;
}

// ============================================================
// Mock Image — src 赋值后自动触发 onload
// ============================================================
function createMockImage() {
    var img = {
        src: '',
        width: 100,
        height: 100,
        onload: null,
        onerror: null,
        _loaded: false
    };
    Object.defineProperty(img, 'src', {
        set: function(v) {
            this._src = v;
            if (v && this.onload) {
                var self = this;
                self._loaded = true;
                setTimeout(function() { if (self.onload) self.onload(); }, 0);
            }
        },
        get: function() { return this._src || ''; }
    });
    return img;
}

// ============================================================
// Touch 事件管理
// ============================================================
var _touchCallbacks = {
    touchStart: [],
    touchMove: [],
    touchEnd: []
};

// ============================================================
// RAF (requestAnimationFrame) 队列
// ============================================================
var _rafIdCounter = 0;
var _rafQueue = [];

// ============================================================
// Lifecycle callbacks
// ============================================================
var _onHideCallbacks = [];
var _onShowCallbacks = [];

// ============================================================
// Storage
// ============================================================
var _storage = {};

// ============================================================
// Log 捕获
// ============================================================
var _capturedLogs = [];
var _origConsoleLog = console.log;
var _origConsoleWarn = console.warn;
var _origConsoleError = console.error;

function captureLog(level, args) {
    _capturedLogs.push({
        time: Date.now(),
        level: level,
        msg: Array.prototype.slice.call(args).join(' ')
    });
}

// ============================================================
// 构建 global.__platform
// ============================================================
function install() {
    // 捕获日志
    console.log = function() {
        captureLog('info', arguments);
        _origConsoleLog.apply(console, arguments);
    };
    console.warn = function() {
        captureLog('warn', arguments);
        _origConsoleWarn.apply(console, arguments);
    };
    console.error = function() {
        captureLog('error', arguments);
        _origConsoleError.apply(console, arguments);
    };

    // requestAnimationFrame / cancelAnimationFrame
    global.requestAnimationFrame = function(cb) {
        var id = ++_rafIdCounter;
        _rafQueue.push({ id: id, cb: cb });
        return id;
    };
    global.cancelAnimationFrame = function(id) {
        for (var i = _rafQueue.length - 1; i >= 0; i--) {
            if (_rafQueue[i].id === id) {
                _rafQueue.splice(i, 1);
                break;
            }
        }
    };

    // 平台 API mock
    global.__platform = {
        createCanvas: function() {
            return createMockCanvas();
        },
        getSystemInfoSync: function() {
            return {
                windowWidth: 375,
                windowHeight: 667,
                pixelRatio: 2,
                screenWidth: 375,
                screenHeight: 667,
                platform: 'devtools'
            };
        },
        createImage: function() {
            return createMockImage();
        },

        // Touch events
        onTouchStart: function(cb) { _touchCallbacks.touchStart.push(cb); },
        onTouchMove: function(cb) { _touchCallbacks.touchMove.push(cb); },
        onTouchEnd: function(cb) { _touchCallbacks.touchEnd.push(cb); },

        // Storage
        getStorageSync: function(key) {
            return _storage.hasOwnProperty(key) ? _storage[key] : '';
        },
        setStorageSync: function(key, val) {
            _storage[key] = val;
        },

        // UI feedback
        showToast: function() {},
        showModal: function(opts) {
            if (opts && opts.success) opts.success({ confirm: true });
        },
        hideToast: function() {},

        // Vibration
        vibrateShort: function() {},
        vibrateLong: function() {},

        // Lifecycle
        onHide: function(cb) { _onHideCallbacks.push(cb); },
        onShow: function(cb) { _onShowCallbacks.push(cb); },

        // Open Data Context
        getOpenDataContext: function() {
            return { postMessage: function() {} };
        },

        // Cloud Storage（排行榜上传）
        setUserCloudStorage: function(opts) {
            if (opts && opts.success) opts.success();
        },
        getUserCloudStorage: function(opts) {
            if (opts && opts.success) opts.success({ data: [] });
        },

        // Ads
        createRewardedVideoAd: function() {
            return {
                show: function() { return Promise.resolve(); },
                onLoad: function() {},
                onError: function() {},
                onClose: function(cb) { if (cb) cb({ isEnded: true }); }
            };
        },
        createBannerAd: function() {
            return {
                show: function() {},
                hide: function() {},
                destroy: function() {},
                onError: function() {},
                onLoad: function() {},
                style: {}
            };
        }
    };

    // __sim 全局收集器（GameSimulator 使用）
    global.__sim = {
        _touchCallbacks: _touchCallbacks,
        _rafQueue: _rafQueue,
        _storage: _storage,
        _capturedLogs: _capturedLogs
    };
}

// ============================================================
// 对外接口（供 GameSimulator 使用）
// ============================================================

/**
 * 消费所有排队的 RAF 帧
 * @param {number} n - 消费帧数
 */
function tickRAF(n) {
    for (var i = 0; i < n; i++) {
        if (_rafQueue.length === 0) break;
        var frame = _rafQueue.shift();
        frame.cb();
    }
}

/**
 * 触发 touch 事件
 */
function fireTouch(type, x, y, opts) {
    opts = opts || {};
    var touch = {
        clientX: x,
        clientY: y,
        identifier: opts.identifier || 0,
        timeStamp: Date.now()
    };
    var event = {
        touches: [touch],
        changedTouches: [touch],
        timeStamp: Date.now()
    };
    var cbs = _touchCallbacks[type] || [];
    for (var i = 0; i < cbs.length; i++) {
        cbs[i](event);
    }
}

/**
 * 获取捕获的日志
 */
function getLogs() {
    return _capturedLogs.slice();
}

/**
 * 清空日志
 */
function clearLogs() {
    _capturedLogs.length = 0;
}

/**
 * 设置存储数据（在 require game.js 之前调用）
 */
function setStorage(key, val) {
    _storage[key] = val;
}

/**
 * 重置所有状态
 */
function reset() {
    _touchCallbacks.touchStart.length = 0;
    _touchCallbacks.touchMove.length = 0;
    _touchCallbacks.touchEnd.length = 0;
    _rafQueue.length = 0;
    _rafIdCounter = 0;
    _capturedLogs.length = 0;
    _onHideCallbacks.length = 0;
    _onShowCallbacks.length = 0;
}

module.exports = {
    install: install,
    tickRAF: tickRAF,
    fireTouch: fireTouch,
    getLogs: getLogs,
    clearLogs: clearLogs,
    setStorage: setStorage,
    reset: reset,
    createMockCanvas: createMockCanvas,
    createNoopCtx: createNoopCtx,
    setCaptureMode: setCaptureMode,
    getDrawCommands: getDrawCommands,
    getDrawSummary: getDrawSummary,
    clearDrawCommands: clearDrawCommands
};