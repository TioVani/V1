/**
 * 临时脚本：向 Excel 文件追加 UC/LR/SP 新稀有度内容数据
 */
const XLSX = require('xlsx');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// ===== Equipments =====
let wb = XLSX.readFile(path.join(ROOT, 'data', 'Equipments.xlsx'));
let ws = wb.Sheets[wb.SheetNames[0]];
let data = XLSX.utils.sheet_to_json(ws);

data.push(
    { '键名': 'uc_wooden_sword', '装备ID': 'uc_wooden_sword', '名称': '星尘木剑', '类型': 'weapon', '稀有度': 'UC', '描述': '星尘木削成的小剑，比空手好一点', '图标': '🗡️', '攻击力': 3 },
    { '键名': 'uc_cloth_armor', '装备ID': 'uc_cloth_armor', '名称': '星尘布甲', '类型': 'armor', '稀有度': 'UC', '描述': '星尘编织的布甲，轻便柔软', '图标': '👕', '防御力': 3, '生命值': 10 },
    { '键名': 'uc_stone_ring', '装备ID': 'uc_stone_ring', '名称': '星尘石戒', '类型': 'accessory', '稀有度': 'UC', '描述': '星尘石打磨的戒指，微微闪烁', '图标': '💍', '暴击率': 0.5 },
    { '键名': 'lr_cosmic_cleaver', '装备ID': 'lr_cosmic_cleaver', '名称': '宇宙裂断', '类型': 'weapon', '稀有度': 'LR', '描述': '劈开宇宙的至高之刃，暴击时30%溅射伤害', '图标': '⚔️', '攻击力': 140, '暴击率': 25, '暴击伤害': 0.6 },
    { '键名': 'lr_event_horizon', '装备ID': 'lr_event_horizon', '名称': '事件视界', '类型': 'armor', '稀有度': 'LR', '描述': '黑洞边缘的铠甲，受击时10%概率吞噬怪物（Boss无效）', '图标': '🌀', '防御力': 105, '生命值': 330 },
    { '键名': 'lr_nova_core', '装备ID': 'lr_nova_core', '名称': '超新星核心', '类型': 'accessory', '稀有度': 'LR', '描述': '超新星碎片，战斗开始触发星爆（200%攻击力全屏伤害）', '图标': '💫', '攻击力': 40, '暴击率': 30, '暴击伤害': 0.7 },
    { '键名': 'sp_shooting_star', '装备ID': 'sp_shooting_star', '名称': '流星光痕', '类型': 'weapon', '稀有度': 'SP', '描述': '攻击留下光痕，5层后触发流星坠落（150%攻击力）', '图标': '🌠', '攻击力': 110, '暴击率': 18, '暴击伤害': 0.45 },
    { '键名': 'sp_aurora_veil', '装备ID': 'sp_aurora_veil', '名称': '极光纱衣', '类型': 'armor', '稀有度': 'SP', '描述': '每8秒切换元素属性，对应星星分数+20%', '图标': '🌈', '防御力': 85, '生命值': 260 },
    { '键名': 'sp_time_hourglass', '装备ID': 'sp_time_hourglass', '名称': '时空沙漏', '类型': 'accessory', '稀有度': 'SP', '描述': '点击星星时5%概率时间回溯，延长战斗3秒', '图标': '⏳', '攻击力': 25, '暴击率': 20, '暴击伤害': 0.5 }
);

let newWs = XLSX.utils.json_to_sheet(data);
wb.Sheets[wb.SheetNames[0]] = newWs;
XLSX.writeFile(wb, path.join(ROOT, 'data', 'Equipments.xlsx'));
console.log('Equipments: added 9 items');

// ===== Skills =====
wb = XLSX.readFile(path.join(ROOT, 'data', 'Skills.xlsx'));
ws = wb.Sheets[wb.SheetNames[0]];
data = XLSX.utils.sheet_to_json(ws);

