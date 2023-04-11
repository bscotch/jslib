import { VscodeWorkspace, VscodeWorkspaceFolder } from '@bscotch/config';
import { Pathy } from '@bscotch/pathy';
import type { Workspace } from './workspace.js';

export async function getWorkspaceVscodeConfig(
  this: Workspace,
): Promise<VscodeWorkspace | undefined> {
  const inCache = this.config.vscodeWorkspaceConfigPath;
  if (inCache === false) {
    return;
  }
  if (inCache) {
    return new VscodeWorkspace({
      path: new Pathy(inCache, this.dir),
    });
  }
  const configPath = await this.dir.findChild(/\.code-workspace$/, {
    recursive: true,
  });
  await this.updateConfig(
    'vscodeWorkspaceConfigPath',
    configPath?.relative || false,
  );
  return configPath && new VscodeWorkspace({ path: configPath });
}

export async function addWorkspaceFolderToVscodeConfig(
  this: Workspace,
  options: VscodeWorkspaceFolder & { dryRun?: boolean },
) {
  const vscodeWorkspace = await this.vscodeWorkspaceConfig();
  if (vscodeWorkspace && !options.dryRun) {
    await vscodeWorkspace?.addFolder({
      name: options.name,
      path: options.path,
    });
  } else if (vscodeWorkspace) {
    console.log(
      `Add ${options.name} to VSCode workspace config: ${vscodeWorkspace.path}`,
    );
  }
}
