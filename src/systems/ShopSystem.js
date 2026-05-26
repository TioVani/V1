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
    // 材料商品（灵石购买）
    materials: [
        { id: 'iceCrystal', name: '水灵晶', emoji: '💧', price: 30, currency: 'starSource', description: '解锁/升级水灵星' },
        { id: 'fireSource', name: '火灵源', emoji: '🔥', price: 40, currency: 'starSource', description: '解锁/升级火灵星' },
        { id: 'critCrystal', name: '水灵暴晶', emoji: '💠', price: 50, currency: 'starSource', description: '会心感应永久提升' },
        { id: 'critFireSource', name: '火灵爆源', emoji: '💥', price: 80, currency: 'starSource', description: '永久+20%爆伤' }
    ],
    // 增益道具（灵石购买，单局生效）
    buffs: [
        { id: 'attackBoost', name: '灵光强化', emoji: '⚔️', price: 20, currency: 'starSource', effect: { attackBonus: 50 }, description: '本局灵光冲击+50' },
        { id: 'critBoost', name: '会心强化', emoji: '🔮', price: 30, currency: 'starSource', effect: { critRateBonus: 10 }, description: '本局会心感应提升' },
        { id: 'goldBoost', name: '灵币加成', emoji: '💰', price: 15, currency: 'starSource', effect: { goldBonus: 2 }, description: '本局灵币获取×2' },
        { id: 'timeBoost', name: '时间延长', emoji: '⏰', price: 25, currency: 'starSource', effect: { timeBonus: 15 }, description: '本局初始时间+15秒' },
        { id: 'hpBoost', name: '灵核强化', emoji: '❤️', price: 20, currency: 'starSource', effect: { hpBonus: 100 }, description: '灵核活性上限+100' }
    ],
    // 道具商品（灵币购买）
    items: [
        { id: 'healPotion', name: '愈灵露', emoji: '🧪', price: 200, currency: 'gold', effect: { heal: 50 }, description: '恢复50点灵能' },
        { id: 'timePotion', name: '时序露', emoji: '⏳', price: 300, currency: 'gold', effect: { addTime: 10 }, description: '立即增加10秒时间' },
        { id: 'expPotionSmall', name: '灵悟卷(小)', emoji: '📜', price: 100, currency: 'gold', effect: { exp: 50 }, description: '当前角色+50感悟' },
        { id: 'expPotionMedium', name: '灵悟卷(中)', emoji: '📔', price: 180, currency: 'gold', effect: { exp: 100 }, description: '当前角色+100感悟' },
        { id: 'expPotionLarge', name: '灵悟卷(大)', emoji: '📖', price: 250, currency: 'gold', effect: { exp: 150 }, description: '当前角色+150感悟' },
    ],
    // 技能抽取（灵石购买）
    gacha: [
        { id: 'skillGacha1', name: '单次唤灵', emoji: '🔮', price: 50, currency: 'starSource', description: '抽取1个技能' },
        { id: 'skillGacha10', name: '古灵共鸣', emoji: '🔮', price: 450, currency: 'starSource', description: '抽取10个技能（9折）' }
    ],
    // 宠物商店（灵币购买）
    pets: [
        { id: 'pet_slime', name: '铜锈碎片', emoji: '🟤', price: 500, currency: 'gold', description: '青铜锈片聚成的古灵' },
        { id: 'pet_fire_spirit', name: '火灵精', emoji: '🔥', price: 1000, currency: 'gold', description: '火灵精，攻击附带燃烧' },
        { id: 'pet_ice_fairy', name: '水灵仙子', emoji: '💧', price: 1000, currency: 'gold', description: '水灵仙子，有几率冻结邪灵' },
        { id: 'pet_star_dragon', name: '应龙', emoji: '🐉', price: 2000, currency: 'gold', description: '应龙的龙威震慑邪灵，紊乱能量在你面前更难凝聚' }
    ]
};

