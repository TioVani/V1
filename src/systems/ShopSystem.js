import Logger from '../utils/Logger.js';
/**
 * 商店系统（Shop System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 *
 * 包含：商品购买（purchaseShopItem）、道具使用（useItem）、增益重置（resetBuffs）
 * 不包含：商店渲染（render*）和点击处理（handleShopTouch）暂留 game.js
 */

// 商品配置
var ShopItems = {
    // 材料商品（星源石购买）
    materials: [
        { id: 'iceCrystal', name: '冰晶', emoji: '❄️', price: 30, currency: 'starSource', description: '解锁/升级冰星星' },
        { id: 'fireSource', name: '火源', emoji: '🔥', price: 40, currency: 'starSource', description: '解锁/升级火星星' },
        { id: 'critCrystal', name: '暴击冰晶', emoji: '💠', price: 50, currency: 'starSource', description: '永久+3%暴击率' },
        { id: 'critFireSource', name: '爆伤火源', emoji: '💥', price: 80, currency: 'starSource', description: '永久+20%爆伤' }
    ],
    // 增益道具（星源石购买，单局生效）
    buffs: [
        { id: 'attackBoost', name: '攻击强化', emoji: '⚔️', price: 20, currency: 'starSource', effect: { attackBonus: 50 }, description: '本局攻击力+50' },
        { id: 'critBoost', name: '暴击强化', emoji: '🎯', price: 30, currency: 'starSource', effect: { critRateBonus: 10 }, description: '本局暴击率+10%' },
        { id: 'goldBoost', name: '星币加成', emoji: '💰', price: 15, currency: 'starSource', effect: { goldBonus: 2 }, description: '本局星币获取×2' },
        { id: 'timeBoost', name: '时间延长', emoji: '⏰', price: 25, currency: 'starSource', effect: { timeBonus: 15 }, description: '本局初始时间+15秒' },
        { id: 'hpBoost', name: '生命强化', emoji: '❤️', price: 20, currency: 'starSource', effect: { hpBonus: 100 }, description: '本局最大HP+100' }
    ],
    // 道具商品（星币购买）
    items: [
        { id: 'healPotion', name: '治疗药水', emoji: '🧪', price: 200, currency: 'gold', effect: { heal: 50 }, description: '立即恢复50点HP' },
        { id: 'timePotion', name: '时间药水', emoji: '⏳', price: 300, currency: 'gold', effect: { addTime: 10 }, description: '立即增加10秒时间' },
        { id: 'expPotionSmall', name: '经验药水(小)', emoji: '📜', price: 100, currency: 'gold', effect: { exp: 50 }, description: '当前角色+50经验' },
        { id: 'expPotionMedium', name: '经验药水(中)', emoji: '📔', price: 180, currency: 'gold', effect: { exp: 100 }, description: '当前角色+100经验' },
        { id: 'expPotionLarge', name: '经验药水(大)', emoji: '📖', price: 250, currency: 'gold', effect: { exp: 150 }, description: '当前角色+150经验' },
    ],
    // 技能抽取（星源石购买）
    gacha: [
        { id: 'skillGacha1', name: '单抽', emoji: '🎰', price: 50, currency: 'starSource', description: '抽取1个技能' },
        { id: 'skillGacha10', name: '十连抽', emoji: '🎰', price: 450, currency: 'starSource', description: '抽取10个技能（9折）' }
    ],
    // 宠物商店（星币购买）
    pets: [
        { id: 'pet_slime', name: '小史莱姆', emoji: '🟢', price: 500, currency: 'gold', description: '可爱的史莱姆' },
        { id: 'pet_fire_spirit', name: '火焰精灵', emoji: '🔥', price: 1000, currency: 'gold', description: '火焰精灵，攻击附带燃烧' },
        { id: 'pet_ice_fairy', name: '冰霜仙子', emoji: '❄️', price: 1000, currency: 'gold', description: '冰霜仙子，有几率冻结敌人' },
        { id: 'pet_star_dragon', name: '星龙', emoji: '🐉', price: 2000, currency: 'gold', description: '传说中的星龙' }
    ]
};

