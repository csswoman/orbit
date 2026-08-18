"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { addChildItem, createOrbitItem, deleteOrbitItem, duplicateOrbitItem, saveCheckItem, saveOrbitItemPosition, saveOrbitNote } from "@/app/(app)/item-actions";
import { parentIdForCreate, type ItemKind } from "@/lib/item-nesting";
import { isHttpUrl, linkTitleFromUrl } from "@/lib/item-url";
import { addOrbitChild, documentWithText, dropOrbitItem, findOrbitItem, patchOrbitItem, type OrbitItem, type OrbitItemKind } from "@/lib/orbit-item";
import { createClient } from "@/lib/supabase/client";

export function useOrbitCanvas({ getPosition, imageInput, initialItems, spaceId }: {
  getPosition: () => { x: number; y: number };
  imageInput: RefObject<HTMLInputElement | null>;
  initialItems: OrbitItem[];
  spaceId: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const imageParentRef = useRef<string | null>(null);

  function clearPendingImageParent() {
    imageParentRef.current = null;
  }

  function resolveParent(kind: ItemKind) {
    const open = openFolderId ? findOrbitItem(items, openFolderId) : null;
    if (!open || (open.kind !== "folder" && open.kind !== "list")) return null;
    return parentIdForCreate({ id: open.id, kind: open.kind, parentId: open.parentId }, kind);
  }

  function place(parentId: string | null, item: OrbitItem) {
    setItems((current) => addOrbitChild(current, parentId, item));
  }

  async function createAt(input: Parameters<typeof createOrbitItem>[0]) {
    setCreating(true);
    const result = await createOrbitItem(input);
    setCreating(false);
    if (!result.item) {
      setMessage(result.error ?? "No se pudo crear el elemento.");
      return null;
    }
    place(input.parentId ?? null, result.item);
    return result.item;
  }

  async function createItem(kind: OrbitItemKind, extra: { body?: Record<string, unknown>; dueDate?: string | null; imagePath?: string | null; title?: string; url?: string | null } = {}) {
    const forcedParent = extra.imagePath ? imageParentRef.current : null;
    const parentId = forcedParent ?? resolveParent(kind);
    imageParentRef.current = null;
    const position = getPosition();
    const item = await createAt({ kind, parentId, spaceId, x: parentId ? 0 : position.x, y: parentId ? 0 : position.y, ...extra });
    if (item && kind === "note" && !parentId) setEditingId(item.id);
    return item;
  }

  async function addFromText(text: string) {
    if (isHttpUrl(text)) {
      await createItem("link", { title: linkTitleFromUrl(text), url: text });
      return;
    }
    await createItem("note", { body: documentWithText(text), title: "Texto" });
  }

  async function addLink(parentId?: string) {
    const raw = window.prompt("URL del enlace")?.trim();
    if (!raw) return;
    if (!isHttpUrl(raw)) {
      setMessage("Enlace no válido.");
      return;
    }
    if (parentId) {
      await createAt({ kind: "link", parentId, spaceId, title: linkTitleFromUrl(raw), url: raw, x: 0, y: 0 });
      return;
    }
    await createItem("link", { title: linkTitleFromUrl(raw), url: raw });
  }

  async function addImage(file?: File) {
    if (!file || !file.type.match(/^image\/(avif|jpeg|png|webp)$/) || file.size > 10 * 1024 * 1024) {
      imageParentRef.current = null;
      if (file) setMessage("Usa JPG, PNG, WebP o AVIF de hasta 10 MB.");
      return;
    }
    const supabase = createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (!userId) {
      setMessage("Tu sesión terminó. Vuelve a entrar.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("orbit-canvas").upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setMessage("No se pudo subir la imagen.");
      return;
    }
    const item = await createItem("image", { imagePath: path, title: file.name.replace(/\.[^.]+$/, "") });
    if (!item) {
      await supabase.storage.from("orbit-canvas").remove([path]);
      return;
    }
    setItems((current) => patchOrbitItem(current, item.id, { imageUrl: URL.createObjectURL(file) }));
  }

  async function addChild(parentId: string, kind: ItemKind): Promise<"image" | void> {
    if (kind === "image") {
      imageParentRef.current = parentId;
      imageInput.current?.click();
      return "image";
    }
    if (kind === "link") {
      await addLink(parentId);
      return;
    }
    if (kind === "countdown") {
      const dueDate = window.prompt("Fecha (YYYY-MM-DD)")?.trim();
      if (!dueDate) return;
      await createAt({ dueDate, kind: "countdown", parentId, spaceId, x: 0, y: 0 });
      return;
    }
    const result = await addChildItem({ kind, parentId, spaceId });
    if (!result.item) {
      setMessage(result.error ?? "No se pudo crear el elemento.");
      return;
    }
    place(parentId, result.item);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, [contenteditable='true']")) return;
      if (event.key.toLowerCase() === "n") { event.preventDefault(); void createItem("note"); }
      if (event.key.toLowerCase() === "t") { event.preventDefault(); void createItem("list"); }
      if (event.key.toLowerCase() === "i") { event.preventDefault(); clearPendingImageParent(); imageInput.current?.click(); }
    };
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, [contenteditable='true']")) return;
      const image = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
      if (image) { event.preventDefault(); void addImage(image); return; }
      const text = event.clipboardData?.getData("text/plain").trim();
      if (text) { event.preventDefault(); void addFromText(text); }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  });

  return {
    addChild,
    addImage,
    addLink,
    clearPendingImageParent,
    childAdded(parentId: string, child: OrbitItem) { place(parentId, child); },
    createItem,
    creating,
    duplicateItem: async (item: OrbitItem) => {
      const result = await duplicateOrbitItem(item.id);
      if (!result.item) { setMessage(result.error ?? "No se pudo duplicar el elemento."); return; }
      place(result.item.parentId, { ...result.item, imageUrl: item.imageUrl });
    },
    editingId,
    items,
    message,
    moveItem(id: string, positionX: number, positionY: number) {
      setItems((current) => patchOrbitItem(current, id, { positionX, positionY }));
      void saveOrbitItemPosition({ id, x: positionX, y: positionY });
    },
    openFolderId,
    removeItem(item: OrbitItem) {
      if (item.kind === "folder" && item.children.length > 0 && !window.confirm("¿Borrar esta carpeta y todo lo de dentro?")) return;
      setItems((current) => dropOrbitItem(current, item.id));
      if (openFolderId === item.id) setOpenFolderId(null);
      void deleteOrbitItem(item.id);
    },
    saveNote(next: { body: Record<string, unknown>; id: string; title: string }) {
      setItems((current) => patchOrbitItem(current, next.id, next));
      void saveOrbitNote(next);
    },
    setEditingId,
    setMessage,
    setOpenFolderId,
    toggleCheck(id: string, checked: boolean) {
      setItems((current) => patchOrbitItem(current, id, { checked }));
      void saveCheckItem({ id, checked });
    },
  };
}
