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
  
  .commit-refs {
    display: inline-block;
    padding: 2px 6px;
    margin-left: 8px;
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 10px;
    font-size: 0.75em;
  }
  
  .commit-actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }
  
  .restore-btn {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
  }
  
  .restore-btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
    transform: translateY(-1px);
  }
  
  .view-btn {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
  }
  
  .view-btn:hover {
    background: var(--vscode-button-hoverBackground);
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
        <title>TimeLad: Git History</title>
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
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading Git history...</p>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate commit list item HTML
 * @param {Object} commit Commit object
 * @param {number} index Index of commit in the list
 * @returns {string} HTML for commit list item
 */
function generateCommitListItem(commit, index) {
  return `
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
 * @returns {string} HTML content for sidebar
 */
function getSidebarTemplate(commits) {
  const commitListHTML =
    commits.length === 0
      ? '<div class="no-commits">No commits found in this repository.</div>'
      : `<ul class="commit-list" id="commitList">
        ${commits
          .map((commit, index) => generateCommitListItem(commit, index))
          .join("")}
       </ul>`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TimeLad: Git History</title>
        <style>
            ${baseStyles}
            ${commitListStyles}
            body {
                padding: 0 16px;
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
 * @returns {string} HTML content for commit details
 */
function getCommitDetailsTemplate(commit, commitDetails) {
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
        <h1><span class="version-badge">Version ${commit.version}</span></h1>
        
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
 * @returns {string} HTML content for full page history
 */
function getCommitHistoryTemplate(commits) {
  const commitListHTML =
    commits.length === 0
      ? '<div class="no-commits">No commits found in this repository.</div>'
      : `<ul class="commit-list" id="commitList">
        ${commits
          .map((commit, index) => generateCommitListItem(commit, index))
          .join("")}
       </ul>`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TimeLad: Git History</title>
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
        <h1>📊 Git Commit History</h1>
        
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
