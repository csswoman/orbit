import { describe, expect, it } from "vitest";

import { shouldDeletePendingUpload, shouldReleasePendingUpload } from "./pending-upload";

describe("shouldReleasePendingUpload", () => {
  it("releases when the saved path is the pending upload", () => {
    expect(shouldReleasePendingUpload("user/a.webp", "user/a.webp")).toBe(true);
  });

  it("keeps pending when the row still points at a different path", () => {
    expect(shouldReleasePendingUpload("user/new.webp", "user/old.webp")).toBe(false);
  });

  it("does nothing without a pending path", () => {
    expect(shouldReleasePendingUpload(null, "user/a.webp")).toBe(false);
  });
});

describe("shouldDeletePendingUpload", () => {
  it("deletes an unsaved pending upload on unmount", () => {
    expect(shouldDeletePendingUpload("user/new.webp", "user/old.webp")).toBe(true);
    expect(shouldDeletePendingUpload("user/new.webp", null)).toBe(true);
  });

  it("does not delete the path the row now owns", () => {
    expect(shouldDeletePendingUpload("user/a.webp", "user/a.webp")).toBe(false);
  });

  it("does not delete when nothing is pending", () => {
    expect(shouldDeletePendingUpload(null, "user/a.webp")).toBe(false);
    expect(shouldDeletePendingUpload(null, null)).toBe(false);
  });
});
