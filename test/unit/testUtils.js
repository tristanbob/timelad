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

  /**
   * Mock file system operations with configurable behavior
   */
  mockFileSystem(options = {}) {
    const {
      existingFiles = [],
      failureFiles = [],
      readOnlyFiles = [],
      slowFiles = [],
      corruptedFiles = []
    } = options;

    const fsStub = {
      exists: this.sandbox.stub(),
      readFile: this.sandbox.stub(),
      writeFile: this.sandbox.stub(),
      mkdir: this.sandbox.stub(),
      rmdir: this.sandbox.stub(),
      stat: this.sandbox.stub()
    };

    // Configure exists behavior
    fsStub.exists.callsFake((filePath) => {
      if (failureFiles.includes(filePath)) {
        return Promise.reject(new Error("EACCES: permission denied"));
      }
      if (corruptedFiles.includes(filePath)) {
        return Promise.reject(new Error("EIO: i/o error"));
      }
      return Promise.resolve(existingFiles.includes(filePath));
    });

    // Configure readFile behavior
    fsStub.readFile.callsFake((filePath) => {
      if (failureFiles.includes(filePath)) {
        return Promise.reject(new Error("ENOENT: no such file or directory"));
      }
      if (readOnlyFiles.includes(filePath)) {
        return Promise.reject(new Error("EACCES: permission denied"));
      }
      if (slowFiles.includes(filePath)) {
        return this.delay(1000).then(() => `Content of ${filePath}`);
      }
      if (corruptedFiles.includes(filePath)) {
        return Promise.reject(new Error("EIO: i/o error"));
      }
      return Promise.resolve(`Content of ${filePath}`);
    });

    // Configure writeFile behavior
    fsStub.writeFile.callsFake((filePath, content) => {
      if (readOnlyFiles.includes(filePath)) {
        return Promise.reject(new Error("EACCES: permission denied"));
      }
      if (failureFiles.includes(filePath)) {
        return Promise.reject(new Error("ENOSPC: no space left on device"));
      }
      if (slowFiles.includes(filePath)) {
        return this.delay(1000).then(() => {});
      }
      return Promise.resolve();
    });

    // Configure mkdir behavior
    fsStub.mkdir.callsFake((dirPath) => {
      if (readOnlyFiles.includes(dirPath)) {
        return Promise.reject(new Error("EACCES: permission denied"));
      }
      return Promise.resolve();
    });

    // Configure stat behavior
    fsStub.stat.callsFake((filePath) => {
      if (!existingFiles.includes(filePath)) {
        return Promise.reject(new Error("ENOENT: no such file or directory"));
      }
      return Promise.resolve({
        isFile: () => !filePath.endsWith('/'),
        isDirectory: () => filePath.endsWith('/'),
        size: 1024,
        mtime: new Date(),
        ctime: new Date()
      });
    });

    return fsStub;
  }

  /**
   * Mock child process execution with configurable responses
   */
  mockProcessExecution(commandResponses = {}) {
    const execStub = this.sandbox.stub();

    // Default responses
    const defaults = {
      'git --version': { stdout: 'git version 2.40.0', stderr: '' },
      'git status --porcelain': { stdout: '', stderr: '' },
      'git log --oneline -10': { stdout: 'abc123 Initial commit\ndef456 Add feature', stderr: '' },
      'git rev-parse --git-dir': { stdout: '.git', stderr: '' }
    };

    // Merge with provided responses
    const responses = { ...defaults, ...commandResponses };

    Object.entries(responses).forEach(([command, response]) => {
      if (response instanceof Error) {
        execStub.withArgs(this.sandbox.match(command)).rejects(response);
      } else {
        execStub.withArgs(this.sandbox.match(command)).resolves(response);
      }
    });

    // Default fallback for unmatched commands
    execStub.callsFake((command) => {
      console.warn(`Unmatched command in test: ${command}`);
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    return execStub;
  }

  /**
   * Create mock workspace with configurable structure
   */
  createMockWorkspace(structure = {}) {
    const {
      folders = ['/test/workspace'],
      gitRepos = ['/test/workspace'],
      files = {},
      configuration = {}
    } = structure;

    return {
      workspaceFolders: folders.map(path => ({
        uri: { fsPath: path },
        name: path.split('/').pop() || path,
        index: 0
      })),
      gitRepositories: gitRepos,
      files: files,
      configuration: configuration
    };
  }

  /**
   * Mock network operations with configurable failures
   */
  mockNetworkOperations(options = {}) {
    const {
      slowUrls = [],
      failingUrls = [],
      timeoutUrls = [],
      networkDelay = 100
    } = options;

    const networkStub = {
      fetch: this.sandbox.stub(),
      request: this.sandbox.stub()
    };

    networkStub.fetch.callsFake((url) => {
      if (failingUrls.includes(url)) {
        return Promise.reject(new Error('Network error'));
      }
      if (timeoutUrls.includes(url)) {
        return Promise.reject(new Error('Connection timeout'));
      }
      
      const delay = slowUrls.includes(url) ? 5000 : networkDelay;
      
      return this.delay(delay).then(() => ({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'mock response' }),
        text: () => Promise.resolve('mock response text')
      }));
    });

    return networkStub;
  }
}

module.exports = TestUtils;