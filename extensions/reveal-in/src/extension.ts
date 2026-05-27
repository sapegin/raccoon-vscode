import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  window,
  commands,
  type ExtensionContext,
  workspace,
  type Uri,
} from 'vscode';
import { openInApp } from '../../../shared/openInApp';
import { logMessage } from './debug';

const execFileAsync = promisify(execFile);

/**
 * Open given path in a given app.
 */
async function openPathInApp(app: string, filepath: string) {
  try {
    await openInApp(app, filepath);
  } catch (error) {
    logMessage(`Cannot open ${app}:`, error);
    if (error instanceof Error) {
      window.showErrorMessage(`Cannot open ${app}`);
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

async function revealFileInApp(app: string) {
  const { uri } = window.activeTextEditor?.document ?? {};

  const folderPath = uri ? path.dirname(uri.fsPath) : getProjectPath(uri);
  if (folderPath === undefined) {
    window.showWarningMessage(`Open a workspace to use Reveal in ${app}`);
    return;
  }

  logMessage(`Reval file in ${app}`, folderPath);

  await openPathInApp(app, folderPath);
}

async function revealProjectInApp(app: string) {
  const { uri } = window.activeTextEditor?.document ?? {};

  const projectPath = getProjectPath(uri);
  if (projectPath === undefined) {
    window.showWarningMessage(`Open a workspace to use Reveal in ${app}`);
    return;
  }

  logMessage(`Reval project in ${app}`, projectPath);

  await openPathInApp(app, projectPath);
}

async function revealProjectViaCli(app: string, cli: string, arg: string) {
  const { uri } = window.activeTextEditor?.document ?? {};
  const projectPath = getProjectPath(uri);
  if (projectPath === undefined) {
    window.showWarningMessage(`Open a workspace to use Reveal in ${app}`);
    return;
  }

  logMessage(`Reveal project in ${app}`, projectPath);

  try {
    await execFileAsync(cli, [arg, projectPath]);
  } catch (error) {
    logMessage(`Cannot open ${app}:`, error);
    if (error instanceof Error) {
      window.showErrorMessage(`Cannot open ${app}`);
    }
  }
}

export function activate(context: ExtensionContext) {
  logMessage('📂 Reveal in starting…');

  context.subscriptions.push(
    commands.registerCommand('revealIn.revealFileGhostty', () => {
      return revealFileInApp('Ghostty');
    }),
    commands.registerCommand('revealIn.revealProjectGhostty', () => {
      return revealProjectInApp('Ghostty');
    }),
    commands.registerCommand('revealIn.revealProjectGitHubDesktop', () => {
      return revealProjectViaCli('GitHub Desktop', 'github', 'open');
    }),
    commands.registerCommand('revealIn.revealFileNimbleCommander', () => {
      return revealFileInApp('Nimble Commander');
    }),
    commands.registerCommand('revealIn.revealProjectNimbleCommander', () => {
      return revealProjectInApp('Nimble Commander');
    })
  );
}
