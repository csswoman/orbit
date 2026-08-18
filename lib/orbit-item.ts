export type OrbitItemKind = "folder" | "list" | "check_item" | "note" | "image" | "link" | "countdown";

export const ORBIT_ITEM_KINDS: OrbitItemKind[] = [
  "folder",
  "list",
  "check_item",
  "note",
  "image",
  "link",
  "countdown",
];

export type OrbitItem = {
  body: Record<string, unknown>;
  checked: boolean;
  children: OrbitItem[];
  coverPath: string | null;
  coverUrl: string | null;
  dueDate: string | null;
  height: number;
  id: string;
  imagePath: string | null;
  imageUrl: string | null;
  kind: OrbitItemKind;
  ogDescription: string | null;
  ogImagePath: string | null;
  ogImageUrl: string | null;
  ogTitle: string | null;
  parentId: string | null;
  positionX: number;
  positionY: number;
  price: number | null;
  sortOrder: number;
  spaceId: string | null;
  status: string | null;
  title: string;
  url: string | null;
  width: number;
};

export type OrbitItemRow = {
  body: unknown;
  checked: boolean | null;
  cover_path: string | null;
  due_date: string | null;
  height: number | string;
  id: string;
  image_path: string | null;
  kind: string;
  og_description: string | null;
  og_image_path: string | null;
  og_title: string | null;
  parent_id: string | null;
  position_x: number | string;
  position_y: number | string;
  price: number | string | null;
  sort_order: number | string;
  space_id: string | null;
  status: string | null;
  title: string;
  url: string | null;
  width: number | string;
};

export function emptyDocument(): Record<string, unknown> {
  return { content: [{ type: "paragraph" }], type: "doc" };
}

export function documentWithText(text: string): Record<string, unknown> {
  return {
    content: text
      .slice(0, 5000)
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => ({ content: [{ text: line, type: "text" }], type: "paragraph" })),
    type: "doc",
  };
}

export function findOrbitItem(items: OrbitItem[], id: string): OrbitItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const nested = findOrbitItem(item.children, id);
    if (nested) return nested;
  }
  return null;
}

export function addOrbitChild(items: OrbitItem[], parentId: string | null, child: OrbitItem): OrbitItem[] {
  if (!parentId) return [...items, child];
  return items.map((item) => {
    if (item.id === parentId) return { ...item, children: [...item.children, child] };
    return { ...item, children: addOrbitChild(item.children, parentId, child) };
  });
}

export function patchOrbitItem(items: OrbitItem[], id: string, patch: Partial<OrbitItem>): OrbitItem[] {
  return items.map((item) => {
    if (item.id === id) return { ...item, ...patch, children: item.children };
    return { ...item, children: patchOrbitItem(item.children, id, patch) };
  });
}

export function dropOrbitItem(items: OrbitItem[], id: string): OrbitItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({ ...item, children: dropOrbitItem(item.children, id) }));
}

export function clampCanvas(value: number) {
  return Math.min(1_000_000, Math.max(-1_000_000, Math.round(value * 100) / 100));
}

export function defaultSize(kind: OrbitItemKind): { width: number; height: number } {
  switch (kind) {
    case "folder":
      return { width: 220, height: 260 };
    case "list":
      return { width: 320, height: 280 };
    case "note":
      return { width: 360, height: 300 };
    case "image":
      return { width: 400, height: 300 };
    case "link":
      return { width: 320, height: 148 };
    case "countdown":
      return { width: 240, height: 120 };
    case "check_item":
      return { width: 0, height: 0 };
  }
}

export function assembleTree(items: OrbitItem[]): OrbitItem[] {
  const nodes = new Map<string, OrbitItem>();
  for (const item of items) {
    nodes.set(item.id, { ...item, children: [] });
  }

  const roots: OrbitItem[] = [];
  for (const item of items) {
    const node = nodes.get(item.id);
    if (!node) continue;
    const parent = item.parentId ? nodes.get(item.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  for (const node of nodes.values()) {
    node.children.sort((left, right) => left.sortOrder - right.sortOrder);
  }

  return roots;
}

export function mapOrbitItemRow(
  row: OrbitItemRow,
  urls: { coverUrl?: string | null; imageUrl?: string | null; ogImageUrl?: string | null } = {},
): OrbitItem {
  return {
    body: isObject(row.body) ? row.body : emptyDocument(),
    checked: Boolean(row.checked),
    children: [],
    coverPath: row.cover_path,
    coverUrl: urls.coverUrl ?? null,
    dueDate: row.due_date,
    height: Number(row.height),
    id: row.id,
    imagePath: row.image_path,
    imageUrl: urls.imageUrl ?? null,
    kind: isOrbitItemKind(row.kind) ? row.kind : "note",
    ogDescription: row.og_description,
    ogImagePath: row.og_image_path,
    ogImageUrl: urls.ogImageUrl ?? null,
    ogTitle: row.og_title,
    parentId: row.parent_id,
    positionX: Number(row.position_x),
    positionY: Number(row.position_y),
    price: row.price == null ? null : Number(row.price),
    sortOrder: Number(row.sort_order),
    spaceId: row.space_id,
    status: row.status,
    title: row.title,
    url: row.url,
    width: Number(row.width),
  };
}

function isOrbitItemKind(value: string): value is OrbitItemKind {
  return ORBIT_ITEM_KINDS.includes(value as OrbitItemKind);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
