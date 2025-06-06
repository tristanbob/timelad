# TimeLad

> **⚠️ ALPHA RELEASE WARNING ⚠️**
>
> **This is an alpha version intended for testing purposes only.**
>
> - **Data Loss Risk**: This software may cause data loss or repository corruption
> - **Testing Only**: Do not use with important or production data
> - **Backup Required**: Always backup your repositories before testing
> - **Experimental Features**: All features are experimental and may not work as expected
> - **No Support**: This alpha version comes with no guarantees or support
>
> **Only use this extension with disposable test data that you can afford to lose.**

A minimal VS Code extension for working with Git.

## Features

TimeLad provides enhanced commands for interacting with Git repositories:

- **Show Git Info**: Display information about the current branch and latest commit
- **Show Git History**: Open a beautiful interactive UI showing the Git history with version restoration
- **List Recent Commits**: Display a filterable list of recent commits
- **Restore Version**: Safely restore any previous version by creating a new commit (no data loss)
- **Set Up Version Tracking**: Automatically create a new Git repository when none exists, with friendly guidance

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

- `timelad.expertMode`: Enable expert mode to show detailed Git information and understand how the extension works (default: `false`)

### Expert Mode

Expert mode provides additional insights into how TimeLad works under the hood:

- **Git Command Details**: See the exact Git commands being executed
- **Extension Internals**: Understand how data is fetched and cached
- **Version Calculation Logic**: See how version numbers are calculated
- **Caching Information**: View caching strategies for performance optimization

**Enable Expert Mode:**

- Use the Command Palette: "TimeLad: Toggle Expert Mode"
- Click the ⚙️/🔧 button in the TimeLad sidebar
- Or manually set `timelad.expertMode: true` in your VS Code settings

## Known Issues

Please report issues on the GitHub repository.

## Release Notes

### 0.1.0-alpha

⚠️ **ALPHA RELEASE** - Initial alpha release of TimeLad with basic Git integration.

**IMPORTANT**: This is an experimental alpha version:

- Intended for testing purposes only
- May cause data loss or repository corruption
- Should not be used with important or production data
- Always backup your repositories before testing
- No support or guarantees provided
