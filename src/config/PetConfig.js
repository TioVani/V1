/**
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

// Pets
const Pets = {
    pet_slime: { id: 'pet_slime', name: '铜雀', rarity: PetRarity.COMMON, attack: 5, attackSpeed: 2, description: '青铜器上的雀形小灵，为你自动拾取战场上的灵质碎片和灵币', emoji: '🐦', price: 500 },
    pet_bat: { id: 'pet_bat', name: '墨蝠', rarity: PetRarity.COMMON, attack: 4, attackSpeed: 1.8, description: '书画墨迹凝成的小灵蝠，拾取动作极快', emoji: '🦇', price: 400 },
    pet_chick: { id: 'pet_chick', name: '金乌雏', rarity: PetRarity.COMMON, attack: 3, attackSpeed: 2.5, description: '金乌的雏形——它偶尔在你眼前闪过一道灵光，那就是一次暴击', emoji: '☀️', price: 450, critRate: 2 },
    pet_rabbit: { id: 'pet_rabbit', name: '月兔', rarity: PetRarity.COMMON, attack: 6, attackSpeed: 2.2, description: '玉兔跃过你的灵场，每跳一步多带一份灵币', emoji: '🐰', price: 480 },
    pet_fire_spirit: { id: 'pet_fire_spirit', name: '火羽朱雀', rarity: PetRarity.RARE, attack: 15, attackSpeed: 1.5, description: '朱雀在你的灵场中盘旋，邪灵被灼热灵光持续烫伤', emoji: '🔥', skill: 'burn', price: 1000 },
    pet_ice_fairy: { id: 'pet_ice_fairy', name: '冰魄凤凰', rarity: PetRarity.RARE, attack: 12, attackSpeed: 1.8, description: '冰凤掠过时冻结邪灵的能量流动', emoji: '❄️', skill: 'freeze', price: 1000, critRate: 5 },
    pet_wind_sprite: { id: 'pet_wind_sprite', name: '木灵青龙', rarity: PetRarity.RARE, attack: 10, attackSpeed: 1.2, description: '青龙的吐息在你身上停留，灵场持续修复', emoji: '🐉', skill: 'swift', price: 900, critRate: 8 },
    pet_thunder_imp: { id: 'pet_thunder_imp', name: '金甲麒麟', rarity: PetRarity.RARE, attack: 18, attackSpeed: 1.6, description: '麒麟踏过灵场，重击触发时额外爆发一次灵光', emoji: '⚜️', skill: 'shock', price: 1100 },
    pet_flower_fairy: { id: 'pet_flower_fairy', name: '莲花童子', rarity: PetRarity.RARE, attack: 8, attackSpeed: 2, description: '曼陀罗灵域中绽放的莲花之灵——每开一瓣都是生命力的回响', emoji: '🪷', skill: 'heal', price: 950, healAmount: 5 },
    pet_shadow_cat: { id: 'pet_shadow_cat', name: '巴斯特之影', rarity: PetRarity.RARE, attack: 14, attackSpeed: 1.4, description: '尼罗河冥界的猫灵，潜伏在沙金暗处，偶尔突然出击', emoji: '🐱', skill: 'shadow', price: 1050, critRate: 10 },
    pet_star_dragon: { id: 'pet_star_dragon', name: '应龙', rarity: PetRarity.EPIC, attack: 30, attackSpeed: 1.2, description: '应龙的龙威震慑邪灵，紊乱能量在你面前更难凝聚', emoji: '🐉', skill: 'star_breath', price: 2000, critRate: 10, critDamage: 0.2 },
    pet_crystal_golem: { id: 'pet_crystal_golem', name: '方尖碑灵', rarity: PetRarity.EPIC, attack: 40, attackSpeed: 2.5, description: '尼罗河灵域中方尖碑的精魂——走得慢，但每一击都沉重', emoji: '🗿', skill: 'crush', price: 2200 },
    pet_moon_wolf: { id: 'pet_moon_wolf', name: '芬里尔之息', rarity: PetRarity.EPIC, attack: 25, attackSpeed: 1, description: '极寒灵域中巨狼的残影，在月下暴戾而精准', emoji: '🐺', skill: 'moon_howl', price: 2100, critRate: 15, critDamage: 0.25 },
    pet_ocean_spirit: { id: 'pet_ocean_spirit', name: '恒河莲鲤', rarity: PetRarity.EPIC, attack: 22, attackSpeed: 1.3, description: '曼陀罗灵域河中的灵鲤，游过时修复被紊乱撕裂的部分', emoji: '🐟', skill: 'tidal', price: 2000, healAmount: 10 },
    pet_forest_guardian: { id: 'pet_forest_guardian', name: '世界树之芽', rarity: PetRarity.EPIC, attack: 28, attackSpeed: 1.5, description: '世界树在灵域中的投影——看不见全树，只有一个芽在你身边', emoji: '🌱', skill: 'nature', price: 2300, defense: 10 },
    pet_flame_tiger: { id: 'pet_flame_tiger', name: '斯芬克斯灵', rarity: PetRarity.EPIC, attack: 35, attackSpeed: 1.1, description: '尼罗河冥界的狮身之灵，燃烧的沙金是它的皮肤', emoji: '🦁', skill: 'flame', price: 2400, critRate: 12 },
    pet_frost_fox: { id: 'pet_frost_fox', name: '冰霜巨狼', rarity: PetRarity.EPIC, attack: 20, attackSpeed: 0.9, description: '极寒灵域中的白狼，极夜中唯一的狩猎者', emoji: '🐺', skill: 'frost', price: 2200, critRate: 18, critDamage: 0.3 },
    pet_phoenix: { id: 'pet_phoenix', name: '凤凰', rarity: PetRarity.LEGENDARY, attack: 50, attackSpeed: 1, description: '浴火重生的华夏神禽——每次从紊乱中复出都更强', emoji: '🦅', skill: 'rebirth', price: 5000, critRate: 15, critDamage: 0.3 },
    pet_dragon_turtle: { id: 'pet_dragon_turtle', name: '赑屃', rarity: PetRarity.LEGENDARY, attack: 45, attackSpeed: 1.8, description: '龙生九子中的负重者——天生比任何灵兽都厚重', emoji: '🐢', skill: 'shell', price: 4800, defense: 30, hp: 50 },
    pet_unicorn: { id: 'pet_unicorn', name: '麒麟', rarity: PetRarity.LEGENDARY, attack: 40, attackSpeed: 0.8, description: '麒麟踏灵而来，暴击中带来治愈之力', emoji: '🦄', skill: 'holy', price: 5200, critRate: 25, critDamage: 0.4, healAmount: 15 },
    pet_void_serpent: { id: 'pet_void_serpent', name: '尘世巨蟒', rarity: PetRarity.LEGENDARY, attack: 55, attackSpeed: 1.1, description: '耶梦加得的残影在极寒灵域中沉睡——撕裂空间的，是它的呼吸', emoji: '🐍', skill: 'void', price: 5100, critRate: 20, critDamage: 0.35 },
    pet_celestial_deer: { id: 'pet_celestial_deer', name: '白泽之角', rarity: PetRarity.LEGENDARY, attack: 35, attackSpeed: 0.9, description: '白泽的一只角化作灵物——让你直接看到邪灵的破绽', emoji: '🦌', skill: 'celestial', price: 5000, critRate: 30, healAmount: 20 },
    pet_thunder_dragon: { id: 'pet_thunder_dragon', name: '夔龙', rarity: PetRarity.LEGENDARY, attack: 60, attackSpeed: 1.2, description: '雷泽中的雷兽——一足而立，一吼金雷万钧', emoji: '🐉', skill: 'thunder', price: 5500, critRate: 18, critDamage: 0.35 },
    pet_galaxy_dragon: { id: 'pet_galaxy_dragon', name: '烛龙', rarity: PetRarity.MYTHIC, attack: 100, attackSpeed: 0.8, description: '烛龙盘踞在你的灵场——它睁眼，灵域多了光亮；闭眼，邪灵多了迷惘', emoji: '🐉', skill: 'galaxy_breath', price: 15000, critRate: 30, critDamage: 0.5 },
    pet_primordial_phoenix: { id: 'pet_primordial_phoenix', name: '祖凤', rarity: PetRarity.MYTHIC, attack: 80, attackSpeed: 0.7, description: '凤的祖灵——不死不灭的洪荒之灵', emoji: '🔥', skill: 'eternal_flame', price: 12000, critRate: 35, critDamage: 0.6, healAmount: 30 },
    pet_chaos_beast: { id: 'pet_chaos_beast', name: '贝努鸟灵', rarity: PetRarity.MYTHIC, attack: 120, attackSpeed: 1, description: '尼罗河冥界中与太阳同升的神鸟——每一次日出都是重生', emoji: '🦅', skill: 'chaos', price: 18000, critRate: 25, critDamage: 0.7 },
    pet_star_goddess_pet: { id: 'pet_star_goddess_pet', name: '努特之翼', rarity: PetRarity.MYTHIC, attack: 90, attackSpeed: 0.6, description: '埃及天空女神努特展开的羽翼——从天空俯视时，看到了灵域的全部', emoji: '🌟', skill: 'divine', price: 20000, critRate: 40, critDamage: 0.5, healAmount: 25, defense: 20 },
    pet_void_sprite: { id: 'pet_void_sprite', name: '灵脉小灵', rarity: PetRarity.LEGENDARY, attack: 25, attackSpeed: 1.2, description: '灵脉交叉处偶然产生的小型灵能聚合体——喜欢帮你找到邪灵的破绽', emoji: '✨', skill: 'void_stun', stunChance: 0.1, stunDuration: 1 },
    pet_star_devourer_cub: { id: 'pet_star_devourer_cub', name: '灵脉涡兽', rarity: PetRarity.LEGENDARY, attack: 35, attackSpeed: 1.5, description: '灵脉中小型紊乱涡流的聚合体——吃掉紊乱，吐出治愈', emoji: '🌀', skill: 'devourer_heal', healAmount: 5, healChance: 0.15 },
    pet_phantom_hunter: { id: 'pet_phantom_hunter', name: '玛雅豹灵', rarity: PetRarity.MYTHIC, attack: 45, attackSpeed: 1, description: '丛林灵域中的夜行猎手——隐身的两秒内，它攒着所有没能释放的爆发', emoji: '🐆', skill: 'phantom_strike', vanishChance: 0.2, vanishDuration: 1, damageMultiplier: 2 },
    pet_star_mite: { id: 'pet_star_mite', name: '灵尘虫', rarity: PetRarity.UNCOMMON, attack: 2, attackSpeed: 2.8, description: '最微小的灵能体，数量最多的伴随者——攻速极快', emoji: '🐛', price: 200 },
    pet_dust_wisp: { id: 'pet_dust_wisp', name: '沙灵', rarity: PetRarity.UNCOMMON, attack: 3, attackSpeed: 2.5, description: '尼罗河灵域中的沙金微尘凝聚成的小型伴随灵', emoji: '🏜️', price: 250, critRate: 1 },
    pet_world_eater: { id: 'pet_world_eater', name: '亚历山大虫灵', rarity: PetRarity.LEGEND_RARE, attack: 160, attackSpeed: 0.6, description: '亚历山大图书馆焚毁莎草纸卷散落的灵——不是它吃了世界，是它身上结晶了历史', emoji: '📜', price: 50000, critRate: 35, critDamage: 0.8 },
    pet_nebula_serpent: { id: 'pet_nebula_serpent', name: '羽蛇神之影', rarity: PetRarity.LEGEND_RARE, attack: 140, attackSpeed: 0.8, description: '羽蛇神在灵域中走过留下的残影——不是星空，是丛林上的夜天', emoji: '🐍', price: 48000, critRate: 30, critDamage: 0.7 },
    pet_festival_lantern: { id: 'pet_festival_lantern', name: '灯灵', rarity: PetRarity.SPECIAL, attack: 100, attackSpeed: 1, description: '蜀汉城灵节上无数灯笼的灵汇聚成的伴随灵', emoji: '🏮', price: 30000, critRate: 25, critDamage: 0.5 },
    pet_meteor_fox: { id: 'pet_meteor_fox', name: '天狐', rarity: PetRarity.SPECIAL, attack: 95, attackSpeed: 0.9, description: '浮世灵域中高高跳过的狐灵——经过的地方留下流星，流星过后是爆炸', emoji: '🦊', price: 28000, critRate: 35, critDamage: 0.45 }
};

export { PetRarity, Pets };
