"use client";
/* eslint-disable @next/next/no-img-element -- signed, user-uploaded URLs cannot be declared as fixed Next image hosts. */

import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CheckSquare2, Copy, Edit3, Expand, ImagePlus, Link2, MousePointer2, Settings2, StickyNote, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { createHomeCanvasItem, deleteHomeCanvasItem, duplicateHomeCanvasItem, saveHomeCanvasItem } from "@/app/(app)/home-canvas-actions";
import { createClient } from "@/lib/supabase/client";
import type { HomeCanvasData, HomeCanvasItem, HomeCanvasKind } from "@/lib/home-canvas";

class CanvasPointerSensor extends PointerSensor {
  static activators = [{
    eventName: "onPointerDown" as const,
    handler: ({ nativeEvent }: { nativeEvent: PointerEvent }) => {
      const target = nativeEvent.target;
      return target instanceof Element && !target.closest("button, input, textarea, a, [contenteditable='true'], [data-no-dnd]");
    },
  }];
}

const positions = [{ x: 8, y: 12 }, { x: 40, y: 16 }, { x: 66, y: 32 }, { x: 20, y: 54 }];

export function HomeCanvas({ data }: { data: HomeCanvasData }) {
  const [items, setItems] = useState(data.status === "ready" ? data.items : []);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<HomeCanvasItem | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const didDragRef = useRef(false);
  const sensors = useSensors(useSensor(CanvasPointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const canPersist = data.status === "ready";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, [contenteditable='true']")) return;
      if (event.key.toLowerCase() === "n") { event.preventDefault(); void createItem("note"); }
      if (event.key.toLowerCase() === "t") { event.preventDefault(); void createItem("task"); }
      if (event.key.toLowerCase() === "i") { event.preventDefault(); imageInput.current?.click(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, [contenteditable='true']")) return;
      const image = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
      if (image) { event.preventDefault(); void uploadImage(image); return; }
      const text = event.clipboardData?.getData("text/plain").trim();
      if (text) { event.preventDefault(); void createFromText(text); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  function nextPosition() { return positions[items.length % positions.length]; }

  async function createItem(kind: "note" | "task") {
    const position = nextPosition();
    const content = kind === "note" ? { body: "Una idea que quiero recordar…", title: "Nota" } : { body: "Nueva tarea", checked: false, title: "Hoy" };
    if (!canPersist) {
      setItems((current) => [...current, localItem({ content, kind, positionX: position.x, positionY: position.y })]);
      return;
    }
    const result = await createHomeCanvasItem({ content, kind, positionX: position.x, positionY: position.y });
    if (!result.item) { setMessage(result.error ?? "No se pudo crear el elemento."); return; }
    setItems((current) => [...current, { ...result.item, imageUrl: null }]);
  }

  async function createFromText(text: string) {
    const position = nextPosition();
    const url = safeUrl(text);
    const kind: HomeCanvasKind = url ? "link" : "note";
    const content = url ? { title: new URL(url).hostname, url } : { body: text.slice(0, 5000), title: "Texto" };
    if (!canPersist) {
      setItems((current) => [...current, localItem({ content, kind, positionX: position.x, positionY: position.y })]);
      return;
    }
    const result = await createHomeCanvasItem({ content, kind, positionX: position.x, positionY: position.y });
    if (!result.item) { setMessage(result.error ?? "No se pudo crear el elemento."); return; }
    setItems((current) => [...current, { ...result.item, imageUrl: null }]);
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    if (!file.type.match(/^image\/(avif|jpeg|png|webp)$/) || file.size > 10 * 1024 * 1024) { setMessage("Usa JPG, PNG, WebP o AVIF de hasta 10 MB."); return; }
    const position = nextPosition();
    if (!canPersist) {
      setItems((current) => [...current, localItem({ content: { title: file.name.replace(/\.[^.]+$/, "") }, imageUrl: URL.createObjectURL(file), kind: "image", positionX: position.x, positionY: position.y })]);
      return;
    }
    const supabase = createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (!userId) { setMessage("Tu sesión terminó. Vuelve a entrar."); return; }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("orbit-canvas").upload(path, file, { contentType: file.type, upsert: false });
    if (error) { setMessage("No se pudo subir la imagen. Verifica la migración y vuelve a intentarlo."); return; }
    const result = await createHomeCanvasItem({ content: { title: file.name.replace(/\.[^.]+$/, "") }, imagePath: path, kind: "image", positionX: position.x, positionY: position.y });
    if (!result.item) { await supabase.storage.from("orbit-canvas").remove([path]); setMessage(result.error ?? "No se pudo crear la imagen."); return; }
    setItems((current) => [...current, { ...result.item, imageUrl: URL.createObjectURL(file) }]);
  }

  function updateItem(next: HomeCanvasItem) {
    setItems((current) => current.map((item) => item.id === next.id ? next : item));
    if (canPersist) void saveHomeCanvasItem({ content: next.content, id: next.id, positionX: next.positionX, positionY: next.positionY });
  }

  async function duplicateItem(item: HomeCanvasItem) {
    if (!canPersist) { setItems((current) => [...current, { ...item, id: crypto.randomUUID(), positionX: Math.min(92, item.positionX + 4), positionY: Math.min(92, item.positionY + 4) }]); return; }
    const result = await duplicateHomeCanvasItem(item.id);
    if (!result.item) { setMessage(result.error ?? "No se pudo duplicar el elemento."); return; }
    setItems((current) => [...current, { ...result.item, imageUrl: item.imageUrl }]);
  }

  function deleteItem(item: HomeCanvasItem) {
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    if (canPersist) void deleteHomeCanvasItem(item.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.delta.x && !event.delta.y) return;
    const board = boardRef.current;
    if (!board) return;
    const id = String(event.active.id);
    const current = items.find((item) => item.id === id);
    if (!current) return;
    updateItem({ ...current, positionX: clamp(current.positionX + event.delta.x / board.clientWidth * 100), positionY: clamp(current.positionY + event.delta.y / board.clientHeight * 100) });
  }

  return (
    <section className="home-canvas-shell" aria-label="Home creativo">
      <header className="home-canvas-toolbar">
        <div className="home-canvas-tools" aria-label="Herramientas del lienzo">
          <span className="home-canvas-tools__current"><MousePointer2 aria-hidden="true" /> Mover <kbd>V</kbd></span>
          <button aria-label="Crear una nota (N)" onClick={() => void createItem("note")} title="Nota · N" type="button"><StickyNote aria-hidden="true" /><span>Nota</span></button>
          <button aria-label="Crear una tarea (T)" onClick={() => void createItem("task")} title="Tarea · T" type="button"><CheckSquare2 aria-hidden="true" /><span>Tarea</span></button>
          <button aria-label="Añadir una imagen (I)" onClick={() => imageInput.current?.click()} title="Imagen · I" type="button"><ImagePlus aria-hidden="true" /><span>Imagen</span></button>
          <Link aria-label="Ajustar apariencia" href="/settings"><Settings2 aria-hidden="true" /><span>Ajustar</span></Link>
        </div>
        <input accept="image/avif,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void uploadImage(event.target.files?.[0]); event.target.value = ""; }} ref={imageInput} type="file" />
      </header>
      {message ? <p className="home-canvas-message" role="status">{message}<button aria-label="Cerrar mensaje" onClick={() => setMessage(null)} type="button"><X aria-hidden="true" /></button></p> : null}
      <DndContext onDragEnd={(event) => { handleDragEnd(event); window.setTimeout(() => { didDragRef.current = false; }, 0); }} onDragStart={() => { didDragRef.current = true; }} sensors={sensors}>
        <div className="home-canvas-board" ref={boardRef}>
          {items.map((item) => <CanvasItem item={item} key={item.id} onChange={updateItem} onDelete={deleteItem} onDuplicate={() => void duplicateItem(item)} onExpand={() => { if (!didDragRef.current) setExpandedImage(item); }} />)}
        </div>
      </DndContext>
      {expandedImage?.imageUrl ? <div aria-label="Imagen ampliada" aria-modal="true" className="canvas-image-lightbox" onMouseDown={(event) => { if (event.target === event.currentTarget) setExpandedImage(null); }} role="dialog"><button aria-label="Cerrar imagen" className="canvas-image-lightbox__close" onClick={() => setExpandedImage(null)} type="button"><X aria-hidden="true" /></button><img alt={expandedImage.content.title || "Imagen ampliada"} src={expandedImage.imageUrl} /></div> : null}
    </section>
  );
}

function CanvasItem({ item, onChange, onDelete, onDuplicate, onExpand }: { item: HomeCanvasItem; onChange: (item: HomeCanvasItem) => void; onDelete: (item: HomeCanvasItem) => void; onDuplicate: () => void; onExpand: () => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id });
  const style = { "--home-x": `${item.positionX}%`, "--home-y": `${item.positionY}%`, transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined } as CSSProperties;
  const updateContent = (content: HomeCanvasItem["content"]) => onChange({ ...item, content });
  const [editing, setEditing] = useState(false);
  return <article {...attributes} {...listeners} className={`home-item home-item--${item.kind}`} ref={setNodeRef} style={style}>
    <ElementControls editing={editing} onDelete={() => onDelete(item)} onDuplicate={onDuplicate} onEdit={() => setEditing((value) => !value)} onExpand={item.kind === "image" ? onExpand : undefined} />
    {item.kind === "image" ? <><img alt="Imagen de tu lienzo" draggable={false} onClick={onExpand} src={item.imageUrl ?? ""} /><input aria-label="Texto sobre la imagen" data-no-dnd onBlur={(event) => updateContent({ ...item.content, title: event.target.value })} defaultValue={item.content.title ?? ""} placeholder="Escribe sobre la imagen…" />{editing ? <textarea aria-label="Descripción opcional" className="canvas-item-description" data-no-dnd defaultValue={item.content.body ?? ""} onBlur={(event) => updateContent({ ...item.content, body: event.target.value })} placeholder="Añade una descripción opcional" /> : null}</> : null}
    {item.kind === "note" ? <><input aria-label="Título de la nota" data-no-dnd defaultValue={item.content.title ?? "Nota"} onBlur={(event) => updateContent({ ...item.content, title: event.target.value })} /><textarea aria-label="Texto de la nota" data-no-dnd defaultValue={item.content.body ?? ""} onBlur={(event) => updateContent({ ...item.content, body: event.target.value })} /></> : null}
    {item.kind === "task" ? <label><input aria-label="Completar tarea" checked={Boolean(item.content.checked)} data-no-dnd onChange={(event) => updateContent({ ...item.content, checked: event.target.checked })} type="checkbox" /><textarea aria-label="Texto de la tarea" data-no-dnd defaultValue={item.content.body ?? ""} onBlur={(event) => updateContent({ ...item.content, body: event.target.value })} /></label> : null}
    {item.kind === "link" && item.content.url ? <><a href={item.content.url} rel="noreferrer" target="_blank"><Link2 aria-hidden="true" /><span><strong>{item.content.title}</strong><small>{item.content.url}</small></span></a>{editing ? <textarea aria-label="Descripción opcional" className="canvas-item-description" data-no-dnd defaultValue={item.content.body ?? ""} onBlur={(event) => updateContent({ ...item.content, body: event.target.value })} placeholder="Añade una descripción opcional" /> : null}</> : null}
  </article>;
}

function ElementControls({ editing, onDelete, onDuplicate, onEdit, onExpand }: { editing: boolean; onDelete: () => void; onDuplicate: () => void; onEdit: () => void; onExpand?: () => void }) {
  return <div className="canvas-element-controls" data-no-dnd><button aria-label="Editar descripción" aria-pressed={editing} onClick={onEdit} type="button"><Edit3 aria-hidden="true" /></button>{onExpand ? <button aria-label="Ampliar imagen" onClick={onExpand} type="button"><Expand aria-hidden="true" /></button> : null}<button aria-label="Duplicar elemento" onClick={onDuplicate} type="button"><Copy aria-hidden="true" /></button><button aria-label="Eliminar elemento" className="is-danger" onClick={onDelete} type="button"><Trash2 aria-hidden="true" /></button></div>;
}

function clamp(value: number) { return Math.min(92, Math.max(1, Math.round(value * 100) / 100)); }

function localItem(input: Omit<HomeCanvasItem, "id" | "imagePath" | "imageUrl"> & { imageUrl?: string | null }): HomeCanvasItem {
  return { ...input, id: crypto.randomUUID(), imagePath: null, imageUrl: input.imageUrl ?? null };
}

function safeUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; }
}
