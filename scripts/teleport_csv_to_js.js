/**
 * 传送点配置表 CSV → TeleportConfig.js 转换脚本
 *
 * 用法: node scripts/teleport_csv_to_js.js
 *
 * 流程: Excel 编辑 config/传送点配置表.csv → 保存 → 运行此脚本 → 自动更新 TeleportConfig.js
 */
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'config', '传送点配置表.csv');
const JS_PATH  = path.join(__dirname, '..', 'src', 'config', 'TeleportConfig.js');

function splitLine(line) {
    var fields = []; var cur = ''; var inQ = false;
    for (var j = 0; j < line.length; j++) {
        if (line[j] === '"') inQ = !inQ;
        else if (line[j] === ',' && !inQ) { fields.push(cur); cur = ''; }
        else cur += line[j];
    }
    fields.push(cur);
    return fields;
}

function parseCSV(text) {
    // 移除 BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var lines = text.trim().split('\n');
    var header = splitLine(lines[0]);
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var fields = splitLine(line);
        var row = {};
        for (var k = 0; k < header.length; k++) {
            row[header[k]] = (fields[k] !== undefined) ? fields[k] : '';
        }
        rows.push(row);
    }
    return rows;
}

function numOr(val, fallback) {
    if (val === '' || val === undefined || val === null) return fallback;
    var n = Number(val);
    return isNaN(n) ? fallback : n;
}

