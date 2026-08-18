import { describe, expect, it } from "vitest";

import {
  extensionForMime,
  fileStem,
  isAllowedImage,
  MAX_IMAGE_BYTES,
} from "./compress-image";

describe("isAllowedImage", () => {
  it("allows png jpeg webp avif", () => {
    expect(isAllowedImage("image/png")).toBe(true);
    expect(isAllowedImage("image/jpeg")).toBe(true);
    expect(isAllowedImage("image/webp")).toBe(true);
    expect(isAllowedImage("image/avif")).toBe(true);
  });

  it("rejects other mime types", () => {
    expect(isAllowedImage("image/gif")).toBe(false);
    expect(isAllowedImage("application/pdf")).toBe(false);
  });
});

describe("fileStem", () => {
  it("stems the filename", () => {
    expect(fileStem("Maleta.PNG")).toBe("Maleta");
    expect(fileStem("sin-extension")).toBe("sin-extension");
  });

  it("falls back when the name is only an extension", () => {
    expect(fileStem(".png")).toBe("Imagen");
  });
});

describe("extensionForMime", () => {
  it("maps supported mime types to extensions", () => {
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/webp")).toBe("webp");
    expect(extensionForMime("image/avif")).toBe("avif");
  });
});

describe("MAX_IMAGE_BYTES", () => {
  it("allows files up to 10 MB before compression", () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
  });
});
