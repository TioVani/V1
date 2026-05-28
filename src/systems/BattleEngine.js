import Logger from '../utils/Logger.js';
import { PauseCoordinator } from '../utils/PauseCoordinator.js';
import { getSkillAttackRatio } from '../config/SkillConfig.js';
import {
    COMBAT_SPEC, COMBAT_FEATURES, specResolver, getSpecValue, flattenSpec,
    validateOverrides, validateFeatures, getWeakWarnings
} from '../config/CombatSpec.js';

// ═══════════════════════════════════════════════════════════
// BATTLE_CONSTANTS — 向后兼容导出（旧 key 名称）
// @deprecated 使用 getSpecValue(RC, 'group.KEY') 代替
// ═══════════════════════════════════════════════════════════
var BATTLE_CONSTANTS = {
    STAR_SPAWN_INTERVAL_MS: COMBAT_SPEC.STAR.SPAWN_INTERVAL_MS,
    STAR_LIFETIME_MS: COMBAT_SPEC.STAR.LIFETIME_MS,
    MAX_STARS: COMBAT_SPEC.STAR.MAX_ON_SCREEN,
    STAR_SIZE: COMBAT_SPEC.STAR.SIZE,
    STAR_OVERLAP_MULT: COMBAT_SPEC.STAR.OVERLAP_MULT,
    STAR_PADDING: 68,
    STAR_Y_MIN_RATIO: 0.6,
    QUICK_TAP_THRESHOLD_MS: COMBAT_SPEC.QUICK_TAP.THRESHOLD_MS,
    QUICK_TAP_WINDOW_MS: COMBAT_SPEC.QUICK_TAP.WINDOW_MS,
    QUICK_TAP_SUPER_MULT: COMBAT_SPEC.QUICK_TAP.SUPER_MULT,
    QUICK_TAP_NORMAL_MULT: COMBAT_SPEC.QUICK_TAP.NORMAL_MULT,
    COMBAT_TIME_LIMIT: COMBAT_SPEC.COMBAT.TIME_LIMIT_S,
    TIME_DAMAGE_ON_HIT: COMBAT_SPEC.COMBAT.TIME_DAMAGE_ON_HIT_S,
    TIME_TICK_MS: COMBAT_SPEC.COMBAT.TIME_TICK_MS,
    COMBO_TIMEOUT_MS: COMBAT_SPEC.COMBO.TIMEOUT_MS,
    COMBO_MULTIPLIER: COMBAT_SPEC.COMBO.MULTIPLIER,
    COMBO_STAR_DURATION_MS: COMBAT_SPEC.COMBO.STAR_DURATION_MS,
    COMBO_STAR_ATTACK_INTERVAL_MS: COMBAT_SPEC.COMBO.STAR_ATTACK_INTERVAL_MS,
    MONSTER_ATTACK_INTERVAL_MS: COMBAT_SPEC.MONSTER.ATTACK_INTERVAL_MS,
    HEAL_STAR_HP: COMBAT_SPEC.SPECIAL_STARS.HEAL_HP,
    SHIELD_STAR_AMOUNT: COMBAT_SPEC.SPECIAL_STARS.SHIELD_AMOUNT,
    TIME_STAR_SECONDS: COMBAT_SPEC.SPECIAL_STARS.TIME_SECONDS,
    UNLUCKY_STAR_HP_COST: COMBAT_SPEC.SPECIAL_STARS.UNLUCKY_HP_COST,
    GREEDY_STAR_HP_COST: COMBAT_SPEC.SPECIAL_STARS.GREEDY_HP_COST,
    DODGE_STAR_DURATION_MS: COMBAT_SPEC.SPECIAL_STARS.DODGE_DURATION_MS,
    DODGE_COUNTER_DAMAGE_MULT: COMBAT_SPEC.SPECIAL_STARS.DODGE_COUNTER_MULT,
    POISON_TICK_INTERVAL_MS: COMBAT_SPEC.STATUS.POISON_TICK_MS,
    BASE_DAMAGE: COMBAT_SPEC.DAMAGE.BASE,
    DAMAGE_PER_FLOOR: COMBAT_SPEC.DAMAGE.PER_FLOOR
};

var PHASE = { IDLE: 'idle', RUNNING: 'running', FINISHED: 'finished' };

