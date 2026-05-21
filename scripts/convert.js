/**
 * Excel ↔ JS 配置转换脚本
 *
 * 用法：
 *   node scripts/convert.js          # Excel → JS（默认）
 *   node scripts/convert.js --to-xls # JS → Excel（从现有JS数据生成Excel模板）
 *
 * Excel 表头使用中文，转换时自动映射为英文字段名
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { convertValue } = require('./enum-mappings');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CONFIG_DIR = path.join(ROOT, 'src', 'config');

// ========== 配置定义 ==========

// columns 格式：[英文字段名, 中文表头名]
const CONFIGS = {
    Characters: {
        excelFile: 'Characters.xlsx',
        jsFile: 'CharacterConfig.js',
        objectName: 'Characters',
        columns: [
            ['key', '键名'], ['id', '角色ID'], ['name', '名称'], ['rarity', '稀有度'], ['description', '描述'],
            ['hp', '生命值'], ['hpGrowth', '生命成长'], ['attack', '攻击力'], ['attackGrowth', '攻击成长'],
            ['critRate', '暴击率'], ['critRateGrowth', '暴击率成长'], ['critDamage', '暴击伤害'], ['critDamageGrowth', '暴伤成长'],
            ['mana', '魔力'], ['manaGrowth', '魔力成长'], ['faith', '信仰'], ['faithGrowth', '信仰成长'],
            ['defense', '防御力'], ['defenseGrowth', '防御成长'],
            ['comboThreshold', '连击阈值'], ['comboSpeedBonus', '连击速度加成'], ['comboScoreBonus', '连击分数加成'], ['comboTimeout', '连击超时(ms)']
        ],
        header: `/**
 * 角色配置
 * ⚠️ 此文件由 scripts/convert.js 从 data/Characters.xlsx 自动生成
 * 如需修改数据，请编辑 Excel 文件后运行 npm run convert
 */

`,
        exportLine: 'export { Characters, getCharacterKey };',
        footer: `
function getCharacterKey(charId) {
    var idToKey = {
        'char_001': 'starter',
        'char_002': 'warrior',
        'char_003': 'mage',
        'char_004': 'archer',
        'char_005': 'dragon_knight',
        'char_006': 'goddess',
        'char_007': 'assassin',
        'char_008': 'guardian',
        'char_009': 'summoner',
        'char_010': 'berserker',
        'char_011': 'saint',
        'char_012': 'ninja',
        'char_013': 'priest',
        'char_014': 'paladin',
        'char_015': 'hunter',
        'char_016': 'witch',
        'char_017': 'monk',
        'char_018': 'elementalist',
        'char_019': 'necromancer',
        'char_020': 'chronomancer',
        'char_021': 'wanderer',
        'char_022': 'alchemist',
        'char_023': 'vampire',
        'char_024': 'celestial',
        'char_025': 'void_emperor',
        'char_026': 'stellar_wanderer'
    };
    return idToKey[charId] || charId;
}`
    },
    Equipments: {
        excelFile: 'Equipments.xlsx',
        jsFile: 'EquipmentConfig.js',
        objectName: 'Equipments',
        columns: [
            ['key', '键名'], ['id', '装备ID'], ['name', '名称'], ['type', '类型'], ['rarity', '稀有度'], ['description', '描述'], ['emoji', '图标'],
            ['attack', '攻击力'], ['defense', '防御力'], ['hp', '生命值'], ['critRate', '暴击率'], ['critDamage', '暴击伤害'],
            ['lifestealRate', '吸血比例'], ['evasion', '闪避值'], ['special', '特殊效果'],
            ['vanishChance', '隐身概率'], ['vanishDuration', '隐身时长(秒)'], ['hpPerKill', '击杀回血'], ['critHealHp', '暴击回血']
        ],
        header: `/**
 * 装备配置 — 文物主题
 * ⚠️ 此文件由 scripts/convert.js 从 data/Equipments.xlsx 自动生成
 * 如需修改数据，请编辑 Excel 文件后运行 npm run convert
 */

const EquipmentTypes = {
    WEAPON: 'weapon',      // 武器
    ARMOR: 'armor',        // 护甲
    ACCESSORY: 'accessory', // 饰品
    SET: 'set'             // 套装
};

