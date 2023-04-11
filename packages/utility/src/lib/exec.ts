import { spawn, SpawnOptions } from 'child_process';

/**
 * Execute a command in a child process.
 */
export function exec(
  command: string,
  commandArgs: (string | undefined | null | false)[],
  options?: SpawnOptions & {
    /**
     * If `true`:
     * - stdout/err will not be written to the console of the calling process
     * - the command will not be printed to the console of the calling process
     */
    silent?: boolean;
  },
) {
  const args: string[] = commandArgs.filter(
    (arg) => arg && typeof arg === 'string',
  ) as string[];
  if (!options?.silent) {
    console.info(`Running command: ${command} ${args.join(' ')}`);
  }
  const child = spawn(command, args, {
    // stdio: 'inherit',
    ...options,
  });
  const out = { stdout: '', stderr: '', code: 0 };
  for (const pipe of ['stdout', 'stderr'] as const) {
    child[pipe]?.on('data', (data) => {
      const dataString = data.toString();
      out[pipe] += dataString;
      if (!options?.silent) {
        console[pipe === 'stdout' ? 'log' : 'error'](dataString);
      }
    });
  }
  return new Promise<typeof out>((resolve, reject) => {
    const exitMessages = ['close', 'exit', 'disconnect', 'error'];
    for (const exitMessage of exitMessages) {
      child.on(exitMessage, (...args) => {
        const code = args[0];
        if (code === 0) {
          resolve(out);
        } else {
          reject(out);
        }
      });
    }
  });
}
