/**
 * CaptureSystem — 收服系统（P0）
 * 点击收服灵光（capture star）尝试收服器灵/古灵
 * 仅在 Boss 战或古灵 HP 低于阈值时可触发
 */
import Logger from '../utils/Logger.js';

var CAPTURE_STAR_TYPE = {
    id: 'capture',
    name: '收服灵光',
    emoji: '⛓️',
    description: '收服器灵：点击尝试捕获当前古灵',
    multiplier: 0
};

// 收服率配置
var CAPTURE_CONFIG = {
    baseRate: 0.05,           // 基础收服率 5%
    lowHpBonus: 0.15,         // HP < 30% 时额外 +15%
    midHpBonus: 0.08,         // HP < 50% 时额外 +8%
    perfectBonus: 0.10,       // 完美点击额外 +10%
    superQuickBonus: 0.15,    // 超速点击额外 +15%
    rarityModifiers: {        // 稀有度修正
        'N': 0.10, 'R': 0.05, 'SR': 0.00,
        'SSR': -0.08, 'UR': -0.15, 'LR': -0.25, 'SP': -0.35
    },
    spawnChance: 0.08,        // Boss 战中每颗星有 8% 概率变成收服灵光
    minHpThreshold: 0.5       // 古灵 HP 低于 50% 才能出现
};

