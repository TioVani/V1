/**
 * CutsceneRenderer — 过场动画播放器
 * 支持帧序列播放、自动结束、可跳过控制
 */
function createCutsceneRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var onComplete = deps.onComplete;

    var _frames = [];
    var _currentFrame = 0;
    var _frameTimer = 0;
    var _playing = false;
    var _skippable = false;
    var _fading = false;
    var _fadeAlpha = 0;

    function loadCutscene(config) {
        _frames = config.frames || [];
        _currentFrame = 0;
        _frameTimer = 0;
        _playing = true;
        _skippable = config.skippable !== false;
        _fading = true;
        _fadeAlpha = 1;
    }

    function update(dt) {
        if (!_playing || _frames.length === 0) return;

        if (_fading) {
            _fadeAlpha -= dt * 2;
            if (_fadeAlpha <= 0) {
                _fadeAlpha = 0;
                _fading = false;
            }
            return;
        }

        _frameTimer += dt;
        var frame = _frames[_currentFrame];
        if (!frame) {
            _finish();
            return;
        }
        var duration = frame.duration || 3;
        if (_frameTimer >= duration) {
            _frameTimer = 0;
            _currentFrame++;
            if (_currentFrame >= _frames.length) {
                _finish();
            }
        }
    }

    function _finish() {
        _playing = false;
        if (onComplete) onComplete();
    }

    function renderCutscene() {
        var ctx = getCtx();
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var scale = getScreenScale();

        if (_frames.length === 0) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, sw, sh);
            return;
        }

        var frame = _frames[Math.min(_currentFrame, _frames.length - 1)];
        if (!frame) return;

        ctx.save();

        // 背景
        ctx.fillStyle = frame.bgColor || '#0a0a15';
        ctx.fillRect(0, 0, sw, sh);

        // 文字内容
        if (frame.text) {
            var fontSize = Math.floor((frame.fontSize || 16) * scale);
            ctx.font = fontSize + 'px sans-serif';
            ctx.fillStyle = frame.textColor || '#e8d5a3';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            var lines = frame.text.split('\n');
            var lineHeight = fontSize * 1.6;
            var startY = sh / 2 - (lines.length - 1) * lineHeight / 2;
            for (var i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], sw / 2, startY + i * lineHeight);
            }
        }

        // 跳过提示
        if (_skippable) {
            var hintSize = Math.floor(12 * scale);
            ctx.font = hintSize + 'px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText('点击跳过', sw - Math.floor(20 * scale), sh - Math.floor(20 * scale));
        }

        // 淡入遮罩
        if (_fading && _fadeAlpha > 0) {
            ctx.globalAlpha = _fadeAlpha;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, sw, sh);
        }

        ctx.restore();
    }

    function skip() {
        if (_skippable && _playing) {
            _finish();
        }
    }

    function isPlaying() {
        return _playing;
    }

    function reset() {
        _frames = [];
        _currentFrame = 0;
        _frameTimer = 0;
        _playing = false;
        _fading = false;
        _fadeAlpha = 0;
    }

    return {
        loadCutscene: loadCutscene,
        update: update,
        renderCutscene: renderCutscene,
        skip: skip,
        isPlaying: isPlaying,
        reset: reset
    };
}

export { createCutsceneRenderer };
