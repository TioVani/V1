import Logger from '../utils/Logger.js';
import TimerManager from '../utils/TimerManager.js';
import { TOWER_COMBAT_OVERRIDES, TOWER_COMBAT_FEATURES } from '../config/CombatSpec.js';
import { getSkillAttackRatio } from '../config/SkillConfig.js';
import { vibrateShort } from '../platform/BrowserAPI.js';
/**
 * 爬塔系统（无尽之塔）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

// ==================== 配置 ====================

const TOWER_CONFIG = {
    gridSize: 20,
    cellSize: 0,

    monsterLockRadius: 2,
    monsterLockChance: 0.6,

    monsterSizes: {
        normal: { cells: 1, width: 1, height: 1 },
        elite: { cells: 4, width: 2, height: 2 },
        boss: { cells: 8, width: 4, height: 2 }
    },

    eliteChance: 0.15,
    eliteMinFloor: 5,

    hiddenPathChance: 0.05,
    hiddenPathSkipOptions: [10, 20, 30],
    hiddenPathSkipFloors: 5,

    cellWeights: {
        empty: 42,
        monster: 20,
        treasure: 5,
        material: 10,
        hiddenPath: 0,
        trap: 8,
        exit: 0
    },

    difficultyScale: 1.04,  // 保留向后兼容；实际使用 getTowerDifficultyMult()

    baseRewards: {
        gold: [30, 150],
        starSource: [3, 15],
        materials: ['iceCrystal', 'fireSource'],
        materialChance: 0.3
    },

    bossFloorRewards: {
        gold: [300, 900],
        starSource: [30, 90],
        materials: ['iceCrystal', 'fireSource', 'critCrystal'],
        materialChance: 0.5,
        equipmentChance: 0.05
    },

    // 按 UR 满级角色(90级) DPS 标定
    // 满级女神攻击=1188, attackBonus=6.94x, 平均倍率~26x(combo/crit/quicktap)
    // 每颗星伤害: floor1≈5053, floor10≈18044, floor20≈32493
    // 30秒可打约20颗有效伤害星 + combo星/宠物 ≈ 总伤害 floor1≈100k, floor15≈500k
    // difficultyScale=1.04: floor1=1x, floor10=1.42x, floor20=2.11x, floor50=6.83x
    monsters: [
        { id: 'slime', name: '铜锈碎片', emoji: '🟤', hp: 100000, attack: 40, attackInterval: 2000, minFloor: 1, sizeType: 'normal', skills: [{ type: 'poison', damage: 3, duration: 3 }] },
        { id: 'goblin', name: '戈魂', emoji: '🔱', hp: 150000, attack: 50, attackInterval: 2000, minFloor: 3, sizeType: 'normal' },
        { id: 'skeleton', name: '断璧灵', emoji: '💍', hp: 200000, attack: 60, attackInterval: 1800, minFloor: 5, sizeType: 'normal' },
        { id: 'orc', name: '铜戈战魂', emoji: '⚔️', hp: 300000, attack: 70, attackInterval: 1800, minFloor: 10, sizeType: 'normal' },
        { id: 'demon', name: '狂草灵', emoji: '🎨', hp: 400000, attack: 80, attackInterval: 1500, minFloor: 15, sizeType: 'normal' },
        { id: 'dragon', name: '铜龙幼灵', emoji: '🐲', hp: 500000, attack: 90, attackInterval: 1500, minFloor: 20, sizeType: 'normal' },
        { id: 'ancient_dragon', name: '龙纹鼎灵', emoji: '🔥', hp: 700000, attack: 100, attackInterval: 1500, minFloor: 30, sizeType: 'normal' },
        { id: 'void_creature', name: '灵脉裂片', emoji: '🌀', hp: 1000000, attack: 110, attackInterval: 1500, minFloor: 40, sizeType: 'normal' },
        { id: 'abyss_lord', name: '渊默邪灵', emoji: '🌑', hp: 1500000, attack: 120, attackInterval: 1500, minFloor: 50, sizeType: 'normal' }
    ],

    bosses: [
        { floor: 5, name: '守门人', emoji: '🚪', hp: 400000, attack: 60, attackInterval: 1800, skills: [{ type: 'stun', chance: 0.15, duration: 1000 }] },
        { floor: 10, name: '层主·初级', emoji: '⚔️', hp: 600000, attack: 70, attackInterval: 1800 },
        { floor: 15, name: '层主·中级', emoji: '🛡️', hp: 900000, attack: 80, attackInterval: 1500, skills: [{ type: 'poison', damage: 3, duration: 3 }] },
        { floor: 20, name: '层主·高级', emoji: '🗡️', hp: 1500000, attack: 90, attackInterval: 1500 },
        { floor: 25, name: '灵域骑士', emoji: '🐴', hp: 2200000, attack: 100, attackInterval: 1500, skills: [{ type: 'poison', damage: 5, duration: 4 }] },
        { floor: 30, name: '灵脉领主', emoji: '🌀', hp: 3500000, attack: 110, attackInterval: 1500 },
        { floor: 40, name: '古器邪灵', emoji: '🗿', hp: 6000000, attack: 120, attackInterval: 1500, skills: [{ type: 'stun', chance: 0.2, duration: 1500 }, { type: 'poison', damage: 5, duration: 5 }] },
        { floor: 50, name: '渊默邪灵', emoji: '🌑', hp: 10000000, attack: 130, attackInterval: 1500, skills: [{ type: 'poison', damage: 8, duration: 5 }] }
    ],

    treasureTypes: [
        { name: '铜纹宝匣', emoji: '📦', gold: [20, 50], materialChance: 0.3 },
        { name: '银纹宝匣', emoji: '🎁', gold: [50, 150], materialChance: 0.5, equipmentChance: 0.025 },
        { name: '金纹宝匣', emoji: '🪨', gold: [100, 300], materialChance: 0.8, equipmentChance: 0.075, skillChance: 0.1 }
    ],

    materialTypes: [
        { id: 'iceCrystal', name: '水灵晶', emoji: '💧', amount: [1, 3] },
        { id: 'fireSource', name: '火灵源', emoji: '🔥', amount: [1, 2] },
        { id: 'critCrystal', name: '水灵暴晶', emoji: '💠', amount: [1, 2], minFloor: 5 },
        { id: 'critFireSource', name: '火灵爆源', emoji: '💥', amount: [1, 2], minFloor: 10 }
    ],

    trapTypes: [
        { name: '地刺陷阱', emoji: '📌', damage: 10, effect: 'damage' },
        { name: '迷雾陷阱', emoji: '🌫️', damage: 0, effect: 'fog', duration: 50 },
        { name: '毒气陷阱', emoji: '☠️', damage: 5, effect: 'poison', duration: 5 },
        { name: '传送陷阱', emoji: '🌀', damage: 0, effect: 'teleport' }
    ]
};

// 分层难度倍率：前20层温和(×1.02)，21-40层加速(×1.04)，41层+陡峭(×1.06)
function getTowerDifficultyMult(floor) {
    if (floor <= 1) return 1;
    if (floor <= 20) return Math.pow(1.02, floor - 1);
    if (floor <= 40) return Math.pow(1.02, 20) * Math.pow(1.04, floor - 21);
    return Math.pow(1.02, 20) * Math.pow(1.04, 20) * Math.pow(1.06, floor - 41);
}

// ==================== 闭包工厂 ====================

function createTowerSystem(deps) {
    // 依赖注入
    var getPlayerData = deps.getPlayerData;
    var saveData = deps.saveData;
    var addCharExp = deps.addCharExp;
    var getCharFullStats = deps.getCharFullStats;
    var getScreenScaleFn = deps.getScreenScale;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getSeasonStarTypes = deps.getSeasonStarTypes;
    var clearTimerInterval = deps.clearTimerInterval;
    var clearMoveInterval = deps.clearMoveInterval;
    var clearMonsterAttackInterval = deps.clearMonsterAttackInterval;
    var setGameState = deps.setGameState;
    var getGameState = deps.getGameState;
    var showToast = deps.showToast;
    var createStarBurstAnimation = deps.createStarBurstAnimation;
    var createScreenShake = deps.createScreenShake;
    var createMonsterDamageAnimation = deps.createMonsterDamageAnimation;
    var createPlayerDamageAnimation = deps.createPlayerDamageAnimation;
    var addGameMessage = deps.addGameMessage;
    var createMeteorAnimation = deps.createMeteorAnimation;
    var createCritAnimation = deps.createCritAnimation;
    var createQuickTapAnimation = deps.createQuickTapAnimation;
    var createMonsterProjectileAnimation = deps.createMonsterProjectileAnimation;
    var createHpBarCounterAnimation = deps.createHpBarCounterAnimation;
    var updateComboFn = deps.updateCombo;
    var resetComboFn = deps.resetCombo;
    var getComboCountFn = deps.getComboCount;
    var calculateStarScore = deps.calculateStarScore;
    var createTimeDamageAnimation = deps.createTimeDamageAnimation;
    var getCharacterFullStats = deps.getCharacterFullStats;
    var COMBO_STAR_DURATION = deps.COMBO_STAR_DURATION || 5000;
    var COMBO_STAR_INTERVAL = deps.COMBO_STAR_INTERVAL || 200;
    var getMonsterSkillType = deps.getMonsterSkillType;
    var getSkillsConfig = deps.getSkillsConfig;
    var getSkillTypes = deps.getSkillTypes;
    var getPets = deps.getPets;
    var clearBattleAnimations = deps.clearBattleAnimations;
    var clearStars = deps.clearStars;

    // BattleEngine 引用（通过 _setBattleEngine 回填）
    var battleEngine = deps.battleEngine || null;
    var initTowerEngineFn = deps.initTowerEngineFn || null;
    var releaseTowerEngineFn = deps.releaseTowerEngineFn || null;
    var updateStarSpawnIntervalFn = deps.updateStarSpawnInterval || null;
    var getCombatState = deps.getCombatState || null;

    // ==================== 内部状态 ====================
    var grid = [];
    var playerX = 0;
    var playerY = 0;
    var currentFloor = 1;
    var playerHp = 100;
    var playerMaxHp = 100;
    var exploredCells = [];
    var collectedRewards = [];
    var currentCell = null;
    var inCombat = false;
    var isHiddenPathBoss = false;
    var combatMonster = null;
    var preCombatPlayerX = 0;
    var preCombatPlayerY = 0;
    var viewOffsetX = 0;
    var viewOffsetY = 0;
    var touchStartX = 0;
    var touchStartY = 0;
    var isDragging = false;
    var blindSteps = 0;
    var resultData = null;
    var resultEndTime = 0;
    var rewardPopup = null;
    var combatTime = 30;
    var combatTimer = null;
    var _tm = new TimerManager();
    var combatReward = null;
    var combatRewardTexts = [];
    var combatMonsterAttackTimer = null;
    var victoryPopup = null;
    var victoryPopupTimer = null;
    var hiddenPathDialog = null;
    var lastStarClickTime = 0;
    var playerShield = 0;
    var playerRage = 0;
    var greedyHpPool = 0;
    var greedySkillUnlocked = false;
    var dodging = false;
    var dodgeEndTime = 0;
    var comboStarActive = false;
    var comboStarStartTime = 0;
    var comboStarLastAttackTime = 0;
    var playerPoisoned = false;
    var playerPoisonEndTime = 0;
    var playerPoisonDamage = 0;
    var playerPoisonTickTime = 0;
    var playerStunned = false;
    var playerStunEndTime = 0;
    var skillCooldowns = {};

    // ==================== 内部函数 ====================

    function randomRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function calculateMaxHp() {
        try {
            var pd = getPlayerData();
            if (!pd || !pd.currentCharacterId) {
                return 100;
            }
            var stats = getCharFullStats(pd.currentCharacterId);
            return (stats && stats.hp) ? stats.hp : 100;
        } catch (e) {
            console.error('calculateMaxHp 错误:', e);
            return 100;
        }
    }

    function generateFloor(floor) {
        var config = TOWER_CONFIG;
        var size = config.gridSize;
        grid = [];

        var difficultyMult = getTowerDifficultyMult(floor);

        var weights = {};
        for (let key in config.cellWeights) {
            weights[key] = config.cellWeights[key];
        }
        if (floor % 5 === 0) {
            weights.monster = 40;
            weights.trap = 12;
        }

        for (let y = 0; y < size; y++) {
            grid[y] = [];
            for (let x = 0; x < size; x++) {
                grid[y][x] = generateCell(x, y, floor, weights, difficultyMult);
            }
        }

        grid[0][0] = { type: 'empty', explored: true };

        ensureHiddenPath(floor);

        var gridSize = TOWER_CONFIG.gridSize;
        grid[gridSize - 1][gridSize - 1] = {
            type: 'exit',
            explored: false,
            x: gridSize - 1,
            y: gridSize - 1
        };

        linkMonsterLocks();
        placeLargeMonsters(floor);

        Logger.info('生成地图，层数:', floor, '难度系数:', difficultyMult.toFixed(2));
    }

    function placeLargeMonsters(floor) {
        var config = TOWER_CONFIG;
        var size = config.gridSize;

        if (floor < config.eliteMinFloor) return;

        var eliteChance = config.eliteChance + (floor - config.eliteMinFloor) * 0.01;
        var bossChance = floor >= 20 ? 0.05 : 0;

        var monsterCells = [];
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x].type === 'monster' && grid[y][x].monster) {
                    monsterCells.push({ x: x, y: y, cell: grid[y][x] });
                }
            }
        }

        monsterCells.sort(function() { return Math.random() - 0.5; });

        if (Math.random() < bossChance && monsterCells.length > 0) {
            var bossSize = config.monsterSizes.boss;
            for (let i = 0; i < monsterCells.length; i++) {
                var mc = monsterCells[i];
                if (canPlaceLargeMonster(mc.x, mc.y, bossSize.width, bossSize.height)) {
                    mc.cell.monster = generateMonster(floor, 'boss');
                    mc.cell.monster.occupiedCells = markOccupiedCells(mc.x, mc.y, bossSize.width, bossSize.height, mc.cell);
                    Logger.info('放置Boss怪物在', mc.x, mc.y, '占据', mc.cell.monster.occupiedCells.length, '格');
                    break;
                }
            }
        }

        var eliteCount = Math.floor(monsterCells.length * eliteChance);
        var eliteSize = config.monsterSizes.elite;
        var placed = 0;

        for (let j = 0; j < monsterCells.length; j++) {
            var mc2 = monsterCells[j];
            if (placed >= eliteCount) break;
            if (mc2.cell.monster && mc2.cell.monster.sizeType === 'boss') continue;

            if (canPlaceLargeMonster(mc2.x, mc2.y, eliteSize.width, eliteSize.height)) {
                mc2.cell.monster = generateMonster(floor, 'elite');
                mc2.cell.monster.occupiedCells = markOccupiedCells(mc2.x, mc2.y, eliteSize.width, eliteSize.height, mc2.cell);
                placed++;
                Logger.info('放置精英怪物在', mc2.x, mc2.y);
            }
        }
    }

    function canPlaceLargeMonster(startX, startY, width, height) {
        var size = TOWER_CONFIG.gridSize;
        if (startX + width > size || startY + height > size) return false;

        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                if (dx === 0 && dy === 0) continue;
                var cell = grid[startY + dy] && grid[startY + dy][startX + dx];
                if (!cell || cell.type === 'exit' || cell.occupiedBy) return false;
            }
        }
        return true;
    }

    function markOccupiedCells(startX, startY, width, height, mainCell) {
        var occupiedCells = [{ x: startX, y: startY }];

        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                if (dx === 0 && dy === 0) continue;
                var nx = startX + dx;
                var ny = startY + dy;
                var cell = grid[ny][nx];

                cell.occupiedBy = { x: startX, y: startY };
                cell.originalType = cell.type;
                cell.type = 'monster_part';
                occupiedCells.push({ x: nx, y: ny });
            }
        }
        return occupiedCells;
    }

    function linkMonsterLocks() {
        var config = TOWER_CONFIG;
        var size = config.gridSize;
        var lockChance = config.monsterLockChance || 0.6;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                var cell = grid[y][x];
                if (cell.type !== 'monster' || !cell.monster) continue;
                if (Math.random() > lockChance) continue;

                var lockedCells = [];
                var monster = cell.monster;

                if (monster.sizeType === 'normal' || !monster.sizeType) {
                    lockResourcesAround(x, y, 1, lockedCells, monster);
                } else {
                    var occupiedCells = monster.occupiedCells || [{x: x, y: y}];
                    for (let k = 0; k < occupiedCells.length; k++) {
                        lockResourcesAround(occupiedCells[k].x, occupiedCells[k].y, 1, lockedCells, monster, occupiedCells);
                    }
                }

                if (lockedCells.length > 0) {
                    monster.lockedCells = lockedCells;
                    Logger.info('怪物', monster.name, '锁定了', lockedCells.length, '个资源格子');
                }
            }
        }
    }

    function lockResourcesAround(cx, cy, radius, lockedCells, monster, excludeCells) {
        var size = TOWER_CONFIG.gridSize;
        if (!excludeCells) excludeCells = null;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;

                var nx = cx + dx;
                var ny = cy + dy;

                if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
                if (excludeCells) {
                    var skip = false;
                    for (let i = 0; i < excludeCells.length; i++) {
                        if (excludeCells[i].x === nx && excludeCells[i].y === ny) {
                            skip = true;
                            break;
                        }
                    }
                    if (skip) continue;
                }

                var alreadyLocked = false;
                for (let j = 0; j < lockedCells.length; j++) {
                    if (lockedCells[j].x === nx && lockedCells[j].y === ny) {
                        alreadyLocked = true;
                        break;
                    }
                }
                if (alreadyLocked) continue;

                var neighborCell = grid[ny][nx];

                if (neighborCell.type === 'treasure' || neighborCell.type === 'material') {
                    if (!neighborCell.lockedByMonsters) {
                        neighborCell.lockedByMonsters = [];
                    }
                    var lockerX = (monster.occupiedCells && monster.occupiedCells.length > 0) ? monster.occupiedCells[0].x : cx;
                    var lockerY = (monster.occupiedCells && monster.occupiedCells.length > 0) ? monster.occupiedCells[0].y : cy;
                    neighborCell.lockedByMonsters.push({ x: lockerX, y: lockerY });
                    lockedCells.push({ x: nx, y: ny });
                }
            }
        }
    }

    function isResourceLocked(cell) {
        if (!cell || !cell.lockedByMonsters || cell.lockedByMonsters.length === 0) return false;

        for (let i = 0; i < cell.lockedByMonsters.length; i++) {
            var locker = cell.lockedByMonsters[i];
            var monsterCell = grid[locker.y] && grid[locker.y][locker.x];
            if (monsterCell && monsterCell.type === 'monster' && monsterCell.monster) return true;
        }
        return false;
    }

    function getAliveGuardianCount(cell) {
        if (!cell || !cell.lockedByMonsters) return 0;
        var count = 0;
        for (let i = 0; i < cell.lockedByMonsters.length; i++) {
            var locker = cell.lockedByMonsters[i];
            var monsterCell = grid[locker.y] && grid[locker.y][locker.x];
            if (monsterCell && monsterCell.type === 'monster' && monsterCell.monster) count++;
        }
        return count;
    }

    function generateCell(x, y, floor, weights, difficultyMult) {
        var rand = Math.random() * 100;
        var cumulative = 0;
        var type = 'empty';

        for (let key in weights) {
            cumulative += weights[key];
            if (rand < cumulative) {
                type = key;
                break;
            }
        }

        var cell = {
            type: type,
            explored: false,
            x: x,
            y: y
        };

        switch (type) {
            case 'monster':
                cell.monster = generateMonster(floor);
                break;
            case 'treasure':
                cell.treasure = generateTreasure(floor);
                break;
            case 'material':
                cell.material = generateMaterial(floor);
                break;
            case 'hiddenPath':
                cell.targetFloor = floor + 5;
                cell.difficulty = 'high';
                cell.guardian = generateHiddenPathBoss(floor);
                cell.guardianDefeated = false;
                break;
            case 'trap':
                cell.trap = generateTrap(floor);
                break;
        }

        return cell;
    }

    function generateMonster(floor, forceSizeType) {
        var config = TOWER_CONFIG;
        var difficultyMult = getTowerDifficultyMult(floor);

        var availableMonsters = config.monsters.filter(function(m) { return floor >= m.minFloor; });
        if (availableMonsters.length === 0) {
            availableMonsters = [config.monsters[config.monsters.length - 1]];
        }

        var monster = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];

        var sizeType = 'normal';
        if (forceSizeType) {
            sizeType = forceSizeType;
        } else {
            var eliteChance = config.eliteChance + (floor - config.eliteMinFloor) * 0.01;
            var bossChance = floor >= 20 ? 0.05 : 0;

            if (floor >= config.eliteMinFloor && Math.random() < bossChance) {
                sizeType = 'boss';
            } else if (floor >= config.eliteMinFloor && Math.random() < eliteChance) {
                sizeType = 'elite';
            }
        }

        var sizeConfig = config.monsterSizes[sizeType] || config.monsterSizes.normal;

        var floorAttackBonus = 1 + (floor - 1) * 0.02;

        var hpMult = 1, atkMult = 1;
        if (sizeType === 'elite') {
            hpMult = 1.5; atkMult = 1.5;
        } else if (sizeType === 'boss') {
            hpMult = 3; atkMult = 2.5;
        }

        return {
            id: monster.id,
            type: monster.id,
            name: monster.name,
            emoji: monster.emoji,
            hp: Math.floor(monster.hp * difficultyMult * hpMult),
            maxHp: Math.floor(monster.hp * difficultyMult * hpMult),
            attack: Math.floor(monster.attack * difficultyMult * floorAttackBonus * atkMult),
            attackInterval: monster.attackInterval || 2000,
            skills: monster.skills || null,
            active: true,
            defeated: false,
            sizeType: sizeType,
            sizeWidth: sizeConfig.width,
            sizeHeight: sizeConfig.height,
            occupiedCells: []
        };
    }

    function generateTreasure(floor) {
        var config = TOWER_CONFIG;
        var rand = Math.random();
        var treasureType;

        if (floor < 10) {
            treasureType = config.treasureTypes[0];
        } else if (floor < 25) {
            treasureType = rand < 0.7 ? config.treasureTypes[0] : config.treasureTypes[1];
        } else {
            treasureType = rand < 0.5 ? config.treasureTypes[1] : config.treasureTypes[2];
        }

        return {
            name: treasureType.name,
            emoji: treasureType.emoji,
            gold: randomRange(treasureType.gold[0], treasureType.gold[1]),
            materialChance: treasureType.materialChance,
            equipmentChance: treasureType.equipmentChance || 0,
            skillChance: treasureType.skillChance || 0,
            opened: false
        };
    }

    function generateMaterial(floor) {
        var config = TOWER_CONFIG;
        var availableMaterials = config.materialTypes.filter(function(m) { return floor >= (m.minFloor || 1); });
        var material = availableMaterials[Math.floor(Math.random() * availableMaterials.length)];

        return {
            id: material.id,
            name: material.name,
            emoji: material.emoji,
            amount: randomRange(material.amount[0], material.amount[1]),
            collected: false
        };
    }

    function generateTrap(floor) {
        var config = TOWER_CONFIG;
        var difficultyMult = getTowerDifficultyMult(floor);
        var trap = config.trapTypes[Math.floor(Math.random() * config.trapTypes.length)];

        return {
            name: trap.name,
            emoji: trap.emoji,
            damage: Math.floor(trap.damage * difficultyMult),
            effect: trap.effect,
            duration: trap.duration || 0,
            triggered: false
        };
    }

    function ensureHiddenPath(floor) {
        var config = TOWER_CONFIG;
        var size = config.gridSize;

        var hiddenPathCells = [];
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x].type === 'hiddenPath') {
                    hiddenPathCells.push({x: x, y: y});
                }
            }
        }

        if (hiddenPathCells.length > 1) {
            for (let i = 1; i < hiddenPathCells.length; i++) {
                var pos = hiddenPathCells[i];
                grid[pos.y][pos.x] = { type: 'empty', explored: false, x: pos.x, y: pos.y };
            }
            Logger.info('移除多余的隐藏之路，保留1个');
            return;
        }

        if (hiddenPathCells.length === 1) return;

        if (Math.random() > config.hiddenPathChance) {
            Logger.info('本层不生成隐藏之路');
            return;
        }

        var hx = Math.floor(Math.random() * 10) + 10;
        var hy = Math.floor(Math.random() * 10) + 10;
        grid[hy][hx] = {
            type: 'hiddenPath',
            explored: false,
            x: hx,
            y: hy,
            targetFloor: floor + config.hiddenPathSkipFloors,
            difficulty: 'high',
            guardian: generateHiddenPathBoss(floor),
            guardianDefeated: false
        };
        Logger.info('生成隐藏之路在', hx, hy, '可跳至第', floor + config.hiddenPathSkipFloors, '层');
    }

    function generateHiddenPathBoss(floor) {
        var config = TOWER_CONFIG;
        var difficultyMult = getTowerDifficultyMult(floor);

        var bossNames = ['守护者', '守门人', '看门灵', '守卫灵', '盘门龙'];
        var bossEmojis = ['🏛️', '🐉', '🦅', '🐢', '🐯'];
        var idx = Math.floor(Math.random() * bossNames.length);

        var baseHp = 3000 * difficultyMult;
        var baseAttack = 80 * difficultyMult;

        return {
            id: 'hidden_path_boss',
            name: bossNames[idx],
            emoji: bossEmojis[idx],
            hp: Math.floor(baseHp * 2),
            maxHp: Math.floor(baseHp * 2),
            attack: Math.floor(baseAttack * 1.5),
            attackInterval: 1200,
            defeated: false
        };
    }

    function exploreAround(x, y) {
        var allDirections = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];

        var unlockCount = blindSteps > 0 ? 1 : 3;

        var shuffled = allDirections.sort(function() { return Math.random() - 0.5; });

        var unlocked = 0;
        for (let i = 0; i < shuffled.length; i++) {
            if (unlocked >= unlockCount) break;

            var nx = x + shuffled[i][0];
            var ny = y + shuffled[i][1];

            if (nx >= 0 && nx < TOWER_CONFIG.gridSize && ny >= 0 && ny < TOWER_CONFIG.gridSize) {
                var neighborCell = grid[ny][nx];
                if (!neighborCell.explored) {
                    neighborCell.explored = true;
                    exploredCells.push({x: nx, y: ny});
                    unlocked++;
                    exploreLargeMonsterCells(nx, ny);
                }
            }
        }
    }

    function exploreLargeMonsterCells(x, y) {
        var cell = grid[y] && grid[y][x];
        if (!cell) return;

        if (cell.type === 'monster' && cell.monster && cell.monster.sizeType !== 'normal') {
            var occCells = cell.monster.occupiedCells || [];
            for (let i = 0; i < occCells.length; i++) {
                var occCell = grid[occCells[i].y] && grid[occCells[i].y][occCells[i].x];
                if (occCell && !occCell.explored) {
                    occCell.explored = true;
                    exploredCells.push({x: occCells[i].x, y: occCells[i].y});
                }
            }
            Logger.info('发现' + (cell.monster.sizeType === 'elite' ? '精英' : '守护灵') + '怪物，自动解锁其占据的格子');
        }

        if (cell.type === 'monster_part' && cell.occupiedBy) {
            var mainCell = grid[cell.occupiedBy.y] && grid[cell.occupiedBy.y][cell.occupiedBy.x];
            if (mainCell && mainCell.type === 'monster' && mainCell.monster) {
                if (!mainCell.explored) {
                    mainCell.explored = true;
                    exploredCells.push({x: cell.occupiedBy.x, y: cell.occupiedBy.y});
                }
                var occCells2 = mainCell.monster.occupiedCells || [];
                for (let j = 0; j < occCells2.length; j++) {
                    var occCell2 = grid[occCells2[j].y] && grid[occCells2[j].y][occCells2[j].x];
                    if (occCell2 && !occCell2.explored) {
                        occCell2.explored = true;
                        exploredCells.push({x: occCells2[j].x, y: occCells2[j].y});
                    }
                }
                Logger.info('发现大型怪物的一部分，自动解锁整个怪物');
            }
        }
    }

    function expireSavedHp() {
        var now = Date.now();
        for (var y = 0; y < grid.length; y++) {
            for (var x = 0; x < grid[y].length; x++) {
                var cell = grid[y][x];
                if (cell && cell.monster && cell.monster.savedHp != null) {
                    if (now - cell.monster.lastCombatTime > 30000) {
                        cell.monster.savedHp = null;
                        cell.monster.lastCombatTime = 0;
                        Logger.info('怪物', cell.monster.name, '30秒未再战，HP已恢复');
                    }
                }
            }
        }
    }

    function movePlayer(dx, dy) {
        if (inCombat) return;

        // 检查 30 秒过期，恢复怪物满血
        expireSavedHp();

        var newX = playerX + dx;
        var newY = playerY + dy;

        if (newX < 0 || newX >= TOWER_CONFIG.gridSize || newY < 0 || newY >= TOWER_CONFIG.gridSize) return;

        var targetCell = grid[newY][newX];
        if (isResourceLocked(targetCell)) {
            var guardianCount = getAliveGuardianCount(targetCell);
            addFloatText('🔒 此路被 ' + guardianCount + ' 个怪物封锁！', '#FF6B6B');
            return;
        }

        if (targetCell && targetCell.type === 'monster_part') {
            var mainMonster = grid[targetCell.occupiedBy.y] && grid[targetCell.occupiedBy.y][targetCell.occupiedBy.x];
            if (mainMonster && mainMonster.monster) {
                var typeName = mainMonster.monster.sizeType === 'elite' ? '精英' : '守护灵';
                addFloatText('⚔️ 无法通过' + typeName + '怪物！', '#FF6B6B');
                return;
            }
        }

        playerX = newX;
        playerY = newY;

        updateViewOffset();

        if (blindSteps > 0) {
            blindSteps--;
            if (blindSteps === 0) {
                Logger.info('迷雾效果消失！视野恢复正常');
            }
        }

        var cell = grid[newY][newX];
        Logger.info('移动到格子:', newX, newY, '类型:', cell ? cell.type : 'null', '已探索:', cell ? cell.explored : 'null');
        var isNewCell = !cell.explored;

        if (isNewCell) {
            cell.explored = true;
            exploredCells.push({x: newX, y: newY});
            exploreAround(newX, newY);
        }

        triggerCellEvent(cell);
        saveProgress();
    }

    function triggerCellEvent(cell) {
        switch (cell.type) {
            case 'monster':
                startCombat(cell);
                break;
            case 'treasure':
                if (isResourceLocked(cell)) {
                    var gc = getAliveGuardianCount(cell);
                    addFloatText('🔒 需要先击败 ' + gc + ' 个守卫怪物！', '#FF6B6B');
                    Logger.info('资源被锁定，剩余守卫数量:', gc);
                    return;
                }
                if (!cell.treasure.opened) {
                    openTreasure(cell);
                }
                break;
            case 'material':
                if (isResourceLocked(cell)) {
                    var gc2 = getAliveGuardianCount(cell);
                    addFloatText('🔒 需要先击败 ' + gc2 + ' 个守卫怪物！', '#FF6B6B');
                    Logger.info('资源被锁定，剩余守卫数量:', gc2);
                    return;
                }
                if (!cell.material.collected) {
                    collectMaterial(cell);
                }
                break;
            case 'trap':
                Logger.info('检查陷阱触发:', cell.trap.name, 'triggered=', cell.trap.triggered);
                if (!cell.trap.triggered) {
                    triggerTrap(cell);
                }
                break;
            case 'hiddenPath':
                if (!cell.guardianDefeated && cell.guardian) {
                    startHiddenPathBossCombat(cell);
                } else {
                    showHiddenPathDialog(cell);
                }
                break;
            case 'exit':
                enterNextFloor();
                break;
        }
    }

    function startCombat(cell) {
        inCombat = true;
        currentCell = cell;
        preCombatPlayerX = playerX;
        preCombatPlayerY = playerY;

        // 清理上局残留
        if (clearBattleAnimations) clearBattleAnimations();
        if (clearStars) clearStars();
        combatMonster = {};
        for (let key in cell.monster) {
            combatMonster[key] = cell.monster[key];
        }
        // 如果有上次未击杀的记录，用保存的 HP
        if (cell.monster.savedHp != null) {
            combatMonster.hp = cell.monster.savedHp;
            cell.monster.savedHp = null;
            cell.monster.lastCombatTime = 0;
        }
        combatReward = null;

        resetComboFn();

        Logger.info('遭遇怪物:', combatMonster.name, 'HP:', combatMonster.hp);

        // 委托给 BattleEngine
        if (battleEngine) {
            var pd = getPlayerData();
            var stats = getCharFullStats(pd.currentCharacterId);

            // 构建宠物数据
            var activePet = null;
            if (pd.pets && pd.pets.equipped && getPets) {
                var Pets = getPets();
                var equippedId = pd.pets.equipped;
                if (pd.pets.owned) {
                    for (var pi = 0; pi < pd.pets.owned.length; pi++) {
                        var po = pd.pets.owned[pi];
                        var poUid = (typeof po === 'object' && po.uid) ? po.uid : ('idx_' + pi);
                        if (poUid === equippedId) {
                            var poKey = typeof po === 'string' ? po : (po.id || po);
                            activePet = Pets[poKey] || null;
                            break;
                        }
                    }
                }
                if (!activePet) activePet = Pets[equippedId] || null;
            }

            // 构建技能列表
            var playerSkills = [];
            if (pd.activeSkills && pd.activeSkills.length > 0) {
                playerSkills = pd.activeSkills.slice();
            }

            var engineConfig = {
                monster: combatMonster,
                combatOverrides: TOWER_COMBAT_OVERRIDES,
                features: TOWER_COMBAT_FEATURES,
                playerHp: playerHp,
                playerMaxHp: playerMaxHp,
                playerShield: 0,
                playerStats: stats,
                activePet: activePet,
                playerSkills: playerSkills,
                mode: 'tower',
                floor: currentFloor,
                onMonsterDeath: function() { defeatMonster(); },
                onPlayerDeath: function() { playerDeath(); },
                onTimeUp: function() { combatTimeout(); }
            };

            if (initTowerEngineFn) {
                // 通过 NormalBattleAdapter 注入扩展钩子（特殊星星、伤害计算、动画）
                initTowerEngineFn(battleEngine, engineConfig);
            } else {
                battleEngine.init(engineConfig);
            }
        }

        combatTime = currentFloor <= 20 ? 40 : 25;
        setGameState('TOWER_COMBAT');

        // 启动 StarSystem 星星生成（统一星星机制和动画）
        if (updateStarSpawnIntervalFn) updateStarSpawnIntervalFn();
    }

    function stopCombatTimers() {
        combatTimer = _tm.clearInterval(combatTimer);
        combatMonsterAttackTimer = _tm.clearInterval(combatMonsterAttackTimer);
    }

    function pauseCombat() {
        if (!inCombat) return;
        if (battleEngine) battleEngine.pause();
        clearMoveInterval();
        clearTimerInterval();
    }

    function resumeCombat() {
        if (!inCombat) return;
        if (battleEngine) battleEngine.resume();
        if (updateStarSpawnIntervalFn) updateStarSpawnIntervalFn();
    }

    /** 统一战斗清理 — 清全局 stars + 动画 + BattleEngine */
    function cleanupCombat() {
        stopCombatTimers();
        if (battleEngine) battleEngine.destroy();
        if (releaseTowerEngineFn) releaseTowerEngineFn();
        if (clearBattleAnimations) clearBattleAnimations();
        if (clearStars) clearStars();
        combatMonster = null;
        inCombat = false;
    }

    function monsterAttackPlayer() {
        if (!inCombat || !combatMonster) return;

        var monsterAttack = combatMonster.attack || 10;
        var damage = monsterAttack;

        // 弹幕从怪物飞向玩家（屏幕底部）
        createMonsterProjectileAnimation(
            getScreenWidth() / 2,
            getScreenHeight() / 3,
            damage,
            0,
            false,
            function() {
                // 弹幕到达后检查闪避
                if (dodging && Date.now() < dodgeEndTime) {
                    // 闪避成功
                    createHpBarCounterAnimation();
                    var counterDamage = Math.floor(damage * 0.5);
                    combatMonster.hp -= counterDamage;
                    addGameMessage('💫 反击! -' + counterDamage, '#00ff88');
                    createMonsterDamageAnimation(getScreenWidth() / 2, getScreenHeight() / 3, counterDamage);
                    Logger.info('闪避反击! 伤害:', counterDamage);
                    if (combatMonster.hp <= 0) {
                        defeatMonster();
                    }
                    return;
                }

                // 护盾优先吸收
                var shieldAbsorb = 0;
                if (playerShield > 0) {
                    shieldAbsorb = Math.min(playerShield, damage);
                    playerShield -= shieldAbsorb;
                    damage -= shieldAbsorb;
                }

                // 扣血
                playerHp -= damage;

                // 护盾吸收的伤害 → 灰色数字（先显示，和普通模式一致）
                if (shieldAbsorb > 0) {
                    createPlayerDamageAnimation(shieldAbsorb, false, false, null, true);
                }

                // 实际扣血 → 减时间 + 显示伤害动画 + 震动
                if (damage > 0) {
                    var timeDamage = 5;
                    combatTime = Math.max(0, combatTime - timeDamage);
                    createPlayerDamageAnimation(damage, false);
                    createTimeDamageAnimation(timeDamage);
                    addGameMessage('-' + damage + ' 灵能', '#ff6b6b');
                    try { vibrateShort({ type: 'heavy' }); } catch (e) {}
                }

                Logger.info('怪物攻击玩家! 伤害:', damage, '护盾吸收:', shieldAbsorb, '剩余HP:', playerHp);

                // 中毒技能检查
                if (combatMonster.skills) {
                    var MonsterSkillType = getMonsterSkillType();
                    var poisonSkill = null;
                    for (var psi = 0; psi < combatMonster.skills.length; psi++) {
                        if (combatMonster.skills[psi].type === MonsterSkillType.POISON) {
                            poisonSkill = combatMonster.skills[psi];
                            break;
                        }
                    }
                    if (poisonSkill) {
                        playerPoisoned = true;
                        playerPoisonEndTime = Date.now() + (poisonSkill.duration || 3) * 1000;
                        playerPoisonDamage = poisonSkill.damage || 5;
                        playerPoisonTickTime = Date.now() + 1000;
                        var poisonLabel = playerShield > 0 ? '腐蚀!' : '中毒!';
                        createPlayerDamageAnimation(0, false, true, poisonLabel);
                        addGameMessage('☠️ ' + poisonLabel + ' 每秒-' + playerPoisonDamage + '灵能', '#ff6b6b');
                    }
                }

                // 眩晕技能检查
                if (combatMonster.skills) {
                    var stunSkill = null;
                    for (var ssi = 0; ssi < combatMonster.skills.length; ssi++) {
                        if (combatMonster.skills[ssi].type === 'stun') {
                            stunSkill = combatMonster.skills[ssi];
                            break;
                        }
                    }
                    if (stunSkill && Math.random() < (stunSkill.chance || 0)) {
                        playerStunned = true;
                        playerStunEndTime = Date.now() + (stunSkill.duration || 1000);
                        addGameMessage('⚡ 被打断!', '#ff6b6b');
                    }
                }

                if (playerHp <= 0) {
                    playerHp = 0;
                    playerDeath();
                }
            }
        );
    }

    function getActiveSkills() {
        var pd = getPlayerData();
        if (!pd.skills || !pd.skills.equipped) return [];
        var Skills = getSkillsConfig();
        var SkillTypes = getSkillTypes();
        return pd.skills.equipped.filter(function(sid) {
            var s = Skills[sid];
            return s && (s.type === SkillTypes.ATTACK || s.type === SkillTypes.SUPPORT);
        });
    }

    function getSkillCooldownRemaining(skillId) {
        // 优先从 BattleEngine 读取冷却
        if (battleEngine) {
            var beState = battleEngine.getState();
            var beCd = beState.skillCooldowns && beState.skillCooldowns[skillId];
            if (beCd) {
                var remaining = beCd.cooldownMs - (Date.now() - beCd.lastUseTime);
                return Math.max(0, Math.ceil(remaining / 1000));
            }
            return 0;
        }
        var cd = skillCooldowns[skillId];
        if (!cd) return 0;
        var remaining = cd.cooldownMs - (Date.now() - cd.lastUseTime);
        return Math.max(0, Math.ceil(remaining / 1000));
    }

    function useSkillInCombat(skillId) {
        if (!inCombat || !combatMonster) return false;

        // 代理到 BattleEngine
        if (battleEngine && battleEngine.useSkill(skillId)) return true;

        // 降级：旧逻辑
        var Skills = getSkillsConfig();
        var SkillTypes = getSkillTypes();
        var skill = Skills[skillId];
        if (!skill) return false;
        if (skill.type === SkillTypes.PASSIVE) return false;

        // 冷却检查
        var now = Date.now();
        var cd = skillCooldowns[skillId];
        if (cd && (cd.cooldownMs - (now - cd.lastUseTime)) > 0) return false;

        var success = false;

        switch (skill.effect) {
            case 'damage':
                if (combatMonster.hp <= 0) return false;
                var pd = getPlayerData();
                var stats = getCharFullStats(pd.currentCharacterId);
                var attackRatio = getSkillAttackRatio(skill.rarity);
                var baseAtk = (stats && stats.attack) ? stats.attack : 10;
                var damage = Math.floor(baseAtk * attackRatio);
                // 暴击
                var totalCritRate = stats ? stats.critRate : 0;
                var isCrit = Math.random() * 100 < totalCritRate;
                if (isCrit) {
                    var critDmg = stats ? stats.critDamage : 2.0;
                    damage = Math.floor(damage * critDmg);
                    createCritAnimation(getScreenWidth() / 2, getScreenHeight() / 3 - 30, damage, 0);
                }
                combatMonster.hp -= damage;
                createMonsterDamageAnimation(getScreenWidth() / 2, getScreenHeight() / 3, damage);
                addGameMessage(skill.emoji + ' ' + skill.name + '! -' + damage, '#00ccff');
                if (combatMonster.hp <= 0) defeatMonster();
                success = true;
                break;
            case 'heal':
                var healAmt = skill.heal;
                var maxHp = playerMaxHp;
                var actualHeal = Math.min(healAmt, maxHp - playerHp);
                if (actualHeal <= 0) return false;
                playerHp = Math.min(playerHp + healAmt, maxHp);
                addGameMessage(skill.emoji + ' +' + actualHeal + '灵能', '#00ff88');
                success = true;
                break;
            case 'shield':
                var shieldAmt = skill.shield;
                playerShield = (playerShield || 0) + shieldAmt;
                addGameMessage(skill.emoji + ' +' + shieldAmt + '护盾', '#cc88ff');
                success = true;
                break;
            case 'time':
                var timeAdd = skill.timeAdd || 0;
                combatTime += timeAdd;
                addGameMessage(skill.emoji + ' +' + timeAdd + '秒', '#00ccff');
                success = true;
                break;
            case 'speed':
                // 速度技能：重建 StarSystem 定时器（使用更短间隔）
                if (updateStarSpawnIntervalFn) updateStarSpawnIntervalFn();
                addGameMessage(skill.emoji + ' 攻速提升!', '#00ccff');
                success = true;
                break;
            case 'buff':
                // buff技能：通过临时增加玩家属性来增强
                // 简化实现：直接造成一次高伤害
                if (combatMonster.hp > 0) {
                    var buffDamage = (skill.attack || 0) + (stats ? stats.attack * 0.5 : 0);
                    if (buffDamage > 0) {
                        combatMonster.hp -= buffDamage;
                        createMonsterDamageAnimation(getScreenWidth() / 2, getScreenHeight() / 3, buffDamage);
                        addGameMessage(skill.emoji + ' 属性爆发! -' + Math.floor(buffDamage), '#00ccff');
                        if (combatMonster.hp <= 0) defeatMonster();
                    }
                }
                success = true;
                break;
            default:
                return false;
        }

        if (success) {
            skillCooldowns[skillId] = {
                lastUseTime: now,
                cooldownMs: skill.cooldown * 1000
            };
            try { vibrateShort({ type: 'medium' }); } catch (e) {}
        }
        return success;
    }

    function updateCombatTick() {
        if (!inCombat || !combatMonster) return;
        // 隐藏之路 Boss 不走 BattleEngine，用纯 TowerSystem 逻辑
        if (battleEngine && !isHiddenPathBoss) {
            battleEngine.update();
            // update 可能触发 finishBattle → destroy → inCombat=false
            // 此时不再同步，避免把 destroy 后的默认值（playerHp=100）覆写进来
            if (!inCombat) return;
            // 同步状态到 TowerSystem（供 getter 和渲染读取）
            var st = battleEngine.getState();
            combatMonster = st.monster;
            combatTime = st.timeLeft;
            playerHp = st.playerHp;
            playerShield = st.playerShield;
            playerStunned = st.isStunned;
            playerStunEndTime = st.stunEndTime;
            playerPoisoned = st.isPoisoned;
            comboStarActive = st.comboStarActive;
            dodging = st.dodging;
            playerRage = st.playerRage;
            greedyHpPool = st.greedyHpPool;

            return;
        }
        var now = Date.now();

        // 中毒效果
        if (playerPoisoned && now < playerPoisonEndTime) {
            if (now >= playerPoisonTickTime) {
                var poisonDmg = playerPoisonDamage;
                var shieldAbsorb = 0;
                if (playerShield > 0) {
                    shieldAbsorb = Math.min(playerShield, poisonDmg);
                    playerShield -= shieldAbsorb;
                    poisonDmg -= shieldAbsorb;
                }
                playerHp -= poisonDmg;
                playerPoisonTickTime = now + 1000;
                if (shieldAbsorb > 0) {
                    createPlayerDamageAnimation(shieldAbsorb, false, false, null, true);
                }
                if (poisonDmg > 0) {
                    createPlayerDamageAnimation(poisonDmg, false, true);
                }
                if (playerHp <= 0) {
                    playerHp = 0;
                    playerDeath();
                }
            }
        } else if (playerPoisoned) {
            playerPoisoned = false;
            playerPoisonDamage = 0;
        }
    }

    function combatTimeout() {
        // 保存怪物剩余 HP，允许再次挑战
        if (currentCell && currentCell.monster && combatMonster) {
            var remainHp = combatMonster.hp;
            if (remainHp > 0) {
                currentCell.monster.savedHp = remainHp;
                currentCell.monster.lastCombatTime = Date.now();
            }
        }

        cleanupCombat();

        playerHp -= Math.floor(playerMaxHp * 0.2);

        if (playerHp <= 0) {
            playerDeath();
        } else {
            playerX = preCombatPlayerX;
            playerY = preCombatPlayerY;
            updateViewOffset();
            setGameState('TOWER');
        }
    }

    function applyMaterialReward(pd, materialReward) {
        if (!materialReward) return;
        if (!pd.materials[materialReward.id]) {
            pd.materials[materialReward.id] = { quantity: 0, usedCount: 0 };
        }
        pd.materials[materialReward.id].quantity += materialReward.amount;
    }

    function rollMaterialDrop(rareRate, normalRate) {
        if (Math.random() < rareRate) {
            var rareMaterials = ['critCrystal', 'critFireSource'];
            return { id: rareMaterials[Math.floor(Math.random() * 2)], amount: 1 };
        }
        if (Math.random() < normalRate) {
            var normalMaterials = ['iceCrystal', 'fireSource'];
            var weights = [0.6, 0.4];
            var rand = Math.random();
            var cumulative = 0;
            for (let m = 0; m < normalMaterials.length; m++) {
                cumulative += weights[m];
                if (rand < cumulative) {
                    return { id: normalMaterials[m], amount: randomRange(1, 3) };
                }
            }
        }
        return null;
    }

    function unlockMonsterCells() {
        var lockedCells = currentCell.monster ? currentCell.monster.lockedCells : null;
        var monsterX = currentCell.x;
        var monsterY = currentCell.y;
        var fullyUnlockedCount = 0;

        if (lockedCells && lockedCells.length > 0) {
            for (let i = 0; i < lockedCells.length; i++) {
                var lockedCell = grid[lockedCells[i].y] && grid[lockedCells[i].y][lockedCells[i].x];
                if (lockedCell && lockedCell.lockedByMonsters) {
                    var newLockedBy = [];
                    for (let j = 0; j < lockedCell.lockedByMonsters.length; j++) {
                        var locker = lockedCell.lockedByMonsters[j];
                        if (!(locker.x === monsterX && locker.y === monsterY)) {
                            newLockedBy.push(locker);
                        }
                    }
                    lockedCell.lockedByMonsters = newLockedBy;
                    if (lockedCell.lockedByMonsters.length === 0) {
                        fullyUnlockedCount++;
                    }
                }
            }
            if (fullyUnlockedCount > 0) {
                addFloatText('🔓 完全解锁了 ' + fullyUnlockedCount + ' 个资源！', '#4CAF50');
                Logger.info('击败怪物完全解锁了', fullyUnlockedCount, '个资源格子');
            }
        }

        if (currentCell.monster && currentCell.monster.occupiedCells) {
            for (let k = 0; k < currentCell.monster.occupiedCells.length; k++) {
                var pos = currentCell.monster.occupiedCells[k];
                if (pos.x === currentCell.x && pos.y === currentCell.y) continue;
                var occupiedCell = grid[pos.y] && grid[pos.y][pos.x];
                if (occupiedCell) {
                    occupiedCell.type = 'empty';
                    occupiedCell.occupiedBy = null;
                }
            }
            Logger.info('清除了大型怪物的占据格子');
        }
    }

    function defeatHiddenPathBoss() {
        isHiddenPathBoss = false;
        currentCell.guardianDefeated = true;
        var bossName = currentCell.guardian ? currentCell.guardian.name : '守卫';
        Logger.info('击败隐藏之路守卫:', bossName);

        var floor = currentFloor;
        var goldReward = randomRange(50, 100) * floor;
        var expReward = randomRange(20, 40) * floor;
        var materialReward = rollMaterialDrop(0.15, 0.4);

        var pd = getPlayerData();
        pd.gold = (pd.gold || 0) + goldReward;
        applyMaterialReward(pd, materialReward);
        if (pd.currentCharacterId) {
            addCharExp(pd.currentCharacterId, expReward);
        }

        collectedRewards.push({
            type: 'hiddenPathBoss',
            gold: goldReward,
            material: materialReward,
            exp: expReward
        });

        victoryPopup = {
            gold: goldReward,
            exp: expReward,
            material: materialReward,
            alpha: 1,
            isBoss: true
        };

        addFloatText('🎉 守卫已击败！可以跳层了！', '#FFD700');

        if (victoryPopupTimer) _tm.clearTimeout(victoryPopupTimer);
        victoryPopupTimer = _tm.setTimeout(function() {
            victoryPopup = null;
            setGameState('TOWER');
            showHiddenPathDialog(currentCell);
        }, 1500);
    }

    function defeatNormalMonster() {
        unlockMonsterCells();

        var monsterSizeType = currentCell.monster ? currentCell.monster.sizeType : 'normal';
        var isElite = monsterSizeType === 'elite';
        var isBossMonster = monsterSizeType === 'boss';

        currentCell.type = 'empty';
        currentCell.monster = null;

        var floor = currentFloor;
        var goldMult = isElite ? 3 : (isBossMonster ? 10 : 1);
        var goldReward = Math.floor(randomRange(10, 30) * floor * goldMult);
        var materialReward = rollMaterialDrop(0.0008, 0.05);
        if (materialReward) {
            Logger.info('🎉 稀有掉落！获得稀世材料:', materialReward.id);
        }
        var expReward = randomRange(5, 15) * floor;

        var pd = getPlayerData();
        pd.gold = (pd.gold || 0) + goldReward;
        applyMaterialReward(pd, materialReward);
        if (pd.currentCharacterId) {
            addCharExp(pd.currentCharacterId, expReward);
        }

        collectedRewards.push({
            type: 'combat',
            gold: goldReward,
            material: materialReward,
            exp: expReward
        });

        Logger.info('击败怪物！奖励:', goldReward, '灵币', expReward, '感悟', materialReward);

        victoryPopup = {
            gold: goldReward,
            exp: expReward,
            material: materialReward,
            alpha: 1
        };

        if (victoryPopupTimer) _tm.clearTimeout(victoryPopupTimer);
        victoryPopupTimer = _tm.setTimeout(function() {
            var fadeOut = function() {
                if (victoryPopup && victoryPopup.alpha > 0) {
                    victoryPopup.alpha -= 0.05;
                    if (victoryPopup.alpha <= 0) {
                        victoryPopup = null;
                        setGameState('TOWER');
                        saveProgress();
                    } else {
                        requestAnimationFrame(fadeOut);
                    }
                }
            };
            fadeOut();
        }, 1500);
    }

    function defeatMonster() {
        // 清除怪物保存的 HP 记录
        if (currentCell && currentCell.monster) {
            currentCell.monster.savedHp = null;
            currentCell.monster.lastCombatTime = 0;
        }

        cleanupCombat();

        if (isHiddenPathBoss) {
            defeatHiddenPathBoss();
        } else {
            defeatNormalMonster();
        }
    }

    function addRewardFloatText(gold, exp, material) {
        var scale = getScreenScaleFn();
        var startY = getScreenHeight() - Math.floor(100 * scale);

        if (gold > 0) {
            combatRewardTexts.push({
                text: '💰 +' + gold,
                x: Math.floor(30 * scale),
                y: startY,
                alpha: 1,
                color: '#FFD700'
            });
        }

        if (exp > 0) {
            combatRewardTexts.push({
                text: '✨ +' + exp,
                x: Math.floor(30 * scale),
                y: startY + Math.floor(30 * scale),
                alpha: 1,
                color: '#00FF00'
            });
        }

        if (material) {
            var matNames = {
                'iceCrystal': '💧 水灵晶',
                'fireSource': '🔥 火灵源',
                'critCrystal': '💠 水灵暴晶',
                'critFireSource': '💥 火灵爆源',
                'devourerResidue': '✨ 吞噬残辉'
            };
            var isRare = material.id === 'critCrystal' || material.id === 'critFireSource' || material.id === 'devourerResidue';
            combatRewardTexts.push({
                text: matNames[material.id] + ' x' + material.amount,
                x: Math.floor(30 * scale),
                y: startY + Math.floor(60 * scale),
                alpha: 1,
                color: isRare ? '#FF00FF' : '#00BFFF'
            });
        }
    }

    function addFloatText(text, color) {
        var scale = getScreenScaleFn();
        var baseY = getScreenHeight() - Math.floor(80 * scale);
        var offsetY = combatRewardTexts.length * Math.floor(25 * scale);
        combatRewardTexts.push({
            text: text,
            x: Math.floor(30 * scale),
            y: baseY - offsetY,
            alpha: 1,
            color: color || '#FFD700'
        });
    }

    function updateRewardFloatTexts() {
        for (let i = combatRewardTexts.length - 1; i >= 0; i--) {
            var text = combatRewardTexts[i];
            text.y -= 1;
            text.alpha -= 0.008;
            if (text.alpha <= 0) {
                combatRewardTexts.splice(i, 1);
            }
        }
    }

    function giveBossRewards(floor) {
        var config = TOWER_CONFIG;
        var boss = null;
        for (let i = 0; i < config.bosses.length; i++) {
            if (config.bosses[i].floor === floor) {
                boss = config.bosses[i];
                break;
            }
        }

        if (boss) {
            var goldReward = randomRange(100, 300) * Math.floor(floor / 5);
            var pd = getPlayerData();
            pd.gold = (pd.gold || 0) + goldReward;

            var starSource = randomRange(10, 30);
            pd.starSource = (pd.starSource || 0) + starSource;

            collectedRewards.push({
                type: 'bossReward',
                gold: goldReward,
                starSource: starSource
            });

            Logger.info('Boss层奖励！灵币:', goldReward, '灵石:', starSource);
        }
    }

    function openTreasure(cell) {
        var treasure = cell.treasure;
        treasure.opened = true;

        var pd = getPlayerData();
        pd.gold = (pd.gold || 0) + treasure.gold;
        collectedRewards.push({type: 'gold', amount: treasure.gold});

        addFloatText('💰 +' + treasure.gold, '#FFD700');

        if (Math.random() < treasure.materialChance) {
            var materials = ['iceCrystal', 'fireSource'];
            var matNames = { 'iceCrystal': '💧 水灵晶', 'fireSource': '🔥 火灵源' };
            var matId = materials[Math.floor(Math.random() * materials.length)];
            if (!pd.materials[matId]) {
                pd.materials[matId] = {quantity: 0, usedCount: 0};
            }
            pd.materials[matId].quantity++;
            collectedRewards.push({type: 'material', id: matId});
            addFloatText(matNames[matId] + ' +1', '#00BFFF');
        }

        Logger.info('打开宝箱！获得灵币:', treasure.gold);
    }

    function collectMaterial(cell) {
        var material = cell.material;
        material.collected = true;

        var pd = getPlayerData();
        if (!pd.materials[material.id]) {
            pd.materials[material.id] = {quantity: 0, usedCount: 0};
        }
        pd.materials[material.id].quantity += material.amount;

        collectedRewards.push({type: 'material', id: material.id, amount: material.amount});

        var matNames = {
            'iceCrystal': '💧 水灵晶',
            'fireSource': '🔥 火灵源',
            'critCrystal': '💠 水灵暴晶',
            'critFireSource': '💥 火灵爆源',
            'devourerResidue': '✨ 吞噬残辉'
        };
        var isRare = material.id === 'critCrystal' || material.id === 'critFireSource' || material.id === 'devourerResidue';
        addFloatText(matNames[material.id] + ' +' + material.amount, isRare ? '#FF00FF' : '#00BFFF');

        Logger.info('收集材料！', material.name, 'x', material.amount);
    }

    function triggerTrap(cell) {
        var trap = cell.trap;
        Logger.info('触发陷阱:', trap.name, '效果:', trap.effect, '已触发:', trap.triggered);
        trap.triggered = true;

        switch (trap.effect) {
            case 'damage':
                playerHp -= trap.damage;
                Logger.info('触发陷阱！受到伤害:', trap.damage);
                break;
            case 'fog':
                blindSteps = 50;
                Logger.info('触发迷雾陷阱！视野受限，持续50步');
                break;
            case 'teleport':
                var gridSize = TOWER_CONFIG.gridSize;
                var randX = Math.floor(Math.random() * gridSize);
                var randY = Math.floor(Math.random() * gridSize);
                Logger.info('传送陷阱: 随机传送到', randX, randY);

                playerX = randX;
                playerY = randY;
                updateViewOffset();

                var teleportCell = grid[randY][randX];
                if (!teleportCell.explored) {
                    teleportCell.explored = true;
                    exploredCells.push({x: randX, y: randY});
                    Logger.info('传送解锁新格子:', randX, randY);
                    exploreLargeMonsterCells(randX, randY);
                }

                addFloatText('🌀 空间传送！', '#9B59B6');

                if (teleportCell) {
                    Logger.info('传送目标格子类型:', teleportCell.type);
                    _tm.setTimeout(function() {
                        triggerCellEvent(teleportCell);
                    }, 100);
                }

                Logger.info('触发传送陷阱！');
                break;
            case 'blind':
            case 'poison':
                playerHp -= trap.damage;
                Logger.info('触发状态陷阱！', trap.effect);
                break;
        }

        if (playerHp <= 0) {
            playerDeath();
        }
    }

    function startHiddenPathBossCombat(cell) {
        inCombat = true;
        currentCell = cell;
        combatMonster = {};
        for (let key in cell.guardian) {
            combatMonster[key] = cell.guardian[key];
        }
        combatTime = 45;
        combatReward = null;
        isHiddenPathBoss = true;
        lastStarClickTime = 0;
        playerShield = 0;
        playerRage = 0;
        greedyHpPool = 0;
        greedySkillUnlocked = false;
        dodging = false;
        dodgeEndTime = 0;
        comboStarActive = false;
        comboStarStartTime = 0;
        comboStarLastAttackTime = 0;
        playerPoisoned = false;
        playerPoisonEndTime = 0;
        playerPoisonDamage = 0;
        playerPoisonTickTime = 0;
        playerStunned = false;
        playerStunEndTime = 0;
        resetComboFn();

        Logger.info('遭遇隐藏之路守卫:', combatMonster.name, 'HP:', combatMonster.hp);

        setGameState('TOWER_COMBAT');
        // 启动怪物攻击定时器
        var attackInterval = combatMonster.attackInterval || 2000;
        combatMonsterAttackTimer = _tm.setInterval(function() {
            if (!inCombat || !combatMonster) return;
            monsterAttackPlayer();
        }, attackInterval);
    }

    function showHiddenPathDialog(cell) {
        currentCell = cell;
        var curFloor = currentFloor;
        var skipOptions = TOWER_CONFIG.hiddenPathSkipOptions;

        hiddenPathDialog = {
            cell: cell,
            currentFloor: curFloor,
            options: skipOptions.map(function(skip) {
                return {
                    skip: skip,
                    targetFloor: curFloor + skip
                };
            })
        };
        Logger.info('显示隐藏之路对话框，当前层数:', curFloor, '选项:', hiddenPathDialog.options);
    }

    function enterHiddenPath(targetFloor) {
        if (!currentCell || currentCell.type !== 'hiddenPath') return;

        currentFloor = targetFloor;
        generateFloor(targetFloor);

        playerX = 0;
        playerY = 0;
        exploredCells = [{x: 0, y: 0}];

        playerHp = Math.min(playerHp + Math.floor(playerMaxHp * 0.3), playerMaxHp);

        Logger.info('进入隐藏之路！跳转到第', targetFloor, '层');
        saveProgress();
    }

    function enterNextFloor() {
        var nextFloor = currentFloor + 1;
        currentFloor = nextFloor;
        generateFloor(nextFloor);

        playerX = 0;
        playerY = 0;
        exploredCells = [{x: 0, y: 0}];

        playerHp = Math.min(playerHp + Math.floor(playerMaxHp * 0.1), playerMaxHp);

        addFloatText('🚪 进入第 ' + nextFloor + ' 层', '#00FF00');
        Logger.info('进入下一层！当前层数:', nextFloor);
        saveProgress();
    }

    function playerDeath() {
        Logger.info('灵核归零！爬塔结束');

        cleanupCombat();

        clearTimerInterval();
        clearMoveInterval();
        clearMonsterAttackInterval();

        hiddenPathDialog = null;
        victoryPopup = null;
        if (victoryPopupTimer) {
            clearTimeout(victoryPopupTimer);
            victoryPopupTimer = null;
        }

        var earnedGold = 0;
        for (let i = 0; i < collectedRewards.length; i++) {
            if (collectedRewards[i].type === 'gold') earnedGold += collectedRewards[i].amount;
        }
        var halfGold = Math.floor(earnedGold * 0.5);

        resultData = {
            highestFloor: currentFloor,
            earnedGold: halfGold,
            totalRewards: collectedRewards.length
        };

        var pd = getPlayerData();
        pd.infiniteTower.currentFloor = 1;
        pd.infiniteTower.currentHp = playerMaxHp;
        pd.infiniteTower.collectedRewards = [];
        pd.infiniteTower.exploredCells = [];
        pd.infiniteTower.playerX = 0;
        pd.infiniteTower.playerY = 0;
        pd.infiniteTower.grid = null;
        pd.infiniteTower.blindSteps = 0;
        pd.infiniteTower.isPaused = false;
        pd.gold = (pd.gold || 0) + halfGold;

        if (currentFloor > (pd.infiniteTower.highestFloor || 0)) {
            pd.infiniteTower.highestFloor = currentFloor;
        }

        saveData();

        resultEndTime = Date.now();
        setGameState('TOWER_RESULT');
    }

    function restartTower() {
        currentFloor = 1;
        playerHp = playerMaxHp;
        exploredCells = [];
        collectedRewards = [];
        inCombat = false;
        isHiddenPathBoss = false;
        blindSteps = 0;
        victoryPopup = null;
        combatRewardTexts = [];
        hiddenPathDialog = null;
        resultData = null;
        if (victoryPopupTimer) {
            clearTimeout(victoryPopupTimer);
            victoryPopupTimer = null;
        }

        generateFloor(1);

        playerX = 0;
        playerY = 0;
        grid[0][0].explored = true;
        exploredCells.push({x: 0, y: 0});
        exploreAround(0, 0);

        saveProgress();
        setGameState('TOWER');
        Logger.info('重新开始爬塔！');
    }

    function saveProgress() {
        var pd = getPlayerData();
        pd.infiniteTower.currentFloor = currentFloor;
        pd.infiniteTower.currentHp = playerHp;
        pd.infiniteTower.maxHp = playerMaxHp;
        pd.infiniteTower.playerX = playerX;
        pd.infiniteTower.playerY = playerY;
        pd.infiniteTower.highestFloor = Math.max(pd.infiniteTower.highestFloor || 0, currentFloor);

        saveData();
    }

    function pauseTower() {
        // 先保存战斗状态到 grid，再拷贝 grid
        if (inCombat) {
            if (currentCell && currentCell.monster && combatMonster) {
                var remainHp = combatMonster.hp;
                if (remainHp > 0) {
                    currentCell.monster.savedHp = remainHp;
                    currentCell.monster.lastCombatTime = Date.now();
                }
            } else if (currentCell && currentCell.guardian && combatMonster && isHiddenPathBoss) {
                var guardianHp = combatMonster.hp;
                if (guardianHp > 0) {
                    currentCell.guardian.hp = guardianHp;
                }
            }
            cleanupCombat();
        }
        inCombat = false;
        isHiddenPathBoss = false;

        // 停止星星生成和计时器
        clearMoveInterval();
        clearTimerInterval();

        var pd = getPlayerData();
        pd.infiniteTower.currentFloor = currentFloor;
        pd.infiniteTower.currentHp = playerHp;
        pd.infiniteTower.maxHp = playerMaxHp;
        pd.infiniteTower.playerX = playerX;
        pd.infiniteTower.playerY = playerY;
        pd.infiniteTower.collectedRewards = collectedRewards.map(function(r) { return {x: r.x, y: r.y}; });
        pd.infiniteTower.exploredCells = exploredCells.map(function(c) { return {x: c.x, y: c.y}; });
        pd.infiniteTower.grid = grid.map(function(row) { return row.map(function(cell) {
            var copy = Object.assign({}, cell);
            if (cell.occupiedBy) copy.occupiedBy = Object.assign({}, cell.occupiedBy);
            if (cell.monster) copy.monster = Object.assign({}, cell.monster);
            if (cell.guardian) copy.guardian = Object.assign({}, cell.guardian);
            return copy;
        }); });
        pd.infiniteTower.blindSteps = blindSteps;
        pd.infiniteTower.isPaused = true;
        pd.infiniteTower.highestFloor = Math.max(pd.infiniteTower.highestFloor || 0, currentFloor);
        if (victoryPopupTimer) {
            clearTimeout(victoryPopupTimer);
            victoryPopupTimer = null;
        }

        setGameState('WORLDMAP');
        showToast({ title: '进度已保存，下次继续！', icon: 'none', duration: 2000 });
        saveData();
        Logger.info('爬塔进度已暂停保存，层数:', currentFloor);
    }

    function giveUp() {
        var totalGold = 0;
        for (let i = 0; i < collectedRewards.length; i++) {
            if (collectedRewards[i].type === 'gold') totalGold += collectedRewards[i].amount;
        }

        var pd = getPlayerData();
        if (currentFloor > (pd.infiniteTower.highestFloor || 0)) {
            pd.infiniteTower.highestFloor = currentFloor;
            pd.infiniteTower.totalClears = (pd.infiniteTower.totalClears || 0) + 1;
        }

        pd.infiniteTower.currentFloor = 1;
        pd.infiniteTower.currentHp = playerMaxHp;
        pd.infiniteTower.collectedRewards = [];
        pd.infiniteTower.exploredCells = [];
        pd.infiniteTower.playerX = 0;
        pd.infiniteTower.playerY = 0;
        pd.infiniteTower.grid = null;
        pd.infiniteTower.blindSteps = 0;
        pd.infiniteTower.isPaused = false;
        pd.infiniteTower.totalKills = 0;
        pd.infiniteTower.totalTreasures = 0;
        pd.infiniteTower.totalMaterials = 0;

        currentFloor = 1;
        collectedRewards = [];
        inCombat = false;
        isHiddenPathBoss = false;
        stopCombatTimers();

        setGameState('WORLDMAP');
        showToast({ title: '放弃挑战！获得' + totalGold + '灵币', icon: 'none', duration: 2000 });
        saveData();
    }


    function updateViewOffset() {
        var scale = getScreenScaleFn();
        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var cellSize = Math.floor(30 * scale);
        var viewWidth = sw - Math.floor(40 * scale);
        var viewHeight = sh - Math.floor(150 * scale);

        var centerX = viewWidth / 2;
        var centerY = viewHeight / 2;

        viewOffsetX = centerX - playerX * cellSize;
        viewOffsetY = centerY - playerY * cellSize;

        var maxOffsetX = 0;
        var maxOffsetY = 0;
        var minOffsetX = viewWidth - TOWER_CONFIG.gridSize * cellSize;
        var minOffsetY = viewHeight - TOWER_CONFIG.gridSize * cellSize;

        viewOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, viewOffsetX));
        viewOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, viewOffsetY));
    }

    // ==================== 公共 API ====================

    return {
        // 初始化
        init: function() {
            clearTimerInterval();
            clearMoveInterval();
            clearMonsterAttackInterval();

            inCombat = false;
            combatMonster = null;
            currentCell = null;
            victoryPopup = null;
            combatRewardTexts = [];
            if (victoryPopupTimer) {
                clearTimeout(victoryPopupTimer);
                victoryPopupTimer = null;
            }

            var pd = getPlayerData();
            if (!pd.infiniteTower) {
                pd.infiniteTower = {
                    highestFloor: 0,
                    totalClears: 0,
                    currentFloor: 1,
                    currentHp: 100,
                    maxHp: 100,
                    collectedRewards: [],
                    exploredCells: [],
                    playerX: 0,
                    playerY: 0,
                    totalKills: 0,
                    totalTreasures: 0,
                    totalMaterials: 0,
                    isPaused: false,
                    grid: null,
                    blindSteps: 0
                };
            }

            if (pd.infiniteTower.isPaused && pd.infiniteTower.grid) {
                this.resumeProgress();
            } else {
                this.startNew();
            }
        },

        startNew: function() {
            currentFloor = 1;
            playerHp = calculateMaxHp();
            playerMaxHp = calculateMaxHp();
            exploredCells = [];
            collectedRewards = [];
            blindSteps = 0;
            isHiddenPathBoss = false;

            generateFloor(currentFloor);

            playerX = 0;
            playerY = 0;

            grid[0][0].explored = true;
            exploredCells.push({x: 0, y: 0});

            exploreAround(0, 0);

            getPlayerData().infiniteTower.isPaused = false;
            saveProgress();

            Logger.info('爬塔模式重新开始');
        },

        resumeProgress: function() {
            var saved = getPlayerData().infiniteTower;

            currentFloor = saved.currentFloor || 1;
            playerHp = saved.currentHp || calculateMaxHp();
            playerMaxHp = saved.maxHp || calculateMaxHp();
            playerX = saved.playerX || 0;
            playerY = saved.playerY || 0;
            collectedRewards = (saved.collectedRewards || []).map(function(r) { return {x: r.x, y: r.y}; });
            exploredCells = (saved.exploredCells || []).map(function(c) { return {x: c.x, y: c.y}; });
            blindSteps = saved.blindSteps || 0;
            isHiddenPathBoss = false;

            if (saved.grid) {
                grid = saved.grid.map(function(row) { return row.map(function(cell) {
                    var copy = Object.assign({}, cell);
                    if (cell.occupiedBy) copy.occupiedBy = Object.assign({}, cell.occupiedBy);
                    if (cell.monster) copy.monster = Object.assign({}, cell.monster);
                    if (cell.guardian) copy.guardian = Object.assign({}, cell.guardian);
                    return copy;
                }); });
            } else {
                generateFloor(currentFloor);
            }

            getPlayerData().infiniteTower.isPaused = false;

            Logger.info('恢复爬塔进度，层数:', currentFloor, '血量:', playerHp);
            showToast({ title: '继续挑战！第' + currentFloor + '层', icon: 'none', duration: 1500 });
        },

        // 核心方法
        movePlayer: movePlayer,
        playerDeath: playerDeath,
        restartTower: restartTower,
        saveProgress: saveProgress,
        pauseTower: pauseTower,
        giveUp: giveUp,
        enterHiddenPath: enterHiddenPath,
        updateViewOffset: updateViewOffset,
        updateRewardFloatTexts: updateRewardFloatTexts,
        giveBossRewards: giveBossRewards,
        updateCombatTick: updateCombatTick,
        useSkillInCombat: useSkillInCombat,
        getActiveSkills: getActiveSkills,
        getSkillCooldownRemaining: getSkillCooldownRemaining,

        isResourceLocked: isResourceLocked,
        getAliveGuardianCount: getAliveGuardianCount,
        showHiddenPathDialog: showHiddenPathDialog,

        // 状态访问器
        get grid() { return grid; },
        get playerX() { return playerX; },
        get playerY() { return playerY; },
        get currentFloor() { return currentFloor; },
        set currentFloor(v) { currentFloor = v; },
        get playerHp() { return playerHp; },
        set playerHp(v) { playerHp = v; },
        get playerMaxHp() { return playerMaxHp; },
        set playerMaxHp(v) { playerMaxHp = v; },
        get playerShield() { return playerShield; },
        get exploredCells() { return exploredCells; },
        get collectedRewards() { return collectedRewards; },
        set collectedRewards(v) { collectedRewards = v; },
        get currentCell() { return currentCell; },
        set currentCell(v) { currentCell = v; },
        get inCombat() { return inCombat; },
        set inCombat(v) { inCombat = v; },
        get isHiddenPathBoss() { return isHiddenPathBoss; },
        get combatMonster() { return combatMonster; },
        set combatMonster(v) { combatMonster = v; },
        get viewOffsetX() { return viewOffsetX; },
        get viewOffsetY() { return viewOffsetY; },
        get touchStartX() { return touchStartX; },
        set touchStartX(v) { touchStartX = v; },
        get touchStartY() { return touchStartY; },
        set touchStartY(v) { touchStartY = v; },
        get isDragging() { return isDragging; },
        set isDragging(v) { isDragging = v; },
        get blindSteps() { return blindSteps; },
        get resultData() { return resultData; },
        set resultData(v) { resultData = v; },
        get resultEndTime() { return resultEndTime; },
        get rewardPopup() { return rewardPopup; },
        get combatTime() { return combatTime; },
        get combatReward() { return combatReward; },
        get combatRewardTexts() { return combatRewardTexts; },
        set combatRewardTexts(v) { combatRewardTexts = v; },
        get victoryPopup() { return victoryPopup; },
        set victoryPopup(v) { victoryPopup = v; },
        set victoryPopupTimer(v) { victoryPopupTimer = v; },
        get hiddenPathDialog() { return hiddenPathDialog; },
        set hiddenPathDialog(v) { hiddenPathDialog = v; },
        get playerStunned() { return playerStunned; },
        get playerStunEndTime() { return playerStunEndTime; },
        get comboStarActive() { return comboStarActive; },
        get comboStarStartTime() { return comboStarStartTime; },

        /**
         * 重新开始当前战斗（怪物HP/技能CD重置，玩家HP/Shield重置到战斗前）
         */
        restartCurrentCombat: function() {
            if (!currentCell || !currentCell.monster) return;
            // 怪物HP恢复满
            currentCell.monster.hp = currentCell.monster.maxHp;
            currentCell.monster.savedHp = null;
            currentCell.monster.lastCombatTime = 0;
            cleanupCombat();
            combatReward = null;
            resetComboFn();
            playerShield = 0;
            playerRage = 0;
            playerPoisoned = false;
            playerPoisonEndTime = 0;
            playerPoisonDamage = 0;
            playerPoisonTickTime = 0;
            playerStunned = false;
            playerStunEndTime = 0;
            dodging = false;
            comboStarActive = false;
            skillCooldowns = {};
            // 重新进入战斗
            startCombat(currentCell);
        },

        pauseCombat: pauseCombat,
        resumeCombat: resumeCombat,
        _setBattleEngine: function(engine) { battleEngine = engine; },
        _getBattleEngine: function() { return battleEngine; },
        get battleEngine() { return battleEngine; }
    };
}

export { TOWER_CONFIG, createTowerSystem };
