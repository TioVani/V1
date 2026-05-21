import Logger from '../utils/Logger.js';
import { SATURATION_COSTS } from './SaturationState.js';
/**
 * D3 拖拽聚合系统（Drag System）
 * 闭包工厂 + 依赖注入模式
 *
 * 触摸角色区域开始拖拽，路径上的灵光全部吸附聚合：
 * - 所有类型灵光均可吸收（不再区分类型）
 * - 每吸附1灵光消耗 8% 饱和度
 * - 每层 +5% 攻击力，最多10层
 *
 * 解锁条件：角色等级 >= 10
 */

var D3_UNLOCK_LEVEL = 10;

var DRAG_COOLDOWN_MS = 2000;
var MAX_STACKS = 10;
var MAX_AGGREGATE = 6;          // 本轮聚合上限
var STACK_ATTACK_BONUS = 0.05;
var CHARACTER_AREA_RADIUS = 45;  // 角色区域半径（缩放前）
var IDLE_THRESHOLD = 5;          // 手指停下判定像素阈值

function createDragSystem(deps) {
    var getPlayerData = deps.getPlayerData;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getStars = deps.getStars || function () { return []; };
    var setStars = deps.setStars || function () { };
    var addMessage = deps.addMessage || function () { };
    var vibrateShort = deps.vibrateShort || function () { };
    var saturationState = deps.saturationState;

    // 内部状态
    var state = {
        phase: 'idle',           // 'idle' | 'dragging' | 'cooldown'
        touchId: null,
        currentX: 0,
        currentY: 0,
        dragStacks: 0,           // 整局战斗累积层数 0-10
        lastDragEndTime: 0,
        rootDuration: 0,         // Boss 定身剩余时间
        processedStars: [],      // 本次拖拽已处理的灵光（避免重复）
        currentAggregate: 0,     // 本轮聚合数量（上限MAX_AGGREGATE）
        idleSinceTime: 0,        // 手指停下计时起点
        lastMoveX: 0,
        lastMoveY: 0,
        draggingStars: []        // 被聚合的灵光对象（_dragging标记）
    };

    function isUnlocked() {
        var pd = getPlayerData();
        if (!pd || !pd.currentCharacterId) return false;
        var charExp = pd.characterExperience;
        if (!charExp || !charExp[pd.currentCharacterId]) return false;
        return charExp[pd.currentCharacterId].level >= D3_UNLOCK_LEVEL;
    }

    function isInCharacterArea(x, y) {
        var scale = getScreenScale ? getScreenScale() : 1;
        var centerX = (getScreenWidth ? getScreenWidth() : 375) / 2;
        var centerY = (getScreenHeight ? getScreenHeight() : 667) - 75 * scale;
        var radius = CHARACTER_AREA_RADIUS * scale;
        var dx = x - centerX;
        var dy = y - centerY;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
    }

    function isDragging() {
        return state.phase === 'dragging';
    }

    function isOnCooldown() {
        return state.phase === 'cooldown';
    }

    function isRooted() {
        return state.rootDuration > 0 && Date.now() < state.rootDuration;
    }

    function setBossRoot(ms) {
        state.rootDuration = Date.now() + ms;
    }

    function beginDrag(x, y, touchId) {
        if (!isUnlocked()) return false;
        if (isOnCooldown()) return false;
        if (isRooted()) {
            addMessage('被定身，无法拖拽!', '#ff4444');
            return false;
        }

        state.phase = 'dragging';
        state.touchId = touchId;
        state.currentX = x;
        state.currentY = y;
        state.processedStars = [];
        state.currentAggregate = 0;
        state.idleSinceTime = 0;
        state.lastMoveX = x;
        state.lastMoveY = y;
        state.draggingStars = [];
        return true;
    }

    /**
     * 拖拽移动，检测路径上的灵光碰撞
     * @returns {object|null} transition signal if finger idle → should enter charge
     */
    function updateDrag(x, y) {
        if (state.phase !== 'dragging') return null;

        state.currentX = x;
        state.currentY = y;

        // ── 聚合逻辑（上限MAX_AGGREGATE） ──
        if (state.currentAggregate < MAX_AGGREGATE) {
            var stars = typeof getStars === 'function' ? getStars() : [];
            if (stars && stars.length) {
                var dragHitRadius = 30 * (getScreenScale ? getScreenScale() : 1);
                var removedIndices = [];

                for (var i = stars.length - 1; i >= 0; i--) {
                    var s = stars[i];
                    // 跳过已处理的灵光、已charging的灵光
                    if (state.processedStars.indexOf(s) !== -1) continue;
                    if (s._charging || s._dragging) continue;

                    var dx = x - s.x;
                    var dy = y - s.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var hitRadius = (s.size || 48) / 2 + dragHitRadius;

                    if (dist < hitRadius) {
                        state.processedStars.push(s);

                        // 检查饱和度是否足够
                        if (!saturationState || !saturationState.canAbsorb()) {
                            addMessage('体力不足!', '#ff4444');
                            break;
                        }

                        // 标记为 _dragging（保护不被 cleanup 删除）
                        s._dragging = true;
                        s.disappearTime = Date.now() + 86400000;
                        state.draggingStars.push(s);
                        removedIndices.push(i);

                        state.currentAggregate++;
                        if (state.dragStacks < MAX_STACKS) {
                            state.dragStacks++;
                            saturationState.consume(SATURATION_COSTS.DRAG_ABSORB);
                        }
                        addMessage('吸收 ' + (s.emoji || '灵光') + ' 聚合+' + state.currentAggregate, '#ffd700');
                        vibrateShort({ type: 'light' });

                        if (state.currentAggregate >= MAX_AGGREGATE) break;
                    }
                }

                // 移除已聚合的灵光（从共享数组）
                if (removedIndices.length > 0) {
                    var newStars = [];
                    for (var j = 0; j < stars.length; j++) {
                        if (removedIndices.indexOf(j) === -1) {
                            newStars.push(stars[j]);
                        }
                    }
                    if (typeof setStars === 'function') {
                        setStars(newStars);
                    }
                }
            }
        }

        // ── 手指停下/移动追踪（每帧 update 完成判定） ──
        if (state.currentAggregate >= 1) {
            var moveDelta = Math.sqrt((x - state.lastMoveX) * (x - state.lastMoveX) + (y - state.lastMoveY) * (y - state.lastMoveY));
            if (moveDelta < IDLE_THRESHOLD) {
                // 手指停下 → 开始计时
                if (!state.idleSinceTime) state.idleSinceTime = Date.now();
            } else {
                // 手指还在动 → 重置计时
                state.idleSinceTime = 0;
                state.lastMoveX = x;
                state.lastMoveY = y;
            }
        }

        return null;
    }

    /**
     * 每帧更新：检测手指闲置 → 进入蓄力
     * @returns {object|null} transition signal
     */
    function update(dt) {
        if (state.phase !== 'dragging') return null;
        if (state.currentAggregate < 1) return null;
        if (!state.idleSinceTime) return null; // 还没开始计时（手指还在动）

        if (Date.now() - state.idleSinceTime >= 150) {
            return { transitionToCharge: true, aggregate: state.currentAggregate };
        }
        return null;
    }

    /**
     * 拖拽→蓄力过渡后清理拖拽状态
     */
    function finishDragTransition() {
        for (var i = 0; i < state.draggingStars.length; i++) {
            state.draggingStars[i]._dragging = false;
        }
        state.draggingStars = [];
        state.phase = 'idle';
        state.touchId = null;
        state.processedStars = [];
        state.currentAggregate = 0;
        state.idleSinceTime = 0;
        state.lastMoveX = 0;
        state.lastMoveY = 0;
    }

    function endDrag() {
        if (state.phase !== 'dragging') return;
        // 被聚合的灵光飞出消失
        for (var i = 0; i < state.draggingStars.length; i++) {
            state.draggingStars[i]._dragging = false;
        }
        state.draggingStars = [];
        state.phase = 'cooldown';
        state.lastDragEndTime = Date.now();
        state.touchId = null;
        state.processedStars = [];
        state.currentAggregate = 0;
        state.idleSinceTime = 0;
        state.lastMoveX = 0;
        state.lastMoveY = 0;

        // 2秒后解除冷却
        setTimeout(function () {
            if (state.phase === 'cooldown') {
                state.phase = 'idle';
            }
        }, DRAG_COOLDOWN_MS);
    }

    function getDragStacks() {
        return state.dragStacks;
    }

    /**
     * 返回当前攻击力加成倍率（1 + stacks * 0.05）
     */
    function getAttackBonus() {
        return 1 + state.dragStacks * STACK_ATTACK_BONUS;
    }

    /**
     * 渲染拖拽视觉
     */
    function render(ctx, screenW, screenH, scale) {
        if (state.phase !== 'dragging') return;

        // 拖拽锚点发光圈
        ctx.beginPath();
        ctx.arc(state.currentX, state.currentY, 14 * scale, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.lineWidth = 2.5 * scale;
        ctx.stroke();

        // 内圈
        ctx.beginPath();
        ctx.arc(state.currentX, state.currentY, 6 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.fill();

        // 被聚合的灵光跟随手指
        for (var i = 0; i < state.draggingStars.length; i++) {
            var ds = state.draggingStars[i];
            var emoji = ds.emoji || '⭐';
            var sz = (ds.size || 28) * (ds.scale || 1) * scale;
            // 以手指位置为中心，螺旋排列
            var angle = i * Math.PI * 2 / Math.max(state.draggingStars.length, 3) + Date.now() / 500;
            var orbitR = 18 * scale + i * 6 * scale;
            var sx = state.currentX + Math.cos(angle) * orbitR;
            var sy = state.currentY + Math.sin(angle) * orbitR;
            ctx.font = sz + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, sx, sy);
        }

        // 聚合数量标签
        if (state.currentAggregate > 0) {
            ctx.font = 'bold ' + (12 * scale) + 'px sans-serif';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText('聚合×' + state.currentAggregate, state.currentX, state.currentY - 22 * scale);
        }
    }

    function reset() {
        state.phase = 'idle';
        state.touchId = null;
        state.currentX = 0;
        state.currentY = 0;
        state.dragStacks = 0;
        state.lastDragEndTime = 0;
        state.rootDuration = 0;
        state.processedStars = [];
        state.currentAggregate = 0;
        state.idleSinceTime = 0;
        state.lastMoveX = 0;
        state.lastMoveY = 0;
        state.draggingStars = [];
    }

    return {
        isUnlocked: isUnlocked,
        isInCharacterArea: isInCharacterArea,
        beginDrag: beginDrag,
        updateDrag: updateDrag,
        update: update,
        endDrag: endDrag,
        finishDragTransition: finishDragTransition,
        isDragging: isDragging,
        isOnCooldown: isOnCooldown,
        isRooted: isRooted,
        setBossRoot: setBossRoot,
        getDragStacks: getDragStacks,
        getAttackBonus: getAttackBonus,
        getCurrentAggregate: function() { return state.currentAggregate; },
        getCurrentX: function() { return state.currentX; },
        getCurrentY: function() { return state.currentY; },
        render: render,
        reset: reset
    };
}

export { createDragSystem };