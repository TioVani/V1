import Logger from '../utils/Logger.js';
import { vibrateShort, showToast } from '../platform/BrowserAPI.js';
/**
 * 抽卡系统（Gacha System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

// ==================== 配置常量 ====================

const GACHA_POOL_TYPES = {
    STARS: 'stars',
    PETS: 'pets',
    CHARACTERS: 'characters',
    SKILLS: 'skills'
};

const GACHA_POOL_ROTATION_DAYS = 14;

// ==================== 动态池配置 ====================

// 稀有度 → 默认权重映射
var RARITY_WEIGHT_MAP = {
    'UC': 30,       // 粗品
    'N': 40,        // 凡品
    'R': 20,        // 良品
    'SR': 8,        // 珍品
    'SSR': 3,       // 瑰宝
    'UR': 0.3,      // 国宝
    'LR': 0.05,     // 传世
    'SP': 0.01      // 镇馆之宝
};

// 排除列表：不在池中出现的物品
var POOL_EXCLUSIONS = {
    characters: ['char_001'],  // 玉蝉仙，默认拥有
    pets: [],
    stars: []  // 由 gacha 标记控制
};

// 单个物品权重覆盖（可选，优先于默认映射）
var WEIGHT_OVERRIDES = {
    characters: {},
    pets: {},
    stars: {
        ice: 25, fire: 20, thunder: 20, earth: 15, wind: 15,
        light: 10, dark: 10, golden: 8,
        holy: 3, shadow: 3, rainbow: 2, crystal: 1,
        meteor: 0.5, cosmic: 0.3
    }
};

const GACHA_ANIMATION_CONFIG = {
    flyingDuration: 1200,
    revealDelay: 150,
    starSize: 60,
    glowPulseSpeed: 0.005,
    rarities: {
        UC: { color: '#7CCD7C', glow: '#A8E6A8', name: '粗品' },
        N: { color: '#AAAAAA', glow: '#CCCCCC', name: '凡品' },
        R: { color: '#4A90D9', glow: '#6BB3FF', name: '良品' },
        SR: { color: '#9B59B6', glow: '#BB77DD', name: '珍品' },
        SSR: { color: '#F39C12', glow: '#FFD700', name: '瑰宝' },
        UR: { color: '#E74C3C', glow: '#FFD700', name: '国宝' },
        LR: { color: '#FF6B9D', glow: '#C084FC', name: '传世' },
        SP: { color: '#00D4FF', glow: '#8B5CF6', name: '镇馆之宝' }
    }
};

const GACHA_POOLS = {
    stars: {
        name: '灵光唤灵', emoji: '⭐', description: '抽取稀有灵光类型',
        singlePrice: 30, tenPrice: 270, currency: 'starSource',
        items: [],
        pity: { sr: 10, ssr: 50 },
        dynamic: true
    },
    pets: {
        name: '灵兽召唤', emoji: '🐾', description: '抽取灵兽伙伴',
        singlePrice: 50, tenPrice: 450, currency: 'starSource',
        items: [],
        pity: { sr: 10, ssr: 50 },
        dynamic: true
    },
    characters: {
        name: '角色召唤', emoji: '👤', description: '抽取强力角色',
        singlePrice: 100, tenPrice: 900, currency: 'starSource',
        items: [],
        pity: { sr: 10, ssr: 50 },
        dynamic: true
    },
    skills: {
        name: '技能召唤', emoji: '✨', description: '抽取强力技能',
        singlePrice: 50, tenPrice: 450, currency: 'starSource',
        items: [],
        pity: { sr: 10, ssr: 50 },
        dynamic: true
    }
};

const STAR_CHEST_REWARDS = [
    { id: 'star_single', name: '灵光单唤券', emoji: '⭐', pool: 'stars', count: 1, weight: 20 },
    { id: 'star_ten', name: '灵光共鸣券', emoji: '🌟', pool: 'stars', count: 10, weight: 5 },
    { id: 'pet_single', name: '灵兽单唤券', emoji: '🐾', pool: 'pets', count: 1, weight: 18 },
    { id: 'pet_ten', name: '灵兽共鸣券', emoji: '🦊', pool: 'pets', count: 10, weight: 4 },
    { id: 'char_single', name: '角色单唤券', emoji: '👤', pool: 'characters', count: 1, weight: 15 },
    { id: 'char_ten', name: '角色共鸣券', emoji: '🎭', pool: 'characters', count: 10, weight: 3 },
    { id: 'skill_single', name: '技能单唤券', emoji: '✨', pool: 'skills', count: 1, weight: 18 },
    { id: 'skill_ten', name: '技能共鸣券', emoji: '💫', pool: 'skills', count: 10, weight: 4 }
];

const STAR_CHEST_DROP_RATE = 0.08;

// ==================== 闭包工厂 ====================

function createGachaSystem(deps) {
    // 依赖注入
    var getPlayerData = deps.getPlayerData;
    var saveData = deps.saveData;
    var getSkills = deps.getSkills;
    var getCharacters = deps.getCharacters;
    var getPets = deps.getPets;
    var getStarTypes = deps.getStarTypes;
    var setGameState = deps.setGameState;
    var getGameState = deps.getGameState;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;

    // ==================== 动态池构建 ====================

    function buildDynamicPool(poolType) {
        var exclusions = POOL_EXCLUSIONS[poolType] || [];
        var overrides = WEIGHT_OVERRIDES[poolType] || {};
        var items = [];

        if (poolType === 'characters') {
            var Characters = getCharacters();
            for (var key in Characters) {
                var ch = Characters[key];
                if (!ch.id || !ch.rarity) continue;
                if (exclusions.indexOf(ch.id) !== -1) continue;
                items.push({
                    id: ch.id,
                    name: ch.name,
                    rarity: ch.rarity,
                    weight: overrides[ch.id] || RARITY_WEIGHT_MAP[ch.rarity] || 1
                });
            }
        } else if (poolType === 'pets') {
            var Pets = getPets();
            for (var key in Pets) {
                var pet = Pets[key];
                if (!pet.id || !pet.rarity) continue;
                if (exclusions.indexOf(pet.id) !== -1) continue;
                items.push({
                    id: pet.id,
                    name: pet.name,
                    rarity: pet.rarity,
                    weight: overrides[pet.id] || RARITY_WEIGHT_MAP[pet.rarity] || 1
                });
            }
        } else if (poolType === 'stars') {
            var starTypes = getStarTypes();
            for (var i = 0; i < starTypes.length; i++) {
                var star = starTypes[i];
                if (!star.gacha || !star.rarity) continue;
                if (exclusions.indexOf(star.id) !== -1) continue;
                items.push({
                    id: star.id,
                    name: star.name,
                    rarity: star.rarity,
                    weight: overrides[star.id] || RARITY_WEIGHT_MAP[star.rarity] || 1
                });
            }
        }

        return items;
    }

    function getPoolItems(poolType) {
        var pool = GACHA_POOLS[poolType];
        if (!pool) return [];
        if (pool.dynamic && (poolType === 'characters' || poolType === 'pets' || poolType === 'stars')) {
            return buildDynamicPool(poolType);
        }
        return pool.items;
    }

    // ==================== 内部状态 ====================
    var currentPool = GACHA_POOL_TYPES.SKILLS;
    var poolStartTime = Date.now();
    var pityCount = {
        stars: { sr: 0, ssr: 0, ur: 0 },
        pets: { sr: 0, ssr: 0, ur: 0 },
        characters: { sr: 0, ssr: 0, ur: 0 },
        skills: { sr: 0, ssr: 0, ur: 0 }
    };
    var animationState = {
        active: false,
        phase: 'idle',
        results: [],
        poolType: 'stars',
        flyingStar: null,
        revealedStars: [],
        currentRevealIndex: 0,
        startTime: 0,
        lastRevealTime: 0,
        previousState: null
    };

    // ==================== 内部函数 ====================

    function getGachaPoolRemainingDays() {
        var elapsed = Date.now() - poolStartTime;
        var elapsedDays = Math.floor(elapsed / (1000 * 60 * 60 * 24));
        return Math.max(0, GACHA_POOL_ROTATION_DAYS - elapsedDays);
    }

    function checkGachaPoolRotation() {
        var remaining = getGachaPoolRemainingDays();
        if (remaining <= 0) {
            var poolTypes = Object.values(GACHA_POOL_TYPES);
            var currentIndex = poolTypes.indexOf(currentPool);
            var nextIndex = (currentIndex + 1) % poolTypes.length;
            currentPool = poolTypes[nextIndex];
            poolStartTime = Date.now();
            Logger.info('卡池已轮换为:', currentPool);
        }
    }

    function getURProbability(pullsSinceLastUR) {
        if (pullsSinceLastUR <= 50) {
            return 0.0029;
        } else if (pullsSinceLastUR <= 100) {
            return 0.0029 + (pullsSinceLastUR - 50) * 0.003;
        } else {
            return 0.0029 + 50 * 0.003 + (pullsSinceLastUR - 100) * 0.005;
        }
    }

    function drawOneFromPool(poolType) {
        var pool = GACHA_POOLS[poolType];
        var pity = pityCount[poolType] || { sr: 0, ssr: 0, ur: 0 };

        // UR 软保底：51抽起概率递增
        var urProb = getURProbability(pity.ur || 0);
        if (Math.random() < urProb) {
            return drawSpecificRarity(poolType, 'UR');
        }

        if (pity.ssr >= pool.pity.ssr - 1) {
            return drawSpecificRarity(poolType, 'SSR');
        }

        if (pity.sr >= pool.pity.sr - 1) {
            return drawSpecificRarity(poolType, 'SR');
        }

        var rarityRoll = Math.random();
        var targetRarity;

        if (rarityRoll < 0.03) targetRarity = 'SSR';
        else if (rarityRoll < 0.15) targetRarity = 'SR';
        else if (rarityRoll < 0.45) targetRarity = 'R';
        else targetRarity = 'N';

        return drawSpecificRarity(poolType, targetRarity);
    }

    function drawSpecificRarity(poolType, rarity) {
        var pool = GACHA_POOLS[poolType];
        var candidates;

        if (pool.dynamic) {
            if (poolType === 'skills') {
                var Skills = getSkills();
                var skillIds = Object.keys(Skills);
                candidates = skillIds.filter(function(id) { return Skills[id].rarity === rarity; });
                if (candidates.length === 0) {
                    candidates = skillIds.filter(function(id) { return Skills[id].rarity === (rarity === 'UR' ? 'SSR' : 'R'); });
                }
                if (candidates.length === 0) {
                    candidates = skillIds.filter(function(id) { return Skills[id].rarity === 'R'; });
                }
                var skillId = candidates[Math.floor(Math.random() * candidates.length)];
                var skill = Skills[skillId];
                return { id: skillId, name: skill.name, emoji: skill.emoji, rarity: skill.rarity };
            }
            if (poolType === 'characters' || poolType === 'pets' || poolType === 'stars') {
                var items = getPoolItems(poolType);
                candidates = items.filter(function(item) { return item.rarity === rarity; });
                if (candidates.length === 0) {
                    candidates = items.filter(function(item) { return item.rarity === (rarity === 'UR' ? 'SSR' : 'R'); });
                }
                if (candidates.length === 0) {
                    candidates = items.filter(function(item) { return item.rarity === 'R'; });
                }
                if (candidates.length === 0) return { id: 'unknown', name: '未知', rarity: 'N' };

                // 加权随机
                var totalWeight = 0;
                for (var i = 0; i < candidates.length; i++) { totalWeight += candidates[i].weight; }
                var rand = Math.random() * totalWeight;
                var cumulative = 0;
                for (var j = 0; j < candidates.length; j++) {
                    cumulative += candidates[j].weight;
                    if (rand < cumulative) return candidates[j];
                }
                return candidates[0];
            }
        }

        var poolItems = pool.items;
        candidates = poolItems.filter(function(item) { return item.rarity === rarity; });
        if (candidates.length === 0) {
            candidates = poolItems.filter(function(item) { return item.rarity === (rarity === 'UR' ? 'SSR' : 'R'); });
        }
        if (candidates.length === 0) {
            candidates = poolItems.filter(function(item) { return item.rarity === 'R'; });
        }

        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    function addToPlayerData(poolType, item) {
        var pd = getPlayerData();
        switch (poolType) {
            case 'stars':
                if (!pd.unlockedStarTypes) pd.unlockedStarTypes = ['normal'];
                if (pd.unlockedStarTypes.indexOf(item.id) === -1) {
                    pd.unlockedStarTypes.push(item.id);
                }
                break;
            case 'pets':
                if (!pd.pets) pd.pets = { owned: [], equipped: null };
                if (!pd.pets.owned) pd.pets.owned = [];
                var alreadyOwnedPet = pd.pets.owned.some(function(p) {
                    return (typeof p === 'string' ? p : p.id) === item.id;
                });
                if (!alreadyOwnedPet) {
                    pd.pets.owned.push({ id: item.id, level: 1, exp: 0 });
                }
                break;
            case 'characters':
                if (!pd.ownedCharacters) {
                    pd.ownedCharacters = [pd.currentCharacterId || 'char_001'];
                }
                if (pd.ownedCharacters.indexOf(item.id) === -1) {
                    pd.ownedCharacters.push(item.id);
                }
                break;
            case 'skills':
                if (!pd.skills) pd.skills = { owned: [], equipped: [] };
                if (!pd.skills.owned) pd.skills.owned = [];
                var alreadyOwned = pd.skills.owned.some(function(s) { return (typeof s === 'string' ? s : s.id) === item.id; });
                if (!alreadyOwned) {
                    pd.skills.owned.push({ uid: 'skill_' + Date.now() + '_' + Math.floor(Math.random() * 10000), id: item.id, level: 1 });
                }
                break;
        }
    }

    function performGacha(count, poolType) {
        var pool = GACHA_POOLS[poolType];
        if (!pool) return [];

        if (!pityCount[poolType]) {
            pityCount[poolType] = { sr: 0, ssr: 0, ur: 0 };
        }

        var results = [];

        for (let i = 0; i < count; i++) {
            var item = drawOneFromPool(poolType);
            results.push(item);

            if (item.rarity === 'UR' || item.rarity === 'LR' || item.rarity === 'SP') {
                pityCount[poolType].sr = 0;
                pityCount[poolType].ssr = 0;
                pityCount[poolType].ur = 0;
            } else if (item.rarity === 'SSR') {
                pityCount[poolType].sr = 0;
                pityCount[poolType].ssr = 0;
                pityCount[poolType].ur = (pityCount[poolType].ur || 0) + 1;
            } else if (item.rarity === 'SR') {
                pityCount[poolType].sr = 0;
                pityCount[poolType].ssr++;
                pityCount[poolType].ur = (pityCount[poolType].ur || 0) + 1;
            } else {
                pityCount[poolType].sr++;
                pityCount[poolType].ssr++;
                pityCount[poolType].ur = (pityCount[poolType].ur || 0) + 1;
            }

            addToPlayerData(poolType, item);
        }

        Logger.info('唤灵结果:', results);
        return results;
    }

    function showGachaResults(results) {
        if (!results || results.length === 0) return;
        startGachaAnimation(results, currentPool);
    }

    function startGachaAnimation(results, poolType) {
        animationState.active = true;
        animationState.phase = 'flying';
        animationState.results = results;
        animationState.poolType = poolType;
        animationState.revealedStars = [];
        animationState.currentRevealIndex = 0;
        animationState.startTime = Date.now();
        animationState.lastRevealTime = 0;
        animationState.previousState = getGameState();

        animationState.flyingStar = {
            x: getScreenWidth() / 2,
            y: getScreenHeight() + 100,
            scale: 1.5,
            rotation: 0
        };

        setGameState('GACHA_ANIMATION');

        try { vibrateShort({ type: 'medium' }); } catch (e) {}
    }

    function updateGachaAnimation() {
        if (!animationState.active) return;

        var now = Date.now();
        var elapsed = now - animationState.startTime;
        var sw = getScreenWidth();
        var sh = getScreenHeight();

        if (animationState.phase === 'flying') {
            var progress = Math.min(elapsed / GACHA_ANIMATION_CONFIG.flyingDuration, 1);
            var easeOut = 1 - Math.pow(1 - progress, 3);

            animationState.flyingStar.y = sh + 100 - (sh / 2 + 100) * easeOut;
            animationState.flyingStar.scale = 1.5 - 0.3 * progress;
            animationState.flyingStar.rotation += 0.1;

            if (progress >= 1) {
                animationState.phase = 'revealing';
                animationState.lastRevealTime = now;
            }
        } else if (animationState.phase === 'revealing') {
            var revealElapsed = now - animationState.lastRevealTime;

            if (revealElapsed >= GACHA_ANIMATION_CONFIG.revealDelay) {
                if (animationState.currentRevealIndex < animationState.results.length) {
                    animationState.revealedStars.push(animationState.results[animationState.currentRevealIndex]);
                    animationState.currentRevealIndex++;
                    animationState.lastRevealTime = now;
                    try { vibrateShort({ type: 'light' }); } catch (e) {}
                } else {
                    animationState.phase = 'complete';
                }
            }
        }
    }

    function closeGachaAnimation() {
        setGameState(animationState.previousState || 'SHOP');

        animationState.active = false;
        animationState.phase = 'idle';
        animationState.results = [];
        animationState.revealedStars = [];
        animationState.currentRevealIndex = 0;
        animationState.flyingStar = null;
    }

    function handleGachaAnimationClick(x, y) {
        if (animationState.phase === 'complete') {
            var scale = deps.getScreenScale();
            var btnWidth = Math.floor(150 * scale);
            var btnHeight = Math.floor(50 * scale);
            var btnX = getScreenWidth() / 2 - btnWidth / 2;
            var btnY = getScreenHeight() - Math.floor(100 * scale);

            if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
                closeGachaAnimation();
            }
        }
    }

    function handleGachaClick(x, y, scale) {
        var startY = Math.floor(150 * scale);

        var poolTabs = [
            { id: 'stars', name: '⭐' },
            { id: 'pets', name: '🐾' },
            { id: 'characters', name: '👤' },
            { id: 'skills', name: '✨' }
        ];

        var tabWidth = Math.floor(55 * scale);
        var tabHeight = Math.floor(35 * scale);
        var tabGap = Math.floor(5 * scale);
        var totalTabsWidth = poolTabs.length * tabWidth + (poolTabs.length - 1) * tabGap;
        var tabsStartX = (getScreenWidth() - totalTabsWidth) / 2;

        for (let i = 0; i < poolTabs.length; i++) {
            var tab = poolTabs[i];
            var tabX = tabsStartX + i * (tabWidth + tabGap);

            if (x >= tabX && x <= tabX + tabWidth &&
                y >= startY && y <= startY + tabHeight) {
                Logger.info('切换卡池:', tab.id);
                currentPool = tab.id;
                return;
            }
        }

        var pool = GACHA_POOLS[currentPool];
        if (!pool) return;

        var infoY = startY + tabHeight + Math.floor(20 * scale);
        var btnY = infoY + Math.floor(100 * scale);
        var btnWidth = Math.floor(120 * scale);
        var btnHeight = Math.floor(45 * scale);
        var btnGap = Math.floor(20 * scale);

        var pd = getPlayerData();
        var gachaTickets = (pd.skills && pd.skills.gachaTickets) ? pd.skills.gachaTickets : 0;
        var isSkillPool = (currentPool === 'skills');

        var singleBtnX = getScreenWidth() / 2 - btnWidth - btnGap / 2;
        if (x >= singleBtnX && x <= singleBtnX + btnWidth &&
            y >= btnY && y <= btnY + btnHeight) {
            Logger.info('点击单抽');

            if (isSkillPool && gachaTickets > 0) {
                pd.skills.gachaTickets--;
                var results = performGacha(1, currentPool);
                showGachaResults(results);
                saveData();
                showToast({ title: '使用唤灵券进行灵脉牵引！', icon: 'success', duration: 1500 });
                return;
            }

            if ((pd.starSource || 0) >= pool.singlePrice) {
                pd.starSource -= pool.singlePrice;
                var results = performGacha(1, currentPool);
                showGachaResults(results);
                saveData();
            } else {
                var tip = isSkillPool ? '唤灵券或灵石不足' : '灵石不足';
                showToast({ title: tip, icon: 'none', duration: 1500 });
            }
            return;
        }

        var tenBtnX = getScreenWidth() / 2 + btnGap / 2;
        if (x >= tenBtnX && x <= tenBtnX + btnWidth &&
            y >= btnY && y <= btnY + btnHeight) {
            Logger.info('点击古灵共鸣');

            if (isSkillPool && gachaTickets >= 10) {
                pd.skills.gachaTickets -= 10;
                var results = performGacha(10, currentPool);
                showGachaResults(results);
                saveData();
                showToast({ title: '使用唤灵券进行古灵共鸣！', icon: 'success', duration: 1500 });
                return;
            }

            if ((pd.starSource || 0) >= pool.tenPrice) {
                pd.starSource -= pool.tenPrice;
                var results = performGacha(10, currentPool);
                showGachaResults(results);
                saveData();
            } else {
                var tip2 = isSkillPool ? '唤灵券不足10张或灵石不足' : '灵石不足';
                showToast({ title: tip2, icon: 'none', duration: 1500 });
            }
            return;
        }
    }

    // ==================== 公共 API ====================

    return {
        performGacha: performGacha,
        showGachaResults: showGachaResults,
        startGachaAnimation: startGachaAnimation,
        updateGachaAnimation: updateGachaAnimation,
        closeGachaAnimation: closeGachaAnimation,
        handleGachaAnimationClick: handleGachaAnimationClick,
        handleGachaClick: handleGachaClick,
        getGachaPoolRemainingDays: getGachaPoolRemainingDays,
        checkGachaPoolRotation: checkGachaPoolRotation,

        get currentPool() { return currentPool; },
        set currentPool(v) { currentPool = v; },
        get poolStartTime() { return poolStartTime; },
        set poolStartTime(v) { poolStartTime = v; },
        get pityCount() { return pityCount; },
        get animationState() { return animationState; }
    };
}

export {
    GACHA_POOL_TYPES, GACHA_POOL_ROTATION_DAYS, GACHA_ANIMATION_CONFIG,
    GACHA_POOLS, STAR_CHEST_REWARDS, STAR_CHEST_DROP_RATE,
    RARITY_WEIGHT_MAP, POOL_EXCLUSIONS, WEIGHT_OVERRIDES,
    createGachaSystem
};
