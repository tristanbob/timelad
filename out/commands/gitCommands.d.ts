import * as vscode from 'vscode';
import { GitService } from '../services/GitService';
import { GitCommit } from '../types';
interface WebviewMessage {
    command: string;
    hash?: string;
    [key: string]: any;
}
/**
 * Refactored Git Commands handler with separated services
 */
export declare class GitCommands {
    private readonly notificationService;
    private readonly fileService;
    private readonly gitService;
    private readonly githubService;
    constructor();
    /**
     * Get the GitService instance
     */
    getGitService(): GitService;
    /**
     * Handle messages from the panel webview
     */
    handlePanelWebviewMessage(message: WebviewMessage, commits: GitCommit[], panel: vscode.WebviewPanel): Promise<void>;
    /**
     * Show commit details from panel
     */
    showCommitDetailsFromPanel(commitHash: string, commits: GitCommit[]): Promise<void>;
    /**
     * Restore version from panel
     */
    restoreVersionFromPanel(commitHash: string, commits: GitCommit[], panel: vscode.WebviewPanel): Promise<void>;
    /**
     * Restore version command (direct call)
     */
    restoreVersion(commit: GitCommit, repoPath: string): Promise<void>;
    /**
     * Save uncommitted changes with AI-generated commit message
     */
    saveChanges(): Promise<void>;
    /**
     * Set up version tracking for the current workspace
     */
    setupVersionTracking(): Promise<void>;
    /**
     * Save code to GitHub, creating repository if needed
     */
    saveToGitHub(): Promise<void>;
    /**
     * Prompt user for repository name
     */
    private promptForRepositoryName;
    /**
     * Prompt user for repository details
     */
    private promptForRepositoryDetails;
    /**
     * Load a repository from GitHub by cloning it
     */
    loadFromGitHub(): Promise<void>;
    /**
     * Prompt user to select a repository from their GitHub account
     */
    private promptForRepositorySelection;
    /**
     * Prompt user for clone location
     */
    private promptForCloneLocation;
}
export {};
//# sourceMappingURL=gitCommands.d.ts.map