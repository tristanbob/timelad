# TimeLad

A powerful VS Code extension that makes Git version control more accessible and intuitive, with a focus on safety and ease of use.

## Features

TimeLad provides an enhanced Git experience with these key features:

### Core Features

- **Interactive Git History**: Beautiful timeline view of your commit history with visual diffs
- **Safe Version Restoration**: Travel back to any previous version without losing history
- **Uncommitted Changes Detection**: See all your uncommitted changes at a glance
- **AI-Generated Commit Messages**: Intelligent commit message suggestions powered by AI

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
2. Access TimeLad commands:
   - Through the Command Palette (Ctrl+Shift+P)
   - Search for "TimeLad: Show Git Info" or "TimeLad: Show Git History"
   - Use the TimeLad sidebar to view Git history with restore functionality
   - If no Git repository exists, TimeLad will offer to set up version tracking for you

### Restore Version Feature

- **Safe Time Travel**: Click "⏮️ Restore Version" on any commit to safely restore your project to that state
- **No Data Loss**: Creates a new commit with the restored state, preserving all history
- **Automatic Stashing**: Automatically handles uncommitted changes by offering to stash them
- **Version Tracking**: Each restore creates a new version number, making it easy to track changes

### Set Up Version Tracking Feature

- **Beginner-Friendly**: Uses simple, non-technical language to explain what version tracking means
- **Automatic Setup**: Creates a Git repository with sensible defaults
- **First Commit**: Automatically creates an initial commit to get you started
- **Helpful Analogies**: Explains version tracking as an "automatic Save Game feature for your code"
- **Smart Detection**: Automatically detects when no repository exists and offers to create one

## Requirements

- VS Code 1.60.0 or higher
- Git must be installed

## Extension Settings

This extension contributes the following settings:

- `timelad.githubToken`: GitHub Personal Access Token for repository operations (default: empty string)

### Version Information

- **Hover for Details**: Hover over any version number (like "v1", "v2") to see the full Git hash
- **One-Click Copy**: Click on any version number to copy the Git hash to your clipboard
- **Commit Insights**: View detailed information about each commit, including author, date, and changes

### AI-Powered Commits

TimeLad can generate meaningful commit messages for you:

- **Smart Analysis**: Examines your changes to suggest relevant commit messages
- **VS Code AI Integration**: Uses VS Code's built-in AI when available
- **Fallback Logic**: Provides sensible defaults even without AI capabilities
- **Customizable**: Tweak the generated messages to better fit your needs

## Known Issues

Please report issues on the GitHub repository.

## Release Notes

### 0.2.0

**Latest Stable Release** - TimeLad is now production-ready!

### What's New

- **Enhanced Performance**: Progressive loading for large repositories with pagination
- **Better Architecture**: Improved service architecture with dependency injection
- **State Management**: Enhanced webview state management and refresh handling
- **Package Optimization**: Reduced extension size by excluding test artifacts
- **Stability**: Comprehensive testing and improved error handling

### Recent Features

- **Uncommitted Changes Detection**: View all uncommitted changes in the sidebar
- **AI-Generated Commit Messages**: Smart commit message suggestions
- **One-Click Saves**: Save changes with intelligent commit messages
- **Safe Version Restoration**: Travel back to any version without losing history
- **Visual File Status**: Color-coded indicators for file changes

For the complete list of changes, see the [CHANGELOG](CHANGELOG.md).
