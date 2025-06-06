# Uncommitted Changes Feature

## Overview

Added the ability to see uncommitted changes and save them with AI-generated commit messages to the TimeLad VS Code extension.

## Features Added

### 1. Uncommitted Changes Detection

- **Location**: `src/services/GitService.js`
- **Method**: `getUncommittedChanges()`
- **Functionality**:
  - Uses `git status --porcelain` to detect uncommitted changes
  - Parses file statuses (modified, added, deleted, untracked)
  - Provides summary using `git diff --stat`

### 2. AI-Generated Commit Messages

- **Location**: `src/services/GitService.js`
- **Method**: `generateCommitMessage()`
- **Functionality**:
  - **Primary**: Attempts to use VS Code's built-in AI (GitHub Copilot) if available
  - **Fallback**: Rule-based commit message generation using conventional commit format
  - Analyzes file types and changes to generate appropriate commit types (feat, style, docs, config, chore)

### 3. Save Changes Command

- **Command**: `timelad.saveChanges`
- **Location**: `src/commands/gitCommands.js`
- **Functionality**:
  - Stages all changes with `git add .`
  - Generates commit message using AI or fallback
  - Creates commit with generated message
  - Shows success notification with commit message

### 4. UI Integration

- **Location**: `src/views/templates/webviewTemplates.js`
- **Features**:
  - "Unsaved Changes" section in TimeLad sidebar
  - Shows list of changed files with status indicators (M, A, D, ?)
  - Color-coded status indicators
  - "Save" button for one-click commit
  - Expert mode shows technical details about git commands used

## File Changes Made

### Core Files Modified:

1. **`src/constants.js`**

   - Added `SAVE_CHANGES` command constant
   - Added new git commands for status and commit
   - Added new user messages

2. **`src/services/GitService.js`**

   - Added `getUncommittedChanges()` method
   - Added `parseFileStatus()` helper method
   - Added `generateCommitMessage()` method
   - Added `tryVSCodeAI()` method for Copilot integration
   - Added `generateFallbackCommitMessage()` method
   - Added `saveChanges()` method

3. **`src/commands/gitCommands.js`**

   - Added `saveChanges()` command handler

4. **`src/extension.js`**

   - Registered new `timelad.saveChanges` command

5. **`src/providers/GitHistoryWebviewProvider.js`**

   - Added uncommitted changes tracking
   - Added `saveChanges()` message handler
   - Updated `refresh()` to fetch uncommitted changes
   - Updated webview template call to include uncommitted changes

6. **`src/views/templates/webviewTemplates.js`**

   - Added CSS styles for uncommitted changes section
   - Added `generateUncommittedChangesSection()` function
   - Added `saveChanges()` JavaScript function
   - Updated `getSidebarTemplate()` to include uncommitted changes

7. **`package.json`**
   - Added `timelad.saveChanges` command to contributes.commands
   - Added command to activationEvents

## How to Test

### Prerequisites

- Open a Git repository in VS Code
- Have the TimeLad extension installed and active
- Make some changes to files (modify, add, or delete files)

### Testing Steps

1. **Open TimeLad Sidebar**

   - Click on the TimeLad icon in the activity bar
   - You should see the TimeLad panel

2. **Verify Uncommitted Changes Detection**

   - Make changes to files in your repository
   - The TimeLad sidebar should show an "Unsaved Changes" section
   - Changed files should be listed with status indicators:
     - `M` = Modified (yellow)
     - `A` = Added (green)
     - `D` = Deleted (red)
     - `?` = Untracked (blue)

3. **Test Save Functionality**

   - Click the "Save" button in the "Unsaved Changes" section
   - Extension should show "Saving changes..." message
   - AI will attempt to generate a commit message
   - Success message should show the generated commit message
   - Changes should be committed to the repository
   - "Unsaved Changes" section should disappear after refresh

4. **Test Expert Mode**
   - Click the gear icon to enable Expert Mode
   - "Unsaved Changes" section should show additional technical information
   - Shows git commands that will be executed

### AI Commit Message Examples

**Fallback Messages** (when Copilot not available):

- `feat: update App.js` (single JavaScript file)
- `style: update styles.css` (CSS file)
- `docs: update README.md` (documentation)
- `feat: update 3 files` (multiple files)

**AI Messages** (when Copilot available):

- More contextual and descriptive based on actual changes
- Follows conventional commit format
- Limited to 50 characters for subject line

## Error Handling

- **No Changes**: Shows "No uncommitted changes to save" message
- **Git Errors**: Shows error message with details
- **AI Unavailable**: Gracefully falls back to rule-based generation
- **Network Issues**: Handled by fallback system

## Expert Mode Information

When Expert Mode is enabled, the uncommitted changes section shows:

- Git commands being executed (`git status --porcelain`, `git add .`, `git commit`)
- Technical implementation details
- Caching information

## Future Enhancements

Potential improvements for future versions:

1. Custom commit message editing before save
2. Selective file staging (choose which files to commit)
3. Integration with other AI providers
4. Commit message templates
5. Undo last commit functionality
6. Branch-specific commit message patterns
