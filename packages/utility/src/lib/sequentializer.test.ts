import { expect } from 'chai';
import { Sequential, sequential, sequentialize } from './sequentializer.js';
import { waitForTicks } from './wait.js';

describe('Sequentializer', function () {
  it('can sequentialize async function calls', async function () {
    let value = '';
    const concat = sequentialize(async (str: string, waitTicks: number) => {
      await waitForTicks(waitTicks);
      value += str;
      return value;
    });
    const out = await Promise.all([
      concat('first', 3),
      concat('second', 1),
      concat('third', 2),
    ]);
    expect(value).to.equal('firstsecondthird');
    expect(out).to.deep.equal(['first', 'firstsecond', 'firstsecondthird']);
  });

  it('can share a queue with another sequentialized function', async function () {
    let value = '';
    const concatter = async (str: string, waitTicks: number) => {
      await waitForTicks(waitTicks);
      value += str;
      return value;
    };
    const concat1 = sequentialize(concatter);
    const concat2 = sequentialize(concatter, { shareQueueWith: concat1 });
    const out = await Promise.all([
      concat1('0', 2),
      concat2('1', 1),
      concat1('2', 2),
      concat2('3', 0),
    ]);
    expect(out).to.deep.equal(['0', '01', '012', '0123']);
  });

  it('can sequentialize class methods with a decorator', async function () {
    class HasSequentialMethods {
      value = '';

      @sequential
      async concat(str: string, waitTicks: number) {
        await waitForTicks(waitTicks);
        this.value += str;
        return this.value;
      }

      @Sequential({ shareQueueWith: 'concat' })
      async anotherConcat(str: string, waitTicks: number) {
        await waitForTicks(waitTicks);
        this.value += str;
        return this.value;
      }
    }
    const instance = new HasSequentialMethods();
    const out = await Promise.all([
      instance.concat('first', 3),
      instance.concat('second', 1),
      instance.concat('third', 2),
    ]);
    expect(instance.value).to.equal('firstsecondthird');
    expect(out).to.deep.equal(['first', 'firstsecond', 'firstsecondthird']);

    instance.value = '';
    const out2 = await Promise.all([
      instance.anotherConcat('0', 2),
      instance.concat('1', 0),
      instance.anotherConcat('2', 2),
      instance.concat('3', 0),
    ]);
    expect(out2).to.deep.equal(['0', '01', '012', '0123']);
  });
});
