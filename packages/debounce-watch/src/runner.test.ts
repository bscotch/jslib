/**
 * @file Test suite, using Mocha and Chai.
 * Compiled files inside the 'test' folder are excluded from
 * published npm projects.
 * (Note that fs-extra is added as a dev dependency to make
 * sandbox setup much easier. If you aren't using a sandbox
 * you can remove this dependency. If you need fs-extra for
 * your main code, move it into the regular 'dependencies'
 * section of your package.json file)
 */

import path from 'path';
import { resolveInSeconds } from '@bscotch/utility';
import { expect } from 'chai';
import fs from 'fs-extra';
import { debounceWatch, WatcherEvent } from './runner.js';

process.env.DEBUG = 'true';

const sandboxRoot = './sandbox';
const samplesRoot = './samples';

function sandboxPath(relativePath: string) {
  return path.join(sandboxRoot, relativePath);
}

/**
 * Clone any files in a "./samples" folder into
 * a "./sandbox" folder, overwriting any files
 * currently in there. This is useful for allowing
 * your test suite to make changes to files without
 * changing the originals, so that you can easily
 * reset back to an original state prior to running a test.
 */
function resetSandbox() {
  if (!fs.existsSync(samplesRoot)) {
    // Then no samples exist, and no sandbox needed
    return;
  }
  fs.ensureDirSync(sandboxRoot);
  fs.emptyDirSync(sandboxRoot);
  fs.copySync(samplesRoot, sandboxRoot);
}

describe('Watcher', function () {
  beforeEach(function () {
    resetSandbox();
  });

  it('can debounce events', async function () {
    // Ensure it happens only once!
    this.timeout(5000);

    let timesTriggered = 0;
    const collectedEvents: WatcherEvent[] = [];
    const processEvents = (events: WatcherEvent[]) => {
      timesTriggered++;
      collectedEvents.push(...events);
    };

    const debounceWaitSeconds = 0.5;

    const watcher = await debounceWatch(processEvents, sandboxRoot, {
      debounceWaitSeconds,
      chokidarWatchOptions: { ignoreInitial: true },
    });

    // Now make a bunch of changes!
    const timesToSavePerWait = 4;
    const waitPeriods = 3;
    const filesToCreate = timesToSavePerWait * waitPeriods;
    for (let i = 0; i < filesToCreate; i++) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fs.writeFile(sandboxPath(`NEW-FILE-${i}.txt`), 'Some content');
      await resolveInSeconds(debounceWaitSeconds / timesToSavePerWait);
    }

    await resolveInSeconds(debounceWaitSeconds * 1.5); // Provide time for the function to get called
    await watcher.close();
    expect(timesTriggered, 'Should only trigger once.').to.equal(1);
    expect(collectedEvents).to.have.lengthOf(filesToCreate);
  });
});
