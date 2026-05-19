/**
 * 微信小游戏 API 浏览器适配层
 * 将 wx.* 调用映射到浏览器 DOM API，使游戏可在浏览器中运行
 */
(function() {
    'use strict';

    // 基础配置
    var _isMocked = true;

    // 获取容器
    function getCanvas() {
        return document.getElementById('game-canvas');
    }

    // ==================== 系统信息 ====================
    function getSystemInfoSync() {
        var canvas = getCanvas();
        var dpr = window.devicePixelRatio || 1;
        // 返回 canvas 逻辑尺寸（CSS 尺寸），配合 ctx.setTransform(dpr) 实现清晰渲染
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

    // ==================== Canvas ====================
    function createCanvas() {
        return getCanvas();
    }

    // ==================== Image ====================
    function createImage() {
        return new Image();
    }

    // ==================== Touch 事件 ====================
    var _touchStartHandlers = [];
    var _touchMoveHandlers = [];
    var _touchEndHandlers = [];
    var _hideHandlers = [];
    var _showHandlers = [];

    // 把鼠标/触摸事件转成 wx 格式（坐标转换为画布相对坐标）
    function _wrapTouch(e, idOffset) {
        var result = [];
        var touches = e.touches || e.changedTouches;
        var clientX, clientY;
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
            // Mouse fallback
            clientX = e.clientX || e.pageX || 0;
            clientY = e.clientY || e.pageY || 0;
            result.push({
                clientX: clientX - rect.left,
                clientY: clientY - rect.top,
                identifier: 0,
                force: 1
            });
        }
        return result;
    }

    function onTouchStart(fn) { _touchStartHandlers.push(fn); }
    function onTouchMove(fn) { _touchMoveHandlers.push(fn); }
    function onTouchEnd(fn) { _touchEndHandlers.push(fn); }
    function onHide(fn) { _hideHandlers.push(fn); }
    function onShow(fn) { _showHandlers.push(fn); }

    function offTouchStart(fn) {
        _touchStartHandlers = _touchStartHandlers.filter(function(h) { return h !== fn; });
    }
    function offTouchMove(fn) {
        _touchMoveHandlers = _touchMoveHandlers.filter(function(h) { return h !== fn; });
    }
    function offTouchEnd(fn) {
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
            if (!e.buttons) return;  // 只在按下时触发
            var res = { touches: _wrapTouch(e), changedTouches: _wrapTouch(e) };
            _touchMoveHandlers.forEach(function(fn) { fn(res); });
        });

        canvas.addEventListener('mouseup', function(e) {
            var res = { touches: [], changedTouches: _wrapTouch(e) };
            _touchEndHandlers.forEach(function(fn) { fn(res); });
        });
    }

    // 页面可见性 → wx.onHide/onShow
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            _hideHandlers.forEach(function(fn) { fn(); });
        } else {
            _showHandlers.forEach(function(fn) { fn(); });
        }
    });

    // ==================== 存储 ====================
    function getStorageSync(key) {
        try {
            var val = localStorage.getItem('wx_' + key);
            return val ? JSON.parse(val) : '';
        } catch (e) {
            return '';
        }
    }

    function setStorageSync(key, val) {
        try {
            localStorage.setItem('wx_' + key, JSON.stringify(val));
        } catch (e) {
            console.warn('localStorage.setItem failed:', e);
        }
    }

    function removeStorageSync(key) {
        try {
            localStorage.removeItem('wx_' + key);
        } catch (e) {}
    }

    function setUserCloudStorage(opts) {
        // 云端存储在浏览器中降级为本地存储
        if (opts && opts.data) {
            try {
                localStorage.setItem('wx_cloudData', JSON.stringify(opts.data));
            } catch (e) {}
        }
        if (opts && opts.success) opts.success();
    }

    // ==================== Toast ====================
    function showToast(opts) {
        var toast = document.getElementById('wx-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'wx-toast';
            toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 24px;border-radius:8px;font-size:16px;z-index:9999;pointer-events:none;transition:opacity 0.3s;white-space:nowrap;';
            document.body.appendChild(toast);
        }
        toast.textContent = (opts && opts.icon === 'success' ? '✓ ' : '') + ((opts && opts.title) || '');
        toast.style.opacity = '1';
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(function() {
            toast.style.opacity = '0';
        }, (opts && opts.duration) || 1500);
    }

    // ==================== Modal ====================
    function showModal(opts) {
        var result = confirm((opts && opts.title || '') + '\n\n' + (opts && opts.content || ''));
        if (result && opts && opts.success) {
            opts.success({ confirm: true, cancel: false });
        } else if (!result && opts && opts.fail) {
            opts.fail({ confirm: false, cancel: true });
        }
    }

    // ==================== 振动 ====================
    function vibrateShort(opts) {
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    function vibrateLong(opts) {
        if (navigator.vibrate) {
            navigator.vibrate(400);
        }
    }

    // ==================== 音频 ====================
    function createWebAudioContext() {
        // 使用 Web Audio API
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            return new AudioContext();
        }
        return null;
    }

    // ==================== 文件系统 ====================
    function getFileSystemManager() {
        return {
            readFile: function(opts) {
                // 浏览器不支持同步读文件，返回失败
                if (opts && opts.fail) opts.fail({ errMsg: 'readFile:fail not supported in browser' });
            }
        };
    }

    // ==================== 开放数据域 ====================
    function getOpenDataContext() {
        return {
            canvas: null,
            postMessage: function() {}
        };
    }

    // ==================== 广告 ====================
    function createBannerAd() {
        return { show: function() {}, hide: function() {}, destroy: function() {}, onLoad: function() {}, onError: function() {} };
    }
    function createRewardedVideoAd() {
        return { show: function() {}, load: function() {}, onLoad: function() {}, onError: function() {}, onClose: function() {} };
    }

    // ==================== 网络请求 ====================
    function request(opts) {
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

    // ==================== 环境变量 ====================
    var env = {
        USER_DATA_PATH: '/browser-storage'
    };

    // ==================== 组装 wx 对象 ====================
    window.wx = {
        _isMocked: true,

        // 系统
        getSystemInfoSync: getSystemInfoSync,

        // Canvas & Image
        createCanvas: createCanvas,
        createImage: createImage,

        // 触摸 & 生命周期
        onTouchStart: onTouchStart,
        onTouchMove: onTouchMove,
        onTouchEnd: onTouchEnd,
        offTouchStart: offTouchStart,
        offTouchMove: offTouchMove,
        offTouchEnd: offTouchEnd,
        onHide: onHide,
        onShow: onShow,

        // 存储
        getStorageSync: getStorageSync,
        setStorageSync: setStorageSync,
        removeStorageSync: removeStorageSync,
        setUserCloudStorage: setUserCloudStorage,

        // UI
        showToast: showToast,
        showModal: showModal,

        // 振动
        vibrateShort: vibrateShort,
        vibrateLong: vibrateLong,

        // 音频
        createWebAudioContext: createWebAudioContext,

        // 文件
        getFileSystemManager: getFileSystemManager,
        env: env,

        // 开放数据
        getOpenDataContext: getOpenDataContext,

        // 广告
        createBannerAd: createBannerAd,
        createRewardedVideoAd: createRewardedVideoAd,

        // 网络
        request: request
    };

    // 绑定事件
    _bindTouchEvents();

    console.log('[wx-polyfill] 微信 API 浏览器适配已就绪');
})();