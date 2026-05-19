import Logger from '../utils/Logger.js';
/**
 * 赛季系统（Season System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 *
 * 包含：
 * - 赛季周计算（getCurrentSeasonWeek / getMondayOfWeek）
 * - 种子随机（getSeasonSeed / seededRandom）
 * - 赛季内容生成（generateSeasonContent）
 * - 赛季初始化（initSeasonContent）
 * - 排行榜（generateMockSeasonLeaderboard / getSeasonRank）
 * - 闪避星星定时器（startDodgeStarTimer / stopDodgeStarTimer）
 */

// ==================== 赛季常量 ====================

// 赛季角色池
var SEASON_CHARACTERS = [
    'starter', 'warrior', 'mage', 'archer', 'dragon_knight', 'goddess',
    'assassin', 'guardian', 'summoner', 'berserker', 'saint', 'ninja',
    'priest', 'paladin', 'hunter', 'witch', 'monk', 'elementalist',
    'necromancer', 'chronomancer', 'wanderer', 'alchemist', 'vampire', 'celestial',
    'void_emperor', 'stellar_wanderer'
];

// 赛季技能池
var SEASON_SKILLS = {
    attack: [
        'skill_fireball', 'skill_ice_arrow', 'skill_lightning', 'skill_wind_slash',
        'skill_ice_shard', 'skill_meteor', 'skill_thunder_storm', 'skill_blizzard',
        'skill_star_burst', 'skill_dragon_breath', 'skill_void_strike'
    ],
    support: [
        'skill_heal', 'skill_shield', 'skill_speed_up', 'skill_lucky_star',
        'skill_time_extend', 'skill_greater_heal', 'skill_iron_skin', 'skill_star_blessing'
    ],
    passive: [
        'skill_attack_boost', 'skill_crit_sense', 'skill_gold_finder', 'skill_exp_boost',
        'skill_crit_master', 'skill_crit_damage_master', 'skill_attack_master', 'skill_combo_master'
    ]
};

// 赛季宠物池
var SEASON_PETS = [
    'pet_slime', 'pet_bat', 'pet_chick', 'pet_rabbit',
    'pet_fire_spirit', 'pet_ice_fairy', 'pet_wind_sprite', 'pet_thunder_imp',
    'pet_star_dragon', 'pet_moon_wolf', 'pet_flame_tiger', 'pet_frost_fox',
    'pet_phoenix', 'pet_unicorn', 'pet_thunder_dragon',
    'pet_world_eater', 'pet_nebula_serpent', 'pet_festival_lantern', 'pet_meteor_fox'
];

