// src/utils/treeBuilder.ts

// A nested object representing our directory structure.
// If the value is `null`, it's a file. If it's an object, it's a directory.
type TreeNode = {
  [key: string]: TreeNode | null;
};

/**
 * Takes an array of file paths and returns a formatted ASCII file tree string.
 * Example input: ["src/App.tsx", "src/utils/filter.ts"]
 */
export function buildFileTree(paths: string[]): string {
  const tree: TreeNode = {};

  // Step 1: Build the nested tree structure from flat paths
  for (const path of paths) {
    const parts = path.split('/').filter(Boolean);
    let currentNode = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (!currentNode[part]) {
        // If it's the last part of the path, it's a file (null), otherwise a new directory node ({})
        currentNode[part] = isFile ? null : {};
      }
      
      // Move deeper into the tree if it's a directory
      if (!isFile) {
        currentNode = currentNode[part] as TreeNode;
      }
    }
  }

  // Step 2: Recursively generate the formatted text tree
  function drawTree(node: TreeNode, prefix: string = ''): string {
    // Sort keys: Directories first, then files, both alphabetically
    const keys = Object.keys(node).sort((a, b) => {
      const aIsDir = node[a] !== null;
      const bIsDir = node[b] !== null;
      
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    let result = '';

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const isLast = i === keys.length - 1;
      const isDir = node[key] !== null;

      // Choose the right branching character
      const connector = isLast ? '└── ' : '├── ';
      
      // Append a trailing slash for directories to make them distinct
      const displayName = isDir ? `${key}/` : key;
      
      result += `${prefix}${connector}${displayName}\n`;

      // If it's a directory, recurse into it with updated indentation prefix
      if (isDir) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        result += drawTree(node[key] as TreeNode, newPrefix);
      }
    }

    return result;
  }

  return drawTree(tree).trim();
}