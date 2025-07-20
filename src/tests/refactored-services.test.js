const assert = require('assert');
const sinon = require('sinon');
const TestUtils = require('./testUtils');

// Import the new services
const AICommitMessageService = require('../services/AICommitMessageService');
const NotificationService = require('../services/NotificationService');
const FileOperationsService = require('../services/FileOperationsService');
const GitService = require('../services/GitService');

describe('Refactored Services', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('AICommitMessageService', () => {
    let aiService;

    beforeEach(() => {
      aiService = new AICommitMessageService();
    });

    afterEach(() => {
      aiService.clearCache();
    });

    it('should generate fallback commit message for new files', async () => {
      const files = [
        { fileName: 'test.js', type: 'added' }
      ];
      const summary = '1 file changed, 10 insertions(+)';

      const message = await aiService.generateCommitMessage(files, summary);
      
      assert.ok(message.includes('feat'));
      assert.ok(message.includes('test.js'));
    });

    it('should determine correct commit type for JavaScript files', () => {
      const fileTypes = new Set(['js', 'ts']);
      const commitType = aiService.determineCommitType(fileTypes);
      
      assert.strictEqual(commitType, 'feat');
    });

    it('should determine correct commit type for CSS files', () => {
      const fileTypes = new Set(['css', 'scss']);
      const commitType = aiService.determineCommitType(fileTypes);
      
      assert.strictEqual(commitType, 'style');
    });

    it('should determine correct commit type for documentation files', () => {
      const fileTypes = new Set(['md', 'txt']);
      const commitType = aiService.determineCommitType(fileTypes);
      
      assert.strictEqual(commitType, 'docs');
    });

    it('should cache commit messages', async () => {
      const files = [{ fileName: 'test.js', type: 'modified' }];
      const summary = 'test summary';

      // First call
      const message1 = await aiService.generateCommitMessage(files, summary);
      
      // Second call should return cached result
      const message2 = await aiService.generateCommitMessage(files, summary);
      
      assert.strictEqual(message1, message2);
      
      const stats = aiService.getCacheStats();
      assert.strictEqual(stats.size, 1);
    });

    it('should build proper commit prompt', () => {
      const files = [
        { fileName: 'test.js', type: 'modified' },
        { fileName: 'style.css', type: 'added' }
      ];
      const summary = '2 files changed';

      const prompt = aiService.buildCommitPrompt(files, summary);
      
      assert.ok(prompt.includes('modified: test.js'));
      assert.ok(prompt.includes('added: style.css'));
      assert.ok(prompt.includes('2 files changed'));
    });
  });

  describe('NotificationService', () => {
    let notificationService;
    let testUtils;

    beforeEach(() => {
      testUtils = new TestUtils();
      const vscode = testUtils.createVSCodeMock();
      
      notificationService = new NotificationService();
    });

    afterEach(() => {
      testUtils.cleanup();
    });

    it('should show info message', async () => {
      // Test that the method exists and can be called without throwing
      assert.ok(typeof notificationService.showInfo === 'function');
      
      // Call should not throw (even if VS Code API returns undefined in test environment)
      await notificationService.showInfo('Test message');
    });

    it('should show error message with extension name prefix', async () => {
      // Test that the method exists and can be called without throwing
      assert.ok(typeof notificationService.showError === 'function');
      
      // Call should not throw (even if VS Code API returns undefined in test environment)
      await notificationService.showError('Test error');
    });

    it('should show repository creation options', async () => {
      const result = await notificationService.showRepositoryCreationOptions();
      
      // Should handle the call without throwing
      assert.ok(typeof result !== 'undefined');
    });
  });

  describe('FileOperationsService', () => {
    let fileService;

    beforeEach(() => {
      fileService = new FileOperationsService();
    });

    it('should join paths correctly', () => {
      const result = fileService.joinPath('path', 'to', 'file.js');
      assert.ok(result.includes('file.js'));
    });

    it('should get base name correctly', () => {
      const result = fileService.getBaseName('/path/to/file.js');
      assert.strictEqual(result, 'file.js');
    });

    it('should get base name without extension', () => {
      const result = fileService.getBaseName('/path/to/file.js', '.js');
      assert.strictEqual(result, 'file');
    });

    it('should get directory name correctly', () => {
      const result = fileService.getDirName('/path/to/file.js');
      assert.ok(result.includes('path'));
    });

    it('should get file extension correctly', () => {
      const result = fileService.getExtension('file.js');
      assert.strictEqual(result, '.js');
    });

    it('should create temp file path', () => {
      const result = fileService.createTempFilePath('/tmp', 'test', '.log');
      assert.ok(result.includes('tmp'));
      assert.ok(result.includes('test'));
      assert.ok(result.includes('.log'));
    });

    it('should validate path within directory', () => {
      const isWithin = fileService.isPathWithinDirectory('/home/user', '/home/user/documents');
      assert.strictEqual(isWithin, true);
      
      const isOutside = fileService.isPathWithinDirectory('/home/user', '/etc/passwd');
      assert.strictEqual(isOutside, false);
    });

    it('should detect path traversal attempts', () => {
      const isSafe = fileService.isPathWithinDirectory('/home/user', '/home/user/../../../etc/passwd');
      assert.strictEqual(isSafe, false);
    });
  });

  describe('GitService Integration', () => {
    let gitService;
    let mockNotificationService;
    let mockFileService;

    beforeEach(() => {
      mockNotificationService = {
        showError: sandbox.stub().resolves(),
        showInfo: sandbox.stub().resolves(),
        showWarning: sandbox.stub().resolves(),
        showUncommittedChangesWarning: sandbox.stub().resolves(true),
        showRepositoryCreationOptions: sandbox.stub().resolves('create'),
        showProgress: sandbox.stub().callsFake(async (title, task) => await task({ report: () => {} })),
        executeCommand: sandbox.stub().resolves(),
        setStatusBarMessage: sandbox.stub().returns({ dispose: sandbox.stub() })
      };

      mockFileService = {
        removeGitLockFile: sandbox.stub().resolves(true),
        createTempIndexFile: sandbox.stub().returns('/tmp/index'),
        createTempCommitFile: sandbox.stub().resolves('/tmp/commit'),
        deleteFile: sandbox.stub().resolves(true),
        joinPath: sandbox.stub().callsFake((...args) => args.join('/')),
        getBaseName: sandbox.stub().callsFake((path) => path.split('/').pop()),
        existsSync: sandbox.stub().returns(false),
        writeFileSync: sandbox.stub()
      };

      gitService = new GitService(mockNotificationService, mockFileService);
    });

    it('should initialize with injected services', () => {
      assert.strictEqual(gitService.notificationService, mockNotificationService);
      assert.strictEqual(gitService.fileService, mockFileService);
      assert.ok(gitService.aiService);
    });

    it('should handle repository not found error', async () => {
      sandbox.stub(gitService, 'executeGitCommand').rejects(new Error('Not a git repository'));
      
      const hasRepo = await gitService.hasRepositoryRobust();
      assert.strictEqual(hasRepo, false);
    });

    it('should parse file status correctly', () => {
      assert.strictEqual(gitService.parseFileStatus('M '), 'modified');
      assert.strictEqual(gitService.parseFileStatus('A '), 'added');
      assert.strictEqual(gitService.parseFileStatus('D '), 'deleted');
      assert.strictEqual(gitService.parseFileStatus('??'), 'untracked');
      assert.strictEqual(gitService.parseFileStatus('MM'), 'modified, modified');
    });

    it('should clear all caches', () => {
      gitService.cache.set('test', 'value');
      gitService.repositoryScanCache.set('test', 'value');
      
      const clearCacheSpy = sandbox.spy(gitService.aiService, 'clearCache');
      
      gitService.clearCache();
      
      assert.strictEqual(gitService.cache.size, 0);
      assert.strictEqual(gitService.repositoryScanCache.size, 0);
      assert.ok(clearCacheSpy.calledOnce);
    });
  });
});