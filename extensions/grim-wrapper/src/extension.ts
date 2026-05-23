import { commands, type ExtensionContext, workspace } from 'vscode';
import { logMessage } from './debug';
import { wrapText } from './document';
import { type ExtensionProperties } from './types';

function getExtensionProperties(): ExtensionProperties {
  const { maxLength } = workspace.getConfiguration('grimWrapper');
  return {
    maxLength: Number(maxLength) || 80,
  };
}

export function activate(context: ExtensionContext) {
  logMessage('🪦 Grim Wrapper starting...');

  context.subscriptions.push(
    commands.registerTextEditorCommand('grimWrapper.wrapText', (editor) => {
      const config = getExtensionProperties();
      logMessage('Config: ', config);
      wrapText(editor, config);
    })
  );
}
