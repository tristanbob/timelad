const vscode = require("vscode");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

/**
 * GitHistoryWebviewProvider manages the webview for the sidebar
 */
class GitHistoryWebviewProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
    this.commits = [];
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  async resolveWebviewView(webviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    // Load initial content
    await this.refresh();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "showCommit") {
        const commit = this.commits.find((c) => c.hash === message.hash);
        if (commit) {
          try {
            const repoPath = await getRepositoryPath();
            await showCommitDetails(commit, repoPath);
          } catch (error) {
            vscode.window.showErrorMessage(`TimeLad: ${error.message}`);
          }
        }
      } else if (message.command === "refresh") {
        await this.refresh();
      }
    });
  }

  async getCommits() {
    try {
      const extension = vscode.extensions.getExtension("vscode.git");
      const gitExtension = extension ? extension.exports : null;

      if (!gitExtension) {
        console.warn("TimeLad: Git extension not found");
        return [];
      }

      const api = gitExtension.getAPI(1);

      if (!api.repositories || api.repositories.length === 0) {
        console.warn("TimeLad: No Git repositories found");
        return [];
      }

      const repo = api.repositories[0];
      const repoPath = repo.rootUri.fsPath;

      // Check cache first
      const cacheKey = `commits-${repoPath}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Get total number of commits to determine the latest version number
      const { stdout: countOutput } = await execPromise(
        "git rev-list --count HEAD",
        { cwd: repoPath }
      );

      const totalCommits = parseInt(countOutput.trim());

      // Get detailed commit information for the recent commits
      const { stdout } = await execPromise(
        'git log -n 30 --pretty=format:"%h|%an|%ad|%s|%d" --date=format:"%Y-%m-%d %H:%M:%S"',
        { cwd: repoPath }
      );

      // Process the git log output and add version numbers
      const commits = stdout
        .split("\n")
        .map((line, index) => {
          if (!line.trim()) return null;
          const [hash, author, date, subject, refs] = line.split("|");
          const versionNumber = totalCommits - index;
          return {
            hash: hash || "",
            author: author || "Unknown",
            date: date || "",
            subject: subject || "No subject",
            refs: refs || "",
            version: versionNumber,
          };
        })
        .filter((commit) => commit !== null);

      // Cache the results
      this.cache.set(cacheKey, {
        data: commits,
        timestamp: Date.now(),
      });

      return commits;
    } catch (error) {
      console.error(`TimeLad: Error fetching commits: ${error.message}`);
      vscode.window.showErrorMessage(
        `TimeLad: Failed to fetch commits: ${error.message}`
      );
      return [];
    }
  }

  async refresh() {
    if (!this.view) {
      return;
    }

    // Clear cache on manual refresh
    this.cache.clear();

    // Show loading state
    this.view.webview.html = this.getLoadingContent();

    // Fetch commits
    this.commits = await this.getCommits();

    // Update webview with commit data
    this.view.webview.html = this.getWebviewContent(this.commits);
  }

  getLoadingContent() {
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
                  padding: 20px;
                  color: var(--vscode-foreground);
                  background-color: var(--vscode-editor-background);
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  flex-direction: column;
              }
              .loading {
                  text-align: center;
                  color: var(--vscode-descriptionForeground);
              }
              .spinner {
                  width: 40px;
                  height: 40px;
                  border: 4px solid var(--vscode-editor-inactiveSelectionBackground);
                  border-top: 4px solid var(--vscode-terminal-ansiBlue);
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                  margin: 0 auto 20px;
              }
              @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
              }
          </style>
      </head>
      <body>
          <div class="loading">
              <div class="spinner"></div>
              <p>Loading Git history...</p>
          </div>
      </body>
      </html>
    `;
  }

  getWebviewContent(commits) {
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
                  padding: 0 16px;
                  color: var(--vscode-foreground);
                  background-color: var(--vscode-editor-background);
                  margin: 0;
              }
              .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 16px 0;
                  border-bottom: 1px solid var(--vscode-panel-border);
                  margin-bottom: 16px;
              }
              h1 {
                  font-size: 1.3em;
                  margin: 0;
                  color: var(--vscode-terminal-ansiGreen);
              }
              .refresh-btn {
                  background: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  border-radius: 4px;
                  padding: 6px 12px;
                  cursor: pointer;
                  font-size: 12px;
                  display: flex;
                  align-items: center;
                  gap: 4px;
              }
              .refresh-btn:hover {
                  background: var(--vscode-button-hoverBackground);
              }
              .commit-list {
                  list-style-type: none;
                  padding: 0;
                  margin: 0;
              }
              .commit-item {
                  padding: 12px;
                  margin-bottom: 8px;
                  border-radius: 6px;
                  background-color: var(--vscode-editor-inactiveSelectionBackground);
                  cursor: pointer;
                  transition: all 0.2s ease;
                  border: 1px solid transparent;
              }
              .commit-item:hover {
                  background-color: var(--vscode-editor-selectionBackground);
                  border-color: var(--vscode-focusBorder);
                  transform: translateY(-1px);
              }
              .commit-version {
                  font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
                  color: var(--vscode-editor-background);
                  background-color: var(--vscode-terminal-ansiGreen);
                  padding: 2px 6px;
                  border-radius: 3px;
                  margin-right: 8px;
                  font-weight: bold;
                  font-size: 0.85em;
              }
              .commit-author {
                  color: var(--vscode-editor-foreground);
                  font-weight: 600;
                  font-size: 0.9em;
              }
              .commit-date {
                  color: var(--vscode-descriptionForeground);
                  font-size: 0.8em;
                  margin-left: 8px;
              }
              .commit-subject {
                  margin-top: 6px;
                  color: var(--vscode-editor-foreground);
                  line-height: 1.4;
                  font-size: 0.9em;
              }
              .commit-refs {
                  display: inline-block;
                  padding: 2px 6px;
                  margin-left: 8px;
                  background-color: var(--vscode-badge-background);
                  color: var(--vscode-badge-foreground);
                  border-radius: 10px;
                  font-size: 0.75em;
              }
              .search-box {
                  width: 100%;
                  padding: 8px;
                  margin: 0 0 16px 0;
                  background-color: var(--vscode-input-background);
                  color: var(--vscode-input-foreground);
                  border: 1px solid var(--vscode-input-border);
                  border-radius: 4px;
                  font-size: 13px;
                  font-family: inherit;
                  box-sizing: border-box;
              }
              .search-box:focus {
                  outline: none;
                  border-color: var(--vscode-focusBorder);
              }
              .no-commits {
                  text-align: center;
                  color: var(--vscode-descriptionForeground);
                  font-style: italic;
                  padding: 40px 20px;
              }
              .commit-count {
                  font-size: 0.9em;
                  color: var(--vscode-descriptionForeground);
                  margin: 0;
              }
          </style>
      </head>
      <body>
          <div class="header">
              <div>
                  <h1>📊 Git History</h1>
                  <p class="commit-count">${commits.length} recent commits</p>
              </div>
              <button class="refresh-btn" onclick="refreshHistory()">
                  🔄 Refresh
              </button>
          </div>
          
          <input type="text" class="search-box" placeholder="🔍 Filter commits by message, author, or version..." id="commitFilter">
          
          ${
            commits.length === 0
              ? '<div class="no-commits">No commits found in this repository.</div>'
              : `<ul class="commit-list" id="commitList">
              ${commits
                .map(
                  (commit) => `
                  <li class="commit-item" data-hash="${commit.hash}">
                      <div>
                          <span class="commit-version">v${commit.version}</span>
                          <span class="commit-author">${commit.author}</span>
                          <span class="commit-date">${commit.date}</span>
                          ${
                            commit.refs
                              ? `<span class="commit-refs">${commit.refs}</span>`
                              : ""
                          }
                      </div>
                      <div class="commit-subject">${commit.subject}</div>
                  </li>
              `
                )
                .join("")}
            </ul>`
          }

          <script>
              // Get VS Code API
              const vscode = acquireVsCodeApi();

              // Handle click on commit item
              document.querySelectorAll('.commit-item').forEach(item => {
                  item.addEventListener('click', () => {
                      const hash = item.getAttribute('data-hash');
                      vscode.postMessage({
                          command: 'showCommit',
                          hash: hash
                      });
                  });
              });

              // Filter commits
              const filterInput = document.getElementById('commitFilter');
              const commitList = document.getElementById('commitList');
              
              if (filterInput && commitList) {
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
              }

              // Refresh functionality
              function refreshHistory() {
                  vscode.postMessage({
                      command: 'refresh'
                  });
              }
          </script>
      </body>
      </html>
      `;
  }
}

/**
 * Helper function to get git extension safely
 */
function getGitExtension() {
  const extension = vscode.extensions.getExtension("vscode.git");
  return extension ? extension.exports : null;
}

/**
 * Helper function to get repository path safely
 */
async function getRepositoryPath() {
  const gitExtension = getGitExtension();

  if (!gitExtension) {
    throw new Error(
      "Git extension not found. Please ensure Git is installed and the Git extension is enabled."
    );
  }

  const api = gitExtension.getAPI(1);

  if (!api.repositories || api.repositories.length === 0) {
    throw new Error(
      "No Git repositories found in the current workspace. Please open a Git repository."
    );
  }

  return api.repositories[0].rootUri.fsPath;
}

function activate(context) {
  console.log("TimeLad is now active!");
  vscode.window.showInformationMessage("TimeLad extension is now active!");

  // Create the webview provider for Git History view
  const gitHistoryProvider = new GitHistoryWebviewProvider(context);
  vscode.window.registerWebviewViewProvider(
    "timelad-git-history",
    gitHistoryProvider
  );

  // Register refresh command for the Git History view
  context.subscriptions.push(
    vscode.commands.registerCommand("timelad.refreshGitHistory", () =>
      gitHistoryProvider.refresh()
    )
  );

  // Note: showCommitDetails is now handled directly in the webview provider

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(clock) TimeLad";
  statusBarItem.tooltip = "Click to show Git history";
  statusBarItem.command = "timelad.showGitHistory";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register the "Show Git Info" command
  const showGitInfoDisposable = vscode.commands.registerCommand(
    "timelad.showGitInfo",
    async function () {
      try {
        const repoPath = await getRepositoryPath();
        const gitExtension = getGitExtension();
        const api = gitExtension.getAPI(1);
        const repo = api.repositories[0];
        const head = repo.state.HEAD;

        if (!head) {
          vscode.window.showInformationMessage("Not on any branch");
          return;
        }

        const { name: branch } = head;

        // Get total number of commits to determine version number
        const { stdout: countOutput } = await execPromise(
          "git rev-list --count HEAD",
          { cwd: repoPath }
        );

        const versionNumber = parseInt(countOutput.trim());

        // Display branch and version info (user-friendly)
        vscode.window.showInformationMessage(
          `Current Branch: ${branch}\nCurrent Version: Version ${versionNumber}`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`TimeLad: ${error.message}`);
      }
    }
  );

  // Register the "Show Git History" command
  const showGitHistoryDisposable = vscode.commands.registerCommand(
    "timelad.showGitHistory",
    async function () {
      try {
        const repoPath = await getRepositoryPath();

        // Get total number of commits to determine the latest version number
        const { stdout: countOutput } = await execPromise(
          "git rev-list --count HEAD",
          { cwd: repoPath }
        );

        const totalCommits = parseInt(countOutput.trim());

        // Get detailed commit information for the recent commits
        const { stdout } = await execPromise(
          'git log -n 30 --pretty=format:"%h|%an|%ad|%s|%d" --date=format:"%Y-%m-%d %H:%M:%S"',
          { cwd: repoPath }
        );

        // Process the git log output and add version numbers
        const commits = stdout
          .split("\n")
          .map((line, index) => {
            if (!line.trim()) return null;
            const [hash, author, date, subject, refs] = line.split("|");
            const versionNumber = totalCommits - index;
            return {
              hash: hash || "",
              author: author || "Unknown",
              date: date || "",
              subject: subject || "No subject",
              refs: refs || "",
              version: versionNumber,
            };
          })
          .filter((commit) => commit !== null);

        // Create a WebView to display the commit history
        const panel = vscode.window.createWebviewPanel(
          "timelad.gitHistory",
          "TimeLad: Git History",
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
          }
        );

        // Set the HTML content
        panel.webview.html = getCommitHistoryWebviewContent(commits);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async (message) => {
          if (message.command === "showCommit") {
            const commit = commits.find((c) => c.hash === message.hash);
            if (commit) {
              await showCommitDetails(commit, repoPath);
            }
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`TimeLad: ${error.message}`);
      }
    }
  );

  // Register the "List Commits" command
  const listCommitsDisposable = vscode.commands.registerCommand(
    "timelad.listCommits",
    async function () {
      try {
        const repoPath = await getRepositoryPath();

        // Get total number of commits to determine the latest version number
        const { stdout: countOutput } = await execPromise(
          "git rev-list --count HEAD",
          { cwd: repoPath }
        );

        const totalCommits = parseInt(countOutput.trim());

        // Get a list of recent commits
        const { stdout } = await execPromise(
          'git log -n 20 --pretty=format:"%h|%an|%ar|%s"',
          { cwd: repoPath }
        );

        const commits = stdout
          .split("\n")
          .map((line, index) => {
            if (!line.trim()) return null;
            const [hash, author, date, subject] = line.split("|");
            const versionNumber = totalCommits - index;
            return {
              hash: hash || "",
              author: author || "Unknown",
              date: date || "",
              subject: subject || "No subject",
              version: versionNumber,
            };
          })
          .filter((commit) => commit !== null);

        // Create a QuickPick to show the commits
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = "Recent Commits";
        quickPick.placeholder = "Select a commit to view details";
        quickPick.items = commits.map((commit) => ({
          label: commit.subject,
          description: `Version ${commit.version} - ${commit.author}`,
          detail: `${commit.date}`,
          commit: commit,
        }));

        quickPick.onDidAccept(() => {
          const selectedItem = quickPick.selectedItems[0];
          if (selectedItem && selectedItem.commit) {
            const commit = selectedItem.commit;
            showCommitDetails(commit, repoPath);
          }
          quickPick.hide();
        });

        quickPick.show();
      } catch (error) {
        vscode.window.showErrorMessage(`TimeLad: ${error.message}`);
      }
    }
  );

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
                margin: 0;
            }
            h1 {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 10px;
                font-size: 1.5em;
                margin-top: 20px;
            }
            .commit-list {
                list-style-type: none;
                padding: 0;
                margin: 0;
            }
            .commit-item {
                padding: 12px;
                margin-bottom: 8px;
                border-radius: 6px;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                cursor: pointer;
                transition: background-color 0.2s ease;
                border: 1px solid transparent;
            }
            .commit-item:hover {
                background-color: var(--vscode-editor-selectionBackground);
                border-color: var(--vscode-focusBorder);
            }
            .commit-version {
                font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
                color: var(--vscode-terminal-ansiGreen);
                padding: 3px 8px;
                border-radius: 3px;
                margin-right: 8px;
                font-weight: bold;
                font-size: 0.9em;
                background-color: var(--vscode-terminal-ansiGreen);
                color: var(--vscode-editor-background);
            }
            .commit-author {
                color: var(--vscode-editor-foreground);
                font-weight: 600;
            }
            .commit-date {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
                margin-left: 8px;
            }
            .commit-subject {
                margin-top: 6px;
                color: var(--vscode-editor-foreground);
                line-height: 1.4;
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
                padding: 10px;
                margin: 15px 0;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                font-size: 14px;
                font-family: inherit;
            }
            .search-box:focus {
                outline: none;
                border-color: var(--vscode-focusBorder);
            }
            .no-commits {
                text-align: center;
                color: var(--vscode-descriptionForeground);
                font-style: italic;
                padding: 40px 20px;
            }
        </style>
    </head>
    <body>
        <h1>📊 Git Commit History</h1>
        
        <input type="text" class="search-box" placeholder="🔍 Filter commits by message, author, or version..." id="commitFilter">
        
        ${
          commits.length === 0
            ? '<div class="no-commits">No commits found in this repository.</div>'
            : `<ul class="commit-list" id="commitList">
            ${commits
              .map(
                (commit) => `
                <li class="commit-item" data-hash="${commit.hash}">
                    <div>
                        <span class="commit-version">v${commit.version}</span>
                        <span class="commit-author">${commit.author}</span>
                        <span class="commit-date">${commit.date}</span>
                        ${
                          commit.refs
                            ? `<span class="commit-refs">${commit.refs}</span>`
                            : ""
                        }
                    </div>
                    <div class="commit-subject">${commit.subject}</div>
                </li>
            `
              )
              .join("")}
          </ul>`
        }

        <script>
            // Get VS Code API
            const vscode = acquireVsCodeApi();

            // Handle click on commit item
            document.querySelectorAll('.commit-item').forEach(item => {
                item.addEventListener('click', () => {
                    const hash = item.getAttribute('data-hash');
                    vscode.postMessage({
                        command: 'showCommit',
                        hash: hash
                    });
                });
            });

            // Filter commits
            const filterInput = document.getElementById('commitFilter');
            const commitList = document.getElementById('commitList');
            
            if (filterInput && commitList) {
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
            }
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

    // Create a webview to display the commit details
    const panel = vscode.window.createWebviewPanel(
      "timelad.commitDetails",
      `TimeLad: Version ${commit.version}`,
      vscode.ViewColumn.One,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
      }
    );

    // Set HTML content with proper formatting
    panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Version ${commit.version}</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                    margin: 0;
                }
                h1 { 
                    color: var(--vscode-terminal-ansiGreen); 
                    border-bottom: 2px solid var(--vscode-terminal-ansiGreen);
                    padding-bottom: 10px;
                }
                h2 {
                    color: var(--vscode-terminal-ansiBlue);
                    margin-top: 30px;
                }
                pre {
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    padding: 15px;
                    border-radius: 6px;
                    overflow-x: auto;
                    white-space: pre-wrap;
                    border: 1px solid var(--vscode-panel-border);
                    font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
                    font-size: 0.9em;
                }
                .detail-item {
                    margin: 12px 0;
                    padding: 8px;
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    border-radius: 4px;
                    border-left: 3px solid var(--vscode-terminal-ansiBlue);
                }
                .label {
                    font-weight: bold;
                    color: var(--vscode-terminal-ansiBlue);
                    display: inline-block;
                    min-width: 80px;
                }
                .hash {
                    font-family: var(--vscode-editor-font-family, monospace);
                    background-color: var(--vscode-terminal-ansiBlack);
                    color: var(--vscode-terminal-ansiWhite);
                    padding: 2px 6px;
                    border-radius: 3px;
                }
                .version-badge {
                    background-color: var(--vscode-terminal-ansiGreen);
                    color: var(--vscode-editor-background);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: bold;
                    display: inline-block;
                }
            </style>
        </head>
        <body>
            <h1><span class="version-badge">Version ${
              commit.version
            }</span></h1>
            
            <div class="detail-item">
                <span class="label">Description:</span> ${commit.subject}
            </div>
            <div class="detail-item">
                <span class="label">Author:</span> ${commit.author}
            </div>
            <div class="detail-item">
                <span class="label">Date:</span> ${commit.date}
            </div>
            <div class="detail-item">
                <span class="label">Hash:</span> <span class="hash">${
                  commit.hash
                }</span>
            </div>
            
            <h2>📋 Changes in this version:</h2>
            <pre>${
              stdout.split("diff --git")[0] || "No detailed changes available."
            }</pre>
        </body>
        </html>
        `;
  } catch (error) {
    vscode.window.showErrorMessage(
      `TimeLad: Error showing commit details: ${error.message}`
    );
  }
}

function deactivate() {
  console.log("TimeLad extension deactivated");
}

module.exports = {
  activate,
  deactivate,
};
