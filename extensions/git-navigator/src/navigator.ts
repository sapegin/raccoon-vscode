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

      if (direction === 'next') {
        await this.openFirstChange(window.activeTextEditor.document.uri);
      } else {
        await this.openLastChange(window.activeTextEditor.document.uri);
      }
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
      return;
    }

    await this.openAdjacentChange(input.modified, direction);
  }

  private async openFirstChange(currentUri: Uri): Promise<void> {
    const changes = await this.getChanges(currentUri.fsPath);
    const firstChange = changes[0];
    if (firstChange === undefined) {
      return;
    }

    await commands.executeCommand('git.openChange', firstChange.uri);
    await this.revealBoundaryChange('next', firstChange.uri);
  }

  private async openLastChange(currentUri: Uri): Promise<void> {
    const changes = await this.getChanges(currentUri.fsPath);
    const lastChange = changes.at(-1);
    if (lastChange === undefined) {
      return;
    }

    await commands.executeCommand('git.openChange', lastChange.uri);
    await this.revealBoundaryChange('previous', lastChange.uri);
  }

  private async openAdjacentChange(
    currentUri: Uri,
    direction: NavigationDirection
  ): Promise<void> {
    const changes = await this.getChanges(currentUri.fsPath);
    const adjacentPath = getAdjacentPath(
      changes.map((change) => change.uri.fsPath),
      currentUri.fsPath,
      direction
    );
    if (adjacentPath === undefined || adjacentPath === currentUri.fsPath) {
      return;
    }

    const adjacentChange = changes.find(
      (change) => change.uri.fsPath === adjacentPath
    );
    if (adjacentChange === undefined) {
      return;
    }

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
    return repository.state.workingTreeChanges
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

    const boundaryLine =
      direction === 'next' ? editor.document.lineCount - 1 : 0;
    const boundary = editor.document.lineAt(boundaryLine).range.end;
    // Built-in change navigation reaches the first/last hunk only from the
    // file edge, so move there before delegating to the diff editor command.
    editor.selection = new Selection(boundary, boundary);
    await commands.executeCommand(commandsByDirection[direction]);
  }
}
