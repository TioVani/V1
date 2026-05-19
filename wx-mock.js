/**
 * wx-mock.js — 浏览器环境 wx API 兼容层
 * 将所有 wx.xxx 调用映射到浏览器原生实现
 * 在 game.js 之前加载即可
 */
(function() {
    'use strict';

    if (typeof wx !== 'undefined' && wx._isMocked) return;

    // ==================== Canvas ====================
    function _getCanvas() {
        return document.getElementById('gameCanvas') || document.createElement('canvas');
    }

    // ==================== Toast ====================
    var _toastEl = null;
    var _toastTimer = null;

    function _showToast(opts) {
        if (_toastEl) _toastEl.remove();
        var el = document.createElement('div');
        el.textContent = opts.title || '';
        el.style.cssText = 'position:fixed;top:15%;left:50%;transform:translateX(-50%);' +
            'background:rgba(0,0,0,0.75);color:#fff;padding:8px 20px;border-radius:6px;' +
            'font-size:14px;z-index:99999;pointer-events:none;white-space:nowrap;' +
            'font-family:sans-serif;';
        document.body.appendChild(el);
        _toastEl = el;
        clearTimeout(_toastTimer);
        _toastTimer = setTimeout(function() { if (el.parentNode) el.remove(); _toastEl = null; },
            opts.duration || 1500);
    }

    function _showModal(opts) {
        console.log('[MODAL]', opts.title || '', opts.content || '');
        if (opts.success) opts.success({ confirm: true, cancel: false });
    }

    // ==================== Storage ====================
    function _getStorageSync(key) {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); }
        catch(e) { return null; }
    }
    function _setStorageSync(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
    }
    function _removeStorageSync(key) {
        try { localStorage.removeItem(key); } catch(e) {}
    }

    // ==================== Image ====================
    function _createImage() {
        var img = new Image();
        img.onload = function() { if (img._onLoad) img._onLoad(); };
        img.onerror = function() { if (img._onError) img._onError(); };
        return img;
    }

    // ==================== Vibrate ====================
    function _vibrateShort(opts) {
        if (navigator.vibrate) navigator.vibrate(30);
    }

    // ==================== Touch ====================
    var _canvasRect = null;

    function _getCanvasRect() {
        if (!_canvasRect) {
            var c = document.getElementById('gameCanvas');
            _canvasRect = c ? c.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        }
        return _canvasRect;
    }

    window.addEventListener('resize', function() { _canvasRect = null; });

    // 将视口坐标转换为 canvas 逻辑坐标 (375x667)
    function _toCanvasCoords(clientX, clientY) {
        var r = _getCanvasRect();
        return {
            clientX: Math.round((clientX - r.left) * 375 / r.width),
            clientY: Math.round((clientY - r.top) * 667 / r.height)
        };
    }

    function _t2canvas(t) {
        var c = _toCanvasCoords(t.clientX, t.clientY);
        return { clientX: c.clientX, clientY: c.clientY, identifier: t.identifier || 0 };
    }

    var _mouseDown = false;

    function _onTouchStart(fn) {
        document.addEventListener('touchstart', function(e) {
            e.preventDefault();
            fn({ touches: Array.prototype.map.call(e.touches, _t2canvas),
                 changedTouches: Array.prototype.map.call(e.changedTouches, _t2canvas) });
        }, { passive: false });
        document.addEventListener('mousedown', function(e) {
            _mouseDown = true;
            var c = _toCanvasCoords(e.clientX, e.clientY);
            fn({ touches: [{ clientX: c.clientX, clientY: c.clientY, identifier: 0 }],
                 changedTouches: [{ clientX: c.clientX, clientY: c.clientY, identifier: 0 }] });
        });
    }
    function _onTouchMove(fn) {
        document.addEventListener('touchmove', function(e) {
            e.preventDefault();
            fn({ touches: Array.prototype.map.call(e.touches, _t2canvas),
                 changedTouches: Array.prototype.map.call(e.changedTouches, _t2canvas) });
        }, { passive: false });
        document.addEventListener('mousemove', function(e) {
            if (!_mouseDown) return;
            var c = _toCanvasCoords(e.clientX, e.clientY);
            fn({ touches: [{ clientX: c.clientX, clientY: c.clientY, identifier: 0 }],
                 changedTouches: [{ clientX: c.clientX, clientY: c.clientY, identifier: 0 }] });
        });
    }
    function _onTouchEnd(fn) {
        document.addEventListener('touchend', function(e) {
            fn({ touches: [],
                 changedTouches: Array.prototype.map.call(e.changedTouches, _t2canvas) });
        });
        document.addEventListener('mouseup', function(e) {
            _mouseDown = false;
            var c = _toCanvasCoords(e.clientX, e.clientY);
            fn({ touches: [], changedTouches: [{ clientX: c.clientX, clientY: c.clientY, identifier: 0 }] });
        });
    }

    // ==================== Visibility ====================
    function _onHide(fn) {
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) fn();
        });
    }
    function _onShow(fn) {
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) fn();
        });
    }

    // ==================== Audio ====================
    function _createWebAudioContext() {
        try { return new (window.AudioContext || window.webkitAudioContext)(); }
        catch(e) { return null; }
    }

    // ==================== Ad ====================
    function _createBannerAd() {
        return { show: function(){}, hide: function(){}, destroy: function(){},
                 onError: function(){}, onLoad: function(){} };
    }
    function _createRewardedVideoAd() {
        var _cbs = [];
        return {
            load: function() { return Promise.resolve(); },
            show: function() { return Promise.resolve(); },
            get onClose() { return _cbs; },
            set onClose(fn) { _cbs.push(fn); },
            onError: function(){}
        };
    }

    // ==================== Cloud / Leaderboard ====================
    function _setUserCloudStorage(opts) {
        console.log('[CloudStorage] setUserCloudStorage:', opts);
        if (opts && opts.success) opts.success();
    }
    function _getOpenDataContext() { return null; }

    // ==================== FileSystem ====================
    function _getFileSystemManager() {
        return {
            readFileSync: function() { return ''; },
            writeFileSync: function() {},
            readdirSync: function() { return []; },
            unlinkSync: function() {},
            mkdirSync: function() {},
            accessSync: function() { return false; }
        };
    }

    // ==================== Request ====================
    function _request(opts) {
        fetch(opts.url, { method: (opts.method || 'GET').toUpperCase(), headers: opts.header || {},
                          body: opts.data ? JSON.stringify(opts.data) : undefined })
            .then(function(r) { return r.json(); })
            .then(function(d) { if (opts.success) opts.success({ data: d, statusCode: 200 }); })
            .catch(function(e) { if (opts.fail) opts.fail(e); });
    }

    // ==================== Install ====================
    window.wx = {
        _isMocked: true,

        createCanvas: function() { return _getCanvas(); },
        createImage: _createImage,

        getSystemInfoSync: function() {
            return {
                windowWidth: 375,
                windowHeight: 667,
                pixelRatio: 1,
                platform: 'browser',
                brand: 'browser',
                model: 'browser',
                system: 'browser',
                SDKVersion: '1.0.0',
                screenHeight: 667,
                screenWidth: 375
            };
        },

        getStorageSync: _getStorageSync,
        setStorageSync: _setStorageSync,
        removeStorageSync: _removeStorageSync,

        showToast: _showToast,
        showModal: _showModal,

        vibrateShort: _vibrateShort,

        onTouchStart: _onTouchStart,
        onTouchMove: _onTouchMove,
        onTouchEnd: _onTouchEnd,

        onHide: _onHide,
        onShow: _onShow,

        createWebAudioContext: _createWebAudioContext,
        getFileSystemManager: _getFileSystemManager,

        createBannerAd: _createBannerAd,
        createRewardedVideoAd: _createRewardedVideoAd,

        setUserCloudStorage: _setUserCloudStorage,
        getOpenDataContext: _getOpenDataContext,

        request: _request,

        env: { USER_DATA_PATH: '/tmp' }
    };
})();
