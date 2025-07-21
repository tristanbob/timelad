/**
 * Simple unit test to verify test setup
 */

const assert = require("assert");
const { describe, it } = require("mocha");

describe("Test Setup", () => {
  it("should run basic assertions", () => {
    assert.strictEqual(1 + 1, 2);
    assert.ok(true);
  });

  it("should handle async operations", async () => {
    const result = await Promise.resolve(42);
    assert.strictEqual(result, 42);
  });

  it("should work with objects", () => {
    const obj = { name: "test", value: 123 };
    assert.strictEqual(obj.name, "test");
    assert.strictEqual(obj.value, 123);
  });
});