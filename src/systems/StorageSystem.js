import Logger from '../utils/Logger.js';
import deepClone from '../utils/DeepClone.js';
import { setStorageSync, getStorageSync, removeStorageSync, setUserCloudStorage } from '../platform/BrowserAPI.js';
/**
 * 存档系统（Storage System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 *
 * 包含：
 * - 防抖保存（savePlayerData / doSavePlayerData）
 * - 最高分读写（loadBestScore / saveBestScore）
 * - 清除数据（clearGameData）
 * 不包含：loadPlayerData（依赖全局 playerData 默认结构，暂留 game.js）
 */

function createStorageSystem(deps) {
    // 依赖注入
    var getPlayerData = deps.getPlayerData;
    var setPlayerData = deps.setPlayerData;
    var getScore = deps.getScore;
    var getBestScore = deps.getBestScore;
    var setBestScore = deps.setBestScore;
    var getSeasonBestScore = deps.getSeasonBestScore;
    var showToastFn = deps.showToast;

    // 内部状态
    var saveDataTimeout = null;
    var pendingSave = false;
    var SAVE_DELAY = 2000;

    // ==================== 核心方法 ====================

    function savePlayerData(immediate) {
        if (immediate === undefined) immediate = false;
        pendingSave = true;

        if (immediate) {
            if (saveDataTimeout) {
                clearTimeout(saveDataTimeout);
                saveDataTimeout = null;
            }
            doSavePlayerData();
        } else {
            if (saveDataTimeout) {
                return;
            }
            saveDataTimeout = setTimeout(function() {
                saveDataTimeout = null;
                if (pendingSave) {
                    doSavePlayerData();
                }
            }, SAVE_DELAY);
        }
    }

    function doSavePlayerData() {
        pendingSave = false;
        try {
            var playerData = getPlayerData();
            if (!Array.isArray(playerData.ownedCharacters)) {
                console.error('ERROR: ownedCharacters 不是数组！');
                playerData.ownedCharacters = [];
            }
            if (!Array.isArray(playerData.unlockedStarTypes)) {
                console.error('ERROR: unlockedStarTypes 不是数组！');
                playerData.unlockedStarTypes = [];
            }

            var dataToSave = deepClone(playerData);
            setStorageSync('playerData', dataToSave);
            Logger.info('✓ 数据已保存');
        } catch (error) {
            console.error('保存玩家数据失败:', error);
        }
    }

    function loadBestScore() {
        try {
            var score = getStorageSync('bestScore') || 0;
            setBestScore(score);
            Logger.info('最高分:', score);
        } catch (e) {
            console.error('加载最高分失败:', e);
            setBestScore(0);
        }
    }

    function saveBestScore() {
        try {
            var currentScore = getScore();
            var currentBest = getBestScore();
            if (currentScore > currentBest) {
                setBestScore(currentScore);
                setStorageSync('bestScore', currentScore);
                Logger.info('保存新最高分:', currentScore);
            }
        } catch (e) {
            console.error('保存最高分失败:', e);
        }
    }

    /**
     * 上传数据到云存储（用于好友排行榜）
     */
    function uploadToCloudStorage(kvDataList) {
        try {
            setUserCloudStorage({
                KVDataList: kvDataList,
                success: function() {
                    Logger.info('云存储上传成功:', kvDataList.map(function(kv) { return kv.key + '=' + kv.value; }).join(', '));
                },
                fail: function(err) {
                    console.error('云存储上传失败:', err);
                }
            });
        } catch (e) {
            console.error('云存储上传异常:', e);
        }
    }

    /**
     * 上传排行榜相关数据（最高分 + 净化数）
     */
    function uploadLeaderboardData() {
        var playerData = getPlayerData();
        var bestScoreVal = getBestScore() || 0;
        var totalKillsVal = (playerData && playerData.totalMonstersKilled) || 0;
        var seasonScoreVal = getSeasonBestScore() || 0;
        Logger.info('[排行榜] 上传数据: best_score=' + bestScoreVal + ', total_kills=' + totalKillsVal + ', season_score=' + seasonScoreVal);
        var kvDataList = [
            { key: 'best_score', value: String(bestScoreVal) },
            { key: 'total_kills', value: String(totalKillsVal) }
        ];
        // 只在赛季分>0时才上传，避免init时seasonBestScore未加载覆盖云存储中的正确值
        if (seasonScoreVal > 0) {
            kvDataList.push({ key: 'season_score', value: String(seasonScoreVal) });
        }
        uploadToCloudStorage(kvDataList);
    }

    /**
     * 上传赛季分
     */
    function uploadSeasonScore(seasonScore) {
        Logger.info('[排行榜] uploadSeasonScore called, seasonScore:', seasonScore);
        if (!seasonScore || seasonScore <= 0) {
            Logger.info('[排行榜] uploadSeasonScore skipped, seasonScore is 0 or falsy');
            return;
        }
        var kvDataList = [
            { key: 'season_score', value: String(seasonScore) }
        ];
        Logger.info('[排行榜] uploadSeasonScore uploading:', JSON.stringify(kvDataList));
        uploadToCloudStorage(kvDataList);
    }

    function clearGameData() {
        try {
            removeStorageSync('playerData');
            removeStorageSync('bestScore');

            // 重置为默认值
            setPlayerData({
                id: 'player_001',
                name: '唤灵人',
                gold: 0,
                starSource: 9999,
                starStones: 0,
                ownedCharacters: [],
                currentCharacterId: null,
                characterExperience: {},
                materials: {
                    iceCrystal: { quantity: 0, usedCount: 0 },
                    fireSource: { quantity: 0, usedCount: 0 },
                    critCrystal: { quantity: 0, usedCount: 0 },
                    critFireSource: { quantity: 0, usedCount: 0 },
                    timeCrystal: { quantity: 0, usedCount: 0 },
                    devourerResidue: { quantity: 0, usedCount: 0 }
                },
                usedMaterials: {},
                unlockedStarTypes: [],
                iceStarLevel: 0,
                maxIceStarLevel: 10,
                fireStarLevel: 0,
                maxFireStarLevel: 10,
                totalMonstersKilled: 0,
                bossKillCount: 0,
                firstBossKilled: false,
                extraCritRate: 0,
                extraCritDamage: 0,
                playerHp: 100,
                maxPlayerHp: 100
            });

            setBestScore(0);

            Logger.info('游戏数据已清除');
            showToastFn({ title: '灵域数据已重置', icon: 'success', duration: 2000 });
        } catch (error) {
            console.error('清除游戏数据失败:', error);
            showToastFn({ title: '清除失败', icon: 'error', duration: 2000 });
        }
    }

    return {
        savePlayerData: savePlayerData,
        doSavePlayerData: doSavePlayerData,
        loadBestScore: loadBestScore,
        saveBestScore: saveBestScore,
        uploadToCloudStorage: uploadToCloudStorage,
        uploadLeaderboardData: uploadLeaderboardData,
        uploadSeasonScore: uploadSeasonScore,
        clearGameData: clearGameData
    };
}

export { createStorageSystem };
