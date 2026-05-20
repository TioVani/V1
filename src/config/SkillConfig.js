/**
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

// Skills
const Skills = {
    skill_fireball: { id: 'skill_fireball', name: '火灵光·迸发', type: SkillTypes.ATTACK, rarity: EquipmentRarity.RARE, cooldown: 30, description: '火行灵光在触碰点引爆，灼烧邪灵的紊乱能量层', emoji: '🔥', effect: 'damage', damage: 100 },
    skill_ice_arrow: { id: 'skill_ice_arrow', name: '水灵光·穿透', type: SkillTypes.ATTACK, rarity: EquipmentRarity.RARE, cooldown: 25, description: '凝聚水行灵光为一线，穿透邪灵的能量外壳', emoji: '🏹', effect: 'damage', damage: 80 },
    skill_lightning: { id: 'skill_lightning', name: '金灵光·链击', type: SkillTypes.ATTACK, rarity: EquipmentRarity.RARE, cooldown: 35, description: '金行灵光在邪灵之间跳跃传导，紊乱能量加速了传导', emoji: '⚡', effect: 'damage', damage: 120 },
    skill_wind_slash: { id: 'skill_wind_slash', name: '木灵光·刃舞', type: SkillTypes.ATTACK, rarity: EquipmentRarity.RARE, cooldown: 28, description: '木行灵光在邪灵群中弹射切割', emoji: '💨', effect: 'damage', damage: 90 },
    skill_ice_shard: { id: 'skill_ice_shard', name: '水灵光·冲击', type: SkillTypes.ATTACK, rarity: EquipmentRarity.EPIC, cooldown: 45, description: '凝聚水行灵光直接冲击邪灵的紊乱核心', emoji: '💧', effect: 'damage', damage: 200 },
    skill_meteor: { id: 'skill_meteor', name: '土灵光·沉坠', type: SkillTypes.ATTACK, rarity: EquipmentRarity.EPIC, cooldown: 50, description: '土行灵光从天而降，以厚重压碎邪灵的屏障', emoji: '☄️', effect: 'damage', damage: 250 },
    skill_thunder_storm: { id: 'skill_thunder_storm', name: '金灵光·雷暴', type: SkillTypes.ATTACK, rarity: EquipmentRarity.EPIC, cooldown: 48, description: '金行灵光在战场上形成密集的高频能场', emoji: '🌩️', effect: 'damage', damage: 220 },
    skill_blizzard: { id: 'skill_blizzard', name: '水灵光·暴雪', type: SkillTypes.ATTACK, rarity: EquipmentRarity.EPIC, cooldown: 42, description: '水行灵光冻结一大片邪灵的活动', emoji: '🌨️', effect: 'damage', damage: 180 },
    skill_inferno: { id: 'skill_inferno', name: '火灵光·燎原', type: SkillTypes.ATTACK, rarity: EquipmentRarity.EPIC, cooldown: 55, description: '火行灵光在战场蔓延，持续灼烧邪灵', emoji: '🔥', effect: 'damage', damage: 280 },
    skill_star_burst: { id: 'skill_star_burst', name: '灵光爆发', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGENDARY, cooldown: 60, description: '积蓄的灵能在瞬间释放，一次性冲击全场邪灵', emoji: '💥', effect: 'damage', damage: 500 },
    skill_dragon_breath: { id: 'skill_dragon_breath', name: '鼎纹龙息', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGENDARY, cooldown: 58, description: '龙纹鼎灵的古灵之力——将沉睡的龙威转化为一次灵光吐息', emoji: '🐉', effect: 'damage', damage: 450 },
    skill_void_strike: { id: 'skill_void_strike', name: '灵脉共振', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGENDARY, cooldown: 55, description: '利用灵脉的能量共振传递攻击，穿过邪灵的物质屏障', emoji: '🌑', effect: 'damage', damage: 400 },
    skill_holy_light: { id: 'skill_holy_light', name: '乾元灵光·裁决', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGENDARY, cooldown: 62, description: '高纯度灵光直射邪灵的紊乱核心——秩序排斥混乱', emoji: '✨', effect: 'damage', damage: 480 },
    skill_star_devour: { id: 'skill_star_devour', name: '灵光同调', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGENDARY, cooldown: 50, description: '与邪灵的紊乱能量建立短暂共振，抽取其中残余的有序灵能修复自身', emoji: '🌑', effect: 'damage_lifesteal', damage: 500, lifesteal: 0.3 },
    skill_galaxy_burst: { id: 'skill_galaxy_burst', name: '灵光洪流', type: SkillTypes.ATTACK, rarity: EquipmentRarity.MYTHIC, cooldown: 90, description: '积满释放的全部灵能化为一次覆盖全场的冲击', emoji: '🔮', effect: 'damage', damage: 1000 },
    skill_cosmic_annihilation: { id: 'skill_cosmic_annihilation', name: '归一灵光', type: SkillTypes.ATTACK, rarity: EquipmentRarity.MYTHIC, cooldown: 100, description: '五灵光汇聚于一点，彻底瓦解大型邪灵的能量结构', emoji: '🔻', effect: 'damage', damage: 1200 },
    skill_heal: { id: 'skill_heal', name: '愈灵光', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.RARE, cooldown: 40, description: '灵光抚过身体，修复紊乱能量造成的侵蚀', emoji: '💚', effect: 'heal', heal: 50 },
    skill_shield: { id: 'skill_shield', name: '守灵光', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.RARE, cooldown: 35, description: '凝聚一层灵光幕，短暂阻隔邪灵的攻击', emoji: '🛡️', effect: 'shield', shield: 30 },
    skill_speed_up: { id: 'skill_speed_up', name: '迅灵光', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.RARE, cooldown: 45, description: '灵光加持，操作节奏被短暂提升', emoji: '👟', effect: 'speed', speedBoost: 1.2, duration: 15 },
    skill_lucky_star: { id: 'skill_lucky_star', name: '金运灵光·赐福', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.RARE, cooldown: 50, description: '金运灵光在战场上停留期间，掉落的灵币增加', emoji: '🍀', effect: 'gold', duration: 20, goldBonus: 2 },
    skill_time_extend: { id: 'skill_time_extend', name: '时序灵光·延续', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.EPIC, cooldown: 60, description: '时序灵光拉伸了此地的灵场，战斗得以延长', emoji: '⏰', effect: 'time', timeAdd: 10 },
    skill_greater_heal: { id: 'skill_greater_heal', name: '大愈灵光', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.EPIC, cooldown: 55, description: '积蓄更多灵能进行一次深层修复', emoji: '💖', effect: 'heal', heal: 100 },
    skill_iron_skin: { id: 'skill_iron_skin', name: '青铜灵光·坚壁', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.EPIC, cooldown: 50, description: '鼎魂的古灵共鸣——将灵光化作坚不可摧的防御层', emoji: '🏰', effect: 'shield', shield: 60, defense: 20 },
    skill_star_blessing: { id: 'skill_star_blessing', name: '文昌灵光·开运', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.EPIC, cooldown: 60, description: '书画之灵的共鸣让你更易触发连灵', emoji: '✨', effect: 'buff', duration: 20, attack: 30, critRate: 10 },
    skill_time_warp: { id: 'skill_time_warp', name: '时序灵光·折叠', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.EPIC, cooldown: 70, description: '时序灵光在灵场中折叠，同时延长时间与加速', emoji: '🌀', effect: 'time', speedBoost: 1.5, timeAdd: 15 },
    skill_divine_shield: { id: 'skill_divine_shield', name: '玉蝉灵光·羽化', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.LEGENDARY, cooldown: 80, description: '玉蝉仙的古灵共鸣——以玉蝉的灵能完全隔绝外界冲击威力', emoji: '🛡️', effect: 'shield', shield: 100, immunity: 5 },
    skill_revival: { id: 'skill_revival', name: '灵核归位', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.LEGENDARY, cooldown: 120, description: '被紊乱能量压垮后，古灵强行将你的灵核推回原位', emoji: '💫', effect: 'revive', revive: true, healPercent: 50 },
    skill_galaxy_blessing: { id: 'skill_galaxy_blessing', name: '万灵共鸣', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.LEGENDARY, cooldown: 90, description: '八座灵域的灵脉短暂共振，所有古灵同时增幅你', emoji: '🌟', effect: 'buff', duration: 30, attack: 50, critRate: 20, critDamage: 0.3 },
    skill_void_hide: { id: 'skill_void_hide', name: '灵隙潜行', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.LEGENDARY, cooldown: 60, description: '钻进灵域中两条灵脉之间的微小裂隙——邪灵暂时发现不了你', emoji: '🌀', effect: 'immunity', immunity: 3 },
    skill_ultimate_invincibility: { id: 'skill_ultimate_invincibility', name: '灵域屏障', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.MYTHIC, cooldown: 150, description: '在周身制造一层微型灵域屏障——与外界暂时隔绝能量交换', emoji: '👑', effect: 'shield', immunity: 10 },
    skill_attack_boost: { id: 'skill_attack_boost', name: '灵光亲和', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.RARE, description: '与古灵的意义连接加深，灵光冲击威力永久提升', emoji: '⚔️', effect: 'passive', attack: 20 },
    skill_crit_sense: { id: 'skill_crit_sense', name: '会心感应', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.RARE, description: '对邪灵紊乱核心的感知力增强', emoji: '👁️', effect: 'passive', critRate: 5 },
    skill_gold_finder: { id: 'skill_gold_finder', name: '灵质引力', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.RARE, description: '灵场对灵质碎片的吸附力增强', emoji: '💰', effect: 'passive', goldBonus: 1.5 },
    skill_exp_boost: { id: 'skill_exp_boost', name: '灵脉领悟', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.RARE, description: '在灵域中的深入探索让你对灵脉的理解加速', emoji: '📚', effect: 'passive', expBonus: 1.3 },
    skill_crit_master: { id: 'skill_crit_master', name: '会心贯通', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.EPIC, description: '对邪灵紊乱核心的精确直觉大幅提升', emoji: '🔮', effect: 'passive', critRate: 10 },
    skill_crit_damage_master: { id: 'skill_crit_damage_master', name: '暴击会心', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.EPIC, description: '直击紊乱核心造成的破坏更大', emoji: '🪨', effect: 'passive', critDamage: 0.25 },
    skill_attack_master: { id: 'skill_attack_master', name: '灵光驾驭', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.EPIC, description: '灵光的掌控力大幅提升', emoji: '🗡️', effect: 'passive', attack: 40 },
    skill_defense_master: { id: 'skill_defense_master', name: '灵域护体', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.EPIC, description: '更善于将残余灵能转化为身体防御', emoji: '🛡️', effect: 'passive', defense: 30, hp: 50 },
    skill_star_affinity: { id: 'skill_star_affinity', name: '灵场亲和', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.EPIC, description: '灵场更自然地吸引周围灵光', emoji: '⭐', effect: 'passive', starScoreBonus: 1.5 },
    skill_combo_master: { id: 'skill_combo_master', name: '连灵精通', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGENDARY, description: '连灵灵光更容易触发', emoji: '🔗', effect: 'passive', comboBonus: 0.5 },
    skill_berserker: { id: 'skill_berserker', name: '鼎纹战意', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGENDARY, description: '龙纹鼎灵的古灵共鸣——战斗中更忘我', emoji: '😤', effect: 'passive', attack: 80, critRate: 15, critDamage: 0.3 },
    skill_iron_will: { id: 'skill_iron_will', name: '剑魄意志', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGENDARY, description: '剑魄的古灵共鸣——紊乱能量更难撼动你', emoji: '🧱', effect: 'passive', shield: 20, defense: 50, hp: 100 },
    skill_fortune_master: { id: 'skill_fortune_master', name: '金乌赐福', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGENDARY, description: '金乌灵盘旋期间，掉落灵币显著增加', emoji: '🤑', effect: 'passive', goldBonus: 2, dropRate: 1.5 },
    skill_shadow_evasion: { id: 'skill_shadow_evasion', name: '玉蝉蜕壳', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGENDARY, description: '玉蝉仙的古灵共鸣——紊乱能量有时会从你身边滑过', emoji: '👤', effect: 'passive', evasion: 20 },
    skill_galaxy_power: { id: 'skill_galaxy_power', name: '全灵共鸣', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.MYTHIC, description: '所有已连接古灵的灵脉共振达到最高', emoji: '🔮', effect: 'passive', attack: 100, critRate: 25, critDamage: 0.5 },
    skill_omnipotent: { id: 'skill_omnipotent', name: '唤灵贯通', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.MYTHIC, description: '跨越八座灵域的唤灵人——所有古灵的力量在你身上交汇', emoji: '🌟', effect: 'passive', goldBonus: 2, attack: 50, critRate: 20, critDamage: 0.4, defense: 50, hp: 100 },
    skill_void_power: { id: 'skill_void_power', name: '灵脉之力', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.MYTHIC, description: '对灵脉本身的理解加深——灵脉的碎片为你所用', emoji: '🌀', effect: 'passive', attack: 60, critRate: 15, critDamage: 0.4 },
    skill_star_spark: { id: 'skill_star_spark', name: '微灵光', type: SkillTypes.ATTACK, rarity: EquipmentRarity.UNCOMMON, cooldown: 20, description: '最基础的灵光投射，古灵以最微弱的共鸣协助', emoji: '✨', effect: 'damage', damage: 40 },
    skill_minor_heal: { id: 'skill_minor_heal', name: '微愈灵光', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.UNCOMMON, cooldown: 30, description: '最基础的灵光修复', emoji: '💚', effect: 'heal', heal: 20 },
    skill_star_sense: { id: 'skill_star_sense', name: '灵感', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.UNCOMMON, description: '对灵光的直觉提高了', emoji: '🌟', effect: 'passive', attack: 8 },
    skill_big_bang: { id: 'skill_big_bang', name: '源灵回响', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGEND_RARE, cooldown: 120, description: '模拟大地之源灵域的第一次意义投射——不是毁灭的爆炸，是意义被赋予时的回响', emoji: '💥', effect: 'damage', damage: 1500 },
    skill_singularity: { id: 'skill_singularity', name: '灵脉奇点', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.LEGEND_RARE, cooldown: 180, description: '灵脉中特定的共振节点——吸收冲击威力、储存能量、然后反弹', emoji: '🌀', effect: 'shield', duration: 5 },
    skill_transcendence: { id: 'skill_transcendence', name: '灵域行者', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGEND_RARE, description: '跨越多座灵域的历练使灵场自然强化——每一条新灵脉都是新的能量来源', emoji: '🔱', effect: 'passive', attack: 120, critRate: 30, critDamage: 0.6, defense: 60, hp: 120 },
    skill_stardust_parade: { id: 'skill_stardust_parade', name: '星尘灵光·巡游', type: SkillTypes.ATTACK, rarity: EquipmentRarity.SPECIAL, cooldown: 90, description: '一连串微小灵光持续追打邪灵，压制紊乱波动', emoji: '🎇', effect: 'damage', damage: 200, duration: 5 },
    skill_lucky_constellation: { id: 'skill_lucky_constellation', name: '文曲灵光·星阵', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.SPECIAL, cooldown: 100, description: '古灵在灵场上划出的短暂祝福区域', emoji: '🔮', effect: 'buff', duration: 15 },
    skill_seasons_blessing: { id: 'skill_seasons_blessing', name: '赛季灵场', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.SPECIAL, description: '在本赛季的灵域主题下，灵场与灵域更加契合', emoji: '🎪', effect: 'passive', comboBonus: 0.1, starScoreBonus: 1.15 }
};

export { SkillTypes, Skills };

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

export { getSkillAttackRatio };
