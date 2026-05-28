/**
 * SquadRenderer — 编队系统渲染模块
 * 从 game.js 提取的7个编队渲染函数:
 *   renderSquad, renderPortraitLarge, renderSquadCharacter,
 *   renderSquadEquipment, renderSquadSkills, renderSquadPets, renderSquadStars
 */
import { RARITY_COLORS } from '../config/GameConfig.js';
function createSquadRenderer(deps) {
    var getCtx = deps.getCtx;
    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var uiCore = deps.uiCore;
    var getAssets = deps.getAssets;
    var getFillRoundRect = deps.getFillRoundRect;
    var getStrokeRoundRect = deps.getStrokeRoundRect;
    var getGachaRoundRect = deps.getGachaRoundRect;
    var getSaveData = deps.getSaveData;
    var getUiScrollState = deps.getUiScrollState;
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
    var getCharacterFullStats = deps.getCharacterFullStats;
    var getSquadTab = deps.getSquadTab;
    var getShowPortraitLarge = deps.getShowPortraitLarge;
    var getDesignOffsetY = deps.getDesignOffsetY || function() { return 0; };
    var onTutorialComplete = deps.onTutorialComplete || function() {};
    var DESIGN_HEIGHT = 812;

    // 空格灵光引导状态
    var _tutorialHighlightStarId = null;

    // ==================== renderSquad ====================
    function renderSquad() {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var Assets = getAssets();
        var pd = getSaveData();
        var uiScrollState = getUiScrollState();
        var fillRoundRect = getFillRoundRect();
        var strokeRoundRect = getStrokeRoundRect();
        var drawBackButton = uiCore.drawBackButton;
        var squadTab = getSquadTab();

        // 背景
        ctx.fillStyle = 'rgba(15, 15, 26, 0.95)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // 获取当前角色信息
        var currentCharId = pd.currentCharacterId;
        var hasCharacter = !!currentCharId;
        var mappedCharId = hasCharacter ? getCharacterKey(currentCharId) : null;
        var character = hasCharacter ? Characters[mappedCharId] : null;

        // 角色标签页不显示上方区域，其他标签页显示
        var showTopArea = squadTab !== 'character';

        // ===== 上半部分：角色立绘（左）+ 基础属性（右）=====
        if (showTopArea) {
            var portraitX = Math.floor(20 * scale);
            var portraitY = designOffsetY + Math.floor(120 * scale); // 向下移动到120px
            var portraitW = Math.floor(120 * scale);
            var portraitH = Math.floor(160 * scale);

            // 角色立绘
            if (!hasCharacter) {
                // 未选择角色：灰色占位框
                ctx.fillStyle = 'rgba(60, 60, 80, 0.5)';
                fillRoundRect(ctx, portraitX, portraitY, portraitW, portraitH, 8);
                ctx.fillStyle = '#555555';
                ctx.font = Math.floor(40 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('👤', portraitX + portraitW / 2, portraitY + portraitH / 2 - Math.floor(15 * scale));
                ctx.fillStyle = '#666666';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.fillText('请选择角色', portraitX + portraitW / 2, portraitY + portraitH / 2 + Math.floor(25 * scale));
            } else if (character) {
                // 优先使用立绘大图，没有则使用小图
                var portraitImage = Assets.characterImages[mappedCharId + 'Portrait'] || Assets.characterImages[mappedCharId];

                if (portraitImage && portraitImage.complete && portraitImage.naturalWidth > 0) {
                    var imgRatio = portraitImage.width / portraitImage.height;
                    var drawH = portraitH - Math.floor(40 * scale);
                    var drawW = drawH * imgRatio;
                    if (drawW > portraitW - Math.floor(10 * scale)) {
                        drawW = portraitW - Math.floor(10 * scale);
                        drawH = drawW / imgRatio;
                    }
                    var drawX = portraitX + (portraitW - drawW) / 2;
                    var drawY = portraitY + Math.floor(5 * scale);
                    ctx.drawImage(portraitImage, drawX, drawY, drawW, drawH);
                } else {
                    ctx.font = Math.floor(60 * scale) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(character.emoji || '👤', portraitX + portraitW / 2, portraitY + portraitH / 2 - Math.floor(20 * scale));
                }

                var charExp = pd.characterExperience && pd.characterExperience[currentCharId];
                var level = charExp ? charExp.level : 1;

                ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                var sqNameX = portraitX + portraitW / 2;
                var sqNameY = portraitY + portraitH - Math.floor(25 * scale);
                if (character.rarity === 'SP') {
                    uiCore.drawSPText(character.name, sqNameX, sqNameY, 14, scale);
                } else if (character.rarity === 'LR') {
                    uiCore.drawLRText(character.name, sqNameX, sqNameY, 14, scale);
                } else if (character.rarity === 'UR') {
                    uiCore.drawURText(character.name, sqNameX, sqNameY, 14, scale);
                } else {
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText(character.name, sqNameX, sqNameY);
                }

                ctx.fillStyle = '#87CEEB';
                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                ctx.fillText('Lv.' + level, portraitX + portraitW / 2, portraitY + portraitH - Math.floor(8 * scale));
            }

            // 角色基础属性信息区域
            var infoX = portraitX + portraitW + Math.floor(15 * scale);
            var infoY = portraitY;

            if (character) {
                var charExp = pd.characterExperience && pd.characterExperience[currentCharId];
                var level = charExp ? charExp.level : 1;
                var fullStats = getCharacterFullStats(currentCharId);

                var lineY = infoY + Math.floor(20 * scale);
                var lineHeight = Math.floor(22 * scale);
                var leftPadding = Math.floor(12 * scale);

                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('基础属性', infoX + leftPadding, lineY);
                lineY += lineHeight + Math.floor(5 * scale);

                // 格式化数值：取整显示
                var formatNum = function(n) {
                    if (typeof n !== 'number') return n;
                    return Math.floor(n);
                };

                var attrs = [
                    { name: '灵光冲击', value: formatNum(fullStats.attack), color: '#ff6b6b' },
                    { name: '会心感应', value: formatNum(fullStats.critRate) + '%', color: '#ffd700' },
                    { name: '会心威力', value: formatNum(fullStats.critDamage * 100) + '%', color: '#ff9f43' },
                    { name: '灵能值', value: formatNum(pd.playerHp) + '/' + formatNum(pd.maxPlayerHp), color: '#4CAF50' },
                    { name: '灵场护盾', value: formatNum(fullStats.defense || 0), color: '#87CEEB' }
                ];

                ctx.font = Math.floor(12 * scale) + 'px sans-serif';
                for (let a = 0; a < attrs.length; a++) {
                    ctx.fillStyle = '#aaaaaa';
                    ctx.fillText(attrs[a].name + ':', infoX + leftPadding, lineY);
                    ctx.fillStyle = attrs[a].color;
                    ctx.fillText(attrs[a].value, infoX + leftPadding + Math.floor(60 * scale), lineY);
                    lineY += lineHeight;
                }
            }
        }

        // ===== 右侧：垂直标签页区域 =====
        var tabWidth = Math.floor(55 * scale);
        var tabHeight = Math.floor(45 * scale);
        var tabGap = Math.floor(8 * scale);
        var tabX = screenWidth - tabWidth;
        var startTabY = designOffsetY + Math.floor(100 * scale);

        var tabs = [
            { id: 'character', name: '古灵' },
            { id: 'equipment', name: '装备' },
            { id: 'skills', name: '技能' },
            { id: 'pets', name: '宠物' },
            { id: 'stars', name: '灵光' }
        ];

        // 绘制标签按钮（书签形状）
        for (let i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            var tabY = startTabY + i * (tabHeight + tabGap);
            var isActive = squadTab === tab.id;

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

            ctx.fillStyle = isActive ? '#1a1a2e' : '#ffffff';
            ctx.font = 'bold ' + Math.floor(15 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tab.name, tabX + tabWidth / 2, tabY + tabHeight / 2);
        }

        // ===== 内容区域 =====
        var contentX = Math.floor(15 * scale);
        // 角色标签页：内容区域从顶部开始；其他标签页：从上半区域下方开始
        var contentY = showTopArea ? designOffsetY + Math.floor(280 * scale) : designOffsetY + Math.floor(20 * scale);
        var contentW = screenWidth - tabWidth - contentX - Math.floor(15 * scale);
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
        var contentH = designBottom - Math.floor(60 * scale) - contentY;

        // 分割线（仅在其他标签页显示）
        if (showTopArea) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(contentX, contentY + Math.floor(20 * scale));
            ctx.lineTo(contentX + contentW, contentY + Math.floor(20 * scale));
            ctx.stroke();
        }

        // 根据标签页渲染不同内容
        if (squadTab === 'character') {
            renderSquadCharacter(scale, contentX, contentY, contentW, contentH);
        } else if (squadTab === 'equipment') {
            renderSquadEquipment(scale, contentX, contentY, contentW, contentH);
        } else if (squadTab === 'skills') {
            renderSquadSkills(scale, contentX, contentY, contentW, contentH);
        } else if (squadTab === 'pets') {
            renderSquadPets(scale, contentX, contentY, contentW, contentH);
        } else if (squadTab === 'stars') {
            renderSquadStars(scale, contentX, contentY, contentW, contentH);
        }

        // ===== 左下角：返回按钮（与背包一致） =====
        drawBackButton();

        // ===== 显示立绘大图 =====
        if (getShowPortraitLarge()) {
            renderPortraitLarge(scale);
        }
    }

    // ==================== renderPortraitLarge ====================
    function renderPortraitLarge(scale) {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var Assets = getAssets();
        var pd = getSaveData();
        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);

        var currentCharId = pd.currentCharacterId;
        var hasCharacter = !!currentCharId;
        var mappedCharId = hasCharacter ? getCharacterKey(currentCharId) : null;
        var character = hasCharacter ? Characters[mappedCharId] : null;

        // 半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        if (!hasCharacter) {
            ctx.fillStyle = '#666666';
            ctx.font = Math.floor(18 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('未选择角色', screenWidth / 2, (designOffsetY + designBottom) / 2);
            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText('点击任意位置关闭', screenWidth / 2, designBottom - Math.floor(30 * scale));
            return;
        }

        // 获取立绘图片
        var portraitImage = Assets.characterImages[mappedCharId + 'Portrait'] || Assets.characterImages[mappedCharId];

        if (portraitImage && portraitImage.complete && portraitImage.naturalWidth > 0) {
            // 计算图片尺寸（保持比例，最大占屏幕80%）
            var maxW = screenWidth * 0.8;
            var maxH = screenHeight * 0.8;
            var imgRatio = portraitImage.width / portraitImage.height;
            var drawW, drawH;

            if (imgRatio > maxW / maxH) {
                drawW = maxW;
                drawH = maxW / imgRatio;
            } else {
                drawH = maxH;
                drawW = maxH * imgRatio;
            }

            // 居中绘制
            var drawX = (screenWidth - drawW) / 2;
            var drawY = (designOffsetY + designBottom - drawH) / 2;

            ctx.drawImage(portraitImage, drawX, drawY, drawW, drawH);
        }

        // 角色名称
        if (character) {
            ctx.font = 'bold ' + Math.floor(18 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            var detailNameX = screenWidth / 2;
            var detailNameY = designBottom - Math.floor(60 * scale);
            if (character.rarity === 'SP') {
                uiCore.drawSPText(character.name, detailNameX, detailNameY, 18, scale);
            } else if (character.rarity === 'LR') {
                uiCore.drawLRText(character.name, detailNameX, detailNameY, 18, scale);
            } else if (character.rarity === 'UR') {
                uiCore.drawURText(character.name, detailNameX, detailNameY, 18, scale);
            } else {
                ctx.fillStyle = '#FFD700';
                ctx.fillText(character.name, detailNameX, detailNameY);
            }
        }

        // 提示文字
        ctx.fillStyle = '#aaaaaa';
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('点击任意位置关闭', screenWidth / 2, designBottom - Math.floor(30 * scale));
    }

    // ==================== renderSquadCharacter ====================
    function renderSquadCharacter(scale, x, y, w, h) {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var Assets = getAssets();
        var pd = getSaveData();
        var fillRoundRect = getFillRoundRect();
        var strokeRoundRect = getStrokeRoundRect();

        var currentCharId = pd.currentCharacterId;
        var hasCharacter = !!currentCharId;
        var mappedCharId = hasCharacter ? getCharacterKey(currentCharId) : null;
        var character = hasCharacter ? Characters[mappedCharId] : null;

        if (!character) {
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(20 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无角色', x + w / 2, y + h / 2);
            return;
        }

        // 属性数据
        var charExp = pd.characterExperience && pd.characterExperience[currentCharId];
        var level = charExp ? charExp.level : 1;
        var exp = charExp ? charExp.exp : 0;
        var fullStats = getCharacterFullStats(currentCharId);

        // 计算内容区域宽度，用于水平居中
        var portraitMaxW = Math.floor(160 * scale);
        var portraitMaxH = Math.floor(200 * scale);
        var infoW = Math.floor(180 * scale);
        var totalW = portraitMaxW + Math.floor(30 * scale) + infoW; // 立绘 + 间距 + 属性
        var startX = x + (w - totalW) / 2 + Math.floor(40 * scale); // 水平居中 + 向右移动40像素

        // ===== 左侧：角色立绘 =====
        var portraitX = startX;
        var portraitY = y + Math.floor(120 * scale); // 向下移动100像素

        // 绘制角色立绘图片（保持原始比例）
        var portraitImage = Assets.characterImages[mappedCharId + 'Portrait'] || Assets.characterImages[mappedCharId];
        if (portraitImage && portraitImage.complete && portraitImage.naturalWidth > 0) {
            var img = portraitImage;
            var imgRatio = img.width / img.height;
            var drawW, drawH;
            if (imgRatio > portraitMaxW / portraitMaxH) {
                drawW = portraitMaxW;
                drawH = portraitMaxW / imgRatio;
            } else {
                drawH = portraitMaxH;
                drawW = portraitMaxH * imgRatio;
            }
            // 立绘也水平居中在 portraitMaxW 区域内
            var drawX = portraitX + (portraitMaxW - drawW) / 2;
            ctx.drawImage(img, drawX, portraitY, drawW, drawH);
        } else {
            ctx.fillStyle = '#666666';
            ctx.font = Math.floor(40 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👤', portraitX + portraitMaxW / 2, portraitY + portraitMaxH / 2);
        }

        // 角色名称和稀有度
        var nameY = portraitY + portraitMaxH + Math.floor(15 * scale);
        ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        var switchNameX = portraitX + portraitMaxW / 2;
        if (character.rarity === 'SP') {
            uiCore.drawSPText(character.name, switchNameX, nameY, 16, scale);
        } else if (character.rarity === 'LR') {
            uiCore.drawLRText(character.name, switchNameX, nameY, 16, scale);
        } else if (character.rarity === 'UR') {
            uiCore.drawURText(character.name, switchNameX, nameY, 16, scale);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillText(character.name, switchNameX, nameY);
        }

        // 稀有度
        var rarityColors = RARITY_COLORS;
        ctx.fillStyle = rarityColors[character.rarity] || '#ffffff';
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        ctx.fillText('【' + character.rarity + '】', portraitX + portraitMaxW / 2, nameY + Math.floor(22 * scale));

        // 切换角色按钮
        var switchBtnY = nameY + Math.floor(50 * scale);
        var switchBtnW = Math.floor(80 * scale);
        var switchBtnH = Math.floor(30 * scale);
        var switchBtnX = portraitX + (portraitMaxW - switchBtnW) / 2;

        ctx.fillStyle = '#4a90d9';
        fillRoundRect(ctx, switchBtnX, switchBtnY, switchBtnW, switchBtnH, 6);
        ctx.strokeStyle = '#6ab0ff';
        ctx.lineWidth = 1;
        strokeRoundRect(ctx, switchBtnX, switchBtnY, switchBtnW, switchBtnH, 6);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('切换角色', switchBtnX + switchBtnW / 2, switchBtnY + switchBtnH / 2);

        // ===== 右侧：详细属性信息 =====
        var infoX = portraitX + portraitMaxW + Math.floor(30 * scale);
        var infoY = y + Math.floor(120 * scale); // 向下移动100像素
        var lineHeight = Math.floor(22 * scale);

        // 标题
        ctx.fillStyle = '#87CEEB';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('【角色属性】', infoX, infoY);
        infoY += lineHeight + Math.floor(5 * scale);

        // 格式化数值：取整显示
        var formatNum = function(n) {
            if (typeof n !== 'number') return n;
            return Math.floor(n);
        };

        // 基础属性列表
        var stats = [
            { name: '等级', value: level + ' / 90', color: '#ffffff' },
            { name: '感悟', value: exp + ' / ' + (level * 100), color: '#ffffff' },
            { name: '灵能值', value: formatNum(pd.maxPlayerHp), color: '#ff6b6b' },
            { name: '灵光冲击', value: formatNum(fullStats.attack), color: '#ffd700' },
            { name: '灵场护盾', value: formatNum(fullStats.defense || character.defense), color: '#4ecdc4' },
            { name: '会心感应', value: formatNum(fullStats.critRate) + '%', color: '#ff9f43' },
            { name: '会心威力', value: formatNum(fullStats.critDamage * 100) + '%', color: '#ee5a24' },
            { name: '魔力', value: formatNum(fullStats.mana || character.mana), color: '#a29bfe' },
            { name: '信仰', value: formatNum(fullStats.faith || character.faith), color: '#74b9ff' }
        ];

        for (let i = 0; i < stats.length; i++) {
            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText(stats[i].name + ':', infoX, infoY);

            ctx.fillStyle = stats[i].color;
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText(stats[i].value, infoX + Math.floor(70 * scale), infoY);

            infoY += lineHeight;
        }

        // 分隔线
        infoY += Math.floor(10 * scale);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(infoX, infoY);
        ctx.lineTo(infoX + Math.floor(150 * scale), infoY);
        ctx.stroke();
        infoY += Math.floor(15 * scale);

        // 连击属性
        ctx.fillStyle = '#87CEEB';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
        ctx.fillText('【连灵属性】', infoX, infoY);
        infoY += lineHeight + Math.floor(5 * scale);

        var comboStats = [
            { name: '连灵阈值', value: character.comboThreshold },
            { name: '速度加成', value: (character.comboSpeedBonus * 100).toFixed(0) + '%' },
            { name: '灵辉值加成', value: (character.comboScoreBonus * 100).toFixed(0) + '%' },
            { name: '连灵时限', value: (character.comboTimeout / 1000).toFixed(1) + 's' }
        ];

        for (let i = 0; i < comboStats.length; i++) {
            ctx.fillStyle = '#aaaaaa';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText(comboStats[i].name + ':', infoX, infoY);

            ctx.fillStyle = '#4ecdc4';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText(comboStats[i].value, infoX + Math.floor(70 * scale), infoY);

            infoY += lineHeight;
        }

        // 角色描述
        infoY += Math.floor(10 * scale);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = 'italic ' + Math.floor(11 * scale) + 'px sans-serif';
        ctx.fillText(character.description, infoX, infoY);
    }

    // ==================== renderSquadEquipment ====================
    function renderSquadEquipment(scale, x, y, w, h) {
        var ctx = getCtx();
        var screenHeight = getScreenHeight();
        var pd = getSaveData();
        var uiScrollState = getUiScrollState();
        var fillRoundRect = getFillRoundRect();

        var equipped = pd.equipments && pd.equipments.equipped ? pd.equipments.equipped : {};

        var slotTypes = [
            { id: 'weapon', name: '武器', emoji: '⚔️' },
            { id: 'armor', name: '护甲', emoji: '🛡️' },
            { id: 'accessory', name: '饰品', emoji: '💍' }
        ];

        var slotY = y + Math.floor(70 * scale) - uiScrollState.squadScrollY; // 添加滚动偏移
        var slotH = Math.floor(70 * scale);
        var slotGap = Math.floor(15 * scale);

        var ownedList = pd.equipments && pd.equipments.owned ? pd.equipments.owned : [];

        for (let i = 0; i < slotTypes.length; i++) {
            var slot = slotTypes[i];
            var instanceId = equipped[slot.id];
            var equip = null;
            // 通过instanceId反查装备定义
            if (instanceId) {
                for (let ei = 0; ei < ownedList.length; ei++) {
                    var ed = ownedList[ei];
                    var eid = ed.uid || ('idx_' + ei);
                    if (eid === instanceId) {
                        var ek = typeof ed === 'string' ? ed : (ed.id || ed);
                        equip = Equipments[ek] || null;
                        break;
                    }
                }
                // 兼容旧存档：instanceId可能就是equipKey
                if (!equip) equip = Equipments[instanceId] || null;
            }

            // 跳过超出屏幕的项目
            if (slotY + slotH < y || slotY > screenHeight) {
                slotY += slotH + slotGap;
                continue;
            }

            // 槽位背景
            ctx.fillStyle = 'rgba(60, 60, 80, 0.5)';
            fillRoundRect(ctx, x + Math.floor(10 * scale), slotY, w - Math.floor(20 * scale), slotH, 8);

            // 槽位图标
            ctx.font = Math.floor(30 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(slot.emoji, x + Math.floor(40 * scale), slotY + slotH / 2);

            // 槽位名称
            ctx.fillStyle = '#87CEEB';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(slot.name, x + Math.floor(65 * scale), slotY + Math.floor(20 * scale));

            if (equip) {
                // 已装备
                ctx.fillStyle = '#FFD700';
                ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                ctx.fillText(equip.name, x + Math.floor(65 * scale), slotY + Math.floor(45 * scale));

                // 属性
                ctx.fillStyle = '#aaaaaa';
                ctx.font = Math.floor(11 * scale) + 'px sans-serif';
                var attrText = '';
                if (equip.attack) attrText += '攻击+' + equip.attack + ' ';
                if (equip.defense) attrText += '防御+' + equip.defense + ' ';
                if (equip.critRate) attrText += '暴击+' + equip.critRate + '% ';
                ctx.fillText(attrText, x + Math.floor(65 * scale), slotY + Math.floor(65 * scale));
            } else {
                // 未装备
                ctx.fillStyle = '#666666';
                ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                ctx.fillText('未装备', x + Math.floor(65 * scale), slotY + Math.floor(45 * scale));
            }

            slotY += slotH + slotGap;
        }
    }

    // ==================== renderSquadSkills ====================
    function renderSquadSkills(scale, x, y, w, h) {
        var ctx = getCtx();
        var pd = getSaveData();
        var uiScrollState = getUiScrollState();
        var fillRoundRect = getFillRoundRect();

        var equipped = pd.skills && pd.skills.equipped ? pd.skills.equipped : [];

        var slotY = y + Math.floor(70 * scale) - uiScrollState.squadScrollY; // 添加滚动偏移
        var slotH = Math.floor(60 * scale);
        var slotGap = Math.floor(10 * scale);

        for (let i = 0; i < 3; i++) {
            var skillId = equipped[i];
            var skill = skillId ? Skills[skillId] : null;

            // 槽位背景
            ctx.fillStyle = 'rgba(60, 60, 80, 0.5)';
            fillRoundRect(ctx, x + Math.floor(10 * scale), slotY, w - Math.floor(20 * scale), slotH, 8);

            // 槽位编号
            ctx.fillStyle = '#87CEEB';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('技能 ' + (i + 1) + ':', x + Math.floor(20 * scale), slotY + Math.floor(25 * scale));

            if (skill) {
                // 已装备
                ctx.font = Math.floor(24 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(skill.emoji, x + Math.floor(80 * scale), slotY + slotH / 2);

                ctx.fillStyle = '#FFD700';
                ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(skill.name, x + Math.floor(110 * scale), slotY + Math.floor(25 * scale));

                ctx.fillStyle = '#aaaaaa';
                ctx.font = Math.floor(11 * scale) + 'px sans-serif';
                ctx.fillText(skill.description, x + Math.floor(110 * scale), slotY + Math.floor(45 * scale));
            } else {
                ctx.fillStyle = '#666666';
                ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                ctx.fillText('未装备', x + Math.floor(110 * scale), slotY + Math.floor(25 * scale));
            }

            slotY += slotH + slotGap;
        }
    }

    // ==================== renderSquadPets ====================
    function renderSquadPets(scale, x, y, w, h) {
        var ctx = getCtx();
        var pd = getSaveData();
        var uiScrollState = getUiScrollState();
        var fillRoundRect = getFillRoundRect();

        var equippedUid = pd.pets ? pd.pets.equipped : null;
        // 通过uid找到宠物实例和配置
        var equippedPetData = null;
        var pet = null;
        if (equippedUid && pd.pets && pd.pets.owned) {
            for (let pi = 0; pi < pd.pets.owned.length; pi++) {
                var petData = pd.pets.owned[pi];
                var pdUid = (typeof petData === 'object' && petData.uid) ? petData.uid : ('idx_' + pi);
                if (pdUid === equippedUid) {
                    equippedPetData = petData;
                    var pdKey = typeof petData === 'string' ? petData : (petData.id || petData);
                    pet = Pets[pdKey];
                    break;
                }
            }
        }
        // 兼容旧数据：equipped存的是petKey而非uid
        if (!pet && equippedUid) {
            pet = Pets[equippedUid];
        }

        var slotY = y + Math.floor(70 * scale) - uiScrollState.squadScrollY; // 添加滚动偏移

        // 宠物槽位背景
        var slotH = Math.floor(100 * scale);
        ctx.fillStyle = 'rgba(60, 60, 80, 0.5)';
        fillRoundRect(ctx, x + Math.floor(10 * scale), slotY, w - Math.floor(20 * scale), slotH, 8);

        if (pet) {
            // 已装备宠物
            ctx.font = Math.floor(40 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(pet.emoji, x + Math.floor(60 * scale), slotY + slotH / 2);

            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(pet.name, x + Math.floor(100 * scale), slotY + Math.floor(25 * scale));

            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(12 * scale) + 'px sans-serif';
            ctx.fillText('攻击: ' + pet.attack + '  攻速: ' + pet.attackSpeed + 's', x + Math.floor(100 * scale), slotY + Math.floor(50 * scale));

            if (pet.critRate) {
                ctx.fillText('暴击: ' + pet.critRate + '%', x + Math.floor(100 * scale), slotY + Math.floor(70 * scale));
            }
        } else {
            ctx.fillStyle = '#666666';
            ctx.font = Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('未出战', x + w / 2, slotY + slotH / 2);
        }
    }

    // ==================== renderSquadStars ====================
    function renderSquadStars(scale, x, y, w, h) {
        var ctx = getCtx();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var pd = getSaveData();
        var uiScrollState = getUiScrollState();
        var fillRoundRect = getFillRoundRect();
        var designOffsetY = getDesignOffsetY();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);

        var equippedStars = pd.equippedStars || [];

        // ===== 普通星星开关 =====
        var normalStarEnabled = pd.normalStarEnabled !== false; // 默认true
        var switchY = y + Math.floor(35 * scale);  // 分割线在y+20，开关从y+35开始
        var switchHeight = Math.floor(28 * scale);  // 高度

        // 开关背景
        ctx.fillStyle = 'rgba(60, 60, 80, 0.5)';
        fillRoundRect(ctx, x + Math.floor(10 * scale), switchY, w - Math.floor(20 * scale), switchHeight, 8);

        // 开关文字
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐ 普通灵光入局', x + Math.floor(20 * scale), switchY + switchHeight / 2);

        // 开关按钮
        var switchBtnW = Math.floor(50 * scale);
        var switchBtnH = Math.floor(26 * scale);
        var switchBtnX = x + w - Math.floor(70 * scale);
        var switchBtnY = switchY + (switchHeight - switchBtnH) / 2;

        // 开关背景色
        ctx.fillStyle = normalStarEnabled ? '#4CAF50' : '#666666';
        fillRoundRect(ctx, switchBtnX, switchBtnY, switchBtnW, switchBtnH, 4);

        // 开关滑块
        var sliderSize = Math.floor(22 * scale);
        var sliderX = normalStarEnabled ? switchBtnX + switchBtnW - sliderSize - Math.floor(2 * scale) : switchBtnX + Math.floor(2 * scale);
        var sliderY = switchBtnY + (switchBtnH - sliderSize) / 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sliderX + sliderSize / 2, sliderY + sliderSize / 2, sliderSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // 开关状态文字
        ctx.fillStyle = normalStarEnabled ? '#4CAF50' : '#888888';
        ctx.font = Math.floor(10 * scale) + 'px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(normalStarEnabled ? '已开启' : '已关闭', switchBtnX - Math.floor(5 * scale), switchY + switchHeight / 2);

        var slotH = Math.floor(60 * scale);
        var slotGap = Math.floor(10 * scale);

        // ===== 固定区域：5个星星槽位（横向排列，不参与滚动）=====
        var fixedSlotY = y + Math.floor(70 * scale); // 固定位置（开关下方，开关从y+35开始，高度28，结束于y+63）
        var slotSize = Math.floor(50 * scale);
        var hSlotGap = Math.floor(8 * scale);
        var totalWidth = 5 * slotSize + 4 * hSlotGap;
        var startX = x + (w - totalWidth) / 2;
        var spaceKeyStar = pd.spaceKeyStar;
        var tutorialActive = _tutorialHighlightStarId !== null;
        var now = Date.now();
        var tutorialPulse = tutorialActive ? 0.5 + 0.5 * Math.sin(now / 300) : 0;

        for (let i = 0; i < 5; i++) {
            var starId = equippedStars[i];
            var star = starId ? SEASON_STAR_TYPES.find(st => st.id === starId) : null;
            var slotX = startX + i * (slotSize + hSlotGap);
            var isSpaceKey = starId && starId === spaceKeyStar;
            var isTutorialEmptySlot = tutorialActive && !starId;

            // 槽位背景
            ctx.fillStyle = 'rgba(60, 60, 80, 0.5)';
            fillRoundRect(ctx, slotX, fixedSlotY, slotSize, slotSize, 8);

            // 空格灵光指示：金色描边
            if (isSpaceKey) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = Math.floor(3 * scale);
                ctx.strokeRect(slotX + 1, fixedSlotY + 1, slotSize - 2, slotSize - 2);
            }

            // 引导高亮：空余槽位闪烁
            if (isTutorialEmptySlot) {
                ctx.strokeStyle = 'rgba(255, 215, 0, ' + tutorialPulse.toFixed(2) + ')';
                ctx.lineWidth = Math.floor(3 * scale);
                ctx.strokeRect(slotX + 1, fixedSlotY + 1, slotSize - 2, slotSize - 2);
            }

            if (star) {
                // 已装备星星
                ctx.font = Math.floor(28 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(star.emoji, slotX + slotSize / 2, fixedSlotY + slotSize / 2);

                // 空格键标记
                if (isSpaceKey) {
                    ctx.fillStyle = '#FFD700';
                    ctx.font = 'bold ' + Math.floor(10 * scale) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('空格', slotX + slotSize / 2, fixedSlotY + slotSize - 2);
                }
            } else {
                // 未装备
                ctx.fillStyle = '#444444';
                ctx.font = Math.floor(24 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('+', slotX + slotSize / 2, fixedSlotY + slotSize / 2);
            }
        }

        // 槽位下方显示当前装备星星的名称
        ctx.fillStyle = '#87CEEB';
        ctx.font = Math.floor(12 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        var equippedNames = [];
        for (let e = 0; e < equippedStars.length; e++) {
            if (equippedStars[e]) {
                var eStar = SEASON_STAR_TYPES.find(st => st.id === equippedStars[e]);
                if (eStar) equippedNames.push(eStar.name);
            }
        }
        if (equippedNames.length > 0) {
            ctx.fillText('已装备: ' + equippedNames.join('、'), x + w / 2, fixedSlotY + slotSize + Math.floor(8 * scale));
        } else {
            ctx.fillText('未装备任何灵光', x + w / 2, fixedSlotY + slotSize + Math.floor(8 * scale));
        }

        // 分隔线
        var separatorY = fixedSlotY + slotSize + Math.floor(28 * scale);
        ctx.fillStyle = '#444444';
        ctx.fillRect(x + Math.floor(10 * scale), separatorY, w - Math.floor(20 * scale), 1);

        // ===== 可滚动区域：可选星星列表 =====
        var scrollStartY = separatorY + Math.floor(15 * scale);
        var listY = scrollStartY - uiScrollState.squadScrollY; // 列表参与滚动

        // 计算可见区域
        var bottomBtnHeight = Math.floor(60 * scale);
        var visibleEndY = designBottom - Math.floor(60 * scale);

        // 保存当前状态并设置裁剪区域
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, scrollStartY, w, visibleEndY - scrollStartY);
        ctx.clip();

        // 统计已解锁的星星数量
        var unlockedStars = [];
        for (let j = 0; j < SEASON_STAR_TYPES.length; j++) {
            var optStar = SEASON_STAR_TYPES[j];
            if (optStar.id === 'normal') continue;
            var isUnlocked = pd.unlockedStarTypes && pd.unlockedStarTypes.indexOf(optStar.id) !== -1;
            if (isUnlocked) {
                unlockedStars.push(optStar);
            }
        }

        if (unlockedStars.length === 0) {
            // 没有解锁任何星星，显示提示
            ctx.fillStyle = '#888888';
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('暂无已解锁的特殊灵光', x + w / 2, listY + Math.floor(20 * scale));
            ctx.fillText('通过净化之旅获取材料来解锁', x + w / 2, listY + Math.floor(45 * scale));
        } else {
            // 可选星星列表
            for (let k = 0; k < unlockedStars.length; k++) {
                var star = unlockedStars[k];

                // 检查是否已装备
                var isEquipped = equippedStars.indexOf(star.id) !== -1;
                var isTutorialRow = tutorialActive && star.id === _tutorialHighlightStarId;

                // 星星背景
                ctx.fillStyle = isEquipped ? 'rgba(100, 150, 100, 0.5)' : 'rgba(60, 60, 80, 0.5)';
                fillRoundRect(ctx, x + Math.floor(10 * scale), listY, w - Math.floor(20 * scale), slotH, 8);

                // 引导高亮：金色描边呼吸动画
                if (isTutorialRow) {
                    ctx.strokeStyle = 'rgba(255, 215, 0, ' + tutorialPulse.toFixed(2) + ')';
                    ctx.lineWidth = Math.floor(3 * scale);
                    ctx.strokeRect(x + Math.floor(10 * scale) + 1, listY + 1, w - Math.floor(20 * scale) - 2, slotH - 2);
                }

                // 空格灵光标记
                if (star.id === spaceKeyStar) {
                    ctx.fillStyle = '#FFD700';
                    ctx.font = 'bold ' + Math.floor(11 * scale) + 'px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText('[空格]', x + w - Math.floor(72 * scale), listY + Math.floor(25 * scale));
                }

                // 星星图标
                ctx.font = Math.floor(24 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(star.emoji, x + Math.floor(40 * scale), listY + slotH / 2);

                // 星星名称
                ctx.fillStyle = '#FFD700';
                ctx.font = Math.floor(14 * scale) + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(star.name, x + Math.floor(65 * scale), listY + Math.floor(25 * scale));

                // 星星效果
                ctx.fillStyle = '#aaaaaa';
                ctx.font = Math.floor(11 * scale) + 'px sans-serif';
                ctx.fillText(star.description, x + Math.floor(65 * scale), listY + Math.floor(45 * scale));

                // 装备/卸下按钮
                var btnX = x + w - Math.floor(70 * scale);
                var btnY = listY + Math.floor(16 * scale);
                var btnW = Math.floor(50 * scale);
                var btnH = Math.floor(28 * scale);

                ctx.fillStyle = isEquipped ? '#E74C3C' : '#4CAF50';
                fillRoundRect(ctx, btnX, btnY, btnW, btnH, 6);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold ' + Math.floor(11 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(isEquipped ? '卸下' : '装备', btnX + btnW/2, btnY + btnH/2);

                listY += slotH + slotGap;
            }
        }

        // 恢复裁剪状态
        ctx.restore();

        // 引导气泡（非模态，绘制在裁剪区域外）
        if (tutorialActive && _tutorialHighlightStarId) {
            // 找到引导灵光在列表中的位置
            var tutorialStar = SEASON_STAR_TYPES.find(function(st) { return st.id === _tutorialHighlightStarId; });
            if (tutorialStar) {
                var bubbleY = separatorY + Math.floor(10 * scale);
                var bubbleX = x + Math.floor(15 * scale);
                var bubbleW = w - Math.floor(30 * scale);
                var bubbleH = Math.floor(50 * scale);

                // 气泡背景
                ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
                fillRoundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 10);

                // 气泡文字
                ctx.fillStyle = '#1a1a2e';
                ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('获得' + tutorialStar.name + '！点击装备后，再点击装备槽位设为空格键触发。',
                    bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);

                // 检测引导完成条件：灵光已装备 + 已设为空格键
                var pd2 = getSaveData();
                var es2 = pd2.equippedStars || [];
                if (es2.indexOf(_tutorialHighlightStarId) !== -1 && pd2.spaceKeyStar === _tutorialHighlightStarId) {
                    _tutorialHighlightStarId = null;
                    onTutorialComplete();
                }
            }
        }
    }

    // ==================== 编队交互逻辑 ====================

    // 计算当前标签页最大滚动量（handleScrollMove / handleScrollEnd 共用）
    function getMaxScroll() {
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var screenHeight = getScreenHeight();
        var designBottom = Math.min(designOffsetY + Math.floor(DESIGN_HEIGHT * scale), screenHeight);
        var pd = getSaveData();
        var tab = getSquadTab();
        var maxScroll = 0;

        if (tab === 'stars') {
            var unlockedCount = 0;
            if (pd.unlockedStarTypes) {
                for (var s = 0; s < SEASON_STAR_TYPES.length; s++) {
                    if (SEASON_STAR_TYPES[s].id !== 'normal' &&
                        pd.unlockedStarTypes.indexOf(SEASON_STAR_TYPES[s].id) !== -1) {
                        unlockedCount++;
                    }
                }
            }
            var slotH = Math.floor(60 * scale);
            var slotGap = Math.floor(10 * scale);
            var totalHeight = unlockedCount === 0 ? Math.floor(80 * scale) : unlockedCount * (slotH + slotGap);
            var scrollStartY = designOffsetY + Math.floor(443 * scale);
            var bottomBtnHeight = Math.floor(60 * scale);
            var visibleHeight = designBottom - Math.floor(60 * scale) - scrollStartY;
            maxScroll = Math.max(0, totalHeight - visibleHeight + Math.floor(20 * scale));
        } else if (tab === 'equipment') {
            var totalHeight = 3 * Math.floor(85 * scale);
            var visibleHeight = Math.floor((DESIGN_HEIGHT - 150) * scale);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        } else if (tab === 'skills') {
            var totalHeight = 3 * Math.floor(70 * scale);
            var visibleHeight = Math.floor((DESIGN_HEIGHT - 150) * scale);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        } else if (tab === 'pets') {
            var totalHeight = Math.floor(100 * scale);
            var visibleHeight = Math.floor((DESIGN_HEIGHT - 150) * scale);
            maxScroll = Math.max(0, totalHeight - visibleHeight);
        }
        return maxScroll;
    }

    // 点击处理（原 handleSquadClick）
    function handleClick(x, y) {
        var scale = getScreenScale();
        var designOffsetY = getDesignOffsetY();
        var screenWidth = getScreenWidth();
        var screenHeight = getScreenHeight();
        var GAME_STATE = deps.getGameConst();
        console.log('[SquadDebug] click x=' + x + ' y=' + y + ' scale=' + scale + ' sw=' + screenWidth + ' sh=' + screenHeight);

        // 返回按钮
        if (deps.isBackButtonClicked(x, y)) {
            deps.transitionTo(GAME_STATE.WORLDMAP);
            return;
        }

        // 大图关闭
        if (getShowPortraitLarge()) {
            deps.setShowPortraitLarge(false);
            return;
        }

        // 标签页
        var tabWidth = Math.floor(55 * scale);
        var tabHeight = Math.floor(45 * scale);
        var tabGap = Math.floor(8 * scale);
        var tabX = screenWidth - tabWidth;
        var startTabY = designOffsetY + Math.floor(100 * scale);
        var tabs = ['character', 'equipment', 'skills', 'pets', 'stars'];

        for (var i = 0; i < tabs.length; i++) {
            var tabY = startTabY + i * (tabHeight + tabGap);
            if (x >= tabX && x <= screenWidth && y >= tabY && y <= tabY + tabHeight) {
                deps.setSquadTab(tabs[i]);
                return;
            }
        }

        // 内容区域
        var contentX = Math.floor(15 * scale);
        var contentY = (getSquadTab() === 'character') ? designOffsetY + Math.floor(20 * scale) : designOffsetY + Math.floor(280 * scale);
        var contentW = screenWidth - tabWidth - contentX - Math.floor(15 * scale);

        if (getSquadTab() === 'character') {
            var portraitMaxW = Math.floor(160 * scale);
            var portraitMaxH = Math.floor(200 * scale);
            var infoW = Math.floor(180 * scale);
            var totalW = portraitMaxW + Math.floor(30 * scale) + infoW;
            var portraitX = contentX + (contentW - totalW) / 2 + Math.floor(40 * scale);
            var portraitY = contentY + Math.floor(120 * scale);

            if (x >= portraitX && x <= portraitX + portraitMaxW && y >= portraitY && y <= portraitY + portraitMaxH) {
                deps.setShowPortraitLarge(true);
                return;
            }

            var nameY = portraitY + portraitMaxH + Math.floor(15 * scale);
            var switchBtnY = nameY + Math.floor(50 * scale);
            var switchBtnW = Math.floor(80 * scale);
            var switchBtnH = Math.floor(30 * scale);
            var switchBtnX = portraitX + (portraitMaxW - switchBtnW) / 2;

            if (x >= switchBtnX && x <= switchBtnX + switchBtnW && y >= switchBtnY && y <= switchBtnY + switchBtnH) {
                getUiScrollState().backpackTab = 'characters';
                deps.transitionTo(GAME_STATE.BACKPACK);
                return;
            }
        } else if (getSquadTab() === 'equipment') {
            var slotY = contentY + Math.floor(70 * scale) - getUiScrollState().squadScrollY;
            var slotH = Math.floor(70 * scale);
            var slotGap = Math.floor(15 * scale);
            for (var i = 0; i < 3; i++) {
                if (x >= contentX + Math.floor(10 * scale) && x <= contentX + contentW - Math.floor(20 * scale) && y >= slotY && y <= slotY + slotH) {
                    getUiScrollState().backpackTab = 'equipments';
                    deps.transitionTo(GAME_STATE.BACKPACK);
                    return;
                }
                slotY += slotH + slotGap;
            }
        } else if (getSquadTab() === 'skills') {
            var slotY = contentY + Math.floor(70 * scale) - getUiScrollState().squadScrollY;
            var slotH = Math.floor(60 * scale);
            var slotGap = Math.floor(10 * scale);
            for (var i = 0; i < 3; i++) {
                if (x >= contentX + Math.floor(10 * scale) && x <= contentX + contentW - Math.floor(20 * scale) && y >= slotY && y <= slotY + slotH) {
                    getUiScrollState().backpackTab = 'skills';
                    deps.transitionTo(GAME_STATE.BACKPACK);
                    return;
                }
                slotY += slotH + slotGap;
            }
        } else if (getSquadTab() === 'pets') {
            var slotY = contentY + Math.floor(70 * scale) - getUiScrollState().squadScrollY;
            var slotH = Math.floor(100 * scale);
            if (x >= contentX + Math.floor(10 * scale) && x <= contentX + contentW - Math.floor(20 * scale) && y >= slotY && y <= slotY + slotH) {
                getUiScrollState().backpackTab = 'pets';
                deps.transitionTo(GAME_STATE.BACKPACK);
                return;
            }
        } else if (getSquadTab() === 'stars') {
            var pd = getSaveData();

            // 普通星星开关
            var switchY = contentY + Math.floor(35 * scale);
            var switchHeight = Math.floor(28 * scale);
            var switchBtnW = Math.floor(50 * scale);
            var switchBtnH = Math.floor(26 * scale);
            var switchBtnX = contentX + contentW - Math.floor(70 * scale);
            var switchBtnY = switchY + (switchHeight - switchBtnH) / 2;

            if (x >= switchBtnX && x <= switchBtnX + switchBtnW && y >= switchBtnY && y <= switchBtnY + switchBtnH) {
                pd.normalStarEnabled = pd.normalStarEnabled === false ? true : false;
                deps.showToast({ title: pd.normalStarEnabled ? '⭐ 普通灵光已开启' : '⭐ 普通灵光已关闭', icon: 'none', duration: 1000 });
                deps.savePlayerData();
                return;
            }

            // 固定槽位：点击已装备星星 → 设为/取消空格灵光
            var _fixedSlotY = contentY + Math.floor(70 * scale);
            var _slotSize = Math.floor(50 * scale);
            var _hSlotGap = Math.floor(8 * scale);
            var _totalWidth = 5 * _slotSize + 4 * _hSlotGap;
            var _startX = contentX + (contentW - _totalWidth) / 2;
            var _equippedStars = pd.equippedStars || [];

            for (var si = 0; si < 5; si++) {
                var _slotX = _startX + si * (_slotSize + _hSlotGap);
                if (x >= _slotX && x <= _slotX + _slotSize && y >= _fixedSlotY && y <= _fixedSlotY + _slotSize) {
                    if (_equippedStars[si]) {
                        var _starId = _equippedStars[si];
                        // 切换空格灵光绑定
                        if (pd.spaceKeyStar === _starId) {
                            pd.spaceKeyStar = null;
                            var _star = SEASON_STAR_TYPES.find(function(st) { return st.id === _starId; });
                            deps.showToast({ title: '已取消空格键触发 ' + (_star ? _star.name : _starId), icon: 'none', duration: 1000 });
                        } else {
                            pd.spaceKeyStar = _starId;
                            var _star2 = SEASON_STAR_TYPES.find(function(st) { return st.id === _starId; });
                            deps.showToast({ title: '已设为空格键触发 ' + (_star2 ? _star2.name : _starId), icon: 'none', duration: 1000 });
                        }
                        deps.savePlayerData();
                    }
                    return;
                }
            }

            // 星星装备/卸下
            var fixedSlotY = contentY + Math.floor(70 * scale);
            var slotSize = Math.floor(50 * scale);
            var separatorY = fixedSlotY + slotSize + Math.floor(28 * scale);
            var scrollStartY = separatorY + Math.floor(15 * scale);
            var equippedStars = pd.equippedStars || [];
            var slotH = Math.floor(60 * scale);
            var slotGap = Math.floor(10 * scale);
            var unlockedStars = [];
            for (var j = 0; j < SEASON_STAR_TYPES.length; j++) {
                var optStar = SEASON_STAR_TYPES[j];
                if (optStar.id === 'normal') continue;
                if (pd.unlockedStarTypes && pd.unlockedStarTypes.indexOf(optStar.id) !== -1) {
                    unlockedStars.push(optStar);
                }
            }

            var listY = scrollStartY - getUiScrollState().squadScrollY;
            for (var k = 0; k < unlockedStars.length; k++) {
                var star = unlockedStars[k];
                var btnX = contentX + contentW - Math.floor(70 * scale);
                var btnY = listY + Math.floor(16 * scale);
                var btnW = Math.floor(50 * scale);
                var btnH = Math.floor(28 * scale);

                if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
                    var isEquipped = equippedStars.indexOf(star.id) !== -1;
                    if (isEquipped) {
                        equippedStars.splice(equippedStars.indexOf(star.id), 1);
                        // 如果卸下的是空格灵光，同时取消绑定
                        if (pd.spaceKeyStar === star.id) {
                            pd.spaceKeyStar = null;
                        }
                        deps.showToast({ title: '已卸下 ' + star.name, icon: 'none', duration: 1000 });
                    } else {
                        if (equippedStars.length >= 5) {
                            deps.showToast({ title: '最多装备5个特殊灵光', icon: 'none', duration: 1500 });
                            return;
                        }
                        equippedStars.push(star.id);
                        deps.showToast({ title: '已装备 ' + star.name, icon: 'none', duration: 1000 });
                    }
                    pd.equippedStars = equippedStars;
                    deps.savePlayerData();
                    return;
                }
                listY += slotH + slotGap;
            }
        }
    }

    // 滚动开始
    function handleScrollStart(touches) {
        if (touches.length === 0) return;
        getUiScrollState().squadLastTouchY = touches[0].clientY;
    }

    // 滚动移动
    function handleScrollMove(touches) {
        if (touches.length === 0) return;
        var scroll = getUiScrollState();
        var currentY = touches[0].clientY;

        if (scroll.squadLastTouchY > 0) {
            var deltaY = scroll.squadLastTouchY - currentY;
            scroll.squadScrollY += deltaY;
            var maxScroll = getMaxScroll();
            if (scroll.squadScrollY < 0) scroll.squadScrollY = 0;
            if (scroll.squadScrollY > maxScroll) scroll.squadScrollY = maxScroll;
        }
        scroll.squadLastTouchY = currentY;
    }

    // 滚动结束
    function handleScrollEnd() {
        var scroll = getUiScrollState();
        scroll.squadLastTouchY = 0;
        var maxScroll = getMaxScroll();
        if (scroll.squadScrollY < 0) scroll.squadScrollY = 0;
        if (scroll.squadScrollY > maxScroll) scroll.squadScrollY = maxScroll;
    }

    // 设置引导高亮
    function setTutorialHighlight(starId) {
        _tutorialHighlightStarId = starId;
    }

    return {
        renderSquad: renderSquad,
        renderPortraitLarge: renderPortraitLarge,
        renderSquadCharacter: renderSquadCharacter,
        renderSquadEquipment: renderSquadEquipment,
        renderSquadSkills: renderSquadSkills,
        renderSquadPets: renderSquadPets,
        renderSquadStars: renderSquadStars,
        handleClick: handleClick,
        handleScrollStart: handleScrollStart,
        handleScrollMove: handleScrollMove,
        handleScrollEnd: handleScrollEnd,
        setTutorialHighlight: setTutorialHighlight
    };
}
export { createSquadRenderer };
