import childProcess from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import open from 'open';
import {
  window,
  commands,
  type ExtensionContext,
  workspace,
  type Uri,
} from 'vscode';
import { logMessage } from './debug';

export const promiseExec = promisify(childProcess.exec);

/**
 * Open given path in Ghostty
 * XXX: This supposed to work cross-platform but was only tested on macOS,
 * and may need adjustments for other platforms
 */
async function openGhostty(filepath: string) {
  try {
    await open(filepath, { app: { name: 'ghostty' } });
  } catch (error) {
    logMessage('Cannot open Ghostty:', error);
    if (error instanceof Error) {
      window.showErrorMessage(error.message);
    }
  }
}

/**
 * Return project path for a given file
 */
function getProjectPath(uri?: Uri) {
  if (uri) {
    // Return workspace folder for the open file
    return workspace.getWorkspaceFolder(uri)?.uri.fsPath;
  } else {
    // Fallback to the first open workspace’s folder
    return workspace.workspaceFolders?.[0]?.uri.fsPath;
  }
}

export function activate(context: ExtensionContext) {
  logMessage('📂 Reveal in Ghostty starting...');

  context.subscriptions.push(
    commands.registerCommand('revealInGhostty.revealFile', async () => {
      const { uri } = window.activeTextEditor?.document ?? {};

      const folderPath = uri ? path.dirname(uri.fsPath) : getProjectPath(uri);
      if (folderPath === undefined) {
        window.showWarningMessage('Open a workspace to use Reveal in Ghostty');
        return;
      }

      logMessage('Reval file', folderPath);

      await openGhostty(folderPath);
    }),
    commands.registerCommand('revealInGhostty.revealProject', async () => {
      const { uri } = window.activeTextEditor?.document ?? {};

      const projectPath = getProjectPath(uri);
      if (projectPath === undefined) {
        window.showWarningMessage('Open a workspace to use Reveal in Ghostty');
        return;
      }

      logMessage('Reval project', projectPath);

      await openGhostty(projectPath);
    })
  );
}
