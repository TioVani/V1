/**
 * 怪物技能系统（Monster Skill System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

// 怪物技能类型枚举（导出供外部使用）
var MonsterSkillType = {
    ABSORB: 'absorb',
    STUN: 'stun',
    SPLIT: 'split',
    SUMMON: 'summon',
    RAGE: 'rage',
    SHIELD: 'shield',
    DODGE: 'dodge',
    REFLECT: 'reflect',
    POISON: 'poison',
    HEAL: 'heal',
    DOUBLE_ATTACK: 'doubleAtk',
    ARMOR: 'armor',
    POISON_SPLIT: 'poison_split'
};

function createMonsterSkillSystem(deps) {
    // 依赖注入
    var getCtx = deps.getCtx;

    // ==================== 内部状态 ====================
    var monsterSkillAnimations = [];

    // ==================== 核心方法 ====================

    /**
     * 触发怪物技能
     */
    function triggerMonsterSkill(monster, skillType, context) {
        if (!context) context = {};
        var skills = monster.skills || [];
        var skill = null;
        for (let si = 0; si < skills.length; si++) {
            if (skills[si].type === skillType) {
                skill = skills[si];
                break;
            }
        }
        if (!skill) return null;

        var result = { triggered: false, effect: null };

        switch (skillType) {
            case MonsterSkillType.ABSORB:
                if (context.starType && (skill.starType === 'all' || skill.starType === context.starType)) {
                    if (Math.random() < skill.ratio) {
                        var healAmount = Math.floor(context.damage * skill.healRate);
                        monster.hp = Math.min(monster.hp + healAmount, monster.maxHp);
                        result.triggered = true;
                        result.effect = { type: 'absorb', heal: healAmount, starType: context.starType };
                        addMonsterSkillAnimation(monster, 'absorb', '+' + healAmount + ' HP');
                    }
                }
                break;

            case MonsterSkillType.STUN:
                if (Math.random() < skill.chance) {
                    result.triggered = true;
                    result.effect = { type: 'stun', duration: skill.duration };
                    if (context.onStun) context.onStun(skill.duration);
                    addMonsterSkillAnimation(monster, 'stun', '打断!');
                }
                break;

            case MonsterSkillType.SPLIT:
                if (!monster.hasSplit && monster.hp <= monster.maxHp * skill.hpThreshold) {
                    monster.hasSplit = true;
                    result.triggered = true;
                    result.effect = { type: 'split', monster: skill.splitInto, count: skill.count };
                    addMonsterSkillAnimation(monster, 'split', '分裂!');
                }
                break;

            case MonsterSkillType.SUMMON:
                var now = Date.now();
                if (!monster.skillStates.lastSummon || now - monster.skillStates.lastSummon >= skill.interval) {
                    monster.skillStates.lastSummon = now;
                    result.triggered = true;
                    result.effect = { type: 'summon', monster: skill.monster, count: skill.count };
                    addMonsterSkillAnimation(monster, 'summon', '召唤' + skill.count + '只');
                }
                break;

            case MonsterSkillType.RAGE:
                if (!monster.hasRaged && monster.hp <= monster.maxHp * skill.hpThreshold) {
                    monster.hasRaged = true;
                    monster.rageMultiplier = skill.attackBonus;
                    result.triggered = true;
                    result.effect = { type: 'rage', attackBonus: skill.attackBonus };
                    addMonsterSkillAnimation(monster, 'rage', '狂暴!');
                }
                break;

            case MonsterSkillType.SHIELD:
                var shieldNow = Date.now();
                if (!monster.skillStates.lastShield || shieldNow - monster.skillStates.lastShield >= skill.interval) {
                    monster.skillStates.lastShield = shieldNow;
                    monster.shield = (monster.shield || 0) + skill.amount;
                    result.triggered = true;
                    result.effect = { type: 'shield', amount: skill.amount };
                    addMonsterSkillAnimation(monster, 'shield', '+' + skill.amount + '护盾');
                }
                break;

            case MonsterSkillType.DODGE:
                if (Math.random() < skill.chance) {
                    result.triggered = true;
                    result.effect = { type: 'dodge' };
                    addMonsterSkillAnimation(monster, 'dodge', '闪避!');
                }
                break;

            case MonsterSkillType.REFLECT:
                if (context.damage > 0) {
                    var reflectDamage = Math.floor(context.damage * skill.ratio);
                    result.triggered = true;
                    result.effect = { type: 'reflect', damage: reflectDamage };
                    addMonsterSkillAnimation(monster, 'reflect', '反弹' + reflectDamage);
                }
                break;

            case MonsterSkillType.DOUBLE_ATTACK:
                if (Math.random() < skill.chance) {
                    result.triggered = true;
                    result.effect = { type: 'doubleAttack' };
                    addMonsterSkillAnimation(monster, 'doubleAttack', '连击!');
                }
                break;

            case MonsterSkillType.ARMOR:
                result.triggered = true;
                result.effect = { type: 'armor', reduction: skill.reduction };
                break;

            case MonsterSkillType.POISON_SPLIT:
                result.triggered = true;
                result.effect = {
                    type: 'poison_split',
                    hpThreshold: skill.hpThreshold,
                    damage: skill.damage,
                    poisonDuration: skill.poisonDuration,
                    poisonDamage: skill.poisonDamage,
                    puddleCount: skill.puddleCount,
                    puddleRadius: skill.puddleRadius
                };
                break;

            case MonsterSkillType.POISON:
                result.triggered = true;
                result.effect = { type: 'poison', damage: skill.damage, duration: skill.duration };
                break;

            case MonsterSkillType.HEAL:
                var healNow = Date.now();
                if (!monster.skillStates.lastHeal || healNow - monster.skillStates.lastHeal >= skill.interval) {
                    monster.skillStates.lastHeal = healNow;
                    var healAmt = Math.min(skill.amount, monster.maxHp - monster.hp);
                    if (healAmt > 0) {
                        monster.hp += healAmt;
                        result.triggered = true;
                        result.effect = { type: 'heal', amount: healAmt };
                        addMonsterSkillAnimation(monster, 'heal', '+' + healAmt + ' HP');
                    }
                }
                break;
        }

        return result;
    }

    /**
     * 计算怪物对玩家的伤害（考虑技能）
     */
    function calculateMonsterDamage(monster) {
        var damage = monster.attack;

        // 狂暴加成
        if (monster.rageMultiplier) {
            damage = Math.floor(damage * monster.rageMultiplier);
        }

        // 连击检查
        var doubleResult = triggerMonsterSkill(monster, MonsterSkillType.DOUBLE_ATTACK);
        if (doubleResult && doubleResult.triggered) {
            damage *= 2;
        }

        return damage;
    }

    /**
     * 计算玩家对怪物的伤害（考虑技能）
     */
    function calculateDamageToMonster(monster, baseDamage, starType) {
        if (!starType) starType = 'normal';
        var damage = baseDamage;
        var absorbed = false;
        var dodged = false;
        var reflected = 0;

        // 检查闪避
        var dodgeResult = triggerMonsterSkill(monster, MonsterSkillType.DODGE);
        if (dodgeResult && dodgeResult.triggered) {
            return { damage: 0, absorbed: false, dodged: true, reflected: 0 };
        }

        // 检查吸收
        var absorbResult = triggerMonsterSkill(monster, MonsterSkillType.ABSORB, {
            starType: starType,
            damage: baseDamage
        });
        if (absorbResult && absorbResult.triggered) {
            absorbed = true;
        }

        // 检查护甲减伤
        var armorSkill = null;
        if (monster.skills) {
            for (let ai = 0; ai < monster.skills.length; ai++) {
                if (monster.skills[ai].type === MonsterSkillType.ARMOR) {
                    armorSkill = monster.skills[ai];
                    break;
                }
            }
        }
        if (armorSkill) {
            damage = Math.floor(damage * (1 - armorSkill.reduction));
        }

        // 检查护盾
        if (monster.shield > 0) {
            var shieldAbsorb = Math.min(monster.shield, damage);
            monster.shield -= shieldAbsorb;
            damage -= shieldAbsorb;
        }

        // 检查反弹
        var reflectResult = triggerMonsterSkill(monster, MonsterSkillType.REFLECT, { damage: baseDamage });
        if (reflectResult && reflectResult.triggered) {
            reflected = reflectResult.effect.damage;
        }

        return { damage: Math.max(0, damage), absorbed: absorbed, dodged: false, reflected: reflected };
    }

    /**
     * 添加怪物技能动画
     */
    function addMonsterSkillAnimation(monster, skillType, text) {
        monsterSkillAnimations.push({
            monster: monster,
            skillType: skillType,
            text: text,
            alpha: 1.0,
            y: 0,
            startTime: Date.now()
        });
    }

    /**
     * 更新怪物技能动画
     */
    function updateMonsterSkillAnimations() {
        var now = Date.now();
        for (let i = monsterSkillAnimations.length - 1; i >= 0; i--) {
            var anim = monsterSkillAnimations[i];
            var elapsed = now - anim.startTime;

            // 动画持续1秒
            if (elapsed > 1000) {
                monsterSkillAnimations.splice(i, 1);
                continue;
            }

            // 上飘效果
            anim.y = elapsed * 0.05;
            // 渐隐
            anim.alpha = 1 - (elapsed / 1000);
        }
    }

    /**
     * 绘制怪物技能动画
     */
    function drawMonsterSkillAnimations(scale, monsterX, monsterY, targetMonster) {
        var ctx = getCtx();
        ctx.save();

        for (let i = 0; i < monsterSkillAnimations.length; i++) {
            var anim = monsterSkillAnimations[i];
            if (anim.monster !== targetMonster) continue;

            var y = monsterY - 50 * scale - anim.y;

            // 根据技能类型选择颜色
            var color = '#FFD700';  // 默认金色
            switch (anim.skillType) {
                case 'absorb': color = '#00FF00'; break;
                case 'stun': color = '#FF0000'; break;
                case 'dodge': color = '#AAAAAA'; break;
                case 'reflect': color = '#FF6600'; break;
                case 'rage': color = '#FF0000'; break;
                case 'shield': color = '#00BFFF'; break;
                case 'heal': color = '#00FF00'; break;
                case 'summon': color = '#9400D3'; break;
                case 'split': color = '#FF69B4'; break;
                case 'poison_split': color = '#00FF00'; break;
            }

            ctx.globalAlpha = anim.alpha;
            ctx.fillStyle = color;
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(anim.text, monsterX, y);

            // 发光效果
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.fillText(anim.text, monsterX, y);
        }

        ctx.restore();
    }

    /**
     * 清空动画（游戏重置时调用）
     */
    function clearAnimations() {
        monsterSkillAnimations = [];
    }

    return {
        MonsterSkillType: MonsterSkillType,
        triggerMonsterSkill: triggerMonsterSkill,
        calculateMonsterDamage: calculateMonsterDamage,
        calculateDamageToMonster: calculateDamageToMonster,
        addMonsterSkillAnimation: addMonsterSkillAnimation,
        updateMonsterSkillAnimations: updateMonsterSkillAnimations,
        drawMonsterSkillAnimations: drawMonsterSkillAnimations,
        clearAnimations: clearAnimations
    };
}

export { MonsterSkillType, createMonsterSkillSystem };
