/**
 * 高效深拷贝工具
 * 适用于游戏配置数据（不含函数、循环引用）
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(function(item) { return deepClone(item); });
    var result = {};
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
        result[keys[i]] = deepClone(obj[keys[i]]);
    }
    return result;
}

export default deepClone;
