import Logger from '../utils/Logger.js';
/**
 * Boss星星机制（Boss Star Mechanic System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 *
 * 包含：Boss星星技能触发、惩罚检测、机制重置
 * 不包含：Boss星星点击处理（暂留 game.js，通过 removeBossStar 接口交互）
 */

// Boss星星常量
var BOSS_STAR_COUNT = 20;
var BOSS_STAR_MISS_THRESHOLD = 0.3;
var BOSS_STAR_DURATION = 5000;
var BOSS_FIRST_TRIGGER = 3;
var BOSS_REPEAT_TRIGGER = 6;
var BOSS_STUN_CHANCE = 0.25;
var BOSS_STUN_DURATION = 1000;

function createBossStarSystem(deps) {
    // 依赖注入
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };
    var DESIGN_HEIGHT = 812;
    var getStars = deps.getStars;
    var setStars = deps.setStars;
    var pushStar = deps.pushStar;
    var getPlayerData = deps.getPlayerData;
    var addMessage = deps.addMessage;
    var checkGameOver = deps.checkGameOver;
    var vibrateShort = deps.vibrateShort;

    // ==================== 内部状态 ====================
    var bossAttackCount = 0;
    var bossStarActive = false;
    var bossStarsSpawned = [];
    var bossStarTimeout = null;

    // ==================== 核心方法 ====================

    /**
     * 触发Boss星星技能
     */
    function triggerBossStarSkill(bossMonster) {
        if (bossStarActive) {
            Logger.info('Boss星星技能已在激活中');
            return;
        }

        bossStarActive = true;
        bossStarsSpawned = [];

        Logger.info('🌀 Boss星星技能触发! 生成', BOSS_STAR_COUNT, '颗Boss星星');

        // 显示提示
        addMessage('🌀 灵脉试炼开始!', '#cc88ff');

        // 震动提示
        vibrateShort({ type: 'heavy' });

        // 生成Boss星星
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var starSize = Math.floor(30 * scale);
        var padding = Math.floor(20 * scale);
        var minY = designOffsetY + DESIGN_HEIGHT * 0.15 * scale;
        var maxY = designOffsetY + DESIGN_HEIGHT * 0.75 * scale;
        var minDistance = Math.floor(50 * scale);

        for (let i = 0; i < BOSS_STAR_COUNT; i++) {
            var x, y, foundPosition = false;

            // 尝试找到不重叠的位置
            for (let attempt = 0; attempt < 20; attempt++) {
                x = padding + Math.random() * (screenWidth - padding * 2);
                y = minY + Math.random() * (maxY - minY);

                var overlap = false;
                var stars = getStars();
                for (let j = 0; j < stars.length; j++) {
                    if (!stars[j].visible) continue;
                    var distance = Math.sqrt(Math.pow(x - stars[j].x, 2) + Math.pow(y - stars[j].y, 2));
                    if (distance < minDistance) {
                        overlap = true;
                        break;
                    }
                }

                // 也检查已生成的Boss星星
                if (!overlap) {
                    for (let k = 0; k < bossStarsSpawned.length; k++) {
                        var bs = findStarByBossStarId(bossStarsSpawned[k]);
                        if (bs) {
                            var bsd = Math.sqrt(Math.pow(x - bs.x, 2) + Math.pow(y - bs.y, 2));
                            if (bsd < minDistance) {
                                overlap = true;
                                break;
                            }
                        }
                    }
                }

                if (!overlap) {
                    foundPosition = true;
                    break;
                }
            }

            if (!foundPosition) {
                x = padding + Math.random() * (screenWidth - padding * 2);
                y = minY + Math.random() * (maxY - minY);
            }

            var bossStarId = 'boss_star_' + Date.now() + '_' + i;
            var newStar = {
                x: x,
                y: y,
                size: starSize,
                scale: 1,
                animationFrame: 0,
                type: 'boss_star',
                visible: true,
                createTime: Date.now(),
                disappearTime: Date.now() + BOSS_STAR_DURATION,
                bossStarId: bossStarId,
                isBossStar: true
            };

            pushStar(newStar);
            bossStarsSpawned.push(bossStarId);
        }

        // 设置惩罚检测定时器
        if (bossStarTimeout) {
            clearTimeout(bossStarTimeout);
        }

        bossStarTimeout = setTimeout(function() {
            checkBossStarPenalty(bossMonster);
        }, BOSS_STAR_DURATION);

        Logger.info('Boss星星已生成，', BOSS_STAR_DURATION / 1000, '秒后检测惩罚');
    }

    /**
     * 在 stars 数组中查找 bossStarId 对应的星星
     */
    function findStarByBossStarId(bossStarId) {
        var stars = getStars();
        for (let i = 0; i < stars.length; i++) {
            if (stars[i].bossStarId === bossStarId) {
                return stars[i];
            }
        }
        return null;
    }

    /**
     * 检测Boss星星惩罚
     */
    function checkBossStarPenalty(bossMonster) {
        if (!bossStarActive) return;

        var playerData = getPlayerData();

        // 统计漏掉的Boss星星数量
        var missedCount = 0;
        var totalBossStars = bossStarsSpawned.length;

        for (let i = 0; i < bossStarsSpawned.length; i++) {
            var starId = bossStarsSpawned[i];
            var star = findStarByBossStarId(starId);

            if (star && star.visible) {
                missedCount++;
                star.visible = false;
            }
        }

        // 清理已点击的Boss星星
        var stars = getStars();
        var newStars = stars.filter(function(s) { return !s.isBossStar || s.visible; });
        setStars(newStars);

        var missRatio = missedCount / totalBossStars;
        Logger.info('Boss星星检测结果: 漏掉', missedCount, '/', totalBossStars, '(', (missRatio * 100).toFixed(1), '%)');

        // 检查是否触发惩罚（漏掉30%以上）
        if (missRatio >= BOSS_STAR_MISS_THRESHOLD) {
            var maxHp = playerData.maxPlayerHp || 100;
            var penaltyDamage = Math.floor(maxHp * 2 / 3);

            // 护盾优先吸收
            var actualDamage = penaltyDamage;
            if (playerData.playerShield > 0) {
                var shieldAbsorb = Math.min(playerData.playerShield, actualDamage);
                playerData.playerShield -= shieldAbsorb;
                actualDamage -= shieldAbsorb;
            }
            playerData.playerHp = Math.max(0, playerData.playerHp - actualDamage);

            // Boss回复生命值
            var healAmount = actualDamage * 2;
            if (bossMonster && bossMonster.hp > 0) {
                bossMonster.hp = Math.min(bossMonster.maxHp, bossMonster.hp + healAmount);
            }

            addMessage('🔻 试炼失败! -' + actualDamage + '灵能 守护灵回复' + healAmount, '#ff6b6b');

            // 强烈震动
            vibrateShort({ type: 'heavy' });
            setTimeout(function() { vibrateShort({ type: 'heavy' }); }, 100);
            setTimeout(function() { vibrateShort({ type: 'heavy' }); }, 200);

            Logger.info('Boss星星惩罚触发! 玩家损失:', actualDamage, 'HP, Boss回复:', healAmount);

            checkGameOver();
        } else {
            addMessage('✨ 试炼通过! 漏掉' + missedCount + '颗', '#00ff88');
            Logger.info('Boss星星试炼通过!');
        }

        // 重置状态
        bossStarActive = false;
        bossStarsSpawned = [];
        bossStarTimeout = null;
    }

    /**
     * 重置Boss星星机制
     */
    function resetBossStarMechanic() {
        bossAttackCount = 0;
        bossStarActive = false;
        bossStarsSpawned = [];
        if (bossStarTimeout) {
            clearTimeout(bossStarTimeout);
            bossStarTimeout = null;
        }
        // 移除所有Boss星星
        var stars = getStars();
        var newStars = stars.filter(function(s) { return !s.isBossStar; });
        setStars(newStars);
        Logger.info('Boss星星机制已重置');
    }

    /**
     * 点击Boss星星时调用，从生成列表中移除
     */
    function removeBossStar(bossStarId) {
        var idx = bossStarsSpawned.indexOf(bossStarId);
        if (idx !== -1) {
            bossStarsSpawned.splice(idx, 1);
            Logger.info('Boss星星已点击! 剩余:', bossStarsSpawned.length);
        }
    }

    /**
     * 增加Boss攻击计数，返回是否应触发星星技能
     */
    function incrementBossAttackCount() {
        bossAttackCount++;
        Logger.info('灵脉吞噬者攻击计数:', bossAttackCount);

        var shouldTrigger = false;
        if (bossAttackCount === BOSS_FIRST_TRIGGER) {
            shouldTrigger = true;
        } else if (bossAttackCount > BOSS_FIRST_TRIGGER) {
            if ((bossAttackCount - BOSS_FIRST_TRIGGER) % BOSS_REPEAT_TRIGGER === 0) {
                shouldTrigger = true;
            }
        }

        if (shouldTrigger && !bossStarActive) {
            return true;
        }
        return false;
    }

    // ==================== 状态访问 ====================

    function getBossAttackCount() { return bossAttackCount; }
    function setBossAttackCount(val) { bossAttackCount = val; }
    function isBossStarActive() { return bossStarActive; }
    function setBossStarActive(val) { bossStarActive = val; }
    function getBossStarsSpawned() { return bossStarsSpawned; }

    return {
        // 常量
        BOSS_STAR_COUNT: BOSS_STAR_COUNT,
        BOSS_STAR_MISS_THRESHOLD: BOSS_STAR_MISS_THRESHOLD,
        BOSS_STAR_DURATION: BOSS_STAR_DURATION,
        BOSS_FIRST_TRIGGER: BOSS_FIRST_TRIGGER,
        BOSS_REPEAT_TRIGGER: BOSS_REPEAT_TRIGGER,
        BOSS_STUN_CHANCE: BOSS_STUN_CHANCE,
        BOSS_STUN_DURATION: BOSS_STUN_DURATION,

        // 核心方法
        triggerBossStarSkill: triggerBossStarSkill,
        checkBossStarPenalty: checkBossStarPenalty,
        resetBossStarMechanic: resetBossStarMechanic,
        removeBossStar: removeBossStar,
        incrementBossAttackCount: incrementBossAttackCount,

        // 状态访问
        getBossAttackCount: getBossAttackCount,
        setBossAttackCount: setBossAttackCount,
        isBossStarActive: isBossStarActive,
        setBossStarActive: setBossStarActive,
        getBossStarsSpawned: getBossStarsSpawned
    };
}

export {
    BOSS_STAR_COUNT, BOSS_STAR_MISS_THRESHOLD, BOSS_STAR_DURATION,
    BOSS_FIRST_TRIGGER, BOSS_REPEAT_TRIGGER, BOSS_STUN_CHANCE, BOSS_STUN_DURATION,
    createBossStarSystem
};
