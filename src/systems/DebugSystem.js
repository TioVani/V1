import Logger from '../utils/Logger.js';
/**
 * 调试系统
 * 仅开发环境使用，提供调试操作功能
 */

function createDebugSystem(deps) {
    var getPlayerData = deps.getPlayerData;
    var getCharacters = deps.getCharacters;
    var getEquipments = deps.getEquipments;
    var getSkills = deps.getSkills;
    var getPets = deps.getPets;
    var getSeasonStarTypes = deps.getSeasonStarTypes;
    var savePlayerData = deps.savePlayerData;
    var showToast = deps.showToast;
    var toggleDevBattle = deps.toggleDevBattle || null;
    var toggleUIEditor = deps.toggleUIEditor || null;
    var setBestScore = deps.setBestScore || null;
    var getUpgradeEngine = deps.getUpgradeEngine || null;
    var toggleGodMode = deps.toggleGodMode || null;

    function executeDebugAction(actionId) {
        var playerData = getPlayerData();
        var Characters = getCharacters();
        Logger.info('执行调试功能:', actionId);

        switch (actionId) {
            case 'unlock_chars':
                var charKeys = Object.keys(Characters);
                playerData.ownedCharacters = charKeys.map(function(key) {
                    return Characters[key].id;
                });
                showToast('✅ 已解锁所有角色', 'none', 1500);
                break;

            case 'unlock_stars':
                var SEASON_STAR_TYPES = getSeasonStarTypes();
                var starTypes = SEASON_STAR_TYPES.map(function(s) { return s.id; });
                playerData.unlockedStarTypes = starTypes;
                showToast('✅ 已解锁所有灵光', 'none', 1500);
                break;

            case 'add_gold':
                playerData.gold = (playerData.gold || 0) + 10000;
                showToast('✅ +10000灵币', 'none', 1500);
                break;

            case 'add_materials':
                playerData.materials = {
                    iceCrystal: Object.assign({}, (playerData.materials && playerData.materials.iceCrystal) || {}, { quantity: 999 }),
                    fireSource: Object.assign({}, (playerData.materials && playerData.materials.fireSource) || {}, { quantity: 999 }),
                    critCrystal: Object.assign({}, (playerData.materials && playerData.materials.critCrystal) || {}, { quantity: 999 }),
                    critFireSource: Object.assign({}, (playerData.materials && playerData.materials.critFireSource) || {}, { quantity: 999 }),
                    timeCrystal: Object.assign({}, (playerData.materials && playerData.materials.timeCrystal) || {}, { quantity: 999 }),
                    devourerResidue: Object.assign({}, (playerData.materials && playerData.materials.devourerResidue) || {}, { quantity: 999 })
                };
                showToast('✅ 材料已满', 'none', 1500);
                break;

            case 'add_starSource':
                playerData.starSource = (playerData.starSource || 0) + 1000;
                showToast('✅ +1000灵石', 'none', 1500);
                break;

            case 'max_level':
                if (playerData.ownedCharacters) {
                    for (var i = 0; i < playerData.ownedCharacters.length; i++) {
                        var charId = playerData.ownedCharacters[i];
                        if (!playerData.characterExperience) playerData.characterExperience = {};
                        playerData.characterExperience[charId] = { level: 90, exp: 0, maxExp: 100 };
                    }
                }
                showToast('✅ 角色已满级', 'none', 1500);
                break;

            case 'unlock_equips':
                var Equips = getEquipments();
                var equipIds = Object.keys(Equips);
                playerData.equipments = playerData.equipments || { owned: [], equipped: { weapon: null, armor: null, accessory: null, set: null } };
                playerData.equipments.owned = equipIds.map(function(id) { return { id: id, rarity: Equips[id].rarity, level: 1 }; });
                showToast('✅ 已解锁所有装备', 'none', 1500);
                break;

            case 'unlock_skills':
                var Skills = getSkills();
                var skillIds = Object.keys(Skills);
                playerData.skills = playerData.skills || {};
                playerData.skills.owned = skillIds.map(function(id) { return { uid: 'skill_' + Date.now() + '_' + Math.floor(Math.random() * 10000), id: id, level: 1 }; });
                showToast('✅ 已解锁所有技能', 'none', 1500);
                break;

            case 'unlock_pets':
                var Pets = getPets();
                var petIds = Object.keys(Pets);
                playerData.pets = playerData.pets || { owned: [], equipped: null };
                playerData.pets.owned = petIds.map(function(id, idx) {
                    return { id: id, level: 1, instanceId: id + '_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 100000) };
                });
                showToast('✅ 已解锁所有宠物', 'none', 1500);
                break;

            case 'dev_battle':
                if (toggleDevBattle) {
                    toggleDevBattle();
                }
                return;

            case 'max_upgrade':
                if (getUpgradeEngine) {
                    var engine = getUpgradeEngine();
                    var types = ['character', 'equipment', 'skill', 'pet', 'star'];
                    for (var ti = 0; ti < types.length; ti++) {
                        var entities = engine.getAvailableEntities(types[ti]);
                        for (var ei = 0; ei < entities.length; ei++) {
                            var r;
                            do { r = engine.upgrade(entities[ei].uid, types[ti]); } while (r.success);
                        }
                    }
                    showToast('✅ 全部实体满级', 'none', 1500);
                }
                return;

            case 'ui_editor':
                if (toggleUIEditor) {
                    toggleUIEditor();
                }
                return;

            case 'god_mode':
                if (toggleGodMode) {
                    toggleGodMode();
                }
                return;

            case 'unlock_all':
                // 解锁所有角色（每个角色给2份，1份自用 + 1份多余可融合）
                charKeys = Object.keys(Characters);
                playerData.ownedCharacters = charKeys.map(function(key) {
                    return Characters[key].id;
                });
                playerData.ownedCharacters = playerData.ownedCharacters.concat(
                    charKeys.map(function(key) { return Characters[key].id; })
                );
                // 角色满级
                playerData.characterExperience = {};
                for (var ci = 0; ci < playerData.ownedCharacters.length; ci++) {
                    playerData.characterExperience[playerData.ownedCharacters[ci]] = { level: 90, exp: 0, maxExp: 999999 };
                }
                // 解锁所有星星
                SEASON_STAR_TYPES = getSeasonStarTypes();
                playerData.unlockedStarTypes = SEASON_STAR_TYPES.map(function(s) { return s.id; });
                // 满材料 + 灵币 + 灵石（保留已有字段）
                var mats = playerData.materials || {};
                playerData.materials = {
                    iceCrystal: Object.assign({}, mats.iceCrystal || {}, { quantity: 999 }),
                    fireSource: Object.assign({}, mats.fireSource || {}, { quantity: 999 }),
                    critCrystal: Object.assign({}, mats.critCrystal || {}, { quantity: 999 }),
                    critFireSource: Object.assign({}, mats.critFireSource || {}, { quantity: 999 }),
                    timeCrystal: Object.assign({}, mats.timeCrystal || {}, { quantity: 999 }),
                    devourerResidue: Object.assign({}, mats.devourerResidue || {}, { quantity: 999 })
                };
                playerData.gold = 99999;
                playerData.starSource = 99999;
                // 解锁所有装备
                Equips = getEquipments();
                equipIds = Object.keys(Equips);
                playerData.equipments = playerData.equipments || { owned: [], equipped: { weapon: null, armor: null, accessory: null, set: null } };
                playerData.equipments.owned = equipIds.map(function(id) { return { id: id, rarity: Equips[id].rarity, level: 1, uid: 'eq_' + id + '_1' }; });
                // 每件装备给第二份（作为融合多余材料）
                var eqDupes = equipIds.map(function(id) { return { id: id, rarity: Equips[id].rarity, level: 1, uid: 'eq_' + id + '_2' }; });
                playerData.equipments.owned = playerData.equipments.owned.concat(eqDupes);
                // 解锁所有技能
                Skills = getSkills();
                skillIds = Object.keys(Skills);
                playerData.skills = playerData.skills || {};
                playerData.skills.owned = skillIds.map(function(id) { return { uid: 'skill_1_' + id, id: id, level: 1 }; });
                // 每个技能给第二份
                var skDupes = skillIds.map(function(id) { return { uid: 'skill_2_' + id, id: id, level: 1 }; });
                playerData.skills.owned = playerData.skills.owned.concat(skDupes);
                // 解锁所有宠物
                Pets = getPets();
                petIds = Object.keys(Pets);
                playerData.pets = playerData.pets || { owned: [], equipped: null };
                playerData.pets.owned = petIds.map(function(id, idx) {
                    return { id: id, level: 1, instanceId: id + '_1_' + idx };
                });
                // 每只宠物给第二份
                var petDupes = petIds.map(function(id, idx) {
                    return { id: id, level: 1, instanceId: id + '_2_' + idx };
                });
                playerData.pets.owned = playerData.pets.owned.concat(petDupes);
                // 解锁所有模式：最高分设为 5000（解锁赛季+爬塔）
                if (setBestScore) setBestScore(5000);
                // 解锁 Boss 模式：设置通关第 3 章
                playerData.stageProgress = {
                    stage_1_1: { stars: 3, bestScore: 100 },
                    stage_1_2: { stars: 3, bestScore: 100 },
                    stage_1_3: { stars: 3, bestScore: 100 },
                    stage_2_1: { stars: 3, bestScore: 100 },
                    stage_2_2: { stars: 3, bestScore: 100 },
                    stage_2_3: { stars: 3, bestScore: 100 },
                    stage_3_1: { stars: 3, bestScore: 100 },
                    stage_3_2: { stars: 3, bestScore: 100 },
                    stage_3_3: { stars: 3, bestScore: 100 }
                };
                showToast('✅ 已解锁所有功能', 'none', 1500);
                break;
        }

        savePlayerData();
    }

    return {
        executeDebugAction: executeDebugAction
    };
}

export { createDebugSystem };
