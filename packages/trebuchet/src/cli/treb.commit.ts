import { Pathy } from '@bscotch/pathy';
import { md5 } from '@bscotch/utility';
import { ok } from 'assert';
import { default as inquirer } from 'inquirer';
import os from 'os';
import type { Workspace } from '../index.js';
import { GitLog, GitLogChangeDescription } from '../lib/gitLog.js';

function commitTempFilePath(workspace: Workspace) {
  return new Pathy<GitLogChangeDescription>(os.tmpdir()).join(
    `treb-aborted-commit.${md5(workspace.dir.absolute)}.json`,
  );
}

export async function trebCommit(workspace: Workspace) {
  const tempPath = commitTempFilePath(workspace);
  const defaults = (await tempPath.exists())
    ? await tempPath.read<GitLogChangeDescription>()
    : {};

  const changeTypes = GitLog.changeDescriptionConfig;
  const status = await workspace.repo.git.status();
  ok(status.staged.length, `No files are staged for the commit!`);

  const shouldRetry = await inquirer.prompt<{ retry: boolean }>([
    {
      type: 'confirm',
      name: 'retry',
      message: 'Retry the last commit?',
      when() {
        return Object.keys(defaults).length;
      },
    },
  ]);

  const description = await inquirer.prompt<GitLogChangeDescription>(
    [
      {
        type: 'list',
        name: 'type',
        message: 'Type of change:',
        validate(value: string[]) {
          return !!value.length || `You must select a category.`;
        },
        choices: changeTypes.map((changeType) => {
          return {
            name: `${changeType.icon} ${changeType.name}`,
            value: changeType.icon,
          };
        }),
      },
      {
        type: 'input',
        name: 'title',
        message: 'Short summary of the change:',
        validate(value: string) {
          return !!value.length || `You must provide a short summary.`;
        },
      },
      {
        type: 'confirm',
        name: 'breaking',
        message: 'Is this a breaking change?',
        default: false,
      },
    ],
    shouldRetry.retry === true ? defaults : {},
  );

  await tempPath.write(description);

  await workspace.repo.commit(description);

  await tempPath.delete();
}