function createShopSystem(deps) {
    // 依赖注入
    var getSaveData = deps.getSaveData;
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
        var pd = getSaveData();

        // 检查货币是否足够
        if (item.currency === 'gold') {
            if (pd.gold < item.price) {
                showToast({ title: '灵币不足！', icon: 'none', duration: 1500 });
                return false;
            }
            pd.gold -= item.price;
        } else if (item.currency === 'starSource') {
            if ((pd.starSource || 0) < item.price) {
                showToast({ title: '灵石不足！', icon: 'none', duration: 1500 });
                return false;
            }
            pd.starSource -= item.price;
        }

        // 根据商品类型处理
        if (ShopItems.materials.indexOf(item) !== -1) {
            // 材料商品：直接添加到背包
            if (!pd.materials[item.id]) {
                pd.materials[item.id] = { quantity: 0, usedCount: 0 };
            }
            pd.materials[item.id].quantity++;
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
                if (!pd.items) {
                    pd.items = {
                        healPotion: { quantity: 0 },
                        timePotion: { quantity: 0 },
                        expPotionSmall: { quantity: 0 },
                        expPotionMedium: { quantity: 0 },
                        expPotionLarge: { quantity: 0 }
                    };
                }
                if (!pd.items[item.id]) {
                    pd.items[item.id] = { quantity: 0 };
                }
                pd.items[item.id].quantity++;
                showToast({ title: '已存入背包！', icon: 'success', duration: 1500 });
            } else if (item.effect.exp) {
                // 灵悟卷：立即使用
                var currentCharId = pd.currentCharacterId;
                if (currentCharId) {
                    addCharExp(currentCharId, item.effect.exp);
                    showToast({ title: '获得' + item.effect.exp + '感悟！', icon: 'none', duration: 1500 });
                } else {
                    showToast({ title: '请先选择角色！', icon: 'none', duration: 1500 });
                    // 退款
                    if (item.currency === 'gold') {
                        pd.gold += item.price;
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
            if (!pd.pets) {
                pd.pets = { owned: [], equipped: null };
            }
            if (!pd.pets.owned) {
                pd.pets.owned = [];
            }
            var Pets = getPets();
            var pet = Pets[item.id];
            if (pet) {
                pd.pets.owned.push({
                    id: item.id,
                    uid: 'pet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    level: 1,
                    exp: 0
                });
                // 标记该宠物已从商店购买（下架）
                if (!pd.purchasedShopPets) pd.purchasedShopPets = [];
                if (pd.purchasedShopPets.indexOf(item.id) === -1) {
                    pd.purchasedShopPets.push(item.id);
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
        var pd = getSaveData();
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
                pd.playerHp = Math.min(pd.playerHp + healAmount, pd.maxPlayerHp);
                gameItems.healPotion--;
                // 任务：使用道具
                updateTaskProgress('use_item', 1);
                updateTaskStats('itemsUsed', 1);
                addMessage('恢复' + healAmount + '点灵能!', '#00ff88');
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

        // 灵悟卷：使用背包数量
        if (!pd.items || !pd.items[itemId] || pd.items[itemId].quantity <= 0) {
            addMessage('没有该道具', '#ff6b6b');
            return false;
        }

        if (itemId === 'expPotionSmall' || itemId === 'expPotionMedium' || itemId === 'expPotionLarge') {
            // 灵悟卷：增加角色经验
            var expMap = {
                'expPotionSmall': 50,
                'expPotionMedium': 100,
                'expPotionLarge': 150
            };
            var expAmount = expMap[itemId];
            var currentCharId = pd.currentCharacterId;
            if (currentCharId) {
                addCharExp(currentCharId, expAmount);
                pd.items[itemId].quantity--;
                saveData();
                addMessage('获得' + expAmount + '感悟!', '#ffcc00');
                Logger.info('使用灵悟卷，获得感悟:', expAmount);
                return true;
            } else {
                addMessage('请先选择角色!', '#ff6b6b');
                return false;
            }
        }

        // 星辉宝箱：随机获得唤灵券
        if (itemId === 'starChest') {
            if (!pd.items.starChest || pd.items.starChest.quantity <= 0) {
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
            pd.items.starChest.quantity--;
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
