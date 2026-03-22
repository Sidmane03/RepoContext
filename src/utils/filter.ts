

import { minimatch } from "minimatch";

const DEFAULT_EXCLUDES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "*.lock",
  "*.log",
  "package-lock.json"
];

export function filterFiles(
  paths: string[],
  includePatterns: string[],
  excludePatterns: string[]
): string[] {
  const allExcludes = [...DEFAULT_EXCLUDES, ...excludePatterns];

  return paths.filter((filePath) => {
    const isExcluded = allExcludes.some((pattern) =>
      minimatch(filePath, pattern, { matchBase: true })
    );
    if (isExcluded) return false;

    if (includePatterns.length === 0) return true;

    const isIncluded = includePatterns.some((pattern) =>
      minimatch(filePath, pattern, { matchBase: true })
    );
    return isIncluded;
  });
}