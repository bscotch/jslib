# Debounce Watch

**⚠ In active development and subject to major change! ⚠**

There are some great libraries out there for triggering code when files change, including [chokidar](https://github.com/paulmillr/chokidar#readme) and [nodemon](https://github.com/remy/nodemon#readme).

A file watcher utility that _debounces_ file changes before triggering an event is much harder to find. That's the purpose of Debounce Watch.

**📢 Announcement 📢** The deployed version of this package found [on npm](https://www.npmjs.com/package/@bscotch/debounce-watch) is from an _internal_ fork of the public repo. The public repo will eventually be deleted. Non-Bscotch users should use the npm package for the most up-to-date version.

## What's "Debouncing"?

The goal of "Debouncing" is to prevent an event-invoked action from being invoked multiple times _while redundant events keep happening_. In essence, once the events start we want to wait until they _stop_ before firing off some action in response.

This is useful for cases where file system changes occur in batches but you only want subsequent actions to occur once all changes are complete (e.g. when compiling a Typescript project to JavaScript).

Nodemon and chokidar provide _delay_ options to approximately get at this, such that the triggered action will occur that amount of time after the first event is detected. However, there is no way to guarantee that the delay will encompass all events in a batch.

## How does Debounce Watch work?

Debounce Watch uses chokidar to watch for file system changes, collects a list of all changes that have occurred, and calls a function you provide on that list once the file system changes become less frequent than your debounce timeout.

## Requirements

- Available as ECMAScript Modules only, so will not work with Node.js < v13.2

## Usage

Install with `npm install @bscotch/debounce-watch`.

Use in your code:

```ts
// (Example in Typescript)

import { debounceWatch } from '@bscotch/debounce-watch';
import type { DebouncedEventsProcessor } from '@bscotch/debounce-watch';

// Your function can be sync or async
const processDebouncedEvents: DebouncedEventsProcessor = (events) => {
  for (const event of events) {
    if (event.event == 'add') {
      // Do something related to a file being added!
    }
  }
};

const watcher = await debounceWatch('folder/of/files', processDebouncedEvents, {
  onlyFileExtensions: ['ts', 'js'],
  debounceWaitSeconds: 0.2,
  allowOverlappingRuns: true,
});
```
