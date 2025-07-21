# TimeLad 🕰️

<div align="center">

**A powerful VS Code extension that makes Git version control accessible, intuitive, and safe for everyone.**

[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=victrisai.timelad)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/built_with-TypeScript-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## ✨ Features

### 🎯 **Core Functionality**
- **🕰️ Interactive Git History** - Beautiful timeline view with visual diffs and version navigation
- **⏮️ Safe Version Restoration** - Travel back to any previous version without losing history
- **💾 One-Click Saves** - Save changes with intelligent auto-generated commit messages
- **🔍 Uncommitted Changes Detection** - See all your pending changes at a glance

### 🛡️ **Safety First**
- **📚 No Data Loss** - Always creates new commits instead of rewriting history
- **🔄 Change Awareness** - Shows exactly what will be committed before saving
- **💼 Automatic Backups** - Smart handling of uncommitted changes with user confirmation

### 👥 **Beginner Friendly**
- **🚀 Easy Setup** - Guided Git repository initialization with helpful explanations
- **🎨 Visual Indicators** - Color-coded file status and clear version numbering
- **📝 Smart Commit Messages** - Conventional commit pattern suggestions based on your changes

---

## 🚀 Getting Started

### Prerequisites
- **VS Code** 1.63.0 or higher
- **Git** installed and accessible from command line

### Installation
1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=victrisai.timelad)
2. Open any folder in VS Code
3. Look for the **TimeLad** icon in the Activity Bar

---

## 📖 How to Use

### 🔧 **Setting Up Version Tracking**
If your project doesn't have Git yet:
1. Click **"Set up version tracking"** in the TimeLad sidebar
2. Follow the guided setup process
3. Your first commit is created automatically!

### ⏮️ **Restoring to Previous Versions**
1. Browse your commit history in the TimeLad sidebar
2. Find the version you want to restore
3. Click **"⏮️ Restore Version"**
4. TimeLad safely creates a new commit with the old content

### 💾 **Saving Your Work**
1. Make changes to your files
2. View uncommitted changes in the sidebar
3. Click **"💾 Save Changes"** for instant commit with smart message
4. Or use the detailed commit flow for custom messages

---

## ⚙️ Configuration

### Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `timelad.githubToken` | GitHub Personal Access Token for repository operations | `""` |

---

## 🔧 Technical Architecture

### Built with Modern Standards
- **💪 TypeScript** - Full type safety and better developer experience
- **🏗️ Dependency Injection** - Clean, testable architecture
- **🧪 Comprehensive Testing** - Unit and integration tests with 70%+ coverage
- **📦 VS Code APIs** - Native integration with VS Code's Git extension

### Git Integration Philosophy

TimeLad is built on **safety-first** principles:

#### ✅ What TimeLad Does
```bash
# Safe version restoration using standard Git commands
git read-tree <commit-hash>     # Load commit tree into staging
git checkout-index -a           # Update working directory  
git add .                       # Stage all changes
git commit -F <message-file>    # Create new commit
git clean -fd                   # Clean up untracked files
```

#### ❌ What TimeLad Never Does
- **No `git rebase`** - Would rewrite history
- **No `git push --force`** - Would overwrite remote history  
- **No `git filter-branch`** - Would alter commit history
- **No destructive operations** - Your Git history stays intact

### Performance & Reliability
- **⚡ Progressive Loading** - Handles repositories with thousands of commits
- **🔄 Smart Caching** - Optimized performance with intelligent cache management
- **🛡️ Error Recovery** - Robust error handling with automatic fallback mechanisms
- **📊 Minimal Resource Usage** - Efficient Git command execution (3-5 commands vs 8+ in complex operations)

---

## 📈 What's New in v0.3.0

### 🚀 Major Performance Improvements
- **⚡ 69% Code Reduction** - Simplified restore method (25 lines vs 80+ lines)
- **🔧 Enhanced Reliability** - Streamlined Git command sequence
- **🏗️ Better Architecture** - Removed complex dependencies and temporary file handling

### 💻 Complete TypeScript Migration  
- **🎯 Full Type Safety** - All core services migrated to TypeScript
- **🔍 Better IntelliSense** - Enhanced developer experience with autocomplete
- **🛡️ Compile-time Safety** - Catch errors before runtime
- **📚 Self-documenting Code** - Inline type annotations and interfaces

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/tristanbob/timelad.git
cd timelad
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

---

## 📋 Requirements & Compatibility

### System Requirements
- **Operating System**: Windows, macOS, or Linux
- **VS Code**: Version 1.63.0 or higher
- **Git**: Version 2.0 or higher
- **Node.js**: Version 14.0 or higher (for development)

### Git Workflow Compatibility
TimeLad works seamlessly with:
- ✅ **GitHub/GitLab workflows**
- ✅ **Git Flow and GitHub Flow**
- ✅ **Existing Git repositories**
- ✅ **Team collaboration**
- ✅ **CI/CD pipelines**

---

## 🐛 Known Issues & Support

Found a bug or need help? We're here to help!

- **🐛 Report Issues**: [GitHub Issues](https://github.com/tristanbob/timelad/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/tristanbob/timelad/discussions)
- **📧 Contact**: Open an issue for fastest response

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎉 Acknowledgments

Built with ❤️ for the VS Code community. Special thanks to all contributors and users who make TimeLad better every day!

---

<div align="center">

**⭐ Star us on GitHub if TimeLad helps you!**

[GitHub Repository](https://github.com/tristanbob/timelad) • [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=victrisai.timelad) • [Changelog](CHANGELOG.md)

</div>