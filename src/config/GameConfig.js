/**
 * 游戏核心配置
 * 包含 CONFIG、BOSS_BATTLE_CONFIG、MockLeaderboardData
 */

import { STAGES } from './StageConfig.js';

// 游戏核心数值配置
const CONFIG = {
    monsterAppearScore: 60,      // 出现邪灵的灵辉值
    bossKillCount: 8,            // 净化多少邪灵后出现守护灵
    bossKillReward: 20,          // 净化守护灵获得的灵辉奖励
    starUnlockScore: 50,         // 解锁玉蝉仙的灵辉值
    warriorUnlockScore: 200,     // 解锁鼎魂的灵辉值
    timeBonusSlime: 8,           // 邪灵奖励时间
    timeBonusBoss: 15,           // 守护灵奖励时间
    slimeBaseHp: 50,             // 邪灵基础HP
    bossHp: 150,                 // @deprecated 守护灵 HP — 使用 MonsterConfig.slime_king.baseHp (800) 作为活跃值
    iceCrystalDropRate: 1.0,     // 守护灵掉落水灵晶率（100%）
    critCrystalDropRate: 0.008,  // 守护灵掉落水灵暴晶率（0.8%）
    critFireSourceDropRate: 0.008,  // 守护灵掉落火灵爆源率（0.8%）
    iceStarBaseMultiplier: 3.0,  // 水灵星基础分数倍数
    iceStarLevelBonus: 0.05,     // 每级水灵星加成（5%）
    maxIceStarLevel: 10,         // 水灵星最高等级
    iceCrystalUpgradeCost: 5,    // 升级水灵星消耗水灵晶数
    iceCrystalAttackBonus: 1     // 每颗水灵晶的攻击加成
};

// 守护灵战配置
const BOSS_BATTLE_CONFIG = {
    baseTime: 60,               // 基础时间60秒
    starSpawnRate: 600,         // 灵光生成间隔（与随机模式统一）
    comboTimeout: 1500          // 连击超时
};

// 灵光系统常量
const BASE_STAR_INTERVAL = 350;   // 基础灵光生成间隔
const MIN_STAR_INTERVAL = 300;    // 最小灵光生成间隔

// 闪避系统常量
const DODGE_DURATION = 1000;              // 闪避持续1秒
const DODGE_STAR_SPAWN_INTERVAL = 1200;   // 闪避灵光生成间隔：1.2秒
const DODGE_STAR_LIFETIME = 1000;         // 闪避灵光存在时间：1秒

// 怪物吸收常量
const MONSTER_ABSORB_SCORE = 2000;  // 2000分后怪物开始吸收灵光
const MONSTER_ARMOR_GAIN = 5;       // 吸收水灵星获得护甲值
const MONSTER_HP_GAIN = 20;         // 吸收火灵星获得生命值
const MONSTER_DAMAGE_GAIN = 3;      // 吸收基础灵光获得攻击力加成

// 游戏时间常量
const NORMAL_GAME_TIME = 30;        // 普通模式初始时间（秒）
const TIME_STAR_MIN_TIME = 30;      // 时序星技能保留的最小时间（秒）

// 灵脉吞噬者逃跑机制
const STAR_DEVOURER_ESCAPE_HP_RATIO = 0.3;  // 血量低于30%时触发逃跑

// 贪婪灵光常量
const GREEDY_SKILL_THRESHOLD = 20;  // 解锁技能所需累计扣血

// 连击灵光常量
const COMBO_STAR_DURATION = 5000;   // 持续5秒
const COMBO_STAR_INTERVAL = 200;    // 每0.2秒攻击一次

// 技能栏常量
const SKILL_SLOT_SIZE = 50;         // 技能槽大小
const MAX_ACTIVE_SKILLS = 2;        // 最多同时激活2个主动技能

// 稀有度颜色映射（全局共享）
var RARITY_COLORS = Object.freeze({
    UC: '#7CCD7C',
    N: '#aaaaaa',
    R: '#4A90D9',
    SR: '#9B59B6',
    SSR: '#FFD700',
    UR: '#E74C3C',
    LR: '#FF6B9D',
    SP: '#00D4FF'
});

// 返回按钮常量
const BACK_BTN_WIDTH = 58;
const BACK_BTN_HEIGHT = 29;
const BACK_BTN_COLOR = '#87CEEB';

// ==================== 怪物觉醒系统配置 ====================
var AWAKE_CONFIG = {
    threshold: 25,              // 25级开始缩放
    hpGrowthRate: 0.05,         // 每级HP指数+5%（修正自0.15，防止Lv30+Boss无法击杀）
    atkGrowthRate: 0.04,        // 每级攻击指数+4%
    scoreGrowthRate: 0.02,      // 每级分数指数+2%（修正自0.05，防止分数膨胀）
    stages: [
        { level: 30, name: '觉醒I',   mark: '🛡️', effect: 'armor',  value: 0.15 },
        { level: 40, name: '觉醒II',  mark: '🔥', effect: 'rage',   value: 0.5  },
        { level: 50, name: '觉醒III', mark: '💨', effect: 'dodge',  value: 0.15 },
        { level: 60, name: '觉醒IV',  mark: '🧊', effect: 'resist', value: 0.5  }
    ],
    dropTierInterval: 5,        // 每5级一个掉落阶梯
    dropRatePerTier: 0.15,      // 每阶梯+15%掉率
    bossExtraDropPerTiers: 2    // 每2个阶梯Boss多掉1个材料
};

