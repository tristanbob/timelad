# TimeLad (v0.1.1 - Pre-Release)

> **⚠️ PRE-RELEASE WARNING ⚠️**
>
> **This is a pre-release version (v0.1.1) intended for testing purposes only.**
>
> - **Data Loss Risk**: This software may cause data loss or repository corruption
> - **Testing Only**: Do not use with important or production data
> - **Backup Required**: Always backup your repositories before testing
> - **Experimental Features**: All features are experimental and may not work as expected
> - **No Support**: This pre-release version comes with no guarantees or support
>
> **Only use this extension with disposable test data that you can afford to lose.**

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

### 0.1.0-alpha

⚠️ **ALPHA RELEASE** - TimeLad is currently in alpha testing.

**IMPORTANT**: This is an experimental alpha version:

- 🚧 **Testing Only**: For evaluation purposes with non-critical data
- ⚠️ **Use Caution**: May affect your Git repository state
- 🔄 **Backup First**: Always backup repositories before testing
- 📝 **Feedback Welcome**: Please report issues on GitHub

### What's New

- Added Uncommitted Changes detection in sidebar
- Implemented AI-Generated Commit Messages
- New Save Changes command with one-click commit
- Enhanced UI with visual indicators for file status
- Improved version navigation and information display

For the complete list of changes, see the [CHANGELOG](CHANGELOG.md).
