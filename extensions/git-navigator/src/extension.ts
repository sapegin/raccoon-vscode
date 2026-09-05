import { commands, extensions, type ExtensionContext } from 'vscode';
import { Navigator, type GitApi } from './navigator';

interface GitExtension {
  readonly enabled: boolean;
  getAPI(version: 1): GitApi;
}

async function getGitApi(): Promise<GitApi | undefined> {
  const extension = extensions.getExtension<GitExtension>('vscode.git');
  if (extension === undefined) {
    return undefined;
  }

  const gitExtension = await extension.activate();
  return gitExtension.enabled ? gitExtension.getAPI(1) : undefined;
}

export function activate(context: ExtensionContext): void {
  const navigator = new Navigator(getGitApi);

  context.subscriptions.push(
    commands.registerCommand('gitNavigator.nextChange', () =>
      navigator.enqueue('next')
    ),
    commands.registerCommand('gitNavigator.previousChange', () =>
      navigator.enqueue('previous')
    )
  );
}
