/**
 * FusionRegistry — 融合图鉴 + 保底追踪 + 历史记录
 */
import Logger from '../utils/Logger.js';
import { FUSION_CONFIG } from '../config/FusionConfig.js';

function createFusionRegistry(deps) {
    var getPlayerData = deps.getPlayerData;
    var saveData = deps.saveData;

    function _ensureFusionData() {
        var playerData = getPlayerData();
        if (!playerData.fusionData) {
            playerData.fusionData = {
                pityCount: {},
                codex: {},
                history: [],
                stats: { totalAttempts: 0, totalSuccesses: 0, totalGreatSuccesses: 0 }
            };
        }
        return playerData.fusionData;
    }

    // ==================== 保底 ====================

    function checkPity(type) {
        var fd = _ensureFusionData();
        return ((fd.pityCount && fd.pityCount[type]) || 0) >= FUSION_CONFIG.pityThreshold;
    }

    function getPityCount(type) {
        var fd = _ensureFusionData();
        return (fd.pityCount && fd.pityCount[type]) || 0;
    }

    function incrementPity(type) {
        var fd = _ensureFusionData();
        if (!fd.pityCount) fd.pityCount = {};
        fd.pityCount[type] = (fd.pityCount[type] || 0) + 1;
        saveData();
    }

    function resetPity(type) {
        var fd = _ensureFusionData();
        if (!fd.pityCount) fd.pityCount = {};
        fd.pityCount[type] = 0;
        saveData();
    }

    // ==================== 图鉴 ====================

    function record(type, result) {
        var fd = _ensureFusionData();
        if (!fd.codex) fd.codex = {};
        if (!fd.codex[type]) fd.codex[type] = [];
        var isNew = fd.codex[type].indexOf(result.id) === -1;
        if (isNew) {
            fd.codex[type].push(result.id);
            Logger.info('融合图鉴新发现:', type, result.id);
        }
        _addHistory(type, result);
        saveData();
        return isNew;
    }

    function isDiscovered(type, resultId) {
        var fd = _ensureFusionData();
        if (!fd.codex || !fd.codex[type]) return false;
        return fd.codex[type].indexOf(resultId) !== -1;
    }

    function getCodex(type) {
        var fd = _ensureFusionData();
        if (!fd.codex || !fd.codex[type]) return [];
        return fd.codex[type].slice();
    }

    function getCodexCount(type) {
        return getCodex(type).length;
    }

    // ==================== 历史 ====================

    function _addHistory(type, result) {
        var fd = _ensureFusionData();
        if (!fd.history) fd.history = [];
        fd.history.unshift({
            type: type, resultId: result.id, resultName: result.name,
            layer: result.layer, success: true,
            greatSuccess: result.greatSuccess || false, time: Date.now()
        });
        if (fd.history.length > 50) fd.history = fd.history.slice(0, 50);
    }

    function addFailureHistory(type, materialNames) {
        var fd = _ensureFusionData();
        if (!fd.history) fd.history = [];
        fd.history.unshift({
            type: type, success: false,
            materialNames: materialNames, time: Date.now()
        });
        if (fd.history.length > 50) fd.history = fd.history.slice(0, 50);
        saveData();
    }

    function getHistory(limit) {
        var fd = _ensureFusionData();
        if (!fd.history) return [];
        return fd.history.slice(0, limit || 20);
    }

    // ==================== 统计 ====================

    function getStats() {
        var fd = _ensureFusionData();
        return fd.stats || { totalAttempts: 0, totalSuccesses: 0, totalGreatSuccesses: 0 };
    }

    function incrementStat(key) {
        var fd = _ensureFusionData();
        if (!fd.stats) fd.stats = { totalAttempts: 0, totalSuccesses: 0, totalGreatSuccesses: 0 };
        fd.stats[key] = (fd.stats[key] || 0) + 1;
    }

    return {
        checkPity: checkPity, getPityCount: getPityCount,
        incrementPity: incrementPity, resetPity: resetPity,
        record: record, isDiscovered: isDiscovered,
        getCodex: getCodex, getCodexCount: getCodexCount,
        getHistory: getHistory, addFailureHistory: addFailureHistory,
        getStats: getStats, incrementStat: incrementStat
    };
}

export { createFusionRegistry };
