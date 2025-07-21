import * as vscode from 'vscode';
import { GitService } from '../services/GitService';
import { NotificationService } from '../services/NotificationService';
import { FileOperationsService } from '../services/FileOperationsService';
import {
  getLoadingTemplate,
  getSidebarTemplate,
} from '../views/templates/webviewTemplates';
import * as constants from '../constants';

// Extended message types for all webview communications
interface WebviewMessage {
  command: string;
  hash?: string;
  url?: string;
  data?: any;
}

interface ShowCommitMessage extends WebviewMessage {
  command: 'showCommit';
  hash: string;
}

interface RequestRestoreMessage extends WebviewMessage {
  command: 'requestRestore';
  hash: string;
}

interface ConfirmRestoreMessage extends WebviewMessage {
  command: 'confirmRestore';
  hash: string;
}

interface SaveChangesMessage extends WebviewMessage {
  command: 'saveChanges';
}

interface RequestDiscardMessage extends WebviewMessage {
  command: 'requestDiscard';
}

interface ConfirmDiscardMessage extends WebviewMessage {
  command: 'confirmDiscard';
}

interface LoadMoreCommitsMessage extends WebviewMessage {
  command: 'loadMoreCommits';
}

interface CreateRepositoryMessage extends WebviewMessage {
  command: 'createRepository';
}

interface LoadFromGitHubMessage extends WebviewMessage {
  command: 'loadFromGitHub';
}

interface OpenUrlMessage extends WebviewMessage {
  command: 'openUrl';
  url: string;
}

interface RefreshMessage extends WebviewMessage {
  command: 'refresh';
}

type TimeLadWebviewMessage = 
  | ShowCommitMessage
  | RequestRestoreMessage
  | ConfirmRestoreMessage
  | SaveChangesMessage
  | RequestDiscardMessage
  | ConfirmDiscardMessage
  | LoadMoreCommitsMessage
  | CreateRepositoryMessage
  | LoadFromGitHubMessage
  | OpenUrlMessage
  | RefreshMessage;

// Import the GitCommit type from types
import { GitCommit } from '../types';

interface CommitData {
  hash: string;
  author: string;
  date: string;
  subject: string;
  version: number;
}

// Helper functions to convert between types
function commitDataToGitCommit(commit: CommitData): GitCommit {
  return {
    hash: commit.hash,
    message: commit.subject,
    author: commit.author,
    date: commit.date,
    subject: commit.subject
  };
}

function gitCommitToCommitData(commit: GitCommit): CommitData {
  return {
    hash: commit.hash,
    author: commit.author,
    date: commit.date,
    subject: commit.subject || commit.message,
    version: 0 // Will be filled by GitService
  };
}


interface UncommittedChanges {
  hasChanges: boolean;
  files: Array<{
    fileName: string;
    status: string;
  }>;
  summary?: string;
}

interface PaginationState {
  currentOffset: number;
  hasMore: boolean;
  totalCount: number;
  isLoading: boolean;
}

interface PaginatedCommitsResult {
  commits: CommitData[];
  nextOffset: number;
  hasMore: boolean;
  totalCount: number;
}

interface SaveChangesOptions {
  discard?: boolean;
}

interface PaginationInfo {
  hasMore: boolean;
  totalCount: number;
  showingCount: number;
}

/**
 * Refactored GitHistoryWebviewProvider with separated services
 */
