import { describe, expect, it } from "vitest";
import { addOrbitChild, assembleTree, defaultSize, documentWithText, dropOrbitItem, folderTreeContainsId, patchOrbitItem, type OrbitItem } from "./orbit-item";

function item(partial: Partial<OrbitItem> & Pick<OrbitItem, "id" | "title">): OrbitItem {
  return {
    body: {},
    checked: false,
    children: [],
    coverPath: null,
    coverUrl: null,
    dueDate: null,
    height: 1,
    imagePath: null,
    imageUrl: null,
    kind: "note",
    ogDescription: null,
    ogImagePath: null,
    ogImageUrl: null,
    ogTitle: null,
    parentId: null,
    positionX: 0,
    positionY: 0,
    price: null,
    sortOrder: 0,
    spaceId: null,
    status: null,
    url: null,
    width: 1,
    ...partial,
  } as OrbitItem;
}

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

describe("documentWithText", () => {
  it("builds a tip-tap doc from pasted lines", () => {
    expect(documentWithText("hola\nmundo")).toEqual({
      content: [
        { content: [{ text: "hola", type: "text" }], type: "paragraph" },
        { content: [{ text: "mundo", type: "text" }], type: "paragraph" },
      ],
      type: "doc",
    });
  });
});

describe("addOrbitChild", () => {
  it("appends a root when parentId is null", () => {
    const roots = [item({ id: "a", title: "A" })];
    const next = addOrbitChild(roots, null, item({ id: "b", title: "B" }));
    expect(next.map((node) => node.id)).toEqual(["a", "b"]);
  });

  it("nests a child under its parent", () => {
    const roots = [item({ id: "a", kind: "folder", title: "Maleta" })];
    const next = addOrbitChild(roots, "a", item({ id: "b", kind: "check_item", parentId: "a", title: "Cepillo" }));
    expect(next[0]?.children.map((node) => node.id)).toEqual(["b"]);
  });
});

describe("patchOrbitItem", () => {
  it("updates a nested check item", () => {
    const roots = [item({
      id: "a",
      kind: "folder",
      title: "Maleta",
      children: [item({ id: "b", kind: "check_item", parentId: "a", title: "Cepillo" })],
    })];
    const next = patchOrbitItem(roots, "b", { checked: true });
    expect(next[0]?.children[0]?.checked).toBe(true);
  });
});

describe("folderTreeContainsId", () => {
  it("finds a nested folder id in the tree", () => {
    const roots = [item({
      id: "root",
      kind: "folder",
      title: "Raíz",
      children: [item({ id: "nested", kind: "folder", parentId: "root", title: "Sub" })],
    })];
    expect(folderTreeContainsId(roots[0]!, "nested")).toBe(true);
    expect(folderTreeContainsId(roots[0]!, "root")).toBe(true);
    expect(folderTreeContainsId(roots[0]!, "missing")).toBe(false);
  });
});

describe("dropOrbitItem", () => {
  it("removes a nested child without dropping the parent", () => {
    const roots = [item({
      id: "a",
      kind: "folder",
      title: "Maleta",
      children: [item({ id: "b", kind: "check_item", parentId: "a", title: "Cepillo" })],
    })];
    const next = dropOrbitItem(roots, "b");
    expect(next.map((node) => node.id)).toEqual(["a"]);
    expect(next[0]?.children).toEqual([]);
  });
});
