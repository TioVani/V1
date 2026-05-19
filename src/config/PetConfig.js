/**
 * 宠物配置
 * ⚠️ 此文件由 scripts/convert.js 从 data/Pets.xlsx 自动生成
 * 如需修改数据，请编辑 Excel 文件后运行 npm run convert
 */

const PetRarity = {
    UNCOMMON: 'UC',     // 精良
    COMMON: 'N',        // 普通
    RARE: 'R',          // 稀有
    EPIC: 'SR',         // 史诗
    LEGENDARY: 'SSR',   // 传说
    MYTHIC: 'UR',       // 神话
    LEGEND_RARE: 'LR',  // 传奇
    SPECIAL: 'SP'       // 限定
};

// Pets
const Pets = {
    pet_slime: { id: 'pet_slime', name: '小史莱姆', rarity: PetRarity.COMMON, attack: 5, attackSpeed: 2, description: '可爱的史莱姆，会自动攻击怪物', emoji: '🟢', price: 500 },
    pet_bat: { id: 'pet_bat', name: '小蝙蝠', rarity: PetRarity.COMMON, attack: 4, attackSpeed: 1.8, description: '夜晚的小蝙蝠，速度很快', emoji: '🦇', price: 400 },
    pet_chick: { id: 'pet_chick', name: '小鸡', rarity: PetRarity.COMMON, attack: 3, attackSpeed: 2.5, description: '可爱的小鸡，偶尔会暴击', emoji: '🐣', price: 450, critRate: 2 },
    pet_rabbit: { id: 'pet_rabbit', name: '小兔子', rarity: PetRarity.COMMON, attack: 6, attackSpeed: 2.2, description: '蹦蹦跳跳的小兔子', emoji: '🐰', price: 480 },
    pet_fire_spirit: { id: 'pet_fire_spirit', name: '火焰精灵', rarity: PetRarity.RARE, attack: 15, attackSpeed: 1.5, description: '火焰精灵，攻击附带燃烧效果', emoji: '🔥', skill: 'burn', price: 1000 },
    pet_ice_fairy: { id: 'pet_ice_fairy', name: '冰霜仙子', rarity: PetRarity.RARE, attack: 12, attackSpeed: 1.8, description: '冰霜仙子，攻击有几率冻结敌人', emoji: '❄️', skill: 'freeze', price: 1000, critRate: 5 },
    pet_wind_sprite: { id: 'pet_wind_sprite', name: '风精灵', rarity: PetRarity.RARE, attack: 10, attackSpeed: 1.2, description: '风精灵，速度极快', emoji: '💨', skill: 'swift', price: 900, critRate: 8 },
    pet_thunder_imp: { id: 'pet_thunder_imp', name: '雷电小鬼', rarity: PetRarity.RARE, attack: 18, attackSpeed: 1.6, description: '雷电小鬼，攻击附带电击', emoji: '⚡', skill: 'shock', price: 1100 },
    pet_flower_fairy: { id: 'pet_flower_fairy', name: '花仙子', rarity: PetRarity.RARE, attack: 8, attackSpeed: 2, description: '花仙子，攻击时微量恢复生命', emoji: '🌸', skill: 'heal', price: 950, healAmount: 5 },
    pet_shadow_cat: { id: 'pet_shadow_cat', name: '暗影猫', rarity: PetRarity.RARE, attack: 14, attackSpeed: 1.4, description: '暗影猫，暴击率较高', emoji: '🐈‍⬛', skill: 'shadow', price: 1050, critRate: 10 },
    pet_star_dragon: { id: 'pet_star_dragon', name: '铜龙', rarity: PetRarity.EPIC, attack: 30, attackSpeed: 1.2, description: '传说中的铜龙，拥有强大的力量', emoji: '🐉', skill: 'star_breath', price: 2000, critRate: 10, critDamage: 0.2 },
    pet_crystal_golem: { id: 'pet_crystal_golem', name: '水晶巨人', rarity: PetRarity.EPIC, attack: 40, attackSpeed: 2.5, description: '水晶巨人，攻击力高但速度慢', emoji: '💎', skill: 'crush', price: 2200 },
    pet_moon_wolf: { id: 'pet_moon_wolf', name: '月光狼', rarity: PetRarity.EPIC, attack: 25, attackSpeed: 1, description: '月光下的狼王，暴击能力强大', emoji: '🐺', skill: 'moon_howl', price: 2100, critRate: 15, critDamage: 0.25 },
    pet_ocean_spirit: { id: 'pet_ocean_spirit', name: '海洋精灵', rarity: PetRarity.EPIC, attack: 22, attackSpeed: 1.3, description: '海洋精灵，攻击时恢复生命', emoji: '🌊', skill: 'tidal', price: 2000, healAmount: 10 },
    pet_forest_guardian: { id: 'pet_forest_guardian', name: '森林守护者', rarity: PetRarity.EPIC, attack: 28, attackSpeed: 1.5, description: '森林守护者，攻防兼备', emoji: '🌲', skill: 'nature', price: 2300, defense: 10 },
    pet_flame_tiger: { id: 'pet_flame_tiger', name: '烈焰虎', rarity: PetRarity.EPIC, attack: 35, attackSpeed: 1.1, description: '烈焰之虎，燃烧一切', emoji: '🐯', skill: 'flame', price: 2400, critRate: 12 },
    pet_frost_fox: { id: 'pet_frost_fox', name: '冰霜狐', rarity: PetRarity.EPIC, attack: 20, attackSpeed: 0.9, description: '冰霜狐，极高的暴击能力', emoji: '🦊', skill: 'frost', price: 2200, critRate: 18, critDamage: 0.3 },
    pet_phoenix: { id: 'pet_phoenix', name: '凤凰', rarity: PetRarity.LEGENDARY, attack: 50, attackSpeed: 1, description: '浴火重生的凤凰', emoji: '🦅', skill: 'rebirth', price: 5000, critRate: 15, critDamage: 0.3 },
    pet_dragon_turtle: { id: 'pet_dragon_turtle', name: '龙龟', rarity: PetRarity.LEGENDARY, attack: 45, attackSpeed: 1.8, description: '龙龟，极其坚固', emoji: '🐢', skill: 'shell', price: 4800, defense: 30, hp: 50 },
    pet_unicorn: { id: 'pet_unicorn', name: '独角兽', rarity: PetRarity.LEGENDARY, attack: 40, attackSpeed: 0.8, description: '神圣独角兽，暴击和治疗兼备', emoji: '🦄', skill: 'holy', price: 5200, critRate: 25, critDamage: 0.4, healAmount: 15 },
    pet_void_serpent: { id: 'pet_void_serpent', name: '虚空蛇', rarity: PetRarity.LEGENDARY, attack: 55, attackSpeed: 1.1, description: '虚空蛇，撕裂空间的力量', emoji: '🐍', skill: 'void', price: 5100, critRate: 20, critDamage: 0.35 },
    pet_celestial_deer: { id: 'pet_celestial_deer', name: '天鹿', rarity: PetRarity.LEGENDARY, attack: 35, attackSpeed: 0.9, description: '天鹿，神圣的治愈之力', emoji: '🦌', skill: 'celestial', price: 5000, critRate: 30, healAmount: 20 },
    pet_thunder_dragon: { id: 'pet_thunder_dragon', name: '雷龙', rarity: PetRarity.LEGENDARY, attack: 60, attackSpeed: 1.2, description: '雷龙，雷霆万钧', emoji: '🐲', skill: 'thunder', price: 5500, critRate: 18, critDamage: 0.35 },
    pet_galaxy_dragon: { id: 'pet_galaxy_dragon', name: '九鼎龙', rarity: PetRarity.MYTHIC, attack: 100, attackSpeed: 0.8, description: '九鼎龙，跨越山河的神兽', emoji: '🌌', skill: 'galaxy_breath', price: 15000, critRate: 30, critDamage: 0.5 },
    pet_primordial_phoenix: { id: 'pet_primordial_phoenix', name: '始祖凤凰', rarity: PetRarity.MYTHIC, attack: 80, attackSpeed: 0.7, description: '始祖凤凰，不死不灭', emoji: '🔥', skill: 'eternal_flame', price: 12000, critRate: 35, critDamage: 0.6, healAmount: 30 },
    pet_chaos_beast: { id: 'pet_chaos_beast', name: '混沌兽', rarity: PetRarity.MYTHIC, attack: 120, attackSpeed: 1, description: '混沌初开时的神兽', emoji: '👹', skill: 'chaos', price: 18000, critRate: 25, critDamage: 0.7 },
    pet_star_goddess_pet: { id: 'pet_star_goddess_pet', name: '灵器使者', rarity: PetRarity.MYTHIC, attack: 90, attackSpeed: 0.6, description: '古器之灵的信使，全能神宠', emoji: '🌟', skill: 'divine', price: 20000, critRate: 40, critDamage: 0.5, healAmount: 25, defense: 20 },
    pet_void_sprite: { id: 'pet_void_sprite', name: '碎瓷小灵', rarity: PetRarity.LEGENDARY, attack: 25, attackSpeed: 1.2, description: '攻击时10%概率使怪物眩晕1秒', emoji: '🌀', skill: 'void_stun', stunChance: 0.1, stunDuration: 1 },
    pet_star_devourer_cub: { id: 'pet_star_devourer_cub', name: '器渊幼崽', rarity: PetRarity.LEGENDARY, attack: 35, attackSpeed: 1.5, description: '攻击时15%概率为玩家回复5HP', emoji: '🐉', skill: 'devourer_heal', healAmount: 5, healChance: 0.15 },
    pet_phantom_hunter: { id: 'pet_phantom_hunter', name: '幻影猎手', rarity: PetRarity.MYTHIC, attack: 45, attackSpeed: 1, description: '攻击时20%概率隐身1秒，期间双倍攻击', emoji: '👻', skill: 'phantom_strike', vanishChance: 0.2, vanishDuration: 1, damageMultiplier: 2 },
    pet_star_mite: { id: 'pet_star_mite', name: '铜锈虫', rarity: PetRarity.UNCOMMON, attack: 2, attackSpeed: 2.8, description: '微小铜锈虫，攻速快但伤害低', emoji: '🐛', price: 200 },
    pet_dust_wisp: { id: 'pet_dust_wisp', name: '尘埃精灵', rarity: PetRarity.UNCOMMON, attack: 3, attackSpeed: 2.5, description: '碎瓷凝聚的小精灵，偶尔暴击', emoji: '💭', price: 250, critRate: 1 },
    pet_world_eater: { id: 'pet_world_eater', name: '噬界虫', rarity: PetRarity.LEGEND_RARE, attack: 160, attackSpeed: 0.6, description: '吞噬山河的巨虫，20%概率造成3倍伤害', emoji: '🐛', price: 50000, critRate: 35, critDamage: 0.8 },
    pet_nebula_serpent: { id: 'pet_nebula_serpent', name: '山河巨蛇', rarity: PetRarity.LEGEND_RARE, attack: 140, attackSpeed: 0.8, description: '每次攻击使目标受伤+5%（最多叠10层）', emoji: '🐍', price: 48000, critRate: 30, critDamage: 0.7 },
    pet_festival_lantern: { id: 'pet_festival_lantern', name: '灯台精灵', rarity: PetRarity.SPECIAL, attack: 100, attackSpeed: 1, description: '场上灵器分数+10%，每5次点击释放灵焰', emoji: '🏮', price: 30000, critRate: 25, critDamage: 0.5 },
    pet_meteor_fox: { id: 'pet_meteor_fox', name: '灵玉狐', rarity: PetRarity.SPECIAL, attack: 95, attackSpeed: 0.9, description: '暴击时留下灵玉，3秒后爆炸100范围伤害', emoji: '🦊', price: 28000, critRate: 35, critDamage: 0.45 }
};

export { PetRarity, Pets };
