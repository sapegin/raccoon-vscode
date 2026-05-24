import path from 'node:path';
import { commands, window, workspace, type ExtensionContext } from 'vscode';
import { logMessage } from './debug';
import Picker from './Picker';

function getPaths() {
  if (window.activeTextEditor) {
    // Document is open, best case scenario
    const { uri } = window.activeTextEditor.document;
    return {
      workspaceRoot: workspace.getWorkspaceFolder(uri)?.uri.fsPath,
      relativeBase: path.dirname(workspace.asRelativePath(uri)),
    };
  } else {
    // No document open, fallback to the root of the first open workspace
    return {
      workspaceRoot: workspace.workspaceFolders?.[0]?.uri.fsPath,
      relativeBase: '',
    };
  }
}

export function activate(context: ExtensionContext) {
  logMessage('🆕 New File Now starting...');

  context.subscriptions.push(
    commands.registerCommand('newFileNow.createNewFile', () => {
      const { workspaceRoot, relativeBase } = getPaths();

      if (workspaceRoot === undefined) {
        window.showWarningMessage('Open a workspace to use New File Now');
        return;
      }

      logMessage('Opening a dialog...');
      logMessage('Workspace root:', workspaceRoot);
      logMessage('Relative base:', relativeBase);

      const quickPick = new Picker(workspaceRoot, relativeBase);
      quickPick.show();
    })
  );
}