// 赛季星星类型池
var SEASON_STAR_TYPES = [
    { id: 'normal', name: '普通星星', emoji: '⭐', description: '基础星星，无特殊效果', multiplier: 1 },
    { id: 'ice', name: '冰星星', emoji: '❄️', description: '分数×3，可升级', multiplier: 3, rarity: 'R', gacha: true },
    { id: 'fire', name: '火星星', emoji: '🔥', description: '分数×5，可升级', multiplier: 5, rarity: 'R', gacha: true },
    { id: 'thunder', name: '雷星星', emoji: '⚡', description: '分数×4，连击加成+20%', multiplier: 4, rarity: 'R', gacha: true },
    { id: 'holy', name: '圣星星', emoji: '✨', description: '分数×6，暴击率+10%', multiplier: 6, rarity: 'SSR', gacha: true },
    { id: 'dark', name: '暗星星', emoji: '🌑', description: '分数×4.5，爆伤+30%', multiplier: 4.5, rarity: 'SSR', gacha: true },
    { id: 'wind', name: '风星星', emoji: '🌪️', description: '分数×2.5，连击时间+0.5秒', multiplier: 2.5, rarity: 'R', gacha: true },
    { id: 'earth', name: '土星星', emoji: '🪨', description: '分数×3.5，防御+20%', multiplier: 3.5, rarity: 'R', gacha: true },
    { id: 'light', name: '光星星', emoji: '💫', description: '分数×7，出现概率降低', multiplier: 7, rarity: 'SR', gacha: true },
    { id: 'shadow', name: '影星星', emoji: '👤', description: '分数×5，攻击力+15%', multiplier: 5, rarity: 'SSR', gacha: true },
    { id: 'rainbow', name: '彩虹星', emoji: '🌈', description: '分数×8，全属性+5%', multiplier: 8, rarity: 'SSR', gacha: true },
    { id: 'golden', name: '黄金星', emoji: '🌟', description: '分数×10，星币掉落×2', multiplier: 10, rarity: 'SR', gacha: true },
    { id: 'crystal', name: '水晶星', emoji: '💎', description: '分数×6，材料掉落率+20%', multiplier: 6, rarity: 'SSR', gacha: true },
    { id: 'meteor', name: '流星', emoji: '☄️', description: '分数×9，时间+2秒', multiplier: 9, rarity: 'UR', gacha: true },
    { id: 'cosmic', name: '宇宙星', emoji: '🌌', description: '分数×12，最稀有的星星', multiplier: 12, rarity: 'UR', gacha: true },
    { id: 'time', name: '时间星', emoji: '⏰', description: '点击+3秒，主动技能：消耗时间造成伤害', multiplier: 2, timeBonus: 3 },
    { id: 'heal', name: '治疗星', emoji: '💚', description: '点击恢复15点HP', multiplier: 1, healBonus: 15 },
    { id: 'shield', name: '护盾星', emoji: '🛡️', description: '点击获得10点护盾', multiplier: 1, shieldBonus: 10 },
    { id: 'unlucky', name: '倒霉星', emoji: '💀', description: '点击-5HP，+1怒气，怒气满3触发随机效果', multiplier: 2, rageBonus: 1, hpCost: 5 },
    { id: 'greedy', name: '贪婪星', emoji: '😈', description: '点击不加分，扣1HP，累计20HP解锁贪婪技能', multiplier: 0, hpCost: 1, greedyBonus: true },
    { id: 'combo', name: '连击星', emoji: '🔄', description: '点击后持续10秒，每0.2秒自动发射星星攻击敌人', multiplier: 3, comboDuration: 10000, comboInterval: 200 },
    { id: 'dodge', name: '闪避星', emoji: '💫', description: '点击后1秒内闪避怪物攻击并反击造成伤害', multiplier: 0, dodgeDuration: 1000, spawnInterval: 1200, lifetime: 1000 },
    { id: 'boss_star', name: 'Boss星', emoji: '⭕', description: 'Boss召唤的星星，漏掉会触发惩罚', multiplier: 1, isBossStar: true },
    { id: 'supernova', name: '超新星', emoji: '💫', description: '分数x15，点击后3秒内周围星星自动收集', multiplier: 15, rarity: 'LR', gacha: true },
    { id: 'eclipse', name: '日蚀星', emoji: '🌑', description: '分数x11，切换月蚀模式5秒，怪物受双倍伤害', multiplier: 11, rarity: 'SP', gacha: true }
];

