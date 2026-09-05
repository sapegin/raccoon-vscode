import path from 'node:path';

export type NavigationDirection = 'next' | 'previous';

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

/** Returns whether VS Code's file-local diff navigation wrapped around. */
export function didNavigationWrap(
  direction: NavigationDirection,
  beforeLine: number,
  afterLine: number
): boolean {
  return direction === 'next'
    ? afterLine <= beforeLine
    : afterLine >= beforeLine;
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

  const currentIndex = paths.indexOf(currentPath);
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
