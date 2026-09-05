import { describe, expect, test } from 'vitest';
import {
  compareSourceControlPaths,
  didNavigationWrap,
  getAdjacentPath,
  isIgnoredPath,
} from './navigation';

describe(compareSourceControlPaths, () => {
  test('sorts by directory and then natural file name', () => {
    const paths = [
      '/project/z/file.ts',
      '/project/a/file10.ts',
      '/project/a/file2.ts',
      '/project/a.ts',
    ];

    expect(paths.toSorted(compareSourceControlPaths)).toStrictEqual([
      '/project/a.ts',
      '/project/a/file2.ts',
      '/project/a/file10.ts',
      '/project/z/file.ts',
    ]);
  });
});

describe(isIgnoredPath, () => {
  const ignoredFiles = ['package-lock.json', 'generated/large.json'];

  test('matches file names in any directory', () => {
    expect(
      isIgnoredPath(
        '/project/packages/app/package-lock.json',
        '/project',
        ignoredFiles
      )
    ).toBe(true);
  });

  test('matches repository-relative paths', () => {
    expect(
      isIgnoredPath('/project/generated/large.json', '/project', ignoredFiles)
    ).toBe(true);
    expect(
      isIgnoredPath('/project/other/large.json', '/project', ignoredFiles)
    ).toBe(false);
  });
});

describe(didNavigationWrap, () => {
  test('detects forward wrapping and a single remaining hunk', () => {
    expect(didNavigationWrap('next', 20, 5)).toBe(true);
    expect(didNavigationWrap('next', 20, 20)).toBe(true);
    expect(didNavigationWrap('next', 20, 30)).toBe(false);
  });

  test('detects backward wrapping and a single remaining hunk', () => {
    expect(didNavigationWrap('previous', 5, 20)).toBe(true);
    expect(didNavigationWrap('previous', 5, 5)).toBe(true);
    expect(didNavigationWrap('previous', 20, 5)).toBe(false);
  });
});

describe(getAdjacentPath, () => {
  const paths = ['/project/a.ts', '/project/b.ts', '/project/c.ts'];

  test('moves in either direction and wraps', () => {
    expect(getAdjacentPath(paths, '/project/a.ts', 'next')).toBe(
      '/project/b.ts'
    );
    expect(getAdjacentPath(paths, '/project/a.ts', 'previous')).toBe(
      '/project/c.ts'
    );
    expect(getAdjacentPath(paths, '/project/c.ts', 'next')).toBe(
      '/project/a.ts'
    );
  });

  test('continues from a change removed during review', () => {
    expect(getAdjacentPath(paths, '/project/bb.ts', 'next')).toBe(
      '/project/c.ts'
    );
    expect(getAdjacentPath(paths, '/project/bb.ts', 'previous')).toBe(
      '/project/b.ts'
    );
  });

  test('returns no path when there are no changes', () => {
    expect(getAdjacentPath([], '/project/a.ts', 'next')).toBeUndefined();
  });
});
