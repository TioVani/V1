/**
 * 融合系统策略级测试（不需要模拟器）
 * 直接测试5种融合策略的核心流程
 */
var path = require('path');
var mods = require(path.resolve(__dirname, '../../../dist/game-modules.js'));

console.log('=== 融合系统策略测试 ===\n');

// 准备测试数据（每项至少2份：1份自用 + 多余的可融合）
var pd = {
    ownedCharacters: ['char_001', 'char_001', 'char_002', 'char_002', 'char_003', 'char_003'],
    characterExperience: {
        'char_001': { level: 10, exp: 0, maxExp: 100 },
        'char_002': { level: 10, exp: 0, maxExp: 100 },
        'char_003': { level: 10, exp: 0, maxExp: 100 }
    },
    pets: {
        owned: [
            { uid: 'pet_1', id: 'pet_fire_spirit', level: 1 },
            { uid: 'pet_1b', id: 'pet_fire_spirit', level: 1 },
            { uid: 'pet_2', id: 'pet_ice_fairy', level: 1 },
            { uid: 'pet_2b', id: 'pet_ice_fairy', level: 1 },
            { uid: 'pet_3', id: 'pet_wind_sprite', level: 1 },
            { uid: 'pet_3b', id: 'pet_wind_sprite', level: 1 }
        ]
    },
    skills: {
        owned: [
            { uid: 'sk_1', id: 'skill_fireball', level: 1 },
            { uid: 'sk_1b', id: 'skill_fireball', level: 1 },
            { uid: 'sk_2', id: 'skill_ice_arrow', level: 1 },
            { uid: 'sk_2b', id: 'skill_ice_arrow', level: 1 },
            { uid: 'sk_3', id: 'skill_lightning', level: 1 },
            { uid: 'sk_3b', id: 'skill_lightning', level: 1 }
        ]
    },
    equipments: {
        owned: [
            { uid: 'eq_1', id: 'sword_2', level: 1 },
            { uid: 'eq_1b', id: 'sword_2', level: 1 },
            { uid: 'eq_2', id: 'staff_1', level: 1 },
            { uid: 'eq_2b', id: 'staff_1', level: 1 },
            { uid: 'eq_3', id: 'ice_staff', level: 1 },
            { uid: 'eq_3b', id: 'ice_staff', level: 1 }
        ]
    },
    unlockedStarTypes: ['ice', 'fire', 'thunder'],
    fusionData: {
        pityCount: {}, codex: {}, history: [],
        stats: { totalAttempts: 0, totalSuccesses: 0, totalGreatSuccesses: 0 },
        fusionStars: []
    },
    fusionResults: {}
};

var pass = 0, fail = 0;
function check(label, condition) {
    if (condition) { console.log('  PASS: ' + label); pass++; }
    else { console.log('  FAIL: ' + label); fail++; }
}

// ============================================================
// 1. 角色融合
// ============================================================
console.log('--- 1. 角色融合（共进）---');
var charStrategy = mods.createFusionCharacterStrategy({
    getPlayerData: function() { return pd; },
    getCharacters: function() { return mods.Characters; }
});

var charAvail = charStrategy.getAvailableMaterials(pd);
check('可用角色 >= 3', charAvail.length >= 3);

if (charAvail.length >= 3) {
    var charIds = [charAvail[0].id, charAvail[1].id, charAvail[2].id];
    var charResolved = charStrategy.resolveMaterials(charIds, pd);
    check('resolveMaterials 成功', charResolved !== null && charResolved.length === 3);

    if (charResolved) {
        var charResult = charStrategy.produce(charResolved, 'normal', false);
        check('produce 产出角色', charResult && charResult.name && charResult.rarity);

        charStrategy.saveResult(charResult, pd);
        check('ownedCharacters 增加', pd.ownedCharacters.indexOf(charResult.id) >= 0);
        check('配置表已注册', !!mods.Characters[charResult.id]);
        check('fusionResults 已记录', !!pd.fusionResults[charResult.id]);
    }
}

// ============================================================
// 2. 宠物融合
// ============================================================
console.log('\n--- 2. 宠物融合（超然）---');
var petStrategy = mods.createFusionPetStrategy({
    getPlayerData: function() { return pd; },
    getPets: function() { return mods.Pets; }
});

var petAvail = petStrategy.getAvailableMaterials(pd);
check('可用宠物 >= 3', petAvail.length >= 3);

if (petAvail.length >= 3) {
    var petIds = [petAvail[0].uid, petAvail[1].uid, petAvail[2].uid];
    var petResolved = petStrategy.resolveMaterials(petIds, pd);
    check('resolveMaterials 成功', petResolved !== null);

    if (petResolved) {
        var petResult = petStrategy.produce(petResolved, 'normal', false);
        check('produce 产出宠物', petResult && petResult.name);

        petStrategy.saveResult(petResult, pd);
        check('配置表已注册', !!mods.Pets[petResult.id]);
    }
}

