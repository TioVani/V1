import Logger from '../utils/Logger.js';
/**
 * 信仰系统 - 独立模块
 *
 * 负责角色信仰等级、经验、专精、破格技能、传承的完整生命周期。
 * 包含信仰配置（FAITH_CONFIG）。
 *
 * 通过依赖注入（deps）与外部系统通信，不直接访问全局变量。
 */

// ==================== 信仰配置 ====================

export const FAITH_CONFIG = {
    SPECIALIZATION_LEVEL: 50,
    BREAKTHROUGH_LEVEL: 100,
    INHERIT_LEVEL: 500,

    // 等级经验公式
    getExpRequired: function(level) {
        var baseExp = 100;
        var growth = Math.floor(level * 50 * Math.pow(1.05, Math.floor(level / 50)));
        return baseExp + growth;
    },

    // 属性加成公式（递减设计）
    getAttributeBonus: function(level, baseValue) {
        var multiplier = 1;
        if (level <= 50) {
            multiplier = 1 + (level * 0.03);
        } else if (level <= 100) {
            multiplier = 1 + (50 * 0.03) + ((level - 50) * 0.01);
        } else if (level <= 200) {
            multiplier = 1 + (50 * 0.03) + (50 * 0.01) + ((level - 100) * 0.005);
        } else {
            multiplier = 1 + (50 * 0.03) + (50 * 0.01) + (100 * 0.005) + ((level - 200) * 0.001);
        }
        return Math.floor(baseValue * multiplier);
    },

    // 专精路线配置
    specializations: {
        offense: { name: '破灵之路', attack: 5, critRate: 2, critDamage: 10 },
        survival: { name: '永恒之路', hp: 10, defense: 8, healBonus: 20 },
        support: { name: '守护之路', teamAttack: 5, teamDefense: 5, buffDuration: 20 },
        balance: { name: '均衡之路', allAttributes: 3 }
    },

    // 破格技能配置
    breakthroughSkills: {
        faith_undying: { name: '灵核不灭', description: '灵核归零时免消散一次，回复30%生命', effect: { revive: 30 } },
        faith_burst_master: { name: '灵爆宗师', description: '会心威力倍增', effect: { critDamage: 100 } },
        faith_time_master: { name: '时序掌控', description: '游戏时间延长30秒', effect: { timeExtend: 30 } },
        faith_gold_master: { name: '灵币慧眼', description: '灵币呼唤力提升', effect: { goldBoost: 50 } },
        faith_combo_master: { name: '连灵宗师', description: '连灵中断时间延长1秒', effect: { comboTimeout: 1 } },
        faith_star_master: { name: '星辰之子', description: '灵域冥契增幅', effect: { specialStar: 20 } },
        faith_boss_slayer: { name: '净化专精', description: '对守护灵压制增强', effect: { bossDamage: 50 } },
        faith_monster_hunter: { name: '净化回响', description: '每净化一只邪灵回复5点灵能', effect: { healOnKill: 5 } }
    }
};

// ==================== 信仰系统工厂函数 ====================

