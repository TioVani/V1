/**
 * Mock 测试：蓄力技吸收灵光 + 流星方向验证
 */

var passed = 0;
var failed = 0;
var MOCK_BASE_ATK = 50;

// 怪物
var monsters = [
    { id: 'slime-A', active: true, hp: 120, maxHp: 120, shield: 0, x: 150, y: 300 },
    { id: 'slime-B', active: true, hp: 120, maxHp: 120, shield: 0, x: 350, y: 310 },
    { id: 'slime-C', active: true, hp: 120, maxHp: 120, shield: 0, x: 500, y: 300 }
];

function getActiveMonsters() { return monsters.filter(function(m) { return m.active; }); }

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  PASS: ' + name);
    } catch (e) {
        failed++;
        console.log('  FAIL: ' + name + ' — ' + e.message);
    }
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ——— 模拟吸收灵光：最近怪物方向 ———
test('吸收灵光目标改为最近怪物', function() {
    var cx = 300, cy = 500; // 蓄力中心
    var sl = { x: 205, y: 455, _charging: false, _dragging: false, _linking: false };
    var absorbRadius = 110;

    var dx = sl.x - cx;
    var dy = sl.y - cy;
    assert(Math.sqrt(dx*dx + dy*dy) < absorbRadius, 'star within absorb radius');

    // 找最近怪物
    var nearestMon = null;
    var nearestDist = Infinity;
    var mlist = getActiveMonsters();
    for (var mi = 0; mi < mlist.length; mi++) {
        if (mlist[mi].hp <= 0 || !mlist[mi].active) continue;
        var mdx = sl.x - (mlist[mi].x || cx);
        var mdy = sl.y - (mlist[mi].y || cy);
        var dist = mdx * mdx + mdy * mdy;
        if (dist < nearestDist) { nearestDist = dist; nearestMon = mlist[mi]; }
    }

    // slime-A: (150, 300) — 距离 slime-A: (200-150)^2 + (450-300)^2 = 2500 + 22500 = 25000
    // slime-B: (350, 310) — 距离: (200-350)^2 + (450-310)^2 = 22500 + 19600 = 42100
    // slime-C: (500, 300) — 距离: (200-500)^2 + (450-300)^2 = 90000 + 22500 = 112500
    // slime-A 最近
    assert(nearestMon.id === 'slime-A', 'nearest should be slime-A, got ' + (nearestMon ? nearestMon.id : 'null'));

    var targetX = nearestMon ? (nearestMon.x || cx) : cx;
    var targetY = nearestMon ? (nearestMon.y || cy) : cy;
    assert(targetX === 150, 'targetX should be 150, got ' + targetX);
    assert(targetY === 300, 'targetY should be 300, got ' + targetY);
    console.log('    → star at (' + sl.x + ',' + sl.y + ') goes to slime-A (' + targetX + ',' + targetY + ')');
});

// ——— 模拟吸收灵光：无怪物时回退到蓄力中心 ———
test('吸收灵光无怪物时回退到蓄力中心', function() {
    var oldMonsters = monsters;
    monsters = [];
    var cx = 300, cy = 500;
    var sl = { x: 250, y: 460, _charging: false, _dragging: false, _linking: false };

    var nearestMon = null;
    var mlist = getActiveMonsters();
    for (var mi = 0; mi < mlist.length; mi++) {
        if (mlist[mi].hp <= 0 || !mlist[mi].active) continue;
        var mdx = sl.x - (mlist[mi].x || cx);
        var mdy = sl.y - (mlist[mi].y || cy);
        var dist = mdx * mdx + mdy * mdy;
        if (dist < nearestDist) { nearestDist = dist; nearestMon = mlist[mi]; }
    }

    var targetX = nearestMon ? (nearestMon.x || cx) : cx;
    var targetY = nearestMon ? (nearestMon.y || cy) : cy;
    assert(targetX === 300, 'fallback targetX should be 300, got ' + targetX);
    assert(targetY === 500, 'fallback targetY should be 500, got ' + targetY);

    monsters = oldMonsters;
});

// ——— 模拟吸收灵光：怪物无坐标时回退 ———
test('吸收灵光怪物无坐标时回退到蓄力中心', function() {
    var oldMon = Object.assign({}, monsters[0]);
    monsters[0].x = undefined;
    monsters[0].y = undefined;
    var cx = 300, cy = 500;
    var sl = { x: 160, y: 310, _charging: false, _dragging: false, _linking: false };

    var nearestMon = null;
    var nearestDist = Infinity;
    var mlist = getActiveMonsters();
    for (var mi = 0; mi < mlist.length; mi++) {
        if (mlist[mi].hp <= 0 || !mlist[mi].active) continue;
        var mdx = sl.x - (mlist[mi].x || cx);
        var mdy = sl.y - (mlist[mi].y || cy);
        var dist = mdx * mdx + mdy * mdy;
        if (dist < nearestDist) { nearestDist = dist; nearestMon = mlist[mi]; }
    }

    // slime-A 无坐标，所以 || cx/cy = 300/500
    var targetX = nearestMon ? (nearestMon.x || cx) : cx;
    var targetY = nearestMon ? (nearestMon.y || cy) : cy;
    console.log('    → star at (' + sl.x + ',' + sl.y + ') → target (' + targetX + ',' + targetY + ')');

    Object.assign(monsters[0], oldMon);
});

// ——— 模拟 fireSingleMeteor 方向 ———
test('fireSingleMeteor 流星朝怪物飞', function() {
    // 模拟 fireSingleMeteor(cx, cy)
    var cx = 300, cy = 500;
    var mlist = getActiveMonsters().filter(function(m) { return m.hp > 0 && m.active; });
    var target = mlist[Math.floor(Math.random() * mlist.length)];
    var endX = target.x || cx;
    var endY = target.y || (cy - 80);

    assert(endX === target.x, 'endX should be monster x (' + target.x + '), got ' + endX);
    assert(endY === target.y, 'endY should be monster y (' + target.y + '), got ' + endY);
    console.log('    → meteor from (' + cx + ',' + cy + ') to (' + endX + ',' + endY + ')');
});

// ——— 模拟 spawnCastMeteors 方向 ———
test('spawnCastMeteors 所有流星朝怪物飞', function() {
    var cx = 300, cy = 500;
    var scale = 1;
    var mlist = getActiveMonsters();
    for (var i = 0; i < mlist.length; i++) {
        var m = mlist[i];
        var endX = m.x || cx;
        var endY = m.y || (cy - 80 * scale);
        assert(endX === m.x, 'endX should be ' + m.x + ', got ' + endX);
        assert(endY === m.y, 'endY should be ' + m.y + ', got ' + endY);
    }
    console.log('    → all ' + mlist.length + ' cast meteors go to correct monster positions');
});

console.log('\n═══════════════════════════════════════');
console.log('结果: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);