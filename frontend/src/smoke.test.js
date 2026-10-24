import { describe, it, expect } from "vitest";

/**
 * Smoke test - verifies the test runner is wired up.
 * Does NOT import any business-logic module.
 */
describe("smoke", () => {
  it("runs at least one test", () => {
    expect(true).toBe(true);
  });
});
