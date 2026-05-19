/**
 * 通用对象池
 * 复用对象减少 GC 压力
 */
class ObjectPool {
  constructor(factory, resetFn, initialSize) {
    this._factory = factory;
    this._resetFn = resetFn;
    this._pool = [];
    if (initialSize > 0) {
      for (var i = 0; i < initialSize; i++) {
        this._pool.push(factory());
      }
    }
  }

  acquire(props) {
    var obj = this._pool.length > 0 ? this._pool.pop() : this._factory();
    if (props) {
      var keys = Object.keys(props);
      for (var i = 0; i < keys.length; i++) {
        obj[keys[i]] = props[keys[i]];
      }
    }
    return obj;
  }

  release(obj) {
    this._resetFn(obj);
    this._pool.push(obj);
  }

  releaseArray(arr) {
    for (var i = 0; i < arr.length; i++) {
      this._resetFn(arr[i]);
      this._pool.push(arr[i]);
    }
    arr.length = 0;
  }

  get size() {
    return this._pool.length;
  }
}

export default ObjectPool;
