export type SourceType = "github" | "local";

export type View = "home" | "configure" | "preview";

export interface Profile{
    projectName: string;
    sourceType: SourceType;
    repoUrl: string;
    includePatterns: string[];
    excludePatterns: string[];
    outputFilename: string;
    version: string;
}

export interface RepoFile{
    path: string;
    content: string;
}

export interface AppState{
    view: View;
    profile: Profile;
    generatedMd: string;
    fileCount: number;
    isLoading: boolean;
    loadingMessage: string;
    error: string | null;
}