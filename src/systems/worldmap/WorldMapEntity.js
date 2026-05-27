/**
 * WorldMapEntity — 实体管理（发现/交互分发/优先级/刷新）
 * 管理实体生命周期、按 type 分发交互逻辑
 */
function createWorldMapEntity(deps) {
    var getPlayerPos = deps.getPlayerPos;
    var getWorldConfig = deps.getWorldConfig;
    var onInteractResult = deps.onInteractResult;
    var showToast = deps.showToast;
    var getExplorationPercent = deps.getExplorationPercent;
    var _getCurrentFloor = deps.getCurrentFloor;

    var _entities = [];
    var _entityStates = {};
    var _tutorialComplete = false;
    var _hiddenEntityIds = [];
    var _resolvedTimestamps = {};

    function init(config) {
        _entities = config.entities ? config.entities.slice() : [];
        _entityStates = {};
        for (var i = 0; i < _entities.length; i++) {
            _entityStates[_entities[i].id] = { discovered: true, resolved: false };
        }
    }

    function setTutorialComplete(complete) {
        _tutorialComplete = complete;
    }

    function setHiddenEntityIds(ids) {
        _hiddenEntityIds = ids;
    }

    function isEntityActive(entity) {
        if (!entity) return false;
        if (_hiddenEntityIds.indexOf(entity.id) !== -1) return false;
        if (entity.requireTutorial && !_tutorialComplete) return false;
        if (entity.requireFloor !== undefined && entity.requireFloor !== getCurrentFloor()) return false;
        return true;
    }

    function getCurrentFloor() {
        return _getCurrentFloor ? _getCurrentFloor() : 1;
    }

    function updateDiscoveries() {
        var pos = getPlayerPos();
        for (var i = 0; i < _entities.length; i++) {
            var e = _entities[i];
            if (!isEntityActive(e)) continue;
            var state = _entityStates[e.id];
            if (!state || state.discovered) continue;
            var dx = pos.x - e.x;
            var dy = pos.y - e.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= (e.discoverRadius || (e.interactRadius || 40) * 2)) {
                state.discovered = true;
            }
        }
    }

    function getNearbyEntity() {
        var pos = getPlayerPos();
        var best = null;
        var bestPriority = -1;
        var bestDist = Infinity;

        for (var i = 0; i < _entities.length; i++) {
            var e = _entities[i];
            if (!isEntityActive(e)) continue;
            if (e.type === 'teleport') continue;
            var state = _entityStates[e.id];
            if (!state || state.resolved) continue;
            var dx = pos.x - e.x;
            var dy = pos.y - e.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var ir = e.interactRadius || 40;
            if (dist > ir) continue;
            var prio = e.priority || 0;
            if (prio > bestPriority || (prio === bestPriority && dist < bestDist)) {
                best = e;
                bestPriority = prio;
                bestDist = dist;
            }
        }
        return best;
    }

    function interact(entityId) {
        var entity = null;
        for (var i = 0; i < _entities.length; i++) {
            if (_entities[i].id === entityId) { entity = _entities[i]; break; }
        }
        if (!entity) return null;

        var state = _entityStates[entity.id];
        if (!state) return null;

        if (entity.type === 'chest') {
            state.resolved = true;
            if (onInteractResult) onInteractResult({ type: 'chest', entity: entity, reward: entity.reward });
            return { type: 'chest', reward: entity.reward };
        }

        if (entity.type === 'enemy') {
            if (onInteractResult) onInteractResult({ type: 'enemy', entity: entity });
            return { type: 'enemy', monster: entity.monster, level: entity.level };
        }

        if (entity.type === 'tutorial') {
            if (onInteractResult) onInteractResult({ type: 'tutorial', entity: entity });
            return { type: 'tutorial' };
        }

        if (entity.type === 'tower') {
            if (onInteractResult) onInteractResult({ type: 'tower', entity: entity });
            return { type: 'tower', unlockMenuId: entity.unlockMenuId };
        }

        if (entity.type === 'portal') {
            return handlePortal(entity);
        }

        if (entity.type === 'npc') {
            if (onInteractResult) onInteractResult({ type: 'npc', entity: entity, dialogue: entity.dialogue });
            return { type: 'npc', dialogue: entity.dialogue };
        }

        if (entity.type === 'barrier') {
            return handleBarrier(entity);
        }

        return null;
    }

    function handlePortal(entity) {
        var exploration = getExplorationPercent ? getExplorationPercent() : 1;
        if (entity.requireExploration > 0 && exploration < entity.requireExploration) {
            if (onInteractResult) {
                onInteractResult({ type: 'portal_locked', entity: entity, message: entity.lockedMessage, current: exploration, required: entity.requireExploration });
            }
            return { type: 'portal_locked', message: entity.lockedMessage || '条件未满足', current: exploration, required: entity.requireExploration };
        }
        if (onInteractResult) onInteractResult({ type: 'portal', entity: entity, targetWorld: entity.targetWorld });
        return { type: 'portal', targetWorld: entity.targetWorld };
    }

    function handleBarrier(entity) {
        if (onInteractResult) onInteractResult({ type: 'barrier', entity: entity });
        return { type: 'barrier', lockedMessage: entity.lockedMessage };
    }

    function resolveEntity(entityId) {
        var state = _entityStates[entityId];
        if (state) {
            state.resolved = true;
            _resolvedTimestamps[entityId] = Date.now();
        }
    }

    function respawnEntities() {
        var now = Date.now();
        for (var i = 0; i < _entities.length; i++) {
            var e = _entities[i];
            var state = _entityStates[e.id];
            if (!state || !state.resolved) continue;
            if (e.once) continue;
            if (e.type === 'npc' || e.type === 'portal' || e.type === 'teleport') continue;
            if (e.respawnTime && e.respawnTime > 0) {
                var elapsed = (now - (_resolvedTimestamps[e.id] || 0)) / 1000;
                if (elapsed < e.respawnTime) continue;
            }
            state.resolved = false;
            delete _resolvedTimestamps[e.id];
        }
    }

    function updateRespawnTimers(dt) {
        var now = Date.now();
        for (var i = 0; i < _entities.length; i++) {
            var e = _entities[i];
            if (!e.respawnTime || e.respawnTime <= 0) continue;
            if (e.once) continue;
            if (e.type === 'npc' || e.type === 'portal' || e.type === 'teleport') continue;
            var state = _entityStates[e.id];
            if (!state || !state.resolved) continue;
            var elapsed = (now - (_resolvedTimestamps[e.id] || 0)) / 1000;
            if (elapsed >= e.respawnTime) {
                state.resolved = false;
                delete _resolvedTimestamps[e.id];
            }
        }
    }

    function getActiveEntities() {
        return _entities.filter(isEntityActive);
    }

    function getDiscoveredEntities() {
        return _entities.filter(function(e) {
            if (!isEntityActive(e)) return false;
            var state = _entityStates[e.id];
            return state && state.discovered;
        });
    }

    function isEntityDiscovered(id) {
        var state = _entityStates[id];
        return state ? state.discovered : false;
    }

    function isEntityResolved(id) {
        var state = _entityStates[id];
        return state ? state.resolved : false;
    }

    function getEntityById(id) {
        for (var i = 0; i < _entities.length; i++) {
            if (_entities[i].id === id) return _entities[i];
        }
        return null;
    }

    function getEntityStates() { return _entityStates; }

    function setEntityStates(saved) {
        if (!saved) return;
        for (var id in saved) {
            if (_entityStates[id]) {
                if (saved[id].discovered) _entityStates[id].discovered = true;
                if (saved[id].resolved) _entityStates[id].resolved = true;
            }
        }
    }

    return {
        init: init,
        updateDiscoveries: updateDiscoveries,
        getNearbyEntity: getNearbyEntity,
        interact: interact,
        resolveEntity: resolveEntity,
        respawnEntities: respawnEntities,
        updateRespawnTimers: updateRespawnTimers,
        getActiveEntities: getActiveEntities,
        getDiscoveredEntities: getDiscoveredEntities,
        isEntityDiscovered: isEntityDiscovered,
        isEntityResolved: isEntityResolved,
        getEntityById: getEntityById,
        getEntityStates: getEntityStates,
        setEntityStates: setEntityStates,
        setTutorialComplete: setTutorialComplete,
        setHiddenEntityIds: setHiddenEntityIds,
        isEntityActive: isEntityActive
    };
}

export { createWorldMapEntity };
