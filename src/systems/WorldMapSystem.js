/**
 * WorldMapSystem — 大世界地图系统入口
 * 组合 Player / Entity / Exploration / Unlock 四个子模块，对外暴露统一接口
 */
import { createWorldMapPlayer } from './worldmap/WorldMapPlayer.js';
import { createWorldMapEntity } from './worldmap/WorldMapEntity.js';
import { createWorldMapExploration } from './worldmap/WorldMapExploration.js';
import { createWorldMapUnlock } from './worldmap/WorldMapUnlock.js';
import { getWorldConfig, getAllWorldIds } from '../config/WorldMapConfig.js';

function createWorldMapSystem(deps) {
    var showToast = deps.showToast;
    var savePlayerData = deps.savePlayerData;
    var getPlayerData = deps.getPlayerData;
    var _needsRespawn = false;

    var player = createWorldMapPlayer({
        getWorldConfig: function() { return getWorldConfig(_exploration.getWorldId()); }
    });

    var entity = createWorldMapEntity({
        getPlayerPos: player.getPlayerPos,
        getWorldConfig: function() { return getWorldConfig(_exploration.getWorldId()); },
        onInteractResult: deps.onInteractResult,
        showToast: showToast,
        getExplorationPercent: function() { return _exploration.getExplorationPercent(); }
    });

    var _exploration = createWorldMapExploration({
        getWorldConfig: getWorldConfig,
        getEntityStates: entity.getEntityStates,
        getActiveEntities: entity.getActiveEntities,
        getPlayerPos: player.getPlayerPos,
        setPlayerPos: player.setPlayerPos,
        savePlayerData: savePlayerData,
        loadPlayerData: deps.loadPlayerData
    });

    var unlock = createWorldMapUnlock({
        getWorldConfig: function() { return getWorldConfig(_exploration.getWorldId()); },
        getPlayerPos: player.getPlayerPos,
        setPlayerPos: player.setPlayerPos,
        removeCollisionsById: player.removeCollisionsById,
        setEntityTutorialComplete: entity.setTutorialComplete,
        setHiddenEntityIds: entity.setHiddenEntityIds,
        getHiddenEntityIds: function() { return []; },
        showToast: showToast
    });

    function loadWorld(worldId, fromWorldId) {
        var config = getWorldConfig(worldId);
        if (!config) return false;

        _exploration.loadWorld(worldId);
        player.init(config);
        entity.init(config);
        unlock.init(config);

        var pd = getPlayerData();
        var visited = _exploration.isWorldVisited(pd, worldId);
        if (visited) {
            _exploration.restoreProgress(pd);
            unlock.restoreState(pd, worldId);
        }

        // 从另一个世界传送过来时，落点为目标世界中指向来源世界的 portal 坐标
        if (fromWorldId && config.entities) {
            for (var i = 0; i < config.entities.length; i++) {
                var e = config.entities[i];
                if (e.type === 'portal' && e.targetWorld === fromWorldId) {
                    player.setPlayerPos(e.x, e.y);
                    break;
                }
            }
        }

        entity.setTutorialComplete(unlock.isTutorialComplete());
        return true;
    }

    function update(dt) {
        if (_needsRespawn) {
            entity.respawnEntities();
            _needsRespawn = false;
        }
        entity.updateDiscoveries();
        entity.updateRespawnTimers(dt);
    }

    // === 地图管理 ===
    function getWorldId() { return _exploration.getWorldId(); }
    function getExplorationPercent() { return _exploration.getExplorationPercent(); }
    function getCompletionPercent() { return _exploration.getCompletionPercent(); }

    // === 角色移动 ===
    function movePlayer(dx, dy, dt) { player.movePlayer(dx, dy, dt); }
    function getPlayerPos() { return player.getPlayerPos(); }
    function setPlayerPos(x, y) { player.setPlayerPos(x, y); }
    function snapshotReturnPosition() { player.snapshotReturnPosition(); }
    function restoreReturnPosition() { player.restoreReturnPosition(); }
    function checkCollision(x, y) { return player.checkCollision(x, y); }

    // === 实体交互 ===
    function getEntities() { return entity.getActiveEntities(); }
    function getNearbyEntity() { return entity.getNearbyEntity(); }
    function getDiscoveredEntities() { return entity.getDiscoveredEntities(); }
    function interact(entityId) { return entity.interact(entityId); }
    function isEntityDiscovered(id) { return entity.isEntityDiscovered(id); }
    function isEntityResolved(id) { return entity.isEntityResolved(id); }
    function resolveEntity(id) { entity.resolveEntity(id); }
    function respawnEntities() { entity.respawnEntities(); }
    function markNeedsRespawn() { _needsRespawn = true; }

    // === 解锁与教学 ===
    function isMenuUnlocked(menuId) { return unlock.isMenuUnlocked(menuId); }
    function unlockMenu(menuId) { unlock.unlockMenu(menuId); }
    function checkBarriers(towerCleared) {
        return unlock.checkBarriers(getExplorationPercent(), towerCleared);
    }
    function isTutorialComplete() { return unlock.isTutorialComplete(); }
    function onTutorialWin() { unlock.onTutorialWin(); }
    function onTutorialLose() { unlock.onTutorialLose(); }

    // === 存档 ===
    function saveProgress() {
        var pd = getPlayerData();
        _exploration.saveProgress(pd);
        unlock.saveState(pd, _exploration.getWorldId());
        if (savePlayerData) savePlayerData(true);
    }

    function getConfig() {
        return getWorldConfig(_exploration.getWorldId());
    }

    return {
        loadWorld: loadWorld,
        update: update,
        getWorldId: getWorldId,
        getConfig: getConfig,
        getExplorationPercent: getExplorationPercent,
        getCompletionPercent: getCompletionPercent,
        movePlayer: movePlayer,
        getPlayerPos: getPlayerPos,
        setPlayerPos: setPlayerPos,
        snapshotReturnPosition: snapshotReturnPosition,
        restoreReturnPosition: restoreReturnPosition,
        checkCollision: checkCollision,
        getEntities: getEntities,
        getNearbyEntity: getNearbyEntity,
        getDiscoveredEntities: getDiscoveredEntities,
        interact: interact,
        isEntityDiscovered: isEntityDiscovered,
        isEntityResolved: isEntityResolved,
        resolveEntity: resolveEntity,
        respawnEntities: respawnEntities,
        markNeedsRespawn: markNeedsRespawn,
        isMenuUnlocked: isMenuUnlocked,
        unlockMenu: unlockMenu,
        checkBarriers: checkBarriers,
        isTutorialComplete: isTutorialComplete,
        onTutorialWin: onTutorialWin,
        onTutorialLose: onTutorialLose,
        saveProgress: saveProgress
    };
}

export { createWorldMapSystem };
