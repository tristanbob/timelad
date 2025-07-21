const sinon = require("sinon");

/**
 * Test utilities for TimeLad extension
 */
class TestUtils {
  constructor() {
    this.sandbox = sinon.createSandbox();
  }

  /**
   * Clean up all mocks and stubs
   */
  cleanup() {
    this.sandbox.restore();
  }

  /**
   * Create a mock vscode module
   */
  createVSCodeMock() {
    return {
      window: {
        showErrorMessage: this.sandbox.stub(),
        showInformationMessage: this.sandbox.stub(),
        showWarningMessage: this.sandbox.stub(),
        showQuickPick: this.sandbox.stub(),
        createTreeView: this.sandbox.stub(),
        registerTreeDataProvider: this.sandbox.stub(),
      },
      workspace: {
        getConfiguration: this.sandbox.stub().returns({
          get: this.sandbox.stub(),
          update: this.sandbox.stub(),
        }),
        workspaceFolders: [],
        onDidChangeConfiguration: this.sandbox.stub(),
      },
      commands: {
        registerCommand: this.sandbox.stub(),
        executeCommand: this.sandbox.stub(),
      },
      extensions: {
        getExtension: this.sandbox.stub().returns(null),
      },
      Uri: {
        file: this.sandbox.stub(),
        parse: this.sandbox.stub(),
      },
      ViewColumn: {
        One: 1,
        Two: 2,
        Three: 3,
      },
      TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2,
      },
    };
  }

  /**
   * Mock a Git repository with commits
   */
  createMockGitRepo() {
    return {
      workingTreeChanges: [],
      indexChanges: [],
      refs: {
        heads: [{ name: "main", type: "head" }],
        remotes: [],
      },
      log: this.sandbox.stub().resolves([
        {
          hash: "abc123",
          message: "Initial commit",
          author: "Test User",
          date: new Date(),
          parents: [],
        },
        {
          hash: "def456",
          message: "Add feature",
          author: "Test User",
          date: new Date(),
          parents: ["abc123"],
        },
      ]),
    };
  }

  /**
   * Mock the Git extension
   */
  createMockGitExtension() {
    const mockRepo = this.createMockGitRepo();

    return {
      exports: {
        getAPI: this.sandbox.stub().returns({
          repositories: [mockRepo],
          getRepository: this.sandbox.stub().returns(mockRepo),
        }),
      },
      isActive: true,
    };
  }

  /**
   * Mock child process execution
   */
  mockChildProcess() {
    const execStub = this.sandbox.stub();

    // Default successful responses
    execStub
      .withArgs(sinon.match(/git --version/))
      .resolves({ stdout: "git version 2.30.0" });
    execStub
      .withArgs(sinon.match(/git status/))
      .resolves({ stdout: "On branch main\nnothing to commit" });
    execStub.withArgs(sinon.match(/git log/)).resolves({
      stdout: "abc123 Initial commit\ndef456 Add feature\n",
    });

    return execStub;
  }

  /**
   * Create a mock workspace folder
   */
  createMockWorkspaceFolder(path = "/test/workspace") {
    return {
      uri: { fsPath: path },
      name: "test-workspace",
      index: 0,
    };
  }

  /**
   * Assert that a function was called with specific arguments
   */
  assertCalledWith(stub, ...args) {
    if (!stub.calledWith(...args)) {
      throw new Error(
        `Expected function to be called with ${JSON.stringify(
          args
        )}, but it wasn't`
      );
    }
  }

  /**
   * Assert that a function was not called
   */
  assertNotCalled(stub) {
    if (stub.called) {
      throw new Error("Expected function not to be called, but it was");
    }
  }

  /**
   * Create a delay for async testing
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = TestUtils;