function _getCharLevel(playerData) {
    var charId = playerData.currentCharacterId;
    if (charId && playerData.characterExperience && playerData.characterExperience[charId]) {
        return playerData.characterExperience[charId].level || 1;
    }
    return 1;
}

function getPlayerHpScaling(playerData) {
    var level = _getCharLevel(playerData);
    if (level <= AWAKE_CONFIG.threshold) return 1;
    return Math.pow(1 + AWAKE_CONFIG.hpGrowthRate, level - AWAKE_CONFIG.threshold);
}

function getPlayerAtkScaling(playerData) {
    var level = _getCharLevel(playerData);
    if (level <= AWAKE_CONFIG.threshold) return 1;
    return Math.pow(1 + AWAKE_CONFIG.atkGrowthRate, level - AWAKE_CONFIG.threshold);
}

function getPlayerScoreScaling(playerData) {
    var level = _getCharLevel(playerData);
    if (level <= AWAKE_CONFIG.threshold) return 1;
    return Math.pow(1 + AWAKE_CONFIG.scoreGrowthRate, level - AWAKE_CONFIG.threshold);
}

function getAwakeStage(playerData) {
    var level = _getCharLevel(playerData);
    var result = [];
    for (var i = 0; i < AWAKE_CONFIG.stages.length; i++) {
        if (level >= AWAKE_CONFIG.stages[i].level) {
            result.push(AWAKE_CONFIG.stages[i]);
        }
    }
    return result;
}

function getDropTier(playerData) {
    var level = _getCharLevel(playerData);
    if (level <= AWAKE_CONFIG.threshold) return 0;
    return Math.floor((level - AWAKE_CONFIG.threshold) / AWAKE_CONFIG.dropTierInterval);
}

// ==================== 玩法渐进解锁配置 ====================
var MODE_UNLOCK = {
    backpack:    { condition: 'none' },
    shop:        { condition: 'none' },
    leaderboard: { condition: 'none' },
    stage:       { condition: 'none' },
    season:      { condition: 'bestScore', value: 200, hint: '最高分达到200解锁' },
    boss:        { condition: 'bestScore', value: 2000, hint: '最高分达到2000解锁' },
    tower:       { condition: 'bestScore', value: 3000, hint: '最高分达到3000解锁' }
};

function isModeUnlocked(modeId, playerData, bestScore) {
    var config = MODE_UNLOCK[modeId];
    if (!config || config.condition === 'none') return { unlocked: true };

    // 优先检查 saveData 中的解锁标记（来自大地图实体交互）
    if (modeId === 'tower' && playerData && playerData.towerUnlocked) {
        return { unlocked: true };
    }

    if (config.condition === 'bestScore') {
        if ((bestScore || 0) >= config.value) return { unlocked: true };
        return { unlocked: false, hint: config.hint };
    }
    if (config.condition === 'stageChapter') {
        var stageProgress = playerData.stageProgress || {};
        var maxChapter = 0;
        var keys = Object.keys(stageProgress);
        for (var i = 0; i < keys.length; i++) {
            var stageConfig = STAGES[keys[i]];
            if (stageConfig && stageConfig.chapter > maxChapter) maxChapter = stageConfig.chapter;
        }
        if (maxChapter >= config.value) return { unlocked: true };
        return { unlocked: false, hint: config.hint };
    }
    return { unlocked: true };
}

export {
    CONFIG, BOSS_BATTLE_CONFIG,
    BASE_STAR_INTERVAL, MIN_STAR_INTERVAL,
    DODGE_DURATION, DODGE_STAR_SPAWN_INTERVAL, DODGE_STAR_LIFETIME,
    MONSTER_ABSORB_SCORE, MONSTER_ARMOR_GAIN,
    MONSTER_HP_GAIN, MONSTER_DAMAGE_GAIN,
    NORMAL_GAME_TIME, TIME_STAR_MIN_TIME,
    STAR_DEVOURER_ESCAPE_HP_RATIO,
    GREEDY_SKILL_THRESHOLD,
    COMBO_STAR_DURATION, COMBO_STAR_INTERVAL,
    SKILL_SLOT_SIZE, MAX_ACTIVE_SKILLS,
    RARITY_COLORS,
    BACK_BTN_WIDTH, BACK_BTN_HEIGHT, BACK_BTN_COLOR,
    MODE_UNLOCK, isModeUnlocked,
    AWAKE_CONFIG, getPlayerHpScaling, getPlayerAtkScaling, getPlayerScoreScaling, getAwakeStage, getDropTier
};
