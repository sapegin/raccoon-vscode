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
  didNavigationWrap,
  getAdjacentPath,
  isIgnoredPath,
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

function getVisibleEditor(uri: Uri): TextEditor | undefined {
  const uriString = uri.toString();
  return window.visibleTextEditors.find(
    (editor) => editor.document.uri.toString() === uriString
  );
}

async function waitForVisibleEditor(uri: Uri): Promise<TextEditor | undefined> {
  const deadline = Date.now() + editorRevealTimeoutMs;

  while (Date.now() < deadline) {
    const editor = getVisibleEditor(uri);
    if (editor !== undefined) {
      return editor;
    }

    await delay(50);
  }

  return getVisibleEditor(uri);
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
  /** Prevents an immediate cross-file bounce after entering a file. */
  #suppressAdjacentPath: string | undefined;

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
    const input = getActiveDiffInput();
    const modifiedEditor = input && getVisibleEditor(input.modified);
    if (input === undefined) {
      if (window.activeTextEditor === undefined) {
        return;
      }

      await this.openEntryChange(
        window.activeTextEditor.document.uri,
        direction
      );
      return;
    }

    if (modifiedEditor === undefined) {
      await commands.executeCommand(commandsByDirection[direction]);
      return;
    }

    const beforeLine = modifiedEditor.selection.active.line;
    await commands.executeCommand(commandsByDirection[direction]);

    const activeInput = getActiveDiffInput();
    const activeEditor = activeInput && getVisibleEditor(activeInput.modified);
    if (
      activeInput === undefined ||
      activeEditor === undefined ||
      activeInput.modified.toString() !== input.modified.toString() ||
      didNavigationWrap(
        direction,
        beforeLine,
        activeEditor.selection.active.line
      ) === false
    ) {
      this.#suppressAdjacentPath = undefined;
      return;
    }

    const changes = await this.getChanges(input.modified.fsPath);
    const adjacentPath = getAdjacentPath(
      changes.map((change) => change.uri.fsPath),
      input.modified.fsPath,
      direction
    );
    if (
      adjacentPath === undefined ||
      normalizePath(adjacentPath) === normalizePath(input.modified.fsPath)
    ) {
      return;
    }

    if (normalizePath(adjacentPath) === this.#suppressAdjacentPath) {
      this.#suppressAdjacentPath = undefined;
      return;
    }

    await this.openAdjacentChange(input.modified, direction, adjacentPath);
  }

  private async openEntryChange(
    currentUri: Uri,
    direction: NavigationDirection
  ): Promise<void> {
    const changes = await this.getChanges(currentUri.fsPath);
    const focusedChange = changes.find(
      (change) =>
        normalizePath(change.uri.fsPath) === normalizePath(currentUri.fsPath)
    );
    const targetChange =
      focusedChange ?? (direction === 'next' ? changes[0] : changes.at(-1));
    if (targetChange === undefined) {
      return;
    }

    await commands.executeCommand('git.openChange', targetChange.uri);
    await this.revealBoundaryChange(direction, targetChange.uri);
  }

  private async openAdjacentChange(
    currentUri: Uri,
    direction: NavigationDirection,
    adjacentPath: string
  ): Promise<void> {
    const changes = await this.getChanges(currentUri.fsPath);
    const adjacentChange = changes.find(
      (change) =>
        normalizePath(change.uri.fsPath) === normalizePath(adjacentPath)
    );
    if (adjacentChange === undefined) {
      return;
    }

    this.#suppressAdjacentPath = normalizePath(currentUri.fsPath);
    await commands.executeCommand('git.openChange', adjacentChange.uri);
    await this.revealBoundaryChange(direction, adjacentChange.uri);
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

  private async revealBoundaryChange(
    direction: NavigationDirection,
    modifiedUri: Uri
  ): Promise<void> {
    const editor = await waitForVisibleEditor(modifiedUri);
    if (editor === undefined) {
      return;
    }

    const boundaryLine = editor.document.lineCount - 1;
    const boundary = editor.document.lineAt(boundaryLine).range.end;
    // Built-in change navigation reaches the first/last hunk from the file
    // end: nextChange wraps to the first hunk, previousChange steps to the last.
    editor.selection = new Selection(boundary, boundary);
    await commands.executeCommand(commandsByDirection[direction]);
  }
}
