import Logger from '../utils/Logger.js';
/**
 * 月卡系统（Monthly Card System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 *
 * 包含：
 * - 月卡状态检查（isMonthlyCardClaimedToday）
 * - 月卡点击处理（handleMonthlyCardClick / handleSmallMonthlyCardClick / handleLargeMonthlyCardClick）
 * - 广告获取月卡（watchAdForMonthlyCard）
 * - 天数管理（addMonthlyCardDays）
 * - 奖励领取（claimMonthlyCardReward）
 * - 工具函数（getTodayString）
 */

function createMonthlyCardSystem(deps) {
    // 依赖注入
    var getPlayerData = deps.getPlayerData;
    var getScreenWidth = deps.getScreenWidth;
    var saveDataFn = deps.saveData;
    var showToastFn = deps.showToast;
    var getRewardedVideoAd = deps.getRewardedVideoAd;
    var isAdLoaded = deps.isAdLoaded;

    // ==================== 核心方法 ====================

    function isMonthlyCardClaimedToday(cardType) {
        var playerData = getPlayerData();
        if (!playerData.monthlyCards) {
            playerData.monthlyCards = {
                small: { days: 0, lastClaimDate: null, adsWatched: 0 },
                large: { days: 0, lastClaimDate: null, adsWatched: 0 }
            };
            return false;
        }
        var today = new Date().toISOString().split('T')[0];
        return playerData.monthlyCards[cardType].lastClaimDate === today;
    }

    function getTodayString() {
        return new Date().toISOString().split('T')[0];
    }

    function handleMonthlyCardClick(x, y, scale) {
        var startY = Math.floor(150 * scale);
        var cardHeight = Math.floor(140 * scale);
        var cardGap = Math.floor(15 * scale);
        var btnW = Math.floor(85 * scale);
        var btnH = Math.floor(35 * scale);
        var btnX = getScreenWidth() - Math.floor(110 * scale);

        // 小月卡按钮
        var smallCardY = startY + Math.floor(35 * scale);
        var smallBtnY = smallCardY + Math.floor(40 * scale);

        if (x >= btnX && x <= btnX + btnW && y >= smallBtnY && y <= smallBtnY + btnH) {
            handleSmallMonthlyCardClick();
            return;
        }

        // 大月卡按钮
        var largeCardY = smallCardY + cardHeight + cardGap;
        var largeBtnY = largeCardY + Math.floor(40 * scale);

        if (x >= btnX && x <= btnX + btnW && y >= largeBtnY && y <= largeBtnY + btnH) {
            handleLargeMonthlyCardClick();
            return;
        }
    }

    function handleSmallMonthlyCardClick() {
        var playerData = getPlayerData();
        var smallCard = playerData.monthlyCards.small;

        if (smallCard.days <= 0) {
            watchAdForMonthlyCard('small');
        } else if (!isMonthlyCardClaimedToday('small')) {
            claimMonthlyCardReward('small');
        }
    }

    function handleLargeMonthlyCardClick() {
        var playerData = getPlayerData();
        var largeCard = playerData.monthlyCards.large;

        if (largeCard.days <= 0) {
            watchAdForMonthlyCard('large');
        } else if (!isMonthlyCardClaimedToday('large')) {
            claimMonthlyCardReward('large');
        }
    }

    function watchAdForMonthlyCard(cardType) {
        var MAX_DAYS = 180;
        var playerData = getPlayerData();

        if (!playerData.monthlyCards) {
            playerData.monthlyCards = {
                small: { days: 0, lastClaimDate: null, adsWatched: 0 },
                large: { days: 0, lastClaimDate: null, adsWatched: 0 }
            };
        }

        var card = playerData.monthlyCards[cardType];

        if (card.days >= MAX_DAYS) {
            showToastFn({ title: '月卡天数已达上限！', icon: 'none', duration: 1500 });
            return;
        }

        var rewardedVideoAd = getRewardedVideoAd();
        if (rewardedVideoAd && isAdLoaded()) {
            rewardedVideoAd._pendingMonthlyCard = cardType;
            rewardedVideoAd.show().then(function() {
                Logger.info('月卡广告播放开始');
            }).catch(function(err) {
                Logger.info('月卡广告播放失败:', err);
                rewardedVideoAd._pendingMonthlyCard = null;
                showToastFn({ title: '广告加载失败，请稍后重试', icon: 'none', duration: 1500 });
            });
        } else {
            showToastFn({ title: '广告未加载，请稍后重试', icon: 'none', duration: 1500 });
        }
    }

    function addMonthlyCardDays(cardType, days) {
        var MAX_DAYS = 180;
        var playerData = getPlayerData();

        if (!playerData.monthlyCards) {
            playerData.monthlyCards = {
                small: { days: 0, lastClaimDate: null, adsWatched: 0 },
                large: { days: 0, lastClaimDate: null, adsWatched: 0 }
            };
        }

        var card = playerData.monthlyCards[cardType];

        if (cardType === 'small') {
            card.days = Math.min(card.days + 30, MAX_DAYS);
            showToastFn({ title: '小月卡+30天！', icon: 'success', duration: 1500 });
        } else if (cardType === 'large') {
            card.days = Math.min(card.days + 6, MAX_DAYS);
            showToastFn({ title: '大月卡+6天！', icon: 'success', duration: 1500 });
        }

        saveDataFn();
    }

    function claimMonthlyCardReward(cardType) {
        var playerData = getPlayerData();

        if (!playerData.monthlyCards) {
            playerData.monthlyCards = {
                small: { days: 0, lastClaimDate: null, adsWatched: 0 },
                large: { days: 0, lastClaimDate: null, adsWatched: 0 }
            };
        }

        var card = playerData.monthlyCards[cardType];
        var today = getTodayString();

        if (card.lastClaimDate === today) {
            showToastFn({ title: '今日已领取！', icon: 'none', duration: 1500 });
            return;
        }

        if (card.days <= 0) {
            showToastFn({ title: '月卡已过期！', icon: 'none', duration: 1500 });
            return;
        }

        var reward = cardType === 'small' ? 10 : 20;
        playerData.starSource = (playerData.starSource || 0) + reward;

        card.lastClaimDate = today;
        card.days--;

        showToastFn({ title: '获得 ' + reward + '🪨！', icon: 'success', duration: 1500 });
        saveDataFn();
    }

    return {
        isMonthlyCardClaimedToday: isMonthlyCardClaimedToday,
        getTodayString: getTodayString,
        handleMonthlyCardClick: handleMonthlyCardClick,
        handleSmallMonthlyCardClick: handleSmallMonthlyCardClick,
        handleLargeMonthlyCardClick: handleLargeMonthlyCardClick,
        watchAdForMonthlyCard: watchAdForMonthlyCard,
        addMonthlyCardDays: addMonthlyCardDays,
        claimMonthlyCardReward: claimMonthlyCardReward
    };
}

export { createMonthlyCardSystem };
