/**
 * 统一定时器管理器
 * 防止定时器泄漏，提供统一的创建和清理接口
 */
class TimerManager {
  constructor() {
    this._intervals = new Set();
    this._timeouts = new Set();
  }

  setInterval(fn, ms) {
    const id = setInterval(fn, ms);
    this._intervals.add(id);
    return id;
  }

  setTimeout(fn, ms) {
    const id = setTimeout(() => {
      this._timeouts.delete(id);
      fn();
    }, ms);
    this._timeouts.add(id);
    return id;
  }

  clearInterval(id) {
    if (id != null) {
      clearInterval(id);
      this._intervals.delete(id);
    }
    return null;
  }

  clearTimeout(id) {
    if (id != null) {
      clearTimeout(id);
      this._timeouts.delete(id);
    }
    return null;
  }

  clearAll() {
    for (const id of this._intervals) clearInterval(id);
    for (const id of this._timeouts) clearTimeout(id);
    this._intervals.clear();
    this._timeouts.clear();
  }
}

export default TimerManager;
