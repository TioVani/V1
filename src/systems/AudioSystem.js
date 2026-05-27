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
    var _bgmPreDuckVolume = 0;
    var _voActive = false;

    // 战斗音乐状态
    var _savedBgmId = null;
    var _savedBgmVolume = 0;
    var _battleMusicPending = false;
    var _battleIds = ['battle01', 'battle02', 'battle03'];

    // 塔探索音乐状态
    var _savedTowerBgmId = null;
    var _savedTowerBgmVolume = 0;

    // world_17 Ardeacinerea BGM 状态
    var _ardeacinereaActive = false;
    var _ardeacinereaStartTimer = null;
    var _ardeacinereaIntroTimer = null;
    var _ardeacinereaLoopTimer = null;
    var _returnToArdeacinerea = false;

    // 战斗音效状态
    var _comboPitchLevel = 0;
    var _criticalPendingTimer = null;
    var _lastQuickIdx = -1;
    var _quickIds = ['battleQuick1', 'battleQuick2', 'battleQuick3', 'battleQuick4', 'battleQuick5', 'battleQuick6'];
    var _lastHitEnemyIdx = -1;
    var _hitEnemyIds = ['battleHitEnemy1', 'battleHitEnemy2', 'battleHitEnemy3', 'battleHitEnemy4', 'battleHitEnemy5'];
    var _lastRainbowIdx = -1;
    var _rainbowIds = ['battleRainbow1', 'battleRainbow2', 'battleRainbow3', 'battleRainbow4'];
    var _lastQteIdx = -1;
    var _qteIds = ['battleQte1', 'battleQte2', 'battleQte3', 'battleQte4'];

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

        // BGM + UI 音效: 用 <audio> 元素预加载（兼容 file://）
        for (var j = 0; j < bgmList.length; j++) {
            var audio = document.createElement('audio');
            audio.src = bgmList[j].src;
            audio.preload = 'auto';
            audio.loop = bgmList[j].loop !== false;
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

    function playTeleport() {
        var el = document.querySelector('audio[data-bgm-id="battleTeleport"]');
        if (!el) return;
        el.playbackRate = 0.85 + Math.random() * 0.3;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playCombo() {
        var el = document.querySelector('audio[data-bgm-id="battleCombo"]');
        if (!el) return;
        el.playbackRate = 1.0 + _comboPitchLevel * 0.15;
        el.volume = 0.7;
        el.currentTime = 0;
        el.play().catch(function() {});
        if (_comboPitchLevel < 3) _comboPitchLevel++;
    }

    function playCritical() {
        var el = document.querySelector('audio[data-bgm-id="battleCritical"]');
        if (!el) return;
        if (!el.paused) {
            fadeOutAudio('battleCritical', 250);
            if (_criticalPendingTimer) clearTimeout(_criticalPendingTimer);
            _criticalPendingTimer = setTimeout(function() {
                _criticalPendingTimer = null;
                el.playbackRate = 0.9 + Math.random() * 0.2;
                el.volume = 0.6;
                el.currentTime = 0;
                el.play().catch(function() {});
            }, 260);
        } else {
            el.playbackRate = 0.9 + Math.random() * 0.2;
            el.volume = 0.6;
            el.currentTime = 0;
            el.play().catch(function() {});
        }
    }

    function playHit() {
        var el = document.querySelector('audio[data-bgm-id="battleHit"]');
        if (!el) return;
        el.playbackRate = 0.8 + Math.random() * 0.4;
        el.volume = 0.5;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playFail() {
        var el = document.querySelector('audio[data-bgm-id="battleFail"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function stopFail() {
        fadeOutAudio('battleFail', 500);
    }

    function playSuccess() {
        var el = document.querySelector('audio[data-bgm-id="battleSuccess"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function stopSuccess() {
        fadeOutAudio('battleSuccess', 500);
    }

    function playNormal() {
        var el = document.querySelector('audio[data-bgm-id="battleNormal"]');
        if (!el) return;
        el.playbackRate = 0.4 + Math.random() * 1.2;
        el.volume = 0.4;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playPoisonClick() {
        var el = document.querySelector('audio[data-bgm-id="battleNormal"]');
        if (!el) return;
        el.playbackRate = 0.2;
        el.volume = 0.4;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playAnswer1() {
        var el = document.querySelector('audio[data-bgm-id="uiAnswer1"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playAnswer2() {
        var el = document.querySelector('audio[data-bgm-id="uiAnswer2"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playTreasureBox() {
        var el = document.querySelector('audio[data-bgm-id="treasureBox"]');
        if (!el) return;
        el.volume = 0.7;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playQuestion() {
        var el = document.querySelector('audio[data-bgm-id="uiQuestion"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playMenu1() {
        var el = document.querySelector('audio[data-bgm-id="uiMenu1"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playMenu2() {
        var el = document.querySelector('audio[data-bgm-id="uiMenu2"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playSpirit() {
        var el = document.querySelector('audio[data-bgm-id="uiSpirit"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playTreasureMisc() {
        var el = document.querySelector('audio[data-bgm-id="treasureMisc"]');
        if (!el) return;
        el.playbackRate = 0.85 + Math.random() * 0.3;
        el.volume = 0.5;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playRainbow(pitch) {
        var idx;
        if (_lastRainbowIdx < 0) {
            idx = Math.floor(Math.random() * _rainbowIds.length);
        } else {
            idx = Math.floor(Math.random() * (_rainbowIds.length - 1));
            if (idx >= _lastRainbowIdx) idx++;
        }
        _lastRainbowIdx = idx;
        var el = document.querySelector('audio[data-bgm-id="' + _rainbowIds[idx] + '"]');
        if (!el) return;
        el.playbackRate = pitch || 1.0;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playQte() {
        var idx;
        if (_lastQteIdx < 0) {
            idx = Math.floor(Math.random() * _qteIds.length);
        } else {
            idx = Math.floor(Math.random() * (_qteIds.length - 1));
            if (idx >= _lastQteIdx) idx++;
        }
        _lastQteIdx = idx;
        var el = document.querySelector('audio[data-bgm-id="' + _qteIds[idx] + '"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playQteActivate() {
        var el = document.querySelector('audio[data-bgm-id="battleQteActivate"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playFocus() {
        var el = document.querySelector('audio[data-bgm-id="battleFocus"]');
        if (!el) return;
        el.volume = 0.5;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playFocusStage(pitch) {
        var el = document.querySelector('audio[data-bgm-id="treasureMisc"]');
        if (!el) return;
        el.playbackRate = pitch || 1.0;
        el.volume = 0.5;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playChargeRelease() {
        var critEl = document.querySelector('audio[data-bgm-id="battleCritical"]');
        if (critEl) {
            critEl.playbackRate = 1.25;
            critEl.volume = 0.6;
            critEl.currentTime = 0;
            critEl.play().catch(function() {});
        }
        playQuickTap();
    }

    function playLinkStart() {
        var el = document.querySelector('audio[data-bgm-id="battleLinkStart"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playMerge() {
        var el = document.querySelector('audio[data-bgm-id="battleOne"]');
        if (!el) return;
        el.playbackRate = 0.9 + Math.random() * 0.2;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playQuickTap() {
        var idx;
        if (_lastQuickIdx < 0) {
            idx = Math.floor(Math.random() * _quickIds.length);
        } else {
            idx = Math.floor(Math.random() * (_quickIds.length - 1));
            if (idx >= _lastQuickIdx) idx++;
        }
        _lastQuickIdx = idx;
        var el = document.querySelector('audio[data-bgm-id="' + _quickIds[idx] + '"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playHitEnemy() {
        var idx;
        if (_lastHitEnemyIdx < 0) {
            idx = Math.floor(Math.random() * _hitEnemyIds.length);
        } else {
            idx = Math.floor(Math.random() * (_hitEnemyIds.length - 1));
            if (idx >= _lastHitEnemyIdx) idx++;
        }
        _lastHitEnemyIdx = idx;
        var el = document.querySelector('audio[data-bgm-id="' + _hitEnemyIds[idx] + '"]');
        if (!el) return;
        el.volume = 0.5;
        el.currentTime = 0;
        el.play().catch(function() {});
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

    function playUiEnter() {
        var el = document.querySelector('audio[data-bgm-id="uiEnter"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playUiEnter2() {
        var el = document.querySelector('audio[data-bgm-id="uiEnter2"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playUiEnter3() {
        var el = document.querySelector('audio[data-bgm-id="uiEnter3"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playCharacterStep() {
        var el = document.querySelector('audio[data-bgm-id="characterStep"]');
        if (!el) return;
        if (!el.paused) return;
        el.playbackRate = 0.85 + Math.random() * 0.3; // 0.85~1.15 随机变调
        el.volume = 0.3;
        el.currentTime = 0;
        el.play().catch(function() {});
        // 手动循环：每次播完换 pitch 再播
        if (!el._stepLoop) {
            el._stepLoop = true;
            el.addEventListener('ended', function() {
                if (el.paused) return; // 已被 stopCharacterStep 停掉
                el.playbackRate = 0.85 + Math.random() * 0.3;
                el.currentTime = 0;
                el.play().catch(function() {});
            });
        }
    }

    function stopCharacterStep() {
        var el = document.querySelector('audio[data-bgm-id="characterStep"]');
        if (!el) return;
        el.pause();
        el.currentTime = 0;
    }

    function playUiSkip() {
        var el = document.querySelector('audio[data-bgm-id="uiSkip"]');
        if (!el) return;
        el.volume = 0.6;
        el.currentTime = 0;
        el.play().catch(function() {});
    }

    function playVo(id) {
        var el = document.querySelector('audio[data-bgm-id="' + id + '"]');
        if (!el) return;
        el.volume = 0.8;
        el.currentTime = 0;
        el.play().catch(function() {});
        _duckMusic();
        el.addEventListener('ended', _onVoEnd);
    }

    function stopVo(id) {
        var el = document.querySelector('audio[data-bgm-id="' + id + '"]');
        if (!el) return;
        el.pause();
        el.currentTime = 0;
        el.removeEventListener('ended', _onVoEnd);
        _unduckMusic();
    }

    function _duckMusic() {
        if (!_bgmEl || _voActive) return;
        _voActive = true;
        _bgmPreDuckVolume = _bgmEl.volume;
        _bgmEl.volume = _bgmPreDuckVolume * 0.5;
    }

    function _unduckMusic() {
        if (!_bgmEl || !_voActive) return;
        _voActive = false;
        _bgmEl.volume = _bgmPreDuckVolume;
    }

    function _onVoEnd() {
        this.removeEventListener('ended', _onVoEnd);
        _unduckMusic();
    }

    function fadeOutAudio(dataId, fadeMs) {
        var el = document.querySelector('audio[data-bgm-id="' + dataId + '"]');
        if (!el || el.paused) return;
        var startVol = el.volume;
        var step = 50;
        var steps = fadeMs / step;
        var decay = startVol / steps;
        var timer = setInterval(function() {
            el.volume = Math.max(0, el.volume - decay);
            if (el.volume <= 0) {
                clearInterval(timer);
                el.pause();
                el.currentTime = 0;
                el.volume = startVol;
            }
        }, step);
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

    function fadeBgmVolume(targetVolume, durationMs) {
        if (!_bgmEl) return;
        var el = _bgmEl;
        var startVol = _voActive ? _bgmPreDuckVolume : el.volume;
        var step = 50;
        var steps = durationMs / step;
        var decay = (startVol - targetVolume) / steps;
        var timer = setInterval(function() {
            if (_voActive) {
                _bgmPreDuckVolume = Math.max(targetVolume, _bgmPreDuckVolume - decay);
                el.volume = _bgmPreDuckVolume * 0.5;
            } else {
                el.volume = Math.max(targetVolume, el.volume - decay);
            }
            if ((_voActive ? _bgmPreDuckVolume : el.volume) <= targetVolume) clearInterval(timer);
        }, step);
    }

    function stopBgm(fadeMs) {
        if (!_bgmEl) return;
        var el = _bgmEl;
        _bgmEl = null;
        _voActive = false;
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

    // ===== 普通战斗音乐切换 =====

    function enterBattle() {
        if (_ardeacinereaActive) {
            exitArdeacinerea();
            _returnToArdeacinerea = true;
            _savedBgmId = null;
            _savedBgmVolume = 0;
            stopBgm(500);
            _battleMusicPending = true;
            return;
        }
        if (_bgmEl) {
            _savedBgmId = _bgmEl.dataset.bgmId;
            _savedBgmVolume = _bgmEl.volume;
        }
        stopBgm(500);
        _battleMusicPending = true;
    }

    function playBattleBgm() {
        if (!_battleMusicPending) return;
        _battleMusicPending = false;
        var idx = Math.floor(Math.random() * _battleIds.length);
        playBgm(_battleIds[idx], 0.4);
    }

    function endBattle() {
        stopBgm(500);
        _comboPitchLevel = 0;
        if (_criticalPendingTimer) { clearTimeout(_criticalPendingTimer); _criticalPendingTimer = null; }
    }

    function exitBattle() {
        _battleMusicPending = false;
        _comboPitchLevel = 0;
        if (_criticalPendingTimer) { clearTimeout(_criticalPendingTimer); _criticalPendingTimer = null; }
        if (_returnToArdeacinerea) {
            enterArdeacinerea();
            _returnToArdeacinerea = false;
            return;
        }
        if (_savedBgmId) {
            playBgm(_savedBgmId, _savedBgmVolume);
            _savedBgmId = null;
            _savedBgmVolume = 0;
        } else {
            playBgm('shuhanTheme', 0.32);
        }
    }

    function restartBattle() {
        _battleMusicPending = true;
    }

    // ===== 塔探索音乐切换 =====

    function enterTower() {
        if (_ardeacinereaActive) {
            exitArdeacinerea();
            _returnToArdeacinerea = true;
            _savedTowerBgmId = null;
            _savedTowerBgmVolume = 0;
            stopBgm(500);
            playBgm('towerExplore', 0.4);
            return;
        }
        if (_bgmEl) {
            _savedTowerBgmId = _bgmEl.dataset.bgmId;
            _savedTowerBgmVolume = _bgmEl.volume;
        }
        stopBgm(500);
        playBgm('towerExplore', 0.4);
    }

    function exitTower() {
        _battleMusicPending = false;
        _savedBgmId = null;
        _savedBgmVolume = 0;
        stopBgm(500);
        if (_returnToArdeacinerea) {
            enterArdeacinerea();
            _returnToArdeacinerea = false;
            return;
        }
        if (_savedTowerBgmId) {
            playBgm(_savedTowerBgmId, _savedTowerBgmVolume);
            _savedTowerBgmId = null;
            _savedTowerBgmVolume = 0;
        } else {
            playBgm('shuhanTheme', 0.32);
        }
    }

    // ===== world_17 赛博埃及·冥境 BGM =====

    function enterArdeacinerea() {
        if (_ardeacinereaActive) return;
        _ardeacinereaActive = true;
        stopBgm(500);
        _ardeacinereaStartTimer = setTimeout(function() {
            _ardeacinereaStartTimer = null;
            var introEl = document.querySelector('audio[data-bgm-id="ardeacinerea"]');
            if (!introEl) { _ardeacinereaActive = false; return; }
            introEl.volume = 0.6;
            introEl.currentTime = 0;
            introEl.play().catch(function() { _ardeacinereaActive = false; });
            _ardeacinereaIntroTimer = setTimeout(function() {
                _ardeacinereaIntroTimer = null;
                if (!_ardeacinereaActive) return;
                introEl.pause();
                introEl.currentTime = 0;
                var loopEl = document.querySelector('audio[data-bgm-id="ardeacinereaLoop"]');
                if (!loopEl) return;
                loopEl.volume = 0.6;
                loopEl.currentTime = 0;
                loopEl.play().catch(function() {});
                _ardeacinereaLoopTimer = setTimeout(function() {
                    if (!_ardeacinereaActive) return;
                    _ardeacinereaLoopTimer = setInterval(function() {
                        if (!_ardeacinereaActive) { clearInterval(_ardeacinereaLoopTimer); _ardeacinereaLoopTimer = null; return; }
                        loopEl.currentTime = 0;
                        loopEl.play().catch(function() {});
                    }, 87627);
                }, 87627);
            }, 22843);
        }, 500);
    }

    function exitArdeacinerea() {
        if (!_ardeacinereaActive) return;
        _ardeacinereaActive = false;
        if (_ardeacinereaStartTimer) { clearTimeout(_ardeacinereaStartTimer); _ardeacinereaStartTimer = null; }
        if (_ardeacinereaIntroTimer) { clearTimeout(_ardeacinereaIntroTimer); _ardeacinereaIntroTimer = null; }
        if (_ardeacinereaLoopTimer) {
            clearTimeout(_ardeacinereaLoopTimer);
            clearInterval(_ardeacinereaLoopTimer);
            _ardeacinereaLoopTimer = null;
        }
        fadeOutAudio('ardeacinerea', 500);
        fadeOutAudio('ardeacinereaLoop', 500);
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
        fadeBgmVolume: fadeBgmVolume,
        stopBgm: stopBgm,
        playClick: playClick,
        playMenuClick: playMenuClick,
        playTowerClick: playTowerClick,
        playTowerExit: playTowerExit,
        playTeleport: playTeleport,
        playCombo: playCombo,
        playCritical: playCritical,
        playHit: playHit,
        playQuickTap: playQuickTap,
        playHitEnemy: playHitEnemy,
        playRainbow: playRainbow,
        playQte: playQte,
        playQteActivate: playQteActivate,
        playFocus: playFocus,
        playFocusStage: playFocusStage,
        playChargeRelease: playChargeRelease,
        playLinkStart: playLinkStart,
        playMerge: playMerge,
        playFail: playFail,
        stopFail: stopFail,
        playSuccess: playSuccess,
        stopSuccess: stopSuccess,
        playNormal: playNormal,
        playPoisonClick: playPoisonClick,
        playTreasureBox: playTreasureBox,
        playQuestion: playQuestion,
        playMenu1: playMenu1,
        playMenu2: playMenu2,
        playSpirit: playSpirit,
        playAnswer1: playAnswer1,
        playAnswer2: playAnswer2,
        playTreasureMisc: playTreasureMisc,
        playBackpack: playBackpack,
        playMonsterDefeat: playMonsterDefeat,
        playMeteor: playMeteor,
        playDodgeHeal: playDodgeHeal,
        playPetAttack: playPetAttack,
        playMeteorImpact: playMeteorImpact,
        playMonsterDodge: playMonsterDodge,
        playUiEnter: playUiEnter,
        playUiEnter2: playUiEnter2,
        playUiEnter3: playUiEnter3,
        playCharacterStep: playCharacterStep,
        stopCharacterStep: stopCharacterStep,
        playUiSkip: playUiSkip,
        playVo: playVo,
        stopVo: stopVo,
        fadeOutAudio: fadeOutAudio,
        enterBattle: enterBattle,
        playBattleBgm: playBattleBgm,
        endBattle: endBattle,
        exitBattle: exitBattle,
        restartBattle: restartBattle,
        enterTower: enterTower,
        exitTower: exitTower,
        enterArdeacinerea: enterArdeacinerea,
        exitArdeacinerea: exitArdeacinerea,
        destroy: destroy
    };
}

export { createAudioSystem };
