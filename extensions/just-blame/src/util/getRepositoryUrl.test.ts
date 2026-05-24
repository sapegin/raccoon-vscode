import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getRepositoryUrl } from './getRepositoryUrl';

interface ExecFileResult {
  stdout: string;
  stderr: string;
}
type ExecFileCallback = (error: Error | null, result: ExecFileResult) => void;
type ExecFileMock = (
  file: string,
  args: readonly string[],
  options: unknown,
  callback: ExecFileCallback
) => void;

const execFileMock = vi.hoisted(() => vi.fn<ExecFileMock>());

vi.mock(import('node:child_process'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    execFile: execFileMock as unknown as typeof actual.execFile,
  };
});

/* eslint-disable promise/prefer-await-to-callbacks --
   The mocked `execFile` is a Node-style callback API. We bypass the
   real `util.promisify.custom` shape by resolving with `{stdout, stderr}`
   directly so `promisify` returns the same shape in tests. */

function setUrl(url: string) {
  execFileMock.mockImplementation((_file, _args, _options, cb) => {
    cb(null, { stdout: `${url}\n`, stderr: '' });
  });
}

function setError(message: string) {
  execFileMock.mockImplementation((_file, _args, _options, cb) => {
    cb(new Error(message), { stdout: '', stderr: message });
  });
}

/* eslint-enable promise/prefer-await-to-callbacks */

describe(getRepositoryUrl, () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  test('strips .git suffix from https GitHub URLs', async () => {
    setUrl('https://github.com/sapegin/taco-cat.git');
    await expect(getRepositoryUrl('/repo')).resolves.toBe(
      'https://github.com/sapegin/taco-cat'
    );
  });

  test('returns https GitHub URL unchanged when no .git suffix', async () => {
    setUrl('https://github.com/sapegin/taco-cat');
    await expect(getRepositoryUrl('/repo')).resolves.toBe(
      'https://github.com/sapegin/taco-cat'
    );
  });

  test('rewrites git@ SSH GitHub URLs to https', async () => {
    setUrl('git@github.com:sapegin/taco-cat.git');
    await expect(getRepositoryUrl('/repo')).resolves.toBe(
      'https://github.com/sapegin/taco-cat'
    );
  });

  test('returns non-GitHub URLs unchanged', async () => {
    setUrl('https://gitlab.com/sapegin/taco-cat.git');
    await expect(getRepositoryUrl('/repo')).resolves.toBe(
      'https://gitlab.com/sapegin/taco-cat.git'
    );
  });

  test('passes the remote name to git', async () => {
    setUrl('https://github.com/sapegin/upstream.git');
    await getRepositoryUrl('/repo', 'upstream');
    expect(execFileMock).toHaveBeenCalledWith(
      'git',
      ['remote', 'get-url', 'upstream'],
      { cwd: '/repo' },
      expect.any(Function)
    );
  });

  test('throws when the requested remote is missing', async () => {
    setError("fatal: No such remote 'upstream'");
    await expect(getRepositoryUrl('/repo', 'upstream')).rejects.toThrow(
      "Couldn't find upstream URL"
    );
  });

  test('throws when git is not in a repo', async () => {
    setError('fatal: not a git repository');
    await expect(getRepositoryUrl('/repo')).rejects.toThrow(
      "Couldn't find origin URL"
    );
  });
});