const EquipmentRarity = {
    UNCOMMON: 'UC',     // 粗品
    COMMON: 'N',        // 凡品
    RARE: 'R',          // 良品
    EPIC: 'SR',         // 珍品
    LEGENDARY: 'SSR',   // 瑰宝
    MYTHIC: 'UR',       // 国宝
    LEGEND_RARE: 'LR',  // 传世
    SPECIAL: 'SP'       // 镇馆之宝
};

`,
        exportLine: 'export { EquipmentTypes, EquipmentRarity, Equipments };'
    },
    Skills: {
        excelFile: 'Skills.xlsx',
        jsFile: 'SkillConfig.js',
        objectName: 'Skills',
        columns: [
            ['key', '键名'], ['id', '技能ID'], ['name', '名称'], ['type', '类型'], ['rarity', '稀有度'], ['cooldown', '冷却(ms)'], ['description', '描述'], ['emoji', '图标'], ['effect', '效果描述'],
            ['damage', '伤害值'], ['lifesteal', '吸血比例'],
            ['heal', '治疗量'], ['shield', '护盾值'], ['immunity', '免疫效果'], ['speedBoost', '速度提升'], ['duration', '持续时间(ms)'],
            ['goldBonus', '金币加成'], ['timeAdd', '增加秒数'],
            ['attack', '攻击力加成'], ['critRate', '暴击率加成'], ['critDamage', '暴伤加成'], ['defense', '防御力加成'],
            ['revive', '复活效果'], ['healPercent', '百分比治疗'],
            ['expBonus', '经验加成'], ['hp', '生命加成'], ['comboBonus', '连击加成'], ['dropRate', '掉落率加成'], ['starScoreBonus', '灵辉加成'], ['evasion', '闪避加成']
        ],
        header: `/**
 * 技能配置 — 灵光技能体系（唤灵人战斗技能）
 * ⚠️ 此文件由 scripts/convert.js 从 data/Skills.xlsx 自动生成
 * 如需修改数据，请编辑 Excel 文件后运行 npm run convert
 */

import { EquipmentRarity } from './EquipmentConfig.js';

const SkillTypes = {
    ATTACK: 'attack',   // 攻击灵光
    SUPPORT: 'support', // 辅助灵光
    PASSIVE: 'passive'  // 被动灵光
};

`,
        exportLine: 'export { SkillTypes, Skills };',
        footer: `

// 技能伤害百分比化：稀有度 → attackRatio
function getSkillAttackRatio(rarity) {
    var map = {
        'UC': 0.4,
        'N': 0.7,
        'R': 1.0,
        'SR': 2.5,
        'SSR': 4.0,
        'UR': 10.0,
        'LR': 15.0,
        'SP': 6.0
    };
    return map[rarity] || 1.0;
}

export { getSkillAttackRatio };`
    },
    Pets: {
        excelFile: 'Pets.xlsx',
        jsFile: 'PetConfig.js',
        objectName: 'Pets',
        columns: [
            ['key', '键名'], ['id', '宠物ID'], ['name', '名称'], ['rarity', '稀有度'], ['attack', '攻击力'], ['attackSpeed', '攻击间隔(ms)'],
            ['description', '描述'], ['emoji', '图标'], ['skill', '技能标识'], ['price', '价格'],
            ['critRate', '暴击率'], ['critDamage', '暴击伤害'], ['healAmount', '治疗量'],
            ['defense', '防御力'], ['hp', '生命值'], ['evasion', '闪避值'],
            ['stunChance', '眩晕概率'], ['stunDuration', '眩晕时长(ms)'],
            ['healChance', '治疗触发概率'], ['vanishChance', '隐身概率'], ['vanishDuration', '隐身时长(ms)'], ['damageMultiplier', '伤害倍率']
        ],
        header: `/**
 * 灵兽配置
 * ⚠️ 此文件由 scripts/convert.js 从 data/Pets.xlsx 自动生成
 * 如需修改数据，请编辑 Excel 文件后运行 npm run convert
 */

