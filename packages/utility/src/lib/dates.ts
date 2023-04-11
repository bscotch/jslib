import { assertValidDate } from './types.js';

/** Positive if date2 is in the past. */
export function dateDifferenceMillis(date1: Date, date2: Date) {
  return date1.getTime() - date2.getTime();
}

/** Positive if date2 is in the past. */
export function dateDifferenceSeconds(date1: Date, date2: Date) {
  return dateDifferenceMillis(date1, date2) / 1000;
}

/** Positive if date2 is in the past. */
export function dateDifferenceMinutes(date1: Date, date2: Date) {
  return dateDifferenceSeconds(date1, date2) / 60;
}

/** Positive if date2 is in the past. */
export function dateDifferenceHours(date1: Date, date2: Date) {
  return dateDifferenceMinutes(date1, date2) / 60;
}

/** Positive if date2 is in the past. */
export function dateDifferenceDays(date1: Date, date2: Date) {
  return dateDifferenceHours(date1, date2) / 24;
}

export function dateIsOlderThanMillisAgo(date: Date, millisAgo: number) {
  return dateDifferenceMillis(new Date(), date) > millisAgo;
}

export function dateIsOlderThanSecondsAgo(date: Date, secondsAgo: number) {
  return dateIsOlderThanMillisAgo(date, secondsAgo * 1000);
}

export function dateIsOlderThanMinutesAgo(date: Date, minutes = 1) {
  return dateIsOlderThanSecondsAgo(date, 60 * minutes);
}

export function dateIsOlderThanHoursAgo(date: Date, hours = 1) {
  return dateIsOlderThanMinutesAgo(date, 60 * hours);
}

export function dateIsOlderThanDaysAgo(date: Date, days = 1) {
  return dateIsOlderThanHoursAgo(date, 24 * days);
}

export function dateIsInTheFuture(date: Date) {
  const nowInMilliseconds = Date.now();
  date = new Date(date);
  assertValidDate(date);
  const dateInMilliseconds = (date && date.getTime && date.getTime()) || 0;
  return dateInMilliseconds > nowInMilliseconds;
}

export function dateIsInThePast(date: Date) {
  return dateIsOlderThanSecondsAgo(date, 0);
}

export function dateIsGreaterThan(date: Date, otherDate: Date) {
  assertValidDate(date);
  assertValidDate(otherDate);
  return date > otherDate;
}

export function dateIsLessThan(date: Date, otherDate: Date) {
  assertValidDate(date);
  assertValidDate(otherDate);
  return date < otherDate;
}

export function chronologySort(date1: Date, date2: Date) {
  assertValidDate(date1);
  assertValidDate(date2);
  return date1.getTime() - date2.getTime();
}

/** @alias chronologySort */
export const dateSort = chronologySort;

export function chronologySortReverse(date1: Date, date2: Date) {
  return chronologySort(date2, date1);
}

/** @alias chronologySortReverse */
export const dateSortDescending = chronologySortReverse;

/**
 * Format a timestamp. Enforces UTC,
 * defaults to ISO 8601 extended.
 */
export function formatTimestamp(
  date: Date,
  options?: {
    /**
     * Separator between the date components (Year, Month, Day)
     *
     * @default '-'
     */
    dateSeparator?: string;
    /**
     * Separator between the time components
     * (Hour, Minute, Seconds)
     *
     * @default ':'
     */
    timeSeparator?: string;
    /**
     * Separator between the date and time parts
     * of the timestamp.
     *
     * @default 'T'
     */
    dateTimeSeparator?: string;
    excludeTime?: boolean;
    /**
     * The number of digits after the decimal
     * for the seconds part of the timestamp.
     *
     * @default 3
     */
    secondsPrecision?: number;
    /**
     * By default, the timestamp is converted
     * to UTC and formatted as ISO 8601 extended,
     * included the `Z` timezone indicator suffix.
     * That makes the string portable across timezones.
     */
    excludeTimezoneSuffix?: boolean;
  },
) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const milliseconds = date.getUTCMilliseconds();
  let timestamp = [year, month, day]
    .map((n) => n.toString().padStart(2, '0'))
    .join(options?.dateSeparator ?? '-');
  if (!options?.excludeTime) {
    const timeParts: (string | number)[] = [
      hours,
      minutes,
      (seconds + milliseconds / 1000).toFixed(options?.secondsPrecision ?? 3),
    ];
    timestamp +=
      (options?.dateTimeSeparator ?? 'T') +
      timeParts
        .map((n) => n.toString().padStart(2, '0'))
        .join(options?.timeSeparator ?? ':');
  }
  if (!options?.excludeTimezoneSuffix) {
    timestamp += 'Z';
  }
  return timestamp;
}
