import type { RepoFile } from '../type';

interface GitHubTreeNode {
  type: string;
  path: string;
}

export async function fetchGithubTree(repoUrl: string): Promise<string[]> {
  const urlObj = new URL(repoUrl);
  if (urlObj.hostname !== 'github.com') throw "Invalid GitHub URL";
  const parts = urlObj.pathname.split('/').filter(Boolean);
  if (parts.length < 2) throw "Invalid GitHub URL format";
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, '');

  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;
  const res = await fetch(treeUrl);
  
  if (res.status === 404) throw "Repo not found or is private";
  if (res.status === 403 || res.status === 429) throw "GitHub rate limit hit \u2014 wait a minute and try again";
  if (!res.ok) throw `GitHub tree fetch failed: ${res.statusText}`;

  const data = await res.json() as { tree: GitHubTreeNode[] };
  const tree: string[] = data.tree
    .filter((node: GitHubTreeNode) => node.type === 'blob')
    .map((node: GitHubTreeNode) => node.path);
  
  return tree;
}

export async function fetchGithubFiles(
  repoUrl: string,
  filteredPaths: string[],
  onProgress: (msg: string) => void
): Promise<RepoFile[]> {
  const urlObj = new URL(repoUrl);
  if (urlObj.hostname !== 'github.com') throw "Invalid GitHub URL";
  const parts = urlObj.pathname.split('/').filter(Boolean);
  if (parts.length < 2) throw "Invalid GitHub URL format";
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, '');

  const files: RepoFile[] = [];
  const total = filteredPaths.length;
  let current = 0;

  for (const path of filteredPaths) {
    current++;
    onProgress(`Fetching file ${current} of ${total}`);
    
    // Fetch file content sequentially
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(fileUrl);
    
    if (res.status === 404) throw "Repo not found or is private";
    if (res.status === 403 || res.status === 429) throw "GitHub rate limit hit \u2014 wait a minute and try again";
    if (!res.ok) throw `GitHub fetch failed for ${path}`;

    const data = await res.json();
    
    if (data.encoding === 'base64') {
      // Decode base64 content
      const cleanBase64 = data.content.replace(/\n/g, '');
      const binaryString = atob(cleanBase64);
      // Properly decode UTF-8 from base64 string
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const text = new TextDecoder('utf-8').decode(bytes);
      
      files.push({
        path,
        content: text
      });
    }
  }

  return files;
}