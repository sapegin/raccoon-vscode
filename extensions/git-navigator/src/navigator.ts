import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  Selection,
  TabInputTextDiff,
  commands,
  window,
  workspace,
  type TextEditor,
  type Uri,
} from 'vscode';
import {
  compareSourceControlPaths,
  getAdjacentPath,
  isIgnoredPath,
  hasMovedWithinFile,
  normalizePath,
  type NavigationDirection,
} from './navigation';

const commandsByDirection = {
  next: 'workbench.action.compareEditor.nextChange',
  previous: 'workbench.action.compareEditor.previousChange',
} as const;

export interface GitChange {
  readonly uri: Uri;
}

export interface GitRepository {
  readonly rootUri: Uri;
  readonly state: {
    readonly indexChanges: readonly GitChange[];
    readonly workingTreeChanges: readonly GitChange[];
    readonly untrackedChanges: readonly GitChange[];
  };
}

export interface GitApi {
  readonly repositories: readonly GitRepository[];
}

function getActiveDiffInput(): TabInputTextDiff | undefined {
  const input = window.tabGroups.activeTabGroup.activeTab?.input;
  return input instanceof TabInputTextDiff ? input : undefined;
}

const editorRevealTimeoutMs = 2000;
const boundarySettleMs = 100;

function getDiffModifiedEditor(
  diffInput: TabInputTextDiff
): TextEditor | undefined {
  const originalUri = diffInput.original.toString();
  const modifiedUri = diffInput.modified.toString();

  const exactMatch = window.visibleTextEditors.find(
    (editor) => editor.document.uri.toString() === modifiedUri
  );
  if (exactMatch !== undefined) {
    return exactMatch;
  }

  return window.visibleTextEditors.find((editor) => {
    const editorUri = editor.document.uri.toString();
    return (
      editorUri !== originalUri &&
      normalizePath(editor.document.uri.fsPath) ===
        normalizePath(diffInput.modified.fsPath)
    );
  });
}

async function waitForDiffModifiedEditor(
  diffInput: TabInputTextDiff
): Promise<TextEditor | undefined> {
  const deadline = Date.now() + editorRevealTimeoutMs;

  while (Date.now() < deadline) {
    const editor = getDiffModifiedEditor(diffInput);
    if (editor !== undefined) {
      return editor;
    }

    await delay(50);
  }

  return getDiffModifiedEditor(diffInput);
}

function containsPath(rootPath: string, filePath: string): boolean {
  const relativePath = path.relative(rootPath, filePath);
  return (
    relativePath === '' ||
    (relativePath.startsWith(`..${path.sep}`) === false &&
      path.isAbsolute(relativePath) === false)
  );
}

export class Navigator {
  readonly #getGitApi: () => Promise<GitApi | undefined>;
  #pendingNavigation = Promise.resolve();

  public constructor(getGitApi: () => Promise<GitApi | undefined>) {
    this.#getGitApi = getGitApi;
  }

