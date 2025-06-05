const vscode = require('vscode');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');

/**
 * Activates the extension
 * @param {vscode.ExtensionContext} context
 */
/**
 * GitHistoryTreeDataProvider implements a TreeDataProvider for showing git commit history in a sidebar view
 */
class GitHistoryTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.commits = [];
        this.loading = false;
        this.refresh();
    }

    async getCommits() {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            
            if (!gitExtension) {
                return [];
            }
            
            const api = gitExtension.getAPI(1);
            
            if (!api.repositories || api.repositories.length === 0) {
                return [];
            }
            
            const repo = api.repositories[0];
            const repoPath = repo.rootUri.fsPath;
            
            // Get total number of commits to determine the latest version number
            const { stdout: countOutput } = await execPromise(
                'git rev-list --count HEAD',
                { cwd: repoPath }
            );
            
            const totalCommits = parseInt(countOutput.trim());
            
            // Get detailed commit information for the recent commits
            const { stdout } = await execPromise(
                'git log -n 30 --pretty=format:"%h|%an|%ad|%s|%d" --date=format:"%Y-%m-%d %H:%M:%S"',
                { cwd: repoPath }
            );
            
            // Process the git log output and add version numbers
            // Starting with the latest commit as the highest version number
            return stdout.split('\n').map((line, index) => {
                const [hash, author, date, subject, refs] = line.split('|');
                const versionNumber = totalCommits - index; // Calculate version number
                return { hash, author, date, subject, refs: refs || '', version: versionNumber };
            });
        } catch (error) {
            console.error(`Error fetching commits: ${error.message}`);
            return [];
        }
    }

    async refresh() {
        this.loading = true;
        this._onDidChangeTreeData.fire();
        this.commits = await this.getCommits();
        this.loading = false;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        const treeItem = new vscode.TreeItem(
            `Version ${element.version}: ${element.subject}`,
            vscode.TreeItemCollapsibleState.None
        );
        treeItem.description = `${element.author} - ${element.date}`;
        treeItem.tooltip = `${element.subject}\nAuthor: ${element.author}\nDate: ${element.date}\nHash: ${element.hash}`;
        treeItem.command = {
            command: 'timelad.showCommitDetails',
            title: 'Show Commit Details',
            arguments: [element]
        };
        treeItem.iconPath = new vscode.ThemeIcon('git-commit');
        return treeItem;
    }

    getChildren(element) {
        if (this.loading) {
            return [{ label: 'Loading...', description: '' }];
        }
        
        if (!element) {
            return this.commits;
        }
        
        return [];
    }
}

