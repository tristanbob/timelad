# Change Log

All notable changes to the "TimeLad" extension will be documented in this file.

## [Unreleased]

### Changed

- Removed expert mode toggle functionality
- Version numbers now show git hash in tooltip when hovering
- Clicking on version numbers copies the git hash to clipboard
- Simplified UI by removing expert mode toggle button and detailed technical information

### Removed

- Expert mode configuration setting
- Expert mode toggle command
- Technical details and git command information from UI

## [0.1.0] - 2024-12-19

### Added

- Initial release of TimeLad
- Show Git Info command to display current branch and latest commit information
- Interactive Git History view in the sidebar with beautiful UI
- List Recent Commits command with filterable list
- Safe Version Restore functionality that creates new commits (no data loss)
- Automatic Version Tracking setup for projects without Git repositories
- Expert Mode toggle for advanced users to see detailed Git operations
- GitHub integration for saving and loading repository data
- Configuration options for expert mode and GitHub token
- Beginner-friendly explanations and helpful analogies for Git concepts
- Automatic handling of uncommitted changes during version restoration
- Smart detection of Git repositories with guided setup

### Features

- **Time Travel**: Safely restore any previous version by creating a new commit
- **Beginner-Friendly**: Uses simple, non-technical language to explain version tracking
- **Interactive UI**: Beautiful webview interface for browsing Git history
- **Expert Mode**: Detailed insights into Git commands and extension internals
- **GitHub Integration**: Save and load repository data to/from GitHub
- **Automatic Setup**: Creates Git repositories with sensible defaults

### Requirements

- VS Code 1.60.0 or higher
- Git must be installed on the system
