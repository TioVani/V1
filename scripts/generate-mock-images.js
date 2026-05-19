/**
 * 生成游戏所需的占位图片素材
 * 使用纯 Node.js（无外部依赖），通过 PNG 原始编码 + zlib 压缩生成
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ==================== PNG 编码 ====================

function createPNG(width, height, r, g, b, a, label) {
    // 创建 RGBA 像素数据
    const rawData = Buffer.alloc((width * 4 + 1) * height);  // +1 for filter byte per row
    for (let y = 0; y < height; y++) {
        const rowOffset = y * (width * 4 + 1);
        rawData[rowOffset] = 0; // filter: none
        for (let x = 0; x < width; x++) {
            const px = rowOffset + 1 + x * 4;
            // 简单渐变 + 边框效果
            const edgeDist = Math.min(x, y, width - 1 - x, height - 1 - y);
            const borderAlpha = edgeDist < 3 ? 0.6 : 1;
            const centerX = width / 2;
            const centerY = height / 2;
            const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) / Math.max(width, height) * 2;
            const glow = Math.max(0, 1 - distFromCenter) * 0.15;

            rawData[px] = Math.min(255, Math.floor(r * (1 + glow)));
            rawData[px + 1] = Math.min(255, Math.floor(g * (1 + glow)));
            rawData[px + 2] = Math.min(255, Math.floor(b * (1 + glow)));
            rawData[px + 3] = Math.floor(a * borderAlpha * 255);
        }
    }

    // 如果有 label，用简单的方式在中央画一个标记（只对较大图标）
    if (label && width >= 48 && height >= 48) {
        // 在中央画一个亮色圆点
        const cx = Math.floor(width / 2);
        const cy = Math.floor(height / 2);
        const dotR = Math.floor(Math.min(width, height) * 0.2);
        for (let y = Math.max(0, cy - dotR); y < Math.min(height, cy + dotR); y++) {
            const rowOffset = y * (width * 4 + 1);
            for (let x = Math.max(0, cx - dotR); x < Math.min(width, cx + dotR); x++) {
                const dx = x - cx, dy = y - cy;
                if (dx * dx + dy * dy <= dotR * dotR) {
                    const px = rowOffset + 1 + x * 4;
                    rawData[px] = 255;
                    rawData[px + 1] = 255;
                    rawData[px + 2] = 255;
                    rawData[px + 3] = 200;
                }
            }
        }
    }

    // 压缩
    const compressed = zlib.deflateSync(rawData);

    // 构建 PNG
    const chunks = [];

    // 签名
    chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type: RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace
    chunks.push(createChunk('IHDR', ihdr));

    // IDAT
    chunks.push(createChunk('IDAT', compressed));

    // IEND
    chunks.push(createChunk('IEND', Buffer.alloc(0)));

    return Buffer.concat(chunks);
}

function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeB, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeB, data, crcBuf]);
}

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ==================== 图片配置 ====================

const images = [
    // [文件名, 宽, 高, R, G, B, 描述]
    ['background.png', 375, 667, 15, 15, 26, '主背景'],
    ['Fight_01_BG.jpg', 375, 667, 26, 10, 10, '战斗背景1'],
    ['Fight_02_BG.jpg', 375, 667, 10, 20, 15, '战斗背景2'],
    ['ST.png', 48, 48, 255, 215, 0, '普通灵韵'],
    ['IST.png', 48, 48, 0, 191, 255, '冰灵韵'],
    ['FST.png', 48, 48, 255, 69, 0, '火灵韵'],
    ['BPK.png', 64, 64, 139, 69, 19, '背包'],
    ['WS.png', 64, 64, 80, 80, 100, '菜单按钮'],
    ['WSC.png', 32, 32, 50, 50, 60, '折叠按钮'],
    ['GEAR.png', 48, 48, 160, 160, 160, '设置'],
    ['XXSZ_HF.png', 128, 128, 76, 175, 80, '初始角色'],
    ['XXZS_HF.png', 128, 128, 231, 76, 60, '战士角色'],
    ['XXZS.png', 256, 256, 180, 50, 40, '战士立绘'],
    ['GL.png', 32, 32, 255, 215, 0, '星币'],
    ['SST.png', 32, 32, 155, 89, 182, '星源石'],
    ['BK.png', 32, 32, 200, 200, 200, '返回'],
    ['TKS.png', 48, 48, 52, 152, 219, '任务'],
    ['TOP.png', 48, 48, 241, 196, 15, '排行榜'],
    ['CS.png', 48, 48, 231, 76, 60, '赛季'],
    ['SP.png', 48, 48, 46, 204, 113, '商店'],
    ['IFT.png', 48, 48, 44, 62, 80, '无尽之塔'],
    ['BOSS.png', 256, 256, 139, 0, 0, 'Boss'],
];

// ==================== 生成 ====================

console.log('生成占位图片素材...\n');

images.forEach(([filename, w, h, r, g, b, desc]) => {
    const png = createPNG(w, h, r, g, b, 1, desc);
    const filepath = path.join(OUT_DIR, filename);
    fs.writeFileSync(filepath, png);
    console.log(`  ✓ ${filename} (${w}×${h}) — ${desc}`);
});

console.log(`\n完成！共生成 ${images.length} 个文件到 ${OUT_DIR}`);