const PetRarity = {
    UNCOMMON: 'UC',     // 粗品
    COMMON: 'N',        // 凡品
    RARE: 'R',          // 良品
    EPIC: 'SR',         // 珍品
    LEGENDARY: 'SSR',   // 瑰宝
    MYTHIC: 'UR',       // 国宝
    LEGEND_RARE: 'LR',  // 传世
    SPECIAL: 'SP'       // 镇馆之宝
};

`,
        exportLine: 'export { PetRarity, Pets };'
    }
};

// ========== 工具函数 ==========

// 获取英文字段名列表
function getEnglishColumns(config) {
    return config.columns.map(function(col) { return col[0]; });
}

// 获取中文表头列表
function getChineseHeaders(config) {
    return config.columns.map(function(col) { return col[1]; });
}

// 中文表头 → 英文字段名 映射
function buildHeaderMap(config) {
    var map = {};
    config.columns.forEach(function(col) {
        map[col[1]] = col[0]; // 中文 → 英文
    });
    return map;
}

// ========== Excel → JS ==========

function excelToJS(configName) {
    const config = CONFIGS[configName];
    const excelPath = path.join(DATA_DIR, config.excelFile);

    if (!fs.existsSync(excelPath)) {
        console.log('跳过 ' + configName + '：Excel 文件不存在 (' + config.excelFile + ')');
        return false;
    }

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
        console.log('跳过 ' + configName + '：Excel 无数据行');
        return false;
    }

    // 构建中文→英文映射
    const headerMap = buildHeaderMap(config);
    const englishColumns = getEnglishColumns(config);

    // 生成 JS 内容
    let js = config.header;
    js += '// ' + config.objectName + '\n';
    js += 'const ' + config.objectName + ' = {\n';

    rows.forEach(function(row, index) {
        // 从中文表头行中读取 key（支持中文和英文两种表头）
        let key = row['键名'] || row['key'];
        if (!key) return;

        const fields = [];
        englishColumns.forEach(function(col) {
            if (col === 'key') return; // key 不作为字段输出

            // 尝试中文和英文两种列名
            const chineseHeader = config.columns.find(function(c) { return c[0] === col; });
            const value = row[chineseHeader[1]] !== undefined && row[chineseHeader[1]] !== '' ? row[chineseHeader[1]] : row[col];
            if (value === undefined || value === null || value === '') return;

            const jsValue = convertValue(configName, col, value);
            if (jsValue !== null) {
                fields.push(col + ': ' + jsValue);
            }
        });

        const comma = index < rows.length - 1 ? ',' : '';
        js += '    ' + key + ': { ' + fields.join(', ') + ' }' + comma + '\n';
    });

    js += '};\n\n';
    if (config.footer) {
        js += config.footer + '\n\n';
    }
    js += config.exportLine + '\n';

    // 写入文件
    const jsPath = path.join(CONFIG_DIR, config.jsFile);
    fs.writeFileSync(jsPath, js, 'utf-8');
    console.log('✅ ' + configName + ' → ' + config.jsFile + ' (' + rows.length + ' 条)');
    return true;
}

// ========== JS → Excel（生成模板） ==========

function jsToExcel(configName) {
    const config = CONFIGS[configName];
    const jsPath = path.join(CONFIG_DIR, config.jsFile);

    if (!fs.existsSync(jsPath)) {
        console.log('跳过 ' + configName + '：JS 文件不存在');
        return false;
    }

    // 读取现有 JS 文件，用 eval 解析对象数据
    let jsContent = fs.readFileSync(jsPath, 'utf-8');

    // 提取导出的对象数据
    const objectName = config.objectName;

    // 处理枚举引用：替换为原始值
    jsContent = jsContent.replace(/EquipmentTypes\.WEAPON/g, "'weapon'");
    jsContent = jsContent.replace(/EquipmentTypes\.ARMOR/g, "'armor'");
    jsContent = jsContent.replace(/EquipmentTypes\.ACCESSORY/g, "'accessory'");
    jsContent = jsContent.replace(/EquipmentTypes\.SET/g, "'set'");
    jsContent = jsContent.replace(/EquipmentRarity\.UNCOMMON/g, "'UC'");
    jsContent = jsContent.replace(/EquipmentRarity\.COMMON/g, "'N'");
    jsContent = jsContent.replace(/EquipmentRarity\.RARE/g, "'R'");
    jsContent = jsContent.replace(/EquipmentRarity\.EPIC/g, "'SR'");
    jsContent = jsContent.replace(/EquipmentRarity\.LEGENDARY/g, "'SSR'");
    jsContent = jsContent.replace(/EquipmentRarity\.MYTHIC/g, "'UR'");
    jsContent = jsContent.replace(/EquipmentRarity\.LEGEND_RARE/g, "'LR'");
    jsContent = jsContent.replace(/EquipmentRarity\.SPECIAL/g, "'SP'");
    jsContent = jsContent.replace(/SkillTypes\.ATTACK/g, "'attack'");
    jsContent = jsContent.replace(/SkillTypes\.SUPPORT/g, "'support'");
    jsContent = jsContent.replace(/SkillTypes\.PASSIVE/g, "'passive'");
    jsContent = jsContent.replace(/PetRarity\.UNCOMMON/g, "'UC'");
    jsContent = jsContent.replace(/PetRarity\.COMMON/g, "'N'");
    jsContent = jsContent.replace(/PetRarity\.RARE/g, "'R'");
    jsContent = jsContent.replace(/PetRarity\.EPIC/g, "'SR'");
    jsContent = jsContent.replace(/PetRarity\.LEGENDARY/g, "'SSR'");
    jsContent = jsContent.replace(/PetRarity\.MYTHIC/g, "'UR'");
    jsContent = jsContent.replace(/PetRarity\.LEGEND_RARE/g, "'LR'");
    jsContent = jsContent.replace(/PetRarity\.SPECIAL/g, "'SP'");

    // 移除 import 语句（不能 eval）
    jsContent = jsContent.replace(/import .* from .*;\n/g, '');
    // 移除 export 语句
    jsContent = jsContent.replace(/export \{.*\};?\n?/g, '');
    // 移除 const EquipmentTypes/EquipmentRarity/SkillTypes/PetRarity 定义
    jsContent = jsContent.replace(/const EquipmentTypes = \{[\s\S]*?\};\n/g, '');
    jsContent = jsContent.replace(/const EquipmentRarity = \{[\s\S]*?\};\n/g, '');
    jsContent = jsContent.replace(/const SkillTypes = \{[\s\S]*?\};\n/g, '');
    jsContent = jsContent.replace(/const PetRarity = \{[\s\S]*?\};\n/g, '');

    // 解析对象
    var dataObj;
    try {
        var fn = new Function('return ' + jsContent.match(new RegExp('const ' + objectName + ' = ([\\s\\S]*?\\n});'))[1]);
        dataObj = fn();
    } catch (e) {
        console.log('❌ ' + configName + '：解析 JS 失败 - ' + e.message);
        return false;
    }

    // 转为行数据（使用中文表头）
    var chineseHeaders = getChineseHeaders(config);
    var englishColumns = getEnglishColumns(config);
    var rows = [];

    Object.keys(dataObj).forEach(function(key) {
        var item = dataObj[key];
        var row = {};
        englishColumns.forEach(function(col, index) {
            var chineseName = chineseHeaders[index];
            if (col === 'key') {
                row[chineseName] = key;
            } else if (item[col] !== undefined) {
                row[chineseName] = item[col];
            }
        });
        rows.push(row);
    });

    // 创建 Excel（使用中文表头）
    var ws = XLSX.utils.json_to_sheet(rows, { header: chineseHeaders });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, configName);

    var excelPath = path.join(DATA_DIR, config.excelFile);
    XLSX.writeFile(wb, excelPath);
    console.log('✅ ' + config.jsFile + ' → ' + config.excelFile + ' (' + rows.length + ' 条)');
    return true;
}

// ========== 主入口 ==========

var mode = process.argv[2] || '--to-js';
var configNames = Object.keys(CONFIGS);

if (mode === '--to-xls') {
    console.log('从 JS 生成 Excel 模板（中文表头）...\n');
    configNames.forEach(function(name) { jsToExcel(name); });
    console.log('\n完成！Excel 文件在 data/ 目录');
} else {
    console.log('从 Excel 生成 JS 配置...\n');
    var changed = 0;
    configNames.forEach(function(name) {
        if (excelToJS(name)) changed++;
    });
    console.log('\n完成！更新了 ' + changed + ' 个配置文件');
}
