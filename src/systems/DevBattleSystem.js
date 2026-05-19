/**
 * DevBattleSystem — 开发者战斗调参工具
 *
 * 在游戏中叠加显示当前战斗配置、diff、弱校验警告。
 * 支持参数组切换、实时调整、导出 overrides。
 *
 * 启用方式：game.js 中调用 devBattleSystem.toggle()
 */

import Logger from '../utils/Logger.js';
import {
    COMBAT_SPEC, COMBAT_FEATURES,
    specResolver, getSpecValue, getWeakWarnings
} from '../config/CombatSpec.js';

function createDevBattleSystem(deps) {

    var getScreenWidth = deps.getScreenWidth;
    var getScreenHeight = deps.getScreenHeight;
    var getScreenScale = deps.getScreenScale;
    var getBattleEngine = deps.getBattleEngine;
    var onToggle = deps.onToggle || null;
    var onSpecChanged = deps.onSpecChanged || null;

    // ─── 状态 ───
    var visible = false;
    var activeGroupIndex = 0;
    var scrollY = 0;
    var lastContentH = 0;

    // ─── 参数组定义 ───
    var GROUPS = [
        { key: 'OVERVIEW', label: '总览', params: [] },
        { key: 'STAR', label: '星星', params: [
            { path: 'STAR.SPAWN_INTERVAL_MS', label: '生成间隔 ms', min: 100, max: 2000, step: 50 },
            { path: 'STAR.LIFETIME_MS', label: '存活时间 ms', min: 500, max: 5000, step: 100 },
            { path: 'STAR.MAX_ON_SCREEN', label: '最大同屏数', min: 1, max: 15, step: 1 },
            { path: 'STAR.SIZE', label: '星星尺寸', min: 20, max: 100, step: 4 },
            { path: 'STAR.OVERLAP_MULT', label: '重叠倍率', min: 1, max: 4, step: 0.1 }
        ]},
        { key: 'COMBAT', label: '战斗', params: [
            { path: 'COMBAT.TIME_LIMIT_S', label: '时间限制 s', min: 10, max: 120, step: 5 },
            { path: 'COMBAT.TIME_DAMAGE_ON_HIT_S', label: '受击扣时 s', min: 1, max: 20, step: 1 },
            { path: 'COMBAT.TIME_TICK_MS', label: '时间 tick ms', min: 500, max: 2000, step: 100 }
        ]},
        { key: 'COMBO', label: '连击', params: [
            { path: 'COMBO.TIMEOUT_MS', label: '超时 ms', min: 500, max: 5000, step: 100 },
            { path: 'COMBO.MULTIPLIER', label: '倍率', min: 0.01, max: 0.5, step: 0.01 },
            { path: 'COMBO.STAR_DURATION_MS', label: '连击星持续 ms', min: 1000, max: 15000, step: 500 },
            { path: 'COMBO.STAR_ATTACK_INTERVAL_MS', label: '连击星间隔 ms', min: 50, max: 1000, step: 50 }
        ]},
        { key: 'DAMAGE', label: '伤害', params: [
            { path: 'DAMAGE.BASE', label: '基础伤害', min: 5, max: 100, step: 5 },
            { path: 'DAMAGE.PER_FLOOR', label: '每层加成', min: 0, max: 30, step: 1 }
        ]},
        { key: 'QUICK_TAP', label: '速点', params: [
            { path: 'QUICK_TAP.THRESHOLD_MS', label: '超速阈值 ms', min: 50, max: 500, step: 25 },
            { path: 'QUICK_TAP.WINDOW_MS', label: '快速窗口 ms', min: 100, max: 1000, step: 25 }
        ]},
        { key: 'SPECIAL_STARS', label: '特星', params: [
            { path: 'SPECIAL_STARS.HEAL_HP', label: '治疗量', min: 5, max: 50, step: 5 },
            { path: 'SPECIAL_STARS.SHIELD_AMOUNT', label: '护盾量', min: 5, max: 50, step: 5 },
            { path: 'SPECIAL_STARS.TIME_SECONDS', label: '加时 s', min: 1, max: 15, step: 1 },
            { path: 'SPECIAL_STARS.UNLUCKY_HP_COST', label: '厄运扣血', min: 1, max: 20, step: 1 },
            { path: 'SPECIAL_STARS.GREEDY_HP_COST', label: '贪婪扣血', min: 0, max: 10, step: 1 },
            { path: 'SPECIAL_STARS.DODGE_DURATION_MS', label: '闪避 ms', min: 200, max: 3000, step: 100 },
            { path: 'SPECIAL_STARS.DODGE_COUNTER_MULT', label: '反击倍率', min: 0.1, max: 2, step: 0.1 }
        ]},
        { key: 'MONSTER', label: '怪物', params: [
            { path: 'MONSTER.ATTACK_INTERVAL_MS', label: '攻击间隔 ms', min: 500, max: 5000, step: 100 }
        ]},
        { key: 'STATUS', label: '状态', params: [
            { path: 'STATUS.POISON_TICK_MS', label: '中毒 tick ms', min: 200, max: 3000, step: 100 }
        ]},
        { key: 'DIFF', label: '差异', params: [] },
        { key: 'WARN', label: '弱校验', params: [] }
    ];

    // ─── 运行时调整值（null = 使用基线） ───
    var liveOverrides = {};

    // ─── 获取当前 RC ───
    function getCurrentRC() {
        var engine = getBattleEngine();
        if (engine && engine.getEffectiveSpec) {
            var spec = engine.getEffectiveSpec();
            if (spec) return spec;
        }
        return specResolver(COMBAT_SPEC, liveOverrides);
    }

    function getCurrentRF() {
        var engine = getBattleEngine();
        if (engine && engine.getFeatures) {
            var features = engine.getFeatures();
            if (features) return features;
        }
        return COMBAT_FEATURES;
    }

    // ─── 获取 diff ───
    function getDiff() {
        var diffs = [];
        var RC = getCurrentRC();
        for (var g = 0; g < GROUPS.length; g++) {
            var group = GROUPS[g];
            if (!group.params || group.params.length === 0) continue;
            for (var p = 0; p < group.params.length; p++) {
                var param = group.params[p];
                var currentVal = getSpecValue(RC, param.path);
                var baselineVal = getSpecValue(COMBAT_SPEC, param.path);
                if (currentVal !== baselineVal) {
                    diffs.push({
                        path: param.path,
                        label: param.label,
                        baseline: baselineVal,
                        current: currentVal,
                        delta: currentVal - baselineVal
                    });
                }
            }
        }
        return diffs;
    }

    // ─── 获取警告 ───
    function getWarnings() {
        return getWeakWarnings(getCurrentRC());
    }

    // ─── 导出 overrides ───
    function exportOverrides() {
        var RC = getCurrentRC();
        var overrides = {};
        for (var g = 0; g < GROUPS.length; g++) {
            var group = GROUPS[g];
            if (!group.params || group.params.length === 0) continue;
            for (var p = 0; p < group.params.length; p++) {
                var param = group.params[p];
                var currentVal = getSpecValue(RC, param.path);
                var baselineVal = getSpecValue(COMBAT_SPEC, param.path);
                if (currentVal !== baselineVal) {
                    var parts = param.path.split('.');
                    if (!overrides[parts[0]]) overrides[parts[0]] = {};
                    var exportVal = (typeof currentVal === 'number' && currentVal % 1 !== 0)
                        ? parseFloat(currentVal.toFixed(4))
                        : currentVal;
                    overrides[parts[0]][parts[1]] = exportVal;
                }
            }
        }
        return overrides;
    }

    // ─── 切换显示 ───
    function toggle() {
        visible = !visible;
        scrollY = 0;
        if (onToggle) onToggle(visible);
        Logger.info('DevBattleSystem:', visible ? '显示' : '隐藏');
    }

    function isVisible() { return visible; }

    // ─── 渲染 ───
    function render(ctx) {
        if (!visible) return;

        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var scale = getScreenScale();
        var RC = getCurrentRC();

        // 半透明背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, sw, sh);

        // 面板
        var panelX = Math.floor(10 * scale);
        var panelY = Math.floor(10 * scale);
        var panelW = sw - Math.floor(20 * scale);
        var panelH = sh - Math.floor(20 * scale);

        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = Math.floor(2 * scale);
        ctx.beginPath();
        var cr = Math.floor(8 * scale);
        ctx.moveTo(panelX + cr, panelY);
        ctx.lineTo(panelX + panelW - cr, panelY);
        ctx.quadraticCurveTo(panelX + panelW, panelY, panelX + panelW, panelY + cr);
        ctx.lineTo(panelX + panelW, panelY + panelH - cr);
        ctx.quadraticCurveTo(panelX + panelW, panelY + panelH, panelX + panelW - cr, panelY + panelH);
        ctx.lineTo(panelX + cr, panelY + panelH);
        ctx.quadraticCurveTo(panelX, panelY + panelH, panelX, panelY + panelH - cr);
        ctx.lineTo(panelX, panelY + cr);
        ctx.quadraticCurveTo(panelX, panelY, panelX + cr, panelY);
        ctx.fill();
        ctx.stroke();

        // 标题
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.floor(16 * scale) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('[DevBattle] 战斗参数调试', Math.floor((panelX + panelW + closeBtnX + closeBtnSize) / 2), panelY + Math.floor(10 * scale));

        // 关闭按钮（左上角）
        var closeBtnSize = Math.floor(24 * scale);
        var closeBtnX = panelX + Math.floor(6 * scale);
        var closeBtnY = panelY + Math.floor(6 * scale);
        ctx.fillStyle = '#553333';
        ctx.fillRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize);
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold ' + Math.floor(14 * scale) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('X', Math.floor(closeBtnX + closeBtnSize / 2), Math.floor(closeBtnY + closeBtnSize / 2));

        // 分组标签
        var tabY = panelY + Math.floor(30 * scale);
        var tabH = Math.floor(24 * scale);
        var tabW = Math.floor(panelW / GROUPS.length);
        ctx.font = Math.floor(9 * scale) + 'px monospace';
        for (var ti = 0; ti < GROUPS.length; ti++) {
            var tabX = panelX + ti * tabW;
            var isActive = ti === activeGroupIndex;
            ctx.fillStyle = isActive ? '#FFD700' : '#333355';
            ctx.fillRect(tabX + 1, tabY, tabW - 2, tabH);
            ctx.fillStyle = isActive ? '#000000' : '#aaaaaa';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(GROUPS[ti].label, Math.floor(tabX + tabW / 2), Math.floor(tabY + tabH / 2));
        }

        // 内容区域
        var contentY = tabY + tabH + Math.floor(8 * scale);
        var contentH = panelH - (contentY - panelY) - Math.floor(40 * scale);
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX, contentY, panelW, contentH);
        ctx.clip();

        var activeGroup = GROUPS[activeGroupIndex];
        var renderedH = 0;

        if (activeGroup.key === 'OVERVIEW') {
            renderedH = renderOverviewContent(ctx, panelX, contentY + scrollY, panelW, scale);
        } else if (activeGroup.key === 'DIFF') {
            renderedH = renderDiffContent(ctx, panelX, contentY + scrollY, panelW, scale);
        } else if (activeGroup.key === 'WARN') {
            renderedH = renderWarnContent(ctx, panelX, contentY + scrollY, panelW, scale);
        } else {
            renderedH = renderParamContent(ctx, RC, activeGroup, panelX, contentY + scrollY, panelW, scale);
        }
        lastContentH = renderedH;

        ctx.restore();

        // 滚动按钮（右侧边缘，内容超出时显示）
        var scrollBtnSize = Math.floor(20 * scale);
        var scrollBtnX = panelX + panelW - scrollBtnSize - Math.floor(4 * scale);
        if (scrollY < 0) {
            var scrollUpY = contentY + Math.floor(2 * scale);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.fillRect(scrollBtnX, scrollUpY, scrollBtnSize, scrollBtnSize);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold ' + Math.floor(14 * scale) + 'px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▲', scrollBtnX + scrollBtnSize / 2, scrollUpY + scrollBtnSize / 2);
        }
        if (lastContentH > contentH) {
            var scrollDownY = contentY + contentH - scrollBtnSize - Math.floor(2 * scale);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.fillRect(scrollBtnX, scrollDownY, scrollBtnSize, scrollBtnSize);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold ' + Math.floor(14 * scale) + 'px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▼', scrollBtnX + scrollBtnSize / 2, scrollDownY + scrollBtnSize / 2);
        }

        // 底部操作栏
        var bottomY = panelY + panelH - Math.floor(32 * scale);
        ctx.fillStyle = '#FFD700';
        ctx.font = Math.floor(12 * scale) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        var diffCount = getDiff().length;
        var warnCount = getWarnings().length;
        ctx.fillStyle = '#888888';
        ctx.fillText('diff:' + diffCount + ' warn:' + warnCount + ' | 点击[-][+]调整 | 切tab翻页', Math.floor(sw / 2), bottomY);
    }

    function renderParamContent(ctx, RC, group, x, y, w, scale) {
        var lineH = Math.floor(28 * scale);
        var halfLineH = Math.floor(lineH / 2);
        var fontSize = Math.floor(12 * scale);
        ctx.font = fontSize + 'px monospace';

        for (var i = 0; i < group.params.length; i++) {
            var param = group.params[i];
            var paramY = y + i * lineH;
            var currentVal = getSpecValue(RC, param.path);
            var baselineVal = getSpecValue(COMBAT_SPEC, param.path);
            var isChanged = currentVal !== baselineVal;

            // 标签
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isChanged ? '#FFD700' : '#cccccc';
            ctx.fillText(param.label, x + Math.floor(8 * scale), Math.floor(paramY + halfLineH));

            // [-] 按钮
            var btnSize = Math.floor(22 * scale);
            var halfBtnSize = Math.floor(btnSize / 2);
            var minusBtnX = x + w - Math.floor(120 * scale);
            ctx.fillStyle = '#553333';
            ctx.fillRect(minusBtnX, paramY + Math.floor(3 * scale), btnSize, lineH - Math.floor(6 * scale));
            ctx.fillStyle = '#ff6b6b';
            ctx.textAlign = 'center';
            ctx.fillText('-', Math.floor(minusBtnX + halfBtnSize), Math.floor(paramY + halfLineH));

            // 值
            var valX = minusBtnX + btnSize + Math.floor(5 * scale);
            ctx.fillStyle = isChanged ? '#00ff88' : '#ffffff';
            var displayVal = (typeof currentVal === 'number' && currentVal % 1 !== 0) ? currentVal.toFixed(2) : currentVal;
            ctx.fillText(displayVal, valX + Math.floor(25 * scale), Math.floor(paramY + halfLineH));

            // [+] 按钮
            var plusBtnX = x + w - Math.floor(40 * scale);
            ctx.fillStyle = '#335533';
            ctx.fillRect(plusBtnX, paramY + Math.floor(3 * scale), btnSize, lineH - Math.floor(6 * scale));
            ctx.fillStyle = '#00ff88';
            ctx.fillText('+', Math.floor(plusBtnX + halfBtnSize), Math.floor(paramY + halfLineH));

            // 基线对比
            if (isChanged) {
                ctx.fillStyle = '#666666';
                ctx.font = Math.floor(9 * scale) + 'px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('(base:' + baselineVal + ')', minusBtnX - Math.floor(4 * scale), Math.floor(paramY + halfLineH));
                ctx.font = fontSize + 'px monospace';
            }
        }
        return group.params.length * lineH;
    }

    function renderOverviewContent(ctx, x, y, w, scale) {
        var RC = getCurrentRC();
        var RF = getCurrentRF();
        var lineH = Math.floor(22 * scale);
        var fontSize = Math.floor(12 * scale);
        var curY = y;

        // ─── 当前模式参数 ───
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + fontSize + 'px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('当前参数', x + Math.floor(8 * scale), curY);
        curY += lineH + Math.floor(2 * scale);

        ctx.font = fontSize + 'px monospace';
        var groups = ['STAR', 'COMBAT', 'COMBO', 'QUICK_TAP', 'DAMAGE', 'MONSTER', 'SPECIAL_STARS', 'STATUS', 'VFX'];
        for (var gi = 0; gi < groups.length; gi++) {
            var gKey = groups[gi];
            var gObj = RC[gKey];
            if (!gObj || typeof gObj !== 'object') continue;

            // 组名
            ctx.fillStyle = '#8888ff';
            ctx.fillText(gKey + ':', x + Math.floor(8 * scale), curY);
            curY += lineH;

            // 组内参数
            for (var pk in gObj) {
                if (!gObj.hasOwnProperty(pk)) continue;
                var val = gObj[pk];
                var baseVal = getSpecValue(COMBAT_SPEC, gKey + '.' + pk);
                var changed = val !== baseVal;

                ctx.fillStyle = changed ? '#FFD700' : '#cccccc';
                var displayVal = (typeof val === 'number' && val % 1 !== 0) ? val.toFixed(2) : val;
                var line = '  ' + pk + ': ' + displayVal;
                if (changed) line += '  (base:' + baseVal + ')';
                ctx.fillText(line, x + Math.floor(12 * scale), curY);
                curY += lineH;
            }
        }

        curY += Math.floor(6 * scale);

        // ─── 当前特性 ───
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + fontSize + 'px monospace';
        ctx.fillText('当前特性', x + Math.floor(8 * scale), curY);
        curY += lineH + Math.floor(2 * scale);

        ctx.font = fontSize + 'px monospace';
        for (var fk in RF) {
            if (!RF.hasOwnProperty(fk)) continue;
            var fv = RF[fk];
            var baseFv = COMBAT_FEATURES[fk];
            var fChanged = fv !== baseFv;

            ctx.fillStyle = fChanged ? '#FFD700' : (fv === true || fv === 'full' || fv === 'standard') ? '#00ff88' : '#ff6b6b';
            var fLine = fk + ': ' + fv;
            if (fChanged) fLine += '  (base:' + baseFv + ')';
            ctx.fillText('  ' + fLine, x + Math.floor(12 * scale), curY);
            curY += lineH;
        }
        return curY - y;
    }

    function renderDiffContent(ctx, x, y, w, scale) {
        var diffs = getDiff();
        var lineH = Math.floor(24 * scale);
        var halfLineH = Math.floor(lineH / 2);
        var fontSize = Math.floor(12 * scale);
        ctx.font = fontSize + 'px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        if (diffs.length === 0) {
            ctx.fillStyle = '#00ff88';
            ctx.fillText('无差异 — 当前配置与基线一致', x + Math.floor(8 * scale), Math.floor(y + lineH));
            return lineH * 2;
        }

        for (var i = 0; i < diffs.length; i++) {
            var d = diffs[i];
            var dy = y + i * lineH;
            var sign = d.delta > 0 ? '+' : '';
            ctx.fillStyle = d.delta > 0 ? '#ff6b6b' : '#00ff88';
            ctx.fillText(d.path + ': ' + d.baseline + ' -> ' + d.current + ' (' + sign + d.delta + ')', x + Math.floor(8 * scale), Math.floor(dy + halfLineH));
        }

        // 导出 JSON
        var exportY = Math.floor(y + diffs.length * lineH + Math.floor(16 * scale));
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + fontSize + 'px monospace';
        ctx.fillText('overrides:', x + Math.floor(8 * scale), exportY);
        ctx.font = Math.floor(10 * scale) + 'px monospace';
        ctx.fillStyle = '#aaaaaa';
        try {
            var json = JSON.stringify(exportOverrides());
            var lines = 1;
            var charW = Math.floor(6 * scale);
            var usableW = w - Math.floor(16 * scale);
            var charsPerLine = Math.max(1, Math.floor(usableW / charW));
            lines = Math.ceil(json.length / charsPerLine);
            for (var li = 0; li < Math.min(lines, 8); li++) {
                var start = li * charsPerLine;
                var chunk = json.substring(start, start + charsPerLine);
                ctx.fillText(chunk, x + Math.floor(8 * scale), Math.floor(exportY + (li + 1) * lineH));
            }
        } catch (e) {
            ctx.fillText('export error', x + Math.floor(8 * scale), Math.floor(exportY + lineH));
        }
        return (exportY - y) + Math.min(lines || 1, 8) * lineH + lineH;
    }

    function renderWarnContent(ctx, x, y, w, scale) {
        var warnings = getWarnings();
        var lineH = Math.floor(24 * scale);
        var halfLineH = Math.floor(lineH / 2);
        var fontSize = Math.floor(12 * scale);
        ctx.font = fontSize + 'px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        if (warnings.length === 0) {
            ctx.fillStyle = '#00ff88';
            ctx.fillText('无弱校验警告 — 配置合理', x + Math.floor(8 * scale), Math.floor(y + lineH));
        } else {
            for (var i = 0; i < warnings.length; i++) {
                ctx.fillStyle = '#ff9900';
                ctx.fillText('!' + warnings[i], x + Math.floor(8 * scale), Math.floor(y + i * lineH + halfLineH));
            }
        }

        // 特性列表
        var RF = getCurrentRF();
        var featY = Math.floor(y + (Math.max(warnings.length, 1) + 2) * lineH);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + fontSize + 'px monospace';
        ctx.fillText('当前特性:', x + Math.floor(8 * scale), featY);
        ctx.font = Math.floor(10 * scale) + 'px monospace';
        var fi = 0;
        for (var fk in RF) {
            if (!RF.hasOwnProperty(fk)) continue;
            var fv = RF[fk];
            ctx.fillStyle = (fv === true || fv === 'full' || fv === 'standard') ? '#00ff88' : '#ff6b6b';
            ctx.fillText(fk + ': ' + fv, x + Math.floor(8 * scale), Math.floor(featY + (fi + 1) * Math.floor(18 * scale)));
            fi++;
        }
        return (featY - y) + (fi + 1) * Math.floor(18 * scale) + lineH;
    }

    // ─── 触控处理 ───
    function handleTouch(x, y) {
        if (!visible) return false;

        var sw = getScreenWidth();
        var sh = getScreenHeight();
        var scale = getScreenScale();
        var panelX = Math.floor(10 * scale);
        var panelY = Math.floor(10 * scale);
        var panelW = sw - Math.floor(20 * scale);
        var panelH = sh - Math.floor(20 * scale);

        // 关闭按钮（左上角）
        var closeBtnSize = Math.floor(24 * scale);
        var closeBtnX = panelX + Math.floor(6 * scale);
        var closeBtnY = panelY + Math.floor(6 * scale);
        if (x >= closeBtnX && x <= closeBtnX + closeBtnSize &&
            y >= closeBtnY && y <= closeBtnY + closeBtnSize) {
            toggle();
            return true;
        }

        // 分组标签点击
        var tabY = panelY + Math.floor(30 * scale);
        var tabH = Math.floor(24 * scale);
        var tabW = Math.floor(panelW / GROUPS.length);
        if (y >= tabY && y <= tabY + tabH) {
            var tabIndex = Math.floor((x - panelX) / tabW);
            if (tabIndex >= 0 && tabIndex < GROUPS.length) {
                activeGroupIndex = tabIndex;
                scrollY = 0;
                return true;
            }
        }

        // [-][+] 按钮点击（仅在参数组页面）
        var activeGroup = GROUPS[activeGroupIndex];
        if (activeGroup.params && activeGroup.params.length > 0) {
            var RC = getCurrentRC();
            var contentAreaY = tabY + tabH + Math.floor(8 * scale);
            var contentAreaH = panelH - (contentAreaY - panelY) - Math.floor(40 * scale);
            var lineH = Math.floor(28 * scale);
            var btnSize = Math.floor(22 * scale);
            var minusBtnX = panelX + panelW - Math.floor(120 * scale);
            var plusBtnX = panelX + panelW - Math.floor(40 * scale);

            for (var i = 0; i < activeGroup.params.length; i++) {
                var paramY = contentAreaY + scrollY + i * lineH;
                // 跳过不可见区域外的按钮
                if (paramY + lineH < contentAreaY || paramY > contentAreaY + contentAreaH) continue;
                if (y >= paramY + Math.floor(3 * scale) && y <= paramY + lineH - Math.floor(3 * scale)) {
                    var param = activeGroup.params[i];
                    var currentVal = getSpecValue(RC, param.path);

                    // [-] 按钮
                    if (x >= minusBtnX && x <= minusBtnX + btnSize) {
                        adjustParam(param.path, currentVal - param.step, param);
                        return true;
                    }
                    // [+] 按钮
                    if (x >= plusBtnX && x <= plusBtnX + btnSize) {
                        adjustParam(param.path, currentVal + param.step, param);
                        return true;
                    }
                }
            }
        }

        // 滚动按钮
        var contentAreaTop = tabY + tabH + Math.floor(8 * scale);
        var contentAreaHeight = panelH - (contentAreaTop - panelY) - Math.floor(40 * scale);
        var scrollBtnSize = Math.floor(20 * scale);
        var scrollBtnX = panelX + panelW - scrollBtnSize - Math.floor(4 * scale);
        var scrollStep = Math.floor(60 * scale);
        // ▲ 上滚
        if (scrollY < 0) {
            var scrollUpBtnY = contentAreaTop + Math.floor(2 * scale);
            if (x >= scrollBtnX && x <= scrollBtnX + scrollBtnSize &&
                y >= scrollUpBtnY && y <= scrollUpBtnY + scrollBtnSize) {
                scrollY = Math.min(0, scrollY + scrollStep);
                return true;
            }
        }
        // ▼ 下滚
        if (lastContentH > contentAreaHeight) {
            var scrollDownBtnY = contentAreaTop + contentAreaHeight - scrollBtnSize - Math.floor(2 * scale);
            if (x >= scrollBtnX && x <= scrollBtnX + scrollBtnSize &&
                y >= scrollDownBtnY && y <= scrollDownBtnY + scrollBtnSize) {
                var maxScroll = -(lastContentH - contentAreaHeight);
                scrollY = Math.max(maxScroll, scrollY - scrollStep);
                return true;
            }
        }

        // 点击面板外关闭
        if (x < panelX || x > panelX + panelW || y < panelY || y > panelY + panelH) {
            toggle();
            return true;
        }

        return true; // 消费所有触摸
    }

    function adjustParam(path, newValue, param) {
        newValue = Math.round((newValue / param.step)) * param.step;
        newValue = Math.max(param.min, Math.min(param.max, newValue));
        var baselineVal = getSpecValue(COMBAT_SPEC, path);
        if (Math.abs(newValue - baselineVal) < 1e-9) {
            // 移除 override，回到基线
            var parts = path.split('.');
            if (liveOverrides[parts[0]]) {
                delete liveOverrides[parts[0]][parts[1]];
                if (Object.keys(liveOverrides[parts[0]]).length === 0) {
                    delete liveOverrides[parts[0]];
                }
            }
        } else {
            var p = path.split('.');
            if (!liveOverrides[p[0]]) liveOverrides[p[0]] = {};
            liveOverrides[p[0]][p[1]] = newValue;
        }

        Logger.info('[DevBattle] ' + path + ' = ' + newValue +
            (newValue === baselineVal ? ' (baseline)' : ' (delta: ' + (newValue - baselineVal) + ')'));

        // 实时推送到 BattleEngine
        pushToEngine();
    }

    function pushToEngine() {
        var engine = getBattleEngine();
        if (engine && engine.updateSpec && engine.getEffectiveSpec()) {
            var overrides = Object.keys(liveOverrides).length > 0 ? liveOverrides : null;
            engine.updateSpec(overrides);
        }
        if (onSpecChanged) onSpecChanged(liveOverrides);
    }

    // ─── 重置 ───
    function resetToBaseline() {
        liveOverrides = {};
        pushToEngine();
        Logger.info('[DevBattle] 已重置为基线配置');
    }

    // ─── 应用到 BattleEngine ───
    function applyToEngine() {
        var engine = getBattleEngine();
        if (!engine) {
            Logger.error('[DevBattle] 无可用 BattleEngine');
            return;
        }
        pushToEngine();
        Logger.info('[DevBattle] 已应用 overrides:', JSON.stringify(liveOverrides));
        return liveOverrides;
    }

    return {
        toggle: toggle,
        isVisible: isVisible,
        render: render,
        handleTouch: handleTouch,
        getDiff: getDiff,
        getWarnings: getWarnings,
        exportOverrides: exportOverrides,
        resetToBaseline: resetToBaseline,
        applyToEngine: applyToEngine,
        getOverrides: function() { return liveOverrides; }
    };
}

export { createDevBattleSystem };