function createSeasonSystem(deps) {
    // 依赖注入
    var getPlayerData = deps.getPlayerData;
    var getCharacters = deps.getCharacters;
    var spawnDodgeStarFn = deps.spawnDodgeStar;
    var saveDataFn = deps.saveData;

    // 全局变量同步（通过 getter/setter 操作 game.js 中的全局变量）
    var getSeasonContent = deps.getSeasonContent;
    var setSeasonContent = deps.setSeasonContent;
    var getSeasonSelection = deps.getSeasonSelection;
    var setSeasonSelection = deps.setSeasonSelection;
    var getSeasonScore = deps.getSeasonScore;
    var setSeasonScore = deps.setSeasonScore;
    var getSeasonBestScore = deps.getSeasonBestScore;
    var setSeasonBestScore = deps.setSeasonBestScore;
    var getSeasonLeaderboard = deps.getSeasonLeaderboard;
    var setSeasonLeaderboard = deps.setSeasonLeaderboard;

    // 内部状态
    var dodgeStarInterval = null;

    // ==================== 核心方法 ====================

    function getCurrentSeasonWeek() {
        var now = new Date();
        var startOfYear = new Date(now.getFullYear(), 0, 1);
        var days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
        var weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        return now.getFullYear() + '-W' + weekNumber;
    }

    function getMondayOfWeek() {
        var now = new Date();
        var day = now.getDay();
        var diff = now.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(now.setDate(diff)).toISOString().split('T')[0];
    }

    function getSeasonSeed() {
        var weekId = getCurrentSeasonWeek();
        var seed = 0;
        for (let i = 0; i < weekId.length; i++) {
            seed = ((seed << 5) - seed) + weekId.charCodeAt(i);
            seed = seed & seed;
        }
        return Math.abs(seed);
    }

    function seededRandom(seed) {
        var x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    function generateSeasonContent() {
        var seed = getSeasonSeed();

        var charIndex = Math.floor(seededRandom(seed) * SEASON_CHARACTERS.length);
        var character = SEASON_CHARACTERS[charIndex];

        var attackIndex = Math.floor(seededRandom(seed + 1) * SEASON_SKILLS.attack.length);
        var supportIndex = Math.floor(seededRandom(seed + 2) * SEASON_SKILLS.support.length);
        var passiveIndex = Math.floor(seededRandom(seed + 3) * SEASON_SKILLS.passive.length);
        var skills = [
            SEASON_SKILLS.attack[attackIndex],
            SEASON_SKILLS.support[supportIndex],
            SEASON_SKILLS.passive[passiveIndex]
        ];

        var pets = [];
        var usedPetIndices = {};
        for (let pi = 0; pi < 3; pi++) {
            var petIndex;
            var attempts = 0;
            var currentSeed = seed + 4 + pi;
            do {
                petIndex = Math.floor(seededRandom(currentSeed) * SEASON_PETS.length);
                currentSeed++;
                attempts++;
                if (attempts > 100) break;
            } while (usedPetIndices[petIndex]);
            usedPetIndices[petIndex] = true;
            pets.push(SEASON_PETS[petIndex]);
        }

        var starTypes = [];
        var usedStarIndices = {};
        for (let si = 0; si < 5; si++) {
            var starIndex;
            var starAttempts = 0;
            var starCurrentSeed = seed + 7 + si;
            do {
                starIndex = Math.floor(seededRandom(starCurrentSeed) * SEASON_STAR_TYPES.length);
                starCurrentSeed++;
                starAttempts++;
                if (starAttempts > 100) break;
            } while (usedStarIndices[starIndex]);
            usedStarIndices[starIndex] = true;
            starTypes.push(SEASON_STAR_TYPES[starIndex].id);
        }

        return {
            weekId: getCurrentSeasonWeek(),
            monday: getMondayOfWeek(),
            character: character,
            skills: skills,
            pets: pets,
            starTypes: starTypes,
            generatedAt: Date.now()
        };
    }

    function initSeasonContent() {
        var Characters = getCharacters();
        try {
            var playerData = getPlayerData();
            var savedSeason = playerData.seasonData;
            var currentWeek = getCurrentSeasonWeek();

            if (savedSeason && savedSeason.weekId === currentWeek) {
                setSeasonContent(savedSeason.content);
                setSeasonBestScore(savedSeason.bestScore || 0);

                var sc = getSeasonContent();
                if (!sc || !sc.character || !Characters[sc.character]) {
                    Logger.info('赛季数据验证失败，重新生成');
                    setSeasonContent(generateSeasonContent());
                    setSeasonBestScore(0);
                    setSeasonLeaderboard(generateMockSeasonLeaderboard());
                    playerData.seasonData = {
                        weekId: currentWeek,
                        content: getSeasonContent(),
                        bestScore: 0,
                        leaderboard: getSeasonLeaderboard(),
                        selection: { character: null, skills: [], pet: null, starTypes: [] }
                    };
                    saveDataFn();
                } else {
                    setSeasonLeaderboard(savedSeason.leaderboard || generateMockSeasonLeaderboard());
                }
            } else {
                setSeasonContent(generateSeasonContent());
                setSeasonBestScore(0);
                setSeasonLeaderboard(generateMockSeasonLeaderboard());

                playerData.seasonData = {
                    weekId: currentWeek,
                    content: getSeasonContent(),
                    bestScore: 0,
                    leaderboard: getSeasonLeaderboard(),
                    selection: { character: null, skills: [], pet: null, starTypes: [] }
                };
                saveDataFn();
            }

            var sc2 = getSeasonContent();
            if (!sc2 || !sc2.character || !Characters[sc2.character]) {
                console.error('赛季内容无效，使用默认值');
                setSeasonContent({
                    weekId: currentWeek,
                    monday: getMondayOfWeek(),
                    character: 'starter',
                    skills: ['skill_fireball', 'skill_heal', 'skill_attack_boost'],
                    pets: ['pet_slime'],
                    starTypes: ['normal', 'ice', 'fire'],
                    generatedAt: Date.now()
                });
            }

            Logger.info('赛季内容初始化成功:', getSeasonContent().character);
        } catch (e) {
            console.error('initSeasonContent 异常:', e);
            setSeasonContent({
                weekId: '2026-W1',
                monday: '2026-01-06',
                character: 'starter',
                skills: ['skill_fireball', 'skill_heal', 'skill_attack_boost'],
                pets: ['pet_slime'],
                starTypes: ['normal', 'ice', 'fire'],
                generatedAt: Date.now()
            });
            setSeasonBestScore(0);
            setSeasonLeaderboard([]);
        }
    }

    function generateMockSeasonLeaderboard() {
        var names = ['星耀王者', '传奇猎人', '永恒之星', '暗夜猎手', '光明使者',
                     '风暴领主', '冰霜女王', '烈焰战神', '雷霆霸主', '幻影刺客'];
        var scores = [15000, 12000, 10000, 8500, 7000, 5800, 4500, 3200, 2000, 1000];
        var sc = getSeasonContent();

        var result = [];
        for (let i = 0; i < names.length; i++) {
            result.push({
                rank: i + 1,
                name: names[i],
                score: scores[i],
                avatar: ['👑', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟', '💫', '✨', '🎯'][i],
                selection: {
                    character: sc ? sc.character : 'starter',
                    skills: sc ? sc.skills : [],
                    pet: sc && sc.pets ? sc.pets[0] : 'pet_slime'
                }
            });
        }
        return result;
    }

    function getSeasonRank() {
        var bestScore = getSeasonBestScore();
        var lb = getSeasonLeaderboard();
        if (bestScore <= 0) return lb.length + 1;

        var rank = 1;
        for (let i = 0; i < lb.length; i++) {
            if (bestScore < lb[i].score) {
                rank++;
            }
        }
        return rank;
    }

    function startDodgeStarTimer() {
        if (dodgeStarInterval) {
            clearInterval(dodgeStarInterval);
        }

        dodgeStarInterval = setInterval(function() {
            spawnDodgeStarFn();
        }, 1200);

        Logger.info('闪避星星定时器启动，间隔: 1200ms');
    }

    function stopDodgeStarTimer() {
        if (dodgeStarInterval) {
            clearInterval(dodgeStarInterval);
            dodgeStarInterval = null;
        }
    }

    return {
        getCurrentSeasonWeek: getCurrentSeasonWeek,
        getMondayOfWeek: getMondayOfWeek,
        getSeasonSeed: getSeasonSeed,
        seededRandom: seededRandom,
        generateSeasonContent: generateSeasonContent,
        initSeasonContent: initSeasonContent,
        generateMockSeasonLeaderboard: generateMockSeasonLeaderboard,
        getSeasonRank: getSeasonRank,
        startDodgeStarTimer: startDodgeStarTimer,
        stopDodgeStarTimer: stopDodgeStarTimer
    };
}

export { SEASON_STAR_TYPES, createSeasonSystem };
