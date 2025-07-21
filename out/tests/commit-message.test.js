const assert = require('assert');
const sinon = require('sinon');

// Import the CommitMessageService directly
const CommitMessageService = require('../services/CommitMessageService');

describe('CommitMessageService', () => {
  let commitMessageService;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    commitMessageService = new CommitMessageService();
  });

  afterEach(() => {
    commitMessageService.clearCache();
    sandbox.restore();
  });

  describe('generateCommitMessage', () => {
    it('should generate rule-based commit message', async () => {
      const files = [{ fileName: 'test.js', type: 'added' }];
      const summary = '1 file changed, 10 insertions(+)';

      const message = await commitMessageService.generateCommitMessage(files, summary);
      
      assert.ok(message.includes('feat'));
      assert.ok(message.includes('add test.js'));
    });

    it('should cache commit messages', async () => {
      const files = [{ fileName: 'test.js', type: 'modified' }];
      const summary = 'test summary';

      const message1 = await commitMessageService.generateCommitMessage(files, summary);
      const message2 = await commitMessageService.generateCommitMessage(files, summary);
      
      assert.strictEqual(message1, message2);
      
      const stats = commitMessageService.getCacheStats();
      assert.strictEqual(stats.size, 1);
    });

    it('should handle empty files array', async () => {
      const files = [];
      const summary = '';

      const message = await commitMessageService.generateCommitMessage(files, summary);
      
      assert.strictEqual(message, 'chore: update files');
    });
  });

  describe('generateRuleBasedCommitMessage', () => {
    it('should generate correct message for JavaScript files', () => {
      const files = [{ fileName: 'app.js', type: 'added' }];
      const summary = 'New file';

      const message = commitMessageService.generateRuleBasedCommitMessage(files, summary);
      
      assert.strictEqual(message, 'feat: add app.js');
    });

    it('should generate correct message for CSS files', () => {
      const files = [{ fileName: 'styles.css', type: 'modified' }];
      const summary = 'Style updates';

      const message = commitMessageService.generateRuleBasedCommitMessage(files, summary);
      
      assert.strictEqual(message, 'style: update styles.css');
    });

    it('should generate correct message for documentation files', () => {
      const files = [{ fileName: 'README.md', type: 'modified' }];
      const summary = 'Doc updates';

      const message = commitMessageService.generateRuleBasedCommitMessage(files, summary);
      
      assert.strictEqual(message, 'docs: update README.md');
    });

    it('should generate correct message for configuration files', () => {
      const files = [{ fileName: 'package.json', type: 'modified' }];
      const summary = 'Config updates';

      const message = commitMessageService.generateRuleBasedCommitMessage(files, summary);
      
      assert.strictEqual(message, 'config: update package.json');
    });

    it('should generate correct message for test files', () => {
      const files = [{ fileName: 'app.test.js', type: 'added' }];
      const summary = 'New test';

      const message = commitMessageService.generateRuleBasedCommitMessage(files, summary);
      
      assert.strictEqual(message, 'test: add app.test.js');
    });

    it('should generate correct message for multiple files', () => {
      const files = [
        { fileName: 'app.js', type: 'modified' },
        { fileName: 'styles.css', type: 'modified' }
      ];
      const summary = '2 files changed';

      const message = commitMessageService.generateRuleBasedCommitMessage(files, summary);
      
      assert.strictEqual(message, 'feat: update 2 files');
    });
  });

  describe('determineCommitType', () => {
    it('should return feat for JavaScript files', () => {
      const fileTypes = new Set(['js', 'ts']);
      const result = commitMessageService.determineCommitType(fileTypes);
      assert.strictEqual(result, 'feat');
    });

    it('should return style for CSS files', () => {
      const fileTypes = new Set(['css', 'scss']);
      const result = commitMessageService.determineCommitType(fileTypes);
      assert.strictEqual(result, 'style');
    });

    it('should return docs for documentation files', () => {
      const fileTypes = new Set(['md', 'txt']);
      const result = commitMessageService.determineCommitType(fileTypes);
      assert.strictEqual(result, 'docs');
    });

    it('should return config for configuration files', () => {
      const fileTypes = new Set(['json', 'yml']);
      const result = commitMessageService.determineCommitType(fileTypes);
      assert.strictEqual(result, 'config');
    });

    it('should return test for test files', () => {
      const fileTypes = new Set(['test']);
      const result = commitMessageService.determineCommitType(fileTypes);
      assert.strictEqual(result, 'test');
    });

    it('should return chore for unknown file types', () => {
      const fileTypes = new Set(['unknown']);
      const result = commitMessageService.determineCommitType(fileTypes);
      assert.strictEqual(result, 'chore');
    });
  });

  describe('generateSubject', () => {
    it('should generate subject for single file addition', () => {
      const files = [{ fileName: 'test.js' }];
      const changeTypes = new Set(['add']);
      
      const result = commitMessageService.generateSubject(files, changeTypes);
      assert.strictEqual(result, 'add test.js');
    });

    it('should generate subject for single file removal', () => {
      const files = [{ fileName: 'old.js' }];
      const changeTypes = new Set(['remove']);
      
      const result = commitMessageService.generateSubject(files, changeTypes);
      assert.strictEqual(result, 'remove old.js');
    });

    it('should generate subject for single file rename', () => {
      const files = [{ fileName: 'new-name.js' }];
      const changeTypes = new Set(['rename']);
      
      const result = commitMessageService.generateSubject(files, changeTypes);
      assert.strictEqual(result, 'rename new-name.js');
    });

    it('should generate subject for single file update', () => {
      const files = [{ fileName: 'app.js' }];
      const changeTypes = new Set(['update']);
      
      const result = commitMessageService.generateSubject(files, changeTypes);
      assert.strictEqual(result, 'update app.js');
    });

    it('should generate subject for multiple files', () => {
      const files = [
        { fileName: 'app.js' },
        { fileName: 'styles.css' }
      ];
      const changeTypes = new Set(['add', 'update']);
      
      const result = commitMessageService.generateSubject(files, changeTypes);
      assert.strictEqual(result, 'add 2 files');
    });
  });

  describe('getMainChangeType', () => {
    it('should prioritize add', () => {
      const changeTypes = new Set(['add', 'update', 'remove']);
      const result = commitMessageService.getMainChangeType(changeTypes);
      assert.strictEqual(result, 'add');
    });

    it('should return update when no add', () => {
      const changeTypes = new Set(['update', 'remove']);
      const result = commitMessageService.getMainChangeType(changeTypes);
      assert.strictEqual(result, 'update');
    });

    it('should return remove when only remove', () => {
      const changeTypes = new Set(['remove']);
      const result = commitMessageService.getMainChangeType(changeTypes);
      assert.strictEqual(result, 'remove');
    });

    it('should return modify as fallback', () => {
      const changeTypes = new Set(['unknown']);
      const result = commitMessageService.getMainChangeType(changeTypes);
      assert.strictEqual(result, 'modify');
    });
  });

  describe('cache functionality', () => {
    it('should create cache keys correctly', () => {
      const files = [
        { fileName: 'test.js', type: 'added' },
        { fileName: 'app.js', type: 'modified' }
      ];
      const summary = 'test summary';
      
      const key = commitMessageService.createCacheKey(files, summary);
      
      assert.ok(key.includes('app.js:modified'));
      assert.ok(key.includes('test.js:added'));
      assert.ok(key.includes('test summary'));
    });

    it('should clear cache', () => {
      commitMessageService.cacheMessage('test', 'message');
      assert.strictEqual(commitMessageService.getCacheStats().size, 1);
      
      commitMessageService.clearCache();
      assert.strictEqual(commitMessageService.getCacheStats().size, 0);
    });

    it('should return cache statistics', () => {
      const stats = commitMessageService.getCacheStats();
      
      assert.ok(typeof stats.size === 'number');
      assert.ok(typeof stats.timeout === 'number');
      assert.strictEqual(stats.timeout, 5 * 60 * 1000); // 5 minutes
    });
  });
});