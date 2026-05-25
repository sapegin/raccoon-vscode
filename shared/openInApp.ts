import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Open a file or folder in a macOS application via `/usr/bin/open`.
 *
 * Uses `execFile` (not `exec`), so `appName` and `target` are passed as
 * separate arguments and never interpreted by a shell — paths containing
 * spaces, quotes, or other shell metacharacters are safe.
 *
 * MacOS only.
 */
export async function openInApp(
  appName: string,
  target: string
): Promise<void> {
  await execFileAsync('/usr/bin/open', ['-a', appName, target]);
}
