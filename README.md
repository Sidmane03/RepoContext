
# RepoContext

Feeding a codebase to an AI tool like NotebookLM is tedious — copy the URL, 
paste it into some third-party site, retype your filters, download, rename. 
Every single time the code changes.

RepoContext fixes that. Configure a project once, save it as a profile, 
and regenerate your context file in one click.

## What it does

- Paste a public GitHub URL or upload a local zip
- Browse the repo structure and tick the files you want
- Downloads a `.md` file with the full file tree + code contents
- Export your config as a `.json` profile and reimport it next time

## Stack

React · TypeScript · Vite · minimatch · JSZip

## Run locally

git clone https://github.com/xyz/repocontext
cd repocontext
npm install
npm run dev


