/**
 * 枚举映射表
 * Excel 中存储原始值（如 'weapon', 'N'），转换时映射为 JS 枚举引用
 */

// 装备类型映射：Excel值 → JS枚举引用
const equipmentTypeMap = {
    'weapon': 'EquipmentTypes.WEAPON',
    'armor': 'EquipmentTypes.ARMOR',
    'accessory': 'EquipmentTypes.ACCESSORY',
    'set': 'EquipmentTypes.SET'
};

// 装备稀有度映射（也用于 SkillConfig 的 rarity）
const equipmentRarityMap = {
    'UC': 'EquipmentRarity.UNCOMMON',
    'N': 'EquipmentRarity.COMMON',
    'R': 'EquipmentRarity.RARE',
    'SR': 'EquipmentRarity.EPIC',
    'SSR': 'EquipmentRarity.LEGENDARY',
    'UR': 'EquipmentRarity.MYTHIC',
    'LR': 'EquipmentRarity.LEGEND_RARE',
    'SP': 'EquipmentRarity.SPECIAL'
};

// 技能类型映射
const skillTypeMap = {
    'attack': 'SkillTypes.ATTACK',
    'support': 'SkillTypes.SUPPORT',
    'passive': 'SkillTypes.PASSIVE'
};

// 宠物稀有度映射
const petRarityMap = {
    'UC': 'PetRarity.UNCOMMON',
    'N': 'PetRarity.COMMON',
    'R': 'PetRarity.RARE',
    'SR': 'PetRarity.EPIC',
    'SSR': 'PetRarity.LEGENDARY',
    'UR': 'PetRarity.MYTHIC',
    'LR': 'PetRarity.LEGEND_RARE',
    'SP': 'PetRarity.SPECIAL'
};

// 角色稀有度映射（直接用字符串值，不用枚举）
// CharacterConfig 中 rarity 是直接字符串 'N', 'R', 'SR', 'SSR', 'UR'

/**
 * 根据配置名和字段名，将 Excel 值转换为 JS 代码字符串
 * @param {string} configName - 配置名（Characters/Equipments/Skills/Pets）
 * @param {string} field - 字段名
 * @param {*} value - Excel 中的值
 * @returns {string} JS 代码中的值表示
 */
function convertValue(configName, field, value) {
    if (value === undefined || value === null || value === '') {
        return null; // 空单元格，不输出该字段
    }

    // 布尔值处理
    if (value === true || value === 'true') return 'true';
    if (value === false || value === 'false') return 'false';

    // 枚举字段映射
    if (configName === 'Equipments') {
        if (field === 'type') return equipmentTypeMap[value] || "'" + value + "'";
        if (field === 'rarity') return equipmentRarityMap[value] || "'" + value + "'";
    }
    if (configName === 'Skills') {
        if (field === 'type') return skillTypeMap[value] || "'" + value + "'";
        if (field === 'rarity') return equipmentRarityMap[value] || "'" + value + "'";
    }
    if (configName === 'Pets') {
        if (field === 'rarity') return petRarityMap[value] || "'" + value + "'";
    }

    // 数值类型判断
    if (typeof value === 'number') {
        return String(value);
    }

    // 字符串类型
    return "'" + String(value).replace(/'/g, "\\'") + "'";
}

module.exports = { convertValue, equipmentTypeMap, equipmentRarityMap, skillTypeMap, petRarityMap };
