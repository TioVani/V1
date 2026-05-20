import Logger from '../utils/Logger.js';
/**
 * 角色经验系统（Character System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

// ==================== 配置常量 ====================

const MAX_CHARACTER_LEVEL = 90;

// ==================== 闭包工厂 ====================

function createCharacterSystem(deps) {
    // 依赖注入
    var getPlayerData = deps.getPlayerData;
    var getCharacters = deps.getCharacters;
    var getCharacterKey = deps.getCharacterKey;
    var getEquipments = deps.getEquipments;
    var getSkills = deps.getSkills;
    var getPets = deps.getPets;
    var saveData = deps.saveData;
    var addMessage = deps.addMessage;
    var getGameState = deps.getGameState;
    var getSeasonSelection = deps.getSeasonSelection;

    // ==================== 内部函数 ====================

    function initCharacterExperience(charId) {
        var playerData = getPlayerData();
        // 确保 characterExperience 是对象而不是字符串
        if (typeof playerData.characterExperience !== 'object' || playerData.characterExperience === null) {
            Logger.info('characterExperience 类型错误，重置为对象');
            playerData.characterExperience = {};
        }
        if (!playerData.characterExperience[charId]) {
            playerData.characterExperience[charId] = {
                level: 1,
                exp: 0,
                maxExp: 100
            };
        }
    }

    function getCharacterExperience(charId) {
        var playerData = getPlayerData();
        // 确保 characterExperience 存在且是对象
        if (!playerData.characterExperience || typeof playerData.characterExperience !== 'object') {
            playerData.characterExperience = {};
        }
        if (!playerData.characterExperience[charId]) {
            initCharacterExperience(charId);
        }
        return playerData.characterExperience[charId];
    }

    function getExpForLevel(level) {
        // 经验公式：100 + level × 50
        return 100 + level * 50;
    }

    function addCharacterExperience(charId, exp) {
        var playerData = getPlayerData();
        // 确保 characterExperience 是对象
        if (typeof playerData.characterExperience !== 'object' || playerData.characterExperience === null) {
            Logger.info('characterExperience 类型错误，重置为对象');
            playerData.characterExperience = {};
        }
        if (!playerData.characterExperience[charId]) {
            initCharacterExperience(charId);
        }

        // 应用被动技能的经验加成
        var skillBonuses = getPassiveSkillBonuses();
        var actualExp = Math.floor(exp * skillBonuses.expBonus);

        var charExp = playerData.characterExperience[charId];
        var oldLevel = charExp.level;

        charExp.exp += actualExp;
        if (skillBonuses.expBonus > 1) {
            Logger.info('经验加成:', exp, '->', actualExp, '(x' + skillBonuses.expBonus + ')');
        }

        // 检查是否升级
        while (charExp.exp >= charExp.maxExp && charExp.level < MAX_CHARACTER_LEVEL) {
            charExp.exp -= charExp.maxExp;
            charExp.level++;
            charExp.maxExp = getExpForLevel(charExp.level);

            Logger.info('角色升级!', charId, '等级:', charExp.level);

            addMessage('角色升级! Lv.' + charExp.level, '#ffcc00');
        }

        // 如果满级，将多余经验设置为maxExp
        if (charExp.level >= MAX_CHARACTER_LEVEL) {
            charExp.exp = charExp.maxExp;
        }

        // 如果等级有变化，保存数据
        if (charExp.level !== oldLevel) {
            saveData();
        }
    }

    function getCharacterLevelBonus(charId) {
        var playerData = getPlayerData();
        if (!playerData.characterExperience || !playerData.characterExperience[charId]) {
            return 0;
        }

        var charExp = playerData.characterExperience[charId];
        // 每级增加1点攻击力
        return charExp.level - 1;
    }

    function getCharacterStatsAtLevel(charKey, level) {
        var Characters = getCharacters();
        var character = Characters[charKey];
        if (!character) {
            return { hp: 100, attack: 10, critRate: 5, critDamage: 1.5, mana: 5, faith: 5, defense: 5 };
        }

        var levelBonus = level - 1;
        var fullCycles = Math.floor((level - 1) / 20);
        var remainder = (level - 1) % 20;
        var critRateLevels = fullCycles * 10 + Math.min(remainder, 10);
        var critDamageLevels = levelBonus - critRateLevels;
        var critRateBonus = Math.min((character.critRateGrowth || 0) * critRateLevels, 10);

        return {
            hp: character.hp + (character.hpGrowth || 0) * levelBonus,
            attack: character.attack + (character.attackGrowth || 0) * levelBonus,
            critRate: character.critRate + critRateBonus,
            critDamage: character.critDamage + (character.critDamageGrowth || 0) * critDamageLevels,
            mana: character.mana + (character.manaGrowth || 0) * levelBonus,
            faith: character.faith + (character.faithGrowth || 0) * levelBonus,
            defense: character.defense + (character.defenseGrowth || 0) * levelBonus
        };
    }

    function getCharacterFullStats(charId) {
        var playerData = getPlayerData();
        var Characters = getCharacters();
        var Equipments = getEquipments();
        var Skills = getSkills();
        var Pets = getPets();

        var mappedCharId = getCharacterKey(charId);
        var character = Characters[mappedCharId];

        // 基础属性
        var baseStats = {
            hp: 100,
            attack: 10,
            critRate: 5,
            critDamage: 1.5,
            mana: 5,
            faith: 5,
            defense: 5
        };

        if (!character) {
            return baseStats;
        }

        // 获取角色等级
        var level = 1;
        if (playerData.characterExperience && playerData.characterExperience[charId]) {
            level = playerData.characterExperience[charId].level || 1;
        }

        // 计算等级成长加成
        var levelBonus = level - 1;

        // 暴击率和爆伤交替成长：每10级交替
        var fullCycles = Math.floor((level - 1) / 20);
        var remainder = (level - 1) % 20;
        var critRateLevels = fullCycles * 10 + Math.min(remainder, 10);
        var critDamageLevels = levelBonus - critRateLevels;

        // 暴击率加成上限为10%
        var critRateBonus = Math.min((character.critRateGrowth || 0) * critRateLevels, 10);

        // 角色基础属性
        var stats = {
            hp: character.hp + (character.hpGrowth || 0) * levelBonus,
            attack: character.attack + (character.attackGrowth || 0) * levelBonus,
            critRate: character.critRate + critRateBonus,
            critDamage: character.critDamage + (character.critDamageGrowth || 0) * critDamageLevels,
            mana: character.mana + (character.manaGrowth || 0) * levelBonus,
            faith: character.faith + (character.faithGrowth || 0) * levelBonus,
            defense: character.defense + (character.defenseGrowth || 0) * levelBonus
        };

        // ==================== 装备属性加成 ====================
        if (playerData.equipments && playerData.equipments.equipped) {
            var equipped = playerData.equipments.equipped;
            var ownedList = playerData.equipments.owned || [];

            // 通过instanceId查找装备定义
            function findEquipByInstanceId(instanceId) {
                if (!instanceId) return null;
                for (let k = 0; k < ownedList.length; k++) {
                    var ed = ownedList[k];
                    var iid = ed.uid || ('idx_' + k);
                    if (iid === instanceId) {
                        var ek = typeof ed === 'string' ? ed : (ed.id || ed);
                        return Equipments[ek] || null;
                    }
                }
                // 兼容旧存档
                return Equipments[instanceId] || null;
            }

            var weaponEquip = findEquipByInstanceId(equipped.weapon);
            if (weaponEquip) {
                stats.attack += weaponEquip.attack || 0;
                stats.critRate += weaponEquip.critRate || 0;
                stats.critDamage += weaponEquip.critDamage || 0;
            }

            var armorEquip = findEquipByInstanceId(equipped.armor);
            if (armorEquip) {
                stats.defense += armorEquip.defense || 0;
                stats.hp += armorEquip.hp || 0;
                stats.critRate += armorEquip.critRate || 0;
                stats.critDamage += armorEquip.critDamage || 0;
            }

            var accessoryEquip = findEquipByInstanceId(equipped.accessory);
            if (accessoryEquip) {
                stats.attack += accessoryEquip.attack || 0;
                stats.critRate += accessoryEquip.critRate || 0;
                stats.critDamage += accessoryEquip.critDamage || 0;
            }

            var setEquip = findEquipByInstanceId(equipped.set);
            if (setEquip) {
                stats.attack += setEquip.attack || 0;
                stats.defense += setEquip.defense || 0;
                stats.hp += setEquip.hp || 0;
                stats.critRate += setEquip.critRate || 0;
                stats.critDamage += setEquip.critDamage || 0;
            }
        }

        // ==================== 技能属性加成 ====================
        if (playerData.skills && playerData.skills.equipped) {
            for (let i = 0; i < playerData.skills.equipped.length; i++) {
                var skillId = playerData.skills.equipped[i];
                if (Skills && Skills[skillId]) {
                    var skill = Skills[skillId];
                    if (skill.type === 'passive') {
                        stats.attack += skill.attack || 0;
                        stats.critRate += skill.critRate || 0;
                        stats.critDamage += skill.critDamage || 0;
                        stats.defense += skill.defense || 0;
                        stats.hp += skill.hp || 0;
                    }
                }
            }
        }

        // ==================== 宠物属性加成 ====================
        if (playerData.pets && playerData.pets.equipped) {
            var petUid = playerData.pets.equipped;
            var equippedPet = null;
            // 通过uid查找宠物配置（兼容旧数据）
            if (playerData.pets.owned) {
                for (let pi = 0; pi < playerData.pets.owned.length; pi++) {
                    var pd = playerData.pets.owned[pi];
                    var pdUid = (typeof pd === 'object' && pd.uid) ? pd.uid : ('idx_' + pi);
                    if (pdUid === petUid) {
                        var pdKey = typeof pd === 'string' ? pd : (pd.id || pd);
                        if (Pets && Pets[pdKey]) equippedPet = Pets[pdKey];
                        break;
                    }
                }
            }
            if (!equippedPet && Pets && Pets[petUid]) {
                equippedPet = Pets[petUid]; // 兼容旧数据
            }
            if (equippedPet) {
                stats.attack += equippedPet.attack || 0;
                stats.critRate += equippedPet.critRate || 0;
                stats.critDamage += equippedPet.critDamage || 0;
                stats.defense += equippedPet.defense || 0;
            }
        }

        // ==================== 材料属性加成 ====================
        if (playerData.materials) {
            if (playerData.materials.iceCrystal) {
                stats.attack += playerData.materials.iceCrystal.usedCount || 0;
            }
            if (playerData.materials.fireSource) {
                stats.attack += (playerData.materials.fireSource.usedCount || 0) * 2;
            }
            if (playerData.materials.critCrystal) {
                // 暴击率加成由 extraCritRate 统一计算（MaterialSystem.useMaterial 写入），不重复算 usedCount
            }
            if (playerData.materials.critFireSource) {
                stats.critDamage += (playerData.materials.critFireSource.usedCount || 0) * 0.2;
            }
        }

        // 水灵暴晶额外暴击率（MaterialSystem.useMaterial 写入）
        stats.critRate += playerData.extraCritRate || 0;

        // 火灵爆源额外暴击伤害（MaterialSystem.useMaterial 写入）
        stats.critDamage += playerData.extraCritDamage || 0;

        return stats;
    }

    function getPassiveSkillBonuses() {
        var playerData = getPlayerData();
        var Skills = getSkills();

        var bonuses = {
            goldBonus: 1,
            expBonus: 1,
            starScoreBonus: 1,
            comboBonus: 0,
            dropRate: 1
        };

        if (!playerData.skills || !playerData.skills.equipped) {
            return bonuses;
        }

        for (let i = 0; i < playerData.skills.equipped.length; i++) {
            var skillId = playerData.skills.equipped[i];
            if (Skills && Skills[skillId]) {
                var skill = Skills[skillId];
                if (skill.type === 'passive') {
                    if (skill.goldBonus) bonuses.goldBonus *= skill.goldBonus;
                    if (skill.expBonus) bonuses.expBonus *= skill.expBonus;
                    if (skill.starScoreBonus) bonuses.starScoreBonus *= skill.starScoreBonus;
                    if (skill.comboBonus) bonuses.comboBonus += skill.comboBonus;
                    if (skill.dropRate) bonuses.dropRate *= skill.dropRate;
                }
            }
        }

        return bonuses;
    }

    // ==================== 公共 API ====================

    // 获取当前角色配置
    function getCurrentCharacterConfig() {
        var gameState = getGameState();
        var seasonSel = getSeasonSelection();
        var playerD = getPlayerData();
        var chars = getCharacters();

        // 赛季模式使用赛季选择的角色
        if (gameState === 'season_playing' && seasonSel && seasonSel.character) {
            return chars[seasonSel.character] || null;
        }

        var charId = playerD.currentCharacterId;
        if (!charId) return null;

        for (let key in chars) {
            if (chars[key].id === charId) {
                return chars[key];
            }
        }
        return null;
    }

    return {
        initCharacterExperience: initCharacterExperience,
        getCharacterExperience: getCharacterExperience,
        getExpForLevel: getExpForLevel,
        addCharacterExperience: addCharacterExperience,
        getCharacterLevelBonus: getCharacterLevelBonus,
        getCharacterStatsAtLevel: getCharacterStatsAtLevel,
        getCharacterFullStats: getCharacterFullStats,
        getPassiveSkillBonuses: getPassiveSkillBonuses,
        getCurrentCharacterConfig: getCurrentCharacterConfig
    };
}

export { MAX_CHARACTER_LEVEL, createCharacterSystem };
