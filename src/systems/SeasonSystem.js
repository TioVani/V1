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

// 赛季星星类型池（五行 + 阴阳 + 特殊）
var SEASON_STAR_TYPES = [
    { id: 'normal', name: '基础灵光', emoji: '⭐', description: '基础灵光，无特殊效果', multiplier: 1 },
    { id: 'ice', name: '水灵光', emoji: '💧', description: '灵辉值×3，水行之力，升级提升倍率', multiplier: 3, rarity: 'R', gacha: true },
    { id: 'fire', name: '火灵光', emoji: '🔥', description: '灵辉值×5，火行之力，升级提升倍率', multiplier: 5, rarity: 'R', gacha: true },
    { id: 'thunder', name: '金灵光', emoji: '⚜️', description: '灵辉值×4，金行之力，连灵加成+20%', multiplier: 4, rarity: 'R', gacha: true },
    { id: 'holy', name: '阳灵光', emoji: '☀️', description: '灵辉值×6，阳之灵力，会心感应提升', multiplier: 6, rarity: 'SSR', gacha: true },
    { id: 'dark', name: '阴灵光', emoji: '🌙', description: '灵辉值×4.5，阴之灵力，会心威力提升', multiplier: 4.5, rarity: 'SSR', gacha: true },
    { id: 'wind', name: '木灵光', emoji: '🌿', description: '灵辉值×2.5，木行之力，连灵时间+0.5秒', multiplier: 2.5, rarity: 'R', gacha: true },
    { id: 'earth', name: '土灵光', emoji: '🏔️', description: '灵辉值×3.5，土行之力，灵场屏障强化', multiplier: 3.5, rarity: 'R', gacha: true },
    { id: 'light', name: '乾元灵光', emoji: '☯️', description: '灵辉值×7，乾天之力，出现概率较低', multiplier: 7, rarity: 'SR', gacha: true },
    { id: 'shadow', name: '坤灵光', emoji: '🌘', description: '灵辉值×5，坤地之力，灵光冲击强化', multiplier: 5, rarity: 'SSR', gacha: true },
    { id: 'rainbow', name: '虹灵光', emoji: '🌈', description: '灵辉值×8，五行交融，全域增幅', multiplier: 8, rarity: 'SSR', gacha: true },
    { id: 'golden', name: '金运灵光', emoji: '🪙', description: '灵辉值×10，灵币掉落×2', multiplier: 10, rarity: 'SR', gacha: true },
    { id: 'crystal', name: '晶石灵光', emoji: '🪨', description: '灵辉值×6，材料掉落率+20%', multiplier: 6, rarity: 'SSR', gacha: true },
    { id: 'meteor', name: '陨灵光', emoji: '☄️', description: '灵辉值×9，时间+2秒', multiplier: 9, rarity: 'UR', gacha: true },
    { id: 'cosmic', name: '太虚灵光', emoji: '🔮', description: '灵辉值×12，最稀有的灵光', multiplier: 12, rarity: 'UR', gacha: true },
    { id: 'time', name: '时序灵光', emoji: '⏰', description: '点击+3秒，主动技能：消耗时间造成冲击', multiplier: 2, timeBonus: 3 },
    { id: 'heal', name: '愈灵光', emoji: '💚', description: '点击恢复15点灵能', multiplier: 1, healBonus: 15 },
    { id: 'shield', name: '御灵光', emoji: '🛡️', description: '点击获得10点护盾', multiplier: 1, shieldBonus: 10 },
    { id: 'unlucky', name: '厄灵光', emoji: '🔻', description: '点击-5灵能，+1怒气，怒气满3触发随机效果', multiplier: 2, rageBonus: 1, hpCost: 5 },
    { id: 'greedy', name: '贪灵光', emoji: '🌀', description: '点击不加分，扣1灵能，累计20灵能解锁贪灵技能', multiplier: 0, hpCost: 1, greedyBonus: true },
    { id: 'combo', name: '连灵灵光', emoji: '🔄', description: '点击后持续10秒，每0.2秒自动发射灵光攻击邪灵', multiplier: 3, comboDuration: 10000, comboInterval: 200 },
    { id: 'dodge', name: '闪避灵光', emoji: '💫', description: '点击后1秒内闪避邪灵攻击并反击造成冲击', multiplier: 0, dodgeDuration: 1000, spawnInterval: 1200, lifetime: 1000 },
    { id: 'boss_star', name: '守护灵光', emoji: '⭕', description: '守护灵召唤的灵光，漏掉会触发惩罚', multiplier: 1, isBossStar: true },
    { id: 'supernova', name: '煌灵光', emoji: '💫', description: '灵辉值x15，点击后3秒内周围灵光自动收集', multiplier: 15, rarity: 'LR', gacha: true },
    { id: 'eclipse', name: '蚀灵光', emoji: '🌑', description: '灵辉值x11，切换阴蚀模式5秒，古灵受双倍冲击', multiplier: 11, rarity: 'SP', gacha: true },
    { id: 'capture', name: '收服灵光', emoji: '⛓️', description: '收服器灵：点击尝试捕获当前古灵', multiplier: 0, isCaptureStar: true }
];

