import Logger from '../utils/Logger.js';
import { PauseCoordinator } from '../utils/PauseCoordinator.js';
/**
 * 宠物系统（Pet System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

function createPetSystem(deps) {
    // 依赖注入
    var getSaveData = deps.getSaveData;
    var getPets = deps.getPets;
    var getActiveMonsters = deps.getActiveMonsters;
    var getGameState = deps.getGameState;
    var getGameConst = deps.getGameConst;
    var getStarThief = deps.getStarThief;
    var getBossBattleMode = deps.getBossBattleMode;

    // PauseCoordinator 注册 — 宠物激活时 subscribe，销毁时 unsubscribe
    var _owner = { _destroyed: true }; // 初始未激活，startPetAttackTimer 时才变活跃
    PauseCoordinator.instance.subscribe(_owner, 'PetSystem', {
        onPause: function() { stopPetAttackTimerInternal(); },
        onResume: function() { startPetAttackTimer(); }
    });
    var getCurrentStarInterval = deps.getCurrentStarInterval;
    var setCurrentStarInterval = deps.setCurrentStarInterval;
    var getBaseStarInterval = deps.getBaseStarInterval;
    var getMinStarInterval = deps.getMinStarInterval;
    var createPetDamageAnimation = deps.createPetDamageAnimation;
    var onMonsterKilled = deps.onMonsterKilled;
    var setMonsters = deps.setMonsters;
    var onPetAttack = deps.onPetAttack || function() {};
    var addMessage = deps.addMessage || function() {};

    // ==================== 内部状态 ====================
    var petAttackTimer = null;
    var petLastAttackTime = 0;

    // ==================== 核心方法 ====================

    /**
     * 宠物攻击怪物
     */
    function petAttackMonster() {
        // 检查是否装备了宠物
        var pd = getSaveData();
        var equippedPetId = pd.pets && pd.pets.equipped;
        if (!equippedPetId) return;

        var Pets = getPets();
        // 通过uid查找宠物配置（兼容旧数据：直接是petKey）
        var pet = null;
        if (pd.pets.owned) {
            for (let i = 0; i < pd.pets.owned.length; i++) {
                var pd = pd.pets.owned[i];
                var pdUid = (typeof pd === 'object' && pd.uid) ? pd.uid : ('idx_' + i);
                if (pdUid === equippedPetId) {
                    var pdKey = typeof pd === 'string' ? pd : (pd.id || pd);
                    pet = Pets[pdKey];
                    break;
                }
            }
        }
        if (!pet) {
            pet = Pets[equippedPetId]; // 兼容旧数据
        }
        if (!pet) return;

        // 检查是否有怪物
        var activeMonsters = getActiveMonsters();
        if (activeMonsters.length === 0) return;

        // 检查攻击间隔
        var now = Date.now();
        var attackInterval = (pet.attackSpeed || 2) * 1000;
        if (now - petLastAttackTime < attackInterval) return;

        petLastAttackTime = now;

        // 选择第一个怪物攻击
        var target = activeMonsters[0];

        // 偷星者未破防时宠物无法攻击
        var starThief = getStarThief();
        if (target.type === 'star_thief' && starThief && !starThief.isBrokenState()) return;

        var damage = pet.attack || 5;

        // 宠物暴击判定
        var critChance = pet.critRate || 0;
        var isCritical = Math.random() * 100 < critChance;
        if (isCritical) {
            var critDamage = pet.critDamage || 0.5;
            damage = Math.floor(damage * (1 + critDamage));
        }

        // Boss模式下走attackBoss流程（处理分裂后逻辑），不在此处扣血
        var state = getGameState();
        var GAME_STATE = getGameConst();
        if (state === GAME_STATE.BOSS_BATTLE) {
            var BossBattleMode = getBossBattleMode();
            BossBattleMode.attackBoss(damage);
            onPetAttack();
            return;
        }

        // 非Boss模式：造成伤害
        target.hp -= damage;
        onPetAttack();

        // 显示宠物攻击飘字
        createPetDamageAnimation(target.x, target.y - 50, damage, pet.emoji, isCritical);
        addMessage(pet.emoji + ' ' + pet.name + '攻击! -' + damage + (isCritical ? ' 暴击!' : ''), isCritical ? '#FFD700' : '#87CEEB');

        // 触发宠物技能效果
        triggerPetSkill(pet, target);

        // 检查怪物死亡
        if (target.hp <= 0) {
            target.hp = 0;
            onMonsterKilled();
        }
    }

    /**
     * 触发宠物技能效果
     */
    function triggerPetSkill(pet, target) {
        if (!pet.skill) return;

        switch (pet.skill) {
            case 'burn':
                // 燃烧：持续伤害
                if (Math.random() < 0.3) {  // 30%概率触发
                    target.burning = true;
                    target.burnDamage = 5;
                    target.burnEndTime = Date.now() + 3000;  // 持续3秒
                    Logger.info('宠物触发燃烧!');
                }
                break;

            case 'freeze':
                // 冻结：减速
                if (Math.random() < 0.2) {  // 20%概率触发
                    target.frozen = true;
                    target.frozenEndTime = Date.now() + 2000;  // 持续2秒
                    Logger.info('宠物触发冻结!');
                }
                break;

            case 'shock':
                // 电击：额外伤害
                if (Math.random() < 0.25) {  // 25%概率触发
                    var shockDamage = Math.floor((pet.attack || 5) * 0.5);
                    target.hp -= shockDamage;
                    Logger.info('宠物触发电击! 额外伤害:', shockDamage);
                }
                break;

            case 'heal':
                // 治疗：攻击时恢复玩家生命
                var pd = getSaveData();
                var healAmount = pet.healAmount || 5;
                var maxHp = pd.maxPlayerHp || 100;
                pd.playerHp = Math.min(maxHp, (pd.playerHp != null ? pd.playerHp : 100) + healAmount);
                Logger.info('宠物触发治疗! +', healAmount);
                break;

            case 'swift':
                // 迅捷：偶尔提升攻速
                if (Math.random() < 0.15) {  // 15%概率触发
                    var newInterval = Math.max(getMinStarInterval(), Math.floor(getCurrentStarInterval() * 0.8));
                    setCurrentStarInterval(newInterval);
                    setTimeout(function() {
                        setCurrentStarInterval(getBaseStarInterval());
                    }, 3000);
                    Logger.info('宠物触发迅捷!');
                }
                break;

            case 'shadow':
                // 暗影：偶尔无视防御
                // 已在攻击时处理
                break;

            default:
                // 其他宠物技能待实现
                break;
        }
    }

    /**
     * 启动宠物攻击定时器
     */
    function startPetAttackTimer() {
        _owner._destroyed = false; // 激活 subscriber
        if (petAttackTimer) clearInterval(petAttackTimer);

        var pd = getSaveData();
        var equippedPetId = pd.pets && pd.pets.equipped;
        if (!equippedPetId) return;

        var Pets = getPets();
        // 通过uid查找宠物配置（兼容旧数据）
        var pet = null;
        if (pd.pets.owned) {
            for (let j = 0; j < pd.pets.owned.length; j++) {
                var pd = pd.pets.owned[j];
                var pdUid = (typeof pd === 'object' && pd.uid) ? pd.uid : ('idx_' + j);
                if (pdUid === equippedPetId) {
                    var pdKey = typeof pd === 'string' ? pd : (pd.id || pd);
                    pet = Pets[pdKey];
                    break;
                }
            }
        }
        if (!pet) {
            pet = Pets[equippedPetId];
        }
        if (!pet) return;

        // 每100ms检查一次宠物攻击
        petAttackTimer = setInterval(function() {
            var state = getGameState();
            var GAME_STATE = getGameConst();
            if (state === GAME_STATE.PLAYING || state === GAME_STATE.SEASON_PLAYING || state === GAME_STATE.BOSS_BATTLE) {
                petAttackMonster();

                // 更新怪物燃烧状态
                updateMonsterBurnStatus();
            }
        }, 100);

        Logger.info('宠物攻击定时器已启动:', pet.name);
    }

    /**
     * 更新怪物燃烧/冻结状态
     */
    function updateMonsterBurnStatus() {
        var now = Date.now();
        var activeMonsters = getActiveMonsters();

        for (let i = 0; i < activeMonsters.length; i++) {
            var m = activeMonsters[i];

            // 处理燃烧伤害
            if (m.burning && m.burnEndTime > now) {
                if (!m.lastBurnTick || now - m.lastBurnTick >= 1000) {
                    m.hp -= m.burnDamage || 5;
                    m.lastBurnTick = now;
                    Logger.info('燃烧伤害:', m.burnDamage);

                    if (m.hp <= 0) {
                        m.hp = 0;
                        onMonsterKilled();
                    }
                }
            } else if (m.burning && m.burnEndTime <= now) {
                m.burning = false;
            }

            // 处理冻结状态
            if (m.frozen && m.frozenEndTime <= now) {
                m.frozen = false;
            }
        }
    }

    /**
     * 停止宠物攻击定时器
     */
    function stopPetAttackTimerInternal() {
        if (petAttackTimer) {
            clearInterval(petAttackTimer);
            petAttackTimer = null;
        }
    }

    /**
     * 重置宠物系统（游戏结束时调用）
     */
    function resetSystem() {
        _owner._destroyed = true;
        PauseCoordinator.instance.unsubscribe('PetSystem');
        stopPetAttackTimerInternal();
        petLastAttackTime = 0;
    }

    return {
        petAttackMonster: petAttackMonster,
        triggerPetSkill: triggerPetSkill,
        startPetAttackTimer: startPetAttackTimer,
        stopPetAttackTimer: stopPetAttackTimerInternal,
        updateMonsterBurnStatus: updateMonsterBurnStatus,
        resetSystem: resetSystem
    };
}

export { createPetSystem };
