import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// 直接内联 ObjectPool（与 src/utils/ObjectPool.js 保持同步）
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
  get size() { return this._pool.length; }
}

describe('ObjectPool', () => {
  it('acquire creates new object when pool is empty', () => {
    const pool = new ObjectPool(() => ({ x: 0, y: 0 }), (o) => { o.x = 0; o.y = 0; }, 0);
    const obj = pool.acquire();
    assert.deepEqual(obj, { x: 0, y: 0 });
    assert.equal(pool.size, 0);
  });

  it('acquire reuses released objects', () => {
    const pool = new ObjectPool(() => ({ x: 0, y: 0 }), (o) => { o.x = 0; o.y = 0; }, 0);
    const obj = pool.acquire({ x: 10, y: 20 });
    pool.release(obj);
    assert.equal(pool.size, 1);
    const reused = pool.acquire();
    assert.equal(reused, obj);
    assert.equal(pool.size, 0);
  });

  it('acquire with props sets properties', () => {
    const pool = new ObjectPool(() => ({ x: 0, y: 0 }), (o) => { o.x = 0; o.y = 0; }, 0);
    const obj = pool.acquire({ x: 5, y: 10 });
    assert.deepEqual(obj, { x: 5, y: 10 });
  });

  it('pre-allocates initial objects', () => {
    const pool = new ObjectPool(() => ({ x: 0 }), (o) => { o.x = 0; }, 5);
    assert.equal(pool.size, 5);
  });

  it('releaseArray releases multiple objects', () => {
    const pool = new ObjectPool(() => ({ x: 0 }), (o) => { o.x = 0; }, 0);
    const arr = [pool.acquire(), pool.acquire()];
    pool.releaseArray(arr);
    assert.equal(pool.size, 2);
    assert.equal(arr.length, 0);
  });
});
