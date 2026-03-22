// src/utils/mdGenerator.ts

export interface FileData {
  path: string;
  content: string;
}

const extensionToLanguageMap: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  json: 'json',
  css: 'css',
  md: 'markdown',
  html: 'html',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  cpp: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  rs: 'rust',
  go: 'go',
  java: 'java',
  sql: 'sql',
  xml: 'xml',
  vue: 'vue',
  svelte: 'svelte',
  rb: 'ruby',
  php: 'php'
};

function getLanguageFromPath(filePath: string): string {
  const parts = filePath.split('.');
  if (parts.length < 2 || (parts.length === 2 && parts[0] === '')) {
    return ''; 
  }
  const ext = parts.pop()?.toLowerCase() || '';
  return extensionToLanguageMap[ext] || '';
}

function formatDate(date: Date): string {
  const day = date.getDate();
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Generates the final markdown string combining the project name, file tree, and optionally file contents.
 */
export function generateMarkdown(
  projectName: string,
  fileTreeString: string,
  files: FileData[],
  version: string = '',
  recentChanges: string = ''
): string {
  const dateStr = formatDate(new Date());
  const versionStr = version ? ` — ${version}` : '';
  
  let md = `# ${projectName}\n`;
  md += `Generated: ${dateStr}${versionStr}\n\n`;

  // Recent Changes
  if (recentChanges.trim()) {
    md += `## Recent Changes\n${recentChanges.trim()}\n\n`;
  }

  // File Tree
  md += `## File Tree\n\n`;
  md += `\`\`\`text\n${fileTreeString}\n\`\`\`\n\n`;

  // Files (only if any provided)
  if (files.length > 0) {
    md += `## Files\n\n`;

    for (const file of files) {
      const lang = getLanguageFromPath(file.path);
      md += `### ${file.path}\n`;
      md += `\`\`\`${lang}\n`;
      const safeContent = file.content.endsWith('\n') ? file.content : `${file.content}\n`;
      md += safeContent;
      md += `\`\`\`\n\n`;
    }
  }

  return md.trim();
}