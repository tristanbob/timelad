const assert = require('assert');
const sinon = require('sinon');
const TestUtils = require('./testUtils');

// Mock vscode for services that need it
const mockVscode = {
  window: {
    showErrorMessage: () => {},
    showInformationMessage: () => {},
    showWarningMessage: () => {},
  },
  workspace: {
    getConfiguration: () => ({
      get: () => "",
      update: () => Promise.resolve(),
    }),
    workspaceFolders: [],
  },
};

try {
  require.cache[require.resolve("vscode")] = {
    exports: mockVscode,
  };
} catch (e) {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (...args) {
    if (args[0] === "vscode") {
      return mockVscode;
    }
    return originalRequire.apply(this, args);
  };
}

// Import the new services
const { CommitMessageService } = require('../../out/services/CommitMessageService');
const { NotificationService } = require('../../out/services/NotificationService');
const { FileOperationsService } = require('../../out/services/FileOperationsService');
const { GitService } = require('../../out/services/GitService');

describe('Refactored Services', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('CommitMessageService', () => {
    let commitMessageService;

    beforeEach(() => {
      commitMessageService = new CommitMessageService();
    });

    afterEach(() => {
      commitMessageService.clearCache();
    });

    it('should initialize successfully', () => {
      assert.ok(commitMessageService);
      assert.strictEqual(typeof commitMessageService.generateCommitMessage, 'function');
    });

    it('should have clearCache method', () => {
      assert.strictEqual(typeof commitMessageService.clearCache, 'function');
    });
  });

  describe('NotificationService', () => {
    let notificationService;

    beforeEach(() => {
      notificationService = new NotificationService();
    });

    it('should initialize successfully', () => {
      assert.ok(notificationService);
      assert.strictEqual(typeof notificationService.showError, 'function');
      assert.strictEqual(typeof notificationService.showInfo, 'function');
    });
  });

  describe('FileOperationsService', () => {
    let fileOperationsService;

    beforeEach(() => {
      fileOperationsService = new FileOperationsService();
    });

    it('should initialize successfully', () => {
      assert.ok(fileOperationsService);
      assert.strictEqual(typeof fileOperationsService.exists, 'function');
      assert.strictEqual(typeof fileOperationsService.readFile, 'function');
    });
  });

  describe('GitService with Dependencies', () => {
    let gitService;
    let notificationService;
    let fileOperationsService;

    beforeEach(() => {
      notificationService = new NotificationService();
      fileOperationsService = new FileOperationsService();
      gitService = new GitService(notificationService, fileOperationsService);
    });

    it('should initialize with injected dependencies', () => {
      assert.ok(gitService);
      assert.strictEqual(typeof gitService.getRepositoryPath, 'function');
      assert.strictEqual(typeof gitService.getCommitHistory, 'function');
    });

    it('should have injected services', () => {
      assert.ok(gitService.notificationService);
      assert.ok(gitService.fileService);
    });
  });
});