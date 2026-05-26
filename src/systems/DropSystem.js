import Logger from '../utils/Logger.js';
/**
 * 掉落系统（Drop System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

function createDropSystem(deps) {
    // 依赖注入
    var getSaveData = deps.getSaveData;
    var getScore = deps.getScore;
    var getEquipments = deps.getEquipments;
    var getSkills = deps.getSkills;
    var getPets = deps.getPets;
    var getStarChestDropRate = deps.getStarChestDropRate;
    var saveData = deps.saveData;
    var addMessage = deps.addMessage;

    // ==================== 内部函数 ====================

    function dropMaterial() {
        var pd = getSaveData();
        // 确保 materials 对象存在
        if (!pd.materials) {
            pd.materials = {
                iceCrystal: { quantity: 0, usedCount: 0 },
                fireSource: { quantity: 0, usedCount: 0 },
                critCrystal: { quantity: 0, usedCount: 0 },
                critFireSource: { quantity: 0, usedCount: 0 },
                timeCrystal: { quantity: 0, usedCount: 0 }
            };
        }
        // 2000分后掉落火灵源，否则掉落水灵晶
        var isEnhanced = getScore() >= 2000;
        var dropRate = Math.random();
        var srDropRate = Math.random();

        // 首次净化守护灵必掉水灵暴晶
        if (!pd.firstBossKilled) {
            pd.firstBossKilled = true;
            if (!pd.materials['critCrystal']) {
                pd.materials['critCrystal'] = { quantity: 0, usedCount: 0 };
            }
            pd.materials['critCrystal'].quantity++;
            Logger.info('首次净化守护灵! 必掉水灵暴晶!');
            addMessage('首次净化守护灵！获得水灵暴晶!', '#FF9ECF', true);
            saveData();
            return;
        }

        // Boss有0.8%概率掉落火灵爆源（独立概率）
        if (srDropRate < 0.008) {
            if (!pd.materials['critFireSource']) {
                pd.materials['critFireSource'] = { quantity: 0, usedCount: 0 };
            }
            pd.materials['critFireSource'].quantity++;
            Logger.info('掉落火灵爆源!');
            addMessage('获得火灵爆源!', '#FF9ECF', true);
            saveData();
            return;
        }

        // 0.8% 几率掉落水灵暴晶
        if (dropRate < 0.008) {
            if (!pd.materials['critCrystal']) {
                pd.materials['critCrystal'] = { quantity: 0, usedCount: 0 };
            }
            pd.materials['critCrystal'].quantity++;
            Logger.info('掉落水灵暴晶!');
            addMessage('获得水灵暴晶!', '#00ccff', true);
        } else if (isEnhanced) {
            // 2000分后掉落火灵源
            if (!pd.materials['fireSource']) {
                pd.materials['fireSource'] = { quantity: 0, usedCount: 0 };
            }
            pd.materials['fireSource'].quantity++;
            Logger.info('掉落火灵源!');
            addMessage('获得火灵源!', '#ff6b6b', true);
        } else {
            // 2000分前掉落水灵晶
            if (!pd.materials['iceCrystal']) {
                pd.materials['iceCrystal'] = { quantity: 0, usedCount: 0 };
            }
            pd.materials['iceCrystal'].quantity++;
            Logger.info('掉落水灵晶!');
            addMessage('获得水灵晶!', '#00ccff', true);
        }

        // 星辉宝箱掉落
        var chestDropRate = Math.random();
        if (chestDropRate < getStarChestDropRate()) {
            if (!pd.items) {
                pd.items = {
                    starChest: { quantity: 0 },
                    healPotion: { quantity: 0 },
                    timePotion: { quantity: 0 },
                    expPotionSmall: { quantity: 0 },
                    expPotionMedium: { quantity: 0 },
                    expPotionLarge: { quantity: 0 }
                };
            }
            if (!pd.items.starChest) {
                pd.items.starChest = { quantity: 0 };
            }
            pd.items.starChest.quantity++;
            addMessage('获得星辉宝箱!', '#FF9ECF', true);
        }

        saveData();
    }

    function dropEquipment(isBoss) {
        var pd = getSaveData();
        var Equipments = getEquipments();

        // 初始化装备数据
        if (!pd.equipments) {
            pd.equipments = { owned: [], equipped: { weapon: null, armor: null, accessory: null, set: null } };
        }
        if (!pd.equipments.owned) {
            pd.equipments.owned = [];
        }

        // 根据是否为Boss决定掉落品质
        var equipmentIds = Object.keys(Equipments);
        var rarityRoll = Math.random();
        var targetRarity;

        if (isBoss) {
            if (rarityRoll < 0.00001) targetRarity = 'SP';       // 0.001%
            else if (rarityRoll < 0.00011) targetRarity = 'LR';  // 0.001%~0.01%
            else if (rarityRoll < 0.1) targetRarity = 'SSR';
            else if (rarityRoll < 0.35) targetRarity = 'SR';
            else if (rarityRoll < 0.7) targetRarity = 'R';
            else if (rarityRoll < 0.85) targetRarity = 'N';
            else targetRarity = 'UC';
        } else {
            if (rarityRoll < 0.02) targetRarity = 'SR';
            else if (rarityRoll < 0.15) targetRarity = 'R';
            else if (rarityRoll < 0.4) targetRarity = 'N';
            else targetRarity = 'UC';
        }

        // 筛选符合品质的装备
        var candidates = equipmentIds.filter(function(id) { return Equipments[id].rarity === targetRarity; });
        if (candidates.length === 0) {
            candidates = equipmentIds.filter(function(id) { return Equipments[id].rarity === 'N'; });
        }

        // 随机选择一个装备
        var equipId = candidates[Math.floor(Math.random() * candidates.length)];
        var equip = Equipments[equipId];

        // 添加到背包
        pd.equipments.owned.push({
            id: equipId,
            rarity: equip.rarity,
            level: 1
        });

        Logger.info('掉落装备:', equip.name);
        var rarityColors = { 'UC': '#7CCD7C', 'N': '#aaaaaa', 'R': '#4A90D9', 'SR': '#9B59B6', 'SSR': '#FFD700', 'UR': '#E74C3C', 'LR': '#FF6B9D', 'SP': '#00D4FF' };
        addMessage('获得装备: ' + equip.emoji + equip.name, rarityColors[equip.rarity] || '#ffcc00', true);
        saveData();
    }

    function dropSkill() {
        var pd = getSaveData();
        var Skills = getSkills();

        // 初始化技能数据
        if (!pd.skills) {
            pd.skills = { owned: [], equipped: [], gachaTickets: 0 };
        }
        if (!pd.skills.owned) {
            pd.skills.owned = [];
        }

        var skillIds = Object.keys(Skills);
        var rarityRoll = Math.random();
        var targetRarity;

        if (rarityRoll < 0.02) targetRarity = 'SSR';
        else if (rarityRoll < 0.1) targetRarity = 'SR';
        else if (rarityRoll < 0.3) targetRarity = 'R';
        else targetRarity = 'N';

        // 筛选符合品质的技能
        var candidates = skillIds.filter(function(id) { return Skills[id].rarity === targetRarity; });
        if (candidates.length === 0) {
            candidates = skillIds.filter(function(id) { return Skills[id].rarity === 'R'; });
        }

        // 随机选择一个技能
        var skillId = candidates[Math.floor(Math.random() * candidates.length)];
        var skill = Skills[skillId];

        // 添加到背包
        pd.skills.owned.push({
            id: skillId,
            level: 1
        });

        Logger.info('掉落技能:', skill.name);
        var rarityColors = { 'UC': '#7CCD7C', 'N': '#aaaaaa', 'R': '#4A90D9', 'SR': '#9B59B6', 'SSR': '#FFD700', 'UR': '#E74C3C', 'LR': '#FF6B9D', 'SP': '#00D4FF' };
        addMessage('获得技能: ' + skill.emoji + skill.name, rarityColors[skill.rarity] || '#FF9ECF', true);
        saveData();
    }

    function dropPet(isBoss) {
        var pd = getSaveData();
        var Pets = getPets();

        // 初始化宠物数据
        if (!pd.pets) {
            pd.pets = { owned: [], equipped: null };
        }
        if (!pd.pets.owned) {
            pd.pets.owned = [];
        }

        var petIds = Object.keys(Pets);
        var rarityRoll = Math.random();
        var targetRarity;

        if (isBoss) {
            if (rarityRoll < 0.00001) targetRarity = 'SP';       // 0.001%
            else if (rarityRoll < 0.00011) targetRarity = 'LR';  // 0.001%~0.01%
            else if (rarityRoll < 0.005) targetRarity = 'UR';
            else if (rarityRoll < 0.02) targetRarity = 'SSR';
            else if (rarityRoll < 0.08) targetRarity = 'SR';
            else if (rarityRoll < 0.25) targetRarity = 'R';
            else if (rarityRoll < 0.6) targetRarity = 'N';
            else targetRarity = 'UC';
        } else {
            if (rarityRoll < 0.003) targetRarity = 'SR';
            else if (rarityRoll < 0.04) targetRarity = 'R';
            else if (rarityRoll < 0.3) targetRarity = 'N';
            else targetRarity = 'UC';
        }

        // 筛选符合品质的宠物
        var candidates = petIds.filter(function(id) { return Pets[id].rarity === targetRarity; });
        if (candidates.length === 0) {
            candidates = petIds.filter(function(id) { return Pets[id].rarity === 'N'; });
        }

        // 随机选择一个宠物
        var petId = candidates[Math.floor(Math.random() * candidates.length)];
        var pet = Pets[petId];

        // 添加到背包
        pd.pets.owned.push({
            id: petId,
            level: 1,
            exp: 0
        });

        Logger.info('掉落宠物:', pet.name);
        var rarityColors = { 'UC': '#7CCD7C', 'N': '#aaaaaa', 'R': '#4A90D9', 'SR': '#9B59B6', 'SSR': '#FFD700', 'UR': '#E74C3C', 'LR': '#FF6B9D', 'SP': '#00D4FF' };
        addMessage('获得宠物: ' + pet.emoji + pet.name, rarityColors[pet.rarity] || (isBoss ? '#FF9ECF' : '#ffcc00'), true);
        saveData();
    }

    // ==================== 公共 API ====================

    return {
        dropMaterial: dropMaterial,
        dropEquipment: dropEquipment,
        dropSkill: dropSkill,
        dropPet: dropPet
    };
}

export { createDropSystem };
