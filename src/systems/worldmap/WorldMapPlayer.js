/**
 * WorldMapPlayer — 角色移动 + 碰撞检测
 * 管理角色坐标、移动输入、碰撞判定、边界约束
 * 支持预计算碰撞位图（RLE collisionMaskData）、瓦片网格（tilegrid）、矩形（rect）
 */
import { COLLISION_BITMAPS } from '../../config/CollisionBitmapConfig.js';

function createWorldMapPlayer(deps) {
    var getWorldConfig = deps.getWorldConfig;

    var _pos = { x: 0, y: 0 };
    var _returnPosition = null;
    var _spawnPoint = null;
    var _speed = 200; // 像素/秒
    var _playerRadius = 12;
    var _activeCollisions = [];
    var _tileGrid = null; // { tileSize, gridW, gridH, grid[] }
    var _collisionBitmap = null; // { width, height, data: Uint8Array }
    var _transparencyBitmap = null; // { width, height, data: Uint8Array }
    var _occlusionCanvas = null;
    var _currentFloor = 1;

    function init(config) {
        _spawnPoint = { x: config.playerStart.x, y: config.playerStart.y };
        _pos = { x: config.playerStart.x, y: config.playerStart.y };
        _returnPosition = null;
        _activeCollisions = [];
        _tileGrid = null;
        _collisionBitmap = null;
        _transparencyBitmap = null;
        _occlusionCanvas = null;
        _currentFloor = 1;
        if (config.collisions) {
            for (var i = 0; i < config.collisions.length; i++) {
                var c = config.collisions[i];
                if (c.type === 'tilegrid') {
                    _tileGrid = _parseTileGrid(c);
                } else {
                    _activeCollisions.push(c);
                }
            }
        }
        // 加载默认楼层碰撞/透明遮罩
        if (config.floors) {
            var defaultFloor = null;
            for (var fi = 0; fi < config.floors.length; fi++) {
                if (config.floors[fi].id === 1) { defaultFloor = config.floors[fi]; break; }
            }
            if (defaultFloor) _loadFloorData(defaultFloor);
        } else {
            if (config.collisionMaskData && COLLISION_BITMAPS[config.collisionMaskData]) {
                _collisionBitmap = _decodeRLEBitmap(COLLISION_BITMAPS[config.collisionMaskData]);
            }
            if (config.transparencyMaskData && COLLISION_BITMAPS[config.transparencyMaskData]) {
                _transparencyBitmap = _decodeRLEBitmap(COLLISION_BITMAPS[config.transparencyMaskData]);
                _createOcclusionCanvas();
            }
        }
        // 防卡死：出生点在碰撞区内则向四周扫描寻找安全位置
        if (checkCollision(_pos.x, _pos.y)) {
            var safe = _findSafeNear(_spawnPoint.x, _spawnPoint.y);
            _pos.x = safe.x;
            _pos.y = safe.y;
        }
    }

    function _decodeRLEBitmap(data) {
        var w = data.width, h = data.height;
        var bitmap = new Uint8Array(w * h);
        for (var y = 0; y < h; y++) {
            var rle = data.rows[y];
            var pos = 0;
            var pixelIdx = y * w;
            while (pos < rle.length) {
                var numStr = '';
                while (pos < rle.length && rle[pos] >= '0' && rle[pos] <= '9') {
                    numStr += rle[pos];
                    pos++;
                }
                var count = parseInt(numStr, 10);
                var val = rle[pos] === 'B' ? 1 : 0;
                pos++;
                for (var j = 0; j < count && pixelIdx < y * w + w; j++) {
                    bitmap[pixelIdx++] = val;
                }
            }
        }
        return { width: w, height: h, data: bitmap };
    }

    function _createOcclusionCanvas() {
        if (!_transparencyBitmap) { _occlusionCanvas = null; return; }
        var bm = _transparencyBitmap;
        var canvas = document.createElement('canvas');
        canvas.width = bm.width;
        canvas.height = bm.height;
        var ctx2 = canvas.getContext('2d');
        var imgData = ctx2.createImageData(bm.width, bm.height);
        var d = imgData.data;
        for (var i = 0; i < bm.data.length; i++) {
            if (bm.data[i] === 1) {
                d[i * 4] = 255;
                d[i * 4 + 1] = 255;
                d[i * 4 + 2] = 255;
                d[i * 4 + 3] = 255;
            }
        }
        ctx2.putImageData(imgData, 0, 0);
        _occlusionCanvas = canvas;
    }

    function _loadFloorData(floorConfig) {
        _collisionBitmap = null;
        _transparencyBitmap = null;
        _occlusionCanvas = null;
        if (floorConfig.collisionMaskData && COLLISION_BITMAPS[floorConfig.collisionMaskData]) {
            _collisionBitmap = _decodeRLEBitmap(COLLISION_BITMAPS[floorConfig.collisionMaskData]);
        }
        if (floorConfig.transparencyMaskData && COLLISION_BITMAPS[floorConfig.transparencyMaskData]) {
            _transparencyBitmap = _decodeRLEBitmap(COLLISION_BITMAPS[floorConfig.transparencyMaskData]);
            _createOcclusionCanvas();
        }
    }

    function switchFloor(floorId) {
        var config = getWorldConfig();
        if (!config || !config.floors) return;
        var floorData = null;
        for (var i = 0; i < config.floors.length; i++) {
            if (config.floors[i].id === floorId) { floorData = config.floors[i]; break; }
        }
        if (!floorData) return;
        _loadFloorData(floorData);
        _currentFloor = floorId;
        if (checkCollision(_pos.x, _pos.y)) {
            var safe = _findSafeNear(_pos.x, _pos.y);
            _pos.x = safe.x;
            _pos.y = safe.y;
        }
    }

    function getCurrentFloor() { return _currentFloor; }

    function _isPixelBlocked(px, py) {
        var bm = _collisionBitmap;
        if (px < 0 || px >= bm.width || py < 0 || py >= bm.height) return true;
        return bm.data[py * bm.width + px] === 1;
    }

    function _parseTileGrid(c) {
        var grid = [];
        for (var r = 0; r < c.gridH; r++) {
            var row = [];
            var rowStr = c.grid[r];
            for (var col = 0; col < c.gridW; col++) {
                row.push(rowStr[col] === '1' ? 1 : 0);
            }
            grid.push(row);
        }
        return { tileSize: c.tileSize, gridW: c.gridW, gridH: c.gridH, grid: grid };
    }

    function setCollisions(collisions) {
        _activeCollisions = [];
        _tileGrid = null;
        for (var i = 0; i < collisions.length; i++) {
            var c = collisions[i];
            if (c.type === 'tilegrid') {
                _tileGrid = _parseTileGrid(c);
            } else {
                _activeCollisions.push(c);
            }
        }
    }

    function removeCollisionsById(ids) {
        _activeCollisions = _activeCollisions.filter(function(c) {
            return ids.indexOf(c.id) === -1;
        });
    }

    function _findSafeNear(cx, cy) {
        var config = getWorldConfig();
        if (!config) return { x: cx, y: cy };
        var ts = _tileGrid ? _tileGrid.tileSize : 32;
        var hw = config.width;
        var hh = config.height;
        var maxR = Math.ceil(Math.max(hw, hh) / ts);
        for (var r = 0; r <= maxR; r++) {
            for (var dy = -r; dy <= r; dy++) {
                for (var dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    var sx = cx + dx * ts + ts / 2;
                    var sy = cy + dy * ts + ts / 2;
                    if (sx < _playerRadius || sx > hw - _playerRadius) continue;
                    if (sy < _playerRadius || sy > hh - _playerRadius) continue;
                    if (!checkCollision(sx, sy)) return { x: sx, y: sy };
                }
            }
        }
        return { x: cx, y: cy };
    }

    function movePlayer(dx, dy, dt) {
        if (dx === 0 && dy === 0) return;

        var len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            dx = dx / len;
            dy = dy / len;
        }

        var newX = _pos.x + dx * _speed * dt;
        var newY = _pos.y + dy * _speed * dt;

        var config = getWorldConfig();
        if (config) {
            newX = Math.max(_playerRadius, Math.min(config.width - _playerRadius, newX));
            newY = Math.max(_playerRadius, Math.min(config.height - _playerRadius, newY));
        }

        // 轴分离碰撞：X/Y 各自独立判定，被挡住的轴不动，另一个轴继续滑行
        var tryX = !checkCollision(newX, _pos.y);
        var tryY = !checkCollision(tryX ? newX : _pos.x, newY);

        if (tryX) _pos.x = newX;
        if (tryY) _pos.y = newY;

        // 防卡死：若两轴都被挡且当前位置嵌在碰撞体内，微推脱出（不传送）
        if (!tryX && !tryY && checkCollision(_pos.x, _pos.y)) {
            _pushOutOfCollision();
        }
    }

    // 从碰撞体内微推脱出：沿 8 方向逐像素试探最近自由位置
    function _pushOutOfCollision() {
        var dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
        var step = 1;
        for (var s = 1; s <= _playerRadius; s++) {
            for (var d = 0; d < dirs.length; d++) {
                var nx = _pos.x + dirs[d][0] * s;
                var ny = _pos.y + dirs[d][1] * s;
                if (!checkCollision(nx, ny)) {
                    _pos.x = nx;
                    _pos.y = ny;
                    return;
                }
            }
        }
        // 极端兜底：回到出生点附近安全位置
        var safe = _findSafeNear(_spawnPoint.x, _spawnPoint.y);
        _pos.x = safe.x;
        _pos.y = safe.y;
    }

    function checkCollision(x, y) {
        // 像素级碰撞位图（最高精度，匹配手绘遮罩）
        if (_collisionBitmap) {
            var r = _playerRadius;
            var rSq = r * r;
            var cx = Math.round(x);
            var cy = Math.round(y);
            for (var py = cy - r; py <= cy + r; py++) {
                var dy = py - cy;
                var maxDx = Math.floor(Math.sqrt(rSq - dy * dy));
                for (var px = cx - maxDx; px <= cx + maxDx; px++) {
                    if (_isPixelBlocked(px, py)) return true;
                }
            }
            return false;
        }
        // Tile-grid check
        if (_tileGrid) {
            var ts = _tileGrid.tileSize;
            var gw = _tileGrid.gridW;
            var gh = _tileGrid.gridH;
            var minTx = Math.floor((x - _playerRadius) / ts);
            var maxTx = Math.floor((x + _playerRadius) / ts);
            var minTy = Math.floor((y - _playerRadius) / ts);
            var maxTy = Math.floor((y + _playerRadius) / ts);
            for (var ty = minTy; ty <= maxTy; ty++) {
                if (ty < 0 || ty >= gh) continue;
                for (var tx = minTx; tx <= maxTx; tx++) {
                    if (tx < 0 || tx >= gw) continue;
                    if (_tileGrid.grid[ty][tx] === 1) return true;
                }
            }
        }
        // Rect-based check
        for (var i = 0; i < _activeCollisions.length; i++) {
            var c = _activeCollisions[i];
            if (c.type === 'rect') {
                if (x + _playerRadius > c.x && x - _playerRadius < c.x + c.w &&
                    y + _playerRadius > c.y && y - _playerRadius < c.y + c.h) {
                    return true;
                }
            }
        }
        return false;
    }

    function getPlayerPos() { return { x: _pos.x, y: _pos.y }; }
    function setPlayerPos(x, y) { _pos.x = x; _pos.y = y; }

    function snapshotReturnPosition() {
        _returnPosition = { x: _pos.x, y: _pos.y };
    }

    function restoreReturnPosition() {
        if (_returnPosition) {
            _pos.x = _returnPosition.x;
            _pos.y = _returnPosition.y;
        }
    }

    function getSpeed() { return _speed; }
    function setSpeed(s) { _speed = s; }

    function isPlayerOccluded() {
        if (!_transparencyBitmap) return false;
        var px = Math.round(_pos.x);
        var py = Math.round(_pos.y);
        if (px < 0 || px >= _transparencyBitmap.width || py < 0 || py >= _transparencyBitmap.height) return false;
        return _transparencyBitmap.data[py * _transparencyBitmap.width + px] === 1;
    }

    function getOcclusionCanvas() { return _occlusionCanvas; }

    return {
        init: init,
        movePlayer: movePlayer,
        checkCollision: checkCollision,
        getPlayerPos: getPlayerPos,
        setPlayerPos: setPlayerPos,
        snapshotReturnPosition: snapshotReturnPosition,
        restoreReturnPosition: restoreReturnPosition,
        setCollisions: setCollisions,
        removeCollisionsById: removeCollisionsById,
        getSpeed: getSpeed,
        setSpeed: setSpeed,
        isPlayerOccluded: isPlayerOccluded,
        getOcclusionCanvas: getOcclusionCanvas,
        switchFloor: switchFloor,
        getCurrentFloor: getCurrentFloor,
        setSpeed: setSpeed
    };
}

export { createWorldMapPlayer };