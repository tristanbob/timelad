/**
 * HTML templates for webviews
 */

/**
 * Base CSS styles used across all webviews
 */
const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: var(--vscode-foreground);
    background-color: var(--vscode-editor-background);
    margin: 0;
    line-height: 1.6;
  }
  
  .alpha-warning {
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
    padding: 12px 16px;
    margin: -16px -16px 16px -16px;
    border-bottom: 3px solid #c0392b;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    font-weight: 600;
    font-size: 0.9em;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 1000;
  }
  
  .alpha-warning-icon {
    font-size: 1.2em;
    margin-right: 6px;
  }
  
  .alpha-warning-text {
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
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
  
  .expert-badge {
    background-color: var(--vscode-terminal-ansiYellow);
    color: var(--vscode-editor-background);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.7em;
    font-weight: bold;
    margin-left: 8px;
  }
  
  .expert-info {
    font-size: 0.8em;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    margin: 4px 0 0 0;
    padding: 8px;
    background-color: var(--vscode-editor-inactiveSelectionBackground);
    border-radius: 4px;
    border-left: 3px solid var(--vscode-terminal-ansiYellow);
  }
  
  .uncommitted-section .expert-info {
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border-left: 3px solid var(--vscode-terminal-ansiRed);
  }
  
  .header-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  .toggle-expert-btn {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border);
    border-radius: 4px;
    padding: 6px 8px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
  }
  
  .toggle-expert-btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }
  
  .toggle-expert-btn.expert-active {
    background: var(--vscode-terminal-ansiYellow);
    color: var(--vscode-editor-background);
    border-color: var(--vscode-terminal-ansiYellow);
  }
  
  .toggle-expert-btn.expert-active:hover {
    background: var(--vscode-terminal-ansiYellow);
    opacity: 0.9;
  }
  
  .uncommitted-section {
    margin-bottom: 20px;
    padding: 16px;
    border-radius: 8px;
    background-color: var(--vscode-terminal-ansiYellow);
    color: var(--vscode-editor-background);
    border-left: 4px solid var(--vscode-terminal-ansiRed);
  }
  
  .uncommitted-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .uncommitted-title {
    font-size: 1.1em;
    font-weight: 600;
    color: var(--vscode-editor-background);
    margin: 0;
  }
  
  .save-btn {
    background: var(--vscode-terminal-ansiGreen);
    color: var(--vscode-editor-background);
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }
  
  .save-btn:hover {
    background: var(--vscode-terminal-ansiGreen);
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  .changes-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .change-item {
    display: flex;
    align-items: center;
    padding: 4px 0;
    font-size: 0.9em;
    color: var(--vscode-editor-background);
  }
  
  .change-status {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
    margin-right: 8px;
    font-size: 10px;
    text-align: center;
    line-height: 12px;
    font-weight: bold;
  }
  
  .change-status.modified {
    background-color: var(--vscode-terminal-ansiYellow);
    color: var(--vscode-editor-background);
  }
  
  .change-status.added {
    background-color: var(--vscode-terminal-ansiGreen);
    color: var(--vscode-editor-background);
  }
  
  .change-status.deleted {
    background-color: var(--vscode-terminal-ansiRed);
    color: var(--vscode-editor-background);
  }
  
  .change-status.untracked {
    background-color: var(--vscode-terminal-ansiBlue);
    color: var(--vscode-editor-background);
  }
  
  .changes-summary {
    font-size: 0.8em;
    color: var(--vscode-editor-background);
    margin-top: 8px;
    font-style: italic;
    opacity: 0.9;
  }
  
  .no-changes {
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    padding: 20px;
  }
`;

/**
 * Commit list specific styles
 */
const commitListStyles = `
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
  

  
  .commit-actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }
  
  .restore-btn {
    background: var(--vscode-terminal-ansiGreen);
    color: var(--vscode-editor-background);
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
  }
  
  .restore-btn:hover {
    background: var(--vscode-terminal-ansiGreen);
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  .view-btn {
    background: transparent;
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-descriptionForeground);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
    opacity: 0.7;
  }
  
  .view-btn:hover {
    background: var(--vscode-list-hoverBackground);
    opacity: 1;
    transform: translateY(-1px);
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
  
  .expert-details {
    margin-top: 8px;
    padding: 8px;
    background-color: var(--vscode-editor-background);
    border-radius: 4px;
    border-left: 3px solid var(--vscode-terminal-ansiYellow);
    font-size: 0.8em;
  }
  
  .expert-details .label {
    font-weight: bold;
    color: var(--vscode-terminal-ansiYellow);
    display: inline-block;
    min-width: 80px;
  }
  
  .expert-details code {
    background-color: var(--vscode-textCodeBlock-background);
    color: var(--vscode-editor-foreground);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
    font-size: 0.9em;
    word-break: break-all;
  }
  
  .expert-details .git-hash {
    margin-bottom: 4px;
  }
  
  .expert-details .git-command,
  .expert-details .version-calc,
  .expert-details .cache-info {
    margin-top: 4px;
  }
`;

/**
 * Commit details specific styles
 */
const commitDetailsStyles = `
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
  
  h2 {
    color: var(--vscode-terminal-ansiBlue);
    margin-top: 30px;
  }
`;

/**
 * Common JavaScript functions for webviews
 */
const commonJavaScript = `
  const vscode = acquireVsCodeApi();
  
  function refreshHistory() {
    vscode.postMessage({ command: 'refresh' });
  }
  
  function viewCommit(hash) {
    vscode.postMessage({ command: 'showCommit', hash: hash });
  }
  
  function restoreCommit(hash) {
    vscode.postMessage({ command: 'restoreVersion', hash: hash });
  }
  
  function toggleExpertMode() {
    vscode.postMessage({ command: 'toggleExpertMode' });
  }
  
  function saveChanges() {
    vscode.postMessage({ command: 'saveChanges' });
  }
`;

/**
 * JavaScript for commit filtering
 */
const filterJavaScript = `
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
`;

/**
 * Generate loading content template
 * @returns {string} HTML content for loading state
 */
function getLoadingTemplate() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TimeLad</title>
        <style>
            ${baseStyles}
            body {
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                flex-direction: column;
            }
        </style>
    </head>
    <body>
        <div class="alpha-warning">
            <span class="alpha-warning-icon">⚠️</span>
            <span class="alpha-warning-text">ALPHA VERSION - Testing Only - Use with Disposable Data</span>
        </div>
        
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading history...</p>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate uncommitted changes section HTML
 * @param {Object} uncommittedChanges Uncommitted changes information
 * @param {boolean} expertMode Whether expert mode is enabled
 * @returns {string} HTML for uncommitted changes section
 */
function generateUncommittedChangesSection(
  uncommittedChanges,
  expertMode = false
) {
  if (!uncommittedChanges || !uncommittedChanges.hasChanges) {
    return "";
  }

  const changesListHTML = uncommittedChanges.files
    .map((file) => {
      const statusClass = file.type.includes("modified")
        ? "modified"
        : file.type.includes("added")
        ? "added"
        : file.type.includes("deleted")
        ? "deleted"
        : file.type.includes("untracked")
        ? "untracked"
        : "modified";

      const statusSymbol =
        statusClass === "modified"
          ? "M"
          : statusClass === "added"
          ? "A"
          : statusClass === "deleted"
          ? "D"
          : statusClass === "untracked"
          ? "?"
          : "M";

      return `
      <li class="change-item">
        <span class="change-status ${statusClass}">${statusSymbol}</span>
        <span class="change-filename">${file.fileName}</span>
      </li>
    `;
    })
    .join("");

  return `
    <div class="uncommitted-section">
      <div class="uncommitted-header">
        <h3 class="uncommitted-title">💾 Unsaved Changes</h3>
        <button class="save-btn" onclick="saveChanges()" title="Save changes with AI-generated commit message">
          💾 Save
        </button>
      </div>
      <ul class="changes-list">
        ${changesListHTML}
      </ul>
      ${
        uncommittedChanges.summary
          ? `<div class="changes-summary">${uncommittedChanges.summary}</div>`
          : ""
      }
      ${
        expertMode
          ? `
        <div class="expert-info" style="margin-top: 12px;">
          <strong>Expert Info:</strong> Changes detected via <code>git status --porcelain</code>. 
          Save will execute <code>git add .</code> followed by <code>git commit</code> with AI-generated message.
        </div>
      `
          : ""
      }
    </div>
  `;
}

/**
 * Generate commit list item HTML
 * @param {Object} commit Commit object
 * @param {number} index Index of commit in the list
 * @param {boolean} expertMode Whether expert mode is enabled
 * @returns {string} HTML for commit list item
 */
function generateCommitListItem(commit, index, expertMode = false) {
  const expertDetails = expertMode
    ? `
    <div class="expert-details">
      <div class="git-hash">
        <span class="label">Git Hash:</span> 
        <code class="hash">${commit.hash}</code>
      </div>
      <div class="git-command">
        <span class="label">Fetch Command:</span> 
        <code>git log -n 30 --pretty=format:"%h|%an|%ad|%s" --date=format:"%Y-%m-%d %H:%M:%S"</code>
      </div>
      <div class="version-calc">
        <span class="label">Version Logic:</span> 
        <code>Total commits (${commit.version + index}) - Index (${index}) = v${
        commit.version
      }</code>
      </div>
      <div class="cache-info">
        <span class="label">Caching:</span> 
        <code>5min cache via Map() in GitService</code>
      </div>
    </div>
  `
    : "";

  return `
    <li class="commit-item" data-hash="${commit.hash}">
        <div>
            <span class="commit-version">v${commit.version}</span>
            <span class="commit-author">${commit.author}</span>
            <span class="commit-date">${commit.date}</span>
        </div>
        <div class="commit-subject">${commit.subject}</div>
        ${expertDetails}
        <div class="commit-actions">
            <button class="view-btn" onclick="viewCommit('${commit.hash}')">
                👁️ View Details
            </button>
            ${
              index > 0
                ? `
                <button class="restore-btn" onclick="restoreCommit('${commit.hash}')">
                    ⏮️ Restore Version
                </button>
            `
                : ""
            }
        </div>
    </li>
  `;
}

/**
 * Generate sidebar webview content
 * @param {Array} commits Array of commit objects
 * @param {boolean} expertMode Whether expert mode is enabled
 * @param {Object} uncommittedChanges Uncommitted changes information
 * @returns {string} HTML content for sidebar
 */
function getSidebarTemplate(
  commits,
  expertMode = false,
  uncommittedChanges = null
) {
  const commitListHTML =
    commits.length === 0
      ? '<div class="no-commits">No commits found in this repository.</div>'
      : `<ul class="commit-list" id="commitList">
        ${commits
          .map((commit, index) =>
            generateCommitListItem(commit, index, expertMode)
          )
          .join("")}
       </ul>`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TimeLad</title>
        <style>
            ${baseStyles}
            ${commitListStyles}
            body {
                padding: 0 16px;
            }
        </style>
    </head>
    <body>
        <div class="alpha-warning">
            <span class="alpha-warning-icon">⚠️</span>
            <span class="alpha-warning-text">ALPHA VERSION - Testing Only - Use with Disposable Data</span>
        </div>
        
        <div class="header">
            <div>
                <h1>📊 TimeLad ${
                  expertMode
                    ? '<span class="expert-badge">Expert Mode</span>'
                    : ""
                }</h1>
                <p class="commit-count">${commits.length} recent commits</p>
                ${
                  expertMode
                    ? `
                    <p class="expert-info">
                        Extension is using VS Code Git API to fetch repository data and executing git commands via child_process.
                    </p>
                `
                    : ""
                }
            </div>
            <div class="header-buttons">
                <button class="toggle-expert-btn ${
                  expertMode ? "expert-active" : ""
                }" onclick="toggleExpertMode()" title="Toggle Expert Mode">
                    ${expertMode ? "🔧" : "⚙️"}
                </button>
                <button class="refresh-btn" onclick="refreshHistory()">
                    🔄 Refresh
                </button>
            </div>
        </div>
        
        <input type="text" class="search-box" placeholder="🔍 Filter commits by message, author, or version..." id="commitFilter">
        
        ${generateUncommittedChangesSection(uncommittedChanges, expertMode)}
        
        ${commitListHTML}

        <script>
            ${commonJavaScript}
            ${filterJavaScript}
        </script>
    </body>
    </html>
  `;
}

