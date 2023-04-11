import { ok } from 'assert';
import { type PathyOrString } from '@bscotch/pathy';
import { ConfigFile } from './configFile.js';
import type {
  VscodeWorkspaceData,
  VscodeWorkspaceFolder,
} from './vscodeWorkspaceConfig.types.js';

export * from './vscodeWorkspaceConfig.types.js';

/**
 * Helper class for managing a VSCode workspace
 * configuration file (extension `.code-workspace`).
 *
 * *Very* incomplete implementation of the config options.
 *
 * @alpha
 */
export class VscodeWorkspace extends ConfigFile<VscodeWorkspaceData> {
  constructor(options: { path: PathyOrString }) {
    ok(
      options.path.toString().endsWith('.code-workspace'),
      'VSCode workspace files use extension `.code-workspace`',
    );
    super(options);
  }

  async addFolder(folder: VscodeWorkspaceFolder) {
    this.data.folders ||= [];
    folder = {
      ...folder,
      path: this.dir.relativeTo(folder.path),
    };
    if (!this.data.folders.find((f) => f.path === folder.path)) {
      this.data.folders.push(folder);
      await this.save();
    }
  }
}
