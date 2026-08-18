import { describe, expect, it } from "vitest";
import { allowedChildKinds, canCreateChild, packingProgress, parentIdForCreate } from "./item-nesting";

describe("canCreateChild", () => {
  it("allows any canvas kind except check_item on the root", () => {
    expect(canCreateChild(null, "folder")).toBe(true);
    expect(canCreateChild(null, "note")).toBe(true);
    expect(canCreateChild(null, "check_item")).toBe(false);
  });

  it("allows a subfolder only inside a root folder", () => {
    expect(canCreateChild({ kind: "folder", parentId: null }, "folder")).toBe(true);
    expect(canCreateChild({ kind: "folder", parentId: "abc" }, "folder")).toBe(false);
  });

  it("allows leaves inside a folder including check_item", () => {
    const folder = { kind: "folder" as const, parentId: null };
    expect(canCreateChild(folder, "list")).toBe(true);
    expect(canCreateChild(folder, "note")).toBe(true);
    expect(canCreateChild(folder, "check_item")).toBe(true);
  });

  it("allows only check_item inside a list", () => {
    const list = { kind: "list" as const, parentId: "folder-1" };
    expect(canCreateChild(list, "check_item")).toBe(true);
    expect(canCreateChild(list, "note")).toBe(false);
  });

  it("rejects children of leaf kinds", () => {
    expect(canCreateChild({ kind: "note", parentId: null }, "note")).toBe(false);
  });
});

describe("allowedChildKinds", () => {
  it("includes folder for a root folder", () => {
    expect(allowedChildKinds({ kind: "folder", parentId: null })).toContain("folder");
  });

  it("does not include folder for a subfolder", () => {
    expect(allowedChildKinds({ kind: "folder", parentId: "abc" })).not.toContain("folder");
  });

  it("allows only check_item for a list", () => {
    expect(allowedChildKinds({ kind: "list", parentId: "folder-1" })).toEqual(["check_item"]);
  });
});

describe("parentIdForCreate", () => {
  it("uses the open folder when the kind is allowed", () => {
    const open = { id: "folder-1", kind: "folder" as const, parentId: null };
    expect(parentIdForCreate(open, "note")).toBe("folder-1");
  });

  it("falls back to root when the kind is not allowed", () => {
    const open = { id: "sub", kind: "folder" as const, parentId: "root" };
    expect(parentIdForCreate(open, "folder")).toBe(null);
  });
});

describe("packingProgress", () => {
  it("counts check_items in the folder, nested lists, and one subfolder", () => {
    const folder = {
      kind: "folder" as const,
      children: [
        { kind: "check_item" as const, checked: true, children: [] },
        { kind: "list" as const, children: [
          { kind: "check_item" as const, checked: true, children: [] },
          { kind: "check_item" as const, checked: false, children: [] },
        ] },
        { kind: "folder" as const, children: [
          { kind: "check_item" as const, checked: true, children: [] },
        ] },
        { kind: "note" as const, checked: false, children: [] },
      ],
    };
    expect(packingProgress(folder)).toEqual({ done: 3, total: 4 });
  });
});
