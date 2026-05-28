/**
 * ModeLifecycleManager — 统一战斗模式生命周期管理
 *
 * 每个战斗模式注册一个 handler：
 *   { enter(ctx), pause(), resume(ctx), cleanup(ctx), restart(ctx) }
 *
 * 管理器提供：
 *   - transitionTo(modeName, ctx) — cleanup 当前 → enter 目标
 *   - cleanupMode(modeName, ctx) — 退出模式（ctx.fullExit=true 时做状态转移）
 *   - restartMode(modeName, ctx) — 重启模式
 *   - pauseActive() / resumeActive(ctx) — 委托给当前模式
 *   - setModeTimer(fn, ms) — 注册定时器到当前模式，pause/cleanup 自动清理
 *   - detectModeForState(gameState) — 反查 GAME_STATE 对应的 mode 名
 *
 * 新增战斗模式只需注册 handler，不需要修改暂停菜单 if/else 链。
 */
import Logger from '../utils/Logger.js';
import TimerManager from '../utils/TimerManager.js';
import { PauseCoordinator } from '../utils/PauseCoordinator.js';

function createModeLifecycleManager(deps) {
    var getGameState = deps.getGameState;
    var setGameState = deps.setGameState;
    var GAME_STATE = deps.GAME_STATE;
    var saveDataFn = deps.saveData || null;

    // 模式注册表
    var handlers = {};

    // 当前活跃模式名
    var activeMode = null;

    // 前一个模式名（暂停恢复用）
    var previousMode = null;

    // 每个模式独立的 TimerManager
    var modeTimers = {};

    // 游戏状态 → 模式名 的映射
    var stateToMode = {};

    // 模式名 → 游戏状态 的映射
    var modeToState = {};

    // PauseCoordinator — ModeTimers subscriber（全局常驻）
    PauseCoordinator.instance.subscribe(null, 'ModeTimers', {
        onPause: function() {
            if (activeMode && modeTimers[activeMode]) {
                modeTimers[activeMode].clearAll();
            }
        },
        onResume: function() {
            var mode = previousMode || activeMode;
            if (mode && handlers[mode] && handlers[mode].resume) {
                handlers[mode].resume();
            }
        }
    });

    function getOrCreateTimers(modeName) {
        if (!modeTimers[modeName]) {
            modeTimers[modeName] = new TimerManager();
        }
        return modeTimers[modeName];
    }

    /**
     * 注册模式
     * @param {string} modeName - 模式标识（如 'normal', 'boss', 'tower'）
     * @param {object} handler - { enter, pause, resume, cleanup, restart }
     * @param {string} gameState - 对应的 GAME_STATE 值
     */
    function registerMode(modeName, handler, gameState) {
        handlers[modeName] = handler;
        if (gameState) {
            stateToMode[gameState] = modeName;
            modeToState[modeName] = gameState;
        }
        Logger.info('ModeLifecycle: 注册模式', modeName);
    }

    /**
     * 根据当前游戏状态推断活跃模式
     */
    function detectActiveMode() {
        var gs = getGameState();
        return stateToMode[gs] || null;
    }

    /**
     * 根据 GAME_STATE 值反查 mode 名
     */
    function detectModeForState(gameState) {
        return stateToMode[gameState] || null;
    }

    /**
     * 强制同步 activeMode 为当前 state 对应的 mode
     */
    function forceResetActive() {
        var detected = detectActiveMode();
        previousMode = activeMode;
        activeMode = detected;
    }

    /**
     * 直接设置活跃模式名（不触发 cleanup/enter）
     * 用于内部启动场景（如塔战斗从探索状态内部启动）
     */
    function setActiveMode(modeName) {
        previousMode = activeMode;
        activeMode = modeName;
    }

    /**
     * 获取当前活跃模式名
     */
    function getActiveMode() {
        return activeMode;
    }

    /**
     * 获取前一个模式名
     */
    function getPreviousMode() {
        return previousMode;
    }

    /**
     * 注册定时器到当前模式
     * pause/cleanup 时自动清理
     */
    function setModeTimer(fn, ms) {
        var tm = getOrCreateTimers(activeMode);
        return tm.setInterval(fn, ms);
    }

    function setModeTimeout(fn, ms) {
        var tm = getOrCreateTimers(activeMode);
        return tm.setTimeout(fn, ms);
    }

    function clearModeTimer(id) {
        if (activeMode && modeTimers[activeMode]) {
            modeTimers[activeMode].clearInterval(id);
        }
        return null;
    }

    /**
     * 暂停当前模式 — 通过 PauseCoordinator 统一调度
     */
    function pauseActive() {
        if (!activeMode) {
            Logger.warn('ModeLifecycle: pauseActive 无活跃模式');
            return;
        }
        previousMode = activeMode;
        PauseCoordinator.instance.pause();
        Logger.info('ModeLifecycle: 暂停模式', activeMode);
    }

    /**
     * 恢复当前模式 — 通过 PauseCoordinator 统一调度
     */
    function resumeActive(ctx) {
        var mode = previousMode || activeMode;
        if (!mode) {
            Logger.warn('ModeLifecycle: resumeActive 无可恢复模式');
            return;
        }
        activeMode = mode;
        PauseCoordinator.instance.resume();
        Logger.info('ModeLifecycle: 恢复模式', mode);
    }

    /**
     * 切换到目标模式
     * 自动 cleanup 当前模式（仅资源清理，不做状态转移）→ enter 目标模式
     * enter handler 内部调 setGameState 做状态转移
     */
    function transitionTo(modeName, ctx) {
        // cleanup 当前模式（仅资源清理，不做状态转移 — ctx.fullExit 默认 false）
        if (activeMode && handlers[activeMode] && handlers[activeMode].cleanup) {
            if (modeTimers[activeMode]) {
                modeTimers[activeMode].clearAll();
            }
            handlers[activeMode].cleanup(ctx || {});
            Logger.info('ModeLifecycle: cleanup 模式', activeMode);
        }

        previousMode = activeMode;
        activeMode = modeName;

        // enter 目标模式（enter handler 内部调 setGameState）
        if (modeName && handlers[modeName] && handlers[modeName].enter) {
            handlers[modeName].enter(ctx);
            Logger.info('ModeLifecycle: enter 模式', modeName);
        }
    }

    /**
     * 重启指定模式
     * 如果 handler 有 restart 方法则调 restart，否则 cleanup 再 enter
     */
    function restartMode(modeName, ctx) {
        if (!modeName || !handlers[modeName]) return;
        if (handlers[modeName].restart) {
            handlers[modeName].restart(ctx);
            Logger.info('ModeLifecycle: restart 模式', modeName);
        } else {
            // 兜底：cleanup 再 enter
            if (handlers[modeName].cleanup) handlers[modeName].cleanup(ctx || {});
            handlers[modeName].enter(ctx);
            Logger.info('ModeLifecycle: fallback restart 模式', modeName);
        }
    }

    /**
     * 清理指定模式的所有资源 + 状态转移（ctx.fullExit=true）
     * 用于"返回菜单"等完整退出场景
     */
    function cleanupMode(modeName, ctx) {
        if (!modeName) return;

        if (modeTimers[modeName]) {
            modeTimers[modeName].clearAll();
        }

        if (handlers[modeName] && handlers[modeName].cleanup) {
            handlers[modeName].cleanup(ctx || { fullExit: true });
        }

        // 统一存储触发 — 模式退出时自动保存
        if (saveDataFn) {
            saveDataFn();
            Logger.info('ModeLifecycle: 自动保存（模式', modeName, '退出）');
        }

        // 清零 activeMode（仅在当前模式就是退出模式时）
        if (activeMode === modeName) {
            previousMode = activeMode;
            activeMode = null;
        }

        Logger.info('ModeLifecycle: 清理模式', modeName);
    }

    /**
     * 查询某模式是否已注册
     */
    function isRegistered(modeName) {
        return !!handlers[modeName];
    }

    /**
     * 获取某模式当前是否活跃
     */
    function isActive(modeName) {
        return activeMode === modeName;
    }

    return {
        registerMode: registerMode,
        transitionTo: transitionTo,
        restartMode: restartMode,
        cleanupMode: cleanupMode,
        pauseActive: pauseActive,
        resumeActive: resumeActive,
        setActiveMode: setActiveMode,
        detectModeForState: detectModeForState,
        forceResetActive: forceResetActive,
        getActiveMode: getActiveMode,
        getPreviousMode: getPreviousMode,
        setModeTimer: setModeTimer,
        setModeTimeout: setModeTimeout,
        clearModeTimer: clearModeTimer,
        isRegistered: isRegistered,
        isActive: isActive
    };
}

export { createModeLifecycleManager };