// ============================================================
// 3. 装备融合
// ============================================================
console.log('\n--- 3. 装备融合（祝融）---');
var equipStrategy = mods.createFusionEquipmentStrategy({
    getPlayerData: function() { return pd; },
    getEquipments: function() { return mods.Equipments; }
});

var equipAvail = equipStrategy.getAvailableMaterials(pd);
check('可用装备 >= 3', equipAvail.length >= 3);

if (equipAvail.length >= 3) {
    var equipIds = [equipAvail[0].uid, equipAvail[1].uid, equipAvail[2].uid];
    var equipResolved = equipStrategy.resolveMaterials(equipIds, pd);
    check('resolveMaterials 成功', equipResolved !== null);

    if (equipResolved) {
        var equipResult = equipStrategy.produce(equipResolved, 'normal', false);
        check('produce 产出装备', equipResult && equipResult.name);

        equipStrategy.saveResult(equipResult, pd);
        check('配置表已注册', !!mods.Equipments[equipResult.id]);
    }
}

// ============================================================
// 4. 技能融合
// ============================================================
console.log('\n--- 4. 技能融合（泉涌）---');
var skillStrategy = mods.createFusionSkillStrategy({
    getPlayerData: function() { return pd; },
    getSkills: function() { return mods.Skills; }
});

var skillAvail = skillStrategy.getAvailableMaterials(pd);
check('可用技能 >= 3', skillAvail.length >= 3);

if (skillAvail.length >= 3) {
    var skillIds = [skillAvail[0].uid, skillAvail[1].uid, skillAvail[2].uid];
    var skillResolved = skillStrategy.resolveMaterials(skillIds, pd);
    check('resolveMaterials 成功', skillResolved !== null);

    if (skillResolved) {
        var skillResult = skillStrategy.produce(skillResolved, 'normal', false);
        check('produce 产出技能', skillResult && skillResult.name);

        skillStrategy.saveResult(skillResult, pd);
        check('配置表已注册', !!mods.Skills[skillResult.id]);
    }
}

// ============================================================
// 5. 星星融合
// ============================================================
console.log('\n--- 5. 星星融合（坍缩）---');
var starStrategy = mods.createFusionStarStrategy({
    getPlayerData: function() { return pd; },
    getStarTypes: function() {
        var map = {};
        var arr = mods.SEASON_STAR_TYPES;
        for (var i = 0; i < arr.length; i++) map[arr[i].id] = arr[i];
        return map;
    },
    getSeasonStarTypes: function() { return mods.SEASON_STAR_TYPES; }
});

var starAvail = starStrategy.getAvailableMaterials(pd);
check('可用星星 >= 3', starAvail.length >= 3);

if (starAvail.length >= 3) {
    var starIds = [starAvail[0].id, starAvail[1].id, starAvail[2].id];
    var starResolved = starStrategy.resolveMaterials(starIds, pd);
    check('resolveMaterials 成功', starResolved !== null);

    if (starResolved) {
        var starValidation = starStrategy.validate(starResolved);
        check('validate 说明结果', starValidation.valid === true || starValidation.error);

        var starResult = starStrategy.produce(starResolved, 'normal', false);
        check('produce 产出星星', starResult && starResult.name);

        starStrategy.saveResult(starResult, pd);
        check('fusionStars 已记录', pd.fusionData.fusionStars.length > 0);
    }
}

// ============================================================
// 6. 跨会话恢复验证
// ============================================================
console.log('\n--- 6. 跨会话恢复 ---');
var frKeys = Object.keys(pd.fusionResults);
check('融合产物总数 >= 3', frKeys.length >= 3);

var allRegistered = true;
for (var i = 0; i < frKeys.length; i++) {
    var r = pd.fusionResults[frKeys[i]];
    var reg = false;
    if (r.type === 'character') reg = !!mods.Characters[r.id];
    else if (r.type === 'pet') reg = !!mods.Pets[r.id];
    else if (r.type === 'equipment') reg = !!mods.Equipments[r.id];
    else if (r.type === 'skill') reg = !!mods.Skills[r.id];
    else if (r.type === 'star') {
        // 星星融合产物注册在 fusionStars 中
        var fusedStars = pd.fusionData.fusionStars || [];
        for (var j = 0; j < fusedStars.length; j++) {
            if (fusedStars[j].id === r.id) { reg = true; break; }
        }
    }
    if (!reg) { allRegistered = false; console.log('  未注册: type=' + r.type + ' id=' + r.id); }
}
check('所有产物配置表已注册', allRegistered);

// ============================================================
// 结果
// ============================================================
console.log('\n=============================');
console.log('结果: ' + pass + ' PASS / ' + fail + ' FAIL');
console.log(fail === 0 ? '全部通过!' : '存在失败项!');
