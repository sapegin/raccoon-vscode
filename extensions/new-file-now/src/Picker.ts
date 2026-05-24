import fs from 'node:fs';
import path from 'node:path';
import { window, type QuickPickItem, type QuickPick, Uri } from 'vscode';
import { logMessage } from './debug';

// Octicons icons: https://code.visualstudio.com/api/references/icons-in-labels
const ICON_NONE = '$(squirrel)';
const ICON_FILE = '$(file)';
const ICON_DIRECTORY = '$(folder)';

/**
 * Escapes special characters in a RegExp string.
 */
function escapeRegExp(string: string): string {
  return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export default class Picker {
  /** Root directory of the workspace */
  private workspaceRoot: string;
  /** Directory of the currently open file, relative to the workspace root */
  private relativeBase: string;
  /** Value typed in the quick pick input */
  private value = '';
  private quickPick: QuickPick<QuickPickItem>;

  public constructor(workspaceRoot: string, relativeBase = '') {
    this.workspaceRoot = workspaceRoot;
    this.relativeBase = relativeBase;

    this.quickPick = window.createQuickPick<QuickPickItem>();
    this.quickPick.onDidHide(() => this.quickPick.dispose());
    this.quickPick.onDidAccept(() => this.createNew());
    this.quickPick.onDidChangeValue((input) =>
      this.handleInputValueChange(input)
    );
  }

  public show() {
    this.updateSuggestion();
    this.quickPick.show();
  }

  private handleInputValueChange(input: string) {
    this.value = input.trim();
    this.updateSuggestion();
  }

  private async createNew() {
    const relativePath = this.getRelativePath();
    const fullPath = this.getAbsolutePath();

    if (this.isDirectory()) {
      // User types a folder name: foo/bar/
      logMessage('Creating a folder:', fullPath);

      // Create a folder with all subfolders
      const created = await this.ensureFolder(fullPath);
      if (created === false) {
        return;
      }

      // There seem to be no API to reveal a folder in Explorer,
      // so show a notification instead
      window.showInformationMessage(`Folder created: ${relativePath}`);
    } else {
      // User types a file name: foo/bar.ext

      // Check if file already exists
      if (fs.existsSync(fullPath)) {
        // Open the file and show an info message
        await window.showTextDocument(Uri.file(fullPath));
        window.showInformationMessage(`File already exists: ${relativePath}`);
        return;
      }

      logMessage('Creating a file:', fullPath);

      // Create an empty file
      const created = await this.ensureFile(fullPath);
      if (created === false) {
        return;
      }

      // Open the new file
      await window.showTextDocument(Uri.file(fullPath));
    }

    this.quickPick.hide();
  }

  private async ensureFile(fullPath: string) {
    try {
      // Create a folder if needed
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });

      // Create an empty file
      await fs.promises.writeFile(fullPath, '');

      return true;
    } catch (error) {
      if (error instanceof Error) {
        logMessage('Can’t create a file:', error.message);
        window.showErrorMessage('Can’t create a file');
      }
    }
    return false;
  }

  private async ensureFolder(directory: string) {
    try {
      await fs.promises.mkdir(directory, { recursive: true });
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logMessage('Can’t create a folder:', error.message);
        window.showErrorMessage('Can’t create a folder');
      }
    }
    return false;
  }

  private updateSuggestion() {
    if (this.value === '') {
      // User hasn't entered anything yet
      this.quickPick.items = [
        {
          alwaysShow: true,
          label: `${ICON_NONE} ${path.join(this.relativeBase, '…')}`,
          detail: `Type a path to a file or a folder (append \`${path.sep}\` to create a folder)`,
        },
      ];
      return;
    }

    const icon = this.isDirectory() ? ICON_DIRECTORY : ICON_FILE;
    this.quickPick.items = [
      {
        alwaysShow: true,
        label: `${icon} ${this.getRelativePath()}`,
        detail: this.getDetailText(),
      },
    ];
  }

  private getDetailText() {
    const isDirectory = this.isDirectory();

    if (fs.existsSync(this.getAbsolutePath())) {
      return isDirectory
        ? 'Folder already exists'
        : 'File already exists, press Enter to open';
    }

    return isDirectory
      ? 'Press Enter to create a new folder'
      : 'Press Enter to create a new file';
  }

  /** Entered path is a directory? */
  private isDirectory() {
    return this.value.endsWith(path.sep);
  }

  /** Entered path is an absolute path (meaning it starts with workspace root)? */
  private isRoot() {
    return this.value.startsWith(path.sep);
  }

  /** Base base that takes into account whether entered path is absolute or not */
  private getRelativeBase() {
    return this.isRoot() ? '' : this.relativeBase;
  }

  /** Absolute path of the selected file */
  private getAbsolutePath() {
    return path.join(this.workspaceRoot, this.getRelativeBase(), this.value);
  }

  /** Path of the entered file relative to the workspace root */
  private getRelativePath() {
    return path
      .join(this.getRelativeBase(), this.value)
      .replace(new RegExp(`^${escapeRegExp(path.sep)}`), '');
  }
}
