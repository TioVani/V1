import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// 直接内联 deepClone（与 src/utils/DeepClone.js 保持同步）
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

describe('DeepClone', () => {
  it('clones primitive values', () => {
    assert.equal(deepClone(null), null);
    assert.equal(deepClone(42), 42);
    assert.equal(deepClone('hello'), 'hello');
    assert.equal(deepClone(true), true);
  });

  it('clones flat objects', () => {
    const obj = { a: 1, b: 'two', c: true };
    const cloned = deepClone(obj);
    assert.deepEqual(cloned, obj);
    assert.notEqual(cloned, obj);
  });

  it('clones nested objects', () => {
    const obj = { a: { b: { c: 1 } }, d: [1, 2, { e: 3 }] };
    const cloned = deepClone(obj);
    assert.deepEqual(cloned, obj);
    assert.notEqual(cloned.a, obj.a);
    assert.notEqual(cloned.d, obj.d);
  });

  it('modifying clone does not affect original', () => {
    const obj = { a: { b: 1 }, c: [1, 2] };
    const cloned = deepClone(obj);
    cloned.a.b = 999;
    cloned.c.push(3);
    assert.equal(obj.a.b, 1);
    assert.equal(obj.c.length, 2);
  });
});
