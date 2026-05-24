/**
 * 音频系统（Audio System）
 * 闭包工厂 + 依赖注入模式
 * 使用 Web Audio API 实现变调点击音效
 */

import { createWebAudioContext, getFileSystemManager, env } from '../platform/BrowserAPI.js';

function createAudioSystem(deps) {
    var sfxList = (deps && deps.sfx) || [];
    var bgmList = (deps && deps.bgm) || [];

    var ctx = null;
    var _buffers = {};
    var _bgmEl = null;
    var _bgmVolume = 0.4;
    var _pendingBgm = null;

    function init() {
        try {
            ctx = createWebAudioContext();
        } catch (e) {
            return;
        }
        if (!ctx) return;

        for (var i = 0; i < sfxList.length; i++) {
            _loadBuffer(sfxList[i].src, sfxList[i].id);
        }

        // BGM: 用 <audio> 元素预加载
        for (var j = 0; j < bgmList.length; j++) {
            var audio = document.createElement('audio');
            audio.src = bgmList[j].src;
            audio.preload = 'auto';
            audio.loop = true;
            audio.dataset.bgmId = bgmList[j].id;
            audio.style.display = 'none';
            document.body.appendChild(audio);
        }

        // 首次交互触发 BGM
        function onFirstInteraction() {
            if (_pendingBgm) {
                playBgm(_pendingBgm.id, _pendingBgm.volume);
                _pendingBgm = null;
            }
            document.removeEventListener('touchstart', onFirstInteraction);
            document.removeEventListener('click', onFirstInteraction);
            document.removeEventListener('keydown', onFirstInteraction);
        }
        document.addEventListener('touchstart', onFirstInteraction);
        document.addEventListener('click', onFirstInteraction);
        document.addEventListener('keydown', onFirstInteraction);
    }

    function _loadBuffer(src, id) {
        var url = src.charAt(0) === '/' ? src : '/' + src;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
            if (xhr.status === 200 || xhr.status === 0) {
                ctx.decodeAudioData(xhr.response, function(buf) { _buffers[id] = buf; }, function() {});
            }
        };
        xhr.send();
    }

    function _play(buffer, rateMin, rateMax, volume) {
        if (!ctx || !buffer) return;
        try {
            var source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = rateMin + Math.random() * (rateMax - rateMin);
            if (volume !== undefined && volume !== 1) {
                var gain = ctx.createGain();
                gain.gain.value = volume;
                source.connect(gain);
                gain.connect(ctx.destination);
            } else {
                source.connect(ctx.destination);
            }
            source.start(0);
        } catch (e) {}
    }

    function playClick() {
        _play(_buffers['click'], 0.85, 1.15, 0.5);
    }

    function playMenuClick() {
        _play(_buffers['menuClick'], 1, 1, 0.5);
    }

    function playTowerClick() {
        _play(_buffers['towerClick'], 0.9, 1.1, 0.5);
    }

    function playTowerExit() {
        _play(_buffers['towerClick'], 0.65, 0.75, 0.5);
    }

    function playBackpack() {
        _play(_buffers['backpack'], 0.85, 1.15, 0.8);
    }

    function playMonsterDefeat() {
        _play(_buffers['monsterHit'], 0.75, 1.25, 0.5);
    }

    function playMeteor(starType) {
        var buf = (starType === 'ice') ? _buffers['meteorIce'] : _buffers['meteor'];
        _play(buf, 0.9, 1.1, 0.1);
    }

    function playDodgeHeal() {
        _play(_buffers['dodgeHeal'], 0.9, 1.1, 0.5);
    }

    function playPetAttack() {
        _play(_buffers['petAttack'], 0.6, 1.4, 0.3);
    }

    function playMeteorImpact() {
        _play(_buffers['meteorImpact'], 0.85, 1.15, 0.5);
    }

    function playMonsterDodge() {
        _play(_buffers['monsterDodge'], 0.9, 1.1, 0.2);
    }

    function playBgm(id, volume) {
        _bgmVolume = volume || 0.4;
        var el = document.querySelector('audio[data-bgm-id="' + id + '"]');
        if (!el) {
            _pendingBgm = { id: id, volume: _bgmVolume };
            return;
        }
        stopBgm();
        _bgmEl = el;
        _bgmEl.volume = _bgmVolume;
        _bgmEl.currentTime = 0;
        var p = _bgmEl.play();
        if (p && p.catch) {
            p.catch(function() {
                _pendingBgm = { id: id, volume: _bgmVolume };
            });
        }
    }

    function stopBgm(fadeMs) {
        if (!_bgmEl) return;
        var el = _bgmEl;
        _bgmEl = null;
        if (fadeMs > 0) {
            var startVol = el.volume;
            var step = 50;
            var steps = fadeMs / step;
            var decay = startVol / steps;
            var timer = setInterval(function() {
                el.volume = Math.max(0, el.volume - decay);
                if (el.volume <= 0) {
                    clearInterval(timer);
                    el.pause();
                    el.volume = startVol;
                }
            }, step);
        } else {
            el.pause();
        }
    }

    function destroy() {
        stopBgm();
        // 移除所有 BGM audio 元素
        var els = document.querySelectorAll('audio[data-bgm-id]');
        for (var i = 0; i < els.length; i++) els[i].remove();
        if (ctx) { ctx.close(); ctx = null; }
        _buffers = {};
    }

    return {
        init: init,
        playBgm: playBgm,
        stopBgm: stopBgm,
        playClick: playClick,
        playMenuClick: playMenuClick,
        playTowerClick: playTowerClick,
        playTowerExit: playTowerExit,
        playBackpack: playBackpack,
        playMonsterDefeat: playMonsterDefeat,
        playMeteor: playMeteor,
        playDodgeHeal: playDodgeHeal,
        playPetAttack: playPetAttack,
        playMeteorImpact: playMeteorImpact,
        playMonsterDodge: playMonsterDodge,
        destroy: destroy
    };
}

export { createAudioSystem };
