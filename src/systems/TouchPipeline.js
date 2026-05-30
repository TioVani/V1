/**
 * 统一触摸管道（Touch Pipeline）
 * 中间件模式：将触摸生命周期（Start→Move→End）变成显式管道，
 * 每个消费者系统注册为中间件，管道按优先级顺序执行。
 *
 * 三种返回结果：
 *   PASS    — 不关我事，继续下一个中间件
 *   HANDLED — 我处理了且消费了触点，管道停止
 *   INTERCEPT — 我处理了但触点可穿透，后续中间件也收到
 */

var TOUCH_RESULT = {
    PASS: 'pass',
    HANDLED: 'handled',
    INTERCEPT: 'intercept'
};

var DRAG_SWITCH_THRESHOLD = 15;

function createTouchPipeline(deps) {
    var normalBattleAdapter = deps.normalBattleAdapter;
    var linkChainSystem = deps.linkChainSystem;
    var chargeSystem = deps.chargeSystem;
    var dragSystem = deps.dragSystem;
    var rhythmSkillSystem = deps.rhythmSkillSystem;
    var poisonPuddleSystem = deps.poisonPuddleSystem;
    var touchGestureSystem = deps.touchGestureSystem;
    var playerEffects = deps.playerEffects;
    var handlePoisonPuddleStar = deps.handlePoisonPuddleStar || null;

    // 管道内部状态
    var _pendingFallbackStar = null;
    var _pendingFallbackTouchId = null;
    var _pendingFallbackOriginalTime = 0;
    var activeGesture = null;  // { type, touchId, startX, startY }
    var d2TimerId = null;

    // ═══════════════════════════════════════════════════════
    // 管道内部辅助函数
    // ═══════════════════════════════════════════════════════

    function cancelActiveGesture() {
        if (d2TimerId) {
            clearTimeout(d2TimerId);
            d2TimerId = null;
        }
        activeGesture = null;
    }

    function hitTestStar(x, y, stars) {
        for (var i = stars.length - 1; i >= 0; i--) {
            var star = stars[i];
            if (star._charging) continue;
            var hitRadius = star.size > 50 ? star.size : Math.max(Math.floor(star.size * 0.7), 32);
            if (star.falling) hitRadius *= 2;
            var dx = x - star.x;
            var dy = y - star.y;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                return star;
            }
        }
        return null;
    }

    function beginMonitoring(ctx, star) {
        if (!chargeSystem) return;
        chargeSystem.beginMonitoring(ctx.x, ctx.y, ctx.touchId, star);
        d2TimerId = setTimeout(function () {
            if (activeGesture && activeGesture.type === 'monitoring' && activeGesture.touchId === ctx.touchId) {
                chargeSystem.checkTransitionToCharging();
            }
        }, 150);
        activeGesture = { type: 'monitoring', touchId: ctx.touchId, startX: ctx.x, startY: ctx.y };
    }

    function beginSwipeTracking(ctx) {
        if (linkChainSystem && !linkChainSystem.isSwipeActive()) {
            linkChainSystem.beginSwipeTracking(ctx.x, ctx.y);
        }
        activeGesture = { type: 'swipe', touchId: ctx.touchId, startX: ctx.x, startY: ctx.y };
    }

    function beginDrag(ctx) {
        if (!dragSystem) return;
        dragSystem.beginDrag(ctx.x, ctx.y, ctx.touchId);
        activeGesture = { type: 'drag', touchId: ctx.touchId, startX: ctx.x, startY: ctx.y };
    }

    // ═══════════════════════════════════════════════════════
    // 中间件定义 — TouchStart 阶段
    // ═══════════════════════════════════════════════════════

    // 兰姆达0：状态门
    function groundGuard(ctx) {
        var effects = ctx.playerEffects;
        if (effects && effects.isStunned && effects.isStunned()) {
            return TOUCH_RESULT.HANDLED;
        }
        if (!ctx.isGrounded) {
            return TOUCH_RESULT.HANDLED;
        }
        return TOUCH_RESULT.PASS;
    }

    // 兰姆达1：节奏技
    function rhythmSkillMiddleware(ctx) {
        if (!rhythmSkillSystem || !rhythmSkillSystem.isActive()) {
            return TOUCH_RESULT.PASS;
        }
        if (rhythmSkillSystem.handleTouch(ctx.x, ctx.y)) {
            return TOUCH_RESULT.HANDLED;
        }
        return TOUCH_RESULT.PASS;
    }

    // 兰姆达2：联连触发
    function linkChainMiddleware(ctx) {
        if (!linkChainSystem || !linkChainSystem.isReady()) {
            return TOUCH_RESULT.PASS;
        }
        if (linkChainSystem.handleTriggerTouch(ctx.x, ctx.y)) {
            return TOUCH_RESULT.INTERCEPT;
        }
        return TOUCH_RESULT.PASS;
    }

    // 兰姆达3：手势分类
    function gestureMiddleware(ctx) {
        if (activeGesture && activeGesture.touchId === ctx.touchId) {
            return TOUCH_RESULT.HANDLED;
        }
        if (activeGesture) {
            cancelActiveGesture();
        }

        // D4 联连窗口激活 → 全屏划链
        if (linkChainSystem && linkChainSystem.isActive()) {
            beginSwipeTracking(ctx);
            return TOUCH_RESULT.INTERCEPT;
        }

        var hitStar = hitTestStar(ctx.x, ctx.y, ctx.stars);
        if (hitStar) {
            if (chargeSystem && chargeSystem.isUnlocked()) {
                beginMonitoring(ctx, hitStar);
                _pendingFallbackStar = hitStar;
                _pendingFallbackTouchId = ctx.touchId;
                _pendingFallbackOriginalTime = hitStar.disappearTime;
                return TOUCH_RESULT.HANDLED;
            }
            return TOUCH_RESULT.PASS;
        }

        if (dragSystem && dragSystem.isUnlocked() && dragSystem.isInCharacterArea(ctx.x, ctx.y)) {
            beginDrag(ctx);
            return TOUCH_RESULT.HANDLED;
        }

        return TOUCH_RESULT.PASS;
    }

    // 兰姆达4：灵光点击
    function starClickMiddleware(ctx) {
        if (!normalBattleAdapter) return TOUCH_RESULT.PASS;
        return normalBattleAdapter.handleStarClick(ctx.x, ctx.y)
            ? TOUCH_RESULT.HANDLED
            : TOUCH_RESULT.PASS;
    }

    // 兰姆达5：毒液滩独立灵韵数组
    function poisonPuddleMiddleware(ctx) {
        if (!poisonPuddleSystem) return TOUCH_RESULT.PASS;
        var hit = poisonPuddleSystem.checkPoisonStarHit(ctx.x, ctx.y);
        if (hit && hit.hit) {
            if (handlePoisonPuddleStar) {
                handlePoisonPuddleStar(hit.star, hit.index);
            }
            return TOUCH_RESULT.INTERCEPT;
        }
        return TOUCH_RESULT.PASS;
    }

    // ═══════════════════════════════════════════════════════
    // 中间件定义 — TouchEnd 阶段
    // ═══════════════════════════════════════════════════════

    // d1Fallback：监控期短触回退为 D1 点击
    function d1FallbackMiddleware(ctx) {
        var star = _pendingFallbackStar;

        if (star && _pendingFallbackTouchId === ctx.touchId
            && chargeSystem && chargeSystem.isMonitoring()) {

            chargeSystem.cancelCharge();
            star.disappearTime = _pendingFallbackOriginalTime || Date.now() + 5000;

            if (normalBattleAdapter) {
                normalBattleAdapter.handleStarClick(star.x, star.y);
            }

            _pendingFallbackStar = null;
            _pendingFallbackTouchId = null;
            _pendingFallbackOriginalTime = 0;
            // 清理活动手势
            if (d2TimerId) {
                clearTimeout(d2TimerId);
                d2TimerId = null;
            }
            activeGesture = null;
            return TOUCH_RESULT.HANDLED;
        }

        return TOUCH_RESULT.PASS;
    }

    // 手势结束：D2释放/D3结算/D4松手
    function gestureEndMiddleware(ctx) {
        if (!activeGesture) return TOUCH_RESULT.PASS;

        switch (activeGesture.type) {
            case 'monitoring':
                if (d2TimerId) {
                    clearTimeout(d2TimerId);
                    d2TimerId = null;
                }
                if (chargeSystem && chargeSystem.isAutoCast()) {
                    // autoCast 锁定施法，不操作
                } else if (chargeSystem && chargeSystem.isCharging()) {
                    chargeSystem.releaseCharge();
                }
                // monitoring 状态的松手由 d1FallbackMiddleware 处理
                break;
            case 'drag':
                if (dragSystem) dragSystem.endDrag();
                break;
            case 'swipe':
                if (linkChainSystem) linkChainSystem.endSwipe();
                break;
        }

        // charging/autoCast 场景：清理 _pendingFallbackStar
        if (chargeSystem && (chargeSystem.isCharging() || chargeSystem.isAutoCast())) {
            _pendingFallbackStar = null;
            _pendingFallbackTouchId = null;
        }

        activeGesture = null;
        return TOUCH_RESULT.PASS;
    }

    // ═══════════════════════════════════════════════════════
    // 中间件定义 — TouchMove 阶段
    // ═══════════════════════════════════════════════════════

    function gestureMoveMiddleware(ctx) {
        if (!activeGesture) return TOUCH_RESULT.PASS;

        switch (activeGesture.type) {
            case 'monitoring':
                if (chargeSystem) chargeSystem.updateMonitoring(ctx.x, ctx.y);
                // 检测滑动距离 → 切换为拖拽
                var dx = ctx.x - activeGesture.startX;
                var dy = ctx.y - activeGesture.startY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > DRAG_SWITCH_THRESHOLD && dragSystem && dragSystem.isUnlocked()) {
                    if (d2TimerId) {
                        clearTimeout(d2TimerId);
                        d2TimerId = null;
                    }
                    chargeSystem.cancelCharge();
                    if (dragSystem.beginDrag(ctx.x, ctx.y, activeGesture.touchId)) {
                        activeGesture = { type: 'drag', touchId: activeGesture.touchId, startX: ctx.x, startY: ctx.y };
                    }
                }
                break;
            case 'drag':
                if (dragSystem) {
                    var dragResult = dragSystem.updateDrag(ctx.x, ctx.y);
                    if (dragResult && dragResult.transitionToCharge) {
                        chargeSystem.beginDragCharge(ctx.x, ctx.y, activeGesture.touchId, dragResult.aggregate);
                        activeGesture = { type: 'monitoring', touchId: activeGesture.touchId, startX: ctx.x, startY: ctx.y };
                    }
                }
                break;
            case 'swipe':
                if (linkChainSystem) linkChainSystem.trackSwipePath(ctx.x, ctx.y);
                break;
        }

        return TOUCH_RESULT.PASS;
    }

    // ═══════════════════════════════════════════════════════
    // 中间件链定义
    // ═══════════════════════════════════════════════════════

    var startChain = [
        groundGuard,
        rhythmSkillMiddleware,
        linkChainMiddleware,
        gestureMiddleware,
        starClickMiddleware,
        poisonPuddleMiddleware
    ];

    var moveChain = [
        groundGuard,
        gestureMoveMiddleware
    ];

    // d1Fallback 排在 gestureEnd 前面：monitoring 松手由 d1Fallback 处理；
    // gestureEnd 只负责 charging/autoCast/drag/swipe 的结算
    var endChain = [
        groundGuard,
        d1FallbackMiddleware,
        gestureEndMiddleware
    ];

    // ═══════════════════════════════════════════════════════
    // 管道主循环
    // ═══════════════════════════════════════════════════════

    function runPipeline(chain, ctx) {
        for (var i = 0; i < chain.length; i++) {
            var result = chain[i](ctx);
            if (result === TOUCH_RESULT.HANDLED) {
                if (ctx.intercepted) {
                    ctx.intercepted = false;
                    continue;
                }
                break;
            }
            if (result === TOUCH_RESULT.INTERCEPT) {
                ctx.intercepted = true;
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // 公开 API
    // ═══════════════════════════════════════════════════════

    function createContext(opts) {
        return {
            x: opts.x || 0,
            y: opts.y || 0,
            touchId: opts.touchId || null,
            timestamp: opts.timestamp || Date.now(),
            phase: opts.phase || 'start',
            intercepted: false,
            stars: opts.stars || [],
            playerEffects: opts.playerEffects || {},
            isGrounded: opts.isGrounded !== undefined ? opts.isGrounded : true
        };
    }

    function runStart(ctx) {
        ctx.phase = 'start';
        ctx.intercepted = false;
        runPipeline(startChain, ctx);
    }

    function runMove(ctx) {
        ctx.phase = 'move';
        ctx.intercepted = false;
        runPipeline(moveChain, ctx);
    }

    function runEnd(ctx) {
        ctx.phase = 'end';
        ctx.intercepted = false;
        runPipeline(endChain, ctx);
    }

    return {
        createContext: createContext,
        runStart: runStart,
        runMove: runMove,
        runEnd: runEnd,
        TOUCH_RESULT: TOUCH_RESULT
    };
}

export { createTouchPipeline };