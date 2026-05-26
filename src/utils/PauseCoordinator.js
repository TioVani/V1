/**
 * PauseCoordinator — 统一暂停调度器
 *
 * 将暂停从"各系统各自维护"改为"单一调度器 + 子系统注册回调"。
 * 所有暂停入口统一走 PauseCoordinator.pause()，各子系统在进入时注册回调、退出时注销。
 */
export class PauseCoordinator {
  static _instance = null;

  static get instance() {
    if (!PauseCoordinator._instance) {
      PauseCoordinator._instance = new PauseCoordinator();
    }
    return PauseCoordinator._instance;
  }

  constructor() {
    this._paused = false;
    this._pauseStartTime = 0;
    this._subscribers = [];
  }

  /**
   * 注册一个子系统
   * @param {object}  owner  - 子系统实例，用于存活校验（null 时跳过存活检查）
   * @param {string}  name   - 唯一标识名，同名覆盖
   * @param {function} opts.onPause  - 暂停时调用
   * @param {function} opts.onResume - 恢复时调用，接收 duration(ms)
   */
  subscribe(owner, name, opts) {
    const entry = { owner, name, onPause: opts.onPause, onResume: opts.onResume };
    const idx = this._subscribers.findIndex(s => s.name === name);
    if (idx >= 0) {
      this._subscribers[idx] = entry;
    } else {
      this._subscribers.push(entry);
    }
  }

  /** 取消注册（子系统销毁时调用） */
  unsubscribe(name) {
    this._subscribers = this._subscribers.filter(s => s.name !== name);
  }

  get isPaused() {
    return this._paused;
  }

  pause() {
    if (this._paused) return;
    this._paused = true;
    this._pauseStartTime = Date.now();
    this._subscribers = this._subscribers.filter(s => {
      if (s.owner != null && !PauseCoordinator._isAlive(s.owner)) return false;
      try { s.onPause(); } catch (e) { console.error('[PauseCoordinator] onPause ' + s.name + ':', e); }
      return true;
    });
  }

  resume() {
    if (!this._paused) return;
    const duration = Date.now() - this._pauseStartTime;
    this._paused = false;
    this._pauseStartTime = 0;
    this._subscribers = this._subscribers.filter(s => {
      if (s.owner != null && !PauseCoordinator._isAlive(s.owner)) return false;
      try { s.onResume(duration); } catch (e) { console.error('[PauseCoordinator] onResume ' + s.name + ':', e); }
      return true;
    });
  }

  getPauseDuration() {
    return this._paused ? Date.now() - this._pauseStartTime : 0;
  }

  /**
   * 存活校验：若对象 ._destroyed === true 则视为已销毁；
   * HTMLElement 则检查 document.contains()；其余视为存活。
   */
  static _isAlive(obj) {
    if (obj._destroyed === true) return false;
    if (typeof Element !== 'undefined' && obj instanceof Element) {
      return document.contains(obj);
    }
    return true;
  }
}