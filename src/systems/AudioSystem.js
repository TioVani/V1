/**
 * 音频系统（Audio System）
 * 闭包工厂 + 依赖注入模式
 * 使用 Web Audio API 实现变调点击音效
 */

import { createWebAudioContext, getFileSystemManager, env } from '../platform/BrowserAPI.js';

function createAudioSystem() {
    var ctx = null;
    var clickBuffer = null;
    var menuClickBuffer = null;
    var towerClickBuffer = null;
    var backpackBuffer = null;
    var monsterHitBuffer = null;
    var meteorBuffer = null;
    var meteorIceBuffer = null;
    var dodgeHealBuffer = null;
    var petAttackBuffer = null;
    var meteorImpactBuffer = null;
    var monsterDodgeBuffer = null;

    function init() {
        try {
            ctx = createWebAudioContext();
        } catch (e) {
            return;
        }
        if (!ctx) return;

        _loadBuffer('assets/audio/click.mp3', function(buf) { clickBuffer = buf; });
        _loadBuffer('assets/audio/menu_S.wav', function(buf) { menuClickBuffer = buf; });
        _loadBuffer('assets/audio/tower_click.mp3', function(buf) { towerClickBuffer = buf; });
        _loadBuffer('assets/audio/backpack_click.mp3', function(buf) { backpackBuffer = buf; });
        _loadBuffer('assets/audio/monster_hit.mp3', function(buf) { monsterHitBuffer = buf; });
        _loadBuffer('assets/audio/meteor.mp3', function(buf) { meteorBuffer = buf; });
        _loadBuffer('assets/audio/meteor_ice.mp3', function(buf) { meteorIceBuffer = buf; });
        _loadBuffer('assets/audio/dodge_heal.mp3', function(buf) { dodgeHealBuffer = buf; });
        _loadBuffer('assets/audio/pet_attack.mp3', function(buf) { petAttackBuffer = buf; });
        _loadBuffer('assets/audio/meteor_impact.mp3', function(buf) { meteorImpactBuffer = buf; });
        _loadBuffer('assets/audio/monster_dodge.mp3', function(buf) { monsterDodgeBuffer = buf; });
    }

function _loadBuffer(src, callback) {
        var url = src.charAt(0) === '/' ? src : '/' + src;
        fetch(url).then(function(r) { return r.ok ? r.arrayBuffer() : null; })
            .then(function(data) { if (data) ctx.decodeAudioData(data, callback, function() {}); })
            .catch(function() {});
    }

    // playbackRate 0.85~1.15 随机变调，听起来有变化但不突兀
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
        _play(clickBuffer, 0.85, 1.15, 0.5);
    }

    function playMenuClick() {
        _play(menuClickBuffer, 1, 1, 0.5);
    }

    function playTowerClick() {
        _play(towerClickBuffer, 0.9, 1.1, 0.5);
    }

    function playTowerExit() {
        _play(towerClickBuffer, 0.65, 0.75, 0.5);
    }

    function playBackpack() {
        _play(backpackBuffer, 0.85, 1.15, 0.8);
    }

    function playMonsterDefeat() {
        _play(monsterHitBuffer, 0.75, 1.25, 0.5);
    }

    function playMeteor(starType) {
        var buf = (starType === 'ice') ? meteorIceBuffer : meteorBuffer;
        _play(buf, 0.9, 1.1, 0.1);
    }

    function playDodgeHeal() {
        _play(dodgeHealBuffer, 0.9, 1.1, 0.5);
    }

    function playPetAttack() {
        _play(petAttackBuffer, 0.6, 1.4, 0.3);
    }

    function playMeteorImpact() {
        _play(meteorImpactBuffer, 0.85, 1.15, 0.5);
    }

    function playMonsterDodge() {
        _play(monsterDodgeBuffer, 0.9, 1.1, 0.2);
    }

    function destroy() {
        if (ctx) { ctx.close(); ctx = null; }
        clickBuffer = null;
        menuClickBuffer = null;
        towerClickBuffer = null;
        backpackBuffer = null;
        monsterHitBuffer = null;
        meteorBuffer = null;
        meteorIceBuffer = null;
        dodgeHealBuffer = null;
        petAttackBuffer = null;
        meteorImpactBuffer = null;
        monsterDodgeBuffer = null;
    }

    return {
        init: init,
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
