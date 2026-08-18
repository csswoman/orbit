export type ItemKind =
  | "folder"
  | "list"
  | "check_item"
  | "note"
  | "image"
  | "link"
  | "countdown";

export type NestingParent = { kind: ItemKind; parentId: string | null } | null;

const CANVAS_KINDS: ItemKind[] = ["folder", "list", "note", "image", "link", "countdown"];
const FOLDER_CHILD_KINDS: ItemKind[] = [...CANVAS_KINDS, "check_item"];

export function canCreateChild(parent: NestingParent, childKind: ItemKind): boolean {
  if (!parent) return CANVAS_KINDS.includes(childKind);
  if (parent.kind === "list") return childKind === "check_item";
  if (parent.kind === "folder") {
    if (childKind === "folder") return parent.parentId === null;
    return FOLDER_CHILD_KINDS.includes(childKind);
  }
  return false;
}

export type ProgressNode = {
  kind: ItemKind | string;
  checked?: boolean;
  children?: ProgressNode[];
};

export function packingProgress(node: ProgressNode): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const child of node.children ?? []) {
    if (child.kind === "check_item") {
      total += 1;
      if (child.checked) done += 1;
    }
    if (child.kind === "list" || child.kind === "folder") {
      const nested = packingProgress(child);
      done += nested.done;
      total += nested.total;
    }
  }
  return { done, total };
}
