# Bscotch Utilities

Utility and helper methods and types for common programming problems in Node.js.

## Installation

### Requirements

- Node.js v16+

### Installation

[From npm](https://www.npmjs.com/package/@bscotch/utility):

`npm install @bscotch/utility`

## Features

The following listings show a subset of the utilities found in this package.

### Strings

```ts
import {
  capitalize,
  decodeFromBase64,
  encodeToBase64,
  decodeFromBase64JsonString,
  encodeToBase64JsonString,
  explode,
  nodent,
  oneline,
  undent,
} from '@bscotch/utility';
```

### Paths

```ts
import { toPosixPath, sortedPaths, parentPaths } from '@bscotch/utility';

/*
 * [
 *  'hello',
 *  'h/another',
 *  'hello/world',
 *  'hello/world/goodbye'
 * ];
 */

// Get all paths leading to a target path
parentPaths('/hello/world/foo/bar.txt'); // =>
/*
 * [
 *  '/',
 *  '/hello',
 *  '/hello/world',
 *  '/hello/world/foo',
 *  '/hello/world/foo/bar.txt'
 * ]
 *
 */
```

### Files

```ts
import {
  listPathsSync,
  listFoldersSync,
  listFilesSync,
  listFilesByExtensionSync,
  removeEmptyDirsSync,
} from '@bscotch/utility';

const recursive = true;

listPathsSync('.', recursive); // => paths to all files and folders in cwd
listFoldersSync('.', recursive); // => the subset of paths that are folders
listFilesSync('.', recursive); // => the subset of paths that are files
listFilesByExtensionSync('.', 'txt', recursive); // => the subset of files that end with '.txt'
listFilesByExtensionSync('.', ['txt', 'md'], recursive); // => the subset of files that end with '.txt' or '.md'
removeEmptyDirsSync('.'); // Remove all empty directories (recursively)
```

### Waits

```ts
import {
  waitForMillis,
  waitForSeconds,
  waitForTick,
} from '@bscotch/utility';

async myAsynFunction(){
  // Wait for 1 second
  await waitForMillis(1000);
  // Wait for 1 second
  await waitForSeconds(1);
  // Wait until next tick
  await waitForTick();
}
```

### Objects

```ts
import {
  isPlainObject,
  isPlainObjectOrArray,
  asObjectIfArray,
  flattenObjectPaths,
  objectPaths,
  getValueAtPath,
  setValueAtPath,
  objectPathsFromWildcardPath,
  transformValueByPath,
} from '@bscotch/utility';

asObjectIfArray(['hello']); // return {'0':'hello'}
const testObject = {
  hello: 'world',
  nested: {
    layer: 1,
    array: [4, 6, 7],
  },
};
flattenObjectPaths(testObject); // returns:
/**
 * {
 *  'hello':'world',
 *  'nested.layer': 1,
 *  'nested.array.0': 4,
 *  'nested.array.1': 6,
 *  'nested.array.2': 7,
 * }
 */
objectPaths(testObject); // returns keys from flattenObjectPaths(testObject)
getValueAtPath(testObject, 'nested.array.2'); // returns 7
setValueAtPath(testObject, 'new.0.field', 10); // adds 'new' field to set to [{field:10}]
objectPathsFromWildcardPath('nested.*', testObject); // returns:
// ['nested.layer','nested.array']
objectPathsFromWildcardPath('nested.array.*', testObject); // returns:
// ['nested.array.0','nested.array.1','nested.array.2]
transformValueByPath(testObject, 'nested.array.*', (n) => ++n); // Increments all array values by 1
```

### Crypto

```ts
import {
  md5,
  sha1,
  sha256,
  createHash,
  encrypt,
  decrypt,
} from '@bscotch/utility';

let hash = md5('hello world'); // hex hash
hash = sha256('hello world', 'base64'); // Base64 hash
hash = createHash('sha1', 'hello world');

const key = '00000000000000000000000000000000';
const encrypted = encrypt('Hello World', key);
const sourceAsBuffer = decrypt(encrypted, key);
```

### Dates

```ts
import {
  dateSort,
  dateSortDescending,
  dateDifferenceMillis,
  dateDifferenceSeconds,
  dateDifferenceMinutes,
  dateDifferenceHours,
  dateDifferenceDays,
  dateIsGreaterThan,
  dateIsInTheFuture,
  dateIsInThePast,
  dateIsLessThan,
  dateIsOlderThanMillisAgo,
  dateIsOlderThanSecondsAgo,
  dateIsOlderThanMinutesAgo,
  dateIsOlderThanHoursAgo,
  dateIsOlderThanDaysAgo,
  isDate,
  isValidDate,
  assertIsValidDate
} from '@bscotch/utility';
```

### Arrays

```ts
import {
  arrayWrapped,
  arrayUnwrapped,
  arrayIsIncreasing,
  arraySortNumeric,
  arraySortNumericDescending,
} from '@bscotch/utility';

arrayIsIncreasing([-10, 99, 1111]); // => true

arrayWrapped('hello'); // => ["hello"]
arrayWrapped(['hello']); // => ["hello"]
arrayWrapped(undefined); // => []

arrayUnwrapped('hello'); // => "hello"
arrayUnwrapped(['hello']); // => "hello"
arrayUnwrapped(['hello', 'goodbye']); // => "hello"
```
