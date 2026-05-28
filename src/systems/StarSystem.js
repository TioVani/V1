import Logger from '../utils/Logger.js';
import { PauseCoordinator } from '../utils/PauseCoordinator.js';
/**
 * 星星系统（Star System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 *
 * 包含：星星生成（随机/下落）、合并、过期清理、闪避星星生成、星星生成间隔管理
 * 不包含：星星点击处理（暂留 game.js）、星星绘制（drawStar 暂留 game.js）
 */

// 星星模式枚举
var STAR_MODE = {
    RANDOM: 'random',
    FALLING: 'falling'
};

// 下落模式配置
var FALLING_CONFIG = {
    lanes: 4,
    laneWidth: 0,
    fallSpeed: 10,
    spawnInterval: 800,
    bottomHitZone: 40,
    perfectZone: 15,
    superPerfectZone: 10,
    starSize: 48
};

var MAX_STARS_ON_SCREEN = 5;

// ==================== 星星出生动画配置 ====================
var BIRTH_ANIMS = {
    normal: { duration: 150, scaleTo: 1.1, easing: 'overshoot' },
    big:    { duration: 250, scaleTo: 1.3, easing: 'overshoot' },
    falling:{ duration: 100, scaleTo: 1.05, easing: 'easeOut' },
    dodge:  { duration: 125, scaleTo: 1.1, easing: 'overshoot' }
};
var DEFAULT_BIRTH_ANIM = { duration: 150, scaleTo: 1.1, easing: 'overshoot' };

