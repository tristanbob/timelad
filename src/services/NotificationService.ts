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

interface QuickPickOption {
    label: string;
    description: string;
    value?: string;
}

/**
 * Service for managing VS Code notifications and user interactions
 * Centralizes all showInformationMessage, showErrorMessage, showWarningMessage, etc.
 */
export class NotificationService implements NotificationServiceInterface {
    private readonly extensionName: string;

    constructor() {
        this.extensionName = 'TimeLad';
    }

    /**
     * Show an information message to the user
     */
    async showInformation(message: string, ...items: string[]): Promise<string | undefined> {
        return await vscode.window.showInformationMessage(message, ...items);
    }

    /**
     * Show an information message to the user (alias for interface compatibility)
     */
    async showInfo(message: string, ...items: string[]): Promise<string | undefined> {
        return await this.showInformation(message, ...items);
    }

    /**
     * Show an error message to the user
     */
    async showError(message: string, ...items: string[]): Promise<string | undefined> {
        const fullMessage = message.startsWith(this.extensionName) 
            ? message 
            : `${this.extensionName}: ${message}`;
        return await vscode.window.showErrorMessage(fullMessage, ...items);
    }

    /**
     * Show a warning message to the user
     */
    async showWarning(message: string, options: vscode.MessageOptions = {}, ...items: string[]): Promise<string | undefined> {
        return await vscode.window.showWarningMessage(message, options, ...items);
    }

