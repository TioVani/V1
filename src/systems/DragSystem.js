import Logger from '../utils/Logger.js';
/**
 * D3 拖拽聚合系统（Drag System）
 * 闭包工厂 + 依赖注入模式
 *
 * 触摸角色区域开始拖拽，路径上的灵光：
 * - 同类型灵光 → 吸收聚合（+1层，最多10层）
 * - 异类型灵光 → 触碰消散
 * 每层 +5% 攻击力
 *
 * 解锁条件：角色等级 >= 10
 */

var D3_UNLOCK_LEVEL = 10;

var DRAG_COOLDOWN_MS = 2000;
var MAX_STACKS = 10;
var STACK_ATTACK_BONUS = 0.05;
var CHARACTER_AREA_RADIUS = 45;  // 角色区域半径（缩放前）

function createDragSystem(deps) {
    var getPlayerData = deps.getPlayerData;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getStars = deps.getStars || function () { return []; };
    var setStars = deps.setStars || function () { };
    var addMessage = deps.addMessage || function () { };
    var vibrateShort = deps.vibrateShort || function () { };

    // 内部状态
    var state = {
        phase: 'idle',           // 'idle' | 'dragging' | 'cooldown'
        touchId: null,
        currentX: 0,
        currentY: 0,
        absorbedTypes: {},       // 本次拖拽已吸收的灵光类型
        dragStacks: 0,           // 整局战斗累积层数 0-10
        lastDragEndTime: 0,
        rootDuration: 0,         // Boss 定身剩余时间
        processedStars: []       // 本次拖拽已处理的灵光（避免重复）
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
        state.absorbedTypes = {};
        state.processedStars = [];
        return true;
    }

    /**
     * 拖拽移动，检测路径上的灵光碰撞
     */
    function updateDrag(x, y) {
        if (state.phase !== 'dragging') return;

        state.currentX = x;
        state.currentY = y;

        var stars = typeof getStars === 'function' ? getStars() : [];
        if (!stars || !stars.length) return;

        var dragHitRadius = 30 * (getScreenScale ? getScreenScale() : 1);
        var removedIndices = [];

        for (var i = stars.length - 1; i >= 0; i--) {
            var s = stars[i];
            // 跳过已处理的灵光
            if (state.processedStars.indexOf(s) !== -1) continue;

            var dx = x - s.x;
            var dy = y - s.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var hitRadius = (s.size || 48) / 2 + dragHitRadius;

            if (dist < hitRadius) {
                state.processedStars.push(s);
                removedIndices.push(i);

                var starType = s.type || 'normal';

                if (Object.keys(state.absorbedTypes).length === 0) {
                    // 第一个灵光：设为本次拖拽的元素类型
                    state.absorbedTypes[starType] = true;
                    if (state.dragStacks < MAX_STACKS) {
                        state.dragStacks++;
                        addMessage('吸收 ' + (s.emoji || starType) + ' 聚合+' + state.dragStacks, '#ffd700');
                        vibrateShort({ type: 'light' });
                    }
                } else if (state.absorbedTypes[starType]) {
                    // 同类型：吸收
                    if (state.dragStacks < MAX_STACKS) {
                        state.dragStacks++;
                        addMessage('吸收 ' + (s.emoji || starType) + ' 聚合+' + state.dragStacks, '#ffd700');
                        vibrateShort({ type: 'light' });
                    }
                } else {
                    // 异类型：消散
                    addMessage('消散 ' + (s.emoji || starType), '#888888');
                }
            }
        }

        // 移除已处理的灵光
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

    function endDrag() {
        if (state.phase !== 'dragging') return;
        state.phase = 'cooldown';
        state.lastDragEndTime = Date.now();
        state.touchId = null;
        state.absorbedTypes = {};
        state.processedStars = [];

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

        // 层数计数器
        if (state.dragStacks > 0) {
            ctx.font = 'bold ' + (13 * scale) + 'px sans-serif';
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            ctx.fillText('聚合: ' + state.dragStacks + '/' + MAX_STACKS, screenW / 2, screenH - 95 * scale);
        }
    }

    function reset() {
        state.phase = 'idle';
        state.touchId = null;
        state.currentX = 0;
        state.currentY = 0;
        state.absorbedTypes = {};
        state.dragStacks = 0;
        state.lastDragEndTime = 0;
        state.rootDuration = 0;
        state.processedStars = [];
    }

    return {
        isUnlocked: isUnlocked,
        isInCharacterArea: isInCharacterArea,
        beginDrag: beginDrag,
        updateDrag: updateDrag,
        endDrag: endDrag,
        isDragging: isDragging,
        isOnCooldown: isOnCooldown,
        isRooted: isRooted,
        setBossRoot: setBossRoot,
        getDragStacks: getDragStacks,
        getAttackBonus: getAttackBonus,
        render: render,
        reset: reset
    };
}

export { createDragSystem };