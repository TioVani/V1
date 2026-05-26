/**
 * generate_collision_data.js — 从 PNG 遮罩预计算 RLE 位图数据
 * 支持碰撞遮罩（黑色=碰撞）和透明遮罩（白色=遮挡）
 * 输出: src/config/CollisionBitmapConfig.js
 * 用法: node scripts/generate_collision_data.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const MASKS = [
    { worldId: 'world_01_F01', src: 'assets/images/worldmap/world_01_F01_coll.png', type: 'collision' },
    { worldId: 'world_01_F02', src: 'assets/images/worldmap/world_01_F02_coll.png', type: 'collision' },
    { worldId: 'world_01_T01', src: 'assets/images/worldmap/world_01_T01_tran.png', type: 'transparency' },
    { worldId: 'world_01_T02', src: 'assets/images/worldmap/world_01_T02_tran.png', type: 'transparency' },
    { worldId: 'world_02_F01', src: 'assets/images/worldmap/world_02_F01_coll.png', type: 'collision' },
    { worldId: 'world_02_T01', src: 'assets/images/worldmap/world_02_T01_tran.png', type: 'transparency' },
    { worldId: 'world_05_F01', src: 'assets/images/worldmap/world_05_F01_coll.png', type: 'collision' },
    { worldId: 'world_05_T01', src: 'assets/images/worldmap/world_05_T01_tran.png', type: 'transparency' },
];

async function processMask(maskDef) {
    const { data, info } = await sharp(maskDef.src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height;

    // 碰撞遮罩：黑色像素=碰撞(B)；透明遮罩：白色像素=遮挡(B)
    const isBlocked = maskDef.type === 'collision'
        ? (r, g, b) => r < 128 && g < 128 && b < 128
        : (r, g, b) => r > 200 && g > 200 && b > 200;

    const rows = [];
    for (let y = 0; y < h; y++) {
        let rle = '';
        let count = 1;
        let prev = isBlocked(data[y * w * 4], data[y * w * 4 + 1], data[y * w * 4 + 2]) ? 1 : 0;
        for (let x = 1; x < w; x++) {
            const cur = isBlocked(data[(y * w + x) * 4], data[(y * w + x) * 4 + 1], data[(y * w + x) * 4 + 2]) ? 1 : 0;
            if (cur === prev) {
                count++;
            } else {
                rle += count + (prev ? 'B' : 'O');
                count = 1;
                prev = cur;
            }
        }
        rle += count + (prev ? 'B' : 'O');
        rows.push(rle);
    }

    // 验证 RLE 解码回环
    let mismatches = 0;
    for (let y = 0; y < h; y++) {
        let decoded = [];
        let pos = 0;
        while (pos < rows[y].length) {
            let numStr = '';
            while (pos < rows[y].length && rows[y][pos] >= '0' && rows[y][pos] <= '9') {
                numStr += rows[y][pos]; pos++;
            }
            const count2 = parseInt(numStr);
            const val = rows[y][pos] === 'B' ? 1 : 0;
            pos++;
            for (let j = 0; j < count2; j++) decoded.push(val);
        }
        for (let x = 0; x < w; x++) {
            const expected = isBlocked(data[(y * w + x) * 4], data[(y * w + x) * 4 + 1], data[(y * w + x) * 4 + 2]) ? 1 : 0;
            if (decoded[x] !== expected) mismatches++;
        }
    }
    if (mismatches > 0) {
        console.error('  ❌ ' + maskDef.worldId + ': RLE decode mismatch (' + mismatches + ' pixels)');
        return null;
    }

    const totalRleSize = rows.reduce((sum, r) => sum + r.length, 0);
    console.log('  ✅ ' + maskDef.worldId + ' [' + maskDef.type + ']: ' + w + 'x' + h + ', RLE ' + totalRleSize + ' chars');
    return { worldId: maskDef.worldId, width: w, height: h, rows };
}

async function run() {
    console.log('从 PNG 遮罩生成 RLE 位图数据...');
    const entries = {};
    for (const mask of MASKS) {
        if (!fs.existsSync(mask.src)) {
            console.log('  ⏭ ' + mask.worldId + ': PNG 不存在，跳过');
            continue;
        }
        const result = await processMask(mask);
        if (result) entries[result.worldId] = result;
    }

    const entryKeys = Object.keys(entries);
    const exportsList = entryKeys.map(k => k + ': { width: ' + entries[k].width + ', height: ' + entries[k].height + ', rows: [\n' +
        entries[k].rows.map(r => '            "' + r + '"').join(',\n') + '\n        ] }');

    const jsContent = `/**
 * CollisionBitmapConfig — 从 PNG 遮罩预计算的位图数据
 * RLE 格式：每行 'countB'/'countO' 编码
 * 碰撞遮罩: B=碰撞(黑), O=通行(白/透明)
 * 透明遮罩: B=遮挡(白), O=正常(黑/透明)
 * 运行时解码为 Uint8Array，无需加载 PNG，无 CORS 问题
 * 由 scripts/generate_collision_data.js 生成，不要手动编辑
 */
export var COLLISION_BITMAPS = {
    ${exportsList.join(',\n    ')}
};
`;

    fs.writeFileSync('src/config/CollisionBitmapConfig.js', jsContent);
    console.log('\n完成！生成 CollisionBitmapConfig.js');
}

run();