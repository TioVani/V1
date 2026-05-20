/**
 * 挂机系统（AFK System）
 * 从 game.js 迁移，闭包工厂 + 依赖注入模式
 */

function createAFKSystem(deps) {
    // 依赖注入
    var getPlayerData = deps.getPlayerData;
    var saveData = deps.saveData;
    var addCharExp = deps.addCharExp;
    var getEquipments = deps.getEquipments;
    var getScreenScaleFn = deps.getScreenScale;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getBestScore = deps.getBestScore;
    var getTowerHighestFloor = deps.getTowerHighestFloor;
    var showToast = deps.showToast;

    // ==================== 内部状态 ====================
    var popupVisible = false;
    var resultVisible = false;
    var claimedResult = null;

    // ==================== 内部函数 ====================

    function calculateAccumulatedAfkRewards() {
        var pd = getPlayerData();
        if (!pd.afkData) {
            pd.afkData = { lastClaimTime: Date.now(), maxOfflineHours: 8, baseGoldPerMinute: 2, baseExpPerMinute: 2 };
            saveData();
            return { gold: 0, exp: 0, materials: {}, equipments: [], hours: 0 };
        }
        var afkData = pd.afkData;
        var now = Date.now();

        if (!afkData.lastClaimTime) {
            afkData.lastClaimTime = now;
            saveData();
            return { gold: 0, exp: 0, materials: {}, equipments: [], hours: 0 };
        }

        var elapsedMs = now - afkData.lastClaimTime;
        var elapsedMinutes = elapsedMs / (1000 * 60);
        var elapsedHours = elapsedMinutes / 60;

        var maxHours = afkData.maxOfflineHours || 8;
        var effectiveHours = Math.min(elapsedHours, maxHours);
        var effectiveMinutes = effectiveHours * 60;

        var bonusMultiplier = 1.0;
        var bestScoreBonus = Math.min((getBestScore() / 1000) * 0.05, 0.5);
        bonusMultiplier += bestScoreBonus;
        var towerFloor = getTowerHighestFloor();
        var towerBonus = Math.min((towerFloor / 10) * 0.1, 1.0);
        bonusMultiplier += towerBonus;

        var rewards = { gold: 0, exp: 0, materials: {}, equipments: [] };

        var baseGoldPerMin = afkData.baseGoldPerMinute || 5;
        rewards.gold = Math.floor(baseGoldPerMin * effectiveMinutes * bonusMultiplier);

        var baseExpPerMin = afkData.baseExpPerMinute || 2;
        rewards.exp = Math.floor(baseExpPerMin * effectiveMinutes * bonusMultiplier);

        var materialDropCount = Math.floor(effectiveMinutes / 60);
        rewards.materials.iceCrystal = Math.floor(materialDropCount * 0.25);
        rewards.materials.fireSource = Math.floor(materialDropCount * 0.25);
        rewards.materials.critCrystal = Math.max(0, Math.floor(materialDropCount * 0.0006));
        rewards.materials.critFireSource = Math.max(0, Math.floor(materialDropCount * 0.0006));

        var equipCount = Math.floor(effectiveHours / 2);
        if (effectiveHours >= 0.5 && equipCount === 0) equipCount = 1;
        rewards.equipments = equipCount;

        return {
            gold: rewards.gold,
            exp: rewards.exp,
            materials: rewards.materials,
            equipments: equipCount,
            hours: effectiveHours,
            bonusMultiplier: bonusMultiplier,
            elapsedHours: elapsedHours
        };
    }

    function claimAfkRewards() {
        var pd = getPlayerData();
        if (!pd.afkData) {
            pd.afkData = { lastClaimTime: Date.now(), maxOfflineHours: 8, baseGoldPerMinute: 2, baseExpPerMinute: 2 };
            saveData();
            popupVisible = false;
            showToast({ title: '暂无挂机奖励', icon: 'none', duration: 2000 });
            return;
        }
        var afkData = pd.afkData;
        var now = Date.now();

        if (!afkData.lastClaimTime) {
            afkData.lastClaimTime = now;
            saveData();
            popupVisible = false;
            showToast({ title: '暂无挂机奖励', icon: 'none', duration: 2000 });
            return;
        }

        var elapsedMs = now - afkData.lastClaimTime;
        var elapsedMinutes = elapsedMs / (1000 * 60);
        var elapsedHours = elapsedMinutes / 60;

        if (elapsedMinutes < 1) {
            popupVisible = false;
            showToast({ title: '挂机时间不足1分钟', icon: 'none', duration: 2000 });
            return;
        }

        var maxHours = afkData.maxOfflineHours || 8;
        var effectiveHours = Math.min(elapsedHours, maxHours);
        var effectiveMinutes = effectiveHours * 60;

        var bonusMultiplier = 1.0;
        var bestScoreBonus = Math.min((getBestScore() / 1000) * 0.05, 0.5);
        bonusMultiplier += bestScoreBonus;
        var towerFloor = getTowerHighestFloor();
        var towerBonus = Math.min((towerFloor / 10) * 0.1, 1.0);
        bonusMultiplier += towerBonus;

        var baseGoldPerMin = afkData.baseGoldPerMinute || 5;
        var gold = Math.floor(baseGoldPerMin * effectiveMinutes * bonusMultiplier);
        pd.gold = (pd.gold || 0) + gold;

        var baseExpPerMin = afkData.baseExpPerMinute || 2;
        var exp = Math.floor(baseExpPerMin * effectiveMinutes * bonusMultiplier);
        var currentCharId = pd.currentCharacterId;
        if (currentCharId && exp > 0) {
            addCharExp(currentCharId, exp);
        }

        var materialDropCount = Math.floor(effectiveMinutes / 120);
        var normalMaterialTypes = ['iceCrystal', 'fireSource'];
        var materialsGained = {};
        for (let i = 0; i < materialDropCount; i++) {
            // 水灵暴晶和火灵爆源极低概率掉落（0.06%）
            var roll = Math.random() * 100;
            var randomMaterial;
            if (roll < 0.06) {
                randomMaterial = 'critFireSource';
            } else if (roll < 0.12) {
                randomMaterial = 'critCrystal';
            } else {
                randomMaterial = normalMaterialTypes[Math.floor(Math.random() * normalMaterialTypes.length)];
            }
            var quantity = 1;
            materialsGained[randomMaterial] = (materialsGained[randomMaterial] || 0) + quantity;
            if (!pd.materials) pd.materials = {};
            if (!pd.materials[randomMaterial]) pd.materials[randomMaterial] = { quantity: 0, usedCount: 0 };
            pd.materials[randomMaterial].quantity = (pd.materials[randomMaterial].quantity || 0) + quantity;
        }

        var equipmentDropChance = Math.floor(effectiveHours / 2);
        if (effectiveHours >= 0.5 && equipmentDropChance === 0) equipmentDropChance = 1;
        var equipGained = 0;
        var equipList = [];

        var Equipments = getEquipments();
        var equipPoolByRarity = {};
        for (let eKey in Equipments) {
            var eDef = Equipments[eKey];
            if (!equipPoolByRarity[eDef.rarity]) equipPoolByRarity[eDef.rarity] = [];
            equipPoolByRarity[eDef.rarity].push(eDef);
        }

        var rarityWeights = [
            { rarity: 'N', weight: 49.4 },
            { rarity: 'R', weight: 38 },
            { rarity: 'SR', weight: 10 },
            { rarity: 'SSR', weight: 0.55 },
            { rarity: 'UR', weight: 0.075 }
        ];
        var totalWeight = 0;
        for (let w = 0; w < rarityWeights.length; w++) totalWeight += rarityWeights[w].weight;

        for (let j = 0; j < equipmentDropChance; j++) {
            var roll = Math.random() * totalWeight;
            var cumulative = 0;
            var chosenRarity = 'N';
            for (let w2 = 0; w2 < rarityWeights.length; w2++) {
                cumulative += rarityWeights[w2].weight;
                if (roll < cumulative) {
                    chosenRarity = rarityWeights[w2].rarity;
                    break;
                }
            }

            var pool = equipPoolByRarity[chosenRarity] || equipPoolByRarity['N'];
            if (pool && pool.length > 0) {
                var chosenEquip = pool[Math.floor(Math.random() * pool.length)];
                if (!pd.equipments) pd.equipments = { owned: [], equipped: {} };
                var newEquip = Object.assign({}, chosenEquip, {
                    uid: 'afk_' + chosenEquip.id + '_' + Date.now() + '_' + j
                });
                pd.equipments.owned.push(newEquip);
                equipList.push({ id: chosenEquip.id, name: chosenEquip.name, rarity: chosenEquip.rarity, emoji: chosenEquip.emoji || '⚔️' });
                equipGained++;
            }
        }

        afkData.lastClaimTime = now;
        saveData();

        claimedResult = {
            gold: gold,
            exp: exp,
            materials: materialsGained,
            equipments: equipGained,
            equipList: equipList,
            hours: effectiveHours.toFixed(1),
            bonus: bonusMultiplier.toFixed(2)
        };
        popupVisible = false;
        resultVisible = true;
    }

    // ==================== 公共 API ====================

    return {
        calculateAccumulatedAfkRewards: calculateAccumulatedAfkRewards,
        claimAfkRewards: claimAfkRewards,

        get popupVisible() { return popupVisible; },
        set popupVisible(v) { popupVisible = v; },
        get resultVisible() { return resultVisible; },
        set resultVisible(v) { resultVisible = v; },
        get claimedResult() { return claimedResult; },
        set claimedResult(v) { claimedResult = v; }
    };
}

export { createAFKSystem };