function createSeasonSystem(deps) {
    // 依赖注入
    var getSaveData = deps.getSaveData;
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
            var pd = getSaveData();
            var savedSeason = pd.seasonData;
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
                    pd.seasonData = {
                        weekId: currentWeek,
                        content: getSeasonContent(),
                        bestScore: 0,
                        leaderboard: getSeasonLeaderboard(),
                        selection: { character: null, skills: [], pet: null, starTypes: [] }
                    };
                    saveDataFn();
                } else {
                    // 排行榜每次重新生成（占位角色，无需持久化旧数据）
                    var newLb = generateMockSeasonLeaderboard();
                    setSeasonLeaderboard(newLb);
                    // 同步到存储，避免下次仍读到旧数据
                    pd.seasonData.leaderboard = newLb;
                    saveDataFn();
                }
            } else {
                setSeasonContent(generateSeasonContent());
                setSeasonBestScore(0);
                setSeasonLeaderboard(generateMockSeasonLeaderboard());

                pd.seasonData = {
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
            setSeasonLeaderboard(generateMockSeasonLeaderboard());
        }
    }

    function generateMockSeasonLeaderboard() {
        var seed = getSeasonSeed();
        var rng = function(offset) {
            return seededRandom(seed + offset);
        };

        var names = [
            '墨渊·暗影帝君', '秋月·流光仙尊', '雷啸·天罚武帝', '霜华·冰魄圣女', '炎刹·焚天龙王',
            '叶隐·千刃剑圣', '云曦·苍穹祭司', '风语·翠林神巫', '岩守·不灭金刚', '魅影·虚空行者',
            '紫薇·星象宗师', '凌风·疾影箭皇', '冥歌·魂语先知', '青莲·净世圣使', '血月·夜煞魔尊'
        ];

        // 25个阶梯分数：从入门到传说级，激发玩家挑战欲望
        var scoreTiers = [
            98000,  // 1. 传说门槛 — 遥不可及，激励顶尖玩家
            85000,  // 2. 至尊之间
            78000,  // 3. 宗师巅峰
            72000,  // 4. 大师顶层
            65000,  // 5. 大师门坎
            58000,  // 6. 钻石高位
            52000,  // 7. 钻石中位
            45000,  // 8. 钻石入门
            38000,  // 9. 铂金顶层
            32000,  // 10. 铂金中位
            28000,  // 11. 铂金入門
            23000,  // 12. 黄金高位
            18000,  // 13. 黄金中位
            12000,  // 14. 黄金入门
            6500    // 15. 白银之巅 — 普通玩家的第一个追赶目标
        ];

        var avatars = [
            '👑', '🏆', '💎', '🔱', '⚔️', '🗡️', '⛪', '🌿', '🛡️', '🌌',
            '🔮', '🏹', '🎭', '🪷', '🩸'
        ];

        var sc = getSeasonContent();
        var character = sc ? sc.character : 'starter';
        var skills = sc ? sc.skills : [];
        var pet = (sc && sc.pets) ? sc.pets[0] : 'pet_slime';

        // 为每个占位玩家随机微调分数(+/- 8%)，让榜单看起来更真实
        var result = [];
        for (var i = 0; i < Math.min(names.length, scoreTiers.length); i++) {
            var baseScore = scoreTiers[i];
            var jitter = Math.floor((rng(i * 3 + 1) - 0.5) * 0.16 * baseScore);
            var finalScore = baseScore + jitter;
            // 确保不低于最低梯队
            if (finalScore < 1000) finalScore = 1000;

            result.push({
                rank: i + 1,
                name: names[i],
                score: finalScore,
                avatar: avatars[i],
                selection: {
                    character: character,
                    skills: skills,
                    pet: pet
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
