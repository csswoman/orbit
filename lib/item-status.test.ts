import { describe, expect, it } from "vitest";
import { statusOptionsFor, showsStatus } from "./item-status";

describe("statusOptionsFor", () => {
  it("returns travel folder options", () => {
    expect(statusOptionsFor("travel", "folder")).toEqual([
      { value: "pending", label: "Pendiente" },
      { value: "ready", label: "Listo" },
    ]);
  });

  it("returns sales folder options", () => {
    expect(statusOptionsFor("sales", "folder").map((o) => o.value)).toEqual(["available", "sold"]);
  });

  it("returns jobs link options", () => {
    expect(statusOptionsFor("jobs", "link").map((o) => o.value)).toEqual([
      "saved", "applied", "interview", "offer", "rejected",
    ]);
  });

  it("hides status on home and on unmatched kinds", () => {
    expect(statusOptionsFor(null, "folder")).toEqual([]);
    expect(showsStatus("wishlist", "folder")).toBe(false);
  });
});
