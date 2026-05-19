/**
 * 装备配置
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
    UNCOMMON: 'UC',     // 精良
    COMMON: 'N',        // 普通
    RARE: 'R',          // 稀有
    EPIC: 'SR',         // 史诗
    LEGENDARY: 'SSR',   // 传说
    MYTHIC: 'UR',       // 神话
    LEGEND_RARE: 'LR',  // 传奇
    SPECIAL: 'SP'       // 限定
};

// Equipments
const Equipments = {
    sword_1: { id: 'sword_1', name: '新手剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.COMMON, description: '一把普通的剑，适合初学者', emoji: '🗡️', attack: 5 },
    sword_2: { id: 'sword_2', name: '锋利之刃', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.RARE, description: '锋利的剑刃，切割如风', emoji: '⚔️', attack: 15, critRate: 2 },
    staff_1: { id: 'staff_1', name: '魔法杖', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.RARE, description: '蕴含魔力的法杖', emoji: '🪄', attack: 10, critDamage: 0.1 },
    ice_staff: { id: 'ice_staff', name: '冰晶法杖', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.RARE, description: '由冰晶凝聚而成，寒气逼人', emoji: '❄️', attack: 12, critRate: 3 },
    fire_sword: { id: 'fire_sword', name: '火焰长剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.RARE, description: '剑身燃烧着永恒的火焰', emoji: '🔥', attack: 18, critDamage: 0.05 },
    sword_3: { id: 'sword_3', name: '古铜剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.EPIC, description: '由古铜铸炼而成的剑', emoji: '✨', attack: 30, critRate: 5, critDamage: 0.2 },
    meteor_blade: { id: 'meteor_blade', name: '秦锋刃', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.EPIC, description: '秦代锋刃，划破苍穹', emoji: '🌠', attack: 35, critRate: 8, critDamage: 0.15 },
    frost_scepter: { id: 'frost_scepter', name: '冰霜权杖', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.EPIC, description: '极寒之地的神器', emoji: '💠', attack: 25, critRate: 10 },
    blaze_edge: { id: 'blaze_edge', name: '烈焰剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.EPIC, description: '燃烧一切的炽热之剑', emoji: '💥', attack: 40, critDamage: 0.25 },
    star_sword: { id: 'star_sword', name: '龙渊圣剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGENDARY, description: '凝聚万千龙渊之力', emoji: '🌟', attack: 60, critRate: 12, critDamage: 0.3 },
    heart_of_ice: { id: 'heart_of_ice', name: '极寒之心', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGENDARY, description: '永冻之心的碎片', emoji: '💎', attack: 50, critRate: 15, critDamage: 0.2 },
    emperor_flame: { id: 'emperor_flame', name: '炎帝之刃', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGENDARY, description: '炎帝遗留的神器', emoji: '🔥', attack: 70, critDamage: 0.4 },
    devourer_blade: { id: 'devourer_blade', name: '饕餮之刃', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGENDARY, description: '击杀怪物回复1%血量', emoji: '🗡️', attack: 55, critRate: 10, lifestealRate: 0.01, special: 'lifesteal' },
    galaxy_blade: { id: 'galaxy_blade', name: '承影神剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.MYTHIC, description: '承影铸就的终极之剑', emoji: '⚔️', attack: 100, critRate: 20, critDamage: 0.5 },
    armor_1: { id: 'armor_1', name: '布衣', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.COMMON, description: '简单的布衣，聊胜于无', emoji: '👕', defense: 5, hp: 20 },
    armor_2: { id: 'armor_2', name: '铁甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.RARE, description: '坚固的铁甲', emoji: '🛡️', defense: 15, hp: 50 },
    ice_robe: { id: 'ice_robe', name: '冰丝长袍', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.RARE, description: '由冰蚕丝织成的长袍', emoji: '🧥', defense: 10, hp: 60 },
    flame_cloak: { id: 'flame_cloak', name: '火焰披风', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.RARE, description: '永不熄灭的火焰披风', emoji: '🔥', defense: 12, hp: 40 },
    armor_3: { id: 'armor_3', name: '铜纹战甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.EPIC, description: '闪耀铜纹的战甲', emoji: '🎖️', defense: 30, hp: 100 },
    ice_crystal_armor: { id: 'ice_crystal_armor', name: '冰玉铠甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.EPIC, description: '由千年冰玉打造', emoji: '❄️', defense: 35, hp: 80 },
    lava_armor: { id: 'lava_armor', name: '熔岩战甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.EPIC, description: '在地心熔岩中锻造', emoji: '🌋', defense: 40, hp: 120 },
    star_armor: { id: 'star_armor', name: '饕餮战甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGENDARY, description: '饕餮纹饰的神甲', emoji: '🌟', defense: 50, hp: 150 },
    permafrost_armor: { id: 'permafrost_armor', name: '永冻之铠', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGENDARY, description: '永恒冻土的力量', emoji: '💠', defense: 55, hp: 130 },
    emperor_armor: { id: 'emperor_armor', name: '炎帝战甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGENDARY, description: '炎帝的战甲，抵御一切', emoji: '🔥', defense: 60, hp: 180 },
    void_armor: { id: 'void_armor', name: '虚空战甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGENDARY, description: '被攻击时15%概率隐身1秒', emoji: '🌀', defense: 45, hp: 120, special: 'vanish', vanishChance: 0.15, vanishDuration: 1 },
    galaxy_armor: { id: 'galaxy_armor', name: '九鼎圣甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.MYTHIC, description: '九鼎之力护佑全身', emoji: '✨', defense: 80, hp: 250 },
    ring_1: { id: 'ring_1', name: '铜戒指', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.COMMON, description: '普通的戒指', emoji: '💍', critRate: 1 },
    ring_2: { id: 'ring_2', name: '暴击戒指', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.RARE, description: '增加暴击能力的戒指', emoji: '💎', critRate: 5, critDamage: 0.15 },
    ice_earring: { id: 'ice_earring', name: '冰晶耳环', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.RARE, description: '冰晶打造的耳环', emoji: '❄️', critRate: 4, critDamage: 0.1 },
    fire_amulet: { id: 'fire_amulet', name: '火焰护符', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.RARE, description: '蕴含火焰之力的护符', emoji: '🔥', attack: 8, critDamage: 0.1 },
    necklace_1: { id: 'necklace_1', name: '灵玉项链', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.EPIC, description: '蕴含灵玉之力的项链', emoji: '📿', attack: 10, critRate: 8, critDamage: 0.25 },
    frost_pendant: { id: 'frost_pendant', name: '冰霜吊坠', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.EPIC, description: '永冬之地的珍宝', emoji: '💠', critRate: 12, critDamage: 0.2 },
    blaze_badge: { id: 'blaze_badge', name: '烈焰徽章', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.EPIC, description: '烈焰骑士的荣耀', emoji: '🔥', attack: 15, critDamage: 0.3 },
    star_eye: { id: 'star_eye', name: '玉璧之眼', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGENDARY, description: '洞察玉璧的神器', emoji: '👁️', attack: 20, critRate: 15, critDamage: 0.35 },
    aurora_crown: { id: 'aurora_crown', name: '极光之冠', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGENDARY, description: '北极光的化身', emoji: '👑', critRate: 20, critDamage: 0.4 },
    emperor_ring: { id: 'emperor_ring', name: '炎皇之戒', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGENDARY, description: '炎皇的权戒', emoji: '💍', attack: 25, critDamage: 0.5 },
    abyss_pendant: { id: 'abyss_pendant', name: '深渊吊坠', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGENDARY, description: '深渊的馈赠，暴击与闪避兼备', emoji: '💠', critRate: 18, critDamage: 0.4, evasion: 5 },
    galaxy_heart: { id: 'galaxy_heart', name: '龙纹之心', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.MYTHIC, description: '龙纹的核心，蕴含无限力量', emoji: '💜', attack: 30, critRate: 25, critDamage: 0.6 },
    frost_set: { id: 'frost_set', name: '冰霜套装', type: EquipmentTypes.SET, rarity: EquipmentRarity.EPIC, description: '冰霜之力集结套装', emoji: '❄️', attack: 15, defense: 15, hp: 60, critRate: 8, critDamage: 0.2 },
    blaze_set: { id: 'blaze_set', name: '烈焰套装', type: EquipmentTypes.SET, rarity: EquipmentRarity.EPIC, description: '烈焰之力集结套装', emoji: '🔥', attack: 25, defense: 10, hp: 40, critDamage: 0.25 },
    set_1: { id: 'set_1', name: '古铜套装', type: EquipmentTypes.SET, rarity: EquipmentRarity.LEGENDARY, description: '传说中的古铜战士套装', emoji: '⭐', attack: 20, defense: 20, hp: 80, critRate: 10, critDamage: 0.3 },
    star_set: { id: 'star_set', name: '青铜套装', type: EquipmentTypes.SET, rarity: EquipmentRarity.LEGENDARY, description: '青铜之力完全体', emoji: '🌟', attack: 30, defense: 25, hp: 100, critRate: 12, critDamage: 0.35 },
    galaxy_set: { id: 'galaxy_set', name: '龙纹套装', type: EquipmentTypes.SET, rarity: EquipmentRarity.MYTHIC, description: '龙纹铸就的终极套装', emoji: '🌌', attack: 50, defense: 40, hp: 150, critRate: 20, critDamage: 0.5 },
    devourer_crown: { id: 'devourer_crown', name: '吞噬者之冠', type: EquipmentTypes.SET, rarity: EquipmentRarity.MYTHIC, description: '全属性+25%，击杀怪物回复3HP', emoji: '👑', attack: 25, defense: 25, critRate: 25, critDamage: 0.25, special: 'devourer_set', hpPerKill: 3 },
    thief_blade: { id: 'thief_blade', name: '窃魂之刃', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGENDARY, description: '从幽魂中窃取力量，化为利刃', emoji: '🗡️', attack: 45, critRate: 8 },
    thief_cloak: { id: 'thief_cloak', name: '墨隐斗篷', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGENDARY, description: '披上斗篷，墨影也无法捕捉你的身影', emoji: '🧥', defense: 30, hp: 80, evasion: 5 },
    thief_ring: { id: 'thief_ring', name: '窃灵之戒', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGENDARY, description: '戒指中封印着被窃取的灵力', emoji: '💍', attack: 25, critDamage: 0.25 },
    thief_crown: { id: 'thief_crown', name: '窃灵者之冠', type: EquipmentTypes.SET, rarity: EquipmentRarity.LEGENDARY, description: '窃灵者的王冠，暴击时回复5HP', emoji: '👑', attack: 30, defense: 20, hp: 50, critRate: 10, critDamage: 0.2, special: 'thief_crown', critHealHp: 5 },
    dark_star_dagger: { id: 'dark_star_dagger', name: '暗玉匕首', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.EPIC, description: '暗玉铸成的短刃，锋利无声', emoji: '🔪', attack: 25, critRate: 5 },
    dark_star_pendant: { id: 'dark_star_pendant', name: '暗玉吊坠', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.EPIC, description: '吊坠中闪烁着不祥的光芒', emoji: '📿', attack: 15, critDamage: 0.1 },
    meteor_boots: { id: 'meteor_boots', name: '轻甲步靴', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.EPIC, description: '穿上它，脚步如疾风般迅捷', emoji: '👢', defense: 15, hp: 30, evasion: 3 },
    thief_gloves: { id: 'thief_gloves', name: '窃灵手套', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.EPIC, description: '戴上手套，连灵力都能偷走', emoji: '🧤', attack: 12, critRate: 3, critDamage: 0.08 },
    uc_wooden_sword: { id: 'uc_wooden_sword', name: '碎陶木剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.UNCOMMON, description: '碎陶削成的小剑，比空手好一点', emoji: '🗡️', attack: 3 },
    uc_cloth_armor: { id: 'uc_cloth_armor', name: '碎陶布甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.UNCOMMON, description: '碎陶编织的布甲，轻便柔软', emoji: '👕', defense: 3, hp: 10 },
    uc_stone_ring: { id: 'uc_stone_ring', name: '碎陶石戒', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.UNCOMMON, description: '碎陶石打磨的戒指，微微闪烁', emoji: '💍', critRate: 0.5 },
    lr_cosmic_cleaver: { id: 'lr_cosmic_cleaver', name: '洪荒裂断', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGEND_RARE, description: '劈开洪荒的至高之刃，暴击时30%溅射伤害', emoji: '⚔️', attack: 140, critRate: 25, critDamage: 0.6 },
    lr_event_horizon: { id: 'lr_event_horizon', name: '天机界', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGEND_RARE, description: '天机之界的铠甲，受击时10%概率吞噬怪物（Boss无效）', emoji: '🌀', defense: 105, hp: 330 },
    lr_nova_core: { id: 'lr_nova_core', name: '灵炉核心', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGEND_RARE, description: '灵炉碎片，战斗开始触发灵爆（200%攻击力全屏伤害）', emoji: '💫', attack: 40, critRate: 30, critDamage: 0.7 },
    sp_shooting_star: { id: 'sp_shooting_star', name: '龙渊光痕', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.SPECIAL, description: '攻击留下光痕，5层后触发龙渊坠落（150%攻击力）', emoji: '🌠', attack: 110, critRate: 18, critDamage: 0.45 },
    sp_aurora_veil: { id: 'sp_aurora_veil', name: '极光纱衣', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.SPECIAL, description: '每8秒切换元素属性，对应灵物分数+20%', emoji: '🌈', defense: 85, hp: 260 },
    sp_time_hourglass: { id: 'sp_time_hourglass', name: '日晷沙漏', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.SPECIAL, description: '点击灵物时5%概率时间回溯，延长战斗3秒', emoji: '⏳', attack: 25, critRate: 20, critDamage: 0.5 }
};

export { EquipmentTypes, EquipmentRarity, Equipments };
