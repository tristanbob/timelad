const assert = require('assert');
const sinon = require('sinon');

// Import the CommitMessageService directly
const { CommitMessageService } = require('../../out/services/CommitMessageService');

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

    it('should handle empty file list', async () => {
      const files = [];
      const summary = 'no changes';

      const message = await commitMessageService.generateCommitMessage(files, summary);
      
      assert.strictEqual(typeof message, 'string');
      assert.ok(message.length > 0);
    });
  });

  describe('clearCache', () => {
    it('should be a function', () => {
      assert.strictEqual(typeof commitMessageService.clearCache, 'function');
    });
  });
});