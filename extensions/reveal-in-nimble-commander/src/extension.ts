import childProcess from 'node:child_process';
import { promisify } from 'node:util';
import { window, commands, type ExtensionContext, workspace } from 'vscode';
import { logMessage } from './debug';

export const promiseExec = promisify(childProcess.exec);

/**
 * Execute command with error handling
 */
async function execute(command: string) {
  try {
    await promiseExec(command);
  } catch (error) {
    logMessage('Cannot execute command:', error);
    if (error instanceof Error) {
      window.showErrorMessage(error.message);
    }
  }
}

export function activate(context: ExtensionContext) {
  logMessage('📂 Reveal in Nimble Commander starting...');

  context.subscriptions.push(
    commands.registerCommand('revealInNimbleCommander.revealFile', async () => {
      const { uri } = window.activeTextEditor?.document ?? {};
      if (uri === undefined) {
        window.showWarningMessage(
          'Open a file to use Reveal in Nimble Commander'
        );
        return;
      }

      const filepath = uri.fsPath;

      logMessage('Reval file', filepath);

      await execute(`open -a 'Nimble Commander' '${filepath}'`);
    }),
    commands.registerCommand(
      'revealInNimbleCommander.revealProject',
      async () => {
        const { uri } = window.activeTextEditor?.document ?? {};
        if (uri === undefined) {
          window.showWarningMessage(
            'Open a file to use Reveal in Nimble Commander'
          );
          return;
        }

        const projectPath = workspace.getWorkspaceFolder(uri)?.uri.fsPath;
        if (projectPath === undefined) {
          window.showWarningMessage(
            'Open a workspace to use Reveal in Nimble Commander'
          );
          return;
        }

        logMessage('Reval project', projectPath);

        await execute(`open -a 'Nimble Commander' '${projectPath}'`);
      }
    )
  );
}
