# Change Log

All notable changes to the "TimeLad" extension will be documented in this file.

## [0.1.1] - 2025-06-16

### Added

- **Uncommitted Changes Detection**: View uncommitted changes directly in the TimeLad sidebar
- **AI-Generated Commit Messages**: Automatic commit message generation using VS Code's built-in AI or fallback to rule-based generation
- **Save Changes Command**: One-click saving of changes with intelligent commit messages
- **UI Integration**: New "Unsaved Changes" section in the sidebar with file status indicators
- **Expert Mode**: Technical details about git commands used for saving changes

### Changed

- **Pre-Release Version**: Updated version to 0.1.1 with pre-release warning
- **Dependencies**: Updated VS Code engine requirement to >=1.63.0 for pre-release support
- **UI Improvements**:
  - Version numbers now show git hash in tooltip when hovering
  - Clicking on version numbers copies the git hash to clipboard
  - Simplified UI by removing expert mode toggle button and detailed technical information
  - Updated webview templates to include uncommitted changes section

### Removed

- Expert mode toggle functionality
- Expert mode configuration setting
- Expert mode toggle command
- Technical details and git command information from UI

## [0.2.1] - 2025-07-20

### Added

- **Package optimization**: Excluded test artifacts from published extension package
- **Enhanced testing**: Improved test coverage and build process

### Changed

- **Pre-release status**: Removed pre-release warning as extension is now stable
- **Build process**: Updated .vscodeignore to reduce package size by excluding test files

## [0.2.0] - 2025-07-20

### Added

- **Enhanced webview state management**: Improved UI responsiveness and state handling
- **Progressive loading for commits**: Added pagination and confirmation modals for better performance with large repositories
- **Git service architecture improvements**: Enhanced dependency injection and service separation

### Fixed

- **Webview state refresh**: Fixed issue where webview state didn't refresh properly after discarding changes
- **Loading states**: Improved loading indicators and user feedback during operations

### Changed

- **Architecture refactoring**: Improved GitService structure with better dependency injection
- **Performance optimizations**: Enhanced commit loading and repository scanning

## [0.1.1] - 2025-06-16

### Added

- **Uncommitted Changes Detection**: View uncommitted changes directly in the TimeLad sidebar
- **AI-Generated Commit Messages**: Automatic commit message generation using VS Code's built-in AI or fallback to rule-based generation
- **Save Changes Command**: One-click saving of changes with intelligent commit messages
- **UI Integration**: New "Unsaved Changes" section in the sidebar with file status indicators
- **Expert Mode**: Technical details about git commands used for saving changes

### Changed

- **Pre-Release Version**: Updated version to 0.1.1 with pre-release warning
- **Dependencies**: Updated VS Code engine requirement to >=1.63.0 for pre-release support
- **UI Improvements**:
  - Version numbers now show git hash in tooltip when hovering
  - Clicking on version numbers copies the git hash to clipboard
  - Simplified UI by removing expert mode toggle button and detailed technical information
  - Updated webview templates to include uncommitted changes section

### Removed

- Expert mode toggle functionality
- Expert mode configuration setting
- Expert mode toggle command
- Technical details and git command information from UI

## [0.1.0] - 2024-12-19

### Initial Release

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
