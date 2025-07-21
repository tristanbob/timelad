import { GitCommit, GitRepository, GitServiceInterface, NotificationServiceInterface, FileOperationsServiceInterface, CommitMessageServiceInterface } from '../types';
interface CommitData {
    hash: string;
    author: string;
    date: string;
    subject: string;
    version: number;
}
interface FileChange {
    status: string;
    fileName: string;
    type: string;
}
interface UncommittedChanges {
    hasChanges: boolean;
    files: FileChange[];
    summary: string;
}
interface RestoreResult {
    success: boolean;
    message?: string;
    newCommit?: string;
    previousCommit?: string;
    branch?: string;
}
interface PaginatedCommits {
    commits: CommitData[];
    hasMore: boolean;
    totalCount: number;
    offset: number;
    nextOffset: number;
}
interface BranchInfo {
    branch: string | null;
    version: number | null;
}
interface GitCommandResult {
    stdout: string;
    stderr: string;
}
/**
 * Refactored GitService with separated concerns
 * Focuses purely on Git operations, delegating other responsibilities
 */
declare class GitService implements GitServiceInterface {
    private notificationService;
    private fileService;
    private commitMessageService;
    private cache;
    private repositoryScanCache;
    private lastHealthCheck;
    constructor(notificationService?: NotificationServiceInterface | null, fileService?: FileOperationsServiceInterface | null, commitMessageService?: CommitMessageServiceInterface | null);
    /**
     * Get Git extension safely
     * @returns Git extension API or null
     */
    getGitExtension(): any | null;
    /**
     * Check if git is installed on the system
     * @returns True if git is installed
     */
    isGitInstalled(): Promise<boolean>;
    /**
     * Wait for Git extension to be ready
     * @param maxAttempts Maximum number of attempts
     * @returns True if Git is ready, false if max attempts reached
     */
    waitForGitReady(maxAttempts?: number): Promise<boolean>;
    /**
     * Check if a directory is a Git repository
     * @param dirPath Directory path to check
     * @returns True if directory is a Git repository
     */
    isGitRepository(dirPath: string): Promise<boolean>;
    /**
     * Scan workspace folders for git repositories
     * @param maxDepth Maximum depth to scan (default: 3)
     * @returns Array of repository paths found
     */
    scanForRepositories(maxDepth?: number): Promise<string[]>;
    /**
     * Recursively scan a folder for git repositories
     * @param folderPath Path to scan
     * @param maxDepth Maximum depth to scan
     * @param currentDepth Current depth in recursion
     * @returns Array of repository paths found
     */
    scanFolderForGit(folderPath: string, maxDepth: number, currentDepth?: number): Promise<string[]>;
    /**
     * Get the primary repository path from workspace
     * @returns Repository path
     * @throws Error if no repository found
     */
    getRepositoryPathRobust(): Promise<string>;
    /**
     * Enhanced repository detection
     * @returns True if repository exists
     */
    hasRepositoryRobust(): Promise<boolean>;
    /**
     * Get repository path safely
     * @returns Repository path
     */
    getRepositoryPath(): Promise<string>;
    /**
     * Execute a Git command with retry logic
     * @param command Git command to execute
     * @param repoPath Repository path
     * @param maxRetries Maximum number of retry attempts
     * @param retryDelay Delay between retries in ms
     * @param envVars Additional environment variables
     * @returns Command result
     */
    executeGitCommand(command: string, repoPath: string, maxRetries?: number, retryDelay?: number, envVars?: Record<string, string>): Promise<GitCommandResult>;
    /**
     * Get total number of commits in repository
     * @param repoPath Repository path
     * @returns Total commit count
     */
    getCommitCount(repoPath: string): Promise<number>;
    /**
     * Internal method to fetch commits with flexible options
     * @param options Options for commit retrieval
     * @returns Array of commit objects
     */
    _getCommitsInternal(options?: {
        limit?: number;
        repoPath?: string | null;
        useCache?: boolean;
        logFormat?: string;
    }): Promise<CommitData[]>;
    /**
     * Get commits with version numbers
     * @param limit Maximum number of commits to fetch
     * @param repoPath Repository path
     * @returns Array of commit objects
     */
    getCommits(limit?: number, repoPath?: string | null): Promise<CommitData[]>;
    /**
     * Get simple commits for QuickPick
     * @param repoPath Repository path
     * @returns Array of commit objects
     */
    getSimpleCommits(repoPath?: string | null): Promise<CommitData[]>;
    /**
     * Get commits with pagination support for progressive loading
     * @param options Pagination options
     * @returns Paginated commits result
     */
    getCommitsPaginated(options?: {
        offset?: number;
        limit?: number;
        repoPath?: string | null;
        useCache?: boolean;
    }): Promise<PaginatedCommits>;
    /**
     * Get current branch information
     * @returns Current branch and version
     */
    getCurrentBranchInfo(): Promise<BranchInfo>;
    /**
     * Get detailed commit information
     * @param commitHash Commit hash
     * @param repoPath Repository path
     * @returns Detailed commit information
     */
    getCommitDetails(commitHash: string, repoPath?: string | null): Promise<string>;
    /**
     * Check if working directory is clean
     * @param repoPath Repository path
     * @returns True if working directory is clean
     */
    isWorkingDirectoryClean(repoPath: string): Promise<boolean>;
    /**
     * Stash current changes
     * @param repoPath Repository path
     */
    stashChanges(repoPath: string): Promise<void>;
    /**
     * Get current branch name
     * @param repoPath Path to repository
     * @returns Current branch name
     */
    getCurrentBranchName(repoPath: string): Promise<string>;
    /**
     * Create a backup branch before destructive operations
     * @param repoPath Path to repository
     * @returns Name of the backup branch
     */
    createBackupBranch(repoPath: string): Promise<string>;
    /**
     * Clean up old backup branches
     * @param repoPath Path to repository
     * @param daysToKeep Number of days to keep backups
     */
    cleanupOldBackups(repoPath: string, daysToKeep?: number): Promise<void>;
    /**
     * Create a new commit that restores the working directory to a specific commit (SIMPLIFIED VERSION)
     * @param commitHash Commit hash to restore
     * @param repoPath Repository path
     * @returns The new commit hash
     */
    createRestoreCommitSimple(commitHash: string, repoPath: string): Promise<string>;
    /**
     * Create a new commit that restores the working directory to a specific commit (COMPLEX/ORIGINAL VERSION - FALLBACK)
     * @param commitHash Commit hash to restore
     * @param repoPath Repository path
     * @returns The new commit hash
     */
    /**
     * Get uncommitted changes status
     * @param repoPath Repository path
     * @returns Changes information
     */
    getUncommittedChanges(repoPath?: string | null): Promise<UncommittedChanges>;
    /**
     * Parse git status codes
     * @param status Git status code
     * @returns Human readable status
     */
    parseFileStatus(status: string): string;
    /**
     * Restore a specific version by creating a new commit (SIMPLIFIED VERSION)
     * @param commit Commit object to restore
     * @param repoPath Repository path
     * @param skipConfirmation Skip uncommitted changes confirmation
     * @returns Result of the operation
     */
    restoreVersionSimple(commit: CommitData, repoPath?: string | null, skipConfirmation?: boolean): Promise<RestoreResult>;
    /**
     * Restore a specific version by creating a new commit (ORIGINAL VERSION)
     * @param commit Commit object to restore
     * @param repoPath Repository path
     * @param skipConfirmation Skip uncommitted changes confirmation
     * @returns Result of the operation
     */
    restoreVersion(commit: CommitData, repoPath?: string | null, skipConfirmation?: boolean): Promise<RestoreResult>;
    /**
     * Save uncommitted changes with auto-generated commit message
     * @param repoPath Repository path
     * @returns Commit message used
     */
    saveChanges(repoPath?: string | null): Promise<string>;
    /**
     * Discard all uncommitted changes in the repository
     * @param repoPath Repository path
     * @returns True if changes were discarded successfully
     */
    discardChanges(repoPath?: string | null): Promise<boolean>;
    /**
     * Create a new Git repository in the current workspace
     * @returns Workspace path or null if user cancels
     */
    createNewRepository(): Promise<string | null>;
    /**
     * Clear the cache
     */
    clearCache(): void;
    /**
     * Find repositories in workspace
     * @returns Array of found repositories
     */
    findRepositories(): Promise<GitRepository[]>;
    /**
     * Get commit history for interface compliance
     * @param repoPath Repository path
     * @param limit Number of commits to fetch
     * @returns Array of GitCommit objects
     */
    getCommitHistory(repoPath?: string, limit?: number): Promise<GitCommit[]>;
    /**
     * Restore to a specific commit
     * @param commitHash Hash of commit to restore to
     * @param message Optional commit message
     * @returns True if successful
     */
    restoreToCommit(commitHash: string, message?: string): Promise<boolean>;
    /**
     * Save changes with message for interface compliance
     * @param message Commit message
     * @returns True if successful
     */
    saveChangesWithMessage(message: string): Promise<boolean>;
    /**
     * Discard uncommitted changes for interface compliance
     * @returns True if successful
     */
    discardUncommittedChanges(): Promise<boolean>;
    /**
     * Check if there are uncommitted changes
     * @returns True if there are uncommitted changes
     */
    hasUncommittedChanges(): Promise<boolean>;
    /**
     * Get current repository
     * @returns Current repository or null
     */
    getCurrentRepository(): GitRepository | null;
}
export { GitService };
//# sourceMappingURL=GitService.d.ts.map