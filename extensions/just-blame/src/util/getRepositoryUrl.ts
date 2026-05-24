import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const promiseExecFile = promisify(execFile);

/**
 * Retrieves and normalizes the repository URL from Git configuration.
 *
 * Examples:
 * - https://github.com/sapegin/taco-cat
 */
export async function getRepositoryUrl(
  gitRoot: string,
  remoteName = 'origin'
): Promise<string> {
  let remote: string;
  try {
    const { stdout } = await promiseExecFile(
      'git',
      ['remote', 'get-url', remoteName],
      { cwd: gitRoot }
    );
    remote = stdout.trim();
  } catch {
    throw new Error(`Couldn't find ${remoteName} URL`);
  }

  if (!remote) {
    throw new Error(`Couldn't find ${remoteName} URL`);
  }

  if (remote.startsWith('https://github.com/')) {
    // https://github.com/sapegin/taco-cat.git
    return remote.replace(/\.git$/, '');
  }

  if (remote.startsWith('git@github.com:')) {
    // git@github.com:sapegin/taco-cat.git
    return remote
      .replace(/^git@github.com:/, 'https://github.com/')
      .replace(/\.git$/, '');
  }

  return remote;
}
