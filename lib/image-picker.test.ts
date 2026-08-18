import { describe, expect, it } from "vitest";

import { shouldClearPendingImageParent } from "./image-picker";

describe("shouldClearPendingImageParent", () => {
  it("clears when the picker closed without a file", () => {
    expect(shouldClearPendingImageParent(true, false)).toBe(true);
  });

  it("keeps pending parent when a file was selected", () => {
    expect(shouldClearPendingImageParent(true, true)).toBe(false);
  });

  it("ignores focus when the picker was not opened", () => {
    expect(shouldClearPendingImageParent(false, false)).toBe(false);
  });
});
