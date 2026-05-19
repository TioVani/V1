/**
 * 技能配置
 * ⚠️ 此文件由 scripts/convert.js 从 data/Skills.xlsx 自动生成
 * 如需修改数据，请编辑 Excel 文件后运行 npm run convert
 */

import { EquipmentRarity } from './EquipmentConfig.js';

const SkillTypes = {
    ATTACK: 'attack',   // 攻击技能
    SUPPORT: 'support', // 辅助技能
    PASSIVE: 'passive'  // 被动技能
};

// Skills
const Skills = {
    skill_fireball: { id: 'skill_fireball', name: '火球术', type: SkillTypes.ATTACK, rarity: EquipmentRarity.RARE, cooldown: 30, description: '发射一个火球造成伤害', emoji: '🔥', effect: 'damage', damage: 100 },
    skill_ice_arrow: { id: 'skill_ice_arrow', name: '冰箭', type: SkillTypes.ATTACK, rarity: EquipmentRarity.RARE, cooldown: 25, description: '射出冰箭穿透敌人', emoji: '🏹', effect: 'damage', damage: 80 },
    skill_lightning: { id: 'skill_lightning', name: '闪电链', type: SkillTypes.ATTACK, rarity: EquipmentRarity.RARE, cooldown: 35, description: '召唤闪电攻击敌人', emoji: '⚡', effect: 'damage', damage: 120 },
    skill_wind_slash: { id: 'skill_wind_slash', name: '风刃', type: SkillTypes.ATTACK, rarity: EquipmentRarity.RARE, cooldown: 28, description: '释放锋利的风刃', emoji: '💨', effect: 'damage', damage: 90 },
    skill_ice_shard: { id: 'skill_ice_shard', name: '冰晶冲击', type: SkillTypes.ATTACK, rarity: EquipmentRarity.EPIC, cooldown: 45, description: '召唤冰晶攻击敌人', emoji: '❄️', effect: 'damage', damage: 200 },
    skill_meteor: { id: 'skill_meteor', name: '陨石坠落', type: SkillTypes.ATTACK, rarity: EquipmentRarity.EPIC, cooldown: 50, description: '召唤陨石从天而降', emoji: '☄️', effect: 'damage', damage: 250 },
    skill_thunder_storm: { id: 'skill_thunder_storm', name: '雷暴', type: SkillTypes.ATTACK, rarity: EquipmentRarity.EPIC, cooldown: 48, description: '召唤雷暴覆盖战场', emoji: '🌩️', effect: 'damage', damage: 220 },
    skill_blizzard: { id: 'skill_blizzard', name: '暴风雪', type: SkillTypes.ATTACK, rarity: EquipmentRarity.EPIC, cooldown: 42, description: '释放冰风暴冻结一切', emoji: '🌨️', effect: 'damage', damage: 180 },
    skill_inferno: { id: 'skill_inferno', name: '地狱火', type: SkillTypes.ATTACK, rarity: EquipmentRarity.EPIC, cooldown: 55, description: '召唤地狱之火焚烧敌人', emoji: '🔥', effect: 'damage', damage: 280 },
    skill_star_burst: { id: 'skill_star_burst', name: '灵爆', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGENDARY, cooldown: 60, description: '引爆灵器之力', emoji: '💥', effect: 'damage', damage: 500 },
    skill_dragon_breath: { id: 'skill_dragon_breath', name: '龙息', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGENDARY, cooldown: 58, description: '释放龙之吐息', emoji: '🐉', effect: 'damage', damage: 450 },
    skill_void_strike: { id: 'skill_void_strike', name: '虚空斩', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGENDARY, cooldown: 55, description: '撕裂虚空的致命一击', emoji: '🌑', effect: 'damage', damage: 400 },
    skill_holy_light: { id: 'skill_holy_light', name: '圣光裁决', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGENDARY, cooldown: 62, description: '神圣之光审判邪恶', emoji: '✝️', effect: 'damage', damage: 480 },
    skill_star_devour: { id: 'skill_star_devour', name: '灵韵吞噬', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGENDARY, cooldown: 50, description: '释放虚空之力攻击，吸取伤害的30%回复生命', emoji: '🌑', effect: 'damage_lifesteal', damage: 500, lifesteal: 0.3 },
    skill_galaxy_burst: { id: 'skill_galaxy_burst', name: '天炉毁灭', type: SkillTypes.ATTACK, rarity: EquipmentRarity.MYTHIC, cooldown: 90, description: '引爆整个天炉的力量', emoji: '🌌', effect: 'damage', damage: 1000 },
    skill_cosmic_annihilation: { id: 'skill_cosmic_annihilation', name: '天地湮灭', type: SkillTypes.ATTACK, rarity: EquipmentRarity.MYTHIC, cooldown: 100, description: '天地终极毁灭之力', emoji: '💀', effect: 'damage', damage: 1200 },
    skill_heal: { id: 'skill_heal', name: '治愈', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.RARE, cooldown: 40, description: '恢复生命值', emoji: '💚', effect: 'heal', heal: 50 },
    skill_shield: { id: 'skill_shield', name: '护盾', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.RARE, cooldown: 35, description: '获得护盾抵挡伤害', emoji: '🛡️', effect: 'shield', shield: 30 },
    skill_speed_up: { id: 'skill_speed_up', name: '加速', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.RARE, cooldown: 45, description: '提升攻击速度', emoji: '👟', effect: 'speed', speedBoost: 1.2, duration: 15 },
    skill_lucky_star: { id: 'skill_lucky_star', name: '幸运符', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.RARE, cooldown: 50, description: '双倍金币掉落', emoji: '🍀', effect: 'gold', duration: 20, goldBonus: 2 },
    skill_time_extend: { id: 'skill_time_extend', name: '时间延长', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.EPIC, cooldown: 60, description: '增加游戏时间', emoji: '⏰', effect: 'time', timeAdd: 10 },
    skill_greater_heal: { id: 'skill_greater_heal', name: '强力治愈', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.EPIC, cooldown: 55, description: '大幅恢复生命值', emoji: '💖', effect: 'heal', heal: 100 },
    skill_iron_skin: { id: 'skill_iron_skin', name: '铁壁', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.EPIC, cooldown: 50, description: '获得护盾和防御提升', emoji: '🏰', effect: 'shield', shield: 60, defense: 20 },
    skill_star_blessing: { id: 'skill_star_blessing', name: '灵器祝福', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.EPIC, cooldown: 60, description: '灵器庇佑，全面提升', emoji: '✨', effect: 'buff', duration: 20, attack: 30, critRate: 10 },
    skill_time_warp: { id: 'skill_time_warp', name: '时空扭曲', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.EPIC, cooldown: 70, description: '扭曲时空，获得时间和速度', emoji: '🌀', effect: 'time', speedBoost: 1.5, timeAdd: 15 },
    skill_divine_shield: { id: 'skill_divine_shield', name: '神圣护盾', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.LEGENDARY, cooldown: 80, description: '神圣护盾，免疫伤害5秒', emoji: '😇', effect: 'shield', shield: 100, immunity: 5 },
    skill_revival: { id: 'skill_revival', name: '复活', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.LEGENDARY, cooldown: 120, description: '死亡时自动复活，恢复50%生命', emoji: '💫', effect: 'revive', revive: true, healPercent: 50 },
    skill_galaxy_blessing: { id: 'skill_galaxy_blessing', name: '鼎纹祝福', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.LEGENDARY, cooldown: 90, description: '鼎纹之力加持，大幅提升属性', emoji: '🌟', effect: 'buff', duration: 30, attack: 50, critRate: 20, critDamage: 0.3 },
    skill_void_hide: { id: 'skill_void_hide', name: '虚空隐匿', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.LEGENDARY, cooldown: 60, description: '消失在虚空中，隐身3秒免疫伤害', emoji: '🌀', effect: 'immunity', immunity: 3 },
    skill_ultimate_invincibility: { id: 'skill_ultimate_invincibility', name: '绝对无敌', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.MYTHIC, cooldown: 150, description: '10秒内免疫一切伤害', emoji: '👑', effect: 'shield', immunity: 10 },
    skill_attack_boost: { id: 'skill_attack_boost', name: '攻击强化', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.RARE, description: '永久增加攻击力', emoji: '⚔️', effect: 'passive', attack: 20 },
    skill_crit_sense: { id: 'skill_crit_sense', name: '暴击感知', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.RARE, description: '永久增加暴击率', emoji: '👁️', effect: 'passive', critRate: 5 },
    skill_gold_finder: { id: 'skill_gold_finder', name: '寻宝者', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.RARE, description: '金币掉落增加50%', emoji: '💰', effect: 'passive', goldBonus: 1.5 },
    skill_exp_boost: { id: 'skill_exp_boost', name: '经验加成', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.RARE, description: '经验获取增加30%', emoji: '📚', effect: 'passive', expBonus: 1.3 },
    skill_crit_master: { id: 'skill_crit_master', name: '暴击精通', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.EPIC, description: '永久增加暴击率', emoji: '🎯', effect: 'passive', critRate: 10 },
    skill_crit_damage_master: { id: 'skill_crit_damage_master', name: '爆伤精通', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.EPIC, description: '永久增加暴击伤害', emoji: '💎', effect: 'passive', critDamage: 0.25 },
    skill_attack_master: { id: 'skill_attack_master', name: '攻击大师', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.EPIC, description: '永久大幅增加攻击力', emoji: '🗡️', effect: 'passive', attack: 40 },
    skill_defense_master: { id: 'skill_defense_master', name: '防御大师', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.EPIC, description: '永久增加防御和生命', emoji: '🛡️', effect: 'passive', defense: 30, hp: 50 },
    skill_star_affinity: { id: 'skill_star_affinity', name: '灵器亲和', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.EPIC, description: '灵器分数增加50%', emoji: '⭐', effect: 'passive', starScoreBonus: 1.5 },
    skill_combo_master: { id: 'skill_combo_master', name: '连击大师', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGENDARY, description: '连击伤害加成提升50%', emoji: '🔗', effect: 'passive', comboBonus: 0.5 },
    skill_berserker: { id: 'skill_berserker', name: '狂战士', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGENDARY, description: '狂暴之力，大幅提升攻击属性', emoji: '😤', effect: 'passive', attack: 80, critRate: 15, critDamage: 0.3 },
    skill_iron_will: { id: 'skill_iron_will', name: '钢铁意志', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGENDARY, description: '钢铁般的意志，全面提升防御', emoji: '🧱', effect: 'passive', shield: 20, defense: 50, hp: 100 },
    skill_fortune_master: { id: 'skill_fortune_master', name: '财富大师', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGENDARY, description: '金币翻倍，掉落率提升', emoji: '🤑', effect: 'passive', goldBonus: 2, dropRate: 1.5 },
    skill_shadow_evasion: { id: 'skill_shadow_evasion', name: '暗影闪避', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGENDARY, description: '受到攻击时20%概率完全闪避', emoji: '👤', effect: 'passive', evasion: 20 },
    skill_galaxy_power: { id: 'skill_galaxy_power', name: '古器之力', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.MYTHIC, description: '古器之力加持，终极属性提升', emoji: '🌌', effect: 'passive', attack: 100, critRate: 25, critDamage: 0.5 },
    skill_omnipotent: { id: 'skill_omnipotent', name: '全能', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.MYTHIC, description: '全能之神，所有属性全面提升', emoji: '🌟', effect: 'passive', goldBonus: 2, attack: 50, critRate: 20, critDamage: 0.4, defense: 50, hp: 100 },
    skill_void_power: { id: 'skill_void_power', name: '虚空之力', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.MYTHIC, description: '虚空之力加持，大幅提升输出能力', emoji: '🌀', effect: 'passive', attack: 60, critRate: 15, critDamage: 0.4 },
    skill_star_spark: { id: 'skill_star_spark', name: '炉火', type: SkillTypes.ATTACK, rarity: EquipmentRarity.UNCOMMON, cooldown: 20, description: '发射微弱炉火，造成少量伤害', emoji: '✨', effect: 'damage', damage: 40 },
    skill_minor_heal: { id: 'skill_minor_heal', name: '微光治愈', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.UNCOMMON, cooldown: 30, description: '微弱灵光治愈，恢复少量生命', emoji: '💚', effect: 'heal', heal: 20 },
    skill_star_sense: { id: 'skill_star_sense', name: '灵觉', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.UNCOMMON, description: '永久增加少量攻击力', emoji: '🌟', effect: 'passive', attack: 8 },
    skill_big_bang: { id: 'skill_big_bang', name: '天地大爆炸', type: SkillTypes.ATTACK, rarity: EquipmentRarity.LEGEND_RARE, cooldown: 120, description: '引爆灵核造成毁灭伤害，眩慕3秒', emoji: '💥', effect: 'damage', damage: 1500 },
    skill_singularity: { id: 'skill_singularity', name: '奇点', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.LEGEND_RARE, cooldown: 180, description: '黑洞奇点，5秒吸收伤害转护盾后反弹50%', emoji: '🌀', effect: 'shield', duration: 5 },
    skill_transcendence: { id: 'skill_transcendence', name: '超越', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.LEGEND_RARE, description: '全属性大幅提升，每击杀10怪永久+1攻击（上限50）', emoji: '🔱', effect: 'passive', attack: 120, critRate: 30, critDamage: 0.6, defense: 60, hp: 120 },
    skill_stardust_parade: { id: 'skill_stardust_parade', name: '碎器巡游', type: SkillTypes.ATTACK, rarity: EquipmentRarity.SPECIAL, cooldown: 90, description: '碎器雨5秒持续伤害，点击碎片额外触发伤害', emoji: '🎇', effect: 'damage', damage: 200, duration: 5 },
    skill_lucky_constellation: { id: 'skill_lucky_constellation', name: '幸运卦象', type: SkillTypes.SUPPORT, rarity: EquipmentRarity.SPECIAL, cooldown: 100, description: '随机卦象祝福（攻击+30%/全回复/时间+10s/金币x3）', emoji: '🎰', effect: 'buff', duration: 15 },
    skill_seasons_blessing: { id: 'skill_seasons_blessing', name: '赛季灵器', type: SkillTypes.PASSIVE, rarity: EquipmentRarity.SPECIAL, description: '赛季期间灵器分数+15%，连击分数+10%', emoji: '🎪', effect: 'passive', comboBonus: 0.1, starScoreBonus: 1.15 }
};

export { SkillTypes, Skills };
