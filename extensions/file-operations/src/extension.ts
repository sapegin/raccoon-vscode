import path from 'node:path';
import {
  commands,
  env,
  window,
  workspace,
  WorkspaceEdit,
  type ExtensionContext,
} from 'vscode';
import { logMessage } from './debug';
import { renameFile, withFileName } from './rename';

/**
 * Return the URI of the active editor’s file, or `undefined` and show a warning
 * if the active document isn’t a file on disk.
 */
function getActiveFileUri() {
  const uri = window.activeTextEditor?.document.uri;
  if (uri?.scheme !== 'file') {
    window.showWarningMessage('Open a file to use this command');
    return undefined;
  }
  return uri;
}

/**
 * Compute the input box selection that covers the base name without its
 * extension (matching VS Code’s built-in rename UX).
 */
function getBaseNameSelection(fileName: string): [number, number] {
  const extension = path.extname(fileName);
  return [0, fileName.length - extension.length];
}

async function duplicateFile() {
  const uri = getActiveFileUri();
  if (uri === undefined) {
    return;
  }

  const oldName = path.basename(uri.fsPath);
  const extension = path.extname(oldName);
  const stem = path.basename(oldName, extension);
  const suggested = `${stem}-copy${extension}`;

  const newName = await window.showInputBox({
    prompt: 'Name for the duplicate',
    value: suggested,
    valueSelection: getBaseNameSelection(suggested),
  });
  if (newName === undefined || newName === '' || newName === oldName) {
    return;
  }

  const newUri = withFileName(uri, newName);
  logMessage('Duplicating:', uri.fsPath, '→', newUri.fsPath);

  try {
    await workspace.fs.copy(uri, newUri, { overwrite: false });
    await window.showTextDocument(newUri);
  } catch (error) {
    if (error instanceof Error) {
      logMessage('Can’t duplicate file:', error.message);
      window.showErrorMessage(`Can’t duplicate to ${newName}`);
    }
  }
}

async function removeFile() {
  const uri = getActiveFileUri();
  if (uri === undefined) {
    return;
  }

  const name = path.basename(uri.fsPath);
  logMessage('Deleting:', uri.fsPath);

  try {
    // Route through `WorkspaceEdit` so language services (e.g. TypeScript) get
    // a chance to contribute import cleanups via `onWillDeleteFiles`, and force
    // the Refactor Preview panel so the user sees every affected file and can
    // cancel — similar in spirit to JetBrains’ Safe Delete.
    const edit = new WorkspaceEdit();
    edit.deleteFile(
      uri,
      { recursive: false, ignoreIfNotExists: false },
      { needsConfirmation: true, label: `Delete ${name}` }
    );
    const ok = await workspace.applyEdit(edit);
    if (ok === false) {
      // User cancelled the preview, or the edit could not be applied.
      logMessage('Delete cancelled or rejected for:', uri.fsPath);
    }
  } catch (error) {
    if (error instanceof Error) {
      logMessage('Can’t delete file:', error.message);
      window.showErrorMessage(`Can’t delete ${name}`);
    }
  }
}

async function copyFileName() {
  const uri = getActiveFileUri();
  if (uri === undefined) {
    return;
  }

  const name = path.basename(uri.fsPath);
  await env.clipboard.writeText(name);
  window.showInformationMessage(`Copied: ${name}`);
}

export function activate(context: ExtensionContext) {
  logMessage('💾 File Operations starting…');

  context.subscriptions.push(
    commands.registerCommand('fileOperations.renameFile', async () => {
      const uri = getActiveFileUri();
      if (uri !== undefined) {
        await renameFile(uri);
      }
    }),
    commands.registerCommand('fileOperations.duplicateFile', duplicateFile),
    commands.registerCommand('fileOperations.removeFile', removeFile),
    commands.registerCommand('fileOperations.copyFileName', copyFileName)
  );
}