function createShopSystem(deps) {
    // 依赖注入
    var getPlayerData = deps.getPlayerData;
    var getActiveBuffs = deps.getActiveBuffs;
    var setActiveBuffs = deps.setActiveBuffs;
    var getGameItems = deps.getGameItems;
    var saveData = deps.saveData;
    var addCharExp = deps.addCharExp;
    var addMessage = deps.addMessage;
    var performGachaFn = deps.performGacha;
    var showGachaResultsFn = deps.showGachaResults;
    var getGachaSystem = deps.getGachaSystem;
    var addTimeLeft = deps.addTimeLeft;
    var updateTaskProgress = deps.updateTaskProgress;
    var updateTaskStats = deps.updateTaskStats;
    var showToast = deps.showToast;
    var showModal = deps.showModal;
    var getPets = deps.getPets;

    // ==================== 核心方法 ====================

    /**
     * 购买商品
     */
    function purchaseShopItem(item) {
        var playerData = getPlayerData();

        // 检查货币是否足够
        if (item.currency === 'gold') {
            if (playerData.gold < item.price) {
                showToast({ title: '星币不足！', icon: 'none', duration: 1500 });
                return false;
            }
            playerData.gold -= item.price;
        } else if (item.currency === 'starSource') {
            if ((playerData.starSource || 0) < item.price) {
                showToast({ title: '星源石不足！', icon: 'none', duration: 1500 });
                return false;
            }
            playerData.starSource -= item.price;
        }

        // 根据商品类型处理
        if (ShopItems.materials.indexOf(item) !== -1) {
            // 材料商品：直接添加到背包
            if (!playerData.materials[item.id]) {
                playerData.materials[item.id] = { quantity: 0, usedCount: 0 };
            }
            playerData.materials[item.id].quantity++;
            showToast({ title: '购买成功！', icon: 'success', duration: 1500 });
            Logger.info('购买材料:', item.name);
        } else if (ShopItems.buffs.indexOf(item) !== -1) {
            // 增益商品：激活增益效果
            var buffs = getActiveBuffs();
            if (item.effect.attackBonus) {
                buffs.attackBonus += item.effect.attackBonus;
            }
            if (item.effect.critRateBonus) {
                buffs.critRateBonus += item.effect.critRateBonus;
            }
            if (item.effect.goldBonus) {
                buffs.goldBonus *= item.effect.goldBonus;
            }
            if (item.effect.timeBonus) {
                buffs.timeBonus += item.effect.timeBonus;
            }
            if (item.effect.hpBonus) {
                buffs.hpBonus += item.effect.hpBonus;
            }
            setActiveBuffs(buffs);
            showToast({ title: '增益已激活！', icon: 'success', duration: 1500 });
            Logger.info('激活增益:', item.name, buffs);
        } else if (ShopItems.items.indexOf(item) !== -1) {
            // 道具商品
            if (item.id === 'healPotion' || item.id === 'timePotion') {
                // 治疗药水和时间药水：存入背包，游戏中使用
                if (!playerData.items) {
                    playerData.items = {
                        healPotion: { quantity: 0 },
                        timePotion: { quantity: 0 },
                        expPotionSmall: { quantity: 0 },
                        expPotionMedium: { quantity: 0 },
                        expPotionLarge: { quantity: 0 }
                    };
                }
                if (!playerData.items[item.id]) {
                    playerData.items[item.id] = { quantity: 0 };
                }
                playerData.items[item.id].quantity++;
                showToast({ title: '已存入背包！', icon: 'success', duration: 1500 });
            } else if (item.effect.exp) {
                // 经验药水：立即使用
                var currentCharId = playerData.currentCharacterId;
                if (currentCharId) {
                    addCharExp(currentCharId, item.effect.exp);
                    showToast({ title: '获得' + item.effect.exp + '经验！', icon: 'none', duration: 1500 });
                } else {
                    showToast({ title: '请先选择角色！', icon: 'none', duration: 1500 });
                    // 退款
                    if (item.currency === 'gold') {
                        playerData.gold += item.price;
                    }
                    return false;
                }
            }
            Logger.info('购买道具:', item.name);
        } else if (ShopItems.gacha && ShopItems.gacha.indexOf(item) !== -1) {
            // 旧版抽卡商品 - 使用新抽卡系统
            var count = item.id === 'skillGacha10' ? 10 : 1;
            var gs = getGachaSystem();
            var results = performGachaFn(count, gs.currentPool);
            showGachaResultsFn(results);
        } else if (ShopItems.pets && ShopItems.pets.indexOf(item) !== -1) {
            // 宠物商品 — 商店库存制，买完下架
            if (!playerData.pets) {
                playerData.pets = { owned: [], equipped: null };
            }
            if (!playerData.pets.owned) {
                playerData.pets.owned = [];
            }
            var Pets = getPets();
            var pet = Pets[item.id];
            if (pet) {
                playerData.pets.owned.push({
                    id: item.id,
                    uid: 'pet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    level: 1,
                    exp: 0
                });
                // 标记该宠物已从商店购买（下架）
                if (!playerData.purchasedShopPets) playerData.purchasedShopPets = [];
                if (playerData.purchasedShopPets.indexOf(item.id) === -1) {
                    playerData.purchasedShopPets.push(item.id);
                }
                showToast({ title: '获得宠物: ' + pet.emoji + pet.name, icon: 'none', duration: 2000 });
                Logger.info('购买宠物:', pet.name);
            }
        }

        saveData();
        return true;
    }

    /**
     * 使用道具
     */
    function useItem(itemId) {
        var playerData = getPlayerData();
        var gameItems = getGameItems();

        // 局内道具（治疗药水、时间药水）使用局内数量
        if (itemId === 'healPotion' || itemId === 'timePotion') {
            // 检查局内道具数量
            if (gameItems[itemId] <= 0) {
                addMessage('没有该道具', '#ff6b6b');
                return false;
            }

            if (itemId === 'healPotion') {
                // 治疗药水：恢复50点HP
                var healAmount = 50;
                playerData.playerHp = Math.min(playerData.playerHp + healAmount, playerData.maxPlayerHp);
                gameItems.healPotion--;
                // 任务：使用道具
                updateTaskProgress('use_item', 1);
                updateTaskStats('itemsUsed', 1);
                addMessage('恢复' + healAmount + '点HP!', '#00ff88');
                Logger.info('使用治疗药水，恢复HP:', healAmount, '剩余:', gameItems.healPotion);
                return true;
            } else if (itemId === 'timePotion') {
                // 时间药水：增加10秒
                var addTime = 10;
                addTimeLeft(addTime);
                gameItems.timePotion--;
                // 任务：使用道具
                updateTaskProgress('use_item', 1);
                updateTaskStats('itemsUsed', 1);
                addMessage('增加' + addTime + '秒!', '#00ccff');
                Logger.info('使用时间药水，增加时间:', addTime, '剩余:', gameItems.timePotion);
                return true;
            }
        }

        // 经验药水：使用背包数量
        if (!playerData.items || !playerData.items[itemId] || playerData.items[itemId].quantity <= 0) {
            addMessage('没有该道具', '#ff6b6b');
            return false;
        }

        if (itemId === 'expPotionSmall' || itemId === 'expPotionMedium' || itemId === 'expPotionLarge') {
            // 经验药水：增加角色经验
            var expMap = {
                'expPotionSmall': 50,
                'expPotionMedium': 100,
                'expPotionLarge': 150
            };
            var expAmount = expMap[itemId];
            var currentCharId = playerData.currentCharacterId;
            if (currentCharId) {
                addCharExp(currentCharId, expAmount);
                playerData.items[itemId].quantity--;
                saveData();
                addMessage('获得' + expAmount + '经验!', '#ffcc00');
                Logger.info('使用经验药水，获得经验:', expAmount);
                return true;
            } else {
                addMessage('请先选择角色!', '#ff6b6b');
                return false;
            }
        }

        // 星辉宝箱：随机获得抽卡券
        if (itemId === 'starChest') {
            if (!playerData.items.starChest || playerData.items.starChest.quantity <= 0) {
                addMessage('没有星辉宝箱', '#ff6b6b');
                return false;
            }

            var STAR_CHEST_REWARDS = deps.getStarChestRewards();

            // 随机选择一种奖励
            var totalWeight = 0;
            for (let i = 0; i < STAR_CHEST_REWARDS.length; i++) {
                totalWeight += STAR_CHEST_REWARDS[i].weight;
            }

            var roll = Math.random() * totalWeight;
            var accumulated = 0;
            var selectedReward = null;

            for (let j = 0; j < STAR_CHEST_REWARDS.length; j++) {
                accumulated += STAR_CHEST_REWARDS[j].weight;
                if (roll < accumulated) {
                    selectedReward = STAR_CHEST_REWARDS[j];
                    break;
                }
            }

            if (!selectedReward) {
                selectedReward = STAR_CHEST_REWARDS[0];
            }

            // 执行抽卡
            playerData.items.starChest.quantity--;
            var results = performGachaFn(selectedReward.count, selectedReward.pool);

            // 显示结果
            var resultText = selectedReward.emoji + selectedReward.name + '\n';
            resultText += results.map(function(r) { return (r.emoji || '🎁') + r.name; }).join(' ');

            showModal({
                title: '🎉 星辉宝箱开启！',
                content: '获得: ' + selectedReward.name + '\n\n' + resultText.substring(0, 100),
                showCancel: false,
                confirmText: '太棒了'
            });

            saveData();
            return true;
        }

        return false;
    }

    /**
     * 重置增益效果（每局开始时调用）
     */
    function resetBuffs() {
        var newBuffs = {
            attackBonus: 0,
            critRateBonus: 0,
            goldBonus: 1,
            timeBonus: 0,
            hpBonus: 0
        };
        setActiveBuffs(newBuffs);
    }

    return {
        // 常量
        ShopItems: ShopItems,

        // 核心方法
        purchaseShopItem: purchaseShopItem,
        useItem: useItem,
        resetBuffs: resetBuffs
    };
}

export { ShopItems, createShopSystem };