    /**
     * Show confirmation dialog
     */
    async showConfirmation(message: string, yesText: string = 'Yes', noText: string = 'No'): Promise<boolean> {
        const choice = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            yesText,
            noText
        );
        return choice === yesText;
    }

    /**
     * Show a progress notification
     */
    async showProgress<T>(
        title: string, 
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) => Thenable<T>,
        options: Partial<vscode.ProgressOptions> = {}
    ): Promise<T> {
        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false,
            ...options
        };

        return await vscode.window.withProgress(progressOptions, task);
    }

    /**
     * Show an input box for user input
     */
    async showInputBox(options: vscode.InputBoxOptions = {}): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            ignoreFocusOut: true,
            ...options
        });
    }

    /**
     * Show a quick pick for user selection
     */
    async showQuickPick<T extends vscode.QuickPickItem>(
        items: T[], 
        options: vscode.QuickPickOptions = {}
    ): Promise<T | undefined> {
        return await vscode.window.showQuickPick(items, {
            ignoreFocusOut: true,
            ...options
        });
    }

    /**
     * Show file/folder selection dialog
     */
    async showOpenDialog(options: vscode.OpenDialogOptions): Promise<vscode.Uri[] | undefined> {
        return await vscode.window.showOpenDialog(options);
    }

    /**
     * Set a temporary status bar message
     */
    setStatusBarMessage(message: string, timeout?: number): vscode.Disposable {
        if (timeout !== undefined) {
            return vscode.window.setStatusBarMessage(message, timeout);
        } else {
            return vscode.window.setStatusBarMessage(message);
        }
    }

    /**
     * Show confirmation dialog for destructive actions
     */
    async showDestructiveConfirmation(
        message: string, 
        files: string[] = [], 
        confirmText: string = "Confirm", 
        cancelText: string = "Cancel"
    ): Promise<boolean> {
        let fullMessage = message;
        
        if (files.length > 0) {
            const fileList = files.slice(0, 5).map(file => `• ${file}`).join('\n');
            const moreFiles = files.length > 5 ? `\n• ...and ${files.length - 5} more files` : '';
            fullMessage = `${message}\n\n${fileList}${moreFiles}`;
        }

        const choice = await this.showWarning(
            fullMessage,
            { modal: true },
            confirmText,
            cancelText
        );

        return choice === confirmText;
    }

    /**
     * Show uncommitted changes warning
     */
    async showUncommittedChangesWarning(files: FileStatus[]): Promise<boolean> {
        const fileList = files.slice(0, 5).map(f => `• ${f.fileName} (${f.status})`).join('\n');
        const moreFiles = files.length > 5 ? `\n...and ${files.length - 5} more files` : '';
        
        const choice = await this.showWarning(
            `You have ${files.length} uncommitted change(s) that will be permanently lost.\n\n${fileList}${moreFiles}\n\nDo you want to discard all changes and restore to the selected version?`,
            { modal: true },
            'Discard All Changes and Restore',
            'Cancel'
        );

        return choice === 'Discard All Changes and Restore';
    }

    /**
     * Show unsaved files warning
     */
    async showUnsavedFilesWarning(documents: vscode.TextDocument[]): Promise<boolean> {
        const docList = documents.slice(0, 5).map(doc => `• ${doc.fileName.split('/').pop()}`).join('\n');
        const moreDocs = documents.length > 5 ? `\n• ...and ${documents.length - 5} more files` : '';
        
        const choice = await this.showWarning(
            `You have ${documents.length} unsaved file(s):\n\n${docList}${moreDocs}\n\nPlease save or discard all changes before restoring a version.`,
            { modal: true },
            'Show Files',
            'OK'
        );

        if (choice === 'Show Files') {
            await vscode.commands.executeCommand('workbench.action.showAllEditors');
        }
        
        return false; // Always return false as user needs to handle unsaved files first
    }

    /**
     * Show repository creation options
     */
    async showRepositoryCreationOptions(): Promise<string | null> {
        const choice = await this.showQuickPick(
            [
                {
                    label: "$(repo-create) Create New Repository",
                    description: "Initialize a new Git repository in this workspace",
                    value: "create",
                },
                {
                    label: "$(github) Load from GitHub",
                    description: "Clone an existing repository from GitHub",
                    value: "github",
                },
            ] as (QuickPickOption & vscode.QuickPickItem)[],
            {
                placeHolder: "No Git repository found. What would you like to do?",
            }
        );

        return choice ? (choice as any).value : null;
    }

    /**
     * Show Git installation message
     */
    async showGitNotInstalledMessage(): Promise<void> {
        const message = `🔧 Git is not installed on your system.

TimeLad needs Git to track your project's history. Git is a free tool that helps you manage your code versions.

To install Git:
• Windows: Download from git-scm.com
• Mac: Install Xcode Command Line Tools or use Homebrew
• Linux: Use your package manager (apt, yum, etc.)

After installing Git, please restart VS Code.`;

        const selection = await this.showError(message, "Open Git Website");
        
        if (selection === "Open Git Website") {
            vscode.env.openExternal(vscode.Uri.parse("https://git-scm.com/downloads"));
        }
    }

    /**
     * Show success message with optional action
     */
    async showSuccess(message: string, actionText?: string, actionCallback?: () => Promise<void>): Promise<void> {
        if (actionText && actionCallback) {
            const choice = await this.showInfo(message, actionText);
            if (choice === actionText) {
                await actionCallback();
            }
        } else {
            await this.showInfo(message);
        }
    }

    /**
     * Show repository details input dialog
     */
    async showRepositoryDetailsDialog(repoName: string): Promise<RepositoryDetails | null> {
        // Get description
        const description = await this.showInputBox({
            prompt: `Enter description for '${repoName}' (optional)`,
            placeHolder: "A brief description of your project",
        });

        if (description === undefined) {
            return null; // User cancelled
        }

        // Ask about privacy
        const privacy = await this.showQuickPick(
            [
                { label: "Public", description: "Anyone can see this repository" },
                { label: "Private", description: "Only you can see this repository" },
            ],
            {
                placeHolder: "Repository visibility",
            }
        );

        if (!privacy) {
            return null; // User cancelled
        }

        return {
            description: description || "",
            isPrivate: privacy.label === "Private",
        };
    }

    /**
     * Show repository name input dialog
     */
    async showRepositoryNameDialog(defaultName: string): Promise<string | null> {
        const result = await this.showInputBox({
            prompt: "Enter GitHub repository name",
            placeHolder: defaultName,
            value: defaultName,
            validateInput: (value: string) => {
                if (!value || value.trim().length === 0) {
                    return "Repository name is required";
                }
                if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
                    return "Repository name can only contain letters, numbers, hyphens, periods, and underscores";
                }
                return null;
            },
        });

        return result || null;
    }

    /**
     * Show clone location dialog
     */
    async showCloneLocationDialog(): Promise<string | null> {
        const cloneOptions = await this.showQuickPick(
            [
                {
                    label: "Choose Location",
                    description: "Select where to save the repository",
                },
                {
                    label: "Current Workspace",
                    description: "Clone into current workspace folder",
                },
            ],
            {
                placeHolder: "Where would you like to save the repository?",
            }
        );

        return cloneOptions ? cloneOptions.label : null;
    }

    /**
     * Open external URL
     */
    async openExternalUrl(url: string): Promise<boolean> {
        try {
            await vscode.env.openExternal(vscode.Uri.parse(url));
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.showError(`Failed to open URL: ${errorMessage}`);
            return false;
        }
    }

    /**
     * Execute VS Code command
     */
    async executeCommand(command: string, ...args: any[]): Promise<any> {
        try {
            return await vscode.commands.executeCommand(command, ...args);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.showError(`Failed to execute command '${command}': ${errorMessage}`);
            throw error;
        }
    }
}