function easeOutBack(t) {
    var c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

function easeOutQuad(t) {
    return t * (2 - t);
}

function getBirthTransform(star, now) {
    var config = BIRTH_ANIMS[star.type] || DEFAULT_BIRTH_ANIM;
    if (!config.duration) return 1;

    var elapsed = now - star.createTime;
    if (elapsed >= config.duration) return 1;

    var t = elapsed / config.duration;
    var eased = config.easing === 'overshoot' ? easeOutBack(t) : easeOutQuad(t);

    return config.scaleTo * eased;
}

function createStarSystem(deps) {
    // 依赖注入
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };
    var DESIGN_HEIGHT = 812;
    var getSaveData = deps.getSaveData;
    var getGameState = deps.getGameState;
    var getGameConst = deps.getGameConst;
    var getSeasonSelection = deps.getSeasonSelection;
    var getStars = deps.getStars;
    var setStars = deps.setStars;
    var pushStar = deps.pushStar;
    var getStarThief = deps.getStarThief;

    // PauseCoordinator 注册 — 进入战斗时 subscribe，退出时 unsubscribe
    var _owner = { _destroyed: false };
    PauseCoordinator.instance.subscribe(_owner, 'StarSystem', {
        onPause: function() {
            var mi = getMoveInterval();
            if (mi) {
                clearInterval(mi);
                setMoveInterval(null);
            }
        },
        onResume: function(duration) {
            var starsArr = getStars();
            for (var i = 0; i < starsArr.length; i++) {
                if (starsArr[i].disappearTime) starsArr[i].disappearTime += duration;
                if (starsArr[i].createTime) starsArr[i].createTime += duration;
            }
        }
    });
    var getMoveInterval = deps.getMoveInterval;
    var setMoveInterval = deps.setMoveInterval;
    var getCurrentStarInterval = deps.getCurrentStarInterval;
    var setCurrentStarInterval = deps.setCurrentStarInterval || null;
    var getPauseStartTime = deps.getPauseStartTime || null;

    // ─── spec 参数读取（从 BattleEngine RC 或回退到 COMBAT_SPEC） ───
    var _getSpecValue = deps.getSpecValueFn || null;
    var _COMBAT_SPEC = deps.combatSpec || null;

    function specVal(path) {
        if (_getSpecValue) return _getSpecValue(path);
        if (_COMBAT_SPEC) {
            var parts = path.split('.');
            var v = _COMBAT_SPEC;
            for (var i = 0; i < parts.length; i++) { v = v[parts[i]]; }
            return v;
        }
        // 最终回退：文件级常量
        if (path === 'STAR.MAX_ON_SCREEN') return MAX_STARS_ON_SCREEN;
        return 0;
    }

    // ==================== 内部状态 ====================
    var starMode = STAR_MODE.RANDOM;

    // ==================== 核心方法 ====================

    /**
     * 设置星星模式
     */
    function setStarMode(mode) {
        starMode = mode;
    }

    /**
     * 获取星星模式
     */
    function getStarMode() {
        return starMode;
    }

    /**
     * 添加新星星（根据模式分发）
     */
    function addNewStar() {
        if (starMode === STAR_MODE.FALLING) {
            addFallingStar();
        } else {
            addRandomStar();
        }
    }

    /**
     * 随机生成模式
     */
    function addRandomStar() {
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var pd = getSaveData();
        var state = getGameState();
        var GAME_STATE = getGameConst();
        var seasonSelection = getSeasonSelection();
        var stars = getStars();

        var designOffsetY = getDesignOffsetY();
        var scale = getScreenScale();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
        var padding = 48 + 20;
        var centerY = (designOffsetY + designBottom) / 2 + Math.floor(100 * scale);
        var spawnRadius = Math.floor(80 * scale);
        var minY = centerY - spawnRadius;
        var maxY = centerY + spawnRadius;
        var starSize = specVal('STAR.SIZE');
        var maxRenderSize = starSize * 1.2;
        var minDistance = maxRenderSize * specVal('STAR.OVERLAP_MULT');

        // 检查当前可见星星数量
        var visibleCount = 0;
        for (let i = 0; i < stars.length; i++) {
            if (stars[i].visible) visibleCount++;
        }

        // 如果已经有足够星星，触发合成
        if (visibleCount >= specVal('STAR.MAX_ON_SCREEN')) {
            mergeStars();
            return;
        }

        // 决定星星类型
        var type = 'normal';
        var isSeasonMode = (state === GAME_STATE.SEASON_PLAYING);
        var normalStarEnabled = pd.normalStarEnabled !== false;

        if (isSeasonMode && seasonSelection.starTypes && seasonSelection.starTypes.length > 0) {
            var randomIndex = Math.floor(Math.random() * seasonSelection.starTypes.length);
            var selectedType = seasonSelection.starTypes[randomIndex];
            if (selectedType !== 'normal' && Math.random() < 0.4) {
                type = selectedType;
            }
        } else {
            var equippedSpecialStars = (pd.equippedStars || []).filter(function(s) { return s !== 'dodge'; });

            if (equippedSpecialStars.length > 0) {
                if (!normalStarEnabled) {
                    var ri = Math.floor(Math.random() * equippedSpecialStars.length);
                    type = equippedSpecialStars[ri];
                } else {
                    if (Math.random() < 0.3) {
                        var ri2 = Math.floor(Math.random() * equippedSpecialStars.length);
                        type = equippedSpecialStars[ri2];
                    }
                }
            } else {
                if (!normalStarEnabled) {
                    Logger.info('普通星星已关闭且无装备特殊星星，跳过生成');
                    return;
                }
            }
        }

        // 尝试找到一个不重叠的位置
        var x, y, foundPosition = false;
        for (let attempt = 0; attempt < 20; attempt++) {
            x = padding + Math.random() * (screenWidth - padding * 2);
            y = minY + Math.random() * (maxY - minY);

            var overlap = false;
            for (let j = 0; j < stars.length; j++) {
                if (!stars[j].visible) continue;
                var distance = Math.sqrt(Math.pow(x - stars[j].x, 2) + Math.pow(y - stars[j].y, 2));
                if (distance < minDistance) {
                    overlap = true;
                    break;
                }
            }

            if (!overlap) {
                foundPosition = true;
                break;
            }
        }

        // 20次失败后降级：缩短碰撞距离再试一轮
        if (!foundPosition) {
            var reducedMinDist = minDistance * 0.6;
            for (let attempt2 = 0; attempt2 < 15; attempt2++) {
                x = padding + Math.random() * (screenWidth - padding * 2);
                y = minY + Math.random() * (maxY - minY);
                var overlap2 = false;
                for (let k = 0; k < stars.length; k++) {
                    if (!stars[k].visible) continue;
                    var dist2 = Math.sqrt(Math.pow(x - stars[k].x, 2) + Math.pow(y - stars[k].y, 2));
                    if (dist2 < reducedMinDist) {
                        overlap2 = true;
                        break;
                    }
                }
                if (!overlap2) {
                    foundPosition = true;
                    break;
                }
            }
        }

        if (!foundPosition) {
            Logger.info('找不到不重叠的位置，跳过生成新星星');
            return;
        }

        var newStar = {
            x: x,
            y: y,
            size: starSize,
            scale: 1,
            animationFrame: 0,
            type: type,
            visible: true,
            createTime: Date.now(),
            disappearTime: Date.now() + specVal('STAR.LIFETIME_MS')
        };

        Logger.info('[StarSystem] star spawn: y=' + y + ', centerY=' + centerY + ', screenHeight=' + screenHeight + ', scale=' + scale + ', designOffsetY=' + designOffsetY + ', designBottom=' + designBottom);

        pushStar(newStar);
    }

    /**
     * 下落模式生成星星
     */
    function addFallingStar() {
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var pd = getSaveData();
        var state = getGameState();
        var GAME_STATE = getGameConst();
        var seasonSelection = getSeasonSelection();

        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);

        // 计算轨道宽度
        var laneWidth = screenWidth / FALLING_CONFIG.lanes;
        FALLING_CONFIG.laneWidth = laneWidth;

        // 选择轨道：同轨道已有下落星星则跳过，避免重叠
        var lane = -1;
        var stars = getStars();
        for (let attempt = 0; attempt < 10; attempt++) {
            var tryLane = Math.floor(Math.random() * FALLING_CONFIG.lanes);
            var occupied = false;
            for (let si = 0; si < stars.length; si++) {
                if (stars[si].falling && stars[si].visible && stars[si].lane === tryLane) {
                    occupied = true;
                    break;
                }
            }
            if (!occupied) {
                lane = tryLane;
                break;
            }
        }
        // 所有轨道都有星星，跳过本次生成
        if (lane === -1) return;

        // 透视参数
        var vanishY = -Math.floor(150 * scale);
        var startY = -FALLING_CONFIG.starSize;

        // 计算起始位置的x（透视效果）
        var startRatio = (startY - vanishY) / (designBottom - vanishY);
        var startWidth = screenWidth * startRatio;
        var startX = screenWidth / 2 - startWidth / 2 + (lane + 0.5) / FALLING_CONFIG.lanes * startWidth;

        // 决定星星类型
        var type = 'normal';
        var isSeasonMode = (state === GAME_STATE.SEASON_PLAYING);
        var normalStarEnabled = pd.normalStarEnabled !== false;

        if (isSeasonMode && seasonSelection.starTypes && seasonSelection.starTypes.length > 0) {
            var randomIndex = Math.floor(Math.random() * seasonSelection.starTypes.length);
            var selectedType = seasonSelection.starTypes[randomIndex];
            if (selectedType !== 'normal' && Math.random() < 0.4) {
                type = selectedType;
            }
        } else {
            var equippedSpecialStars = (pd.equippedStars || []).filter(function(s) { return s !== 'dodge'; });

            if (equippedSpecialStars.length > 0) {
                if (!normalStarEnabled) {
                    var ri = Math.floor(Math.random() * equippedSpecialStars.length);
                    type = equippedSpecialStars[ri];
                } else {
                    if (Math.random() < 0.3) {
                        var ri2 = Math.floor(Math.random() * equippedSpecialStars.length);
                        type = equippedSpecialStars[ri2];
                    }
                }
            } else {
                if (!normalStarEnabled) {
                    return;
                }
            }
        }

        var newStar = {
            x: startX,
            y: startY,
            lane: lane,
            size: FALLING_CONFIG.starSize,
            scale: startRatio,
            animationFrame: 0,
            type: type,
            visible: true,
            createTime: Date.now(),
            disappearTime: Date.now() + 5000,
            falling: true
        };

        pushStar(newStar);
    }

    /**
     * 更新下落星星位置
     */
    function updateFallingStars() {
        if (starMode !== STAR_MODE.FALLING) return;
        var state = getGameState();
        var GAME_STATE = getGameConst();
        if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.SEASON_PLAYING && state !== GAME_STATE.STAGE_PLAYING && state !== GAME_STATE.BOSS_BATTLE && state !== GAME_STATE.TOWER_COMBAT) return;

        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
        var vanishY = -Math.floor(150 * scale);
        var vanishX = screenWidth / 2;

        var stars = getStars();
        var toRemove = [];

        for (let i = stars.length - 1; i >= 0; i--) {
            if (stars[i].falling && stars[i].visible) {
                // 偷星者的星星由 StarThiefSystem 单独管理，跳过
                if (stars[i].isThiefStar) continue;

                // 更新y位置
                stars[i].y += FALLING_CONFIG.fallSpeed;

                // 计算当前y位置的透视比例
                var ratio = (stars[i].y - vanishY) / (designBottom - vanishY);

                // 更新缩放
                stars[i].scale = Math.max(0.3, ratio);

                // 更新x位置
                var currentWidth = screenWidth * ratio;
                var newX = vanishX - currentWidth / 2 + (stars[i].lane + 0.5) / FALLING_CONFIG.lanes * currentWidth;
                stars[i].x = newX;

                // 如果超出设计区域底部，移除
                if (stars[i].y > designBottom + stars[i].size) {
                    toRemove.push(i);
                }
            }
        }

        // 从后往前删除
        for (let ri = 0; ri < toRemove.length; ri++) {
            stars.splice(toRemove[ri], 1);
        }
        // 同步回全局（因为splice修改了数组）
        if (toRemove.length > 0) {
            setStars(stars);
        }
    }

    /**
     * 合成星星
     */
    function mergeStars() {
        var stars = getStars();

        // 找出所有可见的普通星星
        var visibleStars = [];
        for (let i = 0; i < stars.length; i++) {
            if (stars[i].visible && stars[i].type !== 'big') {
                visibleStars.push(i);
            }
        }

        if (visibleStars.length >= 2) {
            // 就近原则：找距离最近的一对
            var bestDist = Infinity;
            var idx1 = -1, idx2 = -1;
            for (var pi = 0; pi < visibleStars.length; pi++) {
                for (var pj = pi + 1; pj < visibleStars.length; pj++) {
                    var dx = stars[visibleStars[pi]].x - stars[visibleStars[pj]].x;
                    var dy = stars[visibleStars[pi]].y - stars[visibleStars[pj]].y;
                    var dist = dx * dx + dy * dy;
                    if (dist < bestDist) {
                        bestDist = dist;
                        idx1 = visibleStars[pi];
                        idx2 = visibleStars[pj];
                    }
                }
            }

            var star1 = stars[idx1];
            var star2 = stars[idx2];

            // 记录位置后隐藏
            var s1x = star1.x, s1y = star1.y, s1type = star1.type;
            var s2x = star2.x, s2y = star2.y, s2type = star2.type;
            var bigType = s1type === s2type ? s1type : 'normal';
            var midX = (s1x + s2x) / 2;
            var midY = (s1y + s2y) / 2;

            star1.visible = false;
            star2.visible = false;

            // 隐藏与合并点重叠的其他普通星星
            var bigStarRenderSize = 48;
            var bigStarMinDist = bigStarRenderSize * 0.8;
            for (let ci = 0; ci < stars.length; ci++) {
                if (!stars[ci].visible || stars[ci].type === 'big') continue;
                var cd = Math.sqrt(Math.pow(midX - stars[ci].x, 2) + Math.pow(midY - stars[ci].y, 2));
                if (cd < bigStarMinDist) {
                    stars[ci].visible = false;
                }
            }

            // 动画完成后创建大星星
            var doMerge = function() {
                var now = Date.now();
                var bigStar = {
                    x: midX, y: midY,
                    size: 58, scale: 1,
                    animationFrame: 0,
                    type: 'big',
                    bigType: bigType,
                    visible: true,
                    createTime: now,
                    disappearTime: now + 500
                };
                pushStar(bigStar);
                Logger.info('合成大星星！类型:', bigStar.bigType);
            };

            // 播放合成动画
            if (deps.createMergeAnimation) {
                deps.createMergeAnimation(s1x, s1y, s1type, s2x, s2y, s2type, doMerge);
            } else {
                doMerge();
            }
            if (deps.playMerge) deps.playMerge();

            return true;
        }
        return false;
    }

    /**
     * 重置星星（向后兼容，调用addNewStar）
     */
    function resetStar() {
        addNewStar();
    }

    /**
     * 清理超时的星星
     */
    function cleanupExpiredStars() {
        var state = getGameState();
        var GAME_STATE = getGameConst();
        if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.SEASON_PLAYING && state !== GAME_STATE.STAGE_PLAYING && state !== GAME_STATE.BOSS_BATTLE && state !== GAME_STATE.TOWER_COMBAT) return;

        // Boss 暂停期间不清除星星（boss 暂停不改状态，用 pauseStartTime 标记）
        if (state === GAME_STATE.BOSS_BATTLE && getPauseStartTime && getPauseStartTime() > 0) return;

        var currentTime = Date.now();
        var stars = getStars();
        var changed = false;
        var newStars = stars.filter(function(star) {
            if (star.isThiefStar) return true;  // 偷星由 StarThiefSystem 管理
            if (star._charging) {
                // 蓄力标记超时保护：30秒后强制清除（防止状态泄漏）
                var MAX_CHARGING_MS = 30000;
                if (star._chargeStartTime && Date.now() - star._chargeStartTime > MAX_CHARGING_MS) {
                    star._charging = false;
                    star.disappearTime = Date.now() + 5000;
                    changed = true;
                }
                return true;
            }
            if (star._dragging) return true;    // 拖拽灵光由 DragSystem 管理生命周期
            if (star._linking) return true;     // 联连灵光由 LinkChainSystem 管理生命周期
            if (star._rhythm) return true;     // 节奏灵光由 RhythmSkillSystem 理生命周期
            var keep = star.disappearTime > currentTime && star.visible;
            if (!keep) changed = true;
            return keep;
        });
        if (changed) setStars(newStars);
    }

    /**
     * 生成闪避星星（根据当前模式选择生成方式）
     */
    function spawnDodgeStar() {
        var state = getGameState();
        var GAME_STATE = getGameConst();
        if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.SEASON_PLAYING && state !== GAME_STATE.STAGE_PLAYING && state !== GAME_STATE.BOSS_BATTLE && state !== GAME_STATE.TOWER_COMBAT) {
            return;
        }

        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var pd = getSaveData();
        var stars = getStars();
        var scale = getScreenScale();

        // 检查玩家是否解锁了闪避星星
        var hasDodgeStar = pd.unlockedStarTypes && pd.unlockedStarTypes.indexOf('dodge') !== -1;
        if (!hasDodgeStar) return;

        // 检查是否装备了闪避星星
        var equippedStars = pd.equippedStars || [];
        var isEquipped = equippedStars.indexOf('dodge') !== -1;
        if (!isEquipped) return;

        // 下落模式：从顶部下落生成
        if (starMode === STAR_MODE.FALLING) {
            var laneWidth = screenWidth / FALLING_CONFIG.lanes;
            FALLING_CONFIG.laneWidth = laneWidth;
            // 同轨道已有下落星星则跳过，避免重叠
            var lane = -1;
            for (let attempt = 0; attempt < 10; attempt++) {
                var tryLane = Math.floor(Math.random() * FALLING_CONFIG.lanes);
                var occupied = false;
                for (let si = 0; si < stars.length; si++) {
                    if (stars[si].falling && stars[si].visible && stars[si].lane === tryLane) {
                        occupied = true;
                        break;
                    }
                }
                if (!occupied) { lane = tryLane; break; }
            }
            if (lane === -1) return;
            var designOffsetY = getDesignOffsetY();
            var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
            var vanishY = -Math.floor(150 * scale);
            var startY = -FALLING_CONFIG.starSize;
            var startRatio = (startY - vanishY) / (designBottom - vanishY);
            var startWidth = screenWidth * startRatio;
            var startX = screenWidth / 2 - startWidth / 2 + (lane + 0.5) / FALLING_CONFIG.lanes * startWidth;

            var dodgeStar = {
                x: startX,
                y: startY,
                lane: lane,
                size: FALLING_CONFIG.starSize,
                scale: startRatio,
                animationFrame: 0,
                type: 'dodge',
                visible: true,
                createTime: Date.now(),
                disappearTime: Date.now() + 5000,
                falling: true
            };
            pushStar(dodgeStar);
            return;
        }

        // 随机模式：原逻辑
        var designOffsetY = getDesignOffsetY();
        var scale = getScreenScale();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
        var padding = 48 + 20;
        var centerY = (designOffsetY + designBottom) / 2 + Math.floor(100 * scale);
        var spawnRadius = Math.floor(80 * scale);
        var minY = centerY - spawnRadius;
        var maxY = centerY + spawnRadius;
        var starSize = specVal('STAR.SIZE');

        // 尝试找到不重叠的位置
        var maxRenderSize = starSize * 1.2;
        var minDistance = maxRenderSize * specVal('STAR.OVERLAP_MULT');
        var x, y, foundPosition = false;
        for (let attempt = 0; attempt < 20; attempt++) {
            x = padding + Math.random() * (screenWidth - padding * 2);
            y = minY + Math.random() * (maxY - minY);

            var overlap = false;
            for (let i = 0; i < stars.length; i++) {
                if (!stars[i].visible) continue;
                var distance = Math.sqrt(Math.pow(x - stars[i].x, 2) + Math.pow(y - stars[i].y, 2));
                if (distance < minDistance) {
                    overlap = true;
                    break;
                }
            }

            if (!overlap) {
                foundPosition = true;
                break;
            }
        }

        if (!foundPosition) return;

        var newStar = {
            x: x,
            y: y,
            size: starSize,
            scale: 1,
            animationFrame: 0,
            type: 'dodge',
            visible: true,
            createTime: Date.now(),
            disappearTime: Date.now() + 1000
        };

        pushStar(newStar);
        Logger.info('生成闪避星星, 位置:', x, y);
    }

    /**
     * 更新星星生成间隔
     */
    function updateStarSpawnInterval() {
        var starThief = getStarThief();
        // 偷星者活跃且未破防时禁止重新启动星星生成
        if (starThief && starThief.isActive() && !starThief.isBrokenState()) return;

        var state = getGameState();
        var GAME_STATE = getGameConst();
        // 只在游戏进行中更新
        if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.SEASON_PLAYING && state !== GAME_STATE.STAGE_PLAYING && state !== GAME_STATE.BOSS_BATTLE && state !== GAME_STATE.TOWER_COMBAT && state !== GAME_STATE.TOWER_COMBAT) return;

        // 清除旧的定时器
        var moveInterval = getMoveInterval();
        if (moveInterval) {
            clearInterval(moveInterval);
        }

        // 设置新的定时器
        var interval = getCurrentStarInterval();
        var newInterval = setInterval(function() {
            addNewStar();
        }, interval);
        setMoveInterval(newInterval);
    }

    return {
        // 常量
        STAR_MODE: STAR_MODE,
        FALLING_CONFIG: FALLING_CONFIG,
        MAX_STARS_ON_SCREEN: MAX_STARS_ON_SCREEN,

        // 核心方法
        addNewStar: addNewStar,
        addRandomStar: addRandomStar,
        addFallingStar: addFallingStar,
        updateFallingStars: updateFallingStars,
        mergeStars: mergeStars,
        resetStar: resetStar,
        cleanupExpiredStars: cleanupExpiredStars,
        spawnDodgeStar: spawnDodgeStar,
        updateStarSpawnInterval: updateStarSpawnInterval,

        // spec 订阅回调
        onSpecChanged: function(RC) {
            // BattleEngine.updateSpec 已更新内部 RC，specVal() 可读到新 base
            var newBase = specVal('STAR.SPAWN_INTERVAL_MS');
            if (newBase && setCurrentStarInterval) {
                setCurrentStarInterval(newBase);
            }
            updateStarSpawnInterval();
        },

        // 模式管理
        setStarMode: setStarMode,
        getStarMode: getStarMode
    };
}

export { STAR_MODE, FALLING_CONFIG, MAX_STARS_ON_SCREEN, BIRTH_ANIMS, getBirthTransform, createStarSystem };