function jsStr(s) {
    if (!s) return 'null';
    return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function generateJS(rows) {
    var entries = [];
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var type = row['类型'];
        var id = row['id'];
        var world = row['所在世界'];
        var fx = numOr(row['传送点X'], 0);
        var fy = numOr(row['传送点Y'], 0);
        var toWorld = row['目标世界'];

        if (type === '出生点') {
            entries.push(
                "    { id:'" + id + "', world:'" + world +
                "', x:" + fx + ", y:" + fy + " }"
            );
        } else if (type === '楼层切换') {
            entries.push(
                "    { id:'" + id + "', world:'" + world +
                "', x:" + fx + ", y:" + fy +
                ", tx:" + numOr(row['目标X'], 0) + ", ty:" + numOr(row['目标Y'], 0) +
                ", tf:" + numOr(row['目标楼层'], 0) +
                ", dr:" + numOr(row['发现半径'], 0) + ", ir:" + numOr(row['交互半径'], 0) + ", pr:" + numOr(row['优先级'], 0) + " }"
            );
        } else if (type === '触发线') {
            entries.push(
                "    { id:'" + id + "', world:'" + world +
                "', x1:" + numOr(row['触发线X1'], 0) + ", y1:" + numOr(row['触发线Y1'], 0) +
                ", x2:" + numOr(row['触发线X2'], 0) + ", y2:" + numOr(row['触发线Y2'], 0) +
                ", to:'" + toWorld + "' }"
            );
        } else if (type === '传送门') {
            var sx = numOr(row['落点X'], null);
            var sy = numOr(row['落点Y'], null);
            var exp = numOr(row['需要探索度'], 0);
            var msg = row['锁定提示'] ? jsStr(row['锁定提示']) : 'null';
            var dr = numOr(row['发现半径'], 0);
            var ir = numOr(row['交互半径'], 0);
            var pr = numOr(row['优先级'], 0);
            entries.push(
                "    { id:'" + id + "', world:'" + world +
                "', x:" + fx + ", y:" + fy +
                ", sx:" + (sx !== null ? sx : 'null') + ", sy:" + (sy !== null ? sy : 'null') +
                ", to:'" + toWorld +
                "', exp:" + exp + ", msg:" + msg +
                ", dr:" + dr + ", ir:" + ir + ", pr:" + pr + " }"
            );
        }
    }

    var code = `/**
 * TeleportConfig — 传送点坐标配置表
 *
 * type 说明:
 *   start      — 玩家出生点（首次进入世界时的落点）
 *   teleport   — 同世界内楼层切换，踩到即走
 *   portal     — 跨世界传送门，点击交互
 *   triggerLine — 跨越边界线自动切换世界
 *
 * 字段说明 (缩写对照):
 *   world  = 所在世界       tx/ty = 同世界目标坐标  tf = 目标楼层
 *   x/y    = 传送点位置     sx/sy = 落点坐标覆盖(null=使用目标世界portal位置)
 *   to     = 目标世界       exp   = 需要探索度      msg  = 锁定提示
 *   dr     = discoverRadius ir    = interactRadius  pr   = priority
 *   x1/y1/x2/y2 = 触发线两端坐标 (仅triggerLine)
 */

var TRANSFER_TABLE = [

    // ═══ 玩家出生点 (start) ═══
    //        id                  世界      x    y

    // ═══ 同世界楼层传送 (teleport) ═══
    //        id             世界        x    y    →x   →y  →楼层  发现  交互  优先

    // ═══ 触发线 (triggerLine) ═══
    //        id             世界      x1   y1   x2   y2  →世界

    // ═══ 跨世界传送门 (portal) ═══
    //        id                世界      x     y   落x  落y  →世界       探索  提示                      发现  交互  优先
${entries.map(function(e) { return e + ','; }).join('\n')}
];

function buildTransferDataForWorld(worldId) {
    var entities = [];
    var triggerLines = [];

    var playerStart = null;

    for (var i = 0; i < TRANSFER_TABLE.length; i++) {
        var row = TRANSFER_TABLE[i];
        if (row.world !== worldId) continue;

        if (row.id.indexOf('start_') === 0) {
            // start: 玩家出生点
            playerStart = { x: row.x, y: row.y };
        } else if (row.tf !== undefined) {
            // teleport: 同世界楼层切换
            entities.push({
                id: row.id,
                type: 'teleport',
                x: row.x, y: row.y,
                targetX: row.tx, targetY: row.ty,
                targetFloor: row.tf,
                discoverRadius: row.dr,
                interactRadius: row.ir,
                priority: row.pr,
                once: false
            });
        } else if (row.x1 !== undefined) {
            // triggerLine: 触发线
            triggerLines.push({
                x1: row.x1, y1: row.y1,
                x2: row.x2, y2: row.y2,
                targetWorld: row.to
            });
        } else {
            // portal: 跨世界传送门
            var entity = {
                id: row.id,
                type: 'portal',
                x: row.x, y: row.y,
                targetWorld: row.to,
                discoverRadius: row.dr,
                interactRadius: row.ir,
                priority: row.pr,
                once: false,
                requireExploration: row.exp
            };
            if (row.sx !== null && row.sx !== undefined) entity.spawnX = row.sx;
            if (row.sy !== null && row.sy !== undefined) entity.spawnY = row.sy;
            if (row.msg) entity.lockedMessage = row.msg;
            entities.push(entity);
        }
    }

    return { playerStart: playerStart, entities: entities, triggerLines: triggerLines };
}

export { TRANSFER_TABLE, buildTransferDataForWorld };
`;

    return code;
}

// --- 主流程 ---
var csvRaw = fs.readFileSync(CSV_PATH);
// 自动检测编码：GBK → UTF-8 转换（Windows 环境下 CSV 通常为 GBK）
var iconv = null;
try { iconv = require('iconv-lite'); } catch(e) {}
var csvText;
if (iconv) {
    csvText = iconv.decode(csvRaw, 'gbk');
} else {
    csvText = csvRaw.toString('utf-8');
}
var rows = parseCSV(csvText);
var jsCode = generateJS(rows);
fs.writeFileSync(JS_PATH, jsCode, 'utf-8');

var startCount = rows.filter(r => r['类型'] === '出生点').length;
var teleportCount = rows.filter(r => r['类型'] === '楼层切换').length;
var triggerCount = rows.filter(r => r['类型'] === '触发线').length;
var portalCount = rows.filter(r => r['类型'] === '传送门').length;
console.log('✓ ' + JS_PATH + ' 已更新');
console.log('  出生点: ' + startCount);
console.log('  楼层切换: ' + teleportCount);
console.log('  触发线: ' + triggerCount);
console.log('  传送门: ' + portalCount);
console.log('  总计: ' + rows.length);