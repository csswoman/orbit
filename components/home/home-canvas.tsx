"use client";
/* eslint-disable @next/next/no-img-element -- signed, user-uploaded URLs cannot be declared as fixed Next image hosts. */

import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent, type DragMoveEvent } from "@dnd-kit/core";
import { CheckSquare2, Copy, Edit3, Expand, ImagePlus, Link2, Maximize2, Minus, MousePointer2, Plus, StickyNote, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { createHomeCanvasItem, deleteHomeCanvasItem, duplicateHomeCanvasItem, saveHomeCanvasItem } from "@/app/(app)/home-canvas-actions";
import { GradientBg } from "@/components/spaces/gradient-bg";
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

const positions = [{ x: 96, y: 96 }, { x: 480, y: 128 }, { x: 792, y: 256 }, { x: 240, y: 432 }];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

function estimateHomeItemSize(kind: HomeCanvasKind) {
  switch (kind) {
    case "image":
      return { height: 300, width: 400 };
    case "note":
      return { height: 192, width: 320 };
    case "task":
      return { height: 120, width: 320 };
    case "link":
      return { height: 80, width: 320 };
  }
}

function fitCameraToHomeItems(
  items: HomeCanvasItem[],
  viewport: HTMLElement | null,
  setCamera: (value: { x: number; y: number; zoom: number }) => void,
  cameraRef: { current: { x: number; y: number; zoom: number } },
) {
  const bounds = viewport?.getBoundingClientRect();
  if (!bounds || items.length === 0 || bounds.width < 64 || bounds.height < 64) return false;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    const size = estimateHomeItemSize(item.kind);
    minX = Math.min(minX, item.positionX);
    minY = Math.min(minY, item.positionY);
    maxX = Math.max(maxX, item.positionX + size.width);
    maxY = Math.max(maxY, item.positionY + size.height);
  }

  const padding = 96;
  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const centerX = minX + contentWidth / 2;
  const centerY = minY + contentHeight / 2;
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(
      MIN_ZOOM,
      Math.min(
        (bounds.width - padding * 2) / contentWidth,
        (bounds.height - padding * 2) / contentHeight,
      ),
    ),
  );

  const next = {
    x: bounds.width / 2 - centerX * zoom,
    y: bounds.height / 2 - centerY * zoom,
    zoom: Math.round(zoom * 100) / 100,
  };
  cameraRef.current = next;
  setCamera(next);
  return true;
}

