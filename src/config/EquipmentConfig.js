/**
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

// Equipments
const Equipments = {
    sword_1: { id: 'sword_1', name: '铜锈短匕', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.COMMON, description: '一件青铜碎片的灵凝结成刃——它不够锋利，但足够带你跨过第一条灵脉', emoji: '🗡️', attack: 5 },
    sword_2: { id: 'sword_2', name: '战国剑·淬火', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.RARE, description: '战国剑的灵刃——两千年前的淬火还在剑锋上跳动', emoji: '⚔️', attack: 15, critRate: 2 },
    staff_1: { id: 'staff_1', name: '竹简卷', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.RARE, description: '一卷战国竹简的灵——展开的不只是文字，还有两千年前的呼吸', emoji: '🪄', attack: 10, critDamage: 0.1 },
    ice_staff: { id: 'ice_staff', name: '青花杖', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.RARE, description: '元代青花瓷瓶的残片凝成——杖头是那朵没画完的牡丹', emoji: '💧', attack: 12, critRate: 3 },
    fire_sword: { id: 'fire_sword', name: '鼎纹剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.RARE, description: '青铜鼎纹从鼎身剥离后自己卷成了剑——剑锋上是商代的饕餮纹', emoji: '🔥', attack: 18, critDamage: 0.05 },
    sword_3: { id: 'sword_3', name: '玉琮剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.EPIC, description: '良渚玉琮的灵凝成长剑——四方的剑身，每一面都是玉的白', emoji: '✨', attack: 30, critRate: 5, critDamage: 0.2 },
    meteor_blade: { id: 'meteor_blade', name: '铁饼之刃', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.EPIC, description: '掷铁饼者手中的那枚石饼——在灵域中它被打成了刃', emoji: '🌠', attack: 35, critRate: 8, critDamage: 0.15 },
    frost_scepter: { id: 'frost_scepter', name: '金缮杖', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.EPIC, description: '金缮修复过的茶碗灵——杖身上的金丝裂痕是它曾经碎过的证据', emoji: '💠', attack: 25, critRate: 10 },
    blaze_edge: { id: 'blaze_edge', name: '太阳石剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.EPIC, description: '太阳石刻纹中抽出来的光——不是火焰，是末日预言在燃烧', emoji: '💥', attack: 40, critDamage: 0.25 },
    star_sword: { id: 'star_sword', name: '编钟剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGENDARY, description: '曾侯乙编钟的灵凝成一剑——每次挥动，都有一段音节在邪灵身上炸开', emoji: '🌟', attack: 60, critRate: 12, critDamage: 0.3 },
    heart_of_ice: { id: 'heart_of_ice', name: '北欧角杯', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGENDARY, description: '维京金角中的灵凝聚成器——金角唤来的不是英灵，是千年的冰霜', emoji: '🪨', attack: 50, critRate: 15, critDamage: 0.2 },
    emperor_flame: { id: 'emperor_flame', name: '法老刃', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGENDARY, description: '法老金棺上的圣甲虫纹从棺盖剥落，卷成了一柄刃', emoji: '🔥', attack: 70, critDamage: 0.4 },
    devourer_blade: { id: 'devourer_blade', name: '罗塞塔刃', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGENDARY, description: '罗塞塔石碑的碎片之灵凝聚为刃——它吞噬的不只是灵能，还有邪灵的技能', emoji: '🗡️', attack: 55, critRate: 10, lifestealRate: 0.01, special: 'lifesteal' },
    galaxy_blade: { id: 'galaxy_blade', name: '万灵剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.MYTHIC, description: '第一百次融合的产物——剑上有八种文明的纹路互相缠绕，没有一种覆盖了另一种', emoji: '⚔️', attack: 100, critRate: 20, critDamage: 0.5 },
    armor_1: { id: 'armor_1', name: '棉布小褂', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.COMMON, description: '蜀汉城市井中的一件素棉衣——没有千年历史，但有你的体温', emoji: '👕', defense: 5, hp: 20 },
    armor_2: { id: 'armor_2', name: '战国铁胄', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.RARE, description: '战国铁胄之灵——两千年的锈迹凝成了防御层', emoji: '🛡️', defense: 15, hp: 50 },
    ice_robe: { id: 'ice_robe', name: '冰纨袍', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.RARE, description: '汉代冰纨织物的灵——不是冰做的，是在冰窖里睡了一千年', emoji: '🧥', defense: 10, hp: 60, critRate: 2 },
    flame_cloak: { id: 'flame_cloak', name: '冶炼披风', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.RARE, description: '侯马铸铜遗址的炉火之灵——两千年前的烈火从不脱工作', emoji: '🔥', defense: 12, hp: 40, critDamage: 0.05 },
    armor_3: { id: 'armor_3', name: '璎珞甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.EPIC, description: '佛像上的璎珞珠串之灵编织成甲——每一颗珠子都有它自己的梵音', emoji: '🎖️', defense: 30, hp: 100, critRate: 3 },
    ice_crystal_armor: { id: 'ice_crystal_armor', name: '冰鉴铠', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.EPIC, description: '战国冰鉴的灵——冷藏了两千年的护体灵光', emoji: '💧', defense: 35, hp: 80, critRate: 5 },
    lava_armor: { id: 'lava_armor', name: '铜造像甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.EPIC, description: '贝宁青铜头像延展而成的甲——大地最古老的防御形态', emoji: '🌋', defense: 40, hp: 120, critDamage: 0.1 },
    star_armor: { id: 'star_armor', name: '万国甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGENDARY, description: '集齐四座灵域文明锻造的甲——不同纹样在甲面上各自呼吸', emoji: '🌟', defense: 50, hp: 150, critRate: 8 },
    permafrost_armor: { id: 'permafrost_armor', name: '维京船甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGENDARY, description: '维京长船上的橡木之灵——冰冷不是北方的诅咒，是它的铠甲', emoji: '💠', defense: 55, hp: 130, critRate: 10, critDamage: 0.15 },
    emperor_armor: { id: 'emperor_armor', name: '祭祀甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGENDARY, description: '玛雅祭坛石的灵——它的防御是让攻击在时间中弥散', emoji: '🔥', defense: 60, hp: 180, critDamage: 0.2 },
    void_armor: { id: 'void_armor', name: '隐灵甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGENDARY, description: '浮世绘中的隐世之灵——邪灵看不见你时才会显形', emoji: '🌀', defense: 45, hp: 120, special: 'vanish', vanishChance: 0.15, vanishDuration: 1 },
    galaxy_armor: { id: 'galaxy_armor', name: '大地母甲', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.MYTHIC, description: '非洲大地母神像的碎片之灵淬成的甲——她承受过七层污染', emoji: '✨', defense: 80, hp: 250, critRate: 15, critDamage: 0.25 },
    ring_1: { id: 'ring_1', name: '铜雀戒', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.COMMON, description: '青铜雀形小件之灵——戴在手上轻若无物，但它确实是三千年前那只雀', emoji: '💍', critRate: 1 },
    ring_2: { id: 'ring_2', name: '蝉翼戒', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.RARE, description: '玉蝉仙翅膀边缘的一丝灵凝聚成的戒指——你能感受到它振翅的频率', emoji: '🪨', critRate: 5, critDamage: 0.15 },
    ice_earring: { id: 'ice_earring', name: '莲花耳坠', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.RARE, description: '曼陀罗灵域中莲花池的凝结——整个池子挂在耳边', emoji: '💧', critRate: 4, critDamage: 0.1 },
    fire_amulet: { id: 'fire_amulet', name: '日石护符', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.RARE, description: '太阳石边缘剥落的一小片石灵——挂在你脖子上燃烧', emoji: '🔥', attack: 8, critDamage: 0.1 },
    necklace_1: { id: 'necklace_1', name: '玺印项链', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.EPIC, description: '传国玉玺的残灵——方寸之间，千年之重', emoji: '📿', attack: 10, critRate: 8, critDamage: 0.25 },
    frost_pendant: { id: 'frost_pendant', name: '极光吊坠', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.EPIC, description: '北极光凝聚成的吊坠——不是冻结的，是等待的', emoji: '💠', critRate: 12, critDamage: 0.2 },
    blaze_badge: { id: 'blaze_badge', name: '历法徽章', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.EPIC, description: '玛雅历法盘的一格——每一格都是对时间的精准计量', emoji: '🔥', attack: 15, critDamage: 0.3 },
    star_eye: { id: 'star_eye', name: '荷鲁斯之眼', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGENDARY, description: '埃及天空之神荷鲁斯的灵——你看不见的紊乱，它替你看见', emoji: '👁️', attack: 20, critRate: 15, critDamage: 0.35 },
    aurora_crown: { id: 'aurora_crown', name: '王冠·奥西里斯', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGENDARY, description: '奥西里斯之冠的灵碎片——重生是被杀过才能拥有的力量', emoji: '👑', critRate: 20, critDamage: 0.4 },
    emperor_ring: { id: 'emperor_ring', name: '金棺指环', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGENDARY, description: '法老金棺上的金属纹饰圈——凋零是最执着的羁绊', emoji: '💍', attack: 25, critDamage: 0.5 },
    abyss_pendant: { id: 'abyss_pendant', name: '灵脉吊坠', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGENDARY, description: '灵脉交叉处凝固的能量结晶——暴击和闪避不是技巧，是灵在你身上留的位置', emoji: '💠', critRate: 18, critDamage: 0.4, evasion: 5 },
    galaxy_heart: { id: 'galaxy_heart', name: '万灵之心', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.MYTHIC, description: '八座灵域在一次短暂共振中共同凝出的一颗结晶——没有任何单一文明可以在上面签名', emoji: '💜', attack: 30, critRate: 25, critDamage: 0.6 },
    frost_set: { id: 'frost_set', name: '水行套装', type: EquipmentTypes.SET, rarity: EquipmentRarity.EPIC, description: '水行之力集结——五件器物共鸣时，水灵光走向你比走向邪灵更近', emoji: '💠', attack: 15, defense: 15, hp: 60, critRate: 8, critDamage: 0.2 },
    blaze_set: { id: 'blaze_set', name: '火行套装', type: EquipmentTypes.SET, rarity: EquipmentRarity.EPIC, description: '火行之力集结——温度不是创伤，是灵在煮沸紊乱', emoji: '🔥', attack: 25, defense: 10, hp: 40, critDamage: 0.25 },
    set_1: { id: 'set_1', name: '灵域入门套装', type: EquipmentTypes.SET, rarity: EquipmentRarity.LEGENDARY, description: '进入第一座灵域的纪念——每一件器物都来自同一道灵脉', emoji: '⭐', attack: 20, defense: 20, hp: 80, critRate: 10, critDamage: 0.3 },
    star_set: { id: 'star_set', name: '唤灵套装', type: EquipmentTypes.SET, rarity: EquipmentRarity.LEGENDARY, description: '跨越四座灵域时分别得到的四件灵器——每一件都是不同文明的一句"你可以继续走"', emoji: '🌟', attack: 30, defense: 25, hp: 100, critRate: 12, critDamage: 0.35 },
    galaxy_set: { id: 'galaxy_set', name: '八灵套装', type: EquipmentTypes.SET, rarity: EquipmentRarity.MYTHIC, description: '八座灵域各出一件灵器——穿上它的瞬间你就能听到所有文明的灵脉在同一时刻呼吸', emoji: '🔮', attack: 50, defense: 40, hp: 150, critRate: 20, critDamage: 0.5 },
    devourer_crown: { id: 'devourer_crown', name: '唤灵冠', type: EquipmentTypes.SET, rarity: EquipmentRarity.MYTHIC, description: '唤灵人的最终证明——来自八座灵域各一缕灵脉的馈赠。不是吞噬，是融汇', emoji: '👑', attack: 25, defense: 25, critRate: 25, critDamage: 0.25, special: 'devourer_set', hpPerKill: 3 },
    thief_blade: { id: 'thief_blade', name: '窃灵之刃', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGENDARY, description: '从邪灵身上剥离紊乱能量化为利刃——你偷的不是它的力量，是它的稳定', emoji: '🗡️', attack: 45, critRate: 8 },
    thief_cloak: { id: 'thief_cloak', name: '星隐斗篷', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGENDARY, description: '披上斗篷，星光也无法捕捉你的身影', emoji: '🧥', defense: 30, hp: 80, evasion: 5 },
    thief_ring: { id: 'thief_ring', name: '窃星之戒', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGENDARY, description: '戒指中封印着被窃取的星光', emoji: '💍', attack: 25, critDamage: 0.25 },
    thief_crown: { id: 'thief_crown', name: '偷星者之冠', type: EquipmentTypes.SET, rarity: EquipmentRarity.LEGENDARY, description: '偷星者的王冠，暴击时回复5灵能', emoji: '👑', attack: 30, defense: 20, hp: 50, critRate: 10, critDamage: 0.2, special: 'thief_crown', critHealHp: 5 },
    dark_star_dagger: { id: 'dark_star_dagger', name: '月石匕首', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.EPIC, description: '埃及冥界月亮的碎片——锋利得无声', emoji: '🌙', attack: 25, critRate: 5 },
    dark_star_pendant: { id: 'dark_star_pendant', name: '夜灵吊坠', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.EPIC, description: '灵域夜间逸散的微弱灵光凝结成了坠子', emoji: '🌙', attack: 15, critDamage: 0.1 },
    meteor_boots: { id: 'meteor_boots', name: '流星步靴', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.EPIC, description: '穿上它，脚步如流星般迅捷', emoji: '👢', defense: 15, hp: 30, evasion: 3 },
    thief_gloves: { id: 'thief_gloves', name: '窃星手套', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.EPIC, description: '戴上手套，连星光都能偷走', emoji: '🧤', attack: 12, critRate: 3, critDamage: 0.08 },
    uc_wooden_sword: { id: 'uc_wooden_sword', name: '竹简短剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.UNCOMMON, description: '竹简之灵凝成的短剑——比空手好一点', emoji: '🗡️', attack: 3 },
    uc_cloth_armor: { id: 'uc_cloth_armor', name: '麻布小褂', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.UNCOMMON, description: '蜀汉城最普通的麻织品——防御聊胜于无', emoji: '👕', defense: 3, hp: 10 },
    uc_stone_ring: { id: 'uc_stone_ring', name: '星尘石戒', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.UNCOMMON, description: '星尘石打磨的戒指，微微闪烁', emoji: '💍', critRate: 0.5 },
    lr_cosmic_cleaver: { id: 'lr_cosmic_cleaver', name: '灵脉裂断', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.LEGEND_RARE, description: '两条灵脉交叉处锻造的至高之刃——暴击时紊乱能量沿着灵脉溅射', emoji: '⚔️', attack: 140, critRate: 25, critDamage: 0.6 },
    lr_event_horizon: { id: 'lr_event_horizon', name: '灵脉边界', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.LEGEND_RARE, description: '灵脉临界点淬成的铠甲——受击时紊乱能量可能反向吞噬来源', emoji: '🌀', defense: 105, hp: 330 },
    lr_nova_core: { id: 'lr_nova_core', name: '灵脉核心', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.LEGEND_RARE, description: '灵脉最深处的共振核心——战斗开始时的星爆是它第一次呼吸', emoji: '💫', attack: 40, critRate: 30, critDamage: 0.7 },
    sp_shooting_star: { id: 'sp_shooting_star', name: '陨灵剑', type: EquipmentTypes.WEAPON, rarity: EquipmentRarity.SPECIAL, description: '陨灵光在你挥过的路径上留下光痕——五层光痕后天空坠下陨击', emoji: '🌠', attack: 110, critRate: 18, critDamage: 0.45 },
    sp_aurora_veil: { id: 'sp_aurora_veil', name: '极光纱衣', type: EquipmentTypes.ARMOR, rarity: EquipmentRarity.SPECIAL, description: '北欧极光帘幕中剥离的一层——每八秒切换元素属性的共鸣频率', emoji: '🌈', defense: 85, hp: 260 },
    sp_time_hourglass: { id: 'sp_time_hourglass', name: '时序沙漏', type: EquipmentTypes.ACCESSORY, rarity: EquipmentRarity.SPECIAL, description: '时序灵光在沙漏中凝结——不是沙子流过，是战斗延长了', emoji: '⏳', attack: 25, critRate: 20, critDamage: 0.5 }
};

export { EquipmentTypes, EquipmentRarity, Equipments };
