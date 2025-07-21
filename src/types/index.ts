import * as vscode from 'vscode';

export interface GitCommit {
    hash: string;
    message: string;
    author: string;
    date: string;
    abbreviated_commit?: string;
    abbreviated_tree?: string;
    abbreviated_parent?: string;
    refs?: string;
    encoding?: string;
    subject?: string;
    sanitized_subject_line?: string;
    body?: string;
    commit_notes?: string;
    verification_flag?: string;
    signer?: string;
    signer_key?: string;
    author_name?: string;
    author_email?: string;
    author_date?: string;
    committer_name?: string;
    committer_email?: string;
    committer_date?: string;
}

export interface GitRepository {
    path: string;
    name: string;
    isValid: boolean;
}

export interface WebviewMessage {
    command: string;
    data?: any;
}

export interface RestoreVersionMessage extends WebviewMessage {
    command: 'restoreVersion';
    data: {
        commitHash: string;
        message?: string;
    };
}

export interface SaveChangesMessage extends WebviewMessage {
    command: 'saveChanges';
    data: {
        message: string;
        useAI?: boolean;
    };
}

export interface DiscardChangesMessage extends WebviewMessage {
    command: 'discardChanges';
}

export interface RefreshMessage extends WebviewMessage {
    command: 'refresh';
}

export type TimeLadWebviewMessage = 
    | RestoreVersionMessage 
    | SaveChangesMessage 
    | DiscardChangesMessage 
    | RefreshMessage;

export interface NotificationServiceInterface {
    showInformation(message: string): Thenable<string | undefined>;
    showWarning(message: string): Thenable<string | undefined>;
    showError(message: string): Thenable<string | undefined>;
    showConfirmation(message: string, yesText?: string, noText?: string): Thenable<boolean>;
    
    // Extended methods for internal use
    showInfo?(message: string, ...items: string[]): Promise<string | undefined>;
    showUncommittedChangesWarning?(files: any[]): Promise<boolean>;
    showRepositoryCreationOptions?(): Promise<string | null>;
    executeCommand?(command: string, ...args: any[]): Promise<any>;
    showProgress?<T>(title: string, task: any, options?: any): Promise<T>;
}

export interface FileOperationsServiceInterface {
    readFile(filePath: string): Thenable<string>;
    writeFile(filePath: string, content: string): Thenable<void>;
    fileExists(filePath: string): Thenable<boolean>;
    deleteFile(filePath: string): Thenable<void>;
    createDirectory(dirPath: string): Thenable<void>;
    
    // Extended methods for internal use
    readDirectoryWithTypes?(dirPath: string): Promise<any[]>;
    joinPath?(...segments: string[]): string;
    removeGitLockFile?(repoPath: string): Promise<boolean>;
    createTempCommitFile?(repoPath: string, message: string): Promise<string>;
    existsSync?(filePath: string): boolean;
    writeFileSync?(filePath: string, content: string): void;
}

export interface GitServiceInterface {
    findRepositories(): Promise<GitRepository[]>;
    getCommitHistory(repoPath?: string, limit?: number): Promise<GitCommit[]>;
    restoreToCommit(commitHash: string, message?: string): Promise<boolean>;
    saveChangesWithMessage(message: string): Promise<boolean>;
    discardUncommittedChanges(): Promise<boolean>;
    hasUncommittedChanges(): Promise<boolean>;
    getCurrentRepository(): GitRepository | null;
}

export interface FileChange {
    fileName: string;
    type: string;
}

export interface CacheStats {
    size: number;
    timeout: number;
}

export interface GitHubRepository {
    name: string;
    fullName: string;
    description: string;
    cloneUrl: string;
    isPrivate: boolean;
    updatedAt: string;
    language: string | null;
}

export interface GitHubUser {
    login: string;
    id: number;
    name: string | null;
    email: string | null;
    [key: string]: any;
}

export interface CommitMessageServiceInterface {
    generateCommitMessage(files: FileChange[], summary: string): Promise<string>;
    clearCache(): void;
    getCacheStats(): CacheStats;
}

export interface GitHubServiceInterface {
    getGitHubToken(): Promise<string>;
    getUser(): Promise<GitHubUser>;
    repositoryExists(owner: string, repo: string): Promise<boolean>;
    createRepository(name: string, description?: string, isPrivate?: boolean): Promise<any>;
    addRemoteAndPush(repoPath: string, remoteUrl: string): Promise<void>;
    getUserRepositories(limit?: number): Promise<GitHubRepository[]>;
    cloneRepository(cloneUrl: string, targetPath: string): Promise<void>;
    saveToGitHub(content: string, filename: string): Promise<boolean>;
    loadFromGitHub(filename: string): Promise<string>;
    isAuthenticated(): boolean;
}