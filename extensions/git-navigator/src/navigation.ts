import path from 'node:path';

export type NavigationDirection = 'next' | 'previous';

/** Normalizes paths for stable comparisons across Git and editor URIs. */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).toLowerCase();
}

const fileNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function compareFileNames(one: string, other: string): number {
  const result = fileNameCollator.compare(one, other);
  if (result === 0 && one !== other) {
    return one < other ? -1 : 1;
  }

  return result;
}

/** Compares paths in the same order as VS Code's Source Control path sorting. */
export function compareSourceControlPaths(one: string, other: string): number {
  const oneParts = one.split(path.sep);
  const otherParts = other.split(path.sep);
  const lastOne = oneParts.length - 1;
  const lastOther = otherParts.length - 1;

  for (let index = 0; ; index += 1) {
    const onePart = oneParts[index] ?? '';
    const otherPart = otherParts[index] ?? '';
    const oneEnded = index === lastOne;
    const otherEnded = index === lastOther;

    if (oneEnded && otherEnded) {
      return compareFileNames(onePart, otherPart);
    }

    if (oneEnded) {
      return -1;
    }

    if (otherEnded) {
      return 1;
    }

    const normalizedOne = onePart.toLowerCase();
    const normalizedOther = otherPart.toLowerCase();
    if (normalizedOne !== normalizedOther) {
      return normalizedOne < normalizedOther ? -1 : 1;
    }
  }
}

/** Returns whether a file matches an ignored name or repository-relative path. */
export function isIgnoredPath(
  filePath: string,
  repositoryPath: string,
  ignoredFiles: readonly string[]
): boolean {
  const relativePath = path
    .relative(repositoryPath, filePath)
    .split(path.sep)
    .join('/');
  return (
    ignoredFiles.includes(path.basename(filePath)) ||
    ignoredFiles.includes(relativePath)
  );
}

export interface AdjacentFileContext {
  direction: NavigationDirection;
  beforeLine: number;
  afterLine: number;
  lineCount: number;
  currentChangeIndex: number;
  changeCount: number;
}

/**
 * Returns whether file-local navigation hit a file boundary and should continue
 * in the next file.
 */
export function shouldOpenAdjacentFile(context: AdjacentFileContext): boolean {
  const {
    direction,
    beforeLine,
    afterLine,
    lineCount,
    currentChangeIndex,
    changeCount,
  } = context;
  const lastLine = lineCount - 1;

  if (direction === 'next') {
    return (
      afterLine < beforeLine ||
      (afterLine === beforeLine &&
        (beforeLine >= lastLine ||
          (beforeLine === 0 &&
            currentChangeIndex >= 0 &&
            currentChangeIndex < changeCount - 1)))
    );
  }

  return (
    afterLine > beforeLine ||
    (afterLine === beforeLine && beforeLine <= 0 && currentChangeIndex > 0)
  );
}

/** Finds the adjacent path, including when the current change was just removed. */
export function getAdjacentPath(
  paths: readonly string[],
  currentPath: string,
  direction: NavigationDirection
): string | undefined {
  if (paths.length === 0) {
    return undefined;
  }

  const normalizedCurrentPath = normalizePath(currentPath);
  const normalizedPaths = paths.map((candidate) => normalizePath(candidate));
  const currentIndex = normalizedPaths.indexOf(normalizedCurrentPath);
  if (currentIndex !== -1) {
    const offset = direction === 'next' ? 1 : -1;
    return paths[(currentIndex + offset + paths.length) % paths.length];
  }

  if (direction === 'next') {
    return (
      paths.find(
        (candidate) => compareSourceControlPaths(candidate, currentPath) > 0
      ) ?? paths[0]
    );
  }

  return (
    paths.findLast(
      (candidate) => compareSourceControlPaths(candidate, currentPath) < 0
    ) ?? paths.at(-1)
  );
}
