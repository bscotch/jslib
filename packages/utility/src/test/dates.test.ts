import { expect } from 'chai';
import { arraySortNumeric, arraySortNumericDescending } from '../lib/array.js';
import {
  dateDifferenceDays,
  dateDifferenceHours,
  dateDifferenceMillis,
  dateDifferenceMinutes,
  dateDifferenceSeconds,
  dateIsGreaterThan,
  dateIsInTheFuture,
  dateIsInThePast,
  dateIsLessThan,
  dateIsOlderThanDaysAgo,
  dateIsOlderThanHoursAgo,
  dateIsOlderThanMillisAgo,
  dateIsOlderThanMinutesAgo,
  dateIsOlderThanSecondsAgo,
  dateSort,
  dateSortDescending,
  formatTimestamp,
} from '../lib/dates.js';
import { assertValidDate, isValidDate } from '../lib/types.js';

describe('Dates', function () {
  it('can format dates', function () {
    const date = new Date('2018-01-01T12:34:56.789123456Z');
    expect(formatTimestamp(date)).to.equal('2018-01-01T12:34:56.789Z');
    expect(formatTimestamp(date, { excludeTime: true })).to.equal(
      '2018-01-01Z',
    );
    expect(
      formatTimestamp(date, {
        dateSeparator: '/',
        timeSeparator: '_',
        dateTimeSeparator: 'MEH',
        excludeTimezoneSuffix: true,
        secondsPrecision: 0,
      }),
    ).to.equal('2018/01/01MEH12_34_57');
  });

  it('can validate dates', function () {
    const invalidDates: any[] = [
      'nope',
      1000000,
      'FEBRUARY',
      -10,
      new Date('BAD DATE'),
      Date.now(),
      Date,
    ];
    const validDates: Date[] = [new Date(), new Date(10000)];
    for (const invalid of invalidDates) {
      expect(isValidDate(invalid)).to.be.false;
      expect(() => assertValidDate(invalid)).to.throw();
    }
    for (const valid of validDates) {
      expect(isValidDate(valid)).to.be.true;
      assertValidDate(valid); // should not throw
    }
  });
  it('can sort dates', function () {
    const numsToDates = (nums: number[]) => nums.map((num) => new Date(num));
    const dateSources = [100, 1000, 0, 9000, 50];
    const dates = numsToDates(dateSources);
    // Easy to sort and validate the sources (just simple numbers!)
    const datesSortedIncreasing = dates.sort(dateSort);
    expect(numsToDates(dateSources)).to.not.eql(datesSortedIncreasing);
    expect(numsToDates(arraySortNumeric(dateSources))).to.eql(
      datesSortedIncreasing,
    );
    const datesSortedDecreasing = dates.sort(dateSortDescending);
    expect(numsToDates(dateSources)).to.not.eql(datesSortedDecreasing);
    expect(numsToDates(arraySortNumericDescending(dateSources))).to.eql(
      datesSortedDecreasing,
    );
  });
  it('can get date diffs', function () {
    const date = new Date();
    const agoSeconds = 999999;
    const pastDate = new Date(date.getTime() - agoSeconds * 1000);
    expect(dateDifferenceMillis(date, pastDate)).to.eql(agoSeconds * 1000);
    expect(dateDifferenceSeconds(date, pastDate)).to.eql(agoSeconds);
    expect(dateDifferenceMinutes(date, pastDate)).to.eql(agoSeconds / 60);
    expect(dateDifferenceHours(date, pastDate)).to.eql(agoSeconds / 60 / 60);
    expect(dateDifferenceDays(date, pastDate)).to.eql(
      agoSeconds / 60 / 60 / 24,
    );
    const timeDelta = 1000; // ms buffer on the date to account for compute time
    expect(dateIsGreaterThan(date, pastDate)).to.be.true;
    expect(dateIsGreaterThan(pastDate, date)).to.be.false;
    expect(dateIsLessThan(date, pastDate)).to.be.false;
    expect(dateIsLessThan(pastDate, date)).to.be.true;
    expect(dateIsInThePast(pastDate)).to.be.true;
    expect(dateIsInTheFuture(pastDate)).to.be.false;
    expect(dateIsOlderThanMillisAgo(pastDate, agoSeconds * 1000 - timeDelta)).to
      .be.true;
    expect(dateIsOlderThanMillisAgo(pastDate, agoSeconds * 1000 + timeDelta)).to
      .be.false;
    expect(dateIsOlderThanSecondsAgo(pastDate, agoSeconds - timeDelta / 1000))
      .to.be.true;
    expect(dateIsOlderThanSecondsAgo(pastDate, agoSeconds + timeDelta / 1000))
      .to.be.false;
    expect(
      dateIsOlderThanMinutesAgo(
        pastDate,
        agoSeconds / 60 - timeDelta / 1000 / 60,
      ),
    ).to.be.true;
    expect(
      dateIsOlderThanMinutesAgo(
        pastDate,
        agoSeconds / 60 + timeDelta / 1000 / 60,
      ),
    ).to.be.false;
    expect(
      dateIsOlderThanHoursAgo(
        pastDate,
        agoSeconds / 60 / 60 - timeDelta / 1000 / 60 / 60,
      ),
    ).to.be.true;
    expect(
      dateIsOlderThanHoursAgo(
        pastDate,
        agoSeconds / 60 / 60 + timeDelta / 1000 / 60 / 60,
      ),
    ).to.be.false;
    expect(
      dateIsOlderThanDaysAgo(
        pastDate,
        agoSeconds / 60 / 60 / 24 - timeDelta / 1000 / 60 / 60 / 24,
      ),
    ).to.be.true;
    expect(
      dateIsOlderThanDaysAgo(
        pastDate,
        agoSeconds / 60 / 60 / 24 + timeDelta / 1000 / 60 / 60 / 24,
      ),
    ).to.be.false;
  });
});
