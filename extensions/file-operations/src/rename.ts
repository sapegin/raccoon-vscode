import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { commands, Uri, window, workspace, WorkspaceEdit } from 'vscode';
import { logMessage } from './debug';

/** True when paths differ only by letter casing (README.md → Readme.md). */
function isCaseOnlyPathChange(oldPath: string, newPath: string): boolean {
  return oldPath !== newPath && oldPath.toLowerCase() === newPath.toLowerCase();
}

/** Build a sibling URI with a new basename, preserving scheme and path style. */
export function withFileName(uri: Uri, fileName: string): Uri {
  const directory = path.posix.dirname(uri.path);
  const nextPath =
    directory === '/' ? `/${fileName}` : `${directory}/${fileName}`;
  return uri.with({ path: nextPath });
}

async function saveActiveDocumentIfDirty(uri: Uri): Promise<boolean> {
  const activeDocument = window.activeTextEditor?.document;
  if (
    activeDocument?.uri.toString() !== uri.toString() ||
    !activeDocument.isDirty
  ) {
    return true;
  }
  return (await activeDocument.save()) !== false;
}

function isSameFilePath(a: Uri, b: Uri): boolean {
  return a.fsPath.toLowerCase() === b.fsPath.toLowerCase();
}

async function refreshEditorAfterRename(
  oldUri: Uri,
  newUri: Uri
): Promise<void> {
  const activeEditor = window.activeTextEditor;
  if (activeEditor === undefined) {
    return;
  }

  const activeUri = activeEditor.document.uri;
  const caseOnly = isCaseOnlyPathChange(oldUri.fsPath, newUri.fsPath);
  const renamedActiveFile =
    activeUri.toString() === oldUri.toString() ||
    (caseOnly && isSameFilePath(activeUri, oldUri));

  if (!renamedActiveFile) {
    return;
  }

  const { viewColumn, selection } = activeEditor;

  // Case-only URIs compare equal inside VS Code, so showTextDocument is a no-op
  // and the tab keeps the old basename. Close and reopen to refresh the label.
  if (caseOnly) {
    await commands.executeCommand('workbench.action.closeActiveEditor');
    const document = await workspace.openTextDocument(newUri);
    await window.showTextDocument(document, { viewColumn, selection });
    return;
  }

  await window.showTextDocument(newUri, {
    viewColumn,
    preserveFocus: true,
  });
}

/**
 * When `applyEdit` canonicalizes Readme.md to README.md, the working-copy
 * rename succeeds but the on-disk basename may keep the old casing. Fix it with
 * a direct `workspace.fs.rename`, which preserves the target URI’s casing.
 */
async function fixCaseOnlyDiskName(newUri: Uri): Promise<void> {
  const directory = path.dirname(newUri.fsPath);
  const wantedBase = path.basename(newUri.fsPath);
  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch {
    return;
  }

  const actualBase = entries.find(
    (entry) => entry.toLowerCase() === wantedBase.toLowerCase()
  );
  if (actualBase === undefined || actualBase === wantedBase) {
    return;
  }

  const actualUri = Uri.file(path.join(directory, actualBase));
  logMessage('Fixing on-disk casing:', actualBase, '→', wantedBase);
  await workspace.fs.rename(actualUri, newUri, { overwrite: true });
}

/**
 * Explorer renames go through `bulkEditService` with the target URI the user
 * typed. Extension `applyEdit` runs `asCanonicalUri` on both URIs first, so a
 * direct Readme.md edit collapses to README.md and becomes a no-op on
 * case-insensitive volumes — no `onDidRenameFiles`, no import updates.
 *
 * Match explorer by routing through working-copy renames (for participants such
 * as TypeScript) via a disposable bridge name, then fix on-disk casing if
 * canonicalization picked the wrong one.
 */
async function applyCaseOnlyRename(uri: Uri, newUri: Uri): Promise<boolean> {
  if ((await saveActiveDocumentIfDirty(uri)) === false) {
    return false;
  }

  const bridgeUri = withFileName(
    uri,
    `.file-operations-${randomUUID()}.rename-bridge`
  );

  logMessage('Case-only rename:', uri.fsPath, '→', newUri.fsPath);

  const toBridge = new WorkspaceEdit();
  toBridge.renameFile(uri, bridgeUri, {
    overwrite: false,
    ignoreIfExists: false,
  });
  if ((await workspace.applyEdit(toBridge)) === false) {
    return false;
  }

  const toFinal = new WorkspaceEdit();
  toFinal.renameFile(bridgeUri, newUri, {
    overwrite: true,
    ignoreIfExists: false,
  });
  if ((await workspace.applyEdit(toFinal)) === false) {
    const rollback = new WorkspaceEdit();
    rollback.renameFile(bridgeUri, uri, {
      overwrite: false,
      ignoreIfExists: false,
    });
    await workspace.applyEdit(rollback);
    return false;
  }

  try {
    await fixCaseOnlyDiskName(newUri);
  } catch (error) {
    logMessage('Case-only casing fix failed:', String(error));
  }

  await refreshEditorAfterRename(uri, newUri);
  return true;
}

async function applyFileRename(uri: Uri, newUri: Uri): Promise<boolean> {
  if (isCaseOnlyPathChange(uri.fsPath, newUri.fsPath)) {
    return applyCaseOnlyRename(uri, newUri);
  }

  const edit = new WorkspaceEdit();
  edit.renameFile(uri, newUri, { overwrite: false, ignoreIfExists: false });
  return await workspace.applyEdit(edit);
}

export async function renameFile(uri: Uri): Promise<void> {
  const oldName = path.basename(uri.fsPath);
  const newName = await window.showInputBox({
    prompt: 'New file name',
    value: oldName,
    valueSelection: getBaseNameSelection(oldName),
  });
  if (!newName || newName === oldName) {
    return;
  }

  const newUri = withFileName(uri, newName);
  logMessage('Renaming:', uri.fsPath, '→', newUri.fsPath);

  try {
    const ok = await applyFileRename(uri, newUri);
    if (ok === false) {
      window.showErrorMessage(`Can’t rename to ${newName}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      logMessage('Can’t rename file:', error.message);
      window.showErrorMessage(`Can’t rename to ${newName}`);
    }
  }
}

/** Selection range covering the basename without its extension. */
function getBaseNameSelection(fileName: string): [number, number] {
  const extension = path.extname(fileName);
  return [0, fileName.length - extension.length];
}
