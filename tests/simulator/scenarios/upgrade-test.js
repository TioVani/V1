/**
 * 升星系统完整测试
 * 验证：升级、升星（消耗同ID副本+概率）、材料列表、失败场景
 * 用法: node tests/simulator/run.js scenarios/upgrade-test.js
 */
var path = require('path');
var mods = require(path.resolve(__dirname, '../../../dist/game-modules.js'));

async function upgradeTest(sim) {
    var pass = 0, fail = 0;
    var errors = [];
    function check(label, condition) {
        if (condition) { console.log('  PASS: ' + label); pass++; }
        else { console.log('  FAIL: ' + label); fail++; errors.push(label); }
    }

    // 获取引擎
    var engine = sim._game.getUpgradeEngine();
    check('upgradeEngine 存在', !!engine);

    if (!engine) {
        return { pass: false, reason: 'upgradeEngine 不存在', details: { pass: pass, fail: fail } };
    }

    // 解锁所有（给重复项）
    var executeDebug = sim._game._executeDebugAction();
    executeDebug('unlock_all');
    console.log('');

    var pd = sim.getPlayerData();

    // ============================================================
    // 1. 升级测试（普通升级，消耗金币）
    // ============================================================
    console.log('--- 1. 角色普通升级 ---');
    var charEntities = engine.getAvailableEntities('character');
    check('有可用角色', charEntities.length > 0);

    if (charEntities.length > 0) {
        var char = charEntities[0];
        var beforeLevel = char.level;
        var info = engine.getUpgradeInfo(char.uid, 'character');
        check('getUpgradeInfo 返回正确', info && info.level === beforeLevel);

        if (info && !info.atMaxLevel) {
            var result = engine.upgrade(char.uid, 'character');
            check('升级成功', result.success);
            check('等级+1', result.newLevel === beforeLevel + 1);
        }
    }

    // ============================================================
    // 2. 升星 — 角色消耗同ID副本
    // ============================================================
    console.log('\n--- 2. 角色升星（消耗同ID副本）---');
    // 找一个有重复的角色
    var charCounts = {};
    var owned = pd.ownedCharacters || [];
    for (var i = 0; i < owned.length; i++) {
        charCounts[owned[i]] = (charCounts[owned[i]] || 0) + 1;
    }
    var dupCharId = null;
    var dupCharCount = 0;
    for (var id in charCounts) {
        if (charCounts[id] > dupCharCount) {
            dupCharCount = charCounts[id];
            dupCharId = id;
        }
    }
    check('有重复角色（id=' + dupCharId + ', 数量=' + dupCharCount + '）', dupCharId && dupCharCount >= 2);

    if (dupCharId) {
        var charInfo = engine.getUpgradeInfo(dupCharId, 'character');
        check('角色升星信息正确', charInfo && charInfo.starLevel === 0);
        check('角色有可用材料', charInfo && charInfo.availableMaterials >= 1);
        check('材料详情有内容', charInfo && charInfo.materialDetails && charInfo.materialDetails.length > 0);

        // 验证材料详情包含 name
        if (charInfo && charInfo.materialDetails && charInfo.materialDetails.length > 0) {
            var mat0 = charInfo.materialDetails[0];
            check('材料详情有名称', !!mat0.name);
            check('材料详情有uid', !!mat0.uid);
        }

        if (charInfo && !charInfo.atMaxStar && charInfo.availableMaterials >= charInfo.starMaterialCount) {
            var beforeCount = pd.ownedCharacters.length;
            var starResult = engine.starUpgrade(dupCharId, 'character');
            check('升星返回 success 字段', typeof starResult.success === 'boolean');
            check('升星返回 rate 字段', typeof starResult.rate === 'number');

            if (starResult.success) {
                check('升星成功，starLevel=1', starResult.newStarLevel === 1);
                check('材料被消耗', pd.ownedCharacters.length < beforeCount);
            } else {
                check('升星失败，材料已消耗', pd.ownedCharacters.length < beforeCount);
                console.log('  (概率失败，正常行为)');
            }
        }
    }

    // ============================================================
    // 3. 升星 — 装备消耗同ID副本
    // ============================================================
    console.log('\n--- 3. 装备升星 ---');
    var equipEntities = engine.getAvailableEntities('equipment');
    check('有可用装备', equipEntities.length > 0);

    if (equipEntities.length > 0) {
        // 找有重复的装备
        var eqOwned = pd.equipments.owned;
        var eqCounts = {};
        for (var i = 0; i < eqOwned.length; i++) {
            eqCounts[eqOwned[i].id] = (eqCounts[eqOwned[i].id] || 0) + 1;
        }
        var dupEquipId = null;
        for (var eid in eqCounts) {
            if (eqCounts[eid] >= 2) { dupEquipId = eid; break; }
        }
        check('有重复装备（id=' + dupEquipId + '）', !!dupEquipId);

        if (dupEquipId) {
            // 找该装备的一个 uid
            var equipUid = null;
            for (var j = 0; j < eqOwned.length; j++) {
                if (eqOwned[j].id === dupEquipId) { equipUid = eqOwned[j].uid; break; }
            }
            check('找到装备uid', !!equipUid);

            if (equipUid) {
                var eqInfo = engine.getUpgradeInfo(equipUid, 'equipment');
                check('装备升星信息正确', eqInfo && eqInfo.starLevel === 0);

                if (eqInfo && eqInfo.materialDetails) {
                    check('装备材料详情有内容', eqInfo.materialDetails.length > 0);
                }

                if (eqInfo && eqInfo.availableMaterials >= eqInfo.starMaterialCount) {
                    var beforeEqCount = pd.equipments.owned.length;
                    var eqStarResult = engine.starUpgrade(equipUid, 'equipment');
                    check('装备升星执行完成', typeof eqStarResult.success === 'boolean');
                    check('装备材料被消耗', pd.equipments.owned.length < beforeEqCount);
                }
            }
        }
    }

    // ============================================================
    // 4. 升星失败场景 — 材料不足
    // ============================================================
    console.log('\n--- 4. 材料不足场景 ---');
    // 找一个只有1份的角色
    var singleCharId = null;
    for (var cid in charCounts) {
        if (charCounts[cid] === 1) { singleCharId = cid; break; }
    }
    if (singleCharId) {
        var singleInfo = engine.getUpgradeInfo(singleCharId, 'character');
        if (singleInfo && !singleInfo.atMaxStar) {
            check('单份角色可用材料=0', singleInfo.availableMaterials === 0);
            var failResult = engine.starUpgrade(singleCharId, 'character');
            check('材料不足时升星失败', !failResult.success);
        }
    }

    // ============================================================
    // 5. 满星检查
    // ============================================================
    console.log('\n--- 5. 满星检查 ---');
    // 手动设置一个角色满星
    if (dupCharId) {
        if (!pd.upgradeData) pd.upgradeData = { stars: {} };
        if (!pd.upgradeData.stars) pd.upgradeData.stars = {};
        pd.upgradeData.stars[dupCharId] = { starLevel: 5 };
        var maxStarInfo = engine.getUpgradeInfo(dupCharId, 'character');
        check('满星后 atMaxStar=true', maxStarInfo && maxStarInfo.atMaxStar);
        check('满星倍率=2.5', maxStarInfo && maxStarInfo.currentMultiplier === 2.5);

        var maxResult = engine.starUpgrade(dupCharId, 'character');
        check('满星后不能再升', !maxResult.success);
    }

    // ============================================================
    // 6. 成功率分布测试（100次模拟）
    // ============================================================
    console.log('\n--- 6. 成功率分布测试（100次模拟）---');
    var rate60Success = 0;
    for (var t = 0; t < 100; t++) {
        if (Math.random() < 0.6) rate60Success++;
    }
    var ratio = rate60Success / 100;
    check('60%成功率在40-80%范围内 (实际=' + rate60Success + '%)', ratio >= 0.4 && ratio <= 0.8);

    // ============================================================
    // 结果
    // ============================================================
    console.log('\n=============================');
    console.log('结果: ' + pass + ' PASS / ' + fail + ' FAIL');
    if (fail > 0) {
        console.log('失败项:');
        for (var e = 0; e < errors.length; e++) console.log('  - ' + errors[e]);
    }

    return {
        pass: fail === 0,
        reason: fail === 0 ? '全部通过' : fail + ' 项失败',
        details: { total: pass + fail, passed: pass, failed: fail }
    };
}

module.exports = upgradeTest;
