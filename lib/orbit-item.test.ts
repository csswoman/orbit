import { describe, expect, it } from "vitest";
import { assembleTree, defaultSize } from "./orbit-item";

describe("assembleTree", () => {
  it("nests children under parents and keeps roots", () => {
    const rows = [
      { id: "a", parentId: null, title: "Maleta" },
      { id: "b", parentId: "a", title: "Cepillo" },
      { id: "c", parentId: null, title: "Nota" },
    ];
    const tree = assembleTree(rows.map((row) => ({
      ...row, body: {}, checked: false, children: [], coverPath: null, coverUrl: null,
      dueDate: null, height: 1, imagePath: null, imageUrl: null, kind: "note" as const,
      ogDescription: null, ogImagePath: null, ogImageUrl: null, ogTitle: null,
      positionX: 0, positionY: 0, price: null, sortOrder: 0, spaceId: null,
      status: null, url: null, width: 1,
    })));
    expect(tree.map((n) => n.id)).toEqual(["a", "c"]);
    expect(tree[0]?.children.map((n) => n.id)).toEqual(["b"]);
  });
});

describe("defaultSize", () => {
  it("returns folder size", () => {
    expect(defaultSize("folder")).toEqual({ width: 220, height: 260 });
  });
});
