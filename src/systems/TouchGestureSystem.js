import Logger from '../utils/Logger.js';
/**
 * 手势分类协调器（Touch Gesture System）
 * 闭包工厂 + 依赖注入模式
 *
 * 在 touchstart/touchmove/touchend 时判断手势类型，分发给对应的 D 系统：
 * - D4 联连窗口激活 → 全屏划链
 * - 命中灵光 → D1 + D5（走现有流程）
 * - 命中角色区域 → D3 拖拽
 * - 空白区域按住 → D2 蓄力监控
 *
 * 各 D 系统作为依赖注入，此模块只做协调，不实现任何维度逻辑。
 */

var GESTURE_TYPE = {
    NONE: 'none',
    D1_CLICK: 'd1_click',       // 灵光点击，走现有流程
    D2_MONITOR: 'd2_monitor',   // 空白区域，监控是否变长按
    D3_DRAG: 'd3_drag',         // 拖拽聚合
    D4_SWIPE: 'd4_swipe'        // 联连划链
};

var D2_MONITOR_DELAY_MS = 500;

function createTouchGestureSystem(deps) {
    // 注入各 D 系统
    var chargeSystem = deps.chargeSystem;
    var dragSystem = deps.dragSystem;
    var linkChainSystem = deps.linkChainSystem;
    var rhythmSystem = deps.rhythmSystem;

    // 注入数据访问
    var getStars = deps.getStars || function () { return []; };
    var getPlayerEffects = deps.getPlayerEffects || function () { return {}; };

    // 内部状态
    var activeGesture = {
        type: GESTURE_TYPE.NONE,
        touchId: null,
        d2TimerId: null
    };

    /**
     * 灵光命中测试（与 BattleEngine 保持一致）
     */
    function hitTestStar(x, y, stars) {
        for (var i = stars.length - 1; i >= 0; i--) {
            var star = stars[i];
            var hitRadius = star.size > 50 ? star.size : star.size / 2 + 10;
            var dx = x - star.x;
            var dy = y - star.y;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                return star;
            }
        }
        return null;
    }

    /**
     * 检查触摸是否被打断状态阻止
     */
    function isStunned() {
        var effects = getPlayerEffects();
        if (effects.stunned) {
            if (Date.now() >= effects.stunEndTime) {
                effects.stunned = false;
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * handleTouchStart 时调用
     * @returns {boolean} true = 手势已消费，跳过现有处理
     */
    function handleGestureStart(x, y, touchId) {
        if (isStunned()) return false;

        // 1. D4 联连窗口激活 → 全屏划链
        if (linkChainSystem && linkChainSystem.isActive()) {
            activeGesture.type = GESTURE_TYPE.D4_SWIPE;
            activeGesture.touchId = touchId;
            linkChainSystem.beginSwipeTracking();
            return true;
        }

        var stars = getStars();

        // 2. 命中灵光 → D1 + D5（走现有流程）
        var hitStar = hitTestStar(x, y, stars);
        if (hitStar) {
            activeGesture.type = GESTURE_TYPE.D1_CLICK;
            activeGesture.touchId = touchId;

            // 返回 false，让现有 handleStarClick 流程处理
            // D5 节拍判定在 NormalBattleAdapter 中基于 star.createTime 自动进行
            return false;
        }

        // 3. 命中角色区域 → D3 拖拽
        if (dragSystem && dragSystem.isInCharacterArea(x, y) && dragSystem.isUnlocked()) {
            if (dragSystem.beginDrag(x, y, touchId)) {
                activeGesture.type = GESTURE_TYPE.D3_DRAG;
                activeGesture.touchId = touchId;
                return true;
            }
        }

        // 4. 空白区域 → D2 监控
        if (chargeSystem && chargeSystem.isUnlocked()) {
            if (chargeSystem.beginMonitoring(x, y, touchId)) {
                activeGesture.type = GESTURE_TYPE.D2_MONITOR;
                activeGesture.touchId = touchId;

                // 500ms 后检查是否转蓄力
                activeGesture.d2TimerId = setTimeout(function () {
                    if (activeGesture.type === GESTURE_TYPE.D2_MONITOR) {
                        chargeSystem.checkTransitionToCharging();
                    }
                }, D2_MONITOR_DELAY_MS);

                return true;
            }
        }

        // 空白区域无操作
        activeGesture.type = GESTURE_TYPE.NONE;
        return false;
    }

    /**
     * handleTouchMove 时调用
     */
    function handleGestureMove(x, y) {
        switch (activeGesture.type) {
            case GESTURE_TYPE.D2_MONITOR:
                if (chargeSystem) chargeSystem.updateMonitoring(x, y);
                break;
            case GESTURE_TYPE.D3_DRAG:
                if (dragSystem) dragSystem.updateDrag(x, y);
                break;
            case GESTURE_TYPE.D4_SWIPE:
                if (linkChainSystem) linkChainSystem.trackSwipePath(x, y);
                break;
        }
    }

    /**
     * handleTouchEnd 时调用
     */
    function handleGestureEnd() {
        switch (activeGesture.type) {
            case GESTURE_TYPE.D2_MONITOR:
                // 清理监控定时器
                if (activeGesture.d2TimerId) {
                    clearTimeout(activeGesture.d2TimerId);
                    activeGesture.d2TimerId = null;
                }
                // 如果还在监控中（没转蓄力），释放（空操作）
                if (chargeSystem && chargeSystem.isCharging()) {
                    chargeSystem.releaseCharge();
                } else if (chargeSystem && chargeSystem.isMonitoring()) {
                    chargeSystem.cancelCharge();
                }
                break;
            case GESTURE_TYPE.D3_DRAG:
                if (dragSystem) dragSystem.endDrag();
                break;
            case GESTURE_TYPE.D4_SWIPE:
                if (linkChainSystem) linkChainSystem.endSwipe();
                break;
            case GESTURE_TYPE.D1_CLICK:
                // D1 已由现有流程处理，无需额外操作
                break;
        }

        activeGesture.type = GESTURE_TYPE.NONE;
        activeGesture.touchId = null;
    }

    function getActiveGestureType() {
        return activeGesture.type;
    }

    function reset() {
        if (activeGesture.d2TimerId) {
            clearTimeout(activeGesture.d2TimerId);
            activeGesture.d2TimerId = null;
        }
        activeGesture.type = GESTURE_TYPE.NONE;
        activeGesture.touchId = null;
    }

    return {
        handleGestureStart: handleGestureStart,
        handleGestureMove: handleGestureMove,
        handleGestureEnd: handleGestureEnd,
        getActiveGestureType: getActiveGestureType,
        reset: reset,
        GESTURE_TYPE: GESTURE_TYPE
    };
}

export { createTouchGestureSystem };