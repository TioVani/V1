/**
 * 击杀回血插件 — 每击败一个怪物回复玩家最大生命值的百分比
 *
 * 通过 adapter.healPlayer() 统一接口修改 HP，不直接操作引擎内部状态。
 * 与窃灵冠(thief_crown)的暴击回血独立叠加、互不冲突。
 */

var HEAL_PERCENT = 0.02;
var MIN_HEAL = 1;
var ENABLED = true;
var SHOW_MESSAGE = true;

export function createVictoryHealPlugin(deps) {
    var addMessage = deps.addMessage;
    var getCharacterFullStats = deps.getCharacterFullStats;
    var healPlayerFn = deps.healPlayerFn;

    function onKill(playerData) {
        if (!ENABLED) return;

        var stats = getCharacterFullStats(playerData.currentCharacterId);
        var maxHp = stats ? stats.hp : 100;
        var healAmount = Math.max(Math.floor(maxHp * HEAL_PERCENT), MIN_HEAL);

        var actual = healPlayerFn(healAmount);
        if (SHOW_MESSAGE && actual > 0) {
            addMessage('+ ' + actual + ' 灵能', '#00ff88');
        }
    }

    return { onKill: onKill };
}