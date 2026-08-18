import { describe, expect, it } from "vitest";

import { clonedMediaPath, clonedOgPath, storagePathExtension } from "./canvas-clone-path";

describe("storagePathExtension", () => {
  it("keeps the dotted extension from the object name", () => {
    expect(storagePathExtension("user/abc.webp")).toBe(".webp");
    expect(storagePathExtension("user/og/item.jpg")).toBe(".jpg");
  });

  it("returns empty when the name has no extension", () => {
    expect(storagePathExtension("user/abc")).toBe("");
  });
});

describe("clonedMediaPath", () => {
  it("puts a unique object under the user prefix with the same extension", () => {
    expect(clonedMediaPath("user-1", "src-id", "user-1/old.png")).toBe("user-1/src-id.png");
  });
});

describe("clonedOgPath", () => {
  it("uses the og folder and the new item id", () => {
    expect(clonedOgPath("user-1", "new-item")).toBe("user-1/og/new-item.jpg");
  });
});
