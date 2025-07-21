import * as vscode from 'vscode';
import { NotificationServiceInterface } from '../types';
interface RepositoryDetails {
    description: string;
    isPrivate: boolean;
}
interface FileStatus {
    fileName: string;
    status: string;
}
/**
 * Service for managing VS Code notifications and user interactions
 * Centralizes all showInformationMessage, showErrorMessage, showWarningMessage, etc.
 */
export declare class NotificationService implements NotificationServiceInterface {
    private readonly extensionName;
    constructor();
    /**
     * Show an information message to the user
     */
    showInformation(message: string, ...items: string[]): Promise<string | undefined>;
    /**
     * Show an information message to the user (alias for interface compatibility)
     */
    showInfo(message: string, ...items: string[]): Promise<string | undefined>;
    /**
     * Show an error message to the user
     */
    showError(message: string, ...items: string[]): Promise<string | undefined>;
    /**
     * Show a warning message to the user
     */
    showWarning(message: string, options?: vscode.MessageOptions, ...items: string[]): Promise<string | undefined>;
    /**
     * Show confirmation dialog
     */
    showConfirmation(message: string, yesText?: string, noText?: string): Promise<boolean>;
    /**
     * Show a progress notification
     */
    showProgress<T>(title: string, task: (progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>, token: vscode.CancellationToken) => Thenable<T>, options?: Partial<vscode.ProgressOptions>): Promise<T>;
    /**
     * Show an input box for user input
     */
    showInputBox(options?: vscode.InputBoxOptions): Promise<string | undefined>;
    /**
     * Show a quick pick for user selection
     */
    showQuickPick<T extends vscode.QuickPickItem>(items: T[], options?: vscode.QuickPickOptions): Promise<T | undefined>;
    /**
     * Show file/folder selection dialog
     */
    showOpenDialog(options: vscode.OpenDialogOptions): Promise<vscode.Uri[] | undefined>;
    /**
     * Set a temporary status bar message
     */
    setStatusBarMessage(message: string, timeout?: number): vscode.Disposable;
    /**
     * Show confirmation dialog for destructive actions
     */
    showDestructiveConfirmation(message: string, files?: string[], confirmText?: string, cancelText?: string): Promise<boolean>;
    /**
     * Show uncommitted changes warning
     */
    showUncommittedChangesWarning(files: FileStatus[]): Promise<boolean>;
    /**
     * Show unsaved files warning
     */
    showUnsavedFilesWarning(documents: vscode.TextDocument[]): Promise<boolean>;
    /**
     * Show repository creation options
     */
    showRepositoryCreationOptions(): Promise<string | null>;
    /**
     * Show Git installation message
     */
    showGitNotInstalledMessage(): Promise<void>;
    /**
     * Show success message with optional action
     */
    showSuccess(message: string, actionText?: string, actionCallback?: () => Promise<void>): Promise<void>;
    /**
     * Show repository details input dialog
     */
    showRepositoryDetailsDialog(repoName: string): Promise<RepositoryDetails | null>;
    /**
     * Show repository name input dialog
     */
    showRepositoryNameDialog(defaultName: string): Promise<string | null>;
    /**
     * Show clone location dialog
     */
    showCloneLocationDialog(): Promise<string | null>;
    /**
     * Open external URL
     */
    openExternalUrl(url: string): Promise<boolean>;
    /**
     * Execute VS Code command
     */
    executeCommand(command: string, ...args: any[]): Promise<any>;
}
export {};
//# sourceMappingURL=NotificationService.d.ts.map