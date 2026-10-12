import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { type GitApi } from './navigator';

interface MockUri {
  fsPath: string;
  toString: () => string;
}
interface MockEditor {
  document: {
    uri: MockUri;
    lineCount: number;
    lineAt: (lineNumber: number) => {
      range: { start: { line: number; character: number }; end: unknown };
    };
  };
  selection: { active: { line: number; character: number } };
}

const hoisted = vi.hoisted(() => {
  class DiffTabInput {
    public constructor(
      public readonly original: MockUri,
      public readonly modified: MockUri
    ) {}
  }

  const uriTools = {
    file(filePath: string): MockUri {
      return { fsPath: filePath, toString: () => filePath };
    },
  };

  class SelectionMock {
    public constructor(
      public readonly anchor: unknown,
      public readonly active: unknown
    ) {}
  }

  return {
    executeCommand:
      vi.fn<(command: string, ...args: unknown[]) => Promise<void>>(),
    MockTabInputTextDiff: DiffTabInput,
    createUri: uriTools,
    MockSelectionClass: SelectionMock,
    vscodeState: {
      activeTextEditor: undefined as MockEditor | undefined,
      visibleTextEditors: [] as MockEditor[],
      activeTabInput: undefined as
        | InstanceType<typeof DiffTabInput>
        | undefined,
    },
  };
});

const {
  executeCommand,
  MockTabInputTextDiff,
  createUri,
  MockSelectionClass,
  vscodeState,
} = hoisted;

// @ts-expect-error partial vscode mock for orchestration tests
vi.mock(import('vscode'), () => ({
  TabInputTextDiff: MockTabInputTextDiff,
  Selection: MockSelectionClass,
  Uri: createUri,
  commands: { executeCommand },
  window: {
    get activeTextEditor() {
      return vscodeState.activeTextEditor;
    },
    get visibleTextEditors() {
      return vscodeState.visibleTextEditors;
    },
    tabGroups: {
      activeTabGroup: {
        get activeTab() {
          return vscodeState.activeTabInput
            ? { input: vscodeState.activeTabInput }
            : undefined;
        },
      },
    },
    showErrorMessage: vi.fn<(message: string) => void>(),
  },
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue: unknown) => defaultValue,
    }),
  },
}));

const { Navigator } = await import('./navigator');

function createEditor(uri: string, line: number, lineCount = 100): MockEditor {
  return {
    document: {
      uri: createUri.file(uri),
      lineCount,
      lineAt: (lineNumber: number) => ({
        range: {
          start: { line: lineNumber, character: 0 },
          end: { line: lineNumber, character: 0 },
        },
      }),
    },
    selection: { active: { line, character: 0 } },
  };
}

function createGitApi(
  changes: readonly string[],
  options: {
    indexChanges?: readonly string[];
    untrackedChanges?: readonly string[];
  } = {}
): GitApi {
  const toChange = (filePath: string) => ({
    uri: createUri.file(
      filePath
    ) as GitApi['repositories'][number]['state']['workingTreeChanges'][number]['uri'],
  });

  return {
    repositories: [
      {
        rootUri: createUri.file(
          '/project'
        ) as GitApi['repositories'][number]['rootUri'],
        state: {
          indexChanges: (options.indexChanges ?? []).map(toChange),
          workingTreeChanges: changes.map(toChange),
          untrackedChanges: (options.untrackedChanges ?? []).map(toChange),
        },
      },
    ],
  };
}

function setDiffTab(modifiedPath: string, line: number) {
  const modifiedUri = createUri.file(modifiedPath);
  vscodeState.activeTabInput = new MockTabInputTextDiff(
    createUri.file(`${modifiedPath}.original`),
    modifiedUri
  );
  const editor = createEditor(modifiedPath, line);
  vscodeState.visibleTextEditors = [editor];
  return editor;
}

function commandCalls(command: string) {
  return executeCommand.mock.calls.filter(([name]) => name === command);
}

function expectGitOpenChange(filePath: string) {
  expect(commandCalls('git.openChange')).toStrictEqual([
    ['git.openChange', expect.objectContaining({ fsPath: filePath })],
  ]);
}

function createNavigator(
  changes: readonly string[],
  options: {
    indexChanges?: readonly string[];
    untrackedChanges?: readonly string[];
  } = {}
) {
  return new Navigator(() => Promise.resolve(createGitApi(changes, options)));
}

