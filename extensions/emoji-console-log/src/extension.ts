import { commands, workspace, type WorkspaceConfiguration } from 'vscode';
import { addLogMessageCommand } from './commands/addLogMessage';
import { commentAllLogMessagesCommand } from './commands/commentAllLogMessages';
import { removeAllLogMessagesCommand } from './commands/removeAllLogMessages';
import { uncommentAllLogMessagesCommand } from './commands/uncommentAllLogMessages';
import { ExtensionProperties } from './types/ExtensionProperties';

function getExtensionProperties(
  workspaceConfig: WorkspaceConfiguration
): ExtensionProperties {
  return {
    logFunction: workspaceConfig.logFunction ?? 'console.log',
  };
}

export function activate(): void {
  const config = workspace.getConfiguration('emojiConsoleLog');
  const properties = getExtensionProperties(config);
  commands.registerCommand('emojiConsoleLog.addLogMessage', async () => {
    await addLogMessageCommand(properties);
  });
  commands.registerCommand(
    'emojiConsoleLog.commentAllLogMessages',
    async () => {
      await commentAllLogMessagesCommand(properties);
    }
  );
  commands.registerCommand(
    'emojiConsoleLog.uncommentAllLogMessages',
    async () => {
      await uncommentAllLogMessagesCommand(properties);
    }
  );
  commands.registerCommand('emojiConsoleLog.removeAllLogMessages', async () => {
    await removeAllLogMessagesCommand(properties);
  });
}
