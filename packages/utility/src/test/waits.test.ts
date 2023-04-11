import { expect } from 'chai';
import { dateIsOlderThanMillisAgo } from '../lib/dates.js';
import { waitForMillis, waitForSeconds } from '../lib/wait.js';

describe('Waits', function () {
  it('can wait', async function () {
    let now = new Date();
    const resetNow = () => {
      now = new Date();
      return now;
    };
    const waitTimeMillis = 100;
    const expectInPast = () =>
      expect(dateIsOlderThanMillisAgo(now, waitTimeMillis * 0.95)).to.be.true;

    resetNow();
    await waitForMillis(waitTimeMillis);
    expectInPast();

    resetNow();
    await waitForSeconds(waitTimeMillis / 1000);
    expectInPast();
  });
});