export function HomeCanvas({ data }: { data: HomeCanvasData }) {
  const serverItems = data.status === "ready" ? data.items : null;
  const [items, setItems] = useState<HomeCanvasItem[]>(() => (data.status === "ready" ? data.items : []));
  const [syncedServerItems, setSyncedServerItems] = useState(serverItems);
  if (serverItems !== syncedServerItems) {
    setSyncedServerItems(serverItems);
    if (serverItems) setItems(serverItems);
  }

  const statusMessage =
    data.status === "error" ? "No se pudieron cargar los elementos del lienzo."
    : data.status === "unauthenticated" ? "Inicia sesión para ver tu lienzo."
    : data.status === "unconfigured" ? "Configura Supabase para usar el lienzo."
    : null;
  const [message, setMessage] = useState<string | null>(null);
  const activeMessage = message ?? statusMessage;
  const [expandedImage, setExpandedImage] = useState<HomeCanvasItem | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  const boardRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const didDragRef = useRef(false);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const dragCameraStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragCameraStart, setDragCameraStart] = useState<{ x: number; y: number } | null>(null);
  const sensors = useSensors(useSensor(CanvasPointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const canPersist = data.status === "ready";
  const didFitCameraRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || data.status !== "ready" || itemsRef.current.length === 0 || didFitCameraRef.current) return;

    const tryFit = () => {
      if (didFitCameraRef.current) return;
      if (fitCameraToHomeItems(itemsRef.current, node, setCamera, cameraRef)) {
        didFitCameraRef.current = true;
      }
    };

    tryFit();
    const observer = new ResizeObserver(tryFit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [data.status, items.length]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const shell = node;

    function onWheel(event: WheelEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      const bounds = shell.getBoundingClientRect();
      const activeCamera = cameraRef.current;
      const zoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.round((activeCamera.zoom - event.deltaY * 0.002) * 100) / 100),
      );
      const focusX = event.clientX - bounds.left;
      const focusY = event.clientY - bounds.top;
      const next = {
        x: focusX - ((focusX - activeCamera.x) / activeCamera.zoom) * zoom,
        y: focusY - ((focusY - activeCamera.y) / activeCamera.zoom) * zoom,
        zoom,
      };
      cameraRef.current = next;
      setCamera(next);
    }

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

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

  function nextPosition() {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return positions[items.length % positions.length];
    const offset = (items.length % positions.length) * 36;
    return { x: clamp((bounds.width / 2 - camera.x) / camera.zoom + offset), y: clamp((bounds.height / 2 - camera.y) / camera.zoom + offset) };
  }

  function changeZoom(nextZoom: number, focus?: { x: number; y: number }) {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(nextZoom * 100) / 100));
    setCamera((current) => {
      const bounds = viewportRef.current?.getBoundingClientRect();
      if (!bounds) { const next = { ...current, zoom }; cameraRef.current = next; return next; }
      const focusX = focus?.x ?? bounds.width / 2;
      const focusY = focus?.y ?? bounds.height / 2;
      const next = { x: focusX - ((focusX - current.x) / current.zoom) * zoom, y: focusY - ((focusY - current.y) / current.zoom) * zoom, zoom };
      cameraRef.current = next;
      return next;
    });
  }

  function resetCamera() {
    if (items.length > 0) {
      fitCameraToHomeItems(items, viewportRef.current, setCamera, cameraRef);
      return;
    }
    const next = { x: 0, y: 0, zoom: 1 };
    cameraRef.current = next;
    setCamera(next);
  }

  function startPan(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest(".home-canvas-toolbar, .canvas-view-controls, .home-item, button, a, input, textarea, select, [contenteditable='true']")) return;
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: cameraRef.current.x, y: cameraRef.current.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event: React.PointerEvent<HTMLElement>) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setCamera((current) => { const next = { ...current, x: pan.x + event.clientX - pan.startX, y: pan.y + event.clientY - pan.startY }; cameraRef.current = next; return next; });
  }

  function keepDraggedItemVisible(event: DragMoveEvent) {
    const bounds = viewportRef.current?.getBoundingClientRect();
    const rect = event.active.rect.current.translated;
    if (!bounds || !rect) return;
    const margin = 56;
    const x = rect.left < bounds.left + margin ? Math.min(24, bounds.left + margin - rect.left) : rect.right > bounds.right - margin ? -Math.min(24, rect.right - (bounds.right - margin)) : 0;
    const y = rect.top < bounds.top + margin ? Math.min(24, bounds.top + margin - rect.top) : rect.bottom > bounds.bottom - margin ? -Math.min(24, rect.bottom - (bounds.bottom - margin)) : 0;
    if (x || y) setCamera((current) => { const next = { ...current, x: current.x + x, y: current.y + y }; cameraRef.current = next; return next; });
  }

  function endPan(event: React.PointerEvent<HTMLElement>) {
    if (panRef.current?.pointerId !== event.pointerId) return;
    panRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

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
    const cameraStart = dragCameraStartRef.current;
    const activeCamera = cameraRef.current;
    const cameraOffset = cameraStart ? { x: activeCamera.x - cameraStart.x, y: activeCamera.y - cameraStart.y } : { x: 0, y: 0 };
    updateItem({ ...current, positionX: clamp(current.positionX + (event.delta.x - cameraOffset.x) / activeCamera.zoom), positionY: clamp(current.positionY + (event.delta.y - cameraOffset.y) / activeCamera.zoom) });
  }

  return (
    <section
      aria-label="Home creativo"
      className="home-canvas-shell"
      onPointerCancel={endPan}
      onPointerDown={startPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      ref={viewportRef}
    >
      <GradientBg className="canvas-gradient" />
      <header className="home-canvas-toolbar">
        <div className="home-canvas-tools" aria-label="Herramientas del lienzo">
          <span aria-label="Mover (V)" className="home-canvas-tools__current canvas-tooltip" data-tooltip="Mover · V"><MousePointer2 aria-hidden="true" /></span>
          <button aria-label="Crear una nota (N)" className="canvas-tooltip" data-tooltip="Nota · N" onClick={() => void createItem("note")} type="button"><StickyNote aria-hidden="true" /></button>
          <button aria-label="Crear una tarea (T)" className="canvas-tooltip" data-tooltip="Tarea · T" onClick={() => void createItem("task")} type="button"><CheckSquare2 aria-hidden="true" /></button>
          <button aria-label="Añadir una imagen (I)" className="canvas-tooltip" data-tooltip="Imagen · I" onClick={() => imageInput.current?.click()} type="button"><ImagePlus aria-hidden="true" /></button>
        </div>
        <input accept="image/avif,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void uploadImage(event.target.files?.[0]); event.target.value = ""; }} ref={imageInput} type="file" />
      </header>
      {activeMessage ? <p className="home-canvas-message" role="status">{activeMessage}<button aria-label="Cerrar mensaje" onClick={() => setMessage(null)} type="button"><X aria-hidden="true" /></button></p> : null}
      <DndContext onDragEnd={(event) => { handleDragEnd(event); window.setTimeout(() => { didDragRef.current = false; dragCameraStartRef.current = null; setDragCameraStart(null); }, 0); }} onDragMove={keepDraggedItemVisible} onDragStart={() => { const activeCamera = cameraRef.current; didDragRef.current = true; dragCameraStartRef.current = { x: activeCamera.x, y: activeCamera.y }; setDragCameraStart({ x: activeCamera.x, y: activeCamera.y }); }} sensors={sensors}>
        <div className="home-canvas-board" ref={boardRef} style={{ transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})` }}>
          {items.map((item) => <CanvasItem dragCameraOffset={dragCameraStart ? { x: camera.x - dragCameraStart.x, y: camera.y - dragCameraStart.y } : undefined} item={item} key={item.id} onChange={updateItem} onDelete={deleteItem} onDuplicate={() => void duplicateItem(item)} onExpand={() => { if (!didDragRef.current) setExpandedImage(item); }} zoom={camera.zoom} />)}
        </div>
      </DndContext>
      <div aria-label="Controles de vista" className="canvas-view-controls" role="group">
        <button aria-label="Alejar" className="canvas-tooltip" data-tooltip="Alejar" disabled={camera.zoom <= MIN_ZOOM} onClick={() => changeZoom(camera.zoom - ZOOM_STEP)} type="button"><Minus aria-hidden="true" /></button>
        <button aria-label="Acercar" className="canvas-tooltip" data-tooltip="Acercar" disabled={camera.zoom >= MAX_ZOOM} onClick={() => changeZoom(camera.zoom + ZOOM_STEP)} type="button"><Plus aria-hidden="true" /></button>
        <button aria-label="Restablecer zoom y posición" className="canvas-tooltip" data-tooltip="Restablecer vista" onClick={resetCamera} type="button"><Maximize2 aria-hidden="true" /></button>
      </div>
      {expandedImage?.imageUrl ? <div aria-label="Imagen ampliada" aria-modal="true" className="canvas-image-lightbox" onMouseDown={(event) => { if (event.target === event.currentTarget) setExpandedImage(null); }} role="dialog"><button aria-label="Cerrar imagen" className="canvas-image-lightbox__close" onClick={() => setExpandedImage(null)} type="button"><X aria-hidden="true" /></button><img alt={expandedImage.content.title || "Imagen ampliada"} src={expandedImage.imageUrl} /></div> : null}
    </section>
  );
}

function CanvasItem({ dragCameraOffset, item, onChange, onDelete, onDuplicate, onExpand, zoom }: { dragCameraOffset?: { x: number; y: number }; item: HomeCanvasItem; onChange: (item: HomeCanvasItem) => void; onDelete: (item: HomeCanvasItem) => void; onDuplicate: () => void; onExpand: () => void; zoom: number }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id });
  const style = { "--home-x": `${item.positionX}px`, "--home-y": `${item.positionY}px`, transform: transform ? `translate3d(${(transform.x - (dragCameraOffset?.x ?? 0)) / zoom}px, ${(transform.y - (dragCameraOffset?.y ?? 0)) / zoom}px, 0)` : undefined } as CSSProperties;
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

function clamp(value: number) { return Math.min(1_000_000, Math.max(-1_000_000, Math.round(value * 100) / 100)); }

function localItem(input: Omit<HomeCanvasItem, "id" | "imagePath" | "imageUrl"> & { imageUrl?: string | null }): HomeCanvasItem {
  return { ...input, id: crypto.randomUUID(), imagePath: null, imageUrl: input.imageUrl ?? null };
}

function safeUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; }
}
