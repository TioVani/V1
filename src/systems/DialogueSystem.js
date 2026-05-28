/**
 * DialogueSystem — 唯一对话播放入口
 * 支持 fullscreen（全屏不透明）、overlay（半透明叠加）和 guide_anim（角色立绘滑入/滑出+气泡）三模式。
 */
import { PORTRAIT_MAP } from '../config/DialogueConfig.js';

// ── 缓动函数 ──────────────────────────────────
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInCubic(t)  { return Math.pow(t, 3); }

function createDialogueSystem(deps) {
    var getAssets = deps.getAssets;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getDesignOffsetY = deps.getDesignOffsetY;
    var playClickAudio = deps.playClickAudio || function() {};
    var getCharacterImage = deps.getCharacterImage || function() { return null; };
    var registerFirstStarClick = deps.registerFirstStarClick || null;
    var unregisterFirstStarClick = deps.unregisterFirstStarClick || null;

    // ── fullscreen / overlay 状态 ────────────────────
    var _script = null;
    var _lineIndex = -1;
    var _mode = 'fullscreen';
    var _onComplete = null;
    var _charIndex = 0;
    var _typeTimer = 0;
    var _typeSpeed = 50;
    var _isTyping = false;
    var _fullTextShown = false;
    var _overlayTimer = 0;
    var _overlayDuration = 3000;
    var _active = false;
    var _overlayAutoDismiss = false;
    var _noAutoDismiss = false;

    // ── guide_anim 状态 ──────────────────────────
    var _guideState = {
        active: false,
        characterId: null,
        posX: 0, posY: 0,
        targetX: 0, targetY: 0,
        startX: 0,
        opacity: 1,
        bubbleText: '',
        bubbleOpacity: 0,
        phase: 'idle',
        phaseTimer: 0,
        config: null,
        waitForEvent: null,
        onComplete: null,
        _needsCoordInit: false,
        _cachedScreenW: 0,
        _cachedScreenH: 0,
        _triggers: [],
        _triggerIndex: 0,
        _starClickRegistered: false,
    };

    // ── 核心 API ──────────────────────────────────

    function play(opts) {
        // guide_anim 模式
        if (opts.mode === 'guide_anim') {
            var cfg = opts.guideAnim;
            var startIdx = opts.startIndex || 0;
            var firstTrigger = (opts.triggers && opts.triggers[startIdx]);
            var firstLine = firstTrigger ? firstTrigger.lines[0] : '';
            _guideState.active = true;
            _guideState.characterId = cfg.characterId;
            _guideState.config = cfg;
            _guideState.bubbleText = firstLine;
            _guideState.phase = 'sliding_in';
            _guideState.phaseTimer = 0;
            _guideState.opacity = 1;
            _guideState.bubbleOpacity = 0;
            _guideState._needsCoordInit = true;
            _guideState._triggers = opts.triggers || [];
            _guideState._triggerIndex = startIdx + 1;
            _guideState._starClickRegistered = false;
            _guideState.onComplete = null;
            _guideState.waitForEvent = null;
            // fullscreen/overlay 状态标记为非活跃
            _active = false;
            _script = null;
            return;
        }

        // fullscreen / overlay 模式
        _script = opts.script;
        _mode = opts.mode || 'fullscreen';
        _onComplete = opts.onComplete || null;
        _noAutoDismiss = opts.autoDismiss === false;
        _lineIndex = 0;
        _charIndex = 0;
        _typeTimer = 0;
        _isTyping = true;
        _fullTextShown = false;
        _active = true;
        // guide_anim 标记为非活跃
        _guideState.active = false;

        if (_mode === 'overlay') {
            _overlayTimer = 0;
            _overlayAutoDismiss = false;
        }
    }

    function advance() {
        if (!_guideState.active) return;

        if (_guideState.phase === 'sliding_in') {
            _guideState.posX = _guideState.targetX;
            _guideState.phase = 'showing';
            _guideState.phaseTimer = 0;
        }

        if (_guideState.phase !== 'showing') return;

        // 从 _triggers 数组取当前段的数据
        var trigger = _guideState._triggers[_guideState._triggerIndex];
        if (trigger && trigger.lines && trigger.lines.length > 0) {
            _guideState.bubbleText = trigger.lines[0];
            _guideState.bubbleOpacity = 0;
            _guideState.phaseTimer = 0;
        }
        var waitFor = trigger ? trigger.waitFor : null;

        // 移到下一条
        _guideState._triggerIndex++;

        // 如果没有下一条（waitFor === null 或已是最后一条），启动滑出计时
        if (!waitFor && _guideState.config.bubbleHoldAfterLast > 0) {
            setTimeout(function() {
                if (_guideState.active && _guideState.phase === 'showing') {
                    _guideState.phase = 'sliding_out';
                    _guideState.phaseTimer = 0;
                }
            }, _guideState.config.bubbleHoldAfterLast);
        }
    }

    function update(dt) {
        // guide_anim 更新
        if (_guideState.active) {
            _guideState.phaseTimer += dt * 1000;

            switch (_guideState.phase) {
                case 'sliding_in':
                    var t1 = Math.min(1, _guideState.phaseTimer / _guideState.config.slideInDuration);
                    _guideState.posX = _guideState.startX + (_guideState.targetX - _guideState.startX) * easeOutCubic(t1);
                    _guideState.posY = _guideState.targetY;
                    if (t1 >= 1) {
                        _guideState.posX = _guideState.targetX;
                        _guideState.phase = 'showing';
                        _guideState.phaseTimer = 0;

                        // 滑入完成：如果有下一条 trigger 且需要等待事件，注册回调
                        var nextTrigger = _guideState._triggers[_guideState._triggerIndex];
                        if (nextTrigger && nextTrigger.at === 'first_star_click' && registerFirstStarClick && !_guideState._starClickRegistered) {
                            _guideState.waitForEvent = nextTrigger.waitFor;
                            _guideState._starClickRegistered = true;
                            registerFirstStarClick(function() {
                                advance();
                            });
                        }
                    }
                    break;

                case 'sliding_out':
                    var outCfg = _guideState.config;
                    var t2 = Math.min(1, _guideState.phaseTimer / outCfg.slideOutDuration);
                    var scale = getScreenScale();
                    var outPW = Math.floor(outCfg.portraitWidth * scale);
                    var outTargetX = outCfg.slideOutTo === 'right'
                        ? _guideState._cachedScreenW + outPW
                        : -outPW * 2;
                    _guideState.posX = _guideState.targetX + (outTargetX - _guideState.targetX) * easeInCubic(t2);
                    _guideState.opacity = 1 - t2;
                    _guideState.bubbleOpacity = Math.max(0, _guideState.bubbleOpacity * (1 - t2));
                    if (t2 >= 1) {
                        _guideState.active = false;
                        _guideState.phase = 'idle';
                        // 注销 firstStarClick 回调
                        if (_guideState._starClickRegistered && unregisterFirstStarClick) {
                            unregisterFirstStarClick();
                            _guideState._starClickRegistered = false;
                        }
                        if (_guideState.onComplete) _guideState.onComplete();
                    }
                    break;

                case 'showing':
                    if (_guideState.bubbleOpacity < 1) {
                        _guideState.bubbleOpacity = Math.min(1,
                            _guideState.bubbleOpacity + (_guideState.phaseTimer / 150));
                    }
                    break;
            }
            return true;
        }

        // fullscreen / overlay 更新
        if (!_active || !_script) return false;

        var line = _script[_lineIndex];
        if (!line) {
            _finishPlayback();
            return false;
        }

        if (_isTyping && !_fullTextShown) {
            _typeTimer += dt;
            while (_typeTimer >= _typeSpeed && _charIndex < line.text.length) {
                _charIndex++;
                _typeTimer -= _typeSpeed;
            }
            if (_charIndex >= line.text.length) {
                _isTyping = false;
                _fullTextShown = true;
                if (_mode === 'overlay' && !_noAutoDismiss) {
                    _overlayAutoDismiss = true;
                    _overlayTimer = 0;
                }
            }
        }

        if (_mode === 'overlay' && _overlayAutoDismiss && !_noAutoDismiss) {
            _overlayTimer += dt;
            if (_overlayTimer >= _overlayDuration) {
                _advanceLine();
            }
        }

        return true;
    }

    function render(ctx, w, h) {
        // guide_anim 叠加渲染
        if (_guideState.active && _guideState.phase !== 'idle') {
            if (_guideState._needsCoordInit) {
                var cfg = _guideState.config;
                var scale = getScreenScale();
                var pw = Math.floor(cfg.portraitWidth * scale);
                var ph = Math.floor(cfg.portraitHeight * scale);
                _guideState._cachedScreenW = w;
                _guideState._cachedScreenH = h;
                _guideState.targetX = Math.floor(w * cfg.portraitTargetX);
                _guideState.targetY = Math.floor(h * (1 - cfg.portraitBottomOffset)) - ph;
                _guideState.startX = cfg.slideInFrom === 'left' ? -pw * 2 : w + pw;
                _guideState.posX = _guideState.startX;
                _guideState.posY = _guideState.targetY;
                _guideState._needsCoordInit = false;
            }
            renderGuideAnim(ctx);
        }

        // fullscreen / overlay 渲染
        if (!_active || !_script) return;

        var line = _script[_lineIndex];
        if (!line) return;

        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();

        if (_mode === 'fullscreen') {
            renderFullscreen(ctx, w, h, line, scale, designOffsetY);
        } else {
            renderOverlay(ctx, w, h, line, scale, designOffsetY);
        }
    }

    function handleClick(x, y) {
        if (!_active || !_script) return;

        var line = _script[_lineIndex];
        if (!line) return;

        playClickAudio();

        if (_mode === 'fullscreen') {
            if (_isTyping && !_fullTextShown) {
                _charIndex = line.text.length;
                _isTyping = false;
                _fullTextShown = true;
                return;
            }
            _advanceLine();
        } else {
            _advanceLine();
        }
    }

    function isActive() {
        return _active || _guideState.active;
    }

    function destroy() {
        _script = null;
        _lineIndex = -1;
        _onComplete = null;
        _active = false;
        _isTyping = false;
        _fullTextShown = false;
        // guide_anim 清理
        _guideState.active = false;
        _guideState.phase = 'idle';
        _guideState.onComplete = null;
        _guideState.waitForEvent = null;
        if (_guideState._starClickRegistered && unregisterFirstStarClick) {
            unregisterFirstStarClick();
            _guideState._starClickRegistered = false;
        }
    }

    // ── 内部方法 ──────────────────────────────────

    function _advanceLine() {
        _lineIndex++;
        if (_lineIndex >= _script.length) {
            _finishPlayback();
            return;
        }
        _charIndex = 0;
        _typeTimer = 0;
        _isTyping = true;
        _fullTextShown = false;

        if (_mode === 'overlay') {
            _overlayAutoDismiss = false;
            _overlayTimer = 0;
        }
    }

    function _finishPlayback() {
        _active = false;
        _script = null;
        _lineIndex = -1;
        if (_onComplete) {
            _onComplete();
            _onComplete = null;
        }
    }

    // ── guide_anim 渲染 ────────────────────────────

    function renderGuideAnim(ctx) {
        var gs = _guideState;
        var scale = getScreenScale();
        var pw = Math.floor(gs.config.portraitWidth * scale);
        var ph = Math.floor(gs.config.portraitHeight * scale);

        // 立绘
        var image = getCharacterImage(gs.characterId);
        if (image) {
            renderPortrait(ctx, image, gs.posX, gs.posY, pw, ph, gs.opacity);
        }

        // 气泡 — 坐标基于缩放后的立绘尺寸
        var bubbleX = gs.posX + pw + Math.floor(gs.config.bubbleOffsetX * scale);
        var bubbleY = gs.posY + Math.floor(gs.config.bubbleOffsetY * scale);
        renderBubble(ctx, bubbleX, bubbleY, gs.bubbleText, gs.bubbleOpacity, Math.floor(gs.config.bubbleMaxWidth * scale), scale);
    }

    function renderPortrait(ctx, image, x, y, w, h, opacity) {
        if (!image || opacity <= 0) return;
        var scale = getScreenScale();
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = Math.floor(6 * scale);
        ctx.shadowOffsetX = Math.floor(2 * scale);
        ctx.shadowOffsetY = Math.floor(2 * scale);
        ctx.drawImage(image, x, y, w, h);
        ctx.restore();
    }

    function renderBubble(ctx, x, y, text, opacity, maxWidth, scale) {
        if (opacity <= 0 || !text) return;
        ctx.save();
        ctx.globalAlpha = opacity;

        var fontSize = Math.floor(14 * scale);
        var padding = Math.floor(16 * scale);
        var lineHeight = Math.floor(22 * scale);
        var cornerRadius = Math.floor(10 * scale);
        ctx.font = fontSize + 'px sans-serif';
        var lines = wrapText(ctx, text, maxWidth - padding * 2);
        var bw = maxWidth;
        var bh = lines.length * lineHeight + padding * 2;
        var bx = x;
        var by = y - bh;

        // 气泡背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.strokeStyle = 'rgba(180, 160, 120, 0.6)';
        ctx.lineWidth = Math.floor(1 * scale);
        roundRect(ctx, bx, by, bw, bh, cornerRadius, true, true);

        // 三角尖 (指向左下方)
        var triW = Math.floor(20 * scale);
        var triH = Math.floor(8 * scale);
        ctx.beginPath();
        ctx.moveTo(bx + triW, by + bh);
        ctx.lineTo(bx + triW + Math.floor(10 * scale), by + bh + triH);
        ctx.lineTo(bx + triW + Math.floor(20 * scale), by + bh);
        ctx.closePath();
        ctx.fill();

        // 文字
        ctx.fillStyle = '#333';
        ctx.font = fontSize + 'px sans-serif';
        ctx.textBaseline = 'top';
        for (var i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], bx + padding + Math.floor(85 * scale), by + padding + i * lineHeight);
        }
        ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    // ── 全屏模式渲染 ──────────────────────────────

    function renderFullscreen(ctx, w, h, line, scale, designOffsetY) {
        ctx.fillStyle = 'rgba(10, 10, 21, 0.6)';
        ctx.fillRect(0, 0, w, h);

        var portraitZoneH = Math.floor(h * 0.85);
        var dialogueZoneY = portraitZoneH;
        var dialogueZoneH = h - portraitZoneH;

        renderPortraitPair(ctx, w, portraitZoneH, line, scale);
        renderDialogueBox(ctx, w, dialogueZoneY, dialogueZoneH, line, scale);
    }

    function renderPortraitPair(ctx, w, zoneH, currentLine, scale) {
        var assets = getAssets();
        var portraits = assets.dialoguePortraits || {};

        var leftSpeakerId = null;
        var rightSpeakerId = null;
        for (var i = 0; i <= _lineIndex && i < _script.length; i++) {
            var sl = _script[i];
            if (sl.side === 'left' && sl.speakerId) leftSpeakerId = sl.speakerId;
            if (sl.side === 'right' && sl.speakerId) rightSpeakerId = sl.speakerId;
        }

        var isCurrentLeft = currentLine.side === 'left';
        var isCurrentRight = currentLine.side === 'right';
        var isCurrentCenter = currentLine.side === 'center';

        var portraitW = Math.floor(w * 0.4);
        var portraitH = zoneH;

        if (leftSpeakerId) {
            var leftKey = PORTRAIT_MAP[leftSpeakerId];
            var leftImg = portraits[leftKey];
            if (leftImg && leftImg.complete && leftImg.naturalWidth > 0) {
                var imgRatio = leftImg.naturalWidth / leftImg.naturalHeight;
                var drawH = portraitH;
                var drawW = Math.floor(drawH * imgRatio);
                if (drawW > portraitW) { drawW = portraitW; drawH = Math.floor(drawW / imgRatio); }
                var drawX = Math.floor(portraitW * 0.2);
                var drawY = Math.floor((zoneH - drawH) / 2) + 300;
                ctx.save();
                if (!isCurrentLeft || isCurrentCenter) ctx.globalAlpha = 0.7;
                ctx.drawImage(leftImg, drawX, drawY, drawW, drawH);
                ctx.restore();
            }
        }

        if (rightSpeakerId) {
            var rightKey = PORTRAIT_MAP[rightSpeakerId];
            var rightImg = portraits[rightKey];
            if (rightImg && rightImg.complete && rightImg.naturalWidth > 0) {
                var imgRatio2 = rightImg.naturalWidth / rightImg.naturalHeight;
                var drawH2 = portraitH;
                var drawW2 = Math.floor(drawH2 * imgRatio2);
                if (drawW2 > portraitW) { drawW2 = portraitW; drawH2 = Math.floor(drawW2 / imgRatio2); }
                var drawX2 = w - drawW2 - Math.floor(portraitW * 0.2);
                var drawY2 = Math.floor((zoneH - drawH2) / 2) + 300;
                ctx.save();
                if (!isCurrentRight || isCurrentCenter) ctx.globalAlpha = 0.7;
                ctx.drawImage(rightImg, drawX2, drawY2, drawW2, drawH2);
                ctx.restore();
            }
        }
    }

    function renderDialogueBox(ctx, w, boxY, boxH, line, scale) {
        ctx.fillStyle = 'rgba(10, 10, 21, 0.85)';
        ctx.fillRect(0, boxY, w, boxH);

        ctx.strokeStyle = '#e8d5a3';
        ctx.lineWidth = Math.floor(2 * scale);
        ctx.beginPath();
        ctx.moveTo(Math.floor(20 * scale), boxY + Math.floor(2 * scale));
        ctx.lineTo(w - Math.floor(20 * scale), boxY + Math.floor(2 * scale));
        ctx.stroke();

        var nameY = boxY + Math.floor(25 * scale);
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#e8d5a3';
        ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
        ctx.fillText(line.speaker, Math.floor(20 * scale), nameY);
        ctx.restore();

        var textY = nameY + Math.floor(28 * scale);
        var displayText = line.text.substring(0, _charIndex);
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#c8b880';
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';

        var maxLineWidth = w - Math.floor(40 * scale);
        var lines = wrapText(ctx, displayText, maxLineWidth);
        for (var li = 0; li < lines.length; li++) {
            ctx.fillText(lines[li], Math.floor(20 * scale), textY + li * Math.floor(22 * scale));
        }
        ctx.restore();

        if (_fullTextShown && _mode === 'fullscreen') {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#666';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.fillText('▼ 点击继续', w / 2, boxY + boxH - Math.floor(10 * scale));
            ctx.restore();
        }
    }

    // ── 叠加模式渲染 ──────────────────────────────

    function renderOverlay(ctx, w, h, line, scale, designOffsetY) {
        var barH = Math.floor(130 * scale);
        var barY = designOffsetY + Math.floor(812 * scale) - barH - Math.floor(60 * scale);
        if (barY < designOffsetY) barY = designOffsetY + Math.floor(200 * scale);

        ctx.fillStyle = 'rgba(10, 10, 21, 0.75)';
        ctx.fillRect(0, barY, w, barH);

        var portraitSize = Math.floor(120 * scale);
        var portraitPad = Math.floor(15 * scale);
        if (line.speakerId) {
            var assets = getAssets();
            var portraits = assets.dialoguePortraits || {};
            var pKey = PORTRAIT_MAP[line.speakerId];
            var pImg = portraits[pKey];
            if (pImg && pImg.complete && pImg.naturalWidth > 0) {
                var pRatio = pImg.naturalWidth / pImg.naturalHeight;
                var pDrawH = portraitSize;
                var pDrawW = Math.floor(pDrawH * pRatio);
                if (pDrawW > portraitSize) { pDrawW = portraitSize; pDrawH = Math.floor(pDrawW / pRatio); }
                ctx.drawImage(pImg, portraitPad, barY + Math.floor((barH - pDrawH) / 2), pDrawW, pDrawH);
            }
        }

        var textStartX = portraitSize + portraitPad + Math.floor(10 * scale);
        var textContent = line.speaker + '：' + line.text.substring(0, _charIndex);
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e8d5a3';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';

        var maxW = w - textStartX - Math.floor(15 * scale);
        var wrapped = wrapText(ctx, textContent, maxW);
        var lineH = Math.floor(20 * scale);
        var startY = barY + Math.floor(barH / 2) - (wrapped.length * lineH) / 2;
        for (var i = 0; i < wrapped.length; i++) {
            ctx.fillText(wrapped[i], textStartX, startY + i * lineH);
        }
        ctx.restore();
    }

    // ── 文本换行工具 ──────────────────────────────

    function wrapText(ctx, text, maxWidth) {
        var result = [];
        var current = '';
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            var test = current + ch;
            if (ctx.measureText(test).width > maxWidth && current.length > 0) {
                result.push(current);
                current = ch;
            } else {
                current = test;
            }
        }
        if (current) result.push(current);
        return result;
    }

    // ── 播放指定行（overlay trigger 用）───────────────────

    function playFromLine(script, lineIndex, mode, onComplete, autoDismiss) {
        _script = script;
        _mode = mode || 'overlay';
        _onComplete = onComplete || null;
        _noAutoDismiss = autoDismiss === false;
        _lineIndex = lineIndex;
        _charIndex = 0;
        _typeTimer = 0;
        _isTyping = true;
        _fullTextShown = false;
        _active = true;
        _guideState.active = false;
        if (_mode === 'overlay') {
            _overlayAutoDismiss = false;
            _overlayTimer = 0;
        }
    }

    // ── 公开接口 ──────────────────────────────────
    return {
        play: play,
        playFromLine: playFromLine,
        advance: advance,
        update: update,
        render: render,
        handleClick: handleClick,
        isActive: isActive,
        destroy: destroy,
    };
}

export { createDialogueSystem };