data.push(
    { '键名': 'skill_star_spark', '技能ID': 'skill_star_spark', '名称': '星火', '类型': 'attack', '稀有度': 'UC', '冷却(ms)': 20, '描述': '发射微弱星火，造成少量伤害', '图标': '✨', '效果描述': 'damage', '伤害值': 40 },
    { '键名': 'skill_minor_heal', '技能ID': 'skill_minor_heal', '名称': '微光治愈', '类型': 'support', '稀有度': 'UC', '冷却(ms)': 30, '描述': '微弱星光治愈，恢复少量生命', '图标': '💚', '效果描述': 'heal', '治疗量': 20 },
    { '键名': 'skill_star_sense', '技能ID': 'skill_star_sense', '名称': '星感', '类型': 'passive', '稀有度': 'UC', '描述': '永久增加少量攻击力', '图标': '🌟', '效果描述': 'passive', '攻击力加成': 8 },
    { '键名': 'skill_big_bang', '技能ID': 'skill_big_bang', '名称': '宇宙大爆炸', '类型': 'attack', '稀有度': 'LR', '冷却(ms)': 120, '描述': '引爆星球造成毁灭伤害，眩慕3秒', '图标': '💥', '效果描述': 'damage', '伤害值': 1500 },
    { '键名': 'skill_singularity', '技能ID': 'skill_singularity', '名称': '奇点', '类型': 'support', '稀有度': 'LR', '冷却(ms)': 180, '描述': '黑洞奇点，5秒吸收伤害转护盾后反弹50%', '图标': '🌀', '效果描述': 'shield', '持续时间(ms)': 5 },
    { '键名': 'skill_transcendence', '技能ID': 'skill_transcendence', '名称': '超越', '类型': 'passive', '稀有度': 'LR', '描述': '全属性大幅提升，每击杀10怪永久+1攻击（上限50）', '图标': '🔱', '效果描述': 'passive', '攻击力加成': 120, '暴击率加成': 30, '暴伤加成': 0.6, '防御力加成': 60, '生命加成': 120 },
    { '键名': 'skill_stardust_parade', '技能ID': 'skill_stardust_parade', '名称': '星尘巡游', '类型': 'attack', '稀有度': 'SP', '冷却(ms)': 90, '描述': '流星雨5秒持续伤害，点击星星额外触发伤害', '图标': '🎇', '效果描述': 'damage', '伤害值': 200, '持续时间(ms)': 5 },
    { '键名': 'skill_lucky_constellation', '技能ID': 'skill_lucky_constellation', '名称': '幸运星座', '类型': 'support', '稀有度': 'SP', '冷却(ms)': 100, '描述': '随机星座祝福（攻击+30%/全回复/时间+10s/金币x3）', '图标': '🎰', '效果描述': 'buff', '持续时间(ms)': 15 },
    { '键名': 'skill_seasons_blessing', '技能ID': 'skill_seasons_blessing', '名称': '赛季星辰', '类型': 'passive', '稀有度': 'SP', '描述': '赛季期间星星分数+15%，连击分数+10%', '图标': '🎪', '效果描述': 'passive', '星星分数加成': 1.15, '连击加成': 0.1 }
);

newWs = XLSX.utils.json_to_sheet(data);
wb.Sheets[wb.SheetNames[0]] = newWs;
XLSX.writeFile(wb, path.join(ROOT, 'data', 'Skills.xlsx'));
console.log('Skills: added 9 items');

// ===== Pets =====
wb = XLSX.readFile(path.join(ROOT, 'data', 'Pets.xlsx'));
ws = wb.Sheets[wb.SheetNames[0]];
data = XLSX.utils.sheet_to_json(ws);

