import * as vscode from 'vscode';
/**
 * Refactored GitHistoryWebviewProvider with separated services
 */
export declare class GitHistoryWebviewProvider implements vscode.WebviewViewProvider {
    private readonly context;
    private view;
    private commits;
    private uncommittedChanges;
    private isRestoring;
    private isDisposed;
    private paginationState;
    private readonly notificationService;
    private readonly fileService;
    private readonly gitService;
    private repositoryWatcher;
    constructor(context: vscode.ExtensionContext);
    /**
     * Setup listeners for workspace changes to detect repositories faster
     */
    private setupWorkspaceListeners;
    /**
     * Proactively scan for repositories
     * @returns Promise<boolean> True if repository found
     */
    private proactivelyScanForRepositories;
    resolveWebviewView(webviewView: vscode.WebviewView): Promise<void>;
    /**
     * Handle messages from the webview
     * @param message Message from webview
     */
    private handleWebviewMessage;
    /**
     * Show commit details for a specific commit
     * @param commitHash Commit hash
     */
    private showCommitDetails;
    /**
     * Check for unsaved changes in the workspace
     * @returns Promise<boolean> True if there are unsaved changes
     */
    private hasUnsavedChanges;
    /**
     * Request restore - checks for uncommitted changes and shows modal if needed
     * @param commitHash Commit hash
     */
    private requestRestore;
    /**
     * Restore a specific version
     * @param commitHash Commit hash
     * @param skipConfirmation Skip confirmation checks
     */
    private restoreVersion;
    /**
     * Create a panel to show commit details
     * @param commit Commit object
     * @param commitDetails Detailed commit information
     */
    private createCommitDetailsPanel;
    /**
     * Request discard - checks for uncommitted changes and shows modal
     */
    private requestDiscard;
    /**
     * Discard all uncommitted changes
     * @param skipConfirmation Skip confirmation checks
     */
    private discardChanges;
    /**
     * Save uncommitted changes
     */
    private saveChanges;
    /**
     * Create a new repository
     */
    private createRepository;
    /**
     * Load more commits for progressive loading
     */
    private loadMoreCommits;
    /**
     * Reset pagination state for refresh
     */
    private resetPaginationState;
    /**
     * Refresh the webview content
     */
    refresh(): Promise<void>;
    /**
     * Get loading template
     * @param message Loading message
     * @returns HTML template
     */
    private getLoadingTemplate;
    /**
     * Get success template
     * @param title Success title
     * @param subtitle Optional subtitle
     * @returns HTML template
     */
    private getSuccessTemplate;
    /**
     * Get error template
     * @param errorMessage Error message
     * @returns HTML template
     */
    private getErrorTemplate;
    /**
     * Get template for when git is not installed
     * @returns HTML template
     */
    private getGitNotInstalledTemplate;
    /**
     * Get template for when no repository exists
     * @returns HTML template
     */
    private getNoRepositoryTemplate;
    /**
     * Get template for the scanning state
     * @returns HTML template
     */
    private getScanningTemplate;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=GitHistoryWebviewProvider.d.ts.map