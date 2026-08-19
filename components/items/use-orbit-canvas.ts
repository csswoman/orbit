"use client";

import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";

import { addChildItem, createOrbitItem, deleteOrbitItem, duplicateOrbitItem, hydrateLinkPreview, saveCheckItem, saveOrbitCover, saveOrbitItemPosition, saveOrbitNote } from "@/app/(app)/item-actions";
import { shouldClearPendingImageParent } from "@/lib/image-picker";
import { parentIdForCreate, type ItemKind } from "@/lib/item-nesting";
import { isHttpUrl, linkTitleFromUrl } from "@/lib/item-url";
import { addOrbitChild, documentWithText, dropOrbitItem, findOrbitItem, folderTreeContainsId, patchOrbitItem, type OrbitItem, type OrbitItemKind } from "@/lib/orbit-item";
import { uploadCanvasImage } from "@/lib/upload-canvas-image";
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
  const coverTargetRef = useRef<string | null>(null);
  const pickerOpenRef = useRef(false);

  function clearPendingImageParent() {
    imageParentRef.current = null;
  }

  function openImagePicker(clearParent = false) {
    if (clearParent) clearPendingImageParent();
    pickerOpenRef.current = true;
    imageInput.current?.click();
  }

  function openCoverPicker(folderId: string) {
    coverTargetRef.current = folderId;
    pickerOpenRef.current = true;
    imageInput.current?.click();
  }

  function finishImagePicker(hasSelectedFile: boolean) {
    if (shouldClearPendingImageParent(pickerOpenRef.current, hasSelectedFile)) {
      clearPendingImageParent();
    }
    if (!hasSelectedFile) coverTargetRef.current = null;
    pickerOpenRef.current = false;
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

  async function hydrateCreatedLink(item: OrbitItem | null) {
    if (!item) return;
    const result = await hydrateLinkPreview(item.id);
    if (result.item) applyItem(result.item);
  }

  function applyItem(item: OrbitItem) {
    setItems((current) => patchOrbitItem(current, item.id, item));
  }

  async function addFromText(text: string) {
    if (isHttpUrl(text)) {
      const item = await createItem("link", { title: linkTitleFromUrl(text), url: text });
      await hydrateCreatedLink(item);
      return;
    }
    await createItem("note", { body: documentWithText(text), title: "Texto" });
  }

  async function addLink(parentId?: string, providedUrl?: string) {
    const raw = (providedUrl ?? window.prompt("URL del enlace"))?.trim();
    if (!raw) return;
    if (!isHttpUrl(raw)) {
      setMessage("Enlace no válido.");
      return;
    }
    if (parentId) {
      const item = await createAt({ kind: "link", parentId, spaceId, title: linkTitleFromUrl(raw), url: raw, x: 0, y: 0 });
      await hydrateCreatedLink(item);
      return;
    }
    const item = await createItem("link", { title: linkTitleFromUrl(raw), url: raw });
    await hydrateCreatedLink(item);
  }

  async function addImage(file?: File) {
    const coverId = coverTargetRef.current;
    coverTargetRef.current = null;

    if (!file) {
      imageParentRef.current = null;
      return;
    }

    const uploaded = await uploadCanvasImage(file);
    if (uploaded.error || !uploaded.path) {
      imageParentRef.current = null;
      setMessage(uploaded.error ?? "No se pudo subir la imagen.");
      return;
    }

    if (coverId) {
      const result = await saveOrbitCover({ coverPath: uploaded.path, id: coverId });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setItems((current) =>
        patchOrbitItem(current, coverId, {
          coverPath: uploaded.path,
          coverUrl: result.coverUrl ?? uploaded.previewUrl ?? null,
        }),
      );
      return;
    }

    const item = await createItem("image", {
      imagePath: uploaded.path,
      title: file.name.replace(/\.[^.]+$/, "") || "Imagen",
    });
    if (!item) {
      const supabase = createClient();
      await supabase.storage.from("orbit-canvas").remove([uploaded.path]);
      if (uploaded.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(uploaded.previewUrl);
      return;
    }
    if (uploaded.previewUrl) {
      setItems((current) => patchOrbitItem(current, item.id, { imageUrl: uploaded.previewUrl ?? null }));
    }
  }

  async function addChild(parentId: string, kind: ItemKind): Promise<"image" | void> {
    if (kind === "image") {
      imageParentRef.current = parentId;
      openImagePicker();
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
    function onWindowFocus() {
      finishImagePicker(Boolean(imageInput.current?.files?.length));
    }
    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, [contenteditable='true']")) return;
      if (event.key.toLowerCase() === "n") { event.preventDefault(); void createItem("note"); }
      if (event.key.toLowerCase() === "t") { event.preventDefault(); void createItem("list"); }
      if (event.key.toLowerCase() === "i") { event.preventDefault(); openImagePicker(true); }
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
    applyItem,
    clearPendingImageParent,
    closeFolder(id: string, parentId: string | null) {
      if (openFolderId !== id) return;
      setOpenFolderId(parentId);
    },
    childAdded(parentId: string, child: OrbitItem) { place(parentId, child); },
    createItem,
    creating,
    duplicateItem: async (item: OrbitItem) => {
      const result = await duplicateOrbitItem(item.id);
      if (!result.item) { setMessage(result.error ?? "No se pudo duplicar el elemento."); return; }
      place(result.item.parentId, { ...result.item, imageUrl: item.imageUrl });
    },
    editingId,
    imageInputHandlers: {
      onCancel: () => finishImagePicker(false),
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        finishImagePicker(Boolean(file));
        void addImage(file);
        event.target.value = "";
      },
    },
    items,
    message,
    moveItem(id: string, positionX: number, positionY: number) {
      setItems((current) => patchOrbitItem(current, id, { positionX, positionY }));
      void saveOrbitItemPosition({ id, x: positionX, y: positionY });
    },
    openCoverPicker,
    openFolderId,
    openImagePicker,
    removeItem(item: OrbitItem) {
      if (item.kind === "folder" && item.children.length > 0 && !window.confirm("¿Borrar esta carpeta y todo lo de dentro?")) return;
      setItems((current) => dropOrbitItem(current, item.id));
      if (openFolderId === item.id || (openFolderId && item.kind === "folder" && folderTreeContainsId(item, openFolderId))) setOpenFolderId(null);
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
