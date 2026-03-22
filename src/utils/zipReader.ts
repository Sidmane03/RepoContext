import JSZip from 'jszip';
import type { RepoFile } from '../type';

export async function readZipFiles(file: File): Promise<RepoFile[]> {
  const zip = await JSZip.loadAsync(file);
  const files: RepoFile[] = [];

  const promises: Promise<void>[] = [];
  
  zip.forEach((relativePath, entry) => {
    if (!entry.dir) {
      promises.push(
        entry.async("string").then(content => {
          files.push({
            path: relativePath,
            content
          });
        })
      );
    }
  });

  await Promise.all(promises);
  return files;
}
