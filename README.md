# TimeLad

A minimal VS Code extension for working with Git.

## Features

TimeLad provides enhanced commands for interacting with Git repositories:

- **Show Git Info**: Display information about the current branch and latest commit
- **Show Git History**: Open a beautiful interactive UI showing the Git history with version restoration
- **List Recent Commits**: Display a filterable list of recent commits
- **Restore Version**: Safely restore any previous version by creating a new commit (no data loss)

## Usage

1. Open a Git repository in VS Code
2. Access TimeLad commands:
   - Through the Command Palette (Ctrl+Shift+P)
   - Search for "TimeLad: Show Git Info" or "TimeLad: Show Git History"
   - Use the TimeLad sidebar to view Git history with restore functionality

### Restore Version Feature

- **Safe Time Travel**: Click "⏮️ Restore Version" on any commit to safely restore your project to that state
- **No Data Loss**: Creates a new commit with the restored state, preserving all history
- **Automatic Stashing**: Automatically handles uncommitted changes by offering to stash them
- **Version Tracking**: Each restore creates a new version number, making it easy to track changes

## Requirements

- VS Code 1.60.0 or higher
- Git must be installed

## Extension Settings

This extension does not add any settings.

## Known Issues

Please report issues on the GitHub repository.

## Release Notes

### 0.1.0

Initial release of TimeLad with basic Git integration.