export function createFaithSystem(deps) {
    var getPlayerData = deps.getPlayerData;
    var saveData = deps.saveData;

    // 获取角色信仰数据
    function getCharacterFaithData(charId) {
        var pd = getPlayerData();
        if (!pd.faithData) {
            pd.faithData = {
                resources: { devoutMark: 0, divineEssence: 0, originCrystal: 0, weeklyDevoutMark: 0, lastWeeklyReset: 0 },
                characters: {},
                inheritance: { totalInherited: 0, inheritedBonus: { attack: 0, hp: 0, critRate: 0 } }
            };
        }
        if (!pd.faithData.characters[charId]) {
            pd.faithData.characters[charId] = {
                level: 1,
                exp: 0,
                specialization: null,
                specializationUnlocked: false,
                breakthroughSkills: [],
                breakthroughUnlocked: false,
                inherited: false,
                inheritedLevel: 0
            };
        }
        return pd.faithData.characters[charId];
    }

    // 获取角色最终信仰加成属性
    function getFaithAttributeBonus(charId, attribute) {
        var pd = getPlayerData();
        var faithData = getCharacterFaithData(charId);
        var level = faithData.level;

        // 基础加成
        var bonus = 0;
        var baseBonus = { hp: 2, attack: 3, critRate: 0.5, critDamage: 1, defense: 2 };
        bonus = (baseBonus[attribute] || 0) * level;

        // 专精加成
        if (faithData.specialization && faithData.specializationUnlocked) {
            var spec = FAITH_CONFIG.specializations[faithData.specialization];
            if (spec[attribute]) {
                bonus += spec[attribute] * Math.floor(level / 10);
            }
            if (spec.allAttributes) {
                bonus += spec.allAttributes * Math.floor(level / 10);
            }
        }

        // 破格技能加成
        if (faithData.breakthroughSkills && faithData.breakthroughSkills.length > 0) {
            faithData.breakthroughSkills.forEach(function(skillId) {
                var skill = FAITH_CONFIG.breakthroughSkills[skillId];
                if (skill && skill.effect) {
                    if (skill.effect[attribute]) {
                        bonus += skill.effect[attribute];
                    }
                }
            });
        }

        // 传承加成
        if (pd.faithData && pd.faithData.inheritance) {
            var inheritedBonus = pd.faithData.inheritance.inheritedBonus;
            if (inheritedBonus[attribute]) {
                bonus += inheritedBonus[attribute];
            }
        }

        return bonus;
    }

    // 增加信仰经验
    function addFaithExp(charId, expAmount) {
        var faithData = getCharacterFaithData(charId);
        faithData.exp += expAmount;

        var leveledUp = false;
        var newLevel = faithData.level;

        while (true) {
            var expRequired = FAITH_CONFIG.getExpRequired(faithData.level);
            if (faithData.exp >= expRequired) {
                faithData.exp -= expRequired;
                faithData.level++;
                newLevel = faithData.level;
                leveledUp = true;
            } else {
                break;
            }
        }

        saveData();

        if (leveledUp) {
            Logger.info('角色 ' + charId + ' 信仰升级到 ' + newLevel + ' 级！');
        }

        return { leveledUp: leveledUp, newLevel: newLevel };
    }

    // 使用信仰资源
    function useFaithResource(charId, resourceType, amount) {
        var pd = getPlayerData();
        if (!pd.faithData || !pd.faithData.resources) {
            return false;
        }
        var resources = pd.faithData.resources;

        if (resourceType === 'devoutMark') {
            if (resources.devoutMark >= amount) {
                resources.devoutMark -= amount;
                addFaithExp(charId, amount * 10);
                return true;
            }
        } else if (resourceType === 'divineEssence') {
            if (resources.divineEssence >= amount) {
                resources.divineEssence -= amount;
                addFaithExp(charId, amount * 50);
                return true;
            }
        } else if (resourceType === 'originCrystal') {
            if (resources.originCrystal >= amount) {
                resources.originCrystal -= amount;
                return true;
            }
        }
        return false;
    }

    // 获得信仰资源
    function gainFaithResource(resourceType, amount) {
        var pd = getPlayerData();
        if (!pd.faithData) {
            pd.faithData = {
                resources: { devoutMark: 0, divineEssence: 0, originCrystal: 0, weeklyDevoutMark: 0, lastWeeklyReset: 0 },
                characters: {},
                inheritance: { totalInherited: 0, inheritedBonus: { attack: 0, hp: 0, critRate: 0 } }
            };
        }
        var resources = pd.faithData.resources;

        if (resourceType === 'devoutMark') {
            var now = Date.now();
            var weekStart = now - (now % (7 * 24 * 60 * 60 * 1000));
            if (resources.lastWeeklyReset < weekStart) {
                resources.weeklyDevoutMark = 0;
                resources.lastWeeklyReset = weekStart;
            }
            var maxWeekly = 500;
            var canGain = Math.min(amount, maxWeekly - resources.weeklyDevoutMark);
            if (canGain > 0) {
                resources.devoutMark += canGain;
                resources.weeklyDevoutMark += canGain;
                Logger.info('获得虔诚印记 ' + canGain + '，当前: ' + resources.devoutMark);
            }
        } else if (resourceType === 'divineEssence') {
            resources.divineEssence += amount;
            Logger.info('获得神恩精华 ' + amount + '，当前: ' + resources.divineEssence);
        } else if (resourceType === 'originCrystal') {
            resources.originCrystal += amount;
            Logger.info('获得本源结晶 ' + amount + '，当前: ' + resources.originCrystal);
        }

        saveData();
    }

    // 解锁专精
    function unlockSpecialization(charId, path) {
        var pd = getPlayerData();
        var faithData = getCharacterFaithData(charId);

        if (faithData.level < 50) {
            Logger.info('信仰等级不足50级，无法解锁专精');
            return false;
        }
        if (!pd.faithData.resources.originCrystal || pd.faithData.resources.originCrystal < 5) {
            Logger.info('本源结晶不足，无法解锁专精');
            return false;
        }
        if (!FAITH_CONFIG.specializations[path]) {
            Logger.info('无效的专精路线');
            return false;
        }

        pd.faithData.resources.originCrystal -= 5;
        faithData.specialization = path;
        faithData.specializationUnlocked = true;

        saveData();
        Logger.info('角色 ' + charId + ' 解锁专精: ' + FAITH_CONFIG.specializations[path].name);
        return true;
    }

    // 解锁破格技能
    function unlockBreakthroughSkill(charId, skillId) {
        var pd = getPlayerData();
        var faithData = getCharacterFaithData(charId);

        if (faithData.level < 100) {
            Logger.info('信仰等级不足100级，无法解锁破格技能');
            return false;
        }
        if (!pd.faithData.resources.originCrystal || pd.faithData.resources.originCrystal < 5) {
            Logger.info('本源结晶不足，无法解锁破格技能');
            return false;
        }
        if (!FAITH_CONFIG.breakthroughSkills[skillId]) {
            Logger.info('无效的破格技能');
            return false;
        }
        if (faithData.breakthroughSkills.indexOf(skillId) !== -1) {
            Logger.info('已经拥有该破格技能');
            return false;
        }

        pd.faithData.resources.originCrystal -= 5;
        faithData.breakthroughSkills.push(skillId);
        faithData.breakthroughUnlocked = true;

        saveData();
        Logger.info('角色 ' + charId + ' 解锁破格技能: ' + FAITH_CONFIG.breakthroughSkills[skillId].name);
        return true;
    }

    // 执行传承
    function performInheritance(charId) {
        var pd = getPlayerData();
        var faithData = getCharacterFaithData(charId);

        if (faithData.level < 500) {
            Logger.info('信仰等级不足500级，无法传承');
            return false;
        }
        if (faithData.inherited) {
            Logger.info('该角色已经传承过');
            return false;
        }

        var bonusPerLevel = { attack: 0.1, hp: 0.2, critRate: 0.05 };
        var level = faithData.level;

        pd.faithData.inheritance.inheritedBonus.attack += Math.floor(level * bonusPerLevel.attack);
        pd.faithData.inheritance.inheritedBonus.hp += Math.floor(level * bonusPerLevel.hp);
        pd.faithData.inheritance.inheritedBonus.critRate += Math.floor(level * bonusPerLevel.critRate);
        pd.faithData.inheritance.totalInherited++;

        faithData.inherited = true;
        faithData.inheritedLevel = level;

        saveData();
        Logger.info('角色 ' + charId + ' 完成传承！全队获得永久加成');
        return true;
    }

    // 计算信仰加成后的总属性
    function calculateTotalAttributesWithFaith(charId, baseAttributes) {
        var result = Object.assign({}, baseAttributes);
        result.attack += getFaithAttributeBonus(charId, 'attack');
        result.hp += getFaithAttributeBonus(charId, 'hp');
        result.critRate += getFaithAttributeBonus(charId, 'critRate');
        result.critDamage += getFaithAttributeBonus(charId, 'critDamage');
        result.defense += getFaithAttributeBonus(charId, 'defense');
        return result;
    }

    // 检查破格技能效果
    function hasBreakthroughEffect(charId, effectType) {
        var faithData = getCharacterFaithData(charId);
        if (!faithData.breakthroughSkills || faithData.breakthroughSkills.length === 0) {
            return false;
        }
        for (let i = 0; i < faithData.breakthroughSkills.length; i++) {
            var skillId = faithData.breakthroughSkills[i];
            var skill = FAITH_CONFIG.breakthroughSkills[skillId];
            if (skill && skill.effect && skill.effect[effectType] !== undefined) {
                return skill.effect[effectType];
            }
        }
        return false;
    }

    // 公开接口
    return {
        FAITH_CONFIG: FAITH_CONFIG,
        getCharacterFaithData: getCharacterFaithData,
        getFaithAttributeBonus: getFaithAttributeBonus,
        addFaithExp: addFaithExp,
        useFaithResource: useFaithResource,
        gainFaithResource: gainFaithResource,
        unlockSpecialization: unlockSpecialization,
        unlockBreakthroughSkill: unlockBreakthroughSkill,
        performInheritance: performInheritance,
        calculateTotalAttributesWithFaith: calculateTotalAttributesWithFaith,
        hasBreakthroughEffect: hasBreakthroughEffect
    };
}
