/**
 * 日志工具
 * 生产环境自动静默，仅保留 error 输出
 */

const isDev = true;

class Logger {
  static info(...args) {
    if (isDev) console.log('[INFO]', ...args);
  }

  static warn(...args) {
    if (isDev) console.warn('[WARN]', ...args);
  }

  static error(...args) {
    console.error('[ERROR]', ...args);
  }

  static debug(...args) {
    if (isDev) console.debug('[DEBUG]', ...args);
  }

  static success(...args) {
    if (isDev) console.log('[SUCCESS]', ...args);
  }

  static group(label, callback) {
    if (!isDev) return;
    console.group(label);
    callback();
    console.groupEnd();
  }
}

export default Logger;
