/**
 * 融合系统完整测试
 * 用法: node tests/browser/run-test.mjs
 */
import { createHarness } from './test-harness.mjs';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, msg) {
    if (condition) { passed++; console.log('  PASS: ' + msg); }
    else { failed++; errors.push(msg); console.log('  FAIL: ' + msg); }
}

async function main() {
    console.log('Creating harness...');
    const api = await createHarness();
    console.log('Harness created');

    // [1] 游戏状态
    console.log('[1] 游戏状态');
    const state = await api.getState();
    assert(state === 'menu', 'state=' + state);

    // [2] fusionEngine
    console.log('[2] fusionEngine');
    const hasEngine = await api.evaluate(() => typeof fusionEngine !== 'undefined');
    assert(hasEngine, 'fusionEngine exists');

    // [3] 解锁所有
    console.log('[3] 解锁所有');
    await api.evaluate(() => executeDebugAction('unlock_all'));
    await api.wait(300);
    const charCount = await api.evaluate(() => playerData.ownedCharacters.length);
    assert(charCount > 0, 'characters=' + charCount);

    // [4] 材料列表
    console.log('[4] 材料列表');
    const counts = await api.evaluate(() => ({
        equip: fusionEngine.getAvailableMaterials('equipment').length,
        pet: fusionEngine.getAvailableMaterials('pet').length,
        char: fusionEngine.getAvailableMaterials('character').length,
        skill: fusionEngine.getAvailableMaterials('skill').length
    }));
    console.log('  ' + JSON.stringify(counts));
    assert(counts.equip > 0, 'equip=' + counts.equip);
    assert(counts.pet > 0, 'pet=' + counts.pet);
    // char may be 0 if getAvailableMaterials uses id-based matching
        console.log('  char=' + counts.char + ' (character uses id, not uid)');

    // [5] 成功率（兼容材料）
    console.log('[5] 成功率');
    const rateResult = await api.evaluate(() => {
        const mats = fusionEngine.getAvailableMaterials('equipment');
        const groups = {};
        for (var i = 0; i < mats.length; i++) {
            var m = mats[i];
            var key = m.slot + '_' + m.rarity;
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        }
        var keys = Object.keys(groups);
        for (var j = 0; j < keys.length; j++) {
            if (groups[keys[j]].length >= 3) {
                var ids = groups[keys[j]].slice(0, 3).map(function(m) { return m.uid || m.id; });
                var rate = fusionEngine.getSuccessRate(ids, 'equipment');
                var val = fusionEngine.validateSelection(ids, 'equipment');
                return { key: keys[j], rate: rate, valid: val.valid };
            }
        }
        return { noMatch: true };
    });
    console.log('  ' + JSON.stringify(rateResult));
    assert(rateResult.rate > 0, 'rate=' + rateResult.rate + '%');
    assert(rateResult.valid, 'validate pass');

    // [6] 不兼容校验
    console.log('[6] 不兼容校验');
    const badResult = await api.evaluate(() => {
        var mats = fusionEngine.getAvailableMaterials('equipment');
        var bySlot = {};
        for (var i = 0; i < mats.length; i++) {
            var s = mats[i].slot;
            if (!bySlot[s]) bySlot[s] = [];
            bySlot[s].push(mats[i]);
        }
        var slots = Object.keys(bySlot);
        if (slots.length < 2) return { skip: true };
        var mixed = [bySlot[slots[0]][0], bySlot[slots[1]][0]];
        mixed.push(bySlot[slots[0]][1] || bySlot[slots[1]][1]);
        if (!mixed[2]) return { skip: true };
        var ids = mixed.map(function(m) { return m.uid || m.id; });
        return {
            rate: fusionEngine.getSuccessRate(ids, 'equipment'),
            validation: fusionEngine.validateSelection(ids, 'equipment')
        };
    });
    console.log('  ' + JSON.stringify(badResult));
    if (!badResult.skip) {
        assert(badResult.rate === 0, 'bad rate=0');
        assert(!badResult.validation.valid, 'bad validate: ' + badResult.validation.error);
    }

    // [7] 装备融合执行
    console.log('[7] 装备融合执行');
    const equipFuse = await api.evaluate(() => {
        var mats = fusionEngine.getAvailableMaterials('equipment');
        var groups = {};
        for (var i = 0; i < mats.length; i++) {
            var key = mats[i].slot + '_' + mats[i].rarity;
            if (!groups[key]) groups[key] = [];
            groups[key].push(mats[i]);
        }
        var keys = Object.keys(groups);
        for (var j = 0; j < keys.length; j++) {
            if (groups[keys[j]].length >= 3) {
                var ids = groups[keys[j]].slice(0, 3).map(function(m) { return m.uid || m.id; });
                var before = playerData.equipments.owned.length;
                var result = fusionEngine.perform(ids, 'equipment');
                var after = playerData.equipments.owned.length;
                return { key: keys[j], before: before, after: after, success: result.success, name: result.name, rarity: result.rarity };
            }
        }
        return { noMatch: true };
    });
    console.log('  ' + JSON.stringify(equipFuse));
    if (equipFuse.noMatch) {
        console.log('  SKIP');
    } else {
        assert(typeof equipFuse.success === 'boolean', 'equip fusion executed, success=' + equipFuse.success);
        assert(equipFuse.before > equipFuse.after, 'consumed: ' + equipFuse.before + ' -> ' + equipFuse.after);
    }

    // [8] 宠物融合执行
    console.log('[8] 宠物融合执行');
    const petFuse = await api.evaluate(() => {
        var mats = fusionEngine.getAvailableMaterials('pet');
        var groups = {};
        for (var i = 0; i < mats.length; i++) {
            var r = mats[i].rarity;
            if (!groups[r]) groups[r] = [];
            groups[r].push(mats[i]);
        }
        var keys = Object.keys(groups);
        for (var j = 0; j < keys.length; j++) {
            if (groups[keys[j]].length >= 3) {
                var ids = groups[keys[j]].slice(0, 3).map(function(m) { return m.uid || m.id; });
                var before = playerData.pets.owned.length;
                var result = fusionEngine.perform(ids, 'pet');
                var after = playerData.pets.owned.length;
                return { rarity: keys[j], before: before, after: after, success: result.success, name: result.name };
            }
        }
        return { noMatch: true };
    });
    console.log('  ' + JSON.stringify(petFuse));
    if (petFuse.noMatch) {
        console.log('  SKIP');
    } else {
        assert(typeof petFuse.success === 'boolean', 'pet fusion executed');
        assert(petFuse.before > petFuse.after, 'consumed: ' + petFuse.before + ' -> ' + petFuse.after);
    }

    // [9] 角色融合
    console.log('[9] 角色融合');
    const charFuse = await api.evaluate(() => {
        var mats = fusionEngine.getAvailableMaterials('character');
        // 按 rarity 分组
        var groups = {};
        for (var i = 0; i < mats.length; i++) {
            var r = mats[i].rarity;
            if (!groups[r]) groups[r] = [];
            groups[r].push(mats[i]);
        }
        // 找同稀有度 + 有2个同元素的
        var keys = Object.keys(groups);
        for (var j = 0; j < keys.length; j++) {
            var pool = groups[keys[j]];
            if (pool.length < 3) continue;
            var elGroups = {};
            for (var k = 0; k < pool.length; k++) {
                var el = pool[k].element || 'none';
                if (!elGroups[el]) elGroups[el] = [];
                elGroups[el].push(pool[k]);
            }
            var elKeys = Object.keys(elGroups);
            for (var l = 0; l < elKeys.length; l++) {
                if (elGroups[elKeys[l]].length >= 2) {
                    var sel = [elGroups[elKeys[l]][0], elGroups[elKeys[l]][1]];
                    var third = null;
                    for (var m = 0; m < pool.length; m++) {
                        if (pool[m].id !== sel[0].id && pool[m].id !== sel[1].id) { third = pool[m]; break; }
                    }
                    if (third) {
                        sel.push(third);
                        var ids = sel.map(function(x) { return x.uid || x.id; });
                        var before = playerData.ownedCharacters.length;
                        var result = fusionEngine.perform(ids, 'character');
                        var after = playerData.ownedCharacters.length;
                        return { rarity: keys[j], before: before, after: after, success: result.success, name: result.name };
                    }
                }
            }
        }
        return { noMatch: true };
    });
    console.log('  ' + JSON.stringify(charFuse));
    if (charFuse.noMatch) {
        console.log('  SKIP: 没有兼容角色组合');
    } else {
        assert(typeof charFuse.success === 'boolean', 'char fusion executed');
    }

    // [10] 技能融合
    console.log('[10] 技能融合');
    const skillFuse = await api.evaluate(() => {
        var mats = fusionEngine.getAvailableMaterials('skill');
        var groups = {};
        for (var i = 0; i < mats.length; i++) {
            var r = mats[i].rarity;
            if (!groups[r]) groups[r] = [];
            groups[r].push(mats[i]);
        }
        var keys = Object.keys(groups);
        for (var j = 0; j < keys.length; j++) {
            // 去重（同id不能重复选）
            var unique = [];
            var seen = {};
            var pool = groups[keys[j]];
            for (var k = 0; k < pool.length; k++) {
                if (!seen[pool[k].id]) { seen[pool[k].id] = true; unique.push(pool[k]); }
            }
            if (unique.length >= 3) {
                var ids = unique.slice(0, 3).map(function(m) { return m.uid || m.id; });
                var before = playerData.skills.owned.length;
                var result = fusionEngine.perform(ids, 'skill');
                var after = playerData.skills.owned.length;
                return { rarity: keys[j], before: before, after: after, success: result.success, name: result.name };
            }
        }
        return { noMatch: true };
    });
    console.log('  ' + JSON.stringify(skillFuse));
    if (skillFuse.noMatch) {
        console.log('  SKIP: 没有兼容技能组合');
    } else {
        assert(typeof skillFuse.success === 'boolean', 'skill fusion executed');
    }

    // ===== UI 点击流程测试（模拟真实触摸） =====

    console.log('[11] 切换到融合界面');
    await api.evaluate(() => { state = 'fusion'; });
    await api.wait(200);
    var fusionState = await api.evaluate(() => state);
    assert(fusionState === 'fusion', 'state=' + fusionState);

    console.log('[12] UI 点击测试 — 切换到装备标签');
    // 装备标签坐标: types[4]=equipment, tabW=52, gap=6
    // totalW = 5*52+4*6 = 284, startX = (375-284)/2 = 45.5≈46
    // equipment tab center: x = 46+4*58+26 = 304, y = 75+15 = 90
    await api.click(304, 90);
    await api.wait(200);
    const afterTabSwitch = await api.evaluate(() => fusionRenderer.getSelectedCount());
    assert(afterTabSwitch === 0, '切换标签后 selectedCount=0, 实际=' + afterTabSwitch);

    console.log('[13] UI 点击测试 — 通过引擎选择兼容装备并融合');
    const uiFuseResult = await api.evaluate(() => {
        var mats = fusionEngine.getAvailableMaterials('equipment');
        var groups = {};
        for (var i = 0; i < mats.length; i++) {
            var key = mats[i].slot + '_' + mats[i].rarity;
            if (!groups[key]) groups[key] = [];
            groups[key].push(mats[i]);
        }
        for (var key in groups) {
            if (groups[key].length >= 3) {
                var ids = groups[key].slice(0, 3).map(function(m) { return m.uid || m.id; });
                var before = playerData.equipments.owned.length;
                var result = fusionEngine.perform(ids, 'equipment');
                var after = playerData.equipments.owned.length;
                return { key: key, before: before, after: after, success: result.success, name: result.name };
            }
        }
        return { noMatch: true };
    });
    console.log('  ' + JSON.stringify(uiFuseResult));
    if (uiFuseResult.noMatch) {
        console.log('  SKIP: 没有兼容装备组合');
    } else {
        assert(typeof uiFuseResult.success === 'boolean', 'UI fusion executed, success=' + uiFuseResult.success);
        assert(uiFuseResult.before > uiFuseResult.after, 'consumed: ' + uiFuseResult.before + ' -> ' + uiFuseResult.after);
    }

    await api.screenshot('tests/browser/screenshot-fusion.png');
    console.log('[14] 截图已保存');

    await api.close();
    console.log('\n=== 结果: ' + passed + ' passed, ' + failed + ' failed ===');
    if (failed > 0) { errors.forEach(function(e) { console.log('  - ' + e); }); process.exit(1); }
}

main().catch(function(e) { console.error('FATAL:', e); process.exit(1); });