function activate(context) {
    // Display activation message in the console
    console.log('TimeLad is now active!');
    vscode.window.showInformationMessage('TimeLad extension is now active!');

    // Create the tree data provider for Git History view
    const gitHistoryProvider = new GitHistoryTreeDataProvider();
    vscode.window.registerTreeDataProvider('timelad-git-history', gitHistoryProvider);
    
    // Register refresh command for the Git History view
    context.subscriptions.push(
        vscode.commands.registerCommand('timelad.refreshGitHistory', () => gitHistoryProvider.refresh())
    );
    
    // Register command to show commit details from the tree view
    context.subscriptions.push(
        vscode.commands.registerCommand('timelad.showCommitDetails', async (commit) => {
            if (commit) {
                const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
                if (!gitExtension) return;
                
                const api = gitExtension.getAPI(1);
                if (!api.repositories || api.repositories.length === 0) return;
                
                const repo = api.repositories[0];
                const repoPath = repo.rootUri.fsPath;
                await showCommitDetails(commit, repoPath);
            }
        })
    );

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = "$(clock) TimeLad";
    statusBarItem.tooltip = "Click to show Git history";
    statusBarItem.command = 'timelad.showGitHistory';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register the "Show Git Info" command
    let showGitInfoDisposable = vscode.commands.registerCommand('timelad.showGitInfo', async function () {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            
            if (!gitExtension) {
                vscode.window.showErrorMessage('Git extension not found');
                return;
            }
            
            const api = gitExtension.getAPI(1);
            
            if (!api.repositories || api.repositories.length === 0) {
                vscode.window.showInformationMessage('No Git repositories found in the current workspace');
                return;
            }
            
            const repo = api.repositories[0];
            const head = repo.state.HEAD;
            
            if (!head) {
                vscode.window.showInformationMessage('Not on any branch');
                return;
            }
            
            const { commit, name: branch } = head;
            
            // Get total number of commits to determine version number
            const { stdout: countOutput } = await execPromise(
                'git rev-list --count HEAD',
                { cwd: repo.rootUri.fsPath }
            );
            
            const versionNumber = parseInt(countOutput.trim());
            
            // Display branch and version info (user-friendly)
            vscode.window.showInformationMessage(
                `Current Branch: ${branch}\nCurrent Version: Version ${versionNumber}`
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });

    // Register the "Show Git History" command
    let showGitHistoryDisposable = vscode.commands.registerCommand('timelad.showGitHistory', async function () {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            
            if (!gitExtension) {
                vscode.window.showErrorMessage('Git extension not found');
                return;
            }
            
            const api = gitExtension.getAPI(1);
            
            if (!api.repositories || api.repositories.length === 0) {
                vscode.window.showInformationMessage('No Git repositories found in the current workspace');
                return;
            }
            
            const repo = api.repositories[0];
            const repoPath = repo.rootUri.fsPath;
            
            // Get total number of commits to determine the latest version number
            const { stdout: countOutput } = await execPromise(
                'git rev-list --count HEAD',
                { cwd: repoPath }
            );
            
            const totalCommits = parseInt(countOutput.trim());
            
            // Get detailed commit information for the recent commits
            const { stdout } = await execPromise(
                'git log -n 30 --pretty=format:"%h|%an|%ad|%s|%d" --date=format:"%Y-%m-%d %H:%M:%S"',
                { cwd: repoPath }
            );
            
            // Process the git log output and add version numbers
            // Starting with the latest commit as the highest version number
            const commits = stdout.split('\n').map((line, index) => {
                const [hash, author, date, subject, refs] = line.split('|');
                const versionNumber = totalCommits - index; // Calculate version number
                return { hash, author, date, subject, refs: refs || '', version: versionNumber };
            });
            
            // Create a WebView to display the commit history
            const panel = vscode.window.createWebviewPanel(
                'timelad.gitHistory',
                'TimeLad: Git History',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
            
            // Set the HTML content
            panel.webview.html = getCommitHistoryWebviewContent(commits);
            
            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(async message => {
                if (message.command === 'showCommit') {
                    const commit = commits.find(c => c.hash === message.hash);
                    if (commit) {
                        await showCommitDetails(commit, repoPath);
                    }
                }
            });
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });

    // Register the "List Commits" command
    let listCommitsDisposable = vscode.commands.registerCommand('timelad.listCommits', async function () {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            
            if (!gitExtension) {
                vscode.window.showErrorMessage('Git extension not found');
                return;
            }
            
            const api = gitExtension.getAPI(1);
            
            if (!api.repositories || api.repositories.length === 0) {
                vscode.window.showInformationMessage('No Git repositories found in the current workspace');
                return;
            }
            
            const repo = api.repositories[0];
            const repoPath = repo.rootUri.fsPath;
            
            // Get total number of commits to determine the latest version number
            const { stdout: countOutput } = await execPromise(
                'git rev-list --count HEAD',
                { cwd: repoPath }
            );
            
            const totalCommits = parseInt(countOutput.trim());
            
            // Get a list of recent commits
            const { stdout } = await execPromise(
                'git log -n 20 --pretty=format:"%h|%an|%ar|%s"', 
                { cwd: repoPath }
            );
            
            const commits = stdout.split('\n').map((line, index) => {
                const [hash, author, date, subject] = line.split('|');
                const versionNumber = totalCommits - index; // Calculate version number
                return { hash, author, date, subject, version: versionNumber };
            });
            
            // Create a QuickPick to show the commits
            const quickPick = vscode.window.createQuickPick();
            quickPick.title = 'Recent Commits';
            quickPick.placeholder = 'Select a commit to view details';
            quickPick.items = commits.map(commit => ({
                label: commit.subject,
                description: `Version ${commit.version} - ${commit.author}`,
                detail: `${commit.date}`,
                commit: commit
            }));
            
            quickPick.onDidAccept(() => {
                const selectedItem = quickPick.selectedItems[0];
                if (selectedItem) {
                    const commit = selectedItem.commit;
                    // Show details of the selected commit
                    showCommitDetails(commit, repoPath);
                }
                quickPick.hide();
            });
            
            quickPick.show();
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });
    
    context.subscriptions.push(showGitInfoDisposable);
    context.subscriptions.push(showGitHistoryDisposable);
    context.subscriptions.push(listCommitsDisposable);
}

/**
 * Generates the HTML content for the Git history WebView
 * @param {Array} commits Array of commit objects
 * @returns {string} HTML content
 */
function getCommitHistoryWebviewContent(commits) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TimeLad: Git History</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                padding: 0 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            h1 {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 10px;
                font-size: 1.5em;
            }
            .commit-list {
                list-style-type: none;
                padding: 0;
                margin: 0;
            }
            .commit-item {
                padding: 10px;
                margin-bottom: 8px;
                border-radius: 4px;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .commit-item:hover {
                background-color: var(--vscode-editor-selectionBackground);
            }
            .commit-version {
                font-family: var(--vscode-font-family);
                color: var(--vscode-terminal-ansiGreen);
                padding: 2px 6px;
                border-radius: 2px;
                margin-right: 8px;
                font-weight: bold;
            }
            .commit-author {
                color: var(--vscode-editor-foreground);
                font-weight: bold;
            }
            .commit-date {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
                margin-left: 8px;
            }
            .commit-subject {
                margin-top: 5px;
                color: var(--vscode-editor-foreground);
            }
            .commit-refs {
                display: inline-block;
                padding: 2px 6px;
                margin-left: 8px;
                background-color: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                border-radius: 10px;
                font-size: 0.8em;
            }
            .search-box {
                width: 100%;
                padding: 8px;
                margin: 10px 0;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <h1>Git Commit History</h1>
        
        <input type="text" class="search-box" placeholder="Filter commits..." id="commitFilter">
        
        <ul class="commit-list" id="commitList">
            ${commits.map(commit => `
                <li class="commit-item" data-hash="${commit.hash}">
                    <div>
                        <span class="commit-version">Version ${commit.version}</span>
                        <span class="commit-author">${commit.author}</span>
                        <span class="commit-date">${commit.date}</span>
                        ${commit.refs ? `<span class="commit-refs">${commit.refs}</span>` : ''}
                    </div>
                    <div class="commit-subject">${commit.subject}</div>
                </li>
            `).join('')}
        </ul>

        <script>
            // Handle click on commit item
            document.querySelectorAll('.commit-item').forEach(item => {
                item.addEventListener('click', () => {
                    const hash = item.getAttribute('data-hash');
                    // Send message to extension
                    vscode.postMessage({
                        command: 'showCommit',
                        hash: hash
                    });
                });
            });

            // Filter commits
            const filterInput = document.getElementById('commitFilter');
            const commitList = document.getElementById('commitList');
            const commitItems = document.querySelectorAll('.commit-item');

            filterInput.addEventListener('input', () => {
                const filterValue = filterInput.value.toLowerCase();
                
                commitItems.forEach(item => {
                    const commitText = item.textContent.toLowerCase();
                    if (commitText.includes(filterValue)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });

            // Communicate with the extension
            const vscode = acquireVsCodeApi();
        </script>
    </body>
    </html>
    `;
}

/**
 * Shows detailed information about a specific version/commit
 * @param {Object} commit The commit object with version information
 * @param {string} repoPath Path to the repository
 */
async function showCommitDetails(commit, repoPath) {
    try {
        // Get detailed commit info using git show
        const { stdout } = await execPromise(
            `git show ${commit.hash} --stat --pretty=fuller`,
            { cwd: repoPath }
        );
        
        // Create a temporary file to show the commit details
        const fileName = `${commit.hash}-details.git`;
        const filePath = vscode.Uri.file(`${repoPath}/.git/${fileName}`);
        const workspaceEdit = new vscode.WorkspaceEdit();
        
        workspaceEdit.createFile(filePath, { overwrite: true });
        await vscode.workspace.applyEdit(workspaceEdit);
        
        // Write content to the file with user-friendly version number
        await vscode.workspace.fs.writeFile(
            filePath,
            Buffer.from(
                `# Version ${commit.version}\n\n` +
                `Description: ${commit.subject}\n` +
                `Author: ${commit.author}\n` +
                `Date: ${commit.date}\n\n` +
                `Changes in this version:\n${stdout.split('diff --git')[0]}`,
                'utf8'
            )
        );
        
        // Open the file in editor
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
        
        // Set the document as readonly
        vscode.commands.executeCommand('workbench.action.editor.toggleReadOnly');
    } catch (error) {
        vscode.window.showErrorMessage(`Error showing commit details: ${error.message}`);
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
