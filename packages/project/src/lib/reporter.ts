import { gray, red } from '@bscotch/validation';
import { default as chalk } from 'chalk';
import { diffLines } from 'diff';
import { default as Mocha, Runner } from 'mocha';

import { install as installSourceMapSupport } from 'source-map-support';

const {
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
} = Mocha.Runner.constants;

const green = chalk.rgb(50, 168, 82);

function diff(err: Error & { actual?: string; expected?: string }) {
  if (typeof err.actual === 'string' && typeof err.expected === 'string') {
    const diff = diffLines(err.actual, err.expected)
      .map((change) =>
        (change.added ? green : change.removed ? red : gray)(change.value),
      )
      .join('');
    return `${green('Expected')} ${gray('vs')} ${red('Actual')}\n\n${diff}`;
  }
  return;
}

interface MochaError extends Error {
  actual?: string;
  expected?: string;
  diff?: string;
  title: string;
}

function indent(str: string, amount = 1) {
  if (amount === 0) {
    return str;
  }
  return str
    .split('\n')
    .map((line) => '  '.repeat(amount) + line)
    .join('\n');
}

function logError(err: MochaError, indentLevel = 0) {
  err.diff && console.log(indent(err.diff, indentLevel));
  err.stack && console.log(indent(err.stack, indentLevel));
}

// this reporter outputs test results, indenting two spaces per suite
export default class BscotchReporter extends Mocha.reporters.Base {
  protected currentIndentLevel = 0;
  protected failureCases: MochaError[] = [];

  constructor(runner: Runner) {
    super(runner);
    installSourceMapSupport();

    runner
      .on(EVENT_SUITE_BEGIN, (test) => {
        if (test.title.trim()) {
          console.log(`🧪 ${test.title}`);
        }
        this.increaseIndent();
      })
      .on(EVENT_SUITE_END, () => {
        this.decreaseIndent();
      })
      .on(EVENT_TEST_PASS, (test) => {
        // Test#fullTitle() returns the suite name(s)
        // prepended to the test title
        if (test.title.trim()) {
          console.log(this.indentLines(`${green('+')} ${test.title}`));
        }
      })
      .on(EVENT_TEST_FAIL, (test, err: MochaError) => {
        console.log(this.indentLines(`${red('-')} ${test.title}`));
        err.diff = diff(err);
        err.title = test.title;
        logError(err);
        this.failureCases.push(err);
      })
      .once(EVENT_RUN_END, () => {
        const failures = this.runner.failures;

        for (let i = 0; i < this.failureCases.length; i++) {
          const err = this.failureCases[i];
          console.log('\n', gray('-'.repeat(20)));
          console.log(red(`\n[Failure ${i}]`), err.title);
          logError(err, 1);
        }
        console.log(
          `\n${failures > 0 ? '🔥' : '✔'} ${(failures > 0 ? red : green)(
            this.runner.stats!.passes,
          )}/${
            this.runner.stats!.passes + this.runner.stats!.failures
          } passed\n`,
        );
      });
  }

  indentLines(str: string) {
    return indent(str, this.currentIndentLevel);
  }

  increaseIndent() {
    this.currentIndentLevel++;
  }

  decreaseIndent() {
    this.currentIndentLevel--;
  }
}
