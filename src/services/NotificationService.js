const vscode = require("vscode");
const constants = require("../constants");

/**
 * Service for managing VS Code notifications and user interactions
 * Centralizes all showInformationMessage, showErrorMessage, showWarningMessage, etc.
 */
class NotificationService {
  constructor() {
    this.extensionName = constants.EXTENSION_NAME;
  }

  /**
   * Show an information message to the user
   * @param {string} message Message to display
   * @param {...string} items Optional action items
   * @returns {Promise<string|undefined>} Selected action or undefined
   */
  async showInfo(message, ...items) {
    return await vscode.window.showInformationMessage(message, ...items);
  }

  /**
   * Show an error message to the user
   * @param {string} message Error message to display
   * @param {...string} items Optional action items
   * @returns {Promise<string|undefined>} Selected action or undefined
   */
  async showError(message, ...items) {
    const fullMessage = message.startsWith(this.extensionName) 
      ? message 
      : `${this.extensionName}: ${message}`;
    return await vscode.window.showErrorMessage(fullMessage, ...items);
  }

  /**
   * Show a warning message to the user
   * @param {string} message Warning message to display
   * @param {Object} options Optional modal options
   * @param {...string} items Optional action items
   * @returns {Promise<string|undefined>} Selected action or undefined
   */
  async showWarning(message, options = {}, ...items) {
    return await vscode.window.showWarningMessage(message, options, ...items);
  }

  /**
   * Show a progress notification
   * @param {string} title Progress title
   * @param {Function} task Task function that receives progress callback
   * @param {Object} options Progress options
   * @returns {Promise<any>} Task result
   */
  async showProgress(title, task, options = {}) {
    const progressOptions = {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false,
      ...options
    };

    return await vscode.window.withProgress(progressOptions, task);
  }

  /**
   * Show an input box for user input
   * @param {Object} options Input box options
   * @returns {Promise<string|undefined>} User input or undefined if cancelled
   */
  async showInputBox(options) {
    return await vscode.window.showInputBox({
      ignoreFocusOut: true,
      ...options
    });
  }

  /**
   * Show a quick pick for user selection
   * @param {Array} items Items to choose from
   * @param {Object} options Quick pick options
   * @returns {Promise<any>} Selected item or undefined if cancelled
   */
  async showQuickPick(items, options = {}) {
    return await vscode.window.showQuickPick(items, {
      ignoreFocusOut: true,
      ...options
    });
  }

  /**
   * Show file/folder selection dialog
   * @param {Object} options Open dialog options
   * @returns {Promise<vscode.Uri[]|undefined>} Selected URIs or undefined
   */
  async showOpenDialog(options) {
    return await vscode.window.showOpenDialog(options);
  }

  /**
   * Set a temporary status bar message
   * @param {string} message Status message
   * @param {number} timeout Optional timeout in milliseconds
   * @returns {vscode.Disposable} Status bar message disposable
   */
  setStatusBarMessage(message, timeout) {
    return vscode.window.setStatusBarMessage(message, timeout);
  }

  /**
   * Show confirmation dialog for destructive actions
   * @param {string} message Confirmation message
   * @param {Array} files Optional list of affected files
   * @param {string} confirmText Text for confirm button
   * @param {string} cancelText Text for cancel button
   * @returns {Promise<boolean>} True if confirmed, false if cancelled
   */
  async showDestructiveConfirmation(message, files = [], confirmText = "Confirm", cancelText = "Cancel") {
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
   * @param {Array} files List of uncommitted files
   * @returns {Promise<boolean>} True if user wants to proceed
   */
  async showUncommittedChangesWarning(files) {
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
   * @param {Array} documents List of unsaved documents
   * @returns {Promise<boolean>} True if user acknowledged
   */
  async showUnsavedFilesWarning(documents) {
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
   * @returns {Promise<string|null>} Selected option ('create' or 'github') or null if cancelled
   */
  async showRepositoryCreationOptions() {
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
      ],
      {
        placeHolder: "No Git repository found. What would you like to do?",
      }
    );

    return choice ? choice.value : null;
  }

  /**
   * Show Git installation message
   * @returns {Promise<void>}
   */
  async showGitNotInstalledMessage() {
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
   * @param {string} message Success message
   * @param {string} actionText Optional action button text
   * @param {Function} actionCallback Optional action callback
   * @returns {Promise<void>}
   */
  async showSuccess(message, actionText = null, actionCallback = null) {
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
   * @param {string} repoName Repository name
   * @returns {Promise<Object|null>} Repository details or null if cancelled
   */
  async showRepositoryDetailsDialog(repoName) {
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
   * @param {string} defaultName Default repository name
   * @returns {Promise<string|null>} Repository name or null if cancelled
   */
  async showRepositoryNameDialog(defaultName) {
    return await this.showInputBox({
      prompt: "Enter GitHub repository name",
      placeHolder: defaultName,
      value: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Repository name is required";
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
          return "Repository name can only contain letters, numbers, hyphens, periods, and underscores";
        }
        return null;
      },
    });
  }

  /**
   * Show clone location dialog
   * @returns {Promise<string|null>} Selected clone option or null if cancelled
   */
  async showCloneLocationDialog() {
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
   * @param {string} url URL to open
   * @returns {Promise<boolean>} True if successful
   */
  async openExternalUrl(url) {
    try {
      await vscode.env.openExternal(vscode.Uri.parse(url));
      return true;
    } catch (error) {
      await this.showError(`Failed to open URL: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute VS Code command
   * @param {string} command Command to execute
   * @param {...any} args Command arguments
   * @returns {Promise<any>} Command result
   */
  async executeCommand(command, ...args) {
    try {
      return await vscode.commands.executeCommand(command, ...args);
    } catch (error) {
      await this.showError(`Failed to execute command '${command}': ${error.message}`);
      throw error;
    }
  }
}

module.exports = NotificationService;