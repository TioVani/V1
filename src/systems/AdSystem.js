import Logger from '../utils/Logger.js';
import { PauseCoordinator } from '../utils/PauseCoordinator.js';
import { createBannerAd, createRewardedVideoAd } from '../platform/BrowserAPI.js';
/**
 * AdSystem - 广告系统
 * 管理广告的初始化、显示和奖励处理
 */

// 时序结晶广告阈值
var TIME_CRYSTAL_AD_THRESHOLD = 5;

function createAdSystem(deps) {
    // 依赖
    var getSaveData = deps.getSaveData;
    var setPlayerDataProp = deps.setPlayerDataProp;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var saveData = deps.saveData;
    var addMessage = deps.addMessage;
    var addMonthlyCardDays = deps.addMonthlyCardDays;
    var restartGame = deps.restartGame;
    var showToast = deps.showToast;
    var getAdWatchCount = deps.getAdWatchCount;
    var setAdWatchCount = deps.setAdWatchCount;
    var getTimeCrystalUnlocked = deps.getTimeCrystalUnlocked;
    var setTimeCrystalUnlocked = deps.setTimeCrystalUnlocked;
    var getAdItems = deps.getAdItems;
    var setAdItemsProp = deps.setAdItemsProp;
    var getTimeLeft = deps.getTimeLeft;
    var addTimeLeft = deps.addTimeLeft;
    var getGameState = deps.getGameState;
    var setGameState = deps.setGameState;
    var GAME_STATE = deps.GAME_STATE;

    // 内部状态
    var bannerAd = null;
    var rewardedVideoAd = null;
    var adLoaded = false;

    /**
     * 初始化广告
     */
    function initAds() {
        try {
            var sw = getScreenWidth();
            var sh = getScreenHeight();

            // Banner广告
            bannerAd = createBannerAd({
                adUnitId: 'adunit-123456789', // 测试ID，上线前替换为真实ID
                style: {
                    left: sw / 2 - 150,
                    top: sh - 80,
                    width: 300,
                    height: 50
                }
            });

            bannerAd.onLoad(function() {
                Logger.info('Banner广告加载成功');
                bannerAd.show();
            });

            bannerAd.onError(function(err) {
                console.error('Banner广告加载失败:', err);
                Logger.info('广告功能可能不支持，游戏继续运行');
            });

            // 激励视频广告
            rewardedVideoAd = createRewardedVideoAd({
                adUnitId: 'adunit-987654321' // 测试ID，上线前替换为真实ID
            });

            rewardedVideoAd.onLoad(function() {
                Logger.info('激励视频广告加载成功');
                adLoaded = true;
            });

            rewardedVideoAd.onError(function(err) {
                console.error('激励视频广告加载失败:', err);
                adLoaded = false;
                Logger.info('广告功能可能不支持，复活功能不可用');
            });

            rewardedVideoAd.onClose(function(res) {
                if (res && res.isEnded) {
                    // 增加广告观看计数
                    var count = getAdWatchCount() + 1;
                    setAdWatchCount(count);
                    Logger.info('广告观看次数:', count);

                    // 检查是否达到时序结晶奖励条件
                    if (count >= TIME_CRYSTAL_AD_THRESHOLD && !getTimeCrystalUnlocked()) {
                        // 解锁时序结晶并赠送1个
                        setTimeCrystalUnlocked(true);
                        setPlayerDataProp('timeCrystalUnlocked', true);
                        var pd = getSaveData();
                        if (!playerData.materials) playerData.materials = {};
                        if (!playerData.materials.timeCrystal) {
                            playerData.materials.timeCrystal = { quantity: 0 };
                        }
                        playerData.materials.timeCrystal.quantity++;
                        Logger.info('恭喜！获得时序结晶！商城已解锁购买途径');
                        addMessage('获得时序结晶！', '#cc88ff', true);
                        saveData();
                    }

                    // 检查是否是道具广告
                    if (rewardedVideoAd._pendingItemType) {
                        // 道具广告：发放奖励
                        handleItemAdReward(rewardedVideoAd._pendingItemType);
                        rewardedVideoAd._pendingItemType = null;
                        // 恢复游戏定时器
                        PauseCoordinator.instance.resume();
                    } else if (rewardedVideoAd._pendingMonthlyCard) {
                        // 月卡广告：添加天数
                        addMonthlyCardDays(rewardedVideoAd._pendingMonthlyCard, 1);
                        rewardedVideoAd._pendingMonthlyCard = null;
                    } else if (rewardedVideoAd._pendingTimeCrystal) {
                        // 时序结晶广告：发放时序结晶
                        rewardedVideoAd._pendingTimeCrystal = false;
                        var pd = getSaveData();
                        if (!pd.materials) pd.materials = {};
                        if (!pd.materials.timeCrystal) {
                            pd.materials.timeCrystal = { quantity: 0 };
                        }
                        pd.materials.timeCrystal.quantity++;
                        Logger.info('获得时序结晶！当前数量:', pd.materials.timeCrystal.quantity);
                        addMessage('获得时序结晶！', '#cc88ff', true);
                        saveData();
                    } else {
                        // 复活广告：奖励用户
                        Logger.info('广告看完，奖励5秒时间');
                        addTimeLeft(5);
                        setGameState(GAME_STATE.PLAYING);
                        // 重启游戏
                        restartGame();
                    }
                } else {
                    // 用户中途关闭广告
                    Logger.info('用户中途关闭广告');
                    if (rewardedVideoAd._pendingItemType) {
                        rewardedVideoAd._pendingItemType = null;
                        // 恢复游戏定时器
                        PauseCoordinator.instance.resume();
                    }
                    if (rewardedVideoAd._pendingMonthlyCard) {
                        rewardedVideoAd._pendingMonthlyCard = null;
                    }
                    if (rewardedVideoAd._pendingTimeCrystal) {
                        rewardedVideoAd._pendingTimeCrystal = false;
                    }
                }
            });

        } catch (e) {
            console.error('初始化广告失败:', e);
            Logger.info('广告功能可能不支持，游戏继续运行');
        }
    }

    /**
     * 显示激励视频广告
     */
    function showRewardedVideoAd() {
        if (adLoaded && rewardedVideoAd) {
            rewardedVideoAd.show().catch(function(err) {
                console.error('激励视频广告显示失败:', err);
                showToast({
                    title: '广告加载失败',
                    icon: 'none'
                });
            });
        } else {
            showToast({
                title: '广告加载中...',
                icon: 'loading'
            });
        }
    }

    /**
     * 播放广告获取道具
     */
    function showItemAd(itemType) {
        if (!adLoaded || !rewardedVideoAd) {
            showToast({
                title: '广告加载中，请稍后再试',
                icon: 'none',
                duration: 1500
            });
            return;
        }

        // 暂停游戏（PauseCoordinator 统一调度）
        Logger.info('播放广告前暂停游戏');
        PauseCoordinator.instance.pause();

        // 暂存当前道具类型，广告播放完成后使用
        rewardedVideoAd._pendingItemType = itemType;

        rewardedVideoAd.show().then(function() {
            Logger.info('道具广告开始播放:', itemType);
        }).catch(function(err) {
            console.error('道具广告显示失败:', err);
            showToast({
                title: '广告加载失败',
                icon: 'none',
                duration: 1500
            });
            rewardedVideoAd._pendingItemType = null;
            // 广告失败，恢复游戏
            PauseCoordinator.instance.resume();
        });
    }

    /**
     * 处理广告播放完成（道具广告）
     */
    function handleItemAdReward(itemType) {
        Logger.info('广告播放完成，奖励道具:', itemType);

        if (itemType === 'healPotion') {
            // 治疗药水：直接回满血
            var pd = getSaveData();
            playerData.playerHp = playerData.maxPlayerHp;
            setAdItemsProp('healPotion', getAdItems().healPotion + 1);
            showToast({
                title: '灵核已回满！',
                icon: 'success',
                duration: 1500
            });
            Logger.info('治疗药水广告奖励，HP回满:', playerData.playerHp);
        } else if (itemType === 'timePotion') {
            // 时间药水：增加30秒
            addTimeLeft(30);
            setAdItemsProp('timePotion', getAdItems().timePotion + 1);
            showToast({
                title: '获得30秒！',
                icon: 'success',
                duration: 1500
            });
            Logger.info('时间药水广告奖励，增加30秒，当前时间:', getTimeLeft());
        }
    }

    /**
     * 播放广告获取时序结晶（商城专用）
     */
    function showTimeCrystalAd() {
        if (!adLoaded || !rewardedVideoAd) {
            showToast({
                title: '广告加载中，请稍后再试',
                icon: 'none',
                duration: 1500
            });
            return;
        }

        // 标记为时序结晶广告
        rewardedVideoAd._pendingTimeCrystal = true;

        rewardedVideoAd.show().then(function() {
            Logger.info('时序结晶广告开始播放');
        }).catch(function(err) {
            console.error('时序结晶广告显示失败:', err);
            showToast({
                title: '广告加载失败',
                icon: 'none',
                duration: 1500
            });
            rewardedVideoAd._pendingTimeCrystal = false;
        });
    }

    /**
     * 获取激励视频广告实例
     */
    function getRewardedVideoAd() {
        return rewardedVideoAd;
    }

    /**
     * 获取广告是否加载完成
     */
    function isAdLoaded() {
        return adLoaded;
    }

    /**
     * 重置局内广告道具次数
     */
    function resetAdItems() {
        setAdItemsProp('healPotion', 0);
        setAdItemsProp('timePotion', 0);
    }

    return {
        initAds: initAds,
        showRewardedVideoAd: showRewardedVideoAd,
        showItemAd: showItemAd,
        handleItemAdReward: handleItemAdReward,
        showTimeCrystalAd: showTimeCrystalAd,
        getRewardedVideoAd: getRewardedVideoAd,
        isAdLoaded: isAdLoaded,
        resetAdItems: resetAdItems
    };
}

export { createAdSystem };
