/**
 * WorldMapExploration — 探索度计算 + 存档读写 + 跨世界进度管理
 */
function createWorldMapExploration(deps) {
    var getWorldConfig = deps.getWorldConfig;
    var getEntityStates = deps.getEntityStates;
    var setEntityStates = deps.setEntityStates;
    var getActiveEntities = deps.getActiveEntities;
    var getPlayerPos = deps.getPlayerPos;
    var setPlayerPos = deps.setPlayerPos;
    var savePlayerData = deps.savePlayerData;
    var loadPlayerData = deps.loadPlayerData;

    var _currentWorldId = null;

    function init(worldId) {
        _currentWorldId = worldId;
    }

    function loadWorld(worldId) {
        var config = getWorldConfig(worldId);
        if (!config) return false;
        _currentWorldId = worldId;
        return true;
    }

    function getWorldId() { return _currentWorldId; }

    function getExplorationPercent() {
        var active = getActiveEntities();
        if (active.length === 0) return 0;
        var states = getEntityStates();
        var discovered = 0;
        for (var i = 0; i < active.length; i++) {
            var s = states[active[i].id];
            if (s && s.discovered) discovered++;
        }
        return discovered / active.length;
    }

    function getCompletionPercent() {
        var active = getActiveEntities();
        if (active.length === 0) return 0;
        var states = getEntityStates();
        var resolved = 0;
        for (var i = 0; i < active.length; i++) {
            var s = states[active[i].id];
            if (s && s.resolved) resolved++;
        }
        return resolved / active.length;
    }

    function getActiveEntityCount() {
        return getActiveEntities().length;
    }

    function getDiscoveredCount() {
        var active = getActiveEntities();
        var states = getEntityStates();
        var count = 0;
        for (var i = 0; i < active.length; i++) {
            var s = states[active[i].id];
            if (s && s.discovered) count++;
        }
        return count;
    }

    function saveProgress(playerData) {
        if (!playerData) return;
        if (!playerData.worldMapProgress) {
            playerData.worldMapProgress = { currentWorldId: _currentWorldId, worlds: {} };
        }
        playerData.worldMapProgress.currentWorldId = _currentWorldId;
        if (!playerData.worldMapProgress.worlds[_currentWorldId]) {
            playerData.worldMapProgress.worlds[_currentWorldId] = {};
        }
        var wData = playerData.worldMapProgress.worlds[_currentWorldId];
        var pos = getPlayerPos();
        wData.playerPos = { x: pos.x, y: pos.y };
        wData.entities = JSON.parse(JSON.stringify(getEntityStates()));
        if (savePlayerData) savePlayerData(true);
    }

    function restoreProgress(playerData) {
        if (!playerData || !playerData.worldMapProgress) return false;
        var wData = playerData.worldMapProgress.worlds[_currentWorldId];
        if (!wData) return false;
        if (wData.playerPos) setPlayerPos(wData.playerPos.x, wData.playerPos.y);
        if (wData.entities) setEntityStates(wData.entities);
        return true;
    }

    function getWorldProgress(playerData, worldId) {
        if (!playerData || !playerData.worldMapProgress) return null;
        return playerData.worldMapProgress.worlds[worldId || _currentWorldId] || null;
    }

    function isWorldVisited(playerData, worldId) {
        if (!playerData || !playerData.worldMapProgress) return false;
        return !!playerData.worldMapProgress.worlds[worldId || _currentWorldId];
    }

    return {
        init: init,
        loadWorld: loadWorld,
        getWorldId: getWorldId,
        getExplorationPercent: getExplorationPercent,
        getCompletionPercent: getCompletionPercent,
        getActiveEntityCount: getActiveEntityCount,
        getDiscoveredCount: getDiscoveredCount,
        saveProgress: saveProgress,
        restoreProgress: restoreProgress,
        getWorldProgress: getWorldProgress,
        isWorldVisited: isWorldVisited
    };
}

export { createWorldMapExploration };
