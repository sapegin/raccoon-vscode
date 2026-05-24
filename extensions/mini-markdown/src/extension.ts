import { commands, type ExtensionContext } from 'vscode';
import { logMessage } from './debug';
import {
  insertTable,
  onEnterKey,
  onShiftTabKey,
  onTabKey,
  toggleEmphasis,
} from './document';

export function activate(context: ExtensionContext) {
  logMessage('✍🏼 Mini Markdown starting...');

  context.subscriptions.push(
    commands.registerTextEditorCommand(
      'miniMarkdown.toggleEmphasis',
      async (textEditor) => {
        await toggleEmphasis(textEditor, '_');
      }
    ),
    commands.registerTextEditorCommand(
      'miniMarkdown.toggleStrongEmphasis',
      async (textEditor) => {
        await toggleEmphasis(textEditor, '**');
      }
    ),
    commands.registerTextEditorCommand('miniMarkdown.insertTable', insertTable),
    commands.registerTextEditorCommand('miniMarkdown.onEnterKey', onEnterKey),
    commands.registerTextEditorCommand('miniMarkdown.onTabKey', onTabKey),
    commands.registerTextEditorCommand(
      'miniMarkdown.onShiftTabKey',
      onShiftTabKey
    )
  );
}
