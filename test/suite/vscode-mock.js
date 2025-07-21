const sinon = require("sinon");

/**
 * Centralized VS Code mocking strategy for consistent test behavior
 */
class VSCodeMock {
  constructor() {
    this.sandbox = sinon.createSandbox();
    this.mock = this.createMock();
  }

  createMock() {
    return {
      window: {
        showErrorMessage: this.sandbox.stub().resolves(),
        showInformationMessage: this.sandbox.stub().resolves(),
        showWarningMessage: this.sandbox.stub().resolves(),
        showQuickPick: this.sandbox.stub().resolves(),
        showInputBox: this.sandbox.stub().resolves(""),
        createWebviewPanel: this.sandbox.stub(),
        createQuickPick: this.sandbox.stub().returns({
          title: "",
          placeholder: "",
          items: [],
          onDidAccept: this.sandbox.stub(),
          onDidHide: this.sandbox.stub(),
          show: this.sandbox.stub(),
          dispose: this.sandbox.stub(),
        }),
        withProgress: this.sandbox.stub().callsFake((options, task) => {
          return task({ report: this.sandbox.stub() });
        }),
      },
      workspace: {
        getConfiguration: this.sandbox.stub().returns({
          get: this.sandbox.stub().returns(""),
          update: this.sandbox.stub().resolves(),
          has: this.sandbox.stub().returns(true),
        }),
        workspaceFolders: [],
        onDidChangeConfiguration: this.sandbox.stub(),
        onDidChangeWorkspaceFolders: this.sandbox.stub(),
        findFiles: this.sandbox.stub().resolves([]),
        openTextDocument: this.sandbox.stub().resolves(),
      },
      commands: {
        registerCommand: this.sandbox.stub(),
        executeCommand: this.sandbox.stub().resolves(),
        getCommands: this.sandbox.stub().resolves([]),
      },
      extensions: {
        getExtension: this.sandbox.stub().returns(null),
        onDidChange: this.sandbox.stub(),
      },
      Uri: {
        file: this.sandbox.stub().callsFake((path) => ({ fsPath: path, scheme: 'file' })),
        parse: this.sandbox.stub().callsFake((uri) => ({ fsPath: uri, scheme: 'file' })),
        joinPath: this.sandbox.stub(),
      },
      ViewColumn: {
        One: 1,
        Two: 2,
        Three: 3,
        Active: -1,
        Beside: -2,
      },
      TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2,
      },
      WebviewViewProvider: class MockWebviewViewProvider {},
      EventEmitter: class MockEventEmitter {
        constructor() {
          this._event = this.sandbox.stub();
        }
        get event() { return this._event; }
        fire() {}
        dispose() {}
      },
      ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3,
      },
    };
  }

  /**
   * Set up workspace with mock folders
   */
  setupWorkspace(folders = []) {
    this.mock.workspace.workspaceFolders = folders.map(path => ({
      uri: { fsPath: path },
      name: path.split('/').pop() || path,
      index: 0,
    }));
    return this;
  }

  /**
   * Set up Git extension mock
   */
  setupGitExtension(repositories = []) {
    const gitExtension = {
      exports: {
        getAPI: this.sandbox.stub().returns({
          repositories: repositories,
          getRepository: this.sandbox.stub().returns(repositories[0] || null),
        }),
      },
      isActive: true,
    };
    
    this.mock.extensions.getExtension
      .withArgs('vscode.git')
      .returns(gitExtension);
    
    return this;
  }

  /**
   * Set up configuration values
   */
  setupConfiguration(section, values = {}) {
    this.mock.workspace.getConfiguration
      .withArgs(section)
      .returns({
        get: this.sandbox.stub().callsFake((key) => values[key] || ""),
        update: this.sandbox.stub().resolves(),
        has: this.sandbox.stub().callsFake((key) => key in values),
      });
    
    return this;
  }

  /**
   * Apply the mock globally
   */
  apply() {
    try {
      require.cache[require.resolve("vscode")] = {
        exports: this.mock,
      };
    } catch (e) {
      // If vscode module doesn't exist, create a mock
      const Module = require("module");
      const originalRequire = Module.prototype.require;
      Module.prototype.require = function (...args) {
        if (args[0] === "vscode") {
          return this.mock;
        }
        return originalRequire.apply(this, args);
      }.bind(this);
    }
    return this;
  }

  /**
   * Clean up all mocks
   */
  cleanup() {
    this.sandbox.restore();
  }

  /**
   * Get the mock object
   */
  getMock() {
    return this.mock;
  }

  /**
   * Get the sandbox for additional stubbing
   */
  getSandbox() {
    return this.sandbox;
  }
}

module.exports = VSCodeMock;