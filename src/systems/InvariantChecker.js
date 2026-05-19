import Logger from '../utils/Logger.js';
/**
 * 运行时不变量检查器（Runtime Invariant Verifier）
 *
 * 每帧在调试模式下自动检查游戏状态规则，发现违规立即报告。
 * 目的：一劳永逸地捕获状态不一致，避免手动排查逻辑错误。
 *
 * 设计原则：
 * - 零开销：非调试模式不执行任何逻辑
 * - 不修改状态：只读取和报告，不修复
 * - 去重：同一违规每秒最多报告一次，避免日志轰炸
 */

function createInvariantChecker(deps) {
    var getGameState = deps.getGameState;
    var getGameConst = deps.getGameConst;
    var getMonsters = deps.getMonsters;
    var getNormalBattleAdapter = deps.getNormalBattleAdapter;
    var isDebugFn = deps.isDebug;

    // ─── 违规去重：同一 key 每秒只报一次 ───
    var lastReportTime = {};

    function report(key, msg) {
        var now = Date.now();
        if (lastReportTime[key] && now - lastReportTime[key] < 1000) return;
        lastReportTime[key] = now;
        Logger.error('[INVARIANT]', msg);
    }

    // ─── 不变量定义 ───
    // 每个不变量: { id, check: fn() → { pass, msg } }

    var invariants = [];

    // INV-1: 死亡怪物不应留在激活数组中
    invariants.push({
        id: 'dead_monster_in_active',
        check: function() {
            var monsters = getMonsters();
            if (!monsters) return { pass: true };
            for (var i = 0; i < monsters.length; i++) {
                var m = monsters[i];
                if (m.active && m.hp <= 0 && m.maxHp > 0) {
                    return {
                        pass: false,
                        msg: '怪物 hp=' + m.hp + ' <= 0 但仍 active: ' +
                            JSON.stringify({ id: m.id, type: m.type, hp: m.hp, maxHp: m.maxHp, active: m.active })
                    };
                }
            }
            return { pass: true };
        }
    });

    // INV-2: BattleEngine 状态中 deathDelayMs 必须与配置一致
    invariants.push({
        id: 'death_delay_ms_consistency',
        check: function() {
            var nba = getNormalBattleAdapter && getNormalBattleAdapter();
            if (!nba || !nba.isActive()) return { pass: true };
            var engine = nba.getBattleEngine && nba.getBattleEngine();
            if (!engine) return { pass: true };
            var s = engine.getState && engine.getState();
            if (!s) return { pass: true };

            // 无尽模式 deathDelayMs 必须为 0
            var mode = s.mode;
            var ddm = s.deathDelayMs;
            var ext = s.extensions || {};
            if (ext.preventFinish && ddm !== 0 && ddm != null) {
                return {
                    pass: false,
                    msg: '无尽模式(preventFinish) deathDelayMs=' + ddm + ' 应为 0'
                };
            }
            return { pass: true };
        }
    });

    // INV-3: pendingDeaths 不应长时间滞留（超过 3 秒）
    invariants.push({
        id: 'pending_deaths_stuck',
        check: function() {
            var nba = getNormalBattleAdapter && getNormalBattleAdapter();
            if (!nba || !nba.isActive()) return { pass: true };
            var engine = nba.getBattleEngine && nba.getBattleEngine();
            if (!engine) return { pass: true };
            var s = engine.getState && engine.getState();
            if (!s) return { pass: true };

            var pd = s.pendingDeaths;
            if (!pd || pd.length === 0) return { pass: true };

            var now = Date.now();
            for (var i = 0; i < pd.length; i++) {
                if (now - pd[i].deathTime > 3000) {
                    return {
                        pass: false,
                        msg: 'pendingDeath 滞留 ' + ((now - pd[i].deathTime) / 1000).toFixed(1) +
                            's, deathDelayMs=' + s.deathDelayMs +
                            ', mode=' + s.mode
                    };
                }
            }
            return { pass: true };
        }
    });

    // INV-4: BattleEngine init 后 config 字段必须写入 state
    invariants.push({
        id: 'engine_config_sync',
        check: function() {
            var nba = getNormalBattleAdapter && getNormalBattleAdapter();
            if (!nba || !nba.isActive()) return { pass: true };
            var engine = nba.getBattleEngine && nba.getBattleEngine();
            if (!engine) return { pass: true };
            var s = engine.getState && engine.getState();
            if (!s || s.phase === 0) return { pass: true }; // IDLE 阶段跳过

            var criticalFields = ['deathDelayMs', 'mode', 'timeLeft', 'playerHp', 'playerMaxHp'];
            var missing = [];
            for (var i = 0; i < criticalFields.length; i++) {
                var f = criticalFields[i];
                if (s[f] === undefined) {
                    missing.push(f);
                }
            }
            if (missing.length > 0) {
                return {
                    pass: false,
                    msg: 'BattleEngine state 缺少关键字段: ' + missing.join(', ')
                };
            }
            return { pass: true };
        }
    });

    // INV-5: 战斗中且 preventFinish 模式下，BattleEngine.update() 应被每帧调用
    var _lastEngineUpdateTime = 0;
    invariants.push({
        id: 'engine_update_liveness',
        check: function() {
            var GAME_STATE = getGameConst();
            var state = getGameState();
            var isCombat = state === GAME_STATE.PLAYING ||
                state === GAME_STATE.SEASON_PLAYING ||
                state === GAME_STATE.STAGE_PLAYING;

            if (!isCombat) {
                _lastEngineUpdateTime = Date.now();
                return { pass: true };
            }

            var nba = getNormalBattleAdapter && getNormalBattleAdapter();
            if (!nba || !nba.isActive()) return { pass: true };

            var now = Date.now();
            var gap = now - _lastEngineUpdateTime;
            _lastEngineUpdateTime = now;

            // 正常帧间隔不应超过 200ms（约 5fps）
            if (gap > 200) {
                return {
                    pass: false,
                    msg: 'BattleEngine update 间隔 ' + gap + 'ms（可能未在游戏循环中调用）'
                };
            }
            return { pass: true };
        }
    });

    // ─── 公共 API ───

    /**
     * 每帧检查所有不变量（仅在调试模式）
     */
    function check() {
        if (isDebugFn && !isDebugFn()) return;

        for (var i = 0; i < invariants.length; i++) {
            var inv = invariants[i];
            try {
                var result = inv.check();
                if (!result.pass) {
                    report(inv.id, result.msg);
                }
            } catch (e) {
                report(inv.id, '检查异常: ' + e.message);
            }
        }
    }

    /**
     * 注册自定义不变量
     */
    function addInvariant(id, checkFn) {
        invariants.push({ id: id, check: checkFn });
    }

    /**
     * 手动触发一次完整检查（不依赖调试模式）
     * @returns {Array} 违规列表
     */
    function checkNow() {
        var violations = [];
        for (var i = 0; i < invariants.length; i++) {
            try {
                var result = invariants[i].check();
                if (!result.pass) {
                    violations.push({ id: invariants[i].id, msg: result.msg });
                }
            } catch (e) {
                violations.push({ id: invariants[i].id, msg: '检查异常: ' + e.message });
            }
        }
        return violations;
    }

    return {
        check: check,
        addInvariant: addInvariant,
        checkNow: checkNow
    };
}

export { createInvariantChecker };
