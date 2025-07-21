# TimeLad

A powerful VS Code extension that makes Git version control more accessible and intuitive, with a focus on safety and ease of use.

## Features

TimeLad provides an enhanced Git experience with these key features:

### Core Features

- **Interactive Git History**: Beautiful timeline view of your commit history with visual diffs
- **Safe Version Restoration**: Travel back to any previous version without losing history
- **Uncommitted Changes Detection**: See all your uncommitted changes at a glance
- **Auto-Generated Commit Messages**: Intelligent commit message suggestions using conventional commit patterns

### Easy Git Management

- **One-Click Saves**: Save your changes with a single click and smart commit messages
- **Beginner-Friendly Setup**: Guided Git repository initialization with helpful explanations
- **Visual File Status**: Color-coded indicators for modified, added, and deleted files
- **Version Numbering**: Clear version labels with easy access to Git hashes

### Safety First

- **No Data Loss**: Always creates new commits instead of rewriting history
- **Change Awareness**: Clearly shows what will be committed before saving
- **Automatic Backups**: Optional automatic stashing of uncommitted changes

## Usage

1. Open any folder in VS Code
   - Use the TimeLad sidebar to view Git history with restore functionality
   - If no Git repository exists, TimeLad will offer to set up version tracking for you

### Restore Version Feature

- **Safe Time Travel**: Click "⏮️ Restore Version" on any commit to safely restore your project to that state
- **No Data Loss**: Creates a new commit with the restored state, preserving all history
- **Version Tracking**: Each restore creates a new version number, making it easy to track changes

### Set Up Version Tracking Feature

- **Beginner-Friendly**: Uses simple, non-technical language to explain what version tracking means
- **Smart Detection**: Automatically detects when no repository exists and offers to create one
- **First Commit**: Automatically creates an initial commit to get you started

## Requirements

- VS Code 1.60.0 or higher
- Git must be installed

## Extension Settings

This extension contributes the following settings:

- `timelad.githubToken`: GitHub Personal Access Token for repository operations (default: empty string)

## Technical Details

### How TimeLad Uses Git

TimeLad is built on top of Git and follows Git best practices to ensure data safety and compatibility with existing Git workflows:

#### Core Git Operations

**Repository Detection**:
- Uses multi-layered approach: filesystem scanning, VS Code Git API, and direct Git commands
- Automatically detects `.git` directories and Git repositories
- Integrates with VS Code's built-in Git extension when available

**Commit History Retrieval**:
```bash
git log --oneline --format="%H|%an|%ad|%s" --date=short
```
- Fetches commit history with custom formatting for optimal parsing
- Implements progressive loading for large repositories
- Caches results for improved performance

**Safe Version Restoration**:
```bash
# TimeLad uses advanced Git plumbing commands for safe restoration:
git read-tree <commit-hash>           # Load commit tree into index
git write-tree                        # Create new tree object
git commit-tree <tree> -p <parent>    # Create new commit object
git update-ref refs/heads/<branch>    # Update branch pointer
git reset --hard                      # Update working directory

# This creates a new commit with restored content while preserving history
# The process:
# 1. Warns about uncommitted changes and offers to discard them
# 2. Uses git plumbing commands to create a new commit with old content
# 3. Updates the branch to point to the new commit
# 4. Updates working directory to match the new commit
```

**Uncommitted Changes Detection**:
```bash
git status --porcelain
git diff --name-status
```
- Monitors working directory for changes
- Provides file-level status information
- Offers safe stashing before operations

#### Safety-First Architecture

**No History Rewriting**:
- Never uses `git rebase` or other history-altering commands
- Uses `git reset --hard` only after creating new commits (safe operation)
- All operations create new commits, preserving complete audit trail

**Automatic Backup Handling**:
```bash
# Before destructive operations:
git stash push -m "TimeLad auto-backup: <timestamp>"
# After restoration:
git stash pop  # (if user chooses to restore changes)
```

**Repository Initialization**:
```bash
git init
git config user.name "<detected-or-default-name>"
git config user.email "<detected-or-default-email>"
git add .
git commit -m "Initial commit: Set up version tracking"
```

#### Advanced Features

**Smart Commit Message Generation**:
- Analyzes file changes using `git diff --name-status`
- Applies rule-based logic for conventional commit patterns
- Supports custom commit message templates

**Integration with VS Code Git**:
- Leverages VS Code's Git extension API when available
- Falls back to direct Git command execution
- Maintains compatibility with other Git tools and workflows

**Progressive Loading**:
- Implements pagination for large commit histories
- Uses efficient Git commands with `--skip` and `--max-count`
- Provides smooth UX even with repositories containing thousands of commits

#### Git Command Reference

TimeLad uses these Git commands safely:
- `git status` - Check repository state
- `git log` - Retrieve commit history  
- `git show` - Display commit details
- `git diff` - Compare changes
- `git read-tree` - Load commit trees into index
- `git write-tree` - Create tree objects
- `git commit-tree` - Create commit objects
- `git update-ref` - Update branch references
- `git reset --hard` - Update working directory (after creating commits)
- `git add` - Stage changes
- `git commit` - Create new commits
- `git stash` - Backup uncommitted work
- `git init` - Initialize repositories
- `git clean` - Remove untracked files

**Commands TimeLad NEVER uses**:
- `git rebase` - Would rewrite history
- `git push --force` - Would overwrite remote history
- `git filter-branch` - Would rewrite history
- Any other history-destructive operations

This approach ensures TimeLad can be safely used alongside any existing Git workflow without risk of data loss or history corruption.

## Known Issues

Please report issues on the GitHub repository.

## Release Notes

### 0.2.0

**Latest Beta Release** - TimeLad continues to improve with regular updates!

### What's New

- **Enhanced Performance**: Progressive loading for large repositories with pagination
- **Better Architecture**: Improved service architecture with dependency injection
- **State Management**: Enhanced webview state management and refresh handling
- **Package Optimization**: Reduced extension size by excluding test artifacts
- **Stability**: Comprehensive testing and improved error handling

### Recent Features

- **Uncommitted Changes Detection**: View all uncommitted changes in the sidebar
- **Auto-Generated Commit Messages**: Smart commit message suggestions using file analysis
- **One-Click Saves**: Save changes with intelligent commit messages
- **Safe Version Restoration**: Travel back to any version without losing history
- **Visual File Status**: Color-coded indicators for file changes

For the complete list of changes, see the [CHANGELOG](CHANGELOG.md).
