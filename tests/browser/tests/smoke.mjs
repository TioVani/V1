/**
 * 烟雾测试 — 验证 Playwright 能加载游戏并操作
 */
import { createHarness } from '../test-harness.mjs';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, msg) {
    if (condition) { passed++; console.log(`  PASS: ${msg}`); }
    else { failed++; errors.push(msg); console.log(`  FAIL: ${msg}`); }
}

export default async function run(api) {
    console.log('\n=== 烟雾测试 ===\n');

    // 1. 游戏状态
    console.log('[1] 游戏状态检查');
    const state = await api.getState();
    assert(state === 'menu', `初始状态为 menu，实际: ${state}`);

    // 2. 检查 playerData
    console.log('[2] PlayerData 检查');
    const gs = await api.evaluate(() => window.__testApi.getGameState());
    assert(gs !== null, 'getGameState 返回非空');
    console.log(`  state: ${gs.state}, bestScore: ${gs.bestScore}`);
    if (gs.playerData) {
        console.log(`  gold: ${gs.playerData.gold}, chars: ${(gs.playerData.ownedCharacters || []).length}`);
    }

    // 3. 检查 fusionEngine 是否存在
    console.log('[3] fusionEngine 存在性检查');
    const hasEngine = await api.evaluate(() => typeof fusionEngine !== 'undefined');
    assert(hasEngine, 'fusionEngine 已创建');

    // 4. 调试解锁
    console.log('[4] 调试解锁');
    await api.evaluate(() => {
        if (typeof executeDebugAction === 'function') executeDebugAction('unlock_all');
    });
    await api.wait(500);
    const gs2 = await api.evaluate(() => window.__testApi.getGameState());
    assert(gs2.playerData && gs2.playerData.ownedCharacters && gs2.playerData.ownedCharacters.length > 0,
        `解锁角色数: ${(gs2.playerData.ownedCharacters || []).length}`);

    // 5. 装备材料列表
    console.log('[5] 装备材料列表');
    const equipMats = await api.evaluate(() => fusionEngine.getAvailableMaterials('equipment'));
    assert(Array.isArray(equipMats) && equipMats.length > 0, `装备材料数: ${equipMats ? equipMats.length : 0}`);

    // 6. 成功率测试
    console.log('[6] 找3个兼容装备测试成功率');
    if (equipMats && equipMats.length >= 3) {
        const rateResult = await api.evaluate((mats) => {
            const groups = {};
            for (const m of mats) {
                const key = (m.slot || '?') + '_' + (m.rarity || '?');
                if (!groups[key]) groups[key] = [];
                groups[key].push(m);
            }
            for (const key in groups) {
                if (groups[key].length >= 3) {
                    const ids = groups[key].slice(0, 3).map(m => m.uid || m.id);
                    const rate = fusionEngine.getSuccessRate(ids, 'equipment');
                    const validation = fusionEngine.validateSelection(ids, 'equipment');
                    return { key, ids, rate, validation };
                }
            }
            return { noMatch: true, groups: Object.keys(groups).map(k => k + ':' + groups[k].length) };
        }, equipMats);
        console.log(`  结果: ${JSON.stringify(rateResult)}`);
        if (rateResult.rate !== undefined) {
            assert(rateResult.rate > 0, `成功率 ${rateResult.rate}% > 0`);
            assert(rateResult.validation.valid, '校验通过');
        }
    }

    // 7. 不兼容测试
    console.log('[7] 不兼容材料校验');
    const incompatibleResult = await api.evaluate((mats) => {
        if (!mats || mats.length < 3) return { skip: true };
        const bySlot = {};
        for (const m of mats) {
            if (!bySlot[m.slot]) bySlot[m.slot] = [];
            bySlot[m.slot].push(m);
        }
        const slots = Object.keys(bySlot);
        if (slots.length < 2) return { skip: true, slots };
        // 取2个不同slot + 1个随便
        const mixed = [bySlot[slots[0]][0]];
        if (bySlot[slots[1]]) mixed.push(bySlot[slots[1]][0]);
        if (bySlot[slots[0]].length > 1) mixed.push(bySlot[slots[0]][1]);
        else if (bySlot[slots[1]] && bySlot[slots[1]].length > 1) mixed.push(bySlot[slots[1]][1]);
        else return { skip: true };
        const ids = mixed.map(m => m.uid || m.id);
        const rate = fusionEngine.getSuccessRate(ids, 'equipment');
        const validation = fusionEngine.validateSelection(ids, 'equipment');
        return { ids, slots: slots.slice(0, 2), rate, validation };
    }, equipMats);
    console.log(`  结果: ${JSON.stringify(incompatibleResult)}`);
    if (!incompatibleResult.skip) {
        assert(incompatibleResult.rate === 0, `不兼容成功率应为 0，实际: ${incompatibleResult.rate}`);
        assert(!incompatibleResult.validation.valid, `校验应失败: ${incompatibleResult.validation.error}`);
    }

    // 结果
    console.log(`\n=== 结果: ${passed} passed, ${failed} failed ===`);
    if (errors.length) { errors.forEach(e => console.log(`  FAIL: ${e}`)); process.exit(1); }
}
