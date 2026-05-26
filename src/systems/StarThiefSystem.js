import Logger from '../utils/Logger.js';
import { PauseCoordinator } from '../utils/PauseCoordinator.js';
/**
 * 偷星者系统 - 独立模块
 *
 * 负责偷星者的完整生命周期：
 * 出现 → 发射偷星 → 破防/回防循环 → 击杀掉落
 *
 * 通过依赖注入（deps）与外部系统通信，不直接访问全局变量。
 */
export function createStarThiefSystem(deps) {
    // 常量
    const SPAWN_CHANCE = 0.05;
    const BREAK_MAX = 8;
    const BREAK_DURATION = 5000;
    const STAR_INTERVAL = 750;
    const HP_RESTORE = 50;
    const HIT_DAMAGE = 15;

    // 闭包私有状态
    let active = false;

    // PauseCoordinator 注册 — 进入战斗时 subscribe，退出时 unsubscribe
    let _owner = { _destroyed: true }; // 初始未激活，initOnSpawn 时才变活跃
    PauseCoordinator.instance.subscribe(_owner, 'StarThief', {
        onPause: function() {
            if (!active || paused) return;
            paused = true;
            pausedAt = Date.now();
            if (starTimer) {
                clearInterval(starTimer);
                starTimer = null;
            }
        },
        onResume: function(duration) {
            if (!active || !paused) return;
            paused = false;
            if (isBroken && breakEndTime > 0) {
                breakEndTime += duration;
            }
            if (!isBroken) {
                startStealStarTimer();
            }
        }
    });
    let breakValue = 0;
    let isBroken = false;
    let breakEndTime = 0;
    let starTimer = null;
    let startTime = 0;
    let spawnX = 0;  // 记录偷星者初始生成位置，用于固定血条/破防条位置
    let paused = false;
    let pausedAt = 0;  // 暂停时的时间戳

    // 瞬移状态
    let teleporting = false;       // 是否正在瞬移中
    let teleportPhase = 0;        // 0=无, 1=缩小中, 2=放大中
    let teleportStart = 0;        // 瞬移动画开始时间
    let teleportTargetX = 0;      // 瞬移目标X
    const TELEPORT_DURATION = 50; // 每阶段50ms

    // 依赖注入
    const { getStars, setStars, pushStar, removeStarAt,
            getMonsters, getSaveData, getEquipments,
            addMessage, saveData, updateStarSpawn,
            clearMoveInterval, stopDodgeStarTimer,
            fillRoundRectFn, getScreenScaleFn } = deps;
    const getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };

    // 查找当前偷星者怪物
    function findThief() {
        var monsters = getMonsters();
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i].active && monsters[i].type === 'star_thief') return monsters[i];
        }
        return null;
    }

    // 启动偷星发射定时器（改为触发瞬移，瞬移完成后发射偷星）
    function startStealStarTimer() {
        if (starTimer) clearInterval(starTimer);
        starTimer = setInterval(function() {
            if (!active || isBroken || teleporting) return;
            startTeleport();
        }, STAR_INTERVAL);
    }

    // 生成偷星
    function spawnStealStar() {
        if (!active || isBroken) return;
        var thief = findThief();
        if (!thief) return;

        var isBreakStar = Math.random() < 0.5;
        var stealStar = {
            x: thief.x,
            y: thief.y + 40,
            size: 36,
            scale: 1,
            animationFrame: 0,
            type: isBreakStar ? 'thief_break' : 'thief_heal',
            visible: true,
            createTime: Date.now(),
            disappearTime: Date.now() + 4000,
            isThiefStar: true,
            falling: true,
            fallSpeed: 10
        };

        pushStar(stealStar);
    }

    // 更新偷星位置（每帧调用）
    function updateThiefStars() {
        var stars = getStars();
        for (let i = stars.length - 1; i >= 0; i--) {
            var s = stars[i];
            if (!s.isThiefStar || !s.visible) continue;
            s.y += s.fallSpeed;
            if (s.y > deps.getScreenHeight()) {
                handleThiefStarHit(s);
                removeStarAt(i);
            }
        }
    }

    // 偷星击中玩家
    function handleThiefStarHit(star) {
        var pd = getSaveData();
        var damage = HIT_DAMAGE;
        if (pd.playerShield > 0) {
            var absorb = Math.min(pd.playerShield, damage);
            pd.playerShield -= absorb;
            damage -= absorb;
        }
        pd.playerHp = Math.max(0, pd.playerHp - damage);
        addMessage('被窃灵击中！-' + HIT_DAMAGE + '灵能', '#ff4444', true);
    }

    // 处理偷星点击
    function handleStarClick(star) {
        if (star.type === 'thief_break') {
            breakValue++;
            addMessage('破防 +1 (' + breakValue + '/' + BREAK_MAX + ')', '#ff8866', true);
            if (breakValue >= BREAK_MAX) {
                triggerBreakDefense();
            }
        } else if (star.type === 'thief_heal') {
            var thief = findThief();
            if (thief) {
                thief.hp = Math.min(thief.maxHp, thief.hp + HP_RESTORE);
                addMessage('窃灵者恢复 ' + HP_RESTORE + '灵能！', '#44ff44', true);
            }
        }
        return true;
    }

    // 触发破防
    function triggerBreakDefense() {
        isBroken = true;
        breakEndTime = Date.now() + BREAK_DURATION;

        if (starTimer) {
            clearInterval(starTimer);
            starTimer = null;
        }

        // 清除场上偷星
        setStars(getStars().filter(function(s) { return !s.isThiefStar; }));

        // 恢复玩家星星生成
        updateStarSpawn();

        addMessage('偷星者破防！5秒内自由攻击！', '#FFD700', true);
    }

    // 瞬移到随机位置（左右侧）
    function startTeleport() {
        if (!active || isBroken || teleporting) return;
        var thief = findThief();
        if (!thief) return;

        teleporting = true;
        teleportPhase = 1;  // 阶段1：缩小
        teleportStart = Date.now();

        // 计算目标位置：屏幕左半或右半随机位置
        var screenW = deps.getScreenWidth();
        var padding = 80;
        var leftRange = screenW * 0.15 + padding;
        var rightRange = screenW * 0.85 - padding;
        teleportTargetX = leftRange + Math.random() * (rightRange - leftRange);
    }

    // 更新瞬移动画（每帧调用）
    function updateTeleport() {
        if (!teleporting) return;
        var thief = findThief();
        if (!thief) { teleporting = false; return; }

        var now = Date.now();
        var elapsed = now - teleportStart;

        if (teleportPhase === 1) {
            // 阶段1：缩小到0
            var progress = Math.min(elapsed / TELEPORT_DURATION, 1);
            thief.scale = 1 - progress;
            if (progress >= 1) {
                // 缩小完毕，瞬移到新位置
                thief.x = teleportTargetX;
                spawnX = teleportTargetX;
                teleportPhase = 2;
                teleportStart = now;
            }
        } else if (teleportPhase === 2) {
            // 阶段2：放大到正常
            var progress2 = Math.min(elapsed / TELEPORT_DURATION, 1);
            thief.scale = progress2;
            if (progress2 >= 1) {
                thief.scale = 1;
                teleporting = false;
                teleportPhase = 0;
                // 瞬移完成后发射偷星
                spawnStealStar();
            }
        }
    }

    // 检查破防倒计时（每帧调用）
    function checkBreakTimer() {
        if (!isBroken) return;
        // 偷星者已消散则不再恢复防御
        if (!findThief()) {
            isBroken = false;
            breakValue = 0;
            return;
        }
        if (Date.now() >= breakEndTime) {
            isBroken = false;
            breakValue = 0;

            // 清除玩家星星，停止生成
            setStars(getStars().filter(function(s) { return !s.isThiefStar && s.type !== 'boss_star'; }));
            clearMoveInterval();
            stopDodgeStarTimer();

            // 重启发射偷星
            startStealStarTimer();

            addMessage('偷星者恢复防御！', '#ff4444', true);
        }
    }

    // 重置偷星者状态
    function resetState() {
        _owner._destroyed = true;
        PauseCoordinator.instance.unsubscribe('StarThief');
        active = false;
        breakValue = 0;
        isBroken = false;
        breakEndTime = 0;
        spawnX = 0;
        paused = false;
        pausedAt = 0;
        teleporting = false;
        teleportPhase = 0;
        if (starTimer) {
            clearInterval(starTimer);
            starTimer = null;
        }
        setStars(getStars().filter(function(s) { return !s.isThiefStar; }));
    }

    // 偷星者专属装备掉落
    function dropEquipment() {
        var thiefEquipPool = [
            { id: 'thief_blade', weight: 5 },
            { id: 'thief_cloak', weight: 5 },
            { id: 'thief_ring', weight: 5 },
            { id: 'thief_crown', weight: 2 },
            { id: 'dark_star_dagger', weight: 15 },
            { id: 'dark_star_pendant', weight: 15 },
            { id: 'meteor_boots', weight: 15 },
            { id: 'thief_gloves', weight: 15 }
        ];

        var totalW = 0;
        for (let i = 0; i < thiefEquipPool.length; i++) totalW += thiefEquipPool[i].weight;
        var roll = Math.random() * totalW;
        var cumulative = 0;
        var chosenId = 'dark_star_dagger';
        for (let i = 0; i < thiefEquipPool.length; i++) {
            cumulative += thiefEquipPool[i].weight;
            if (roll < cumulative) { chosenId = thiefEquipPool[i].id; break; }
        }

        var EquipmentsRef = getEquipments();
        var equip = EquipmentsRef[chosenId];
        var pd = getSaveData();
        if (!pd.equipments) pd.equipments = { owned: [], equipped: {} };
        if (!pd.equipments.owned) pd.equipments.owned = [];
        pd.equipments.owned.push({ id: chosenId, rarity: equip.rarity, level: 1 });
        var rarityColors = { 'UC': '#7CCD7C', 'N': '#aaaaaa', 'R': '#4A90D9', 'SR': '#9B59B6', 'SSR': '#FFD700', 'UR': '#E74C3C', 'LR': '#FF6B9D', 'SP': '#00D4FF' };
        addMessage('获得偷星装备: ' + equip.emoji + equip.name, rarityColors[equip.rarity] || '#ffcc00', true);
        saveData();
    }

    // 判断是否应该替换为偷星者（只替换Boss，currentKills 为当局已击杀数）
    function shouldReplace(actualType, currentKills) {
        // 当局第一个怪物不生成偷星者
        if (!currentKills || currentKills <= 0) return false;
        return Math.random() < SPAWN_CHANCE;
    }

    // 偷星者生成时初始化
    function initOnSpawn(newMonster, screenH) {
        _owner._destroyed = false; // 激活 subscriber
        active = true;
        breakValue = 0;
        isBroken = false;
        breakEndTime = 0;
        teleporting = false;
        teleportPhase = 0;
        startTime = Date.now();
        spawnX = newMonster.x;  // 记录初始位置
        // 位置设为屏幕上方
        newMonster.y = getDesignOffsetY() + Math.floor(812 * 0.15 * getScreenScaleFn());
        // 清除玩家所有星星
        setStars(getStars().filter(function(s) { return s.isBossStar; }));
        // 停止玩家星星生成
        clearMoveInterval();
        // 停止闪避星星定时器
        stopDodgeStarTimer();
        // 启动偷星发射定时器
        startStealStarTimer();
        addMessage('偷星者出现了！点击破防星破解它的防御！', '#ff4444', true);
    }

    // 处理偷星者净化
    function handleKill(monster, now) {
        var thiefTime = (now - startTime) / 1000;
        var starSourceReward;
        if (thiefTime <= 30) starSourceReward = 20;
        else if (thiefTime <= 60) starSourceReward = 15;
        else if (thiefTime <= 90) starSourceReward = 10;
        else starSourceReward = 5;

        var pd = getSaveData();
        pd.starSource += starSourceReward;

        // 偷星碎片（2-5个）
        var fragments = 2 + Math.floor(Math.random() * 4);
        if (!pd.thiefFragments) pd.thiefFragments = 0;
        pd.thiefFragments += fragments;

        // 专属装备掉落（30%概率）
        if (Math.random() < 0.3) {
            dropEquipment();
        }

        // 重置偷星者状态，恢复玩家星星
        resetState();
        updateStarSpawn();

        addMessage('获得 ' + starSourceReward + ' 灵石！', '#FFD700', true);
        addMessage('获得 ' + fragments + ' 偷星碎片！', '#ff8866', true);
        Logger.info('偷星者净化奖励: 灵石', starSourceReward, '碎片', fragments, '用时', thiefTime.toFixed(1) + 's');
    }

    // 帧更新（统一入口）
    function update() {
        if (paused) return;
        updateThiefStars();
        updateTeleport();
        checkBreakTimer();
    }

    // 绘制破防条
    function drawBreakBar(ctx, m) {
        if (m.type !== 'star_thief') return;
        var scale = getScreenScaleFn();
        var barWidth = Math.floor(150 * scale);
        var barHeight = Math.floor(8 * scale);
        var barX = m.x - barWidth / 2;
        // 破防条对齐普通怪物位置（screenHeight/3处的血条上方）
        var normalMonsterY = getDesignOffsetY() + Math.floor(812 / 3 * getScreenScaleFn());
        var barY = normalMonsterY - m.size * scale / 2 - Math.floor(28 * scale);

        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        fillRoundRectFn(ctx, barX, barY, barWidth, barHeight, Math.floor(2 * scale));

        // 破防值填充
        var fillRatio = breakValue / BREAK_MAX;
        ctx.fillStyle = isBroken ? '#00ff88' : '#ff6600';
        if (fillRatio > 0) {
            fillRoundRectFn(ctx, barX, barY, Math.max(Math.floor(4 * scale), barWidth * fillRatio), barHeight, Math.floor(2 * scale));
        }

    }

    // 绘制偷星（返回 true 表示已绘制，调用方应跳过默认绘制）
    function drawStarShape(ctx, starObj, x, y, size, scale) {
        if (starObj.type === 'thief_break') {
            var thiefSize = size * scale;
            ctx.font = thiefSize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💔', x, y);
            return true;
        }
        if (starObj.type === 'thief_heal') {
            var thiefSize = size * scale;
            ctx.font = thiefSize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💚', x, y);
            return true;
        }
        return false;
    }

    // 公开接口
    return {
        // 常量
        SPAWN_CHANCE: SPAWN_CHANCE,
        BREAK_MAX: BREAK_MAX,

        // 状态查询
        isActive: function() { return active; },
        getBreakVal: function() { return breakValue; },
        isBrokenState: function() { return isBroken; },
        getBreakEnd: function() { return breakEndTime; },
        getSpawnX: function() { return spawnX; },

        // 方法
        shouldReplace: shouldReplace,
        initOnSpawn: initOnSpawn,
        handleStarClick: handleStarClick,
        handleKill: handleKill,
        update: update,
        drawBreakBar: drawBreakBar,
        drawStarShape: drawStarShape,
        resetState: resetState
    };
}
