import Logger from '../utils/Logger.js';
import { getSkillAttackRatio } from '../config/SkillConfig.js';
/**
 * 技能系统（Skill System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 *
 * 包含：技能使用、冷却管理、技能效果更新/查询
 * 不包含：useGreedySkill、triggerBossStarSkill（与Boss战斗系统深度耦合，保留在game.js）
 */

function createSkillSystem(deps) {
    // 依赖注入
    var getPlayerData = deps.getPlayerData;
    var getSkills = deps.getSkills;
    var getSkillTypes = deps.getSkillTypes;
    var getActiveMonsters = deps.getActiveMonsters;
    var getGameState = deps.getGameState;
    var getGameConst = deps.getGameConst;
    var getBossBattleMode = deps.getBossBattleMode;
    var getMonster = deps.getMonster;
    var getCharacterFullStats = deps.getCharacterFullStats;
    var getScreenScale = deps.getScreenScale;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getStars = deps.getStars;
    var setCurrentStarInterval = deps.setCurrentStarInterval;
    var getBaseStarInterval = deps.getBaseStarInterval;
    var getMinStarInterval = deps.getMinStarInterval;
    var addTimeLeft = deps.addTimeLeft;
    var addMessage = deps.addMessage;
    var createCritAnimation = deps.createCritAnimation;
    var createSkillDamageAnimation = deps.createSkillDamageAnimation;
    var onMonsterKilled = deps.onMonsterKilled;
    var vibrateShort = deps.vibrateShort;

    // ==================== 内部状态 ====================
    var skillCooldowns = {};       // 技能冷却 { skillId: { lastUseTime, cooldownMs } }
    var activeSkillEffects = [];   // 激活的技能效果

    // ==================== 核心方法 ====================

    /**
     * 使用技能
     */
    function useSkill(skillId) {
        var Skills = getSkills();
        var SkillTypes = getSkillTypes();
        var skill = Skills[skillId];
        if (!skill) {
            Logger.info('技能不存在:', skillId);
            return false;
        }

        // 被动技能不需要主动使用
        if (skill.type === SkillTypes.PASSIVE) {
            addMessage('被动技能自动生效', '#00ccff');
            return false;
        }

        // 检查冷却时间
        var now = Date.now();
        var cooldownInfo = skillCooldowns[skillId];
        if (cooldownInfo) {
            var remainingCooldown = cooldownInfo.cooldownMs - (now - cooldownInfo.lastUseTime);
            if (remainingCooldown > 0) {
                addMessage('冷却中 ' + Math.ceil(remainingCooldown / 1000) + '秒', '#ff6b6b');
                return false;
            }
        }

        // 执行技能效果
        var success = false;
        var playerData = getPlayerData();

        switch (skill.effect) {
            case 'damage':
                // 攻击技能：对怪物造成伤害
                var activeMonsters = getActiveMonsters();
                if (activeMonsters.length === 0) {
                    addMessage('没有目标', '#ff6b6b');
                    return false;
                }

                // 对所有怪物造成伤害
                for (let mi = 0; mi < activeMonsters.length; mi++) {
                    var m = activeMonsters[mi];

                    // 暴击判定
                    var currentCharId = playerData.currentCharacterId;
                    var charStats = currentCharId ? getCharacterFullStats(currentCharId) : null;
                    var attackRatio = getSkillAttackRatio(skill.rarity);
                    var baseAtk = (charStats && charStats.attack) ? charStats.attack : 10;
                    var damage = Math.floor(baseAtk * attackRatio);
                    var totalCritRate = (charStats ? charStats.critRate : 0) + (playerData.extraCritRate || 0);
                    var isCritical = Math.random() * 100 < totalCritRate;

                    if (isCritical) {
                        var baseCritDamage = (charStats ? charStats.critDamage : 2.0) + (playerData.extraCritDamage || 0);
                        damage = Math.floor(damage * baseCritDamage);
                        createCritAnimation(m.x, m.y - 30, damage, 0);
                    }

                    // Boss模式下使用attackBoss同步HP
                    var state = getGameState();
                    var GAME_STATE = getGameConst();
                    if (state === GAME_STATE.BOSS_BATTLE) {
                        var BossBattleMode = getBossBattleMode();
                        BossBattleMode.attackBoss(damage);
                    } else {
                        m.hp -= damage;
                        // 检查怪物死亡
                        if (m.hp <= 0) {
                            m.hp = 0;
                            onMonsterKilled();
                        }
                    }
                    Logger.info(skill.name + '命中! 伤害:' + damage + ' 暴击:' + isCritical);

                    // 显示伤害飘字
                    createSkillDamageAnimation(m.x, m.y - 30, damage, skill.emoji);
                }

                addMessage(skill.emoji + ' ' + skill.name + '!', '#00ccff');
                success = true;
                break;

            case 'heal':
                // 治疗技能：恢复生命值
                var healAmount = skill.heal;
                var maxHp = playerData.maxPlayerHp || 100;
                var currentHp = playerData.playerHp != null ? playerData.playerHp : 100;
                var actualHeal = Math.min(healAmount, maxHp - currentHp);

                if (actualHeal <= 0) {
                    addMessage('灵核已满', '#ff6b6b');
                    return false;
                }

                playerData.playerHp = Math.min(maxHp, currentHp + healAmount);
                addMessage(skill.emoji + ' +' + actualHeal + ' 灵能', '#00ff88');
                Logger.info('治疗:', actualHeal, '当前HP:', playerData.playerHp);
                success = true;
                break;

            case 'shield':
                // 护盾技能：获得护盾
                var shieldAmount = skill.shield;
                playerData.playerShield = (playerData.playerShield || 0) + shieldAmount;

                // 如果有免疫效果
                if (skill.immunity) {
                    activeSkillEffects.push({
                        type: 'immunity',
                        duration: skill.immunity * 1000,
                        startTime: Date.now()
                    });
                    addMessage(skill.emoji + ' 护盾+' + shieldAmount + ' 免疫' + skill.immunity + '秒', '#cc88ff');
                } else {
                    addMessage(skill.emoji + ' 护盾+' + shieldAmount, '#cc88ff');
                }

                Logger.info('护盾:', shieldAmount, '当前护盾:', playerData.playerShield);
                success = true;
                break;

            case 'time':
                // 时间技能：增加游戏时间
                var timeAdd = skill.timeAdd || 0;
                addTimeLeft(timeAdd);
                addMessage(skill.emoji + ' +' + timeAdd + '秒', '#00ccff');
                Logger.info('时间延长:', timeAdd);
                success = true;
                break;

            case 'speed':
                // 加速技能：提升攻击速度
                activeSkillEffects.push({
                    type: 'speed',
                    speedBoost: skill.speedBoost,
                    duration: skill.duration * 1000,
                    startTime: Date.now()
                });
                // 立即应用速度加成
                setCurrentStarInterval(Math.max(getMinStarInterval(), Math.floor(getBaseStarInterval() / skill.speedBoost)));
                addMessage(skill.emoji + ' 攻速提升!', '#00ccff');
                Logger.info('加速:', skill.speedBoost, '持续:', skill.duration);
                success = true;
                break;

            case 'gold':
                // 灵币加成技能
                activeSkillEffects.push({
                    type: 'gold',
                    goldBonus: skill.goldBonus,
                    duration: skill.duration * 1000,
                    startTime: Date.now()
                });
                addMessage(skill.emoji + ' 灵币翻倍!', '#ffcc00');
                Logger.info('灵币加成:', skill.goldBonus, '持续:', skill.duration);
                success = true;
                break;

            case 'buff':
                // 增益技能：临时提升属性
                activeSkillEffects.push({
                    type: 'buff',
                    attack: skill.attack || 0,
                    critRate: skill.critRate || 0,
                    critDamage: skill.critDamage || 0,
                    duration: skill.duration * 1000,
                    startTime: Date.now()
                });
                addMessage(skill.emoji + ' 属性提升!', '#00ccff');
                Logger.info('增益:', skill.attack, skill.critRate, skill.critDamage, '持续:', skill.duration);
                success = true;
                break;

            default:
                Logger.info('未知技能效果:', skill.effect);
                return false;
        }

        // 设置冷却时间
        if (success) {
            skillCooldowns[skillId] = {
                lastUseTime: now,
                cooldownMs: skill.cooldown * 1000
            };

            // 震动反馈
            vibrateShort({ type: 'medium' });
        }

        return success;
    }

    /**
     * 获取技能剩余冷却时间（秒）
     */
    function getSkillRemainingCooldown(skillId) {
        var Skills = getSkills();
        var SkillTypes = getSkillTypes();
        var skill = Skills[skillId];
        if (!skill || skill.type === SkillTypes.PASSIVE) return 0;

        var cooldownInfo = skillCooldowns[skillId];
        if (!cooldownInfo) return 0;

        var elapsed = Date.now() - cooldownInfo.lastUseTime;
        var remaining = cooldownInfo.cooldownMs - elapsed;
        return Math.max(0, Math.ceil(remaining / 1000));
    }

    /**
     * 更新技能效果（每帧调用）
     */
    function updateSkillEffects() {
        var now = Date.now();
        for (let i = activeSkillEffects.length - 1; i >= 0; i--) {
            var effect = activeSkillEffects[i];
            var elapsed = now - effect.startTime;

            if (elapsed >= effect.duration) {
                // 效果结束
                if (effect.type === 'speed') {
                    // 恢复正常速度
                    setCurrentStarInterval(getBaseStarInterval());
                }
                activeSkillEffects.splice(i, 1);
                Logger.info('技能效果结束:', effect.type);
            }
        }
    }

    /**
     * 获取当前激活的技能效果加成
     */
    function getActiveSkillBonuses() {
        var bonuses = {
            attack: 0,
            critRate: 0,
            critDamage: 0,
            goldBonus: 1,
            speedBoost: 1
        };

        for (let i = 0; i < activeSkillEffects.length; i++) {
            var effect = activeSkillEffects[i];
            if (effect.type === 'buff') {
                bonuses.attack += effect.attack || 0;
                bonuses.critRate += effect.critRate || 0;
                bonuses.critDamage += effect.critDamage || 0;
            } else if (effect.type === 'gold') {
                bonuses.goldBonus *= effect.goldBonus;
            } else if (effect.type === 'speed') {
                bonuses.speedBoost *= effect.speedBoost;
            }
        }

        return bonuses;
    }

    /**
     * 检查是否免疫伤害
     */
    function isImmune() {
        for (let i = 0; i < activeSkillEffects.length; i++) {
            var effect = activeSkillEffects[i];
            if (effect.type === 'immunity') {
                var elapsed = Date.now() - effect.startTime;
                if (elapsed < effect.duration) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 重置技能系统（游戏结束时调用）
     */
    function resetSystem() {
        skillCooldowns = {};
        activeSkillEffects = [];
    }

    return {
        useSkill: useSkill,
        getSkillRemainingCooldown: getSkillRemainingCooldown,
        updateSkillEffects: updateSkillEffects,
        getActiveSkillBonuses: getActiveSkillBonuses,
        isImmune: isImmune,
        resetSystem: resetSystem
    };
}

export { createSkillSystem };
