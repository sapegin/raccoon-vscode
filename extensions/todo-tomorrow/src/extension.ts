import { window, workspace, type ExtensionContext } from 'vscode';
import { logMessage } from './debug';
import { Decorator } from './decorator';
import { type ExtensionProperties } from './types';

function getExtensionProperties(): ExtensionProperties {
  const { patterns } = workspace.getConfiguration('todoTomorrow');
  return {
    patterns,
  };
}

export function activate(context: ExtensionContext) {
  logMessage('✅ Todo Tomorrow starting...');

  let activeEditor = window.activeTextEditor;

  const decorator = new Decorator(getExtensionProperties());
  decorator.decorate();

  context.subscriptions.push(
    // Update on text change
    workspace.onDidChangeTextDocument(({ document, contentChanges }) => {
      if (
        // Ignore changes that didn't affect text content
        contentChanges.length === 0 ||
        // Ignore changes in other documents
        document !== activeEditor?.document ||
        // Ignore output panel
        document.languageId === 'Log'
      ) {
        return;
      }

      decorator.decorateLines(contentChanges);
    }),

    // Update on editor change
    window.onDidChangeActiveTextEditor((editor) => {
      // Ignore output panel
      if (editor?.document.languageId === 'Log') {
        return;
      }

      activeEditor = editor;
      decorator.decorate();
    })
  );
}
