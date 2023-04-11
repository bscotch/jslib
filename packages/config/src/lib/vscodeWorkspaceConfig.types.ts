import type { PathyOrString } from '@bscotch/pathy';

export interface VscodeTasksInputBase {
  id: string;
  description: string;
  default: string;
}

export interface VscodeTasksInputPrompt extends VscodeTasksInputBase {
  type: 'promptString';
}
export interface VscodeTasksInputPick extends VscodeTasksInputBase {
  type: 'pickString';
  options: (
    | {
        label: string;
        value: string;
      }
    | string
  )[];
}

export type VscodeTasksInput = VscodeTasksInputPrompt | VscodeTasksInputPick;

export interface VscodeTasks {
  version: string;
  inputs?: VscodeTasksInput[];
  tasks?: Record<string, any>[];
}

export interface VscodeWorkspaceFolder {
  name?: string;
  path: PathyOrString;
}

export interface VscodeWorkspaceData {
  folders?: VscodeWorkspaceFolder[];
  settings?: {
    tasks: VscodeTasks;
    [key: string]: unknown;
  };
}

export interface VscodeWorkspaceOptions {
  /**
   * The path to the workspace file
   * (should end in `.code-workspace`).
   */
  path?: PathyOrString;
}