data.push(
    { '键名': 'pet_star_mite', '宠物ID': 'pet_star_mite', '名称': '星尘虫', '稀有度': 'UC', '攻击力': 2, '攻击间隔(ms)': 2.8, '描述': '微小星尘虫，攻速快但伤害低', '图标': '🐛', '价格': 200 },
    { '键名': 'pet_dust_wisp', '宠物ID': 'pet_dust_wisp', '名称': '尘埃精灵', '稀有度': 'UC', '攻击力': 3, '攻击间隔(ms)': 2.5, '描述': '星尘凝聚的小精灵，偶尔暴击', '图标': '💭', '价格': 250, '暴击率': 1 },
    { '键名': 'pet_world_eater', '宠物ID': 'pet_world_eater', '名称': '噬界虫', '稀有度': 'LR', '攻击力': 160, '攻击间隔(ms)': 0.6, '描述': '吞噬星球的巨虫，20%概率造成3倍伤害', '图标': '🐛', '价格': 50000, '暴击率': 35, '暴击伤害': 0.8 },
    { '键名': 'pet_nebula_serpent', '宠物ID': 'pet_nebula_serpent', '名称': '星云巨蛇', '稀有度': 'LR', '攻击力': 140, '攻击间隔(ms)': 0.8, '描述': '每次攻击使目标受伤+5%（最多叠10层）', '图标': '🐍', '价格': 48000, '暴击率': 30, '暴击伤害': 0.7 },
    { '键名': 'pet_festival_lantern', '宠物ID': 'pet_festival_lantern', '名称': '星灯精灵', '稀有度': 'SP', '攻击力': 100, '攻击间隔(ms)': 1.0, '描述': '场上星星分数+10%，每5次点击释放星火', '图标': '🏮', '价格': 30000, '暴击率': 25, '暴击伤害': 0.5 },
    { '键名': 'pet_meteor_fox', '宠物ID': 'pet_meteor_fox', '名称': '流星狐', '稀有度': 'SP', '攻击力': 95, '攻击间隔(ms)': 0.9, '描述': '暴击时留下流星，3秒后爆炸100范围伤害', '图标': '🦊', '价格': 28000, '暴击率': 35, '暴击伤害': 0.45 }
);

newWs = XLSX.utils.json_to_sheet(data);
wb.Sheets[wb.SheetNames[0]] = newWs;
XLSX.writeFile(wb, path.join(ROOT, 'data', 'Pets.xlsx'));
console.log('Pets: added 6 items');

// ===== Characters =====
wb = XLSX.readFile(path.join(ROOT, 'data', 'Characters.xlsx'));
ws = wb.Sheets[wb.SheetNames[0]];
data = XLSX.utils.sheet_to_json(ws);

data.push(
    { '键名': 'void_emperor', '角色ID': 'char_025', '名称': '虚空帝皇', '稀有度': 'LR', '描述': '虚空之主，掌控时空与混沌之力', '生命值': 400, '生命成长': 40, '攻击力': 170, '攻击成长': 17, '暴击率': 50, '暴击率成长': 5, '暴击伤害': 7, '暴伤成长': 0.7, '魔力': 80, '魔力成长': 8, '信仰': 80, '信仰成长': 8, '防御力': 60, '防御成长': 6, '连击阈值': 2, '连击速度加成': 0.18, '连击分数加成': 0.35, '连击超时(ms)': 900 },
    { '键名': 'stellar_wanderer', '角色ID': 'char_026', '名称': '星际旅人', '稀有度': 'SP', '描述': '穿越星海的旅行者，每场随机获得宇宙祝福', '生命值': 260, '生命成长': 26, '攻击力': 135, '攻击成长': 13.5, '暴击率': 42, '暴击率成长': 4.2, '暴击伤害': 5.5, '暴伤成长': 0.55, '魔力': 65, '魔力成长': 6.5, '信仰': 65, '信仰成长': 6.5, '防御力': 45, '防御成长': 4.5, '连击阈值': 3, '连击速度加成': 0.15, '连击分数加成': 0.3, '连击超时(ms)': 1050 }
);

newWs = XLSX.utils.json_to_sheet(data);
wb.Sheets[wb.SheetNames[0]] = newWs;
XLSX.writeFile(wb, path.join(ROOT, 'data', 'Characters.xlsx'));
console.log('Characters: added 2 items');

console.log('All Excel files updated successfully');
