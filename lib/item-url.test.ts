import { describe, expect, it } from "vitest";
import { isHttpUrl, linkTitleFromUrl } from "./item-url";

describe("isHttpUrl", () => {
  it("accepts http and https only", () => {
    expect(isHttpUrl("https://jobs.example/role")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("nota suelta")).toBe(false);
  });
});

describe("linkTitleFromUrl", () => {
  it("uses hostname", () => {
    expect(linkTitleFromUrl("https://www.example.com/path")).toBe("www.example.com");
  });
});
