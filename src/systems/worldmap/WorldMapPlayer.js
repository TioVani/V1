/**
 * WorldMapPlayer — 角色移动 + 碰撞检测
 * 管理角色坐标、移动输入、碰撞判定、边界约束
 */
function createWorldMapPlayer(deps) {
    var getWorldConfig = deps.getWorldConfig;

    var _pos = { x: 0, y: 0 };
    var _returnPosition = null;
    var _speed = 200; // 像素/秒
    var _playerRadius = 12;
    var _activeCollisions = [];

    function init(config) {
        _pos = { x: config.playerStart.x, y: config.playerStart.y };
        _returnPosition = null;
        _activeCollisions = config.collisions ? config.collisions.slice() : [];
    }

    function setCollisions(collisions) {
        _activeCollisions = collisions.slice();
    }

    function removeCollisionsById(ids) {
        _activeCollisions = _activeCollisions.filter(function(c) {
            return ids.indexOf(c.id) === -1;
        });
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

        if (!checkCollision(newX, _pos.y)) _pos.x = newX;
        if (!checkCollision(_pos.x, newY)) _pos.y = newY;
    }

    function checkCollision(x, y) {
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
        setSpeed: setSpeed
    };
}

export { createWorldMapPlayer };