describe(Navigator, () => {
  beforeEach(() => {
    executeCommand.mockReset();
    vscodeState.activeTextEditor = undefined;
    vscodeState.visibleTextEditors = [];
    vscodeState.activeTabInput = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('delegates to diff navigation for the next hunk in the same file', async () => {
    const editor = setDiffTab('/project/a.ts', 10);
    executeCommand.mockImplementation((command) => {
      if (command === 'workbench.action.compareEditor.nextChange') {
        editor.selection.active.line = 30;
      }
      return Promise.resolve();
    });

    await createNavigator(['/project/a.ts', '/project/b.ts']).enqueue('next');

    expect(
      commandCalls('workbench.action.compareEditor.nextChange')
    ).toHaveLength(1);
    expect(commandCalls('git.openChange')).toHaveLength(0);
  });

  test('opens the adjacent file when diff navigation wraps forward', async () => {
    const editor = setDiffTab('/project/a.ts', 50);
    executeCommand.mockImplementation((command, uri) => {
      if (command === 'workbench.action.compareEditor.nextChange') {
        editor.selection.active.line = 5;
        return Promise.resolve();
      }

      if (command === 'git.openChange') {
        setDiffTab((uri as MockUri).fsPath, 5);
      }
      return Promise.resolve();
    });

    await createNavigator(['/project/a.ts', '/project/b.ts']).enqueue('next');

    expectGitOpenChange('/project/b.ts');
    expect(
      commandCalls('workbench.action.compareEditor.nextChange')
    ).toHaveLength(2);
  });

  test('opens the focused file when it has changes', async () => {
    vscodeState.activeTextEditor = createEditor('/project/new.ts', 0);
    executeCommand.mockImplementation((command, uri) => {
      if (command === 'git.openChange') {
        queueMicrotask(() => {
          setDiffTab((uri as MockUri).fsPath, 0);
        });
      }
      return Promise.resolve();
    });

    await createNavigator(['/project/a.ts', '/project/new.ts']).enqueue('next');

    expect(commandCalls('git.openChange')).toStrictEqual([
      [
        'git.openChange',
        expect.objectContaining({ fsPath: '/project/new.ts' }),
      ],
    ]);
  });

  test('opens the first changed file from a regular editor', async () => {
    vscodeState.activeTextEditor = createEditor('/project/context.ts', 0);
    executeCommand.mockImplementation((command, uri) => {
      if (command === 'git.openChange') {
        queueMicrotask(() => {
          setDiffTab((uri as MockUri).fsPath, 0);
        });
      }
      return Promise.resolve();
    });

    await createNavigator(['/project/a.ts', '/project/b.ts']).enqueue('next');

    expectGitOpenChange('/project/a.ts');
    expect(
      commandCalls('workbench.action.compareEditor.nextChange')
    ).toHaveLength(1);
  });

  test('opens the last changed file from a regular editor', async () => {
    vscodeState.activeTextEditor = createEditor('/project/context.ts', 0);
    let lineBeforePreviousChange: number | undefined;
    executeCommand.mockImplementation((command, uri) => {
      if (command === 'git.openChange') {
        setDiffTab((uri as MockUri).fsPath, 40);
      }
      if (command === 'workbench.action.compareEditor.previousChange') {
        lineBeforePreviousChange =
          vscodeState.visibleTextEditors[0]?.selection.active.line;
      }
      return Promise.resolve();
    });

    await createNavigator(['/project/a.ts', '/project/b.ts']).enqueue(
      'previous'
    );

    expectGitOpenChange('/project/b.ts');
    expect(
      commandCalls('workbench.action.compareEditor.previousChange')
    ).toHaveLength(1);
    expect(lineBeforePreviousChange).toBe(99);
  });

  test('does not reopen the only changed file when navigation wraps', async () => {
    const editor = setDiffTab('/project/a.ts', 50);
    executeCommand.mockImplementation((command) => {
      if (command === 'workbench.action.compareEditor.nextChange') {
        editor.selection.active.line = 5;
      }
      return Promise.resolve();
    });

    await createNavigator(['/project/a.ts']).enqueue('next');

    expect(
      commandCalls('workbench.action.compareEditor.nextChange')
    ).toHaveLength(1);
    expect(commandCalls('git.openChange')).toHaveLength(0);
  });

  test('delegates to diff navigation when the modified editor is not visible', async () => {
    vscodeState.activeTabInput = new MockTabInputTextDiff(
      createUri.file('/project/a.ts.original'),
      createUri.file('/project/a.ts')
    );
    vscodeState.visibleTextEditors = [];

    await createNavigator(['/project/a.ts']).enqueue('next');

    expect(
      commandCalls('workbench.action.compareEditor.nextChange')
    ).toStrictEqual([['workbench.action.compareEditor.nextChange']]);
    expect(commandCalls('git.openChange')).toHaveLength(0);
  });

  test('crosses to the previous file after forward entry', async () => {
    setDiffTab('/project/new.ts', 0);
    executeCommand.mockImplementation((command, uri) => {
      if (command === 'workbench.action.compareEditor.nextChange') {
        const activeEditor = vscodeState.visibleTextEditors[0];
        if (activeEditor !== undefined) {
          activeEditor.selection.active.line = 0;
        }
        return Promise.resolve();
      }

      if (command === 'workbench.action.compareEditor.previousChange') {
        const activeEditor = vscodeState.visibleTextEditors[0];
        if (activeEditor !== undefined) {
          activeEditor.selection.active.line = 90;
        }
        return Promise.resolve();
      }

      if (command === 'git.openChange') {
        setDiffTab((uri as MockUri).fsPath, 0);
      }
      return Promise.resolve();
    });

    const navigator = createNavigator(['/project/new.ts', '/project/other.ts']);
    await navigator.enqueue('next');
    expectGitOpenChange('/project/other.ts');
    executeCommand.mockClear();

    await navigator.enqueue('previous');
    expect(commandCalls('git.openChange')).toStrictEqual([
      [
        'git.openChange',
        expect.objectContaining({ fsPath: '/project/new.ts' }),
      ],
    ]);
  });

  test('navigates across staged new files listed only in indexChanges', async () => {
    setDiffTab('/project/new.ts', 0);
    executeCommand.mockImplementation((command, uri) => {
      if (command === 'workbench.action.compareEditor.nextChange') {
        const activeEditor = vscodeState.visibleTextEditors[0];
        if (activeEditor !== undefined) {
          activeEditor.selection.active.line = 0;
        }
        return Promise.resolve();
      }

      if (command === 'git.openChange') {
        setDiffTab((uri as MockUri).fsPath, 0);
      }
      return Promise.resolve();
    });

    await createNavigator([], {
      indexChanges: ['/project/new.ts', '/project/other.ts'],
    }).enqueue('next');

    expect(commandCalls('git.openChange')).toStrictEqual([
      [
        'git.openChange',
        expect.objectContaining({ fsPath: '/project/other.ts' }),
      ],
    ]);
  });

  test('wraps forward from the last new file when diff navigation does not move', async () => {
    setDiffTab('/project/other.ts', 0);
    executeCommand.mockImplementation((command, uri) => {
      if (command === 'workbench.action.compareEditor.nextChange') {
        const activeEditor = vscodeState.visibleTextEditors[0];
        if (activeEditor !== undefined) {
          activeEditor.selection.active.line = 0;
        }
        return Promise.resolve();
      }

      if (command === 'git.openChange') {
        setDiffTab((uri as MockUri).fsPath, 0);
      }
      return Promise.resolve();
    });

    await createNavigator(['/project/new.ts'], {
      untrackedChanges: ['/project/other.ts'],
    }).enqueue('next');

    expect(commandCalls('git.openChange')).toStrictEqual([
      [
        'git.openChange',
        expect.objectContaining({ fsPath: '/project/new.ts' }),
      ],
    ]);
  });

  test('reads the Git API again when it becomes available later', async () => {
    vscodeState.activeTextEditor = createEditor('/project/context.ts', 0);
    const git = { api: undefined as GitApi | undefined };
    executeCommand.mockImplementation((command, uri) => {
      if (command === 'git.openChange') {
        setDiffTab((uri as MockUri).fsPath, 0);
      }
      return Promise.resolve();
    });

    const navigator = new Navigator(() => Promise.resolve(git.api));
    await navigator.enqueue('next');
    expect(commandCalls('git.openChange')).toHaveLength(0);

    git.api = createGitApi(['/project/a.ts']);
    await navigator.enqueue('next');
    expectGitOpenChange('/project/a.ts');
  });
});
