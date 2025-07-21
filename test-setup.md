# Testing TimeLad Extension

## Quick Test Setup

### 1. Create a Test Repository
```bash
# Create test directory
mkdir C:\Users\trist\TimeLadTestRepo
cd C:\Users\trist\TimeLadTestRepo

# Initialize Git repository
git init

# Create basic .gitignore to prevent the error
echo "node_modules/" > .gitignore
echo "*.log" >> .gitignore
echo ".env" >> .gitignore

# Configure Git user (if not already configured)
git config user.name "Test User"
git config user.email "test@example.com"

# Create some test files
echo "# Test Project" > README.md
echo "console.log('Hello World');" > app.js
echo "body { margin: 0; }" > style.css

# Make initial commit
git add .
git commit -m "Initial commit"

# Make some changes to test with
echo "console.log('Updated');" > app.js
echo "# Updated README" > README.md
```

### 2. Test the Extension
1. **Compile TypeScript**: `npm run compile`
2. **Open test repo in VS Code**: `code C:\Users\trist\TimeLadTestRepo`
3. **Launch Extension Development Host**: Press F5
4. **Open TimeLad sidebar** in the new VS Code window
5. **Test features**:
   - View commit history
   - Make changes and save them
   - Try version restoration

### 3. Test Scenarios

#### Basic Git Operations
- Open TimeLad sidebar
- Should show initial commit
- Make file changes
- Use "Save Changes" button

#### Version Restoration
- Make some changes
- Restore to previous version
- Verify files are restored

#### Error Handling
- Test with no Git repository
- Test with uncommitted changes
- Test with empty repository

### 4. Troubleshooting

#### If .gitignore Error Persists
1. **Check if error comes from our extension**:
   - Look at Debug Console in Extension Development Host
   - Check if error shows TimeLad in stack trace

2. **If error is from VS Code Git extension**:
   - This is normal and doesn't affect TimeLad functionality
   - VS Code's Git extension expects .gitignore in Git repos

3. **Create minimal .gitignore**:
   ```bash
   # In your test repository
   touch .gitignore
   git add .gitignore
   git commit -m "Add .gitignore"
   ```

#### Common Issues
- **Extension not loading**: Run `npm run compile` first
- **TypeScript errors**: Check Debug Console
- **Git not found**: Ensure Git is installed and in PATH
- **Permission errors**: Run VS Code as administrator if needed

### 5. Development Workflow
```bash
# 1. Make changes to TypeScript code
# 2. Compile
npm run compile

# 3. Reload extension in Development Host
# Press Ctrl+Shift+P → "Developer: Reload Window"

# 4. Test changes
# Use TimeLad features in the reloaded window
```

This setup should prevent the .gitignore error and provide a clean testing environment for your TypeScript extension.