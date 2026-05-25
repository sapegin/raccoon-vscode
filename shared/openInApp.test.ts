import { promisify } from 'node:util';
import { beforeEach, describe, expect, test, vi } from 'vitest';

type OpenImplementation = (
  file: string,
  args: readonly string[]
) => Promise<{ stdout: string; stderr: string }>;

const openImplementation = vi.hoisted(() => vi.fn<OpenImplementation>());

vi.mock(import('node:child_process'), async (importOriginal) => {
  const actual = await importOriginal();
  // Stub `execFile` and attach a `[promisify.custom]` implementation so
  // `promisify(execFile)` resolves to `openImpl` — no callbacks involved.
  const execFile = (() => {
    throw new Error('callback form of execFile not used in tests');
  }) as unknown as typeof actual.execFile;
  (execFile as unknown as Record<symbol, OpenImplementation>)[
    promisify.custom
  ] = openImplementation;
  return { ...actual, execFile };
});

const { openInApp } = await import('./openInApp');

describe(openInApp, () => {
  beforeEach(() => {
    openImplementation.mockReset();
    openImplementation.mockResolvedValue({ stdout: '', stderr: '' });
  });

  test('invokes /usr/bin/open with -a, app name, and target', async () => {
    await openInApp('Ghostty', '/Users/me/projects/foo');
    expect(openImplementation).toHaveBeenCalledWith('/usr/bin/open', [
      '-a',
      'Ghostty',
      '/Users/me/projects/foo',
    ]);
  });

  test('passes paths with spaces and quotes verbatim (no shell)', async () => {
    await openInApp('Nimble Commander', "/tmp/it's a test/file.txt");
    expect(openImplementation).toHaveBeenCalledWith('/usr/bin/open', [
      '-a',
      'Nimble Commander',
      "/tmp/it's a test/file.txt",
    ]);
  });

  test('rejects when the underlying command fails', async () => {
    openImplementation.mockRejectedValueOnce(new Error('boom'));
    await expect(openInApp('Ghostty', '/x')).rejects.toThrow('boom');
  });
});
