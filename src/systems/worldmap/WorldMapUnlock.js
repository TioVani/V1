/**
 * WorldMapUnlock — 菜单解锁判定 + 屏障解除 + 教学回调
 */
function createWorldMapUnlock(deps) {
    var getWorldConfig = deps.getWorldConfig;
    var getPlayerPos = deps.getPlayerPos;
    var setPlayerPos = deps.setPlayerPos;
    var removeCollisionsById = deps.removeCollisionsById;
    var setEntityTutorialComplete = deps.setEntityTutorialComplete;
    var setHiddenEntityIds = deps.setHiddenEntityIds;
    var showToast = deps.showToast;

    var _tutorialComplete = false;
    var _unlockedMenus = {};
    var _barrierStates = {};

    function init(config) {
        _tutorialComplete = false;
        _unlockedMenus = {};
        _barrierStates = {};
        if (config.entities) {
            for (var i = 0; i < config.entities.length; i++) {
                if (config.entities[i].type === 'barrier') {
                    _barrierStates[config.entities[i].id] = { resolved: false };
                }
            }
        }
    }

    function isTutorialComplete() { return _tutorialComplete; }

    function onTutorialWin() {
        _tutorialComplete = true;
        setEntityTutorialComplete(true);
        var config = getWorldConfig();
        if (config && config.collisions) {
            var tutorialCollisions = config.collisions.filter(function(c) {
                return c.id && c.id.indexOf('tutorial_') === 0;
            }).map(function(c) { return c.id; });
            removeCollisionsById(tutorialCollisions);
        }
    }

    function onTutorialLose() {
        // 不改变 tutorial 状态，由调用方自动重开战斗
    }

    function isMenuUnlocked(menuId) {
        return !!_unlockedMenus[menuId];
    }

    function unlockMenu(menuId) {
        _unlockedMenus[menuId] = true;
    }

    function checkBarriers(explorationPercent, towerCleared) {
        var config = getWorldConfig();
        if (!config || !config.entities) return [];
        var unlocked = [];
        for (var i = 0; i < config.entities.length; i++) {
            var e = config.entities[i];
            if (e.type !== 'barrier') continue;
            var bState = _barrierStates[e.id];
            if (!bState || bState.resolved) continue;
            var met = true;
            if (e.requireTowerClear && !towerCleared) met = false;
            if (e.requireExploration > 0 && explorationPercent < e.requireExploration) met = false;
            if (met) {
                bState.resolved = true;
                if (e.collisionRefs && e.collisionRefs.length > 0) {
                    removeCollisionsById(e.collisionRefs);
                }
                if (e.hiddenEntityIds && e.hiddenEntityIds.length > 0) {
                    setHiddenEntityIds(
                        (deps.getHiddenEntityIds ? deps.getHiddenEntityIds() : []).filter(function(id) {
                            return e.hiddenEntityIds.indexOf(id) === -1;
                        })
                    );
                }
                unlocked.push(e);
            }
        }
        return unlocked;
    }

    function getUnlockedMenus() { return _unlockedMenus; }

    function restoreState(playerData, worldId) {
        if (!playerData || !playerData.worldMapProgress) return;
        var wData = playerData.worldMapProgress.worlds[worldId];
        if (!wData) return;
        _tutorialComplete = !!wData.tutorialComplete;
        _unlockedMenus = {};
        if (wData.unlockedMenus) {
            for (var i = 0; i < wData.unlockedMenus.length; i++) {
                _unlockedMenus[wData.unlockedMenus[i]] = true;
            }
        }
        setEntityTutorialComplete(_tutorialComplete);
    }

    function saveState(playerData, worldId) {
        if (!playerData) return;
        if (!playerData.worldMapProgress) {
            playerData.worldMapProgress = { currentWorldId: worldId, worlds: {} };
        }
        if (!playerData.worldMapProgress.worlds[worldId]) {
            playerData.worldMapProgress.worlds[worldId] = {};
        }
        playerData.worldMapProgress.worlds[worldId].tutorialComplete = _tutorialComplete;
        playerData.worldMapProgress.worlds[worldId].unlockedMenus = Object.keys(_unlockedMenus);
    }

    return {
        init: init,
        isTutorialComplete: isTutorialComplete,
        onTutorialWin: onTutorialWin,
        onTutorialLose: onTutorialLose,
        isMenuUnlocked: isMenuUnlocked,
        unlockMenu: unlockMenu,
        checkBarriers: checkBarriers,
        getUnlockedMenus: getUnlockedMenus,
        restoreState: restoreState,
        saveState: saveState
    };
}

export { createWorldMapUnlock };
