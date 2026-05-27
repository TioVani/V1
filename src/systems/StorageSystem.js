import Logger from '../utils/Logger.js';
import { setStorageSync, getStorageSync, setUserCloudStorage } from '../platform/BrowserAPI.js';

/**
 * 存档系统（Storage System）— 精简版
 *
 * 包含：
 * - 最高分读写（loadBestScore / saveBestScore）
 * - 云上传（uploadToCloudStorage / uploadLeaderboardData / uploadSeasonScore）
 *
 * 已移除（迁移至 GameDataStore）：
 * - savePlayerData / doSavePlayerData → dataStore.flush()
 * - clearGameData → dataStore.reset()
 */

function createStorageSystem(deps) {
    var getScore = deps.getScore;
    var getBestScore = deps.getBestScore;
    var setBestScore = deps.setBestScore;
    var getSeasonBestScore = deps.getSeasonBestScore;

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
            console.log('[saveBestScore] 触发 — 当前分:', currentScore, '最高分:', currentBest);
            if (currentScore > currentBest) {
                setBestScore(currentScore);
                setStorageSync('bestScore', currentScore);
                console.log('[saveBestScore] 新纪录:', currentScore);
                Logger.info('保存新最高分:', currentScore);
            } else {
                console.log('[saveBestScore] 未刷新纪录 (当前分 <= 最高分)');
            }
        } catch (e) {
            console.error('保存最高分失败:', e);
        }
    }

    function uploadToCloudStorage(kvDataList) {
        try {
            setUserCloudStorage({
                KVDataList: kvDataList,
                success: function () {
                    Logger.info('云存储上传成功:', kvDataList.map(function (kv) { return kv.key + '=' + kv.value; }).join(', '));
                },
                fail: function (err) {
                    console.error('云存储上传失败:', err);
                }
            });
        } catch (e) {
            console.error('云存储上传异常:', e);
        }
    }

    /**
     * 上传排行榜相关数据（最高分 + 净化数）
     * saveSnapshot 可选：flush 钩子传入的快照，有则用，无则返回空 kills。
     */
    function uploadLeaderboardData(saveSnapshot) {
        var bestScoreVal = getBestScore() || 0;
        var totalKillsVal = (saveSnapshot && saveSnapshot.totalMonstersKilled) || 0;
        var seasonScoreVal = getSeasonBestScore() || 0;
        Logger.info('[排行榜] 上传数据: best_score=' + bestScoreVal + ', total_kills=' + totalKillsVal + ', season_score=' + seasonScoreVal);
        var kvDataList = [
            { key: 'best_score', value: String(bestScoreVal) },
            { key: 'total_kills', value: String(totalKillsVal) }
        ];
        if (seasonScoreVal > 0) {
            kvDataList.push({ key: 'season_score', value: String(seasonScoreVal) });
        }
        uploadToCloudStorage(kvDataList);
    }

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

    return {
        loadBestScore: loadBestScore,
        saveBestScore: saveBestScore,
        uploadToCloudStorage: uploadToCloudStorage,
        uploadLeaderboardData: uploadLeaderboardData,
        uploadSeasonScore: uploadSeasonScore
    };
}

export { createStorageSystem };