export class GitHistoryWebviewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | null = null;
  private commits: CommitData[] = [];
  private uncommittedChanges: UncommittedChanges | null = null;
  private isRestoring: boolean = false;
  private isDisposed: boolean = false;
  
  // Progressive loading state
  private paginationState: PaginationState = {
    currentOffset: 0,
    hasMore: true,
    totalCount: 0,
    isLoading: false
  };

  // Services
  private readonly notificationService: NotificationService;
  private readonly fileService: FileOperationsService;
  private readonly gitService: GitService;
  
  private repositoryWatcher: vscode.FileSystemWatcher | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {
    // Initialize services with dependency injection
    this.notificationService = new NotificationService();
    this.fileService = new FileOperationsService();
    this.gitService = new GitService(this.notificationService, this.fileService);

    this.setupWorkspaceListeners();
  }

  /**
   * Setup listeners for workspace changes to detect repositories faster
   */
  private setupWorkspaceListeners(): void {
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      if (this.isRestoring) return;
      
      this.gitService.clearCache();
      if (this.view && this.view.visible) {
        this.refresh();
      }
    });

    const watcher = vscode.workspace.createFileSystemWatcher("**/.git/**");

    watcher.onDidCreate(() => {
      if (this.isRestoring) return;
      this.gitService.clearCache();
      if (this.view && this.view.visible) {
        setTimeout(() => this.refresh(), 500);
      }
    });

    watcher.onDidDelete(() => {
      if (this.isRestoring) return;
      this.gitService.clearCache();
      if (this.view && this.view.visible) {
        this.refresh();
      }
    });

    this.repositoryWatcher = watcher;
  }

  /**
   * Proactively scan for repositories
   * @returns Promise<boolean> True if repository found
   */
  private async proactivelyScanForRepositories(): Promise<boolean> {
    try {
      return await this.gitService.hasRepositoryRobust();
    } catch (error) {
      console.log(`TimeLad: Proactive scan failed: ${(error as Error).message}`);
      return false;
    }
  }

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    console.log('TimeLad: Resolving webview view');
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    console.log('TimeLad: Starting initial repository scan');
    try {
      const hasRepo = await this.proactivelyScanForRepositories();
      console.log('TimeLad: Repository scan complete, hasRepo:', hasRepo);
      await this.refresh();
    } catch (error) {
      console.error('TimeLad: Error during initial repository scan:', error);
      await this.refresh();
    }

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
      }
    });

    webviewView.webview.onDidReceiveMessage(async (message: TimeLadWebviewMessage) => {
      try {
        await this.handleWebviewMessage(message);
      } catch (error) {
        console.error(`${constants.EXTENSION_NAME}: Error handling webview message:`, error);
        // Check if error is due to extension being disposed/canceled during shutdown
        if ((error as any).name === 'Canceled' || (error as Error).message === 'Canceled') {
          console.log(`${constants.EXTENSION_NAME}: Webview message canceled during extension shutdown`);
          return;
        }
        try {
          await this.notificationService.showError((error as Error).message);
        } catch (notificationError) {
          // Silently fail if notification service is unavailable during shutdown
          console.error(`${constants.EXTENSION_NAME}: Failed to show error notification:`, notificationError);
        }
      }
    });
  }

  /**
   * Handle messages from the webview
   * @param message Message from webview
   */
  private async handleWebviewMessage(message: TimeLadWebviewMessage): Promise<void> {
    if (this.isDisposed) {
      console.log(`${constants.EXTENSION_NAME}: Ignoring webview message - provider is disposed`);
      return;
    }
    
    switch (message.command) {
      case "showCommit":
        await this.showCommitDetails(message.hash);
        break;

      case "requestRestore":
        await this.requestRestore(message.hash);
        break;

      case "confirmRestore":
        await this.restoreVersion(message.hash, true);
        break;

      case "saveChanges":
        await this.saveChanges();
        break;
        
      case "requestDiscard":
        await this.requestDiscard();
        break;

      case "confirmDiscard":
        await this.discardChanges(true);
        break;
        
      case "loadMoreCommits":
        await this.loadMoreCommits();
        break;
        
      case "createRepository":
        await this.createRepository();
        break;
        
      case "loadFromGitHub":
        await this.notificationService.executeCommand("timelad.loadFromGitHub");
        break;
        
      case "openUrl":
        if (message.url) {
          await this.notificationService.openExternalUrl(message.url);
        }
        break;
        
      default:
        console.warn(`${constants.EXTENSION_NAME}: Unknown webview message command: ${(message as any).command}`);
    }
  }

  /**
   * Show commit details for a specific commit
   * @param commitHash Commit hash
   */
  private async showCommitDetails(commitHash: string): Promise<void> {
    const commit = this.commits.find((c) => c.hash === commitHash);
    if (!commit) {
      throw new Error("Commit not found");
    }

    const commitDetails = await this.gitService.getCommitDetails(commitHash);
    await this.createCommitDetailsPanel(commit, commitDetails);
  }

  /**
   * Check for unsaved changes in the workspace
   * @returns Promise<boolean> True if there are unsaved changes
   */
  private async hasUnsavedChanges(): Promise<boolean> {
    const unsavedDocuments = vscode.workspace.textDocuments.filter(
      doc => doc.isDirty && !doc.isUntitled
    );
    return unsavedDocuments.length > 0;
  }

  /**
   * Request restore - checks for uncommitted changes and shows modal if needed
   * @param commitHash Commit hash
   */
  private async requestRestore(commitHash: string): Promise<void> {
    const commit = this.commits.find((c) => c.hash === commitHash);
    if (!commit) {
      await this.notificationService.showError("Commit not found");
      return;
    }

    try {
      const repoPath = await this.gitService.getRepositoryPath();
      const { hasChanges, files } = await this.gitService.getUncommittedChanges(repoPath);
      
      if (hasChanges || files.length > 0) {
        // Show custom confirmation modal in webview
        this.view?.webview.postMessage({
          command: 'showConfirmation',
          title: 'Confirm Version Restore',
          message: `You have ${files.length} uncommitted change(s) that will be permanently lost.`,
          files: files.map(f => ({
            fileName: f.fileName,
            status: f.status
          })),
          commitHash: commitHash
        });
      } else {
        // No uncommitted changes, proceed directly
        await this.restoreVersion(commitHash, true);
      }
    } catch (error) {
      await this.notificationService.showError(`Error checking for changes: ${(error as Error).message}`);
    }
  }

  /**
   * Restore a specific version
   * @param commitHash Commit hash
   * @param skipConfirmation Skip confirmation checks
   */
  private async restoreVersion(commitHash: string, skipConfirmation: boolean = false): Promise<void> {
    const commit = this.commits.find((c) => c.hash === commitHash);
    if (!commit) {
      throw new Error("Commit not found");
    }

    // Check for unsaved changes
    if (await this.hasUnsavedChanges()) {
      const unsavedDocuments = vscode.workspace.textDocuments.filter(
        doc => doc.isDirty && !doc.isUntitled
      );
      
      const shouldProceed = await this.notificationService.showUnsavedFilesWarning(unsavedDocuments);
      if (!shouldProceed) {
        return;
      }
    }

    // Show loading spinner
    if (this.view) {
      this.view.webview.html = this.getLoadingTemplate(`Restoring version ${commit.version || commit.hash}...`);
    }

    this.isRestoring = true;
    const statusBar = this.notificationService.setStatusBarMessage(constants.MESSAGES.RESTORING_VERSION);

    try {
      const result = await this.gitService.restoreVersion(commit, null, skipConfirmation);
      
      if (!result.success) {
        await this.notificationService.showError(result.message || 'Restore failed');
        return;
      }
      
      // Show success message
      if (this.view) {
        this.view.webview.html = this.getSuccessTemplate("Restore complete!");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Update commits list
      if (this.view) {
        const commits = await this.gitService.getCommits();
        this.commits = commits;
        this.view.webview.html = getSidebarTemplate(commits, this.uncommittedChanges);
      }
      
      statusBar.dispose();
    } catch (error) {
      if (this.view) {
        await this.refresh();
      }
      throw new Error(`Failed to restore version: ${(error as Error).message}`);
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Create a panel to show commit details
   * @param commit Commit object
   * @param commitDetails Detailed commit information
   */
  private async createCommitDetailsPanel(commit: CommitData, commitDetails: string): Promise<void> {
    const { getCommitDetailsTemplate } = require("../views/templates/webviewTemplates");

    const panel = vscode.window.createWebviewPanel(
      constants.COMMIT_DETAILS_VIEW_ID,
      `${constants.EXTENSION_NAME}: Version ${commit.version || commit.hash}`,
      vscode.ViewColumn.One,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getCommitDetailsTemplate(commitDataToGitCommit(commit), commitDetails);
  }

  /**
   * Request discard - checks for uncommitted changes and shows modal
   */
  private async requestDiscard(): Promise<void> {
    try {
      const repoPath = await this.gitService.getRepositoryPath();
      const { hasChanges, files } = await this.gitService.getUncommittedChanges(repoPath);
      
      if (!hasChanges || !files || files.length === 0) {
        await this.notificationService.showInfo('No uncommitted changes to discard');
        return;
      }

      // Show custom discard confirmation modal in webview
      this.view?.webview.postMessage({
        command: 'showDiscardConfirmation',
        title: 'Confirm Discard Changes',
        message: `You are about to permanently discard ${files.length} uncommitted change(s).`,
        files: files.map(f => ({
          fileName: f.fileName,
          status: f.status
        }))
      });
    } catch (error) {
      await this.notificationService.showError(`Error checking for changes: ${(error as Error).message}`);
    }
  }

  /**
   * Discard all uncommitted changes
   * @param skipConfirmation Skip confirmation checks
   */
  private async discardChanges(skipConfirmation: boolean = false): Promise<void> {
    try {
      const uncommittedChanges = await this.gitService.getUncommittedChanges();
      
      if (!uncommittedChanges || !uncommittedChanges.files || uncommittedChanges.files.length === 0) {
        await this.notificationService.showInfo('No uncommitted changes to discard');
        return;
      }

      if (!skipConfirmation) {
        const fileNames = uncommittedChanges.files.map(f => f.fileName);
        const shouldDiscard = await this.notificationService.showDestructiveConfirmation(
          'You have uncommitted changes that will be discarded:',
          fileNames,
          'Discard Changes',
          'Cancel'
        );

        if (!shouldDiscard) {
          return;
        }
      }

      try {
        await this.gitService.discardChanges();
        
        // Explicitly clear the local uncommitted changes state
        this.uncommittedChanges = { hasChanges: false, files: [], summary: "" };
        
        // Clear cache and refresh to ensure state is properly updated
        this.gitService.clearCache();
        await this.refresh();
        
        await this.notificationService.showInfo('All changes have been discarded');
      } catch (error) {
        await this.notificationService.showError(`Failed to discard changes: ${(error as Error).message}`);
      }
    } catch (error) {
      await this.notificationService.showError(`Error preparing to discard changes: ${(error as Error).message}`);
    }
  }

  /**
   * Save uncommitted changes
   */
  private async saveChanges(options: SaveChangesOptions = {}): Promise<void> {
    if (options.discard) {
      await this.discardChanges();
      return;
    }

    // Show loading spinner
    if (this.view) {
      this.view.webview.html = this.getLoadingTemplate("Saving changes...");
    }

    try {
      const commitMessage = await this.gitService.saveChanges();

      // Show success message
      if (this.view) {
        this.view.webview.html = this.getSuccessTemplate(
          "Changes saved!",
          `"${commitMessage}"`
        );
        
        setTimeout(async () => {
          await this.refresh();
        }, 3000);
      } else {
        await this.notificationService.showInfo(
          `${constants.MESSAGES.CHANGES_SAVED}\nCommit: "${commitMessage}"`
        );
        await this.refresh();
      }
    } catch (error) {
      if (this.view) {
        await this.refresh();
      }
      
      if ((error as Error).message === constants.MESSAGES.NO_UNCOMMITTED_CHANGES) {
        await this.notificationService.showInfo((error as Error).message);
      } else {
        await this.notificationService.showError(`Failed to save changes: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Create a new repository
   */
  private async createRepository(): Promise<void> {
    try {
      if (this.view) {
        this.view.webview.html = getLoadingTemplate();
      }

      const result = await this.gitService.createNewRepository();

      if (result === null) {
        await this.refresh();
        return;
      }

      await this.refresh();
    } catch (error) {
      await this.refresh();
    }
  }

  /**
   * Load more commits for progressive loading
   */
  private async loadMoreCommits(): Promise<void> {
    if (this.paginationState.isLoading || !this.paginationState.hasMore) {
      return;
    }

    try {
      this.paginationState.isLoading = true;
      
      // Send loading state to webview
      this.view?.webview.postMessage({
        command: 'setLoadingMore',
        isLoading: true
      });

      const result = await this.gitService.getCommitsPaginated({
        offset: this.paginationState.currentOffset,
        limit: constants.PROGRESSIVE_LOADING.LOAD_MORE_SIZE
      });

      // Append new commits to existing ones
      this.commits.push(...result.commits);
      
      // Update pagination state
      this.paginationState.currentOffset = result.nextOffset;
      this.paginationState.hasMore = result.hasMore;
      this.paginationState.totalCount = result.totalCount;

      // Send new commits to webview
      this.view?.webview.postMessage({
        command: 'appendCommits',
        commits: result.commits,
        hasMore: result.hasMore,
        totalCount: result.totalCount
      });

    } catch (error) {
      console.error('Error loading more commits:', error);
      this.view?.webview.postMessage({
        command: 'showError',
        error: (error as Error).message
      });
    } finally {
      this.paginationState.isLoading = false;
      this.view?.webview.postMessage({
        command: 'setLoadingMore',
        isLoading: false
      });
    }
  }

  /**
   * Reset pagination state for refresh
   */
  private resetPaginationState(): void {
    this.paginationState = {
      currentOffset: 0,
      hasMore: true,
      totalCount: 0,
      isLoading: false
    };
    this.commits = [];
  }

  /**
   * Refresh the webview content
   */
  public async refresh(): Promise<void> {
    console.log('TimeLad: Starting refresh');
    if (!this.view) {
      console.log('TimeLad: No view available, aborting refresh');
      return;
    }

    this.gitService.clearCache();
    this.view.webview.html = this.getScanningTemplate();
    console.log('TimeLad: Set scanning template');

    try {
      console.log('TimeLad: Checking if Git is installed');
      const gitInstalled = await this.gitService.isGitInstalled();

      if (!gitInstalled) {
        console.log('TimeLad: Git not installed');
        await this.notificationService.showGitNotInstalledMessage();
        this.view.webview.html = this.getGitNotInstalledTemplate();
        return;
      }

      console.log('TimeLad: Git installed, checking for repository');
      const hasRepo = await this.gitService.hasRepositoryRobust();

      if (!hasRepo) {
        this.view.webview.html = this.getNoRepositoryTemplate();
        return;
      }

      // Reset pagination state on refresh
      this.resetPaginationState();

      const [paginatedResult, uncommittedChanges] = await Promise.all([
        this.gitService.getCommitsPaginated({
          offset: 0,
          limit: constants.PROGRESSIVE_LOADING.INITIAL_LOAD_SIZE
        }),
        this.gitService.getUncommittedChanges(),
      ]);

      this.commits = paginatedResult.commits;
      this.uncommittedChanges = uncommittedChanges;
      
      // Update pagination state
      this.paginationState.currentOffset = paginatedResult.nextOffset;
      this.paginationState.hasMore = paginatedResult.hasMore;
      this.paginationState.totalCount = paginatedResult.totalCount;

      const paginationInfo: PaginationInfo = {
        hasMore: this.paginationState.hasMore,
        totalCount: this.paginationState.totalCount,
        showingCount: this.commits.length
      };

      this.view.webview.html = getSidebarTemplate(
        this.commits, 
        this.uncommittedChanges, 
        paginationInfo
      );
    } catch (error) {
      console.error(`${constants.EXTENSION_NAME}: Error refreshing commits:`, error);

      this.view.webview.html = this.getErrorTemplate((error as Error).message);
    }
  }

  /**
   * Get loading template
   * @param message Loading message
   * @returns HTML template
   */
  private getLoadingTemplate(message: string = "Loading..."): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            text-align: center;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top-color: var(--vscode-button-background);
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .message {
            margin-top: 16px;
            color: var(--vscode-foreground);
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <div class="message">${message}</div>
      </body>
      </html>
    `;
  }

  /**
   * Get success template
   * @param title Success title
   * @param subtitle Optional subtitle
   * @returns HTML template
   */
  private getSuccessTemplate(title: string, subtitle: string = ""): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            text-align: center;
          }
          .checkmark {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            display: block;
            stroke-width: 4;
            stroke: var(--vscode-testing-iconPassed);
            stroke-miterlimit: 10;
            margin: 0 auto 20px;
            box-shadow: inset 0 0 0 rgba(0, 0, 0, 0.1);
          }
          .checkmark__circle {
            stroke-dasharray: 166;
            stroke-dashoffset: 166;
            stroke-width: 2;
            stroke-miterlimit: 10;
            stroke: var(--vscode-testing-iconPassed);
            fill: none;
            animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          }
          .checkmark__check {
            transform-origin: 50% 50%;
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
          }
          @keyframes stroke {
            100% { stroke-dashoffset: 0; }
          }
          .message {
            margin-top: 16px;
            color: var(--vscode-foreground);
            font-size: 16px;
          }
          .subtitle {
            margin-top: 8px;
            font-style: italic;
            color: var(--vscode-descriptionForeground);
            max-width: 280px;
            word-wrap: break-word;
          }
          .success {
            color: var(--vscode-testing-iconPassed);
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
        <div class="message success">${title}</div>
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      </body>
      </html>
    `;
  }

  /**
   * Get error template
   * @param errorMessage Error message
   * @returns HTML template
   */
  private getErrorTemplate(errorMessage: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            text-align: center;
          }
          .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .retry-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <h2>⚠️ Error Loading History</h2>
        <div class="error">${errorMessage}</div>
        <button class="retry-btn" onclick="refreshHistory()">🔄 Try Again</button>
        <script>
          const vscode = acquireVsCodeApi();
          function refreshHistory() {
            vscode.postMessage({ command: 'refresh' });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Get template for when git is not installed
   * @returns HTML template
   */
  private getGitNotInstalledTemplate(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TimeLad: Git Required</title>
          <style>
              body {
                  font-family: var(--vscode-font-family);
                  padding: 20px;
                  color: var(--vscode-foreground);
                  background-color: var(--vscode-editor-background);
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  flex-direction: column;
                  text-align: center;
              }
              .error-container {
                  max-width: 400px;
                  padding: 30px;
                  border-radius: 8px;
                  background-color: var(--vscode-inputValidation-errorBackground);
                  border: 1px solid var(--vscode-inputValidation-errorBorder);
              }
              .error-icon {
                  font-size: 48px;
                  margin-bottom: 20px;
                  color: var(--vscode-errorForeground);
              }
              .error-title {
                  font-size: 1.4em;
                  color: var(--vscode-errorForeground);
                  margin: 0 0 15px 0;
                  font-weight: 600;
              }
              .error-description {
                  color: var(--vscode-foreground);
                  line-height: 1.6;
                  margin-bottom: 25px;
                  font-size: 0.95em;
              }
              .action-btn {
                  background: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  border-radius: 4px;
                  padding: 12px 24px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                  margin: 8px;
                  transition: all 0.2s ease;
              }
              .action-btn:hover {
                  background: var(--vscode-button-hoverBackground);
              }
          </style>
      </head>
      <body>
          <div class="error-container">
              <div class="error-icon">🔧</div>
              <h1 class="error-title">Git Not Found</h1>
              <p class="error-description">
                  TimeLad needs Git to track your project's history, but Git isn't installed on your system.
              </p>
              
              <button class="action-btn" onclick="openGitWebsite()">
                  🌐 Download Git
              </button>
          </div>
          
          <script>
              const vscode = acquireVsCodeApi();
              
              function openGitWebsite() {
                  vscode.postMessage({ command: 'openUrl', url: 'https://git-scm.com/downloads' });
              }
          </script>
      </body>
      </html>
    `;
  }

  /**
   * Get template for when no repository exists
   * @returns HTML template
   */
  private getNoRepositoryTemplate(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TimeLad: Get Started</title>
          <style>
              body {
                  font-family: var(--vscode-font-family);
                  padding: 20px;
                  color: var(--vscode-foreground);
                  background-color: var(--vscode-editor-background);
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  flex-direction: column;
                  text-align: center;
              }
              .welcome-container {
                  max-width: 350px;
                  padding: 25px;
                  border-radius: 8px;
                  background-color: var(--vscode-editor-inactiveSelectionBackground);
                  border: 1px solid var(--vscode-panel-border);
              }
              .welcome-icon {
                  font-size: 40px;
                  margin-bottom: 15px;
              }
              .welcome-title {
                  font-size: 1.3em;
                  color: var(--vscode-terminal-ansiGreen);
                  margin: 0 0 12px 0;
                  font-weight: 600;
              }
              .setup-btn {
                  background: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  border-radius: 4px;
                  padding: 10px 20px;
                  cursor: pointer;
                  font-size: 13px;
                  font-weight: 500;
                  margin: 8px 3px;
                  transition: all 0.2s ease;
                  min-width: 140px;
              }
              .setup-btn:hover {
                  background: var(--vscode-button-hoverBackground);
                  transform: translateY(-1px);
              }
          </style>
      </head>
      <body>
          <div class="welcome-container">
              <div class="welcome-icon">🚀</div>
              <h1 class="welcome-title">Welcome to TimeLad!</h1>
              <p>This folder isn't set up for tracking your work history yet. Would you like TimeLad to set up version tracking?</p>
              
              <div style="margin-top: 25px;">
                  <button class="setup-btn" onclick="setupVersionTracking()">
                      ✨ Set Up Version Tracking
                  </button>
                  <br>
                  <button class="setup-btn" onclick="loadFromGitHub()">
                      📥 Load from GitHub
                  </button>
                  <br>
                  <button class="setup-btn" onclick="refreshView()">
                      🔄 Check Again
                  </button>
              </div>
          </div>

          <script>
              const vscode = acquireVsCodeApi();

              function setupVersionTracking() {
                  vscode.postMessage({ command: 'createRepository' });
              }

              function loadFromGitHub() {
                  vscode.postMessage({ command: 'loadFromGitHub' });
              }

              function refreshView() {
                  vscode.postMessage({ command: 'refresh' });
              }
          </script>
      </body>
      </html>
    `;
  }

  /**
   * Get template for the scanning state
   * @returns HTML template
   */
  private getScanningTemplate(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TimeLad: Scanning...</title>
          <style>
              body {
                  font-family: var(--vscode-font-family);
                  padding: 20px;
                  color: var(--vscode-foreground);
                  background-color: var(--vscode-editor-background);
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  flex-direction: column;
                  text-align: center;
              }
              .scanning-container {
                  max-width: 300px;
                  padding: 30px;
                  border-radius: 8px;
                  background-color: var(--vscode-editor-inactiveSelectionBackground);
                  border: 1px solid var(--vscode-panel-border);
              }
              .scanning-icon {
                  font-size: 32px;
                  margin-bottom: 20px;
                  animation: pulse 1.5s ease-in-out infinite;
              }
              .scanning-title {
                  font-size: 1.1em;
                  color: var(--vscode-terminal-ansiBlue);
                  margin: 0 0 10px 0;
                  font-weight: 500;
              }
              .scanning-description {
                  color: var(--vscode-descriptionForeground);
                  line-height: 1.4;
                  margin-bottom: 20px;
                  font-size: 0.9em;
              }
              .progress-bar {
                  width: 100%;
                  height: 3px;
                  background-color: var(--vscode-progressBar-background);
                  border-radius: 2px;
                  overflow: hidden;
                  margin-top: 15px;
              }
              .progress-fill {
                  height: 100%;
                  background-color: var(--vscode-terminal-ansiBlue);
                  animation: progress 2s ease-in-out infinite;
              }
              @keyframes pulse {
                  0%, 100% { transform: scale(1); opacity: 0.7; }
                  50% { transform: scale(1.1); opacity: 1; }
              }
              @keyframes progress {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
              }
          </style>
      </head>
      <body>
          <div class="scanning-container">
              <div class="scanning-icon">🔍</div>
              <h2 class="scanning-title">Scanning folder...</h2>
              <p class="scanning-description">
                  Looking for git repositories in your workspace
              </p>
              <div class="progress-bar">
                  <div class="progress-fill"></div>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.isDisposed = true;
    if (this.repositoryWatcher) {
      this.repositoryWatcher.dispose();
      this.repositoryWatcher = null;
    }
    console.log(`${constants.EXTENSION_NAME}: GitHistoryWebviewProvider disposed`);
  }
}