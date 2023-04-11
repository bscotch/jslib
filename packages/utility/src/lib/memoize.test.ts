import { expect } from 'chai';
import { memoize, MemoizedClass } from './memoize.js';

interface TestClass extends MemoizedClass {}

/**
 * @internal
 */
@memoize
class TestClass {
  _prop = 10;
  _method = { value: 10 };
  static _staticProp = 10;
  static _method = { value: 10 };

  @memoize
  get prop() {
    return this._prop;
  }
  set prop(value: number) {
    this._prop = value;
  }

  @memoize
  static get staticProp() {
    return this._staticProp;
  }
  static set staticProp(value: number) {
    this._staticProp = value;
  }

  @memoize
  method(value: number) {
    this._method.value += value;
    return this._method.value;
  }

  @memoize
  static staticMethod(value: number) {
    TestClass._method.value += value;
    return TestClass._method.value;
  }
}

describe('Memoize decorator', function () {
  it('can create a memoized class', function () {
    const instance = new TestClass();

    expect(instance.prop).to.equal(10);
    instance.prop = 20;
    expect(instance.prop).to.equal(10);

    expect(TestClass.staticProp).to.equal(10);
    TestClass.staticProp = 20;
    expect(TestClass.staticProp).to.equal(10);

    expect(instance.method(10)).to.equal(20);
    expect(instance.method(10)).to.equal(20);

    expect(TestClass.staticMethod(10)).to.equal(20);
    expect(TestClass.staticMethod(10)).to.equal(20);

    // Clear the memoized values
    instance.clearMemoized();

    // Instance changes should be uncovered!
    instance.prop = 50;
    expect(instance.prop).to.equal(50);
    expect(instance.method(10)).to.equal(30);

    // But static changes should still be cached!
    expect(TestClass.staticProp).to.equal(10);
    expect(TestClass.staticMethod(0)).to.equal(20);

    // Clear the static memoized values
    instance.clearMemoized(TestClass);

    // Static changes should be uncovered!
    TestClass.staticProp = 50;
    expect(TestClass.staticProp).to.equal(50);
    expect(TestClass.staticMethod(10)).to.equal(30);
  });

  it('cannot cross-contaminate instance caches', function () {
    const instance1 = new TestClass();
    const instance2 = new TestClass();

    instance1.prop = 30;
    instance2.prop = 50;

    expect(instance1.prop).to.equal(30);
    expect(instance2.prop).to.equal(50);

    expect(instance1.method(20)).to.equal(30);
    expect(instance2.method(40)).to.equal(50);
  });
});
