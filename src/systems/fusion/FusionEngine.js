/**
 * FusionEngine — 融合核心引擎
 * 共享流程：校验→成功率计算→掷骰→成功/失败/大成功
 * 策略模块通过 deps.strategies 注入，引擎不硬编码任何融合类型
 */
import Logger from '../../utils/Logger.js';
import { FUSION_CONFIG } from '../../config/FusionConfig.js';

function createFusionEngine(deps) {
    var getPlayerData = deps.getPlayerData;
    var saveData = deps.saveData;
    var showToast = deps.showToast;
    var getRegistry = deps.getRegistry;
    var strategies = deps.strategies;

    function perform(materialIds, type) {
        var strategy = strategies[type];
        if (!strategy) {
            showToast({ title: '未知融合类型', icon: 'none', duration: 1500 });
            return { success: false, error: 'unknown_type' };
        }
        if (!materialIds || materialIds.length < FUSION_CONFIG.materialCount) {
            showToast({ title: '材料不足，需要' + FUSION_CONFIG.materialCount + '个', icon: 'none', duration: 1500 });
            return { success: false, error: 'insufficient_materials' };
        }

        var playerData = getPlayerData();
        var registry = getRegistry();

        var materials = strategy.resolveMaterials(materialIds, playerData);
        if (!materials || materials.length < FUSION_CONFIG.materialCount) {
            showToast({ title: '无法找到指定材料', icon: 'none', duration: 1500 });
            return { success: false, error: 'materials_not_found' };
        }

        var validation = strategy.validate(materials);
        if (!validation.valid) {
            showToast({ title: validation.error, icon: 'none', duration: 1500 });
            return { success: false, error: validation.error };
        }

        if (strategy.checkExtraCost) {
            var costCheck = strategy.checkExtraCost(playerData, materials);
            if (!costCheck.canAfford) {
                showToast({ title: costCheck.error, icon: 'none', duration: 1500 });
                return { success: false, error: costCheck.error };
            }
        }

        var layer = strategy.determineLayer ? strategy.determineLayer(materials, playerData) : 'normal';
        var isPity = registry.checkPity(type);
        var baseRate = FUSION_CONFIG.successRate[layer] || FUSION_CONFIG.successRate.normal;
        var rateModifier = strategy.calculateRateModifier(materials);
        var finalRate = Math.max(5, Math.min(100, baseRate + rateModifier));

        var roll = Math.random() * 100;
        var success = isPity || roll < finalRate;
        var isGreatSuccess = success && (Math.random() < FUSION_CONFIG.greatSuccessChance);

        Logger.info('融合:', type, 'layer=' + layer, 'rate=' + finalRate + '%',
            'pity=' + isPity, 'roll=' + roll.toFixed(1), 'ok=' + success, 'great=' + isGreatSuccess);

        var result;
        if (success) {
            result = strategy.produce(materials, layer, isGreatSuccess);
            result.success = true;
            result.greatSuccess = isGreatSuccess;
            result.layer = layer;
            strategy.consumeMaterials(materialIds, playerData);
            if (strategy.consumeExtraCost) strategy.consumeExtraCost(playerData, materials);
            if (strategy.saveResult) strategy.saveResult(result, playerData);
            var isNew = registry.record(type, result);
            result.isNewDiscovery = isNew;
            registry.resetPity(type);
            registry.incrementStat('totalAttempts');
            registry.incrementStat('totalSuccesses');
            if (isGreatSuccess) registry.incrementStat('totalGreatSuccesses');
            showToast({
                title: (isGreatSuccess ? '🌟大成功！' : '融合成功！') + '获得 ' + result.name,
                icon: 'none', duration: 2000
            });
        } else {
            strategy.consumeRandomMaterials(materialIds, playerData, FUSION_CONFIG.failureMaterialLoss);
            registry.incrementPity(type);
            registry.addFailureHistory(type, materials.map(function(m) { return m.name; }));
            registry.incrementStat('totalAttempts');
            result = { success: false, layer: layer };
            showToast({ title: '融合失败...损失了1个材料', icon: 'none', duration: 2000 });
        }

        saveData();
        return result;
    }

    function getAvailableMaterials(type) {
        var strategy = strategies[type];
        if (!strategy) return [];
        return strategy.getAvailableMaterials(getPlayerData());
    }

    function getSuccessRate(materialIds, type) {
        var strategy = strategies[type];
        if (!strategy) return 0;
        var playerData = getPlayerData();
        var materials = strategy.resolveMaterials(materialIds, playerData);
        if (!materials || materials.length < FUSION_CONFIG.materialCount) return 0;
        var validation = strategy.validate(materials);
        if (!validation.valid) return 0;
        var layer = strategy.determineLayer ? strategy.determineLayer(materials, playerData) : 'normal';
        var baseRate = FUSION_CONFIG.successRate[layer] || FUSION_CONFIG.successRate.normal;
        var rateModifier = strategy.calculateRateModifier(materials);
        return Math.max(5, Math.min(100, baseRate + rateModifier));
    }

    function validateSelection(materialIds, type) {
        var strategy = strategies[type];
        if (!strategy) return { valid: false, error: '未知融合类型' };
        var playerData = getPlayerData();
        var materials = strategy.resolveMaterials(materialIds, playerData);
        if (!materials || materials.length < FUSION_CONFIG.materialCount) {
            return { valid: false, error: '无法找到指定材料' };
        }
        return strategy.validate(materials);
    }

    function getAvailableTypes() {
        return Object.keys(strategies);
    }

    function getFusionHistory(limit) {
        return getRegistry().getHistory(limit);
    }

    return {
        perform: perform,
        getAvailableMaterials: getAvailableMaterials,
        getSuccessRate: getSuccessRate,
        validateSelection: validateSelection,
        getAvailableTypes: getAvailableTypes,
        getFusionHistory: getFusionHistory
    };
}

export { createFusionEngine };