// ═══════════════════════════════════════════════════════════
// 闭包工厂
// ═══════════════════════════════════════════════════════════
function createBattleEngine(deps) {

    // ─── deps 解构（按服务对象分组） ───
    var scr = deps.screen;
    var playerService = deps.player;
    var anim = deps.animation;
    var combatSvc = deps.combat;
    var skillSvc = deps.skills;

    // ─── playerEffects getter/setter（真相源读写） ───
    var getPlayerDodging = deps.getPlayerDodging;
    var getPlayerDodgeEndTime = deps.getPlayerDodgeEndTime;
    var isPlayerStunned = deps.isPlayerStunned;
    var getPlayerStunEndTime = deps.getPlayerStunEndTime;
    var getPlayerPoisoned = deps.getPlayerPoisoned;
    var getPlayerPoisonEndTime = deps.getPlayerPoisonEndTime;
    var getPlayerPoisonDamage = deps.getPlayerPoisonDamage;
    var getPlayerPoisonTickTime = deps.getPlayerPoisonTickTime;
    var setPlayerDodging = deps.setPlayerDodging;
    var setPlayerDodgeEndTime = deps.setPlayerDodgeEndTime;
    var setPlayerStunned = deps.setPlayerStunned;
    var setPlayerStunEndTime = deps.setPlayerStunEndTime;
    var setPlayerPoisoned = deps.setPlayerPoisoned;
    var setPlayerPoisonEndTime = deps.setPlayerPoisonEndTime;
    var setPlayerPoisonDamage = deps.setPlayerPoisonDamage;
    var setPlayerPoisonTickTime = deps.setPlayerPoisonTickTime;

    // ─── 运行时配置（init 时从 COMBAT_SPEC + overrides 解析） ───
    var RC = null;  // Runtime Constants
    var RF = null;  // Runtime Features

    // ─── 统一战斗状态对象 ───
    var S = createDefaultState();

    // ─── 定时器 ───
    var lastTimeTick = 0;
    var petLastAttackTime = 0;

    // ─── 回调引用 ───
    var callbacks = {
        onMonsterDeath: null, onPlayerDeath: null, onTimeUp: null,
        onDamageDealt: null, onBeforeMonsterDeath: null, onPetAttack: null
    };

    // ─── 多攻击者（统一怪物攻击系统，所有怪物通过此数组管理） ───
    var attackers = [];

    // ─── spec 订阅者（updateSpec 时自动推送变化） ───
    var specSubscribers = [];

    // ─── 暂停 ───
    var _owner = { _destroyed: true }; // 初始未激活，init 时才变活跃

    // ─── 外部阻塞位置（实时查询函数，由适配器提供） ───
    var getBlockedPositionsFn = null;

    // ═══════════════════════════════════════════════════════
    // 工具函数
    // ═══════════════════════════════════════════════════════

    function createDefaultState() {
        var timeLimit = RC ? getSpecValue(RC, 'COMBAT.TIME_LIMIT_S') : BATTLE_CONSTANTS.COMBAT_TIME_LIMIT;
        var timeDmg = RC ? getSpecValue(RC, 'COMBAT.TIME_DAMAGE_ON_HIT_S') : BATTLE_CONSTANTS.TIME_DAMAGE_ON_HIT;
        return {
            phase: PHASE.IDLE,
            monster: null,
            stars: [],
            playerHp: 100, playerMaxHp: 100, playerShield: 0,
            timeLeft: timeLimit, timeLimit: timeLimit,
            mode: 'normal', floor: 1,
            combo: 0, lastHitTime: 0, lastStarClickTime: 0,
            comboStarActive: false, comboStarStartTime: 0, comboStarLastAttack: 0,
            greedyHpPool: 0, playerRage: 0,
            skillCooldowns: {},
            isFinished: false, finishReason: null,
            pendingDeaths: [],
            playerStats: null, playerSkills: [], activePet: null,
            timeDamageOnHit: timeDmg,
            bossStunChance: 0,
            bossStunDuration: 0,
            extensions: {}
        };
    }

    function safeCall(fn, ctx) {
        if (typeof fn !== 'function') return;
        try { fn(ctx); } catch (e) { Logger.error('BattleEngine 回调异常:', e.message); }
    }

    function callExtensionHooks(hookName, arg) {
        var ext = S.extensions;
        if (!ext) return;
        var hook = ext[hookName];
        if (!hook) return;
        if (typeof hook === 'function') {
            safeCall(hook, arg);
        } else if (Array.isArray(hook)) {
            for (var i = 0; i < hook.length; i++) {
                safeCall(hook[i], arg);
            }
        }
    }

    function getDefaultConfig() {
        var timeLimit = RC ? getSpecValue(RC, 'COMBAT.TIME_LIMIT_S') : BATTLE_CONSTANTS.COMBAT_TIME_LIMIT;
        var timeDmg = RC ? getSpecValue(RC, 'COMBAT.TIME_DAMAGE_ON_HIT_S') : BATTLE_CONSTANTS.TIME_DAMAGE_ON_HIT;
        return {
            monster: null, timeLimit: timeLimit,
            playerHp: 100, playerMaxHp: 100, playerShield: 0,
            playerStats: null, playerSkills: [], activePet: null,
            mode: 'normal', floor: 1,
            timeDamageOnHit: timeDmg,
            bossStunChance: 0,
            bossStunDuration: 0,
            onMonsterDeath: null, onPlayerDeath: null, onTimeUp: null,
            onDamageDealt: null, onBeforeMonsterDeath: null,
            getBlockedPositionsFn: null,
            deathDelayMs: 1150
        };
    }

    // ═══════════════════════════════════════════════════════
    // 子模块: DamageCalculator
    // ═══════════════════════════════════════════════════════

    function calculateDamage(star, stats, pd) {
        var baseDamage = getSpecValue(RC, 'DAMAGE.BASE') + S.floor * getSpecValue(RC, 'DAMAGE.PER_FLOOR');
        var attackDivisor = getSpecValue(RC, 'DAMAGE.ATTACK_DIVISOR');
        var attackScale = getSpecValue(RC, 'DAMAGE.ATTACK_TO_DAMAGE_SCALE');
        var attackBonus = 1 + (stats.attack / attackDivisor) * attackScale;
        var damage = baseDamage * attackBonus;

        // 星星类型倍率
        var seasonStarTypes = combatSvc.getSeasonStarTypes();
        var starTypeConfig = null;
        for (var j = 0; j < seasonStarTypes.length; j++) {
            if (seasonStarTypes[j].id === star.type) {
                starTypeConfig = seasonStarTypes[j];
                break;
            }
        }
        var starScore = combatSvc.calculateStarScore(star.type);
        if (starTypeConfig && starTypeConfig.multiplier && starTypeConfig.multiplier > 1) {
            var typeMult = 1 + Math.sqrt(starTypeConfig.multiplier - 1) * 0.3;
            damage *= typeMult;
            starScore = Math.floor(starScore * (1 + Math.sqrt(starTypeConfig.multiplier - 1) * 0.2));
        }

        // 快速点击
        var now = Date.now();
        var clickDelay = now - S.lastStarClickTime;
        S.lastStarClickTime = now;
        var isSuperQuickTap = clickDelay <= getSpecValue(RC, 'QUICK_TAP.THRESHOLD_MS') && S.lastStarClickTime > 0;
        var isQuickTap = clickDelay <= getSpecValue(RC, 'QUICK_TAP.WINDOW_MS') && !isSuperQuickTap && S.lastStarClickTime > 0;
        var quickTapMult = isSuperQuickTap ? getSpecValue(RC, 'QUICK_TAP.SUPER_MULT') : (isQuickTap ? getSpecValue(RC, 'QUICK_TAP.NORMAL_MULT') : 1);
        if (quickTapMult > 1) {
            damage *= quickTapMult;
            starScore = Math.floor(starScore * quickTapMult);
        }

        // Combo（15连后收益减半，防止秒杀Boss）
        combatSvc.updateCombo();
        var comboCount = combatSvc.getComboCount();
        var comboMult = getSpecValue(RC, 'COMBO.MULTIPLIER');
        var comboMultiplier;
        if (comboCount <= 15) {
            comboMultiplier = 1 + comboCount * comboMult;
        } else {
            comboMultiplier = 1 + 15 * comboMult + (comboCount - 15) * comboMult * 0.5;
        }
        damage *= comboMultiplier;

        // 暴击
        var isCrit = false;
        var critDamageMult = 1;
        var totalCritRate = stats.critRate;
        var totalCritDamage = stats.critDamage;
        if (Math.random() * 100 < totalCritRate) {
            critDamageMult = totalCritDamage;
            damage *= critDamageMult;
            starScore = Math.floor(starScore * critDamageMult);
            isCrit = true;
        }

        // 伤害浮动 ±5%
        var variance = getSpecValue(RC, 'DAMAGE.VARIANCE');
        var floatFactor = 1 - variance + Math.random() * variance * 2;
        damage = Math.floor(damage * floatFactor);

        return {
            damage: Math.floor(damage), isCrit: isCrit, critDamageMult: critDamageMult,
            comboMultiplier: comboMultiplier, comboCount: comboCount,
            isQuickTap: isQuickTap, isSuperQuickTap: isSuperQuickTap,
            starScore: starScore
        };
    }

    // ═══════════════════════════════════════════════════════
    // 子模块: StatusEffectManager
    // ═══════════════════════════════════════════════════════

    function applyPoison(poisonSkill) {
        setPlayerPoisoned(true);
        setPlayerPoisonEndTime(Date.now() + (poisonSkill.duration || 3) * 1000);
        setPlayerPoisonDamage(poisonSkill.damage || 5);
        setPlayerPoisonTickTime(Date.now() + getSpecValue(RC, 'STATUS.POISON_TICK_MS'));
        var poisonLabel = S.playerShield > 0 ? '腐蚀!' : '中毒!';
        anim.createPlayerDamage(0, false, true, poisonLabel);
        anim.addMessage('☠️ ' + poisonLabel + ' 每秒-' + (poisonSkill.damage || 5) + '灵能', '#ff6b6b');
    }

    function applyStun(stunSkill) {
        if (Math.random() < (stunSkill.chance || 0)) {
            setPlayerStunned(true);
            setPlayerStunEndTime(Date.now() + (stunSkill.duration || 1000));
            anim.addMessage('⚡ 被打断!', '#ff6b6b');
        }
    }

    function updatePoisonTick() {
        if (!getPlayerPoisoned() || Date.now() >= getPlayerPoisonEndTime()) {
            if (getPlayerPoisoned()) { setPlayerPoisoned(false); setPlayerPoisonDamage(0); }
            return;
        }
        if (Date.now() < getPlayerPoisonTickTime()) return;

        var poisonDmg = getPlayerPoisonDamage();
        var shieldAbsorb = 0;
        if (S.playerShield > 0) {
            shieldAbsorb = Math.min(S.playerShield, poisonDmg);
            S.playerShield -= shieldAbsorb;
            poisonDmg -= shieldAbsorb;
        }
        S.playerHp -= poisonDmg;
        setPlayerPoisonTickTime(Date.now() + getSpecValue(RC, 'STATUS.POISON_TICK_MS'));

        if (shieldAbsorb > 0) anim.createPlayerDamage(shieldAbsorb, false, false, null, true);
        if (poisonDmg > 0) { anim.createPlayerDamage(poisonDmg, false, true); anim.playHit(); }

        if (S.playerHp <= 0) { S.playerHp = 0; finishBattle('playerDeath'); }
    }

    function updateStun() {
        if (isPlayerStunned() && Date.now() >= getPlayerStunEndTime()) {
            setPlayerStunned(false);
        }
    }

    // ═══════════════════════════════════════════════════════
    // 子模块: PetAttackManager
    // ═══════════════════════════════════════════════════════

    function updatePetAttack(now) {
        if (!S.activePet || !S.monster || S.monster.hp <= 0) return;

        var attackInterval = (S.activePet.attackSpeed || 2) * 1000;
        if (now - petLastAttackTime < attackInterval) return;

        petLastAttackTime = now;

        var damage = S.activePet.attack || 5;

        var critChance = S.activePet.critRate || 0;
        var isCrit = Math.random() * 100 < critChance;
        if (isCrit) {
            var critMult = 1 + (S.activePet.critDamage || 0.5);
            damage = Math.floor(damage * critMult);
            anim.playCritical();
        }

        S.monster.hp -= damage;
        anim.playHitEnemy();
        anim.createPetDamage(
            scr.getWidth() / 2, scr.getHeight() / 3 - 50,
            damage, S.activePet.emoji || '🐾', isCrit
        );

        safeCall(callbacks.onPetAttack);

        triggerPetSkill(S.activePet);

        if (S.monster.hp <= 0) finishBattle('monsterDeath');
    }

    function triggerPetSkill(pet) {
        if (!pet.skill) return;
        switch (pet.skill) {
            case 'burn':
                if (Math.random() < 0.3 && S.monster) {
                    S.monster.burning = true;
                    S.monster.burnDamage = 5;
                    S.monster.burnEndTime = Date.now() + 3000;
                    anim.addMessage('🔥 宠物触发燃烧!', '#ff6b00');
                }
                break;
            case 'freeze':
                if (Math.random() < 0.2 && S.monster) {
                    S.monster.frozen = true;
                    S.monster.frozenEndTime = Date.now() + 2000;
                    anim.addMessage('❄️ 宠物触发冻结!', '#00bfff');
                }
                break;
            case 'shock':
                if (Math.random() < 0.25 && S.monster) {
                    var shockDmg = Math.floor((pet.attack || 5) * 0.5);
                    S.monster.hp -= shockDmg;
                    anim.addMessage('⚡ 宠物触发电击! -' + shockDmg, '#ffff00');
                }
                break;
            case 'heal':
                var healAmt = pet.healAmount || 5;
                S.playerHp = Math.min(S.playerHp + healAmt, S.playerMaxHp);
                anim.addMessage('💚 灵兽治愈 +' + healAmt + '灵能', '#00ff88');
                break;
            case 'swift':
                if (Math.random() < 0.15 && getPlayerDodging()) {
                    setPlayerDodgeEndTime(getPlayerDodgeEndTime() + 200);
                    anim.addMessage('⚡ 宠物加速闪避!', '#DA70D6');
                }
                break;
        }
    }

    // ═══════════════════════════════════════════════════════
    // 子模块: AttackerManager（统一怪物攻击系统）
    // 所有怪物（含单怪和多怪）统一通过此系统管理
    // ═══════════════════════════════════════════════════════

    /**
     * 添加一个攻击者（怪物）
     * @param {Object} monster 怪物对象（需有 .id, .attack, .x, .y）
     * @param {number} attackInterval 攻击间隔 ms
     */
    function addAttacker(monster, attackInterval) {
        if (!monster || !monster.id) {
            Logger.error('[BattleEngine] addAttacker: 怪物无效');
            return;
        }
        // 避免重复添加
        for (var i = 0; i < attackers.length; i++) {
            if (attackers[i].monster.id === monster.id) return;
        }
        var interval = attackInterval || getSpecValue(RC, 'MONSTER.ATTACK_INTERVAL_MS');
        attackers.push({
            monster: monster,
            attackInterval: interval,
            lastAttackTime: Date.now()
        });
        Logger.info('[BattleEngine] addAttacker:', monster.name || monster.id, 'interval:', interval, 'attackers.length:', attackers.length);
    }

    function removeAttacker(monsterId) {
        for (var i = attackers.length - 1; i >= 0; i--) {
            if (attackers[i].monster.id === monsterId) {
                attackers.splice(i, 1);
                Logger.info('[BattleEngine] removeAttacker:', monsterId);
                return;
            }
        }
    }

    function clearAttackers() {
        attackers = [];
    }

    function getAttackers() {
        return attackers;
    }

    /**
     * 统一攻击系统：处理所有攻击者的攻击（在 update() 中每帧调用）
     */
    function updateAttackers() {
        var now = Date.now();
        for (var i = attackers.length - 1; i >= 0; i--) {
            var atk = attackers[i];
            if (!atk.monster || atk.monster.hp <= 0) {
                attackers.splice(i, 1);
                continue;
            }
            if (now - atk.lastAttackTime < atk.attackInterval) continue;

            atk.lastAttackTime = now;
            fireAttackerProjectile(atk);
        }
    }

    /**
     * 攻击者发射弹幕
     * 使用和 monsterAttack() 相同的弹幕 + onHit 逻辑，
     * 但通过 onMonsterAttackHit 扩展钩子通知适配器做模式特有逻辑
     */
    function fireAttackerProjectile(atk) {
        var monster = atk.monster;
        var damage = monster.attack || 10;

        anim.createMonsterProjectile(
            monster.x || scr.getWidth() / 2,
            monster.y || scr.getHeight() / 3,
            damage, 0, false,
            function () {
                try {
                    if (S.phase !== PHASE.RUNNING) return;

                    // 闪避检查（在弹幕命中时检查，而非函数入口）
                    if (getPlayerDodging() && Date.now() < getPlayerDodgeEndTime()) {
                        anim.createHpBarCounter();
                        var counterDamage = Math.floor(damage * getSpecValue(RC, 'SPECIAL_STARS.DODGE_COUNTER_MULT'));
                        monster.hp -= counterDamage;
                        anim.playHitEnemy();
                        anim.addMessage('💫 反击! -' + counterDamage, '#00ff88');
                        anim.createMonsterDamage(monster.x || scr.getWidth() / 2, monster.y || scr.getHeight() / 3, counterDamage);
                        callExtensionHooks('onMonsterAttackHit', { monster: monster, damage: 0, dodged: true, counterDamage: counterDamage });
                        if (monster.hp <= 0) addPendingDeath(monster);
                        return;
                    }

                    // 护盾吸收
                    var shieldAbsorb = 0;
                    if (S.playerShield > 0) {
                        shieldAbsorb = Math.min(S.playerShield, damage);
                        S.playerShield -= shieldAbsorb;
                        damage -= shieldAbsorb;
                    }

                    // 扣血
                    S.playerHp -= damage;

                    if (shieldAbsorb > 0) anim.createPlayerDamage(shieldAbsorb, false, false, null, true);

                    if (damage > 0) {
                        if (S.timeDamageOnHit > 0) {
                            S.timeLeft = Math.max(0, S.timeLeft - S.timeDamageOnHit);
                            anim.createTimeDamage(S.timeDamageOnHit);
                        }
                        anim.createPlayerDamage(damage, false);
                        anim.addMessage('-' + damage + ' 灵能', '#ff6b6b');
                        anim.vibrateShort({ type: 'heavy' });
                        anim.playHit();
                    }

                    // 中毒技能检查
                    if (monster.skills) {
                        var MonsterSkillType = combatSvc.getMonsterSkillType();
                        for (var pi = 0; pi < monster.skills.length; pi++) {
                            if (monster.skills[pi].type === MonsterSkillType.POISON) {
                                applyPoison(monster.skills[pi]);
                                break;
                            }
                        }
                        for (var si = 0; si < monster.skills.length; si++) {
                            if (monster.skills[si].type === 'stun') {
                                applyStun(monster.skills[si]);
                                break;
                            }
                        }
                    }

                    // Boss 眩晕检查
                    if (S.bossStunChance > 0 && damage > 0 && Math.random() < S.bossStunChance) {
                        setPlayerStunned(true);
                        setPlayerStunEndTime(Date.now() + (S.bossStunDuration || 1000));
                        anim.addMessage('⚡ 守护灵打断!', '#ff6b6b');
                    }

                    // 通知适配器
                    callExtensionHooks('onMonsterAttackHit', {
                        monster: monster, damage: damage, dodged: false,
                        shieldAbsorb: shieldAbsorb
                    });

                    if (S.playerHp <= 0) { S.playerHp = 0; finishBattle('playerDeath'); }
                } catch (e) {
                    Logger.error('fireAttackerProjectile callback 异常:', e.message);
                }
            }
        );
    }

    // ═══════════════════════════════════════════════════════
    // 子模块: PendingDeath（每怪独立追踪消散延迟）
    // ═══════════════════════════════════════════════════════

    function addPendingDeath(monster) {
        if (!monster || !monster.id) return;
        for (var i = 0; i < S.pendingDeaths.length; i++) {
            if (S.pendingDeaths[i].monsterId === monster.id) return;
        }
        S.pendingDeaths.push({ monsterId: monster.id, deathTime: Date.now(), monster: monster });
    }

    // ═══════════════════════════════════════════════════════
    // 子模块: SpecialStarHandler
    // ═══════════════════════════════════════════════════════

    var NON_DAMAGE_TYPES = ['heal', 'shield', 'time', 'greedy', 'unlucky', 'boss_star', 'dodge', 'rainbow'];

    function handleSpecialStar(star, stats, pd, isQuickTap, isSuperQuickTap) {
        switch (star.type) {
            case 'heal':
                anim.playRainbow(1.8);
                var maxHp = (S.playerStats && S.playerStats.hp) || S.playerMaxHp;
                var healPct = getSpecValue(RC, 'SPECIAL_STARS.HEAL_HP') / 100;
                var healAmt = Math.min(Math.floor(maxHp * healPct), maxHp - S.playerHp);
                S.playerHp = Math.min(S.playerHp + healAmt, maxHp);
                anim.createStarBurst(star.x, star.y, 'heal');
                // 绿色流星飞向玩家（血条位置）
                anim.createMeteor(
                    star.x, star.y, healAmt, false, 'heal',
                    0, 1, null,
                    { x: scr.getWidth() / 2, y: scr.getHeight() - Math.floor(50 * scr.getScale()) }
                );
                // 血条上方飘绿色回复数字（使用crit动画系统，与伤害数字同等大小）
                anim.createCrit(
                    scr.getWidth() / 2,
                    scr.getHeight() - Math.floor(80 * scr.getScale()),
                    healAmt, 0, '#90EE90'
                );
                break;

            case 'shield':
                anim.playRainbow();
                var shieldPct = getSpecValue(RC, 'SPECIAL_STARS.SHIELD_AMOUNT') / 100;
                var maxHp = (S.playerStats && S.playerStats.hp) || S.playerMaxHp;
                var shieldAmt = Math.floor(maxHp * shieldPct);
                S.playerShield = (S.playerShield || 0) + shieldAmt;
                anim.addMessage('🛡️ +' + shieldAmt + '护盾', '#cc88ff');
                anim.createStarBurst(star.x, star.y, 'shield');
                break;

            case 'time':
                anim.playNormal();
                S.timeLeft += getSpecValue(RC, 'SPECIAL_STARS.TIME_SECONDS');
                anim.addMessage('⏰ +' + getSpecValue(RC, 'SPECIAL_STARS.TIME_SECONDS') + '秒', '#00ccff');
                anim.createStarBurst(star.x, star.y, 'time');
                break;

            case 'unlucky':
                anim.playNormal();
                var hpCost = getSpecValue(RC, 'SPECIAL_STARS.UNLUCKY_HP_COST');
                if (S.playerShield > 0) {
                    var absorb = Math.min(S.playerShield, hpCost);
                    S.playerShield -= absorb;
                    hpCost -= absorb;
                }
                S.playerHp -= hpCost;
                S.playerRage = (S.playerRage || 0) + 1;
                anim.addMessage('🔻 -' + hpCost + '灵能 怒气 ' + S.playerRage + '/3', '#ff6b6b');
                if (hpCost > 0) anim.playHit();

                if (S.playerRage >= 3) {
                    S.playerRage = 0;
                    var roll = Math.random();
                    if (roll < 0.33) {
                        var critDmg = Math.floor((stats.attack || 50) * 2);
                        if (S.monster) { S.monster.hp -= critDmg; anim.playHitEnemy(); }
                        anim.addMessage('🔥 怒气爆发! -' + critDmg, '#ff0000');
                        anim.createMonsterDamage(scr.getWidth() / 2, scr.getHeight() / 3, critDmg);
                        if (S.monster && S.monster.hp <= 0) finishBattle('monsterDeath');
                    } else if (roll < 0.66) {
                        anim.addMessage('💪 怒气转化! +50攻击', '#ffd700');
                    } else {
                        var healRage = 30;
                        S.playerHp = Math.min(S.playerHp + healRage, S.playerMaxHp);
                        anim.addMessage('💚 怒气回复! +' + healRage + '灵能', '#00ff88');
                    }
                }
                anim.createStarBurst(star.x, star.y, 'unlucky');
                if (S.playerHp <= 0) { S.playerHp = 0; finishBattle('playerDeath'); }
                break;

            case 'greedy':
                anim.playNormal();
                var greedyHpCost = getSpecValue(RC, 'SPECIAL_STARS.GREEDY_HP_COST');
                S.playerHp -= greedyHpCost;
                S.greedyHpPool = (S.greedyHpPool || 0) + 2;
                anim.addMessage('🌀 -1灵能 贪婪池 ' + S.greedyHpPool + '/20', '#8b0000');
                if (greedyHpCost > 0) anim.playHit();
                anim.createStarBurst(star.x, star.y, 'greedy');
                if (S.playerHp <= 0) { S.playerHp = 0; finishBattle('playerDeath'); }
                break;

            case 'dodge':
                anim.playNormal();
                var dodgeTime = getSpecValue(RC, 'SPECIAL_STARS.DODGE_DURATION_MS');
                if (isSuperQuickTap) {
                    dodgeTime += 500;
                    anim.addMessage('💫 超速闪避! 1.5秒', '#00ff88');
                } else if (isQuickTap) {
                    dodgeTime += 250;
                    anim.addMessage('💫 快速闪避! 1.25秒', '#00ff88');
                } else {
                    anim.addMessage('💫 闪避! 1秒', '#DA70D6');
                }
                setPlayerDodging(true);
                setPlayerDodgeEndTime(Date.now() + dodgeTime);
                combatSvc.updateCombo();
                anim.createStarBurst(star.x, star.y, 'dodge');
                break;

            case 'rainbow':
                anim.playRainbow();
                anim.createStarBurst(star.x, star.y, 'rainbow');
                break;

            default:
                anim.playNormal();
                anim.createStarBurst(star.x, star.y, star.type);
                break;
        }
    }

    // ═══════════════════════════════════════════════════════
    // 公共 API
    // ═══════════════════════════════════════════════════════

    function init(config) {
        _owner._destroyed = false; // 激活 subscriber
        if (S.phase === PHASE.RUNNING) {
            finishBattle('reinit');
        }
        if (S.phase !== PHASE.IDLE && S.phase !== PHASE.FINISHED) {
            Logger.error('BattleEngine.init: 阶段错误', S.phase);
            return;
        }

        // 1. 解析运行时配置
        RC = specResolver(COMBAT_SPEC, config.combatOverrides);
        RF = specResolver(COMBAT_FEATURES, config.features || {});

        // 2. 校验
        validateOverrides(config.combatOverrides, COMBAT_SPEC, 'init');
        validateFeatures(config.features, 'init');
        var warnings = getWeakWarnings(RC);
        for (var w = 0; w < warnings.length; w++) {
            Logger.warn('[CombatSpec] ' + warnings[w]);
        }

        // 3. 合并默认值（使用 RC 解析后的值）
        var defaults = getDefaultConfig();
        for (var key in defaults) {
            if (config[key] === undefined) config[key] = defaults[key];
        }
        if (!config.monster || !config.monster.hp) {
            if (!config.skipAutoTimers) {
                Logger.error('BattleEngine.init: config.monster 缺失或无效');
                return;
            }
            // 普通模式多怪物场景：monster 由外部通过 setTargetMonster 设置
        }

        S = createDefaultState();
        S.phase = PHASE.RUNNING;
        S.monster = config.monster || null;
        S.playerHp = config.playerHp;
        S.playerMaxHp = config.playerMaxHp;
        S.playerShield = config.playerShield;
        S.timeLeft = config.timeLimit;
        S.timeLimit = config.timeLimit;
        S.mode = config.mode;
        S.floor = config.floor;
        S.playerStats = config.playerStats;
        S.playerSkills = config.playerSkills || [];
        S.activePet = config.activePet;
        S.timeDamageOnHit = config.timeDamageOnHit;
        S.bossStunChance = config.bossStunChance;
        S.bossStunDuration = config.bossStunDuration;
        S.deathDelayMs = config.deathDelayMs;
        S.extensions = config.extensions || {};
        petLastAttackTime = 0;

        callbacks.onMonsterDeath = config.onMonsterDeath;
        callbacks.onPlayerDeath = config.onPlayerDeath;
        callbacks.onTimeUp = config.onTimeUp;
        callbacks.onDamageDealt = config.onDamageDealt;
        callbacks.onBeforeMonsterDeath = config.onBeforeMonsterDeath;
        callbacks.onPetAttack = config.onPetAttack;

        getBlockedPositionsFn = config.getBlockedPositionsFn || null;

        // 统一攻击系统：注册初始怪物为攻击者（skipAutoTimers 模式跳过）
        lastTimeTick = Date.now();
        attackers = [];
        if (!config.skipAutoTimers && config.monster && config.monster.hp > 0) {
            addAttacker(config.monster, config.monster.attackInterval);
        }

        // 扩展钩子: onBattleStart
        callExtensionHooks('onBattleStart', S);

        Logger.info('BattleEngine 初始化:', config.mode, '怪物:', config.monster ? config.monster.name : 'none',
            '层:', config.floor, 'HP:', config.monster ? config.monster.hp : '-');
    }

    function getState() { return S; }

    function getEffectiveSpec() { return RC; }
    function getFeatures() { return RF; }

    function subscribe(callback) {
        specSubscribers.push(callback);
    }

    /**
     * 热更新 RC — 不重置战斗状态，仅替换数值参数
     * 供 DevBattleSystem 实时调参使用
     */
    function updateSpec(newOverrides) {
        RC = specResolver(COMBAT_SPEC, newOverrides);
        // 刷新已注册 attacker 的攻击间隔
        var interval = getSpecValue(RC, 'MONSTER.ATTACK_INTERVAL_MS');
        for (var i = 0; i < attackers.length; i++) {
            attackers[i].attackInterval = interval;
        }
        // 通知订阅者
        for (var s = 0; s < specSubscribers.length; s++) {
            specSubscribers[s](RC);
        }
        Logger.info('[BattleEngine] updateSpec:', JSON.stringify(newOverrides));
    }

    function handleStarClick(x, y, externalStars) {
        if (S.phase !== PHASE.RUNNING) return false;

        // 眩晕检查
        if (isPlayerStunned() && Date.now() < getPlayerStunEndTime()) return false;
        if (isPlayerStunned()) setPlayerStunned(false);

        var stars = externalStars || S.stars;

        for (var i = stars.length - 1; i >= 0; i--) {
            var star = stars[i];
            var hitRadius = star.size > 50 ? star.size : star.size / 2 + 10;
            var dx = x - star.x, dy = y - star.y;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {

                // 扩展钩子：前置处理（偷星者、毒星、毒液滩等模式特有星星）
                if (S.extensions && S.extensions.onBeforeStarClick) {
                    var preResult = S.extensions.onBeforeStarClick(star, x, y, i);
                    if (preResult && preResult.skip) continue;
                    if (preResult && preResult.handled) {
                        stars.splice(i, 1);
                        // 通知外部移除
                        if (S.extensions.onStarConsumed) S.extensions.onStarConsumed(star);
                        return true;
                    }
                }

                stars.splice(i, 1);
                // 通知外部移除星星
                if (S.extensions && S.extensions.onStarConsumed) S.extensions.onStarConsumed(star);

                var pd = playerService.getData();
                var stats = playerService.getCharFullStats(pd.currentCharacterId) || { attack: 10, critRate: 0, critDamage: 2 };

                // 连击星星
                if (star.type === 'combo') {
                    if (S.comboStarActive) {
                        S.comboStarStartTime = Date.now();
                    } else {
                        S.comboStarActive = true;
                        S.comboStarStartTime = Date.now();
                        S.comboStarLastAttack = Date.now();
                    }
                    anim.createStarBurst(star.x, star.y, 'combo');
                    anim.vibrateShort({ type: 'medium' });
                    if (S.extensions && S.extensions.onAfterSpecialStar) {
                        S.extensions.onAfterSpecialStar(star);
                    }
                    return true;
                }

                // 非攻击星星
                if (NON_DAMAGE_TYPES.indexOf(star.type) !== -1) {
                    var clickDelay = Date.now() - S.lastStarClickTime;
                    S.lastStarClickTime = Date.now();
                    var isSQT = clickDelay <= getSpecValue(RC, 'QUICK_TAP.THRESHOLD_MS');
                    var isQT = clickDelay <= getSpecValue(RC, 'QUICK_TAP.WINDOW_MS') && !isSQT;
                    handleSpecialStar(star, stats, pd, isQT, isSQT);
                    // 扩展钩子：特殊星星后处理（模式特有追加效果）
                    if (S.extensions && S.extensions.onAfterSpecialStar) {
                        S.extensions.onAfterSpecialStar(star);
                    }
                    return true;
                }

                // === 攻击星星 ===
                // 扩展钩子：选择攻击目标（多怪物场景）
                var targetMonster = S.monster;
                if (S.extensions && S.extensions.getAttackTarget) {
                    targetMonster = S.extensions.getAttackTarget(star) || S.monster;
                }

                // 扩展钩子：覆盖伤害计算
                var result = null;
                if (S.extensions && S.extensions.calculateDamageOverride) {
                    result = S.extensions.calculateDamageOverride(star, stats, pd);
                }
                if (!result) {
                    result = calculateDamage(star, stats, pd);
                }
                var damage = result.damage;
                var isCrit = result.isCrit;

                // 无怪物或不活跃怪物：仍计算分数、播放动画
                if (!targetMonster || !targetMonster.active) {
                    anim.createStarBurst(star.x, star.y, star.type);
                    if (isCrit) anim.createScreenShake(3);

                    if (result.isSuperQuickTap) {
                        anim.createQuickTap(star.x, star.y, result.starScore, 4, false);
                        anim.playQuickTap();
                    } else if (result.isQuickTap) {
                        anim.createQuickTap(star.x, star.y, result.starScore, 2, false);
                        anim.playQuickTap();
                    }

                    if (isCrit) {
                        anim.addMessage('💥暴击! +' + result.starScore, '#FFD700');
                    }

                    // 扩展钩子：分数/经验/任务处理
                    if (S.extensions && S.extensions.onScoreEarned) {
                        S.extensions.onScoreEarned(star, result, 0, false);
                    }
                    if (star.type === 'fire') anim.playRainbow();
                    else if (star.type === 'earth') anim.playRainbow(0.4);
                    else anim.playNormal();
                    return true;
                }

                // 扩展钩子：怪物防御（吸收/反弹/护甲/闪避/元素汽伤等）
                var hitResult = { prevented: false, isAbsorbed: false, reflected: false };
                if (S.extensions && S.extensions.onStarHitMonster) {
                    hitResult = S.extensions.onStarHitMonster(star, targetMonster, damage, isCrit) || hitResult;
                }

                if (hitResult.prevented) {
                    anim.createStarBurst(star.x, star.y, star.type);
                    if (hitResult.absorbed) {
                        anim.createMeteor(
                            star.x, star.y, 0, false, star.type,
                            0, 1, null,
                            { x: targetMonster.x || scr.getWidth() / 2, y: targetMonster.y || scr.getHeight() / 3 }
                        );
                        anim.addMessage('吸收! +' + hitResult.healAmount + '灵能', '#ff6b6b');
                    }
                    if (S.extensions && S.extensions.onScoreEarned) {
                        S.extensions.onScoreEarned(star, result, 0, true);
                    }
                    return true;
                }

                if (hitResult.dodged) {
                    anim.createStarBurst(star.x, star.y, star.type);
                    anim.createMeteor(
                        star.x, star.y, 0, false, star.type,
                        0, 1, null,
                        { x: targetMonster.x || scr.getWidth() / 2, y: targetMonster.y || scr.getHeight() / 3 }
                    );
                    return true;
                }

                var actualDamage = (hitResult.modifiedDamage !== undefined) ? hitResult.modifiedDamage : damage;

                anim.createStarBurst(star.x, star.y, star.type);

                if (hitResult.shieldBlocked && actualDamage <= 0) {
                    anim.createMeteor(
                        star.x, star.y, 0, false, star.type,
                        0, 1, null,
                        { x: targetMonster.x || scr.getWidth() / 2, y: targetMonster.y || scr.getHeight() / 3 }
                    );
                    anim.addMessage('护盾抵挡!', '#4FC3F7');
                    if (S.extensions && S.extensions.onScoreEarned) {
                        S.extensions.onScoreEarned(star, result, 0, false);
                    }
                    return true;
                }

                anim.createScreenShake(isCrit ? 3 : 1);

                if (result.isSuperQuickTap) {
                    anim.createQuickTap(star.x, star.y, result.starScore, 4, false);
                    anim.playQuickTap();
                } else if (result.isQuickTap) {
                    anim.createQuickTap(star.x, star.y, result.starScore, 2, false);
                    anim.playQuickTap();
                }

                anim.createMeteor(
                    star.x, star.y, actualDamage, isCrit, star.type,
                    result.starScore, result.comboMultiplier, null,
                    { x: targetMonster.x || scr.getWidth() / 2, y: targetMonster.y || scr.getHeight() / 3 }
                );
                if (star.type === 'fire') anim.playRainbow();
                else if (star.type === 'earth') anim.playRainbow(0.4);
                else anim.playNormal();

                if (isCrit) anim.createCrit(star.x, star.y, actualDamage, result.starScore);

                anim.createMonsterDamage(targetMonster.x || scr.getWidth() / 2, targetMonster.y || scr.getHeight() / 3, actualDamage);

                if (isCrit) {
                    anim.addMessage('💥暴击! -' + actualDamage, '#FFD700');
                    anim.playCritical();
                } else {
                    anim.addMessage('-' + actualDamage, '#ffffff');
                }

                if (result.comboCount >= 5 && result.comboCount % 5 === 0) {
                    var cc = result.comboCount >= 15 ? '#ff00ff' : (result.comboCount >= 10 ? '#ffd700' : '#00ff00');
                    anim.addMessage('🔥 ' + result.comboCount + ' COMBO!', cc);
                    anim.playCombo();
                }

                targetMonster.hp -= actualDamage;
                anim.playHitEnemy();
                safeCall(callbacks.onDamageDealt, { monster: targetMonster, damage: actualDamage });
                Logger.info('BattleEngine 攻击怪物，伤害:', actualDamage, '连击:', result.comboCount, '暴击:', isCrit);

                // 扩展钩子：分数/经验/任务处理
                if (S.extensions && S.extensions.onScoreEarned) {
                    S.extensions.onScoreEarned(star, result, actualDamage, false);
                }

                if (targetMonster.hp <= 0) {
                    if (S.extensions && S.extensions.immediateDeath) {
                        safeCall(callbacks.onBeforeMonsterDeath, { monster: targetMonster });
                        safeCall(callbacks.onMonsterDeath, { monster: targetMonster, floor: S.floor });
                    } else {
                        addPendingDeath(targetMonster);
                    }
                }
                return true;
            }
        }
        return false;
    }

    function update(dt) {
        if (S.phase !== PHASE.RUNNING) return;

        var now = Date.now();

        // 统一攻击系统：所有怪物通过 attackers[] 独立攻击
        updateAttackers();

        // 怪物消散延迟结算（每怪独立追踪，等流星动画完成后取最晚消散时间）
        if (S.pendingDeaths.length > 0) {
            var latestTime = 0;
            for (var pd = 0; pd < S.pendingDeaths.length; pd++) {
                if (S.pendingDeaths[pd].deathTime > latestTime) latestTime = S.pendingDeaths[pd].deathTime;
            }
            if (now - latestTime >= (S.deathDelayMs != null ? S.deathDelayMs : 1150)) {
                var lastDead = S.pendingDeaths[S.pendingDeaths.length - 1];
                S.pendingDeaths = [];
                if (S.extensions && S.extensions.preventFinish) {
                    safeCall(callbacks.onBeforeMonsterDeath, { monster: lastDead.monster || S.monster });
                    safeCall(callbacks.onMonsterDeath, { monster: lastDead.monster || S.monster, floor: S.floor });
                } else {
                    finishBattle('monsterDeath');
                }
            }
            return;
        }

        // 时间倒计时（preventFinish 模式跳过：无尽模式由外部管理时间）
        if (!S.extensions.preventFinish && now - lastTimeTick >= getSpecValue(RC, 'COMBAT.TIME_TICK_MS')) {
            S.timeLeft = Math.max(0, S.timeLeft - 1);
            lastTimeTick = now;
            if (S.timeLeft <= 0) {
                finishBattle('timeUp');
                return;
            }
        }

        // 连击星星状态管理（自动攻击由 GameBattleRenderer 统一处理）
        if (S.comboStarActive) {
            if (now - S.comboStarStartTime > getSpecValue(RC, 'COMBO.STAR_DURATION_MS')) {
                S.comboStarActive = false;
            }
        }

        // 中毒 tick
        updatePoisonTick();

        // 宠物自动攻击
        updatePetAttack(now);

        // 眩晕更新
        updateStun();

        // 扩展钩子: onBattleUpdate
        callExtensionHooks('onBattleUpdate', { dt: dt, state: S });
    }

    function useSkill(skillId) {
        if (S.phase !== PHASE.RUNNING) return false;

        var Skills = skillSvc.getConfig();
        var SkillTypes = skillSvc.getTypes();
        var skill = Skills[skillId];
        if (!skill) return false;
        if (skill.type === SkillTypes.PASSIVE) return false;

        var now = Date.now();
        var cd = S.skillCooldowns[skillId];
        if (cd && (cd.cooldownMs - (now - cd.lastUseTime)) > 0) return false;

        var pd = playerService.getData();
        var stats = playerService.getCharFullStats(pd.currentCharacterId) || { attack: 10, critRate: 0, critDamage: 2 };
        var success = false;

        switch (skill.effect) {
            case 'damage':
                if (!S.monster || S.monster.hp <= 0) return false;
                var attackRatio = getSkillAttackRatio(skill.rarity);
                var baseAtk = (stats && stats.attack) ? stats.attack : 10;
                var comboCount = combatSvc.getComboCount();
                var dmg = Math.floor(baseAtk * attackRatio * (1 + comboCount * 0.05));
                var isCrit = Math.random() * 100 < (stats.critRate + (pd.extraCritRate || 0));
                if (isCrit) {
                    dmg = Math.floor(dmg * (stats.critDamage + (pd.extraCritDamage || 0)));
                    anim.createCrit(scr.getWidth() / 2, scr.getHeight() / 3, dmg, 0);
                    anim.playCritical();
                }
                S.monster.hp -= dmg;
                anim.playHitEnemy();
                anim.createMonsterDamage(scr.getWidth() / 2, scr.getHeight() / 3, dmg);
                anim.addMessage(skill.emoji + ' ' + skill.name + '! -' + dmg, '#00ccff');
                safeCall(callbacks.onDamageDealt, { monster: S.monster, damage: dmg });
                if (S.monster.hp <= 0) finishBattle('monsterDeath');
                success = true;
                break;
            case 'heal':
                var healAmt = skill.heal;
                var actualHeal = Math.min(healAmt, S.playerMaxHp - S.playerHp);
                if (actualHeal <= 0) return false;
                S.playerHp = Math.min(S.playerHp + healAmt, S.playerMaxHp);
                anim.addMessage(skill.emoji + ' +' + actualHeal + '灵能', '#00ff88');
                success = true;
                break;
            case 'shield':
                S.playerShield = (S.playerShield || 0) + skill.shield;
                anim.addMessage(skill.emoji + ' +' + skill.shield + '护盾', '#cc88ff');
                success = true;
                break;
            case 'time':
                var timeAdd = skill.timeAdd || 0;
                S.timeLeft += timeAdd;
                anim.addMessage(skill.emoji + ' +' + timeAdd + '秒', '#00ccff');
                success = true;
                break;
            case 'speed':
                // 星星生成速度由外部 StarSystem 管理
                anim.addMessage(skill.emoji + ' 攻速提升!', '#00ccff');
                success = true;
                break;
            case 'buff':
                if (S.monster && S.monster.hp > 0) {
                    var buffDmg = (skill.attack || 0) + stats.attack * 0.5;
                    if (buffDmg > 0) {
                        S.monster.hp -= buffDmg;
                        anim.createMonsterDamage(scr.getWidth() / 2, scr.getHeight() / 3, buffDmg);
                        anim.addMessage(skill.emoji + ' 属性爆发! -' + Math.floor(buffDmg), '#00ccff');
                        safeCall(callbacks.onDamageDealt, { monster: S.monster, damage: buffDmg });
                        if (S.monster.hp <= 0) finishBattle('monsterDeath');
                    }
                }
                success = true;
                break;
            default:
                return false;
        }

        if (success) {
            S.skillCooldowns[skillId] = {
                lastUseTime: now,
                cooldownMs: skill.cooldown * 1000
            };
            anim.vibrateShort({ type: 'medium' });
        }
        return success;
    }

    function finishBattle(reason) {
        if (S.phase === PHASE.FINISHED) return;
        if (reason === 'monsterDeath' && S.pendingDeaths.length > 0) return;
        S.pendingDeaths = [];
        S.phase = PHASE.FINISHED;
        S.isFinished = true;
        S.finishReason = reason;

        Logger.info('BattleEngine 战斗结束:', reason);

        // 扩展钩子: onBattleEnd
        callExtensionHooks('onBattleEnd', { reason: reason, state: S });

        if (reason === 'monsterDeath') {
            safeCall(callbacks.onBeforeMonsterDeath, { monster: S.monster });
            safeCall(callbacks.onMonsterDeath, { monster: S.monster, floor: S.floor });
        } else if (reason === 'playerDeath') {
            safeCall(callbacks.onPlayerDeath);
        } else if (reason === 'timeUp') {
            safeCall(callbacks.onTimeUp);
        }
    }

    function destroy() {
        _owner._destroyed = true;
        PauseCoordinator.instance.unsubscribe('BattleEngine');
        attackers = [];
        specSubscribers = [];
        RC = null;
        RF = null;
        S = createDefaultState();
        callbacks = { onMonsterDeath: null, onPlayerDeath: null, onTimeUp: null, onDamageDealt: null, onBeforeMonsterDeath: null };
        getBlockedPositionsFn = null;
        Logger.info('BattleEngine 销毁');
    }

    function replaceMonster(newMonster) {
        S.monster = newMonster;
        if (S.phase === PHASE.FINISHED) {
            S.phase = PHASE.RUNNING;
            S.isFinished = false;
            S.finishReason = null;
        }
        Logger.info('BattleEngine 替换怪物:', newMonster.name, 'HP:', newMonster.hp);
    }

    // 注册到 PauseCoordinator（init 时 subscribe，destroy 时 unsubscribe）
    PauseCoordinator.instance.subscribe(_owner, 'BattleEngine', {
        onPause: function() {
            if (S.phase !== PHASE.RUNNING) return;
            S.phase = 'paused';
        },
        onResume: function(duration) {
            if (S.phase !== 'paused') return;
            if (S.comboStarActive) S.comboStarStartTime += duration;
            if (getPlayerPoisoned()) {
                setPlayerPoisonEndTime(getPlayerPoisonEndTime() + duration);
                setPlayerPoisonTickTime(getPlayerPoisonTickTime() + duration);
            }
            if (isPlayerStunned()) setPlayerStunEndTime(getPlayerStunEndTime() + duration);
            if (getPlayerDodging()) setPlayerDodgeEndTime(getPlayerDodgeEndTime() + duration);
            for (var ai = 0; ai < attackers.length; ai++) {
                attackers[ai].lastAttackTime += duration;
            }
            for (var pi = 0; pi < S.pendingDeaths.length; pi++) {
                S.pendingDeaths[pi].deathTime += duration;
            }
            petLastAttackTime += duration;
            S.phase = PHASE.RUNNING;
            lastTimeTick = Date.now();
        }
    });

    function setBlockedPositionsFn(fn) {
        getBlockedPositionsFn = fn;
    }

    function setTargetMonster(monster) {
        S.monster = monster;
    }

    function getTargetMonster() {
        return S.monster;
    }

    function setPlayerState(hp, shield) {
        if (hp !== undefined) S.playerHp = hp;
        if (shield !== undefined) S.playerShield = shield;
    }

    return {
        init: init,
        update: update,
        handleStarClick: handleStarClick,
        useSkill: useSkill,
        getState: getState,
        destroy: destroy,
        replaceMonster: replaceMonster,
        setBlockedPositionsFn: setBlockedPositionsFn,
        getEffectiveSpec: getEffectiveSpec,
        getFeatures: getFeatures,
        updateSpec: updateSpec,
        subscribe: subscribe,
        addAttacker: addAttacker,
        removeAttacker: removeAttacker,
        clearAttackers: clearAttackers,
        getAttackers: getAttackers,
        setTargetMonster: setTargetMonster,
        getTargetMonster: getTargetMonster,
        addPendingDeath: addPendingDeath,
        setPlayerState: setPlayerState,
        finishBattle: finishBattle
    };
}

export { createBattleEngine, BATTLE_CONSTANTS };