function createCaptureSystem(deps) {
    var getPlayerData = deps.getPlayerData;
    var getMonsters = deps.getMonsters;
    var addMessage = deps.addMessage;
    var saveData = deps.saveData;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;

    var lastCaptureAttempt = 0;
    var captureCooldown = 15000;  // 15秒冷却

    /**
     * 检查是否应该生成收服灵光
     * @param {Object} activeMonster — 当前活跃古灵
     * @returns {boolean}
     */
    function shouldSpawnCaptureStar(activeMonster) {
        if (!activeMonster || !activeMonster.active) return false;
        if (activeMonster.type === 'star_thief') return false;  // 窃灵者不可收服
        if (activeMonster.type === 'star_devourer') return false; // 灵脉吞噬者不可收服

        var maxHp = activeMonster.maxHp || activeMonster.baseHp || 100;
        var hpRatio = (activeMonster.hp || 0) / maxHp;
        if (hpRatio > CAPTURE_CONFIG.minHpThreshold) return false;

        if (Date.now() - lastCaptureAttempt < captureCooldown) return false;

        return Math.random() < CAPTURE_CONFIG.spawnChance;
    }

    /**
     * 生成收服灵光
     * @returns {Object|null} star object
     */
    function spawnCaptureStar() {
        var screenW = getScreenWidth();
        var screenH = getScreenHeight();
        var padding = 60;

        var star = {
            x: padding + Math.random() * (screenW - padding * 2),
            y: screenH * 0.65 + Math.random() * (screenH * 0.2),
            size: 48,
            scale: 1,
            animationFrame: 0,
            type: 'capture',
            visible: true,
            createTime: Date.now(),
            disappearTime: Date.now() + 5000,
            isCaptureStar: true
        };
        return star;
    }

    /**
     * 计算收服率
     * @param {Object} monster
     * @param {Object} playerData
     * @param {Object} tapInfo — { isPerfect, isSuperQuick }
     * @returns {number} 0~1
     */
    function calculateCaptureRate(monster, playerData, tapInfo) {
        var rate = CAPTURE_CONFIG.baseRate;
        var maxHp = monster.maxHp || monster.baseHp || 100;
        var hpRatio = monster.hp / maxHp;

        // HP 奖励
        if (hpRatio <= 0.3) rate += CAPTURE_CONFIG.lowHpBonus;
        else if (hpRatio <= 0.5) rate += CAPTURE_CONFIG.midHpBonus;

        // 点击奖励
        if (tapInfo && tapInfo.isSuperQuick) rate += CAPTURE_CONFIG.superQuickBonus;
        else if (tapInfo && tapInfo.isPerfect) rate += CAPTURE_CONFIG.perfectBonus;

        // 稀有度修正
        var rarityMod = CAPTURE_CONFIG.rarityModifiers[monster.rarity] || 0;
        rate += rarityMod;

        // 装备/技能加成（预留）
        if (playerData.captureBonus) rate += playerData.captureBonus;

        return Math.max(0.01, Math.min(0.95, rate));
    }

    /**
     * 尝试收服
     * @param {Object} monster
     * @param {Object} playerData
     * @param {Object} tapInfo
     * @returns {{ success: boolean, rate: number, capturedSpirit: Object|null }}
     */
    function attemptCapture(monster, playerData, tapInfo) {
        lastCaptureAttempt = Date.now();
        var rate = calculateCaptureRate(monster, playerData, tapInfo || {});
        var roll = Math.random();
        var success = roll < rate;

        Logger.info('[Capture] 收服尝试: ' + monster.name +
            ' 收服率=' + (rate * 100).toFixed(1) + '% roll=' + (roll * 100).toFixed(1) + '% success=' + success);

        if (success) {
            var spirit = _createCapturedSpirit(monster);
            _addSpiritToInventory(spirit, playerData);
            return { success: true, rate: rate, capturedSpirit: spirit };
        }
        return { success: false, rate: rate, capturedSpirit: null };
    }

    function _createCapturedSpirit(monster) {
        return {
            uid: 'spirit_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            id: monster.id,
            name: monster.name,
            rarity: monster.rarity,
            emoji: monster.emoji || '👻',
            baseHp: monster.baseHp || monster.hp || 100,
            baseAttack: monster.baseAttack || 10,
            baseDefense: monster.baseDefense || 0,
            skills: monster.skills ? JSON.parse(JSON.stringify(monster.skills)) : [],
            capturedAt: Date.now(),
            level: 1,
            exp: 0
        };
    }

    function _addSpiritToInventory(spirit, playerData) {
        if (!playerData.capturedSpirits) playerData.capturedSpirits = [];
        // 检查是否已存在同 ID
        var exists = false;
        for (var i = 0; i < playerData.capturedSpirits.length; i++) {
            if (playerData.capturedSpirits[i].id === spirit.id) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            playerData.capturedSpirits.push(spirit);
            Logger.info('[Capture] 收服成功: ' + spirit.name + ' (' + spirit.rarity + ') uid=' + spirit.uid);
        } else {
            Logger.info('[Capture] ' + spirit.name + ' 已拥有，跳过重复添加');
        }
        saveData();
    }

    /**
     * 处理收服灵光点击
     * @param {Object} star — the capture star
     * @param {Object} monster — current active monster
     * @param {Object} tapInfo
     * @returns {{ handled: boolean, success: boolean, rate: number, message: string }}
     */
    function handleCaptureStarClick(star, monster, tapInfo) {
        if (!monster || !monster.active) {
            addMessage('没有可收服的古灵', '#ff8866', true);
            return { handled: true, success: false, rate: 0 };
        }

        var pd = getPlayerData();
        var result = attemptCapture(monster, pd, tapInfo);

        if (result.success) {
            var rarityColors = {
                'N': '#aaaaaa', 'R': '#4A90D9', 'SR': '#9B59B6',
                'SSR': '#FFD700', 'UR': '#E74C3C', 'LR': '#FF6B9D', 'SP': '#00D4FF'
            };
            var color = rarityColors[monster.rarity] || '#ffcc00';
            addMessage('收服成功！获得 ' + monster.emoji + monster.name + '！', color, true);
            // 净化古灵（收服即净化）
            monster.hp = 0;
        } else {
            addMessage('收服失败！(' + (result.rate * 100).toFixed(0) + '%) ' + monster.name + ' 挣脱了！', '#ff4444', true);
            // 失败惩罚：古灵小幅回血
            if (monster.hp > 0 && monster.maxHp) {
                var healAmt = Math.floor(monster.maxHp * 0.05);
                monster.hp = Math.min(monster.maxHp, monster.hp + healAmt);
                addMessage(monster.name + ' 恢复 ' + healAmt + '灵能', '#ff8866', true);
            }
        }

        return {
            handled: true,
            success: result.success,
            rate: result.rate
        };
    }

    function getCapturedSpirits(playerData) {
        return (playerData && playerData.capturedSpirits) || [];
    }

    function isCaptureStar(star) {
        return star && (star.type === 'capture' || star.isCaptureStar);
    }

    return {
        CAPTURE_STAR_TYPE: CAPTURE_STAR_TYPE,
        CAPTURE_CONFIG: CAPTURE_CONFIG,
        shouldSpawnCaptureStar: shouldSpawnCaptureStar,
        spawnCaptureStar: spawnCaptureStar,
        calculateCaptureRate: calculateCaptureRate,
        attemptCapture: attemptCapture,
        handleCaptureStarClick: handleCaptureStarClick,
        getCapturedSpirits: getCapturedSpirits,
        isCaptureStar: isCaptureStar
    };
}

export { CAPTURE_STAR_TYPE, CAPTURE_CONFIG, createCaptureSystem };