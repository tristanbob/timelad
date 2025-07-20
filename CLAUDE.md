# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Testing
- `npm test` - Run all tests (unit + integration)
- `npm run test:unit` - Run unit tests only (fast, for TDD)
- `npm run test:integration` - Run integration tests with VS Code
- `npm run test:coverage` - Generate coverage report
- `npm run test:watch` - Run unit tests in watch mode

### Linting and Quality
- `npm run lint` - Run ESLint to check code quality
- `npm run vscode:prepublish` - Pre-publish checks (runs lint)

### Extension Development
- Press F5 in VS Code to launch Extension Development Host
- Use Command Palette: "Developer: Reload Window" to reload extension
- Package with `vsce package` (requires vsce to be installed)

## Architecture Overview

### Core Components

**GitService** (`src/services/GitService.js`)
- Primary service for all Git operations
- Handles repository detection, commit history, and version restoration
- Implements robust repository scanning with multi-layer detection
- Manages caching for performance optimization
- Provides AI-powered commit message generation

**GitHistoryWebviewProvider** (`src/providers/GitHistoryWebviewProvider.js`)
- Manages the sidebar webview UI
- Handles user interactions (restore, save, discard)
- Coordinates between GitService and the webview
- Implements loading states and error handling

**Extension Entry Point** (`src/extension.js`)
- VS Code extension activation and command registration
- Sets up webview providers and command handlers
- Manages extension lifecycle and cleanup

### Git Operations Philosophy

The extension follows a **safety-first** approach:
- Never rewrites Git history (no `git reset --hard` on existing commits)
- Always creates new commits for version restoration
- Preserves full Git history for complete auditability
- Handles uncommitted changes with user confirmation

### Repository Detection Strategy

Uses a multi-layered approach for reliable repository detection:
1. Direct filesystem scanning (fastest, most reliable)
2. VS Code Git extension API (when available)
3. Direct Git command execution (fallback)

### Key Patterns

**Error Handling**: All operations include comprehensive error handling with user-friendly messages
**Caching**: Repository scans and commit lists are cached for performance
**Progress Feedback**: Long operations show loading states and progress indicators
**Safety Checks**: Multiple confirmation dialogs for destructive operations

### Webview Architecture

The sidebar uses a single webview with dynamic content switching:
- No repository state → Setup UI
- Repository found → Commit history with interactive controls
- Loading states → Spinner animations with contextual messages
- Error states → Actionable error messages with retry options

### Testing Strategy

- **Unit Tests**: Mock VS Code APIs, test individual functions in isolation
- **Integration Tests**: Run within VS Code environment to test end-to-end flows
- **Comprehensive Mocking**: Custom TestUtils class provides consistent mocking patterns
- **Coverage Requirements**: 70% statements, 60% branches minimum

## Development Notes

### Important Files Structure
- `src/constants.js` - All extension constants and configuration
- `src/views/templates/webviewTemplates.js` - HTML templates for webview UI
- `src/tests/testUtils.js` - Comprehensive testing utilities and mocks

### VS Code Integration
- Extension contributes sidebar view and commands
- Uses webview for rich UI interactions
- Integrates with VS Code's Git extension when available
- Follows VS Code extension best practices for lifecycle management

### Safety Mechanisms
- Multiple confirmation dialogs for destructive actions
- Automatic cleanup of temporary files and locks
- Graceful handling of Git lock files and conflicts
- Comprehensive validation before operations

### Performance Optimizations
- Repository scanning limited to 3 levels deep
- Commit history cached with configurable timeouts
- Progressive loading for large repositories
- Efficient webview updates to prevent flickering