/**
 * 通用工具函数
 * 提供常用的工具方法
 */

class Utils {
    /**
     * 生成随机整数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 随机整数
     */
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 生成随机浮点数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 随机浮点数
     */
    static randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * 限制数值范围
     * @param {number} value - 数值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 限制后的数值
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * 计算两点距离
     * @param {number} x1 - 第一个点的X坐标
     * @param {number} y1 - 第一个点的Y坐标
     * @param {number} x2 - 第二个点的X坐标
     * @param {number} y2 - 第二个点的Y坐标
     * @returns {number} 距离
     */
    static distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    /**
     * 深拷贝对象
     * @param {*} obj - 对象
     * @returns {*} 拷贝后的对象
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = this.deepClone(obj[key]);
            }
        }
        
        return clonedObj;
    }

    /**
     * 延迟执行
     * @param {number} ms - 延迟时间（毫秒）
     * @returns {Promise} Promise对象
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 格式化数字
     * @param {number} num - 数字
     * @param {number} decimals - 小数位数
     * @returns {string} 格式化后的字符串
     */
    static formatNumber(num, decimals = 0) {
        return num.toFixed(decimals);
    }

    /**
     * 格式化时间
     * @param {number} seconds - 秒数
     * @returns {string} 格式化后的时间字符串
     */
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 检查对象是否为空
     * @param {Object} obj - 对象
     * @returns {boolean} 是否为空
     */
    static isEmpty(obj) {
        if (obj === null || obj === undefined) return true;
        if (typeof obj === 'string') return obj.length === 0;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    }

    /**
     * 数组随机打乱
     * @param {Array} array - 数组
     * @returns {Array} 打乱后的数组
     */
    static shuffle(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    /**
     * 从数组中随机选择一个元素
     * @param {Array} array - 数组
     * @returns {*} 随机元素
     */
    static randomChoice(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * 检查数值是否在范围内
     * @param {number} value - 数值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {boolean} 是否在范围内
     */
    static inRange(value, min, max) {
        return value >= min && value <= max;
    }

    /**
     * 线性插值
     * @param {number} start - 起始值
     * @param {number} end - 结束值
     * @param {number} t - 插值因子（0-1）
     * @returns {number} 插值结果
     */
    static lerp(start, end, t) {
        return start + (end - start) * t;
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

export default Utils;