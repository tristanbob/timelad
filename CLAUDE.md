# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### TypeScript Development
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch and compile TypeScript changes automatically
- `npm run lint` - Run ESLint to check TypeScript code quality
- `npm run vscode:prepublish` - Pre-publish checks (compile + lint)

### Testing
- `npm test` - Run all tests (unit + integration)
- `npm run test:unit` - Run unit tests only (fast, for TDD)
- `npm run test:integration` - Run integration tests with VS Code
- `npm run test:coverage` - Generate coverage report
- `npm run test:watch` - Run unit tests in watch mode

### Build Process
The extension is now built with TypeScript:
1. Source files in `src/` (TypeScript)
2. Compiled output in `out/` (JavaScript)
3. Main entry point: `out/extension.js`

### Extension Development
- Press F5 in VS Code to launch Extension Development Host
- Use Command Palette: "Developer: Reload Window" to reload extension
- Package with `vsce package` (requires vsce to be installed)

## Architecture Overview

### Core Components (TypeScript)

**GitService** (`src/services/GitService.ts`)
- Primary service for all Git operations with dependency injection architecture
- Fully typed with comprehensive interface contracts
- Handles repository detection, commit history, and version restoration
- Implements robust repository scanning with multi-layer detection
- Manages caching for performance optimization with typed cache entries
- Takes injected NotificationService and FileOperationsService dependencies

**GitHistoryWebviewProvider** (`src/providers/GitHistoryWebviewProvider.ts`)
- Manages the sidebar webview UI with type-safe message handling
- Implements vscode.WebviewViewProvider interface
- Handles user interactions with typed webview messages
- Coordinates between injected services and the webview
- Implements loading states and error handling with proper typing

**GitCommands** (`src/commands/gitCommands.ts`)
- Refactored command handler with full TypeScript typing
- Initializes and coordinates all service dependencies
- Provides clean API for extension commands with type safety

**Service Layer Architecture (TypeScript):**
- **NotificationService** (`src/services/NotificationService.ts`) - Type-safe VS Code user notifications
- **FileOperationsService** (`src/services/FileOperationsService.ts`) - File system operations with typed interfaces
- **CommitMessageService** (`src/services/CommitMessageService.js`) - Rule-based commit message generation (JavaScript)
- **GitHubService** (`src/services/GitHubService.js`) - GitHub API integration (JavaScript)

**Extension Entry Point** (`src/extension.ts`)
- TypeScript VS Code extension activation and command registration
- Sets up webview providers and command handlers with proper typing
- Manages extension lifecycle and cleanup

**Type Definitions** (`src/types/index.ts`)
- Comprehensive TypeScript interfaces for all service contracts
- WebView message types for type-safe communication
- Git operation types and repository interfaces

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
- **Service Testing**: Isolated tests for each service with dependency injection
- **Comprehensive Mocking**: Custom TestUtils class provides consistent mocking patterns
- **Coverage Requirements**: 70% statements, 60% branches minimum

### Dependency Injection Architecture

The refactored codebase uses dependency injection for better testability and maintainability:

**Pattern**: Services are injected into constructors rather than imported directly
```javascript
// GitService constructor takes dependencies
constructor(notificationService, fileOperationsService) {
  this.notificationService = notificationService;
  this.fileService = fileOperationsService;
}

// GitCommands creates and injects services
constructor() {
  this.notificationService = new NotificationService();
  this.fileService = new FileOperationsService();
  this.gitService = new GitService(this.notificationService, this.fileService);
}
```

**Benefits**:
- Each service can be tested in isolation
- Easy to mock dependencies in tests
- Clear separation of concerns
- Improved code reusability

## TypeScript Migration

The codebase has been fully migrated to TypeScript with the following benefits:

### Migration Overview
- **Complete TypeScript Migration**: All core services, providers, and commands converted to TypeScript
- **Strict Mode Enabled**: Full type safety with strict null checks and comprehensive type validation
- **Interface-Driven Architecture**: All services implement typed interfaces for better maintainability
- **Type-Safe Dependency Injection**: Dependency injection pattern now fully typed

### TypeScript Benefits Achieved
- **Compile-Time Error Detection**: Catches potential runtime errors during development
- **Enhanced IntelliSense**: Better IDE support with autocomplete and documentation
- **Refactoring Safety**: TypeScript ensures type compatibility during code changes
- **Self-Documenting Code**: Type annotations serve as inline documentation

### Migration Status
- ✅ **Core Services**: GitService, NotificationService, FileOperationsService (TypeScript)
- ✅ **Providers**: GitHistoryWebviewProvider (TypeScript)
- ✅ **Commands**: gitCommands (TypeScript) 
- ✅ **Extension Entry**: extension.ts (TypeScript)
- ✅ **Constants**: constants.ts with typed interfaces (TypeScript)
- ✅ **Type Definitions**: Comprehensive service interfaces (TypeScript)
- ⚠️ **Remaining JavaScript**: CommitMessageService, GitHubService, webview templates, tests

## Development Notes

### Important Files Structure
- `src/constants.ts` - All extension constants and configuration (TypeScript with interfaces)
- `src/types/index.ts` - TypeScript type definitions and service interfaces
- `src/views/templates/webviewTemplates.js` - HTML templates for webview UI (JavaScript)
- `src/views/templates/webviewTemplates.d.ts` - TypeScript declarations for templates
- `src/tests/testUtils.js` - Comprehensive testing utilities and mocks
- `src/tests/refactored-services.test.js` - Tests for new service architecture
- `tsconfig.json` - TypeScript configuration with strict mode enabled
- `.eslintrc.js` - ESLint configuration for TypeScript

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