/**
 * Generate commit details webview content
 * @param {Object} commit Commit object
 * @param {string} commitDetails Detailed commit information from git show
 * @param {boolean} expertMode Whether expert mode is enabled
 * @returns {string} HTML content for commit details
 */
function getCommitDetailsTemplate(commit, commitDetails, expertMode = false) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Version ${commit.version}</title>
        <style>
            ${baseStyles}
            ${commitDetailsStyles}
            body {
                padding: 20px;
            }
        </style>
    </head>
    <body>
        <div class="alpha-warning">
            <span class="alpha-warning-icon">⚠️</span>
            <span class="alpha-warning-text">ALPHA VERSION - Testing Only - Use with Disposable Data</span>
        </div>
        
        <h1><span class="version-badge">Version ${commit.version}</span> ${
    expertMode
      ? '<span class="expert-badge" style="margin-left: 10px;">Expert Mode</span>'
      : ""
  }</h1>
        
        ${
          expertMode
            ? `
            <div class="expert-details" style="margin: 16px 0; background-color: var(--vscode-editor-inactiveSelectionBackground);">
                <h3 style="color: var(--vscode-terminal-ansiYellow); margin-top: 0;">🔧 Extension Internals</h3>
                <p><strong>Data Source:</strong> VS Code Git Extension API + child_process git commands</p>
                <p><strong>Command executed:</strong> <code>git show ${commit.hash}</code></p>
                <p><strong>Caching:</strong> Results cached for 5 minutes to improve performance</p>
                <p><strong>Version calculation:</strong> Total commits - current index = v${commit.version}</p>
            </div>
        `
            : ""
        }
        
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
          commitDetails.split("diff --git")[0] ||
          "No detailed changes available."
        }</pre>
    </body>
    </html>
  `;
}

/**
 * Generate full page commit history webview content
 * @param {Array} commits Array of commit objects
 * @param {boolean} expertMode Whether expert mode is enabled
 * @returns {string} HTML content for full page history
 */
function getCommitHistoryTemplate(commits, expertMode = false) {
  const commitListHTML =
    commits.length === 0
      ? '<div class="no-commits">No commits found in this repository.</div>'
      : `<ul class="commit-list" id="commitList">
        ${commits
          .map((commit, index) =>
            generateCommitListItem(commit, index, expertMode)
          )
          .join("")}
       </ul>`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TimeLad</title>
        <style>
            ${baseStyles}
            ${commitListStyles}
            body {
                padding: 0 20px;
            }
            
            h1 {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 10px;
                font-size: 1.5em;
                margin-top: 20px;
            }
            
            .search-box {
                padding: 10px;
                margin: 15px 0;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="alpha-warning">
            <span class="alpha-warning-icon">⚠️</span>
            <span class="alpha-warning-text">ALPHA VERSION - Testing Only - Use with Disposable Data</span>
        </div>
        
        <h1>📊 TimeLad History ${
          expertMode ? '<span class="expert-badge">Expert Mode</span>' : ""
        }</h1>
        
        <input type="text" class="search-box" placeholder="🔍 Filter commits by message, author, or version..." id="commitFilter">
        
        ${commitListHTML}

        <script>
            ${commonJavaScript}
            ${filterJavaScript}
        </script>
    </body>
    </html>
  `;
}

module.exports = {
  getLoadingTemplate,
  getSidebarTemplate,
  getCommitDetailsTemplate,
  getCommitHistoryTemplate,
};
