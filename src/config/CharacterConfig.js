/**
 * 角色配置
 * ⚠️ 此文件由 scripts/convert.js 从 data/Characters.xlsx 自动生成
 * 如需修改数据，请编辑 Excel 文件后运行 npm run convert
 */

// Characters
const Characters = {
    starter: { id: 'char_001', name: '玉蝉仙', rarity: 'N', description: '华夏·玉器灵，自带护盾再生，新手的第一位伙伴', hp: 100, hpGrowth: 10, attack: 10, attackGrowth: 2, critRate: 5, critRateGrowth: 1, critDamage: 10, critDamageGrowth: 0.1, mana: 5, manaGrowth: 1, faith: 5, faithGrowth: 1, defense: 5, defenseGrowth: 1, comboThreshold: 10, comboSpeedBonus: 0.05, comboScoreBonus: 0.1, comboTimeout: 1500 },
    warrior: { id: 'char_002', name: '鼎魂', rarity: 'R', description: '华夏·青铜灵，高攻高防，擅长正面战斗', hp: 150, hpGrowth: 15, attack: 50, attackGrowth: 5, critRate: 15, critRateGrowth: 1.5, critDamage: 2, critDamageGrowth: 0.2, mana: 10, manaGrowth: 1, faith: 20, faithGrowth: 2, defense: 20, defenseGrowth: 2, comboThreshold: 5, comboSpeedBonus: 0.08, comboScoreBonus: 0.15, comboTimeout: 1800 },
    mage: { id: 'char_003', name: '青花仙', rarity: 'SR', description: '华夏·瓷器灵，脆皮高暴击，灵气回复快', hp: 80, hpGrowth: 8, attack: 30, attackGrowth: 4, critRate: 20, critRateGrowth: 2, critDamage: 2.5, critDamageGrowth: 0.3, mana: 30, manaGrowth: 3, faith: 25, faithGrowth: 2.5, defense: 8, defenseGrowth: 1, comboThreshold: 8, comboSpeedBonus: 0.06, comboScoreBonus: 0.12, comboTimeout: 1600 },
    archer: { id: 'char_004', name: '剑魄', rarity: 'R', description: '华夏·青铜灵，重击流，蓄力速度+30%', hp: 100, hpGrowth: 10, attack: 60, attackGrowth: 6, critRate: 25, critRateGrowth: 2, critDamage: 2.2, critDamageGrowth: 0.2, mana: 15, manaGrowth: 1.5, faith: 15, faithGrowth: 1.5, defense: 10, defenseGrowth: 1, comboThreshold: 7, comboSpeedBonus: 0.07, comboScoreBonus: 0.13, comboTimeout: 1700 },
    dragon_knight: { id: 'char_005', name: '水墨仙', rarity: 'SSR', description: '华夏·书画灵，控制型，减速邪灵', hp: 200, hpGrowth: 20, attack: 80, attackGrowth: 8, critRate: 30, critRateGrowth: 3, critDamage: 3, critDamageGrowth: 0.3, mana: 20, manaGrowth: 2, faith: 30, faithGrowth: 3, defense: 35, defenseGrowth: 3, comboThreshold: 6, comboSpeedBonus: 0.1, comboScoreBonus: 0.2, comboTimeout: 2000 },
    goddess: { id: 'char_006', name: '金乌', rarity: 'UR', description: '华夏·金银灵，灵币加成，掉落翻倍', hp: 300, hpGrowth: 30, attack: 120, attackGrowth: 12, critRate: 40, critRateGrowth: 4, critDamage: 4, critDamageGrowth: 0.4, mana: 50, manaGrowth: 5, faith: 50, faithGrowth: 5, defense: 50, defenseGrowth: 4, comboThreshold: 4, comboSpeedBonus: 0.12, comboScoreBonus: 0.25, comboTimeout: 2200 },
    assassin: { id: 'char_007', name: '冰裂使', rarity: 'SR', description: '华夏·瓷器灵，高暴击，冰属性攻击', hp: 90, hpGrowth: 9, attack: 70, attackGrowth: 7, critRate: 35, critRateGrowth: 3, critDamage: 3.5, critDamageGrowth: 0.35, mana: 12, manaGrowth: 1.2, faith: 18, faithGrowth: 1.8, defense: 8, defenseGrowth: 0.8, comboThreshold: 5, comboSpeedBonus: 0.09, comboScoreBonus: 0.18, comboTimeout: 1400 },
    guardian: { id: 'char_008', name: '璧灵', rarity: 'R', description: '华夏·玉器灵，均衡型，自带护盾', hp: 250, hpGrowth: 25, attack: 25, attackGrowth: 2.5, critRate: 8, critRateGrowth: 0.8, critDamage: 1.5, critDamageGrowth: 0.15, mana: 15, manaGrowth: 1.5, faith: 25, faithGrowth: 2.5, defense: 50, defenseGrowth: 5, comboThreshold: 12, comboSpeedBonus: 0.04, comboScoreBonus: 0.08, comboTimeout: 2000 },
    summoner: { id: 'char_009', name: '云锦仙', rarity: 'SSR', description: '华夏·织绣灵，辅助型，团队增益', hp: 110, hpGrowth: 11, attack: 55, attackGrowth: 5.5, critRate: 22, critRateGrowth: 2.2, critDamage: 2.8, critDamageGrowth: 0.28, mana: 40, manaGrowth: 4, faith: 35, faithGrowth: 3.5, defense: 15, defenseGrowth: 1.5, comboThreshold: 7, comboSpeedBonus: 0.08, comboScoreBonus: 0.15, comboTimeout: 1650 },
    berserker: { id: 'char_010', name: '狂草客', rarity: 'SSR', description: '华夏·书画灵，控制型，封印邪灵', hp: 180, hpGrowth: 18, attack: 100, attackGrowth: 10, critRate: 28, critRateGrowth: 2.8, critDamage: 3.2, critDamageGrowth: 0.32, mana: 8, manaGrowth: 0.8, faith: 15, faithGrowth: 1.5, defense: 12, defenseGrowth: 1.2, comboThreshold: 4, comboSpeedBonus: 0.11, comboScoreBonus: 0.22, comboTimeout: 1500 },
    saint: { id: 'char_011', name: '鎏光使', rarity: 'UR', description: '华夏·金银灵，灵币加成，暴击掉落', hp: 150, hpGrowth: 15, attack: 90, attackGrowth: 9, critRate: 35, critRateGrowth: 3.5, critDamage: 4.5, critDamageGrowth: 0.45, mana: 60, manaGrowth: 6, faith: 60, faithGrowth: 6, defense: 25, defenseGrowth: 2.5, comboThreshold: 5, comboSpeedBonus: 0.1, comboScoreBonus: 0.2, comboTimeout: 1800 },
    ninja: { id: 'char_012', name: '仕女魂', rarity: 'SR', description: '华夏·书画灵，辅助型，团队灵力回复', hp: 85, hpGrowth: 8.5, attack: 65, attackGrowth: 6.5, critRate: 32, critRateGrowth: 3.2, critDamage: 2.8, critDamageGrowth: 0.28, mana: 10, manaGrowth: 1, faith: 20, faithGrowth: 2, defense: 6, defenseGrowth: 0.6, comboThreshold: 3, comboSpeedBonus: 0.15, comboScoreBonus: 0.16, comboTimeout: 1200 },
    priest: { id: 'char_013', name: '琮灵', rarity: 'R', description: '华夏·玉器灵，均衡型，灵力回复快', hp: 120, hpGrowth: 12, attack: 35, attackGrowth: 3.5, critRate: 12, critRateGrowth: 1.2, critDamage: 1.8, critDamageGrowth: 0.18, mana: 25, manaGrowth: 2.5, faith: 40, faithGrowth: 4, defense: 12, defenseGrowth: 1.2, comboThreshold: 9, comboSpeedBonus: 0.05, comboScoreBonus: 0.11, comboTimeout: 1700 },
    paladin: { id: 'char_014', name: '镜灵', rarity: 'SR', description: '华夏·青铜灵，重击流，满蓄额外触发灵光', hp: 200, hpGrowth: 20, attack: 45, attackGrowth: 4.5, critRate: 18, critRateGrowth: 1.8, critDamage: 2.3, critDamageGrowth: 0.23, mana: 20, manaGrowth: 2, faith: 35, faithGrowth: 3.5, defense: 30, defenseGrowth: 3, comboThreshold: 7, comboSpeedBonus: 0.07, comboScoreBonus: 0.14, comboTimeout: 1750 },
    hunter: { id: 'char_015', name: '银蟾', rarity: 'R', description: '华夏·金银灵，灵币加成，净化额外掉落', hp: 95, hpGrowth: 9.5, attack: 55, attackGrowth: 5.5, critRate: 22, critRateGrowth: 2.2, critDamage: 2.4, critDamageGrowth: 0.24, mana: 8, manaGrowth: 0.8, faith: 12, faithGrowth: 1.2, defense: 10, defenseGrowth: 1, comboThreshold: 6, comboSpeedBonus: 0.08, comboScoreBonus: 0.13, comboTimeout: 1550 },
    witch: { id: 'char_016', name: '釉里红', rarity: 'SSR', description: '华夏·瓷器灵，高暴击，火属性攻击', hp: 75, hpGrowth: 7.5, attack: 85, attackGrowth: 8.5, critRate: 38, critRateGrowth: 3.8, critDamage: 4, critDamageGrowth: 0.4, mana: 45, manaGrowth: 4.5, faith: 30, faithGrowth: 3, defense: 5, defenseGrowth: 0.5, comboThreshold: 4, comboSpeedBonus: 0.12, comboScoreBonus: 0.22, comboTimeout: 1300 },
    monk: { id: 'char_017', name: '缂丝娘', rarity: 'SR', description: '华夏·织绣灵，辅助型，全队防御提升', hp: 140, hpGrowth: 14, attack: 65, attackGrowth: 6.5, critRate: 28, critRateGrowth: 2.8, critDamage: 2.6, critDamageGrowth: 0.26, mana: 5, manaGrowth: 0.5, faith: 10, faithGrowth: 1, defense: 18, defenseGrowth: 1.8, comboThreshold: 4, comboSpeedBonus: 0.1, comboScoreBonus: 0.17, comboTimeout: 1400 },
    elementalist: { id: 'char_018', name: '苏绣魂', rarity: 'SSR', description: '华夏·织绣灵，辅助型，全队攻击提升', hp: 90, hpGrowth: 9, attack: 75, attackGrowth: 7.5, critRate: 25, critRateGrowth: 2.5, critDamage: 3.5, critDamageGrowth: 0.35, mana: 50, manaGrowth: 5, faith: 40, faithGrowth: 4, defense: 10, defenseGrowth: 1, comboThreshold: 6, comboSpeedBonus: 0.09, comboScoreBonus: 0.18, comboTimeout: 1600 },
    necromancer: { id: 'char_019', name: '掷铁饼者', rarity: 'SSR', description: '希腊·追求完美人体，暴击时驱逐邪灵增益', hp: 100, hpGrowth: 10, attack: 80, attackGrowth: 8, critRate: 30, critRateGrowth: 3, critDamage: 3.8, critDamageGrowth: 0.38, mana: 35, manaGrowth: 3.5, faith: 15, faithGrowth: 1.5, defense: 8, defenseGrowth: 0.8, comboThreshold: 5, comboSpeedBonus: 0.11, comboScoreBonus: 0.2, comboTimeout: 1450 },
    chronomancer: { id: 'char_020', name: '罗塞塔石碑灵', rarity: 'UR', description: '埃及·破译文明密码，可复制邪灵技能', hp: 130, hpGrowth: 13, attack: 100, attackGrowth: 10, critRate: 38, critRateGrowth: 3.8, critDamage: 5, critDamageGrowth: 0.5, mana: 55, manaGrowth: 5.5, faith: 50, faithGrowth: 5, defense: 20, defenseGrowth: 2, comboThreshold: 3, comboSpeedBonus: 0.14, comboScoreBonus: 0.28, comboTimeout: 1100 },
    wanderer: { id: 'char_021', name: '圣甲虫使', rarity: 'N', description: '埃及·圣甲虫化身，沙金之力', hp: 110, hpGrowth: 11, attack: 15, attackGrowth: 1.5, critRate: 8, critRateGrowth: 0.8, critDamage: 8, critDamageGrowth: 0.08, mana: 8, manaGrowth: 0.8, faith: 8, faithGrowth: 0.8, defense: 8, defenseGrowth: 0.8, comboThreshold: 11, comboSpeedBonus: 0.04, comboScoreBonus: 0.09, comboTimeout: 1600 },
    alchemist: { id: 'char_022', name: '法老金棺', rarity: 'SR', description: '埃及·诅咒叠层，凋零倒计时', hp: 105, hpGrowth: 10.5, attack: 50, attackGrowth: 5, critRate: 20, critRateGrowth: 2, critDamage: 3, critDamageGrowth: 0.3, mana: 30, manaGrowth: 3, faith: 28, faithGrowth: 2.8, defense: 12, defenseGrowth: 1.2, comboThreshold: 8, comboSpeedBonus: 0.06, comboScoreBonus: 0.15, comboTimeout: 1650 },
    vampire: { id: 'char_023', name: '世界蛇·耶梦加得', rarity: 'SSR', description: '北欧·毒雾扩散，缠绕邪灵', hp: 160, hpGrowth: 16, attack: 70, attackGrowth: 7, critRate: 32, critRateGrowth: 3.2, critDamage: 3.3, critDamageGrowth: 0.33, mana: 15, manaGrowth: 1.5, faith: 5, faithGrowth: 0.5, defense: 15, defenseGrowth: 1.5, comboThreshold: 5, comboSpeedBonus: 0.1, comboScoreBonus: 0.19, comboTimeout: 1500 },
    celestial: { id: 'char_024', name: '羽蛇神', rarity: 'UR', description: '玛雅·时间回溯，星辰陨落', hp: 280, hpGrowth: 28, attack: 130, attackGrowth: 13, critRate: 45, critRateGrowth: 4.5, critDamage: 5.5, critDamageGrowth: 0.55, mana: 70, manaGrowth: 7, faith: 70, faithGrowth: 7, defense: 40, defenseGrowth: 4, comboThreshold: 2, comboSpeedBonus: 0.16, comboScoreBonus: 0.3, comboTimeout: 1000 },
    void_emperor: { id: 'char_025', name: '青铜鼎灵', rarity: 'LR', description: '华夏·守护灵，分裂、封印、灵压场', hp: 400, hpGrowth: 40, attack: 170, attackGrowth: 17, critRate: 50, critRateGrowth: 5, critDamage: 7, critDamageGrowth: 0.7, mana: 80, manaGrowth: 8, faith: 80, faithGrowth: 8, defense: 60, defenseGrowth: 6, comboThreshold: 2, comboSpeedBonus: 0.18, comboScoreBonus: 0.35, comboTimeout: 900 },
    stellar_wanderer: { id: 'char_026', name: '雅典娜神像', rarity: 'SP', description: '希腊·奥林匹斯守护神，雷电裁决', hp: 260, hpGrowth: 26, attack: 135, attackGrowth: 13.5, critRate: 42, critRateGrowth: 4.2, critDamage: 5.5, critDamageGrowth: 0.55, mana: 65, manaGrowth: 6.5, faith: 65, faithGrowth: 6.5, defense: 45, defenseGrowth: 4.5, comboThreshold: 3, comboSpeedBonus: 0.15, comboScoreBonus: 0.3, comboTimeout: 1050 }
};


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
}

export { Characters, getCharacterKey };