  public enqueue(direction: NavigationDirection): Promise<void> {
    this.#pendingNavigation = this.runQueuedNavigation(
      this.#pendingNavigation,
      direction
    );
    return this.#pendingNavigation;
  }

  private async runQueuedNavigation(
    previousNavigation: Promise<void>,
    direction: NavigationDirection
  ): Promise<void> {
    await previousNavigation;

    try {
      await this.navigate(direction);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.showErrorMessage(`Git Navigator: ${message}`);
    }
  }

  private async navigate(direction: NavigationDirection): Promise<void> {
    const diffInput = getActiveDiffInput();
    const modifiedEditor =
      diffInput === undefined ? undefined : getDiffModifiedEditor(diffInput);

    if (diffInput === undefined) {
      await this.openEntryChange(direction);
      return;
    }

    if (modifiedEditor === undefined) {
      await commands.executeCommand(commandsByDirection[direction]);
      return;
    }

    const beforeLine = modifiedEditor.selection.active.line;
    const currentPath = diffInput.modified.fsPath;
    await commands.executeCommand(commandsByDirection[direction]);

    const activeInput = getActiveDiffInput();
    const activeEditor =
      activeInput === undefined
        ? undefined
        : getDiffModifiedEditor(activeInput);
    if (
      activeInput === undefined ||
      activeEditor === undefined ||
      normalizePath(activeInput.modified.fsPath) !== normalizePath(currentPath)
    ) {
      return;
    }

    const afterLine = activeEditor.selection.active.line;
    if (hasMovedWithinFile(direction, beforeLine, afterLine)) {
      return;
    }

    await this.openAdjacentChange(currentPath, direction);
  }

  private async openEntryChange(direction: NavigationDirection): Promise<void> {
    const activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return;
    }

    const changes = await this.getChanges(activeEditor.document.uri.fsPath);
    if (changes.length === 0) {
      return;
    }

    const changePaths = changes.map((change) => change.uri.fsPath);
    const cursorPath = activeEditor.document.uri.fsPath;
    const cursorOnChangedFile = changePaths.some(
      (changePath) => normalizePath(changePath) === normalizePath(cursorPath)
    );
    const targetPath = cursorOnChangedFile
      ? cursorPath
      : getAdjacentPath(changePaths, cursorPath, direction);
    if (targetPath === undefined) {
      return;
    }

    const change = changes.find(
      (candidate) =>
        normalizePath(candidate.uri.fsPath) === normalizePath(targetPath)
    );
    if (change === undefined) {
      return;
    }

    await commands.executeCommand('git.openChange', change.uri);
    await delay(boundarySettleMs);
    await this.revealBoundaryChange(direction);
  }

  private async openAdjacentChange(
    currentPath: string,
    direction: NavigationDirection
  ): Promise<void> {
    const changes = await this.getChanges(currentPath);
    const changePaths = changes.map((change) => change.uri.fsPath);
    const adjacentPath = getAdjacentPath(changePaths, currentPath, direction);
    if (
      adjacentPath === undefined ||
      normalizePath(adjacentPath) === normalizePath(currentPath)
    ) {
      return;
    }

    const adjacentChange = changes.find(
      (change) =>
        normalizePath(change.uri.fsPath) === normalizePath(adjacentPath)
    );
    if (adjacentChange === undefined) {
      return;
    }

    await commands.executeCommand('git.openChange', adjacentChange.uri);
    await delay(boundarySettleMs);
    await this.revealBoundaryChange(direction);
  }

  private async revealBoundaryChange(
    direction: NavigationDirection
  ): Promise<void> {
    const diffInput = getActiveDiffInput();
    const editor =
      diffInput === undefined
        ? undefined
        : await waitForDiffModifiedEditor(diffInput);
    if (editor === undefined) {
      return;
    }

    await delay(boundarySettleMs);

    // Built-in change navigation reaches the first hunk from the file start and
    // the last hunk from the file end after wrapping across files.
    if (direction === 'next') {
      const start = editor.document.lineAt(0).range.start;
      editor.selection = new Selection(start, start);
    } else {
      const boundaryLine = editor.document.lineCount - 1;
      const boundary = editor.document.lineAt(boundaryLine).range.end;
      editor.selection = new Selection(boundary, boundary);
    }

    await delay(boundarySettleMs);
    await commands.executeCommand(commandsByDirection[direction]);
  }

  private async getChanges(filePath: string): Promise<GitChange[]> {
    const repository = await this.getRepository(filePath);
    if (repository === undefined) {
      return [];
    }

    const ignoredFiles = workspace
      .getConfiguration('gitNavigator')
      .get<readonly string[]>('ignoredFiles', []);
    const changes = [
      ...repository.state.indexChanges,
      ...repository.state.workingTreeChanges,
      ...repository.state.untrackedChanges,
    ];
    const uniqueChanges = [
      ...new Map(
        changes.map((change) => [normalizePath(change.uri.fsPath), change])
      ).values(),
    ];
    return uniqueChanges
      .filter(
        (change) =>
          isIgnoredPath(
            change.uri.fsPath,
            repository.rootUri.fsPath,
            ignoredFiles
          ) === false
      )
      .toSorted((one, other) =>
        compareSourceControlPaths(one.uri.fsPath, other.uri.fsPath)
      );
  }

  private async getRepository(
    filePath: string
  ): Promise<GitRepository | undefined> {
    const git = await this.#getGitApi();
    return git?.repositories
      .filter((repository) => containsPath(repository.rootUri.fsPath, filePath))
      .toSorted(
        (one, other) => other.rootUri.fsPath.length - one.rootUri.fsPath.length
      )[0];
  }
}
