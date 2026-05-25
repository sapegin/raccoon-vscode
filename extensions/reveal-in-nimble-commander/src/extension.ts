import { window, commands, type ExtensionContext, workspace } from 'vscode';
import { openInApp } from '../../../shared/openInApp';
import { logMessage } from './debug';

/**
 * Open given path in Nimble Commander
 */
async function openNimbleCommander(filepath: string) {
  try {
    await openInApp('Nimble Commander', filepath);
  } catch (error) {
    logMessage('Cannot open Nimble Commander:', error);
    if (error instanceof Error) {
      window.showErrorMessage('Cannot open Nimble Commander');
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

      await openNimbleCommander(filepath);
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

        await openNimbleCommander(projectPath);
      }
    )
  );
}
