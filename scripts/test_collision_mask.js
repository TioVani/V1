/**
 * 碰撞遮罩像素级检测 — 自动化断言测试
 * 运行: node scripts/test_collision_mask.js
 * 验证: RLE 位图构建 → 像素级碰撞检测 → 防卡死 → 配置集成
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PNG_PATH = 'assets/images/worldmap/world_01_F01_coll.png';
const PLAYER_RADIUS = 12;
const MAP_W = 1408, MAP_H = 768;

let _failCount = 0;
function assert(condition, msg) {
    if (!condition) {
        console.log('  FAIL: ' + msg);
        _failCount++;
    } else {
        console.log('  PASS: ' + msg);
    }
}

// ── 模拟碰撞位图构建（和 WorldMapPlayer._decodeRLEBitmap 等价） ──
async function buildBitmapFromPNG(pngPath) {
    const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height;
    const bm = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
        bm[i] = (data[i*4] < 128 && data[i*4+1] < 128 && data[i*4+2] < 128) ? 1 : 0;
    }
    return { width: w, height: h, data: bm };
}

function decodeRLEBitmap(configData) {
    const w = configData.width, h = configData.height;
    const bitmap = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
        const rle = configData.rows[y];
        let pos = 0, pixelIdx = y * w;
        while (pos < rle.length) {
            let numStr = '';
            while (pos < rle.length && rle[pos] >= '0' && rle[pos] <= '9') {
                numStr += rle[pos]; pos++;
            }
            const count = parseInt(numStr, 10);
            const val = rle[pos] === 'B' ? 1 : 0;
            pos++;
            for (let j = 0; j < count && pixelIdx < y * w + w; j++) {
                bitmap[pixelIdx++] = val;
            }
        }
    }
    return { width: w, height: h, data: bitmap };
}

// ── 模拟 checkCollision（像素级圆扫描） ──
function isPixelBlocked(bm, px, py) {
    if (px < 0 || px >= bm.width || py < 0 || py >= bm.height) return true;
    return bm.data[py * bm.width + px] === 1;
}

function checkCollisionBitmap(bm, x, y) {
    const r = PLAYER_RADIUS, rSq = r * r;
    const cx = Math.round(x), cy = Math.round(y);
    for (let py = cy - r; py <= cy + r; py++) {
        const dy = py - cy;
        const maxDx = Math.floor(Math.sqrt(rSq - dy * dy));
        for (let px = cx - maxDx; px <= cx + maxDx; px++) {
            if (isPixelBlocked(bm, px, py)) return true;
        }
    }
    return false;
}

// ── 模拟 _findSafeNear 螺旋扫描 ──
function findSafeNear(bm, cx, cy) {
    const ts = 32, hw = MAP_W, hh = MAP_H;
    const maxR = Math.ceil(Math.max(hw, hh) / ts);
    for (let r = 0; r <= maxR; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const sx = cx + dx * ts + ts / 2;
                const sy = cy + dy * ts + ts / 2;
                if (sx < PLAYER_RADIUS || sx > hw - PLAYER_RADIUS) continue;
                if (sy < PLAYER_RADIUS || sy > hh - PLAYER_RADIUS) continue;
                if (!checkCollisionBitmap(bm, sx, sy)) return { x: sx, y: sy };
            }
        }
    }
    return { x: cx, y: cy };
}

async function run() {
    console.log('=== 碰撞遮罩像素级检测测试 ===\n');

    // 1. PNG 资源验证
    console.log('1. PNG 资源验证:');
    const meta = await sharp(PNG_PATH).metadata();
    assert(meta.width === MAP_W, 'PNG width = ' + MAP_W + ' (got ' + meta.width + ')');
    assert(meta.height === MAP_H, 'PNG height = ' + MAP_H + ' (got ' + meta.height + ')');

    // 2. CollisionBitmapConfig 验证（构建时生成的 RLE 数据）
    console.log('\n2. CollisionBitmapConfig RLE 数据验证:');
    assert(fs.existsSync('src/config/CollisionBitmapConfig.js'), 'CollisionBitmapConfig.js 文件存在');
    // 动态加载生成的配置
    const configModule = fs.readFileSync('src/config/CollisionBitmapConfig.js', 'utf8');
    assert(configModule.indexOf('world_01_F01') !== -1, '包含 world_01_F01 位图数据');
    assert(configModule.indexOf('world_01_F02') !== -1, '包含 world_01_F02 位图数据');
    // 使用 eval 加载（因为是生成文件，没有标准模块格式）
    const evalResult = {};
    (new Function('exports', configModule.replace('export var', 'var')))(evalResult);
    // eval 不易用，直接用 require 替代：先临时转为 CommonJS
    // 实际用 sharp 直接构建来对比
    const bmFromPNG = await buildBitmapFromPNG(PNG_PATH);

    // 3. RLE 解码 vs PNG 原始像素：逐像素对比
    console.log('\n3. RLE 解码 → PNG 原始像素逐像素对比:');
    // 手动从 CollisionBitmapConfig.js 中提取 RLE 数据
    const rleMatch = configModule.match(/world_01_F01:\s*\{[^}]*width:\s*(\d+),\s*height:\s*(\d+),\s*rows:\s*\[([^\]]*)\]/s);
    assert(rleMatch !== null, '能从配置文件提取 world_01_F01 RLE 数据');
    if (rleMatch) {
        const rleWidth = parseInt(rleMatch[1]);
        const rleHeight = parseInt(rleMatch[2]);
        const rleRowsStr = rleMatch[3];
        // 提取各行
        const rowMatches = [];
        const rowRegex = /"(.*?)"/g;
        let m;
        while ((m = rowRegex.exec(rleRowsStr)) !== null) rowMatches.push(m[1]);
        assert(rowMatches.length === rleHeight, 'RLE 行数 = ' + rleHeight + ' (got ' + rowMatches.length + ')');

        const bmFromRLE = decodeRLEBitmap({ width: rleWidth, height: rleHeight, rows: rowMatches });
        assert(bmFromRLE.width === rleWidth && bmFromRLE.height === rleHeight, 'RLE 解码位图尺寸正确');

        // 逐像素对比
        let mismatches = 0;
        for (let i = 0; i < rleWidth * rleHeight; i++) {
            if (bmFromRLE.data[i] !== bmFromPNG.data[i]) mismatches++;
        }
        assert(mismatches === 0, 'RLE 解码与 PNG 原始像素完全一致 (0 差异)');
        console.log('  位图大小: ' + (bmFromRLE.data.length / 1024).toFixed(0) + ' KB');

        // 用 RLE 解码后的位图做后续碰撞测试
        var bm = bmFromRLE;
    } else {
        var bm = bmFromPNG; // fallback
    }

    // 4. 碰撞检测 — 关键位置
    console.log('\n4. 碰撞检测:');
    assert(!checkCollisionBitmap(bm, 215, 750), '出生点 (215,750) 无碰撞');
    assert(checkCollisionBitmap(bm, 0, 0), '左上角 (0,0) 有碰撞');
    assert(checkCollisionBitmap(bm, 5, 400), '左边界 (5,400) 有碰撞');
    assert(checkCollisionBitmap(bm, 1403, 400), '右边界 (1403,400) 有碰撞');

    // 通道边界精度
    let firstBlockedY = -1;
    for (let y = 750; y >= 0; y--) {
        if (checkCollisionBitmap(bm, 215, y)) { firstBlockedY = y; break; }
    }
    assert(firstBlockedY > 0, '向北通道碰撞边界 y=' + firstBlockedY + ' (32px版约718)');

    // 5. 防卡死
    console.log('\n5. 防卡死机制:');
    assert(checkCollisionBitmap(bm, 0, 0), '(0,0) 在碰撞区');
    const safePos = findSafeNear(bm, 215, 750);
    assert(!checkCollisionBitmap(bm, safePos.x, safePos.y), '安全位置 (' + safePos.x + ',' + safePos.y + ') 无碰撞');

    // 6. 配置集成链
    console.log('\n6. 配置集成:');
    const wmc = fs.readFileSync('src/config/WorldMapConfig.js', 'utf8');
    assert(wmc.indexOf('collisionMaskData') !== -1, 'WorldMapConfig 有 collisionMaskData');
    assert(wmc.indexOf('world_01_F01') !== -1, 'collisionMaskData = world_01_F01');

    const wmp = fs.readFileSync('src/systems/worldmap/WorldMapPlayer.js', 'utf8');
    assert(wmp.indexOf('COLLISION_BITMAPS') !== -1, 'WorldMapPlayer 引入 COLLISION_BITMAPS');
    assert(wmp.indexOf('_decodeRLEBitmap') !== -1, 'WorldMapPlayer 包含 _decodeRLEBitmap');
    assert(wmp.indexOf('collisionMaskData') !== -1, 'WorldMapPlayer 使用 collisionMaskData');
    // 确认已移除所有 PNG 加载代码
    assert(wmp.indexOf('_loadCollisionMask') === -1, '已移除 _loadCollisionMask (无 PNG 加载)');
    assert(wmp.indexOf('_extractCollisionBitmap') === -1, '已移除 _extractCollisionBitmap (无 Canvas)');
    assert(wmp.indexOf('fetch') === -1, '已移除 fetch (无异步)');
    assert(wmp.indexOf('getImageData') === -1, '已移除 getImageData (无 CORS)');
    assert(wmp.indexOf('getAsset') === -1, '已移除 getAsset 依赖');

    const wms = fs.readFileSync('src/systems/WorldMapSystem.js', 'utf8');
    assert(wms.indexOf('getAsset') === -1, 'WorldMapSystem 无 getAsset 依赖');

    // 结果汇总
    console.log('\n=== 测试结果 ===');
    if (_failCount === 0) {
        console.log('全部通过 ✓');
    } else {
        console.log('失败: ' + _failCount + ' 项');
        process.exit(1);
    }
}

run();