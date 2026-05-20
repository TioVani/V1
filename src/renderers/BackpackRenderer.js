/**
 * BackpackRenderer — 背包系统渲染
 */
import { RARITY_COLORS } from '../config/GameConfig.js';

function createBackpackRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var uiCore = deps.uiCore;
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getStrokeRoundRect = deps.getStrokeRoundRect;
    var getGachaRoundRect = deps.getGachaRoundRect;
    var getPlayerData = deps.getPlayerData;
    var getUiScrollState = deps.getUiScrollState;
    var uiScrollState = getUiScrollState();
    var Materials = deps.Materials;
    var Characters = deps.Characters;
    var getCharacterKey = deps.getCharacterKey;
    var Skills = deps.Skills;
    var SkillTypes = deps.SkillTypes;
    var Pets = deps.Pets;
    var PetRarity = deps.PetRarity;
    var Equipments = deps.Equipments;
    var EquipmentTypes = deps.EquipmentTypes;
    var EquipmentRarity = deps.EquipmentRarity;
    var SEASON_STAR_TYPES = deps.SEASON_STAR_TYPES;
    var MAX_CHARACTER_LEVEL = deps.MAX_CHARACTER_LEVEL;
    var getCharacterExperience = deps.getCharacterExperience;
    var getCharacterStatsAtLevel = deps.getCharacterStatsAtLevel;
    var calculateTotalAttack = deps.calculateTotalAttack;
    var getFaithSystem = deps.getFaithSystem;
    var getCharacterFullStats = deps.getCharacterFullStats;

    // 角色列表去重缓存（避免每帧 new Set + 展开数组）
    var _cachedCharIds = null;
    var _cachedCharIdsSrc = null;

    function getUniqueCharIds(ownedCharacters) {
        if (_cachedCharIdsSrc === ownedCharacters) return _cachedCharIds;
        _cachedCharIdsSrc = ownedCharacters;
        var seen = {};
        _cachedCharIds = [];
        for (var i = 0; i < ownedCharacters.length; i++) {
            if (!seen[ownedCharacters[i]]) {
                seen[ownedCharacters[i]] = true;
                _cachedCharIds.push(ownedCharacters[i]);
            }
        }
        return _cachedCharIds;
    }

    function renderBackpack() {
    var ctx = getCtx();
    var screenWidth = getScreenWidth();
    var screenHeight = getScreenHeight();
    var scale = getScreenScale();
    var Assets = getAssets();
    var playerData = getPlayerData();
    var uiState = getUiScrollState();
    var fillRoundRect = getFillRoundRect();
    var gachaRoundRect = getGachaRoundRect();
    var strokeRoundRect = getStrokeRoundRect();
    // 绘制背景图片（使用缓存的背景位置）
    if (Assets.backgroundImage && Assets.backgroundImage.complete && Assets.bgPositionCache) {
        var cache = Assets.bgPositionCache;
        ctx.drawImage(Assets.backgroundImage, cache.drawX, cache.drawY, cache.drawWidth, cache.drawHeight);

        // 添加半透明遮罩（适中透明度，确保内容清晰可见）
        ctx.fillStyle = 'rgba(15, 15, 26, 0.5)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);
    } else {
        // 使用纯色背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, screenWidth, screenHeight);
    }

    // 绘制背包图片作为装饰（左上角）
    if (Assets.backpackImage && Assets.backpackImage.complete) {
        var bpSize = Math.floor(40 * scale);
        var bpX = Math.floor(20 * scale);  // 向右移动5像素
        var bpY = Math.floor(25 * scale);  // 向下移动10像素
        ctx.drawImage(Assets.backpackImage, bpX, bpY, bpSize, bpSize);
    }

    // 右侧垂直标签配置（书签样式）- 先保存变量，稍后渲染
    var tabWidth = Math.floor(50 * scale);
    var tabHeight = Math.floor(45 * scale);
    var tabGap = Math.floor(5 * scale);
    var tabX = screenWidth - tabWidth;  // 右侧边缘
    var startTabY = Math.floor(100 * scale);
    
    // 8个标签：材料、古灵、灵光、道具、装备、技能、宠物、信仰
    var tabLabels = [
        { id: 'materials', name: '材料', icon: '📦' },
        { id: 'characters', name: '古灵', icon: '👤' },
        { id: 'stars', name: '灵光', icon: '⭐' },
        { id: 'items', name: '道具', icon: '🧪' },
        { id: 'equipments', name: '装备', icon: '⚔️' },
        { id: 'skills', name: '技能', icon: '✨' },
        { id: 'pets', name: '宠物', icon: '🐾' },
        { id: 'faith', name: '信仰', icon: '🙏' }
    ];
    
    // 先渲染内容区域（标签在下层）
    if (uiScrollState.backpackTab === 'materials') {
        renderMaterialsTab();
    } else if (uiScrollState.backpackTab === 'characters') {
        renderCharactersTab();
    } else if (uiScrollState.backpackTab === 'stars') {
        renderStarsTab();
    } else if (uiScrollState.backpackTab === 'items') {
        renderItemsTab();
    } else if (uiScrollState.backpackTab === 'equipments') {
        renderEquipmentsTab();
    } else if (uiScrollState.backpackTab === 'skills') {
        renderSkillsTab();
    } else if (uiScrollState.backpackTab === 'pets') {
        renderPetsTab();
    } else if (uiScrollState.backpackTab === 'faith') {
        renderFaithTab();
    }
    
    // 最后渲染标签（覆盖在内容之上）
    for (let t = 0; t < tabLabels.length; t++) {
        var tab = tabLabels[t];
        var tabY = startTabY + t * (tabHeight + tabGap);
        var isActive = uiScrollState.backpackTab === tab.id;
        
        // 标签背景（圆角标签样式，左侧圆角+右侧直角贴边）
        ctx.fillStyle = isActive ? '#ffd700' : '#4A6FA5';
        ctx.beginPath();
        var r = Math.floor(8 * scale);
        ctx.moveTo(tabX, tabY + r);
        ctx.arcTo(tabX, tabY, tabX + r, tabY, r);
        ctx.lineTo(screenWidth, tabY);
        ctx.lineTo(screenWidth, tabY + tabHeight);
        ctx.lineTo(tabX + r, tabY + tabHeight);
        ctx.arcTo(tabX, tabY + tabHeight, tabX, tabY + tabHeight - r, r);
        ctx.closePath();
        ctx.fill();
        
        // 标签文字
        ctx.fillStyle = isActive ? '#1a1a2e' : '#ffffff';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tab.name, tabX + tabWidth / 2, tabY + tabHeight / 2);
    }
    
    // 返回按钮（左下角）
    uiCore.drawBackButton();
}

    function renderMaterialsTab() {
    var ctx = getCtx();
    var screenWidth = getScreenWidth();
    var screenHeight = getScreenHeight();
    var scale = getScreenScale();
    var Assets = getAssets();
    var playerData = getPlayerData();
    var uiState = getUiScrollState();
    var fillRoundRect = getFillRoundRect();
    var gachaRoundRect = getGachaRoundRect();
    var strokeRoundRect = getStrokeRoundRect();
    var scale = getScreenScale();
    var startY = Math.floor(100 * scale);
    var materialItemHeight = Math.floor(80 * scale);
    var padding = Math.floor(10 * scale);
    
    // 计算内容区域宽度（排除右侧标签区域）
    var tabAreaWidth = Math.floor(60 * scale);
    var contentWidth = screenWidth - tabAreaWidth;

    // 材料标题
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('我的材料', Math.floor(20 * scale), startY - Math.floor(10 * scale));

    // 材料列表
    var materialIds = Object.keys(playerData.materials);
    var hasVisibleMaterials = false;

    // 检查是否有可见的材料（数量大于0）
    for (let j = 0; j < materialIds.length; j++) {
        var matData = playerData.materials[materialIds[j]];
        if (matData && matData.quantity > 0) {
            hasVisibleMaterials = true;
            break;
        }
    }

    if (!hasVisibleMaterials) {
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('背包为空', contentWidth/2, screenHeight/2);
    } else {
        // 内容区域裁剪（标题下方到屏幕底部）
        var contentTop = startY + Math.floor(20 * scale);
        var contentBottom = screenHeight - Math.floor(10 * scale);
        var visibleHeight = contentBottom - contentTop;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentTop, screenWidth, visibleHeight);
        ctx.clip();
        
        var displayIndex = 0;  // 实际显示的材料索引
        for (let i = 0; i < materialIds.length; i++) {
            var materialId = materialIds[i];
            var material = Materials[materialId];
            var materialData = playerData.materials[materialId];
            
            if (!material || !material.name || !material.emoji) {
                continue;
            }
            
            // 只显示数量大于0的材料
            if (materialData.quantity <= 0) {
                continue;
            }
            
            var itemY = contentTop + displayIndex * (materialItemHeight + padding) - uiScrollState.backpackScrollY; // 添加滚动偏移
            displayIndex++;  // 只有实际显示的材料才增加索引
            
            // 材料背景（圆角）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), materialItemHeight, Math.floor(8 * scale));

            // 材料图标
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(36 * scale) + 'px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(material.emoji, Math.floor(60 * scale), itemY + materialItemHeight / 2);
            ctx.restore();

            // 材料名称
            ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(material.name, Math.floor(100 * scale), itemY + Math.floor(25 * scale));

            // 材料持有数量
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            var nameWidth = ctx.measureText(material.name).width;
            ctx.fillText('x' + materialData.quantity, Math.floor(100 * scale) + nameWidth + Math.floor(16 * scale), itemY + Math.floor(25 * scale));

            // 材料描述
            ctx.font = Math.floor(10 * scale) + 'px sans-serif';
            ctx.fillStyle = '#cccccc';
            ctx.fillText(material.description, Math.floor(100 * scale), itemY + Math.floor(50 * scale));

            // 使用次数
            ctx.fillStyle = '#87CEEB';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            var usedCount = materialData.usedCount || 0;
            ctx.fillText('已用:' + usedCount + '次', Math.floor(100 * scale), itemY + Math.floor(70 * scale));

            // 水灵暴晶特殊显示：额外暴击率
            if (materialId === 'critCrystal' && playerData.extraCritRate > 0) {
                ctx.fillStyle = '#ffd700';
                ctx.fillText('| 会心感应 +' + playerData.extraCritRate + '%', Math.floor(180 * scale), itemY + Math.floor(70 * scale));
            }
            
            // 火灵爆源特殊显示：额外暴击伤害
            if (materialId === 'critFireSource' && playerData.extraCritDamage > 0) {
                ctx.fillStyle = '#ffd700';
                ctx.fillText('| 爆伤 +' + (playerData.extraCritDamage * 100) + '%', Math.floor(180 * scale), itemY + Math.floor(70 * scale));
            }

            // 使用按钮（右对齐，考虑右侧标签区域，再往左移30像素）
            var useBtnW = Math.floor(50 * scale);
            var useBtnH = Math.floor(25 * scale);
            var tabAreaWidth = Math.floor(60 * scale);
            var useBtnX = screenWidth - tabAreaWidth - useBtnW - Math.floor(50 * scale);  // 往左移动30像素
            var useBtnY = itemY + Math.floor(12 * scale);
ctx.fillStyle = '#4CAF50';
fillRoundRect(ctx, useBtnX, useBtnY, useBtnW, useBtnH, 6);
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('使用', useBtnX + useBtnW / 2, useBtnY + useBtnH / 2);
            
            ctx.restore();
        }
        
        ctx.restore(); // 恢复裁剪区域
    }
}

    function renderCharactersTab() {
    var ctx = getCtx();
    var screenWidth = getScreenWidth();
    var screenHeight = getScreenHeight();
    var scale = getScreenScale();
    var Assets = getAssets();
    var playerData = getPlayerData();
    var uiState = getUiScrollState();
    var fillRoundRect = getFillRoundRect();
    var gachaRoundRect = getGachaRoundRect();
    var strokeRoundRect = getStrokeRoundRect();
    var scale = getScreenScale();
    var startY = Math.floor(100 * scale);
    var characterItemHeight = Math.floor(100 * scale);
    var padding = Math.floor(15 * scale);
    
    // 计算内容区域宽度（排除右侧标签区域）
    var tabAreaWidth = Math.floor(60 * scale);
    var contentWidth = screenWidth - tabAreaWidth;

    // 角色标题
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('我的角色', Math.floor(20 * scale), startY - Math.floor(10 * scale));

    // 角色列表
    if (!playerData.ownedCharacters || playerData.ownedCharacters.length === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无角色', contentWidth/2, screenHeight/2);
    } else {
        // 内容区域裁剪（标题下方到屏幕底部）
        var contentTop = startY + Math.floor(20 * scale);
        var contentBottom = screenHeight - Math.floor(10 * scale);
        var visibleHeight = contentBottom - contentTop;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentTop, screenWidth, visibleHeight);
        ctx.clip();
        
        // 去重显示（使用缓存避免每帧 GC）
        var uniqueCharIds = getUniqueCharIds(playerData.ownedCharacters);
        for (let i = 0; i < uniqueCharIds.length; i++) {
            var currentCharId = uniqueCharIds[i];

            var mappedCharId = getCharacterKey(currentCharId);
            var character = Characters[mappedCharId];

            if (!character) {
                continue;
            }

            var itemY = contentTop + i * (characterItemHeight + padding) - uiScrollState.backpackScrollY;

            // 角色背景（圆角）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), characterItemHeight, Math.floor(8 * scale));

            // 角色图标
            if (Assets.characterImages[mappedCharId] && Assets.characterImages[mappedCharId].complete) {
                // 使用角色立绘图片
                ctx.drawImage(Assets.characterImages[mappedCharId], 70 - 25, itemY + characterItemHeight / 2 - 25, 50, 50);
            } else {
                // 图片未加载，使用 emoji 作为后备
                ctx.font = '40px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('👤', 70, itemY + characterItemHeight / 2);
            }
            
            // 角色名称和等级
            var charExp = getCharacterExperience(currentCharId);
            var charStats = getCharacterFullStats(currentCharId);

            // 角色名称（稀有度特效）
            var charNameText = character.name;
            var charNameX = Math.floor(120 * scale);
            var charNameY = itemY + Math.floor(30 * scale);
            ctx.font = 'bold ' + Math.floor(24 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            if (character.rarity === 'SP') {
                uiCore.drawSPText(charNameText, charNameX + ctx.measureText(charNameText).width / 2, charNameY, 24, scale);
            } else if (character.rarity === 'LR') {
                uiCore.drawLRText(charNameText, charNameX + ctx.measureText(charNameText).width / 2, charNameY, 24, scale);
            } else if (character.rarity === 'UR') {
                uiCore.drawURText(charNameText, charNameX + ctx.measureText(charNameText).width / 2, charNameY, 24, scale);
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.fillText(charNameText, charNameX, charNameY);
            }

            // 角色等级（只显示当前等级，字体是名称的一半）
            var nameWidth = ctx.measureText(character.name).width;
            ctx.fillStyle = '#87CEEB';
            ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText(' Lv.' + charExp.level, Math.floor(120 * scale) + nameWidth + Math.floor(5 * scale), itemY + Math.floor(30 * scale));
                        // 角色稀有度
                        var rarityColors = RARITY_COLORS;
                        var rarityColor = rarityColors[character.rarity] || '#ffffff';
                        ctx.fillStyle = rarityColor;
                        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
                        ctx.fillText('[' + character.rarity + ']', Math.floor(120 * scale), itemY + Math.floor(55 * scale));

                        // 计算总攻击力（包含材料加成）
                        var totalAttack = charStats.attack;
                        for (let matId in playerData.usedMaterials) {
                            var usedData = playerData.usedMaterials[matId];
                            var mat = Materials[matId];
                            if (mat && mat.attributes && mat.attributes.attack) {
                                totalAttack += mat.attributes.attack * usedData.count;
                            }
                        }

                        // 角色属性（显示完整属性，攻击力包含材料加成）
                        ctx.fillStyle = '#ffffff';
                        ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                        ctx.fillText('灵能:' + charStats.hp + ' 灵光冲击:' + totalAttack + ' 会心感应:' + charStats.critRate.toFixed(1) + '%', Math.floor(120 * scale), itemY + Math.floor(75 * scale));
                        ctx.fillText('会心威力:' + (charStats.critDamage * 100).toFixed(0) + '% 灵场护盾:' + charStats.defense, Math.floor(120 * scale), itemY + Math.floor(92 * scale));
            // 如果是当前角色，显示标记
            if (currentCharId === playerData.currentCharacterId) {
                ctx.fillStyle = '#4CAF50';
                ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('当前使用', screenWidth - Math.floor(90 * scale), itemY + Math.floor(50 * scale));
            }
        }
        
        ctx.restore(); // 恢复裁剪区域
    }
}

    function renderStarsTab() {
    var ctx = getCtx();
    var screenWidth = getScreenWidth();
    var screenHeight = getScreenHeight();
    var scale = getScreenScale();
    var Assets = getAssets();
    var playerData = getPlayerData();
    var uiState = getUiScrollState();
    var fillRoundRect = getFillRoundRect();
    var gachaRoundRect = getGachaRoundRect();
    var strokeRoundRect = getStrokeRoundRect();
    var scale = getScreenScale();
    var startY = Math.floor(100 * scale);
    var starItemHeight = Math.floor(80 * scale);
    var padding = Math.floor(10 * scale);
    
    // 计算内容区域宽度（排除右侧标签区域）
    var tabAreaWidth = Math.floor(60 * scale);
    var contentWidth = screenWidth - tabAreaWidth;

    // 星星标题
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('我的灵光', Math.floor(20 * scale), startY - Math.floor(10 * scale));

    // 从SEASON_STAR_TYPES构建星星类型列表（已包含普通星星）
    var allStarTypes = SEASON_STAR_TYPES.map(function(s) {
        return {
            id: s.id,
            name: s.name,
            emoji: s.emoji,
            description: s.description,
            baseMultiplier: s.multiplier,
            unlocked: false
        };
    });

    // 更新解锁状态
    for (let i = 0; i < allStarTypes.length; i++) {
        var starId = allStarTypes[i].id;
        if (starId === 'normal') {
            allStarTypes[i].unlocked = true;
        } else {
            allStarTypes[i].unlocked = playerData.unlockedStarTypes && playerData.unlockedStarTypes.indexOf(starId) !== -1;
        }
    }

    // 过滤出已解锁的星星
    var unlockedStars = allStarTypes.filter(function(s) { return s.unlocked; });

    // 内容区域裁剪
    var contentTop = startY + Math.floor(20 * scale);
    var contentBottom = screenHeight - Math.floor(10 * scale);
    var visibleHeight = contentBottom - contentTop;

    // 计算滚动限制（基于实际裁剪区域）
    var totalHeight = unlockedStars.length * (starItemHeight + padding);
    var maxScroll = Math.max(0, totalHeight - visibleHeight);
    if (uiScrollState.backpackScrollY > maxScroll) uiScrollState.backpackScrollY = maxScroll;
    if (uiScrollState.backpackScrollY < 0) uiScrollState.backpackScrollY = 0;

    // 如果没有解锁任何星星
    if (unlockedStars.length === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无灵光', contentWidth/2, screenHeight/2);
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('可在商城唤灵获取', contentWidth/2, screenHeight/2 + Math.floor(30 * scale));
        return;
    }
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, contentTop, screenWidth, visibleHeight);
    ctx.clip();
    
    for (let i = 0; i < unlockedStars.length; i++) {
        var starType = unlockedStars[i];

        var itemY = contentTop + i * (starItemHeight + padding) - uiScrollState.backpackScrollY;

        // 星星背景（圆角）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), starItemHeight, Math.floor(8 * scale));

        // 星星图标
        var iconSize = Math.floor(36 * scale);
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = iconSize + 'px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(starType.emoji, Math.floor(60 * scale), itemY + starItemHeight / 2);
        ctx.restore();

        // 星星名称
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(starType.name, Math.floor(100 * scale), itemY + Math.floor(28 * scale));

        // 水灵星/火灵星显示等级和升级按钮
        var isIceStar = (starType.id === 'ice');
        var isFireStar = (starType.id === 'fire');
        
        if (isIceStar || isFireStar) {
            var starLevel = isIceStar ? (playerData.iceStarLevel || 0) : (playerData.fireStarLevel || 0);
            var maxLevel = isIceStar ? (playerData.maxIceStarLevel || 10) : (playerData.maxFireStarLevel || 10);
            var materialId = isIceStar ? 'iceCrystal' : 'fireSource';
            var materialName = isIceStar ? '水灵晶' : '火灵源';
            var materialData = playerData.materials && playerData.materials[materialId];
            var materialQuantity = materialData ? materialData.quantity : 0;
            
            // 显示等级
            ctx.fillStyle = '#87CEEB';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.fillText('Lv.' + starLevel + '/' + maxLevel, Math.floor(100 * scale), itemY + Math.floor(50 * scale));
            
            // 计算实际倍率
            var actualMultiplier = starType.baseMultiplier * (1 + starLevel * 0.05);
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText('实际倍率: ×' + actualMultiplier.toFixed(2), Math.floor(200 * scale), itemY + Math.floor(50 * scale));
            
            // 升级按钮（未满级时显示）
            if (starLevel < maxLevel) {
                var upgradeCost = 5 * (starLevel + 1);
                var canUpgrade = materialQuantity >= upgradeCost;
                var tabAreaWidth = Math.floor(60 * scale);
                var upgradeBtnW = Math.floor(50 * scale);
                var upgradeBtnH = Math.floor(25 * scale);
                var upgradeBtnX = screenWidth - tabAreaWidth - upgradeBtnW - Math.floor(50 * scale);
                var upgradeBtnY = itemY + Math.floor(12 * scale);
                
ctx.fillStyle = canUpgrade ? '#4CAF50' : '#666666';
fillRoundRect(ctx, upgradeBtnX, upgradeBtnY, upgradeBtnW, upgradeBtnH, 6);
                ctx.fillStyle = '#ffffff';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('升级', upgradeBtnX + upgradeBtnW / 2, upgradeBtnY + upgradeBtnH / 2);
                
                // 显示升级所需材料
                ctx.textAlign = 'left';
                ctx.fillStyle = canUpgrade ? '#aaaaaa' : '#ff6b6b';
                ctx.font = Math.floor(10 * scale) + 'px sans-serif';
                ctx.fillText('需' + materialName + '×' + upgradeCost + ' (拥有' + materialQuantity + ')', Math.floor(100 * scale), itemY + Math.floor(70 * scale));
            } else {
                // 已满级
                ctx.fillStyle = '#ffd700';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.fillText('已满级!', Math.floor(100 * scale), itemY + Math.floor(70 * scale));
            }
        } else {
            // 普通星星显示属性
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            var bonusText = '分数倍率: ×' + starType.baseMultiplier;
            ctx.fillText(bonusText, Math.floor(100 * scale), itemY + Math.floor(50 * scale));

            // 星星描述
            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText(starType.description || '', Math.floor(100 * scale), itemY + Math.floor(70 * scale));
        }
    }

    ctx.restore(); // 恢复裁剪区域
}

    function renderItemsTab() {
    var ctx = getCtx();
    var screenWidth = getScreenWidth();
    var screenHeight = getScreenHeight();
    var scale = getScreenScale();
    var Assets = getAssets();
    var playerData = getPlayerData();
    var uiState = getUiScrollState();
    var fillRoundRect = getFillRoundRect();
    var gachaRoundRect = getGachaRoundRect();
    var strokeRoundRect = getStrokeRoundRect();
    var scale = getScreenScale();
    var startY = Math.floor(100 * scale);
    var itemHeight = Math.floor(80 * scale);
    var padding = Math.floor(10 * scale);
    
    // 计算内容区域宽度（排除右侧标签区域）
    var tabAreaWidth = Math.floor(60 * scale);
    var contentWidth = screenWidth - tabAreaWidth;

    // 道具标题
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('我的道具', Math.floor(20 * scale), startY - Math.floor(10 * scale));

    // 道具配置
    var itemsConfig = [
        { id: 'starChest', name: '星辉宝箱', emoji: '🎁', description: '开启随机获得唤灵券' },
        { id: 'healPotion', name: '愈灵露', emoji: '🧪', description: '恢复50点灵能' },
        { id: 'timePotion', name: '时序露', emoji: '⏳', description: '增加10秒战斗时间' },
        { id: 'expPotionSmall', name: '灵悟卷(小)', emoji: '📜', description: '+50感悟' },
        { id: 'expPotionMedium', name: '灵悟卷(中)', emoji: '📔', description: '+100感悟' },
        { id: 'expPotionLarge', name: '灵悟卷(大)', emoji: '📖', description: '+150感悟' }
    ];

    // 检查是否有道具
    var hasItems = false;
    if (playerData.items) {
        for (let i = 0; i < itemsConfig.length; i++) {
            if (playerData.items[itemsConfig[i].id] && playerData.items[itemsConfig[i].id].quantity > 0) {
                hasItems = true;
                break;
            }
        }
    }

    if (!hasItems) {
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('背包为空', contentWidth/2, screenHeight/2);
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('可在商城购买道具', contentWidth/2, screenHeight/2 + Math.floor(30 * scale));
    } else {
        // 内容区域裁剪（标题下方到屏幕底部）
        var contentTop = startY + Math.floor(20 * scale);
        var contentBottom = screenHeight - Math.floor(10 * scale);
        var visibleHeight = contentBottom - contentTop;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentTop, screenWidth, visibleHeight);
        ctx.clip();
        
        var displayIndex = 0;
        for (let i = 0; i < itemsConfig.length; i++) {
            var itemConfig = itemsConfig[i];
            var itemData = playerData.items ? playerData.items[itemConfig.id] : null;
            
            // 只显示数量大于0的道具
            if (!itemData || itemData.quantity <= 0) continue;
            
            var itemY = contentTop + displayIndex * (itemHeight + padding) - uiScrollState.backpackScrollY;
            displayIndex++;
            
            // 道具背景（圆角）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), itemHeight, Math.floor(8 * scale));

            // 道具图标
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(36 * scale) + 'px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(itemConfig.emoji, Math.floor(60 * scale), itemY + itemHeight / 2);
            ctx.restore();

            // 道具名称
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(itemConfig.name, Math.floor(100 * scale), itemY + Math.floor(25 * scale));

            // 道具描述
            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.fillText(itemConfig.description, Math.floor(100 * scale), itemY + Math.floor(50 * scale));

            // 数量（考虑右侧标签区域）
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('x' + itemData.quantity, contentWidth - Math.floor(20 * scale), itemY + Math.floor(25 * scale));
        }
        
        ctx.restore();
    }
}

    function renderEquipmentsTab() {
    var ctx = getCtx();
    var screenWidth = getScreenWidth();
    var screenHeight = getScreenHeight();
    var scale = getScreenScale();
    var Assets = getAssets();
    var playerData = getPlayerData();
    var uiState = getUiScrollState();
    var fillRoundRect = getFillRoundRect();
    var gachaRoundRect = getGachaRoundRect();
    var strokeRoundRect = getStrokeRoundRect();
    var scale = getScreenScale();
    var startY = Math.floor(100 * scale);
    var itemHeight = Math.floor(85 * scale);
    var padding = Math.floor(10 * scale);
    
    // 计算内容区域宽度（排除右侧标签区域）
    var tabAreaWidth = Math.floor(60 * scale);
    var contentWidth = screenWidth - tabAreaWidth;

    // 标题
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('我的装备', Math.floor(20 * scale), startY - Math.floor(10 * scale));

    // 检查是否拥有装备
    var ownedEquipments = playerData.equipments ? playerData.equipments.owned : [];
    
    if (!ownedEquipments || ownedEquipments.length === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无装备', contentWidth/2, screenHeight/2);
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('可在商城唤灵获取装备', contentWidth/2, screenHeight/2 + Math.floor(30 * scale));
    } else {
        // 计算实际可显示的装备数量（排除无效装备）
        var validEquipCount = 0;
        for (let vi = 0; vi < ownedEquipments.length; vi++) {
            var vEquipData = ownedEquipments[vi];
            var vEquipKey = typeof vEquipData === 'string' ? vEquipData : (vEquipData.id || vEquipData);
            if (Equipments[vEquipKey]) {
                validEquipCount++;
            }
        }
        
        // 内容区域裁剪（标题下方到屏幕底部）
        var contentTop = startY + Math.floor(20 * scale);
        var contentBottom = screenHeight - Math.floor(10 * scale);
        var visibleHeight = contentBottom - contentTop;

        // 计算滚动限制（基于有效装备数量和实际裁剪区域）
        var totalHeight = validEquipCount * (itemHeight + padding);
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        if (uiScrollState.backpackScrollY > maxScroll) uiScrollState.backpackScrollY = maxScroll;
        if (uiScrollState.backpackScrollY < 0) uiScrollState.backpackScrollY = 0;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentTop, screenWidth, visibleHeight);
        ctx.clip();
        
        // 装备类型对应的emoji
        var typeEmojis = { weapon: '⚔️', armor: '🛡️', accessory: '💍' };
        
            var displayIndex = 0;  // 实际显示的装备索引
        for (let i = 0; i < ownedEquipments.length; i++) {
            var equipData = ownedEquipments[i];
            // 支持字符串ID和对象格式
            var equipKey = typeof equipData === 'string' ? equipData : (equipData.id || equipData);
            var equip = Equipments[equipKey];
            if (!equip) {
                continue;
            }
            
            // 为每个装备实例分配唯一标识（uid优先，否则用数组索引）
            var instanceId = equipData.uid || ('idx_' + i);
            
            var itemY = contentTop + displayIndex * (itemHeight + padding) - uiScrollState.backpackScrollY;
            displayIndex++;
            
            // 装备背景（圆角）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), itemHeight, Math.floor(8 * scale));

            // 装备图标
            var equipEmoji = equip.emoji || typeEmojis[equip.type] || '⚔️';
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(32 * scale) + 'px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(equipEmoji, Math.floor(55 * scale), itemY + itemHeight / 2);
            ctx.restore();

            // 装备名称（带稀有度颜色）
            var equipNameText = '[' + equip.rarity + '] ' + equip.name;
            var equipNameX = Math.floor(90 * scale);
            var equipNameY = itemY + Math.floor(25 * scale);
            var equipFontSize = Math.floor(16 * scale);
            ctx.font = 'bold ' + equipFontSize + 'px sans-serif';
            if (equip.rarity === 'SP') {
                uiCore.drawSPText(equipNameText, equipNameX + ctx.measureText(equipNameText).width / 2, equipNameY, 16, scale);
            } else if (equip.rarity === 'LR') {
                uiCore.drawLRText(equipNameText, equipNameX + ctx.measureText(equipNameText).width / 2, equipNameY, 16, scale);
            } else if (equip.rarity === 'UR') {
                uiCore.drawURText(equipNameText, equipNameX + ctx.measureText(equipNameText).width / 2, equipNameY, 16, scale);
            } else {
                var rarityColors = RARITY_COLORS;
                ctx.fillStyle = rarityColors[equip.rarity] || '#FFFFFF';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(equipNameText, equipNameX, equipNameY);
            }

            // 装备属性（从stats对象读取）
            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            var attrText = '';
            var stats = equip.stats || {};
            if (stats.attack) attrText += '灵光冲击+' + stats.attack + ' ';
            if (stats.defense) attrText += '灵场护盾+' + stats.defense + ' ';
            if (stats.hp) attrText += '灵能+' + stats.hp + ' ';
            if (stats.critRate) attrText += '会心+' + stats.critRate + '% ';
            if (stats.critDamage) attrText += '会威+' + Math.floor(stats.critDamage * 100) + '% ';
            if (stats.score) attrText += '灵辉值+' + Math.floor(stats.score * 100) + '% ';
            ctx.fillText(attrText, Math.floor(90 * scale), itemY + Math.floor(50 * scale));

            // 装备描述
            ctx.fillStyle = '#666666';
            ctx.font = Math.floor(11 * scale) + 'px sans-serif';
            ctx.fillText(equip.description || '', Math.floor(90 * scale), itemY + Math.floor(70 * scale));

            // 装备按钮（考虑右侧标签区域）
            var isEquipped = playerData.equipments && playerData.equipments.equipped && 
                            playerData.equipments.equipped[equip.type] === instanceId;
            if (isEquipped) {
                uiCore.drawButton('已装备', contentWidth - Math.floor(50 * scale), itemY + Math.floor(42 * scale), Math.floor(60 * scale), Math.floor(28 * scale), '#4CAF50');
            } else {
                uiCore.drawButton('装备', contentWidth - Math.floor(50 * scale), itemY + Math.floor(42 * scale), Math.floor(60 * scale), Math.floor(28 * scale), '#4a4a6a');
            }
        }
        
        ctx.restore(); // 恢复裁剪区域
    }
}

    function renderSkillsTab() {
    var ctx = getCtx();
    var screenWidth = getScreenWidth();
    var screenHeight = getScreenHeight();
    var scale = getScreenScale();
    var Assets = getAssets();
    var playerData = getPlayerData();
    var uiState = getUiScrollState();
    var fillRoundRect = getFillRoundRect();
    var gachaRoundRect = getGachaRoundRect();
    var strokeRoundRect = getStrokeRoundRect();
    var scale = getScreenScale();
    var startY = Math.floor(100 * scale);
    var itemHeight = Math.floor(85 * scale);
    var padding = Math.floor(10 * scale);
    
    // 计算内容区域宽度（排除右侧标签区域）
    var tabAreaWidth = Math.floor(60 * scale);
    var contentWidth = screenWidth - tabAreaWidth;

    // 标题
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('我的技能', Math.floor(20 * scale), startY - Math.floor(10 * scale));
    
    // 检查是否拥有技能
    var ownedSkills = playerData.skills ? playerData.skills.owned : [];
    
    if (!ownedSkills || ownedSkills.length === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无技能', contentWidth/2, screenHeight/2);
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('可在商城唤灵获取技能', contentWidth/2, screenHeight/2 + Math.floor(30 * scale));
    } else {
        // 内容区域起始位置（标题下方）
        var contentTop = startY + Math.floor(20 * scale);
        var contentBottom = screenHeight - Math.floor(10 * scale);
        var visibleHeight = contentBottom - contentTop;
        
        // 计算滚动限制
        var totalHeight = ownedSkills.length * (itemHeight + padding);
        var maxScroll = Math.max(0, totalHeight - visibleHeight + padding);
        if (uiScrollState.backpackScrollY > maxScroll) uiScrollState.backpackScrollY = maxScroll;
        if (uiScrollState.backpackScrollY < 0) uiScrollState.backpackScrollY = 0;
        
        // 内容区域裁剪
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentTop, screenWidth, visibleHeight);
        ctx.clip();
        
        // 技能类型对应的emoji
        var typeEmojis = { attack: '⚔️', support: '💚', passive: '📖' };
        var rarityEmojis = { N: '✨', R: '💫', SR: '⭐', SSR: '🌟', UR: '🔥' };
        
        for (let i = 0; i < ownedSkills.length; i++) {
            var skillData = ownedSkills[i];
            var skill = Skills[skillData.id] || Skills[skillData];
            if (!skill) continue;
            
            var itemY = contentTop + i * (itemHeight + padding) - uiScrollState.backpackScrollY;
            
            // 技能背景（圆角）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), itemHeight, Math.floor(8 * scale));

            // 技能图标
            var skillEmoji = skill.emoji || typeEmojis[skill.type] || rarityEmojis[skill.rarity] || '✨';
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(32 * scale) + 'px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(skillEmoji, Math.floor(55 * scale), itemY + itemHeight / 2);
            ctx.restore();

            // 技能名称（带稀有度颜色）
            var skillNameText = '[' + skill.rarity + '] ' + skill.name + ' Lv.' + (skillData.level || 1);
            var skillNameX = Math.floor(90 * scale);
            var skillNameY = itemY + Math.floor(25 * scale);
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            if (skill.rarity === 'SP') {
                uiCore.drawSPText(skillNameText, skillNameX + ctx.measureText(skillNameText).width / 2, skillNameY, 16, scale);
            } else if (skill.rarity === 'LR') {
                uiCore.drawLRText(skillNameText, skillNameX + ctx.measureText(skillNameText).width / 2, skillNameY, 16, scale);
            } else if (skill.rarity === 'UR') {
                uiCore.drawURText(skillNameText, skillNameX + ctx.measureText(skillNameText).width / 2, skillNameY, 16, scale);
            } else {
                var rarityColors = RARITY_COLORS;
                ctx.fillStyle = rarityColors[skill.rarity] || '#FFFFFF';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(skillNameText, skillNameX, skillNameY);
            }

            // 技能属性
            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            var attrText = skill.type === 'attack' ? '冲击:' + skill.damage + ' CD:' + skill.cooldown + 's' :
                          (skill.type === 'support' ? (skill.heal ? '治疗:' + skill.heal : (skill.timeAdd ? '时间+' + skill.timeAdd + 's' : (skill.shield ? '护盾:' + skill.shield : '增益效果'))) :
                          '被动效果');
            ctx.fillText(attrText, Math.floor(90 * scale), itemY + Math.floor(50 * scale));

            // 技能描述
            ctx.fillStyle = '#666666';
            ctx.font = Math.floor(11 * scale) + 'px sans-serif';
            ctx.fillText(skill.description || '', Math.floor(90 * scale), itemY + Math.floor(70 * scale));

            // 技能按钮（考虑右侧标签区域）
            var isEquipped = playerData.skills && playerData.skills.equipped && 
                            playerData.skills.equipped.indexOf(skillData.id || skillData) !== -1;
            if (isEquipped) {
                uiCore.drawButton('已装备', contentWidth - Math.floor(50 * scale), itemY + Math.floor(42 * scale), Math.floor(60 * scale), Math.floor(28 * scale), '#4CAF50');
            } else {
                uiCore.drawButton('装备', contentWidth - Math.floor(50 * scale), itemY + Math.floor(42 * scale), Math.floor(60 * scale), Math.floor(28 * scale), '#4a4a6a');
            }
        }
        
        ctx.restore(); // 恢复裁剪区域
    }
}

    function renderPetsTab() {
    var ctx = getCtx();
    var screenWidth = getScreenWidth();
    var screenHeight = getScreenHeight();
    var scale = getScreenScale();
    var Assets = getAssets();
    var playerData = getPlayerData();
    var uiState = getUiScrollState();
    var fillRoundRect = getFillRoundRect();
    var gachaRoundRect = getGachaRoundRect();
    var strokeRoundRect = getStrokeRoundRect();
    var scale = getScreenScale();
    var startY = Math.floor(100 * scale);
    var itemHeight = Math.floor(85 * scale);
    var padding = Math.floor(10 * scale);
    
    // 计算内容区域宽度（排除右侧标签区域）
    var tabAreaWidth = Math.floor(60 * scale);
    var contentWidth = screenWidth - tabAreaWidth;

    // 标题
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('我的宠物', Math.floor(20 * scale), startY - Math.floor(10 * scale));

    // 检查是否拥有宠物
    var ownedPets = playerData.pets ? playerData.pets.owned : [];
    
    if (!ownedPets || ownedPets.length === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无宠物', contentWidth/2, screenHeight/2);
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('可在商城唤灵获取宠物', contentWidth/2, screenHeight/2 + Math.floor(30 * scale));
    } else {
        // 内容区域裁剪（标题下方到屏幕底部）
        var contentTop = startY + Math.floor(20 * scale);
        var contentBottom = screenHeight - Math.floor(10 * scale);
        var visibleHeight = contentBottom - contentTop;

        // 计算滚动限制（基于实际裁剪区域）
        var visibleCount = 0;
        for (var vc = 0; vc < ownedPets.length; vc++) {
            var vk = typeof ownedPets[vc] === 'string' ? ownedPets[vc] : (ownedPets[vc].id || ownedPets[vc]);
            if (Pets[vk]) visibleCount++;
        }
        var totalHeight = visibleCount * (itemHeight + padding);
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        if (uiScrollState.backpackScrollY > maxScroll) uiScrollState.backpackScrollY = maxScroll;
        if (uiScrollState.backpackScrollY < 0) uiScrollState.backpackScrollY = 0;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentTop, screenWidth, visibleHeight);
        ctx.clip();

        // 宠物稀有度对应的默认emoji
        var rarityEmojis = { N: '🐾', R: '🐱', SR: '🦊', SSR: '🐉', UR: '🌟' };

        var displayIndex = 0;
        for (let i = 0; i < ownedPets.length; i++) {
            var petData = ownedPets[i];
            // 支持字符串ID（'fire_fairy'）和对象格式（{id: 'fire_fairy', level: 1}）
            var petKey = typeof petData === 'string' ? petData : (petData.id || petData);
            var pet = Pets[petKey];
            if (!pet) {
                continue;
            }

            // 为每个宠物实例分配唯一标识（uid优先，否则用数组索引）
            var instanceId = (typeof petData === 'object' && petData.uid) ? petData.uid : ('idx_' + i);

            var itemY = contentTop + displayIndex * (itemHeight + padding) - uiScrollState.backpackScrollY;
            displayIndex++;
            
            // 宠物背景（圆角）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            fillRoundRect(ctx, Math.floor(20 * scale), itemY, screenWidth - Math.floor(40 * scale), itemHeight, Math.floor(8 * scale));

            // 宠物图标
            var petEmoji = pet.emoji || rarityEmojis[pet.rarity] || '🐾';
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(32 * scale) + 'px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(petEmoji, Math.floor(55 * scale), itemY + itemHeight / 2);
            ctx.restore();

            // 宠物名称（带稀有度颜色）
            var petLevel = (typeof petData === 'object' ? petData.level : null) || 1;
            var petNameText = '[' + pet.rarity + '] ' + pet.name + ' Lv.' + petLevel;
            var petNameX = Math.floor(90 * scale);
            var petNameY = itemY + Math.floor(25 * scale);
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            if (pet.rarity === 'SP') {
                uiCore.drawSPText(petNameText, petNameX + ctx.measureText(petNameText).width / 2, petNameY, 16, scale);
            } else if (pet.rarity === 'LR') {
                uiCore.drawLRText(petNameText, petNameX + ctx.measureText(petNameText).width / 2, petNameY, 16, scale);
            } else if (pet.rarity === 'UR') {
                uiCore.drawURText(petNameText, petNameX + ctx.measureText(petNameText).width / 2, petNameY, 16, scale);
            } else {
                var rarityColors = RARITY_COLORS;
                ctx.fillStyle = rarityColors[pet.rarity] || '#FFFFFF';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(petNameText, petNameX, petNameY);
            }

            // 宠物属性
            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            var attrText = '冲击:' + pet.attack + ' 节奏:' + pet.attackSpeed + 's';
            if (pet.critRate) attrText += ' 会心:' + pet.critRate + '%';
            ctx.fillText(attrText, Math.floor(90 * scale), itemY + Math.floor(50 * scale));

            // 宠物描述
            ctx.fillStyle = '#666666';
            ctx.font = Math.floor(11 * scale) + 'px sans-serif';
            ctx.fillText(pet.description || '', Math.floor(90 * scale), itemY + Math.floor(70 * scale));

            // 出战按钮（使用uid来判断出战状态）
            var isActive = playerData.pets && playerData.pets.equipped === instanceId;
            if (isActive) {
                uiCore.drawButton('出战中', contentWidth - Math.floor(50 * scale), itemY + Math.floor(42 * scale), Math.floor(60 * scale), Math.floor(28 * scale), '#4CAF50');
            } else {
                uiCore.drawButton('出战', contentWidth - Math.floor(50 * scale), itemY + Math.floor(42 * scale), Math.floor(60 * scale), Math.floor(28 * scale), '#4a4a6a');
            }
        }
        
        ctx.restore(); // 恢复裁剪区域
    }
}

    function renderFaithTab() {
    var ctx = getCtx();
    var screenWidth = getScreenWidth();
    var screenHeight = getScreenHeight();
    var scale = getScreenScale();
    var Assets = getAssets();
    var playerData = getPlayerData();
    var uiState = getUiScrollState();
    var fillRoundRect = getFillRoundRect();
    var gachaRoundRect = getGachaRoundRect();
    var strokeRoundRect = getStrokeRoundRect();
    var scale = getScreenScale();
    var startY = Math.floor(100 * scale);
    var itemHeight = Math.floor(100 * scale);
    var padding = Math.floor(10 * scale);
    
    // 计算内容区域宽度（排除右侧标签区域）
    var tabAreaWidth = Math.floor(60 * scale);
    var contentWidth = screenWidth - tabAreaWidth;
    
    // 标题
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold ' + Math.floor(20 * scale) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🙏 信仰系统', Math.floor(20 * scale), startY - Math.floor(10 * scale));
    
    // 显示信仰资源
    var resources = playerData.faithData ? playerData.faithData.resources : null;
    if (!resources) {
        resources = { devoutMark: 0, divineEssence: 0, originCrystal: 0 };
    }
    
    ctx.fillStyle = '#aaaaaa';
    ctx.font = Math.floor(12 * scale) + 'px sans-serif';
    ctx.fillText(`虔诚印记: ${resources.devoutMark} | 神恩精华: ${resources.divineEssence} | 本源结晶: ${resources.originCrystal}`, Math.floor(20 * scale), startY + Math.floor(15 * scale));
    
    // 获取当前角色
    var currentCharId = playerData.currentCharacterId;
    
    // 检查是否拥有角色
    var ownedCharacters = playerData.ownedCharacters || [];
    
    if (!currentCharId || ownedCharacters.length === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(24 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('请先选择角色', contentWidth/2, screenHeight/2);
        ctx.font = Math.floor(16 * scale) + 'px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('在角色标签页中选择要培养的角色', contentWidth/2, screenHeight/2 + Math.floor(30 * scale));
        return;
    }
    
    // 获取当前角色信仰数据
    var faithData = getFaithSystem().getCharacterFaithData(currentCharId);
    var charConfig = Characters[currentCharId];
    
    // 角色名称和信仰等级
    var charName = charConfig ? charConfig.name : currentCharId;
    var rarityColors = RARITY_COLORS;
    var rarityColor = charConfig ? (rarityColors[charConfig.rarity] || '#FFFFFF') : '#FFFFFF';
    
    // 角色信息区域（圆角）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    fillRoundRect(ctx, Math.floor(20 * scale), startY + Math.floor(35 * scale), contentWidth - Math.floor(40 * scale), Math.floor(80 * scale), Math.floor(8 * scale));
    
    // 角色名称
    ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
    var charRarity = charConfig ? charConfig.rarity : 'N';
    var charNameX = Math.floor(35 * scale);
    var charNameY = startY + Math.floor(60 * scale);
    if (charRarity === 'SP') {
        uiCore.drawSPText(charName, charNameX + ctx.measureText(charName).width / 2, charNameY, 18, scale);
    } else if (charRarity === 'LR') {
        uiCore.drawLRText(charName, charNameX + ctx.measureText(charName).width / 2, charNameY, 18, scale);
    } else if (charRarity === 'UR') {
        uiCore.drawURText(charName, charNameX + ctx.measureText(charName).width / 2, charNameY, 18, scale);
    } else {
        ctx.fillStyle = rarityColor;
        ctx.textAlign = 'left';
        ctx.fillText(charName, charNameX, charNameY);
    }
    
    // 信仰等级
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
    ctx.fillText(`信仰等级: ${faithData.level}`, Math.floor(35 * scale), startY + Math.floor(85 * scale));
    
    // 经验条
    var expRequired = getFaithSystem().FAITH_CONFIG.getExpRequired(faithData.level);
    var expPercent = faithData.exp / expRequired;
    var expBarWidth = Math.floor(150 * scale);
    var expBarHeight = Math.floor(10 * scale);
    var expBarX = Math.floor(35 * scale);
    var expBarY = startY + Math.floor(95 * scale);
    
    // 经验条背景（圆角）
    ctx.fillStyle = '#333333';
    fillRoundRect(ctx, expBarX, expBarY, expBarWidth, expBarHeight, Math.floor(3 * scale));
    
    // 经验条进度（圆角）
    ctx.fillStyle = '#4CAF50';
    fillRoundRect(ctx, expBarX, expBarY, expBarWidth * expPercent, expBarHeight, Math.floor(3 * scale));
    
    // 经验文字
    ctx.fillStyle = '#ffffff';
    ctx.font = Math.floor(10 * scale) + 'px sans-serif';
    ctx.fillText(`${faithData.exp}/${expRequired}`, expBarX + expBarWidth + Math.floor(5 * scale), expBarY + expBarHeight);
    
    // 阶段指示
    var stageText = '基础阶段';
    var stageColor = '#87CEEB';
    if (faithData.level >= getFaithSystem().FAITH_CONFIG.BREAKTHROUGH_LEVEL) {
        stageText = '破格阶段';
        stageColor = '#FF00FF';
    } else if (faithData.level >= getFaithSystem().FAITH_CONFIG.SPECIALIZATION_LEVEL) {
        stageText = '专精阶段';
        stageColor = '#FFD700';
    }
    
    ctx.fillStyle = stageColor;
    ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
    ctx.fillText(`【${stageText}】`, Math.floor(200 * scale), startY + Math.floor(60 * scale));
    
    // 信仰加成显示
    var bonusY = startY + Math.floor(130 * scale);
    
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
    ctx.fillText('信仰加成:', Math.floor(20 * scale), bonusY);
    
    // 属性加成列表
    var bonusAttrs = [
        { name: '攻击', key: 'attack', value: getFaithSystem().getFaithAttributeBonus(currentCharId, 'attack') },
        { name: '灵能', key: 'hp', value: getFaithSystem().getFaithAttributeBonus(currentCharId, 'hp') },
        { name: '会心感应', key: 'critRate', value: getFaithSystem().getFaithAttributeBonus(currentCharId, 'critRate'), suffix: '%' },
        { name: '会心威力', key: 'critDamage', value: getFaithSystem().getFaithAttributeBonus(currentCharId, 'critDamage'), suffix: '%' },
        { name: '防御', key: 'defense', value: getFaithSystem().getFaithAttributeBonus(currentCharId, 'defense') }
    ];
    
    ctx.font = Math.floor(12 * scale) + 'px sans-serif';
    var attrX = Math.floor(20 * scale);
    var attrY = bonusY + Math.floor(25 * scale);
    
    for (let i = 0; i < bonusAttrs.length; i++) {
        var attr = bonusAttrs[i];
        var suffix = attr.suffix || '';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(attr.name + ':', attrX, attrY + i * Math.floor(20 * scale));
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('+' + attr.value + suffix, attrX + Math.floor(50 * scale), attrY + i * Math.floor(20 * scale));
    }
    
    // 操作按钮区域
    var btnY = bonusY + Math.floor(130 * scale);
    
    // 投入资源按钮
    uiCore.drawButton('投入虔诚印记', Math.floor(80 * scale), btnY, Math.floor(120 * scale), Math.floor(35 * scale), '#4CAF50');
    
    uiCore.drawButton('投入神恩精华', Math.floor(220 * scale), btnY, Math.floor(120 * scale), Math.floor(35 * scale), '#FFD700');
    
    // 专精区域（50级解锁）
    if (faithData.level >= getFaithSystem().FAITH_CONFIG.SPECIALIZATION_LEVEL) {
        var specY = btnY + Math.floor(50 * scale);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillText('专精路线:', Math.floor(20 * scale), specY);
        
        var specs = ['offense', 'survival', 'support', 'balance'];
        var specNames = ['毁灭', '永恒', '守护', '均衡'];
        var specColors = ['#FF6B6B', '#4CAF50', '#2196F3', '#9C27B0'];
        
        for (let s = 0; s < specs.length; s++) {
            var specBtnX = Math.floor(100 * scale) + s * Math.floor(70 * scale);
            var isActive = faithData.specialization === specs[s];
            var isUnlocked = faithData.specializationUnlocked;
            
ctx.fillStyle = isActive ? specColors[s] : (isUnlocked ? '#4a4a6a' : '#333333');
fillRoundRect(ctx, specBtnX, specY + Math.floor(10 * scale), Math.floor(60 * scale), Math.floor(30 * scale), 6);
            
            ctx.fillStyle = isActive ? '#FFFFFF' : '#888888';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(specNames[s], specBtnX + Math.floor(30 * scale), specY + Math.floor(30 * scale));
        }
        ctx.textAlign = 'left';
    }
    
    // 破格技能区域（100级解锁）
    if (faithData.level >= getFaithSystem().FAITH_CONFIG.BREAKTHROUGH_LEVEL) {
        var skillY = btnY + Math.floor(120 * scale);
        
        ctx.fillStyle = '#FF00FF';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillText('破格技能:', Math.floor(20 * scale), skillY);
        
        var skills = Object.keys(getFaithSystem().FAITH_CONFIG.breakthroughSkills);
        var ownedSkills = faithData.breakthroughSkills || [];
        
        for (let sk = 0; sk < Math.min(skills.length, 4); sk++) {
            var skillId = skills[sk];
            var skill = getFaithSystem().FAITH_CONFIG.breakthroughSkills[skillId];
            var skillBtnX = Math.floor(20 * scale) + sk * Math.floor(75 * scale);
            var hasSkill = ownedSkills.includes(skillId);
            
ctx.fillStyle = hasSkill ? '#9C27B0' : '#333333';
fillRoundRect(ctx, skillBtnX, skillY + Math.floor(10 * scale), Math.floor(70 * scale), Math.floor(40 * scale), 6);
            
            ctx.fillStyle = hasSkill ? '#FFFFFF' : '#666666';
            ctx.font = Math.floor(10 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            
            // 分行显示技能名称
            var nameParts = skill.name.split('');
            ctx.fillText(nameParts.slice(0, 2).join(''), skillBtnX + Math.floor(35 * scale), skillY + Math.floor(25 * scale));
            ctx.fillText(nameParts.slice(2).join(''), skillBtnX + Math.floor(35 * scale), skillY + Math.floor(40 * scale));
        }
        ctx.textAlign = 'left';
    }
    
    // 传承提示（500级解锁）
    if (faithData.level >= getFaithSystem().FAITH_CONFIG.INHERIT_LEVEL && !faithData.inherited) {
        var inheritY = btnY + Math.floor(200 * scale);
        
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        fillRoundRect(ctx, Math.floor(20 * scale), inheritY, contentWidth - Math.floor(40 * scale), Math.floor(50 * scale), Math.floor(8 * scale));
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
        ctx.fillText('✨ 可进行传承！传承后为全队提供永久加成', Math.floor(30 * scale), inheritY + Math.floor(20 * scale));
        
        uiCore.drawButton('传承', contentWidth - Math.floor(60 * scale), inheritY + Math.floor(25 * scale), Math.floor(50 * scale), Math.floor(25 * scale), '#FF6B6B');
    } else if (faithData.inherited) {
        var inheritY = btnY + Math.floor(200 * scale);
        
        ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
        fillRoundRect(ctx, Math.floor(20 * scale), inheritY, contentWidth - Math.floor(40 * scale), Math.floor(50 * scale), Math.floor(8 * scale));
        
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
        ctx.fillText(`✨ 已传承（等级 ${faithData.inheritedLevel}），为全队提供永久加成`, Math.floor(30 * scale), inheritY + Math.floor(30 * scale));
    }
}

    // ==================== 背包装备/卸载交互逻辑 ====================

    function handleEquipClick(endX, endY) {
        var pd = getPlayerData();
        var scroll = getUiScrollState();
        var scale = getScreenScale();
        var startY = Math.floor(100 * scale);
        var contentTop = startY + Math.floor(20 * scale);
        var itemHeight = Math.floor(85 * scale);
        var padding = Math.floor(10 * scale);

        var ownedEquipments = pd.equipments ? pd.equipments.owned : [];
        var clickDisplayIndex = 0;

        for (var i = 0; i < ownedEquipments.length; i++) {
            var equipData = ownedEquipments[i];
            var equipKey = typeof equipData === 'string' ? equipData : (equipData.id || equipData);
            var equip = Equipments[equipKey];
            if (!equip) continue;

            var instanceId = equipData.uid || ('idx_' + i);
            var itemY = contentTop + clickDisplayIndex * (itemHeight + padding) - scroll.backpackScrollY;
            clickDisplayIndex++;

            if (endY >= itemY && endY <= itemY + itemHeight) {
                if (!pd.equipments) pd.equipments = { owned: [], equipped: {} };
                if (!pd.equipments.equipped) pd.equipments.equipped = {};

                var slotType = equip.type;
                var isEquipped = pd.equipments.equipped[slotType] === instanceId;

                if (isEquipped) {
                    pd.equipments.equipped[slotType] = null;
                    deps.showToast({ title: '已卸下：' + equip.name, icon: 'none', duration: 1500 });
                } else {
                    pd.equipments.equipped[slotType] = instanceId;
                    deps.showToast({ title: '已装备：' + equip.name, icon: 'none', duration: 1500 });
                }
                deps.savePlayerData();
                return true;
            }
        }
        return false;
    }

    function handleSkillClick(endX, endY) {
        var pd = getPlayerData();
        var scroll = getUiScrollState();
        var scale = getScreenScale();
        var startY = Math.floor(100 * scale);
        var contentTop = startY + Math.floor(20 * scale);
        var itemHeight = Math.floor(85 * scale);
        var padding = Math.floor(10 * scale);
        var maxSkills = deps.getMaxActiveSkills ? deps.getMaxActiveSkills() : 3;

        var ownedSkills = pd.skills ? pd.skills.owned : [];

        for (var i = 0; i < ownedSkills.length; i++) {
            var skillData = ownedSkills[i];
            var skillId = typeof skillData === 'string' ? skillData : (skillData.id || skillData);
            var skill = Skills[skillId];
            if (!skill) continue;

            var itemY = contentTop + i * (itemHeight + padding) - scroll.backpackScrollY;

            if (endY >= itemY && endY <= itemY + itemHeight) {
                if (!pd.skills) pd.skills = { owned: [], equipped: [], gachaTickets: 0 };
                if (!pd.skills.equipped) pd.skills.equipped = [];

                var equippedIndex = pd.skills.equipped.indexOf(skillId);

                if (equippedIndex !== -1) {
                    pd.skills.equipped.splice(equippedIndex, 1);
                    deps.showToast({ title: '已卸下：' + skill.name, icon: 'none', duration: 1500 });
                } else if (pd.skills.equipped.length >= maxSkills) {
                    deps.showToast({ title: '最多装备' + maxSkills + '个技能', icon: 'none', duration: 1500 });
                } else {
                    pd.skills.equipped.push(skillId);
                    deps.showToast({ title: '已装备：' + skill.name, icon: 'none', duration: 1500 });
                }
                deps.savePlayerData();
                return true;
            }
        }
        return false;
    }

    function handlePetClick(endX, endY) {
        var pd = getPlayerData();
        var scroll = getUiScrollState();
        var scale = getScreenScale();
        var startY = Math.floor(100 * scale);
        var contentTop = startY + Math.floor(20 * scale);
        var itemHeight = Math.floor(85 * scale);
        var padding = Math.floor(10 * scale);

        var ownedPets = pd.pets ? pd.pets.owned : [];

        for (var i = 0; i < ownedPets.length; i++) {
            var petData = ownedPets[i];
            var petKey = typeof petData === 'string' ? petData : (petData.id || petData);
            var pet = Pets[petKey];
            if (!pet) continue;

            var instanceId = (typeof petData === 'object' && petData.uid) ? petData.uid : ('idx_' + i);
            var itemY = contentTop + i * (itemHeight + padding) - scroll.backpackScrollY;

            if (endY >= itemY && endY <= itemY + itemHeight) {
                if (!pd.pets) pd.pets = { owned: [], equipped: null };

                var isActive = pd.pets.equipped === instanceId;

                if (isActive) {
                    pd.pets.equipped = null;
                    deps.showToast({ title: '已卸下：' + pet.name, icon: 'none', duration: 1500 });
                } else {
                    pd.pets.equipped = instanceId;
                    deps.showToast({ title: '已出战：' + pet.name, icon: 'none', duration: 1500 });
                }
                deps.savePlayerData();
                return true;
            }
        }
        return false;
    }

    return {
        renderBackpack: renderBackpack,
        renderMaterialsTab: renderMaterialsTab,
        renderCharactersTab: renderCharactersTab,
        renderStarsTab: renderStarsTab,
        renderItemsTab: renderItemsTab,
        renderEquipmentsTab: renderEquipmentsTab,
        renderSkillsTab: renderSkillsTab,
        renderPetsTab: renderPetsTab,
        renderFaithTab: renderFaithTab,
        handleEquipClick: handleEquipClick,
        handleSkillClick: handleSkillClick,
        handlePetClick: handlePetClick
    };
}

export { createBackpackRenderer };
