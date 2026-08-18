"use client";
/* eslint-disable @next/next/no-img-element -- signed, user-uploaded URLs cannot be declared as fixed Next image hosts. */

import { DndContext, useDraggable, useSensor, useSensors, type DragEndEvent, type DragMoveEvent } from "@dnd-kit/core";
import { CheckSquare2, Folder, ImagePlus, Link2, Maximize2, Minus, MousePointer2, Plus, StickyNote, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { OrbitCanvasItem, WidgetControls } from "@/components/items/canvas-item";
import { CanvasPointerSensor } from "@/components/items/canvas-pointer-sensor";
import { useOrbitCanvas } from "@/components/items/use-orbit-canvas";
import { GradientBg } from "@/components/spaces/gradient-bg";
import { clampCanvas, defaultSize, type OrbitItem } from "@/lib/orbit-item";

const positions = [{ x: 96, y: 96 }, { x: 480, y: 128 }, { x: 792, y: 256 }, { x: 240, y: 432 }];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

function fitCameraToHomeItems(items: OrbitItem[], viewport: HTMLElement | null, setCamera: (value: { x: number; y: number; zoom: number }) => void, cameraRef: { current: { x: number; y: number; zoom: number } }) {
  const bounds = viewport?.getBoundingClientRect();
  if (!bounds || items.length === 0 || bounds.width < 64 || bounds.height < 64) return false;
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const item of items) {
    const size = defaultSize(item.kind);
    minX = Math.min(minX, item.positionX);
    minY = Math.min(minY, item.positionY);
    maxX = Math.max(maxX, item.positionX + size.width);
    maxY = Math.max(maxY, item.positionY + size.height);
  }
  const padding = 96;
  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((bounds.width - padding * 2) / contentWidth, (bounds.height - padding * 2) / contentHeight)));
  const next = { x: bounds.width / 2 - (minX + contentWidth / 2) * zoom, y: bounds.height / 2 - (minY + contentHeight / 2) * zoom, zoom: Math.round(zoom * 100) / 100 };
  cameraRef.current = next;
  setCamera(next);
  return true;
}

export function HomeCanvas({ items: initialItems }: { items: OrbitItem[] }) {
  const [expandedImage, setExpandedImage] = useState<OrbitItem | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  const boardRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const didDragRef = useRef(false);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const dragCameraStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragCameraStart, setDragCameraStart] = useState<{ x: number; y: number } | null>(null);
  const sensors = useSensors(useSensor(CanvasPointerSensor, { activationConstraint: { distance: 6 } }));
  const didFitCameraRef = useRef(false);
  const canvas = useOrbitCanvas({ getPosition: nextPosition, imageInput, initialItems, spaceId: null });
  const itemsRef = useRef(canvas.items);
  itemsRef.current = canvas.items;
  const rootItems = canvas.items.filter((item) => item.parentId === null);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || itemsRef.current.length === 0 || didFitCameraRef.current) return;
    const tryFit = () => { if (!didFitCameraRef.current && fitCameraToHomeItems(itemsRef.current, node, setCamera, cameraRef)) didFitCameraRef.current = true; };
    tryFit();
    const observer = new ResizeObserver(tryFit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [canvas.items.length]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const viewport = node;
    function onWheel(event: WheelEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      const bounds = viewport.getBoundingClientRect();
      const activeCamera = cameraRef.current;
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((activeCamera.zoom - event.deltaY * 0.002) * 100) / 100));
      const next = { x: event.clientX - bounds.left - ((event.clientX - bounds.left - activeCamera.x) / activeCamera.zoom) * zoom, y: event.clientY - bounds.top - ((event.clientY - bounds.top - activeCamera.y) / activeCamera.zoom) * zoom, zoom };
      cameraRef.current = next;
      setCamera(next);
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  function nextPosition() {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return positions[canvas.items.length % positions.length];
    const offset = (canvas.items.length % positions.length) * 36;
    return { x: clampCanvas((bounds.width / 2 - camera.x) / camera.zoom + offset), y: clampCanvas((bounds.height / 2 - camera.y) / camera.zoom + offset) };
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
    if (canvas.items.length > 0) { fitCameraToHomeItems(canvas.items, viewportRef.current, setCamera, cameraRef); return; }
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

  function handleDragEnd(event: DragEndEvent) {
    if (!event.delta.x && !event.delta.y) return;
    if (!boardRef.current) return;
    const itemId = String(event.active.id).startsWith("item:") ? String(event.active.id).slice("item:".length) : String(event.active.id);
    const current = canvas.items.find((item) => item.id === itemId);
    if (!current) return;
    const cameraStart = dragCameraStartRef.current;
    const activeCamera = cameraRef.current;
    const offset = cameraStart ? { x: activeCamera.x - cameraStart.x, y: activeCamera.y - cameraStart.y } : { x: 0, y: 0 };
    canvas.moveItem(current.id, clampCanvas(current.positionX + (event.delta.x - offset.x) / activeCamera.zoom), clampCanvas(current.positionY + (event.delta.y - offset.y) / activeCamera.zoom));
  }

  return (
    <section aria-label="Home creativo" className="home-canvas-shell" onPointerCancel={endPan} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} ref={viewportRef}>
      <GradientBg className="canvas-gradient" />
      <header className="home-canvas-toolbar">
        <div className="home-canvas-tools" aria-label="Herramientas del lienzo">
          <span aria-label="Mover (V)" className="home-canvas-tools__current canvas-tooltip" data-tooltip="Mover · V"><MousePointer2 aria-hidden="true" /></span>
          <button aria-label="Crear una carpeta" className="canvas-tooltip" data-tooltip="Carpeta" onClick={() => void canvas.createItem("folder")} type="button"><Folder aria-hidden="true" /></button>
          <button aria-label="Crear una lista (T)" className="canvas-tooltip" data-tooltip="Lista · T" onClick={() => void canvas.createItem("list")} type="button"><CheckSquare2 aria-hidden="true" /></button>
          <button aria-label="Crear una nota (N)" className="canvas-tooltip" data-tooltip="Nota · N" onClick={() => void canvas.createItem("note")} type="button"><StickyNote aria-hidden="true" /></button>
          <button aria-label="Añadir una imagen (I)" className="canvas-tooltip" data-tooltip="Imagen · I" onClick={() => imageInput.current?.click()} type="button"><ImagePlus aria-hidden="true" /></button>
          <button aria-label="Añadir un enlace" className="canvas-tooltip" data-tooltip="Enlace" onClick={() => void canvas.addLink()} type="button"><Link2 aria-hidden="true" /></button>
        </div>
        <input accept="image/avif,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void canvas.addImage(event.target.files?.[0]); event.target.value = ""; }} ref={imageInput} type="file" />
      </header>
      {canvas.message ? <p className="home-canvas-message" role="status">{canvas.message}<button aria-label="Cerrar mensaje" onClick={() => canvas.setMessage(null)} type="button"><X aria-hidden="true" /></button></p> : null}
      <DndContext onDragEnd={(event) => { handleDragEnd(event); window.setTimeout(() => { didDragRef.current = false; dragCameraStartRef.current = null; setDragCameraStart(null); }, 0); }} onDragMove={keepDraggedItemVisible} onDragStart={() => { const activeCamera = cameraRef.current; didDragRef.current = true; dragCameraStartRef.current = { x: activeCamera.x, y: activeCamera.y }; setDragCameraStart({ x: activeCamera.x, y: activeCamera.y }); }} sensors={sensors}>
        <div className="home-canvas-board" ref={boardRef} style={{ transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})` }}>
          {rootItems.map((item) => (
            <HomeDragItem dragCameraOffset={dragCameraStart ? { x: camera.x - dragCameraStart.x, y: camera.y - dragCameraStart.y } : undefined} editing={canvas.editingId === item.id} item={item} key={item.id} onDelete={() => canvas.removeItem(item)} onDuplicate={() => void canvas.duplicateItem(item)} onEdit={() => canvas.setEditingId((current) => current === item.id ? null : item.id)} onExpand={() => { if (!didDragRef.current) setExpandedImage(item); }} zoom={camera.zoom}>
              <OrbitCanvasItem editing={canvas.editingId === item.id} item={item} onAddChild={(parentId, kind) => void canvas.addChild(parentId, kind)} onChildAdded={canvas.childAdded} onCloseFolder={() => canvas.setOpenFolderId(null)} onExpandImage={() => { if (!didDragRef.current) setExpandedImage(item); }} onOpenFolder={canvas.setOpenFolderId} onSaveNote={canvas.saveNote} onToggleCheck={canvas.toggleCheck} openFolderId={canvas.openFolderId} spaceKind={null} />
            </HomeDragItem>
          ))}
        </div>
      </DndContext>
      <div aria-label="Controles de vista" className="canvas-view-controls" role="group">
        <button aria-label="Alejar" className="canvas-tooltip" data-tooltip="Alejar" disabled={camera.zoom <= MIN_ZOOM} onClick={() => changeZoom(camera.zoom - ZOOM_STEP)} type="button"><Minus aria-hidden="true" /></button>
        <button aria-label="Acercar" className="canvas-tooltip" data-tooltip="Acercar" disabled={camera.zoom >= MAX_ZOOM} onClick={() => changeZoom(camera.zoom + ZOOM_STEP)} type="button"><Plus aria-hidden="true" /></button>
        <button aria-label="Restablecer zoom y posición" className="canvas-tooltip" data-tooltip="Restablecer vista" onClick={resetCamera} type="button"><Maximize2 aria-hidden="true" /></button>
      </div>
      {expandedImage?.imageUrl ? <div aria-label="Imagen ampliada" aria-modal="true" className="canvas-image-lightbox" onMouseDown={(event) => { if (event.target === event.currentTarget) setExpandedImage(null); }} role="dialog"><button aria-label="Cerrar imagen" className="canvas-image-lightbox__close" onClick={() => setExpandedImage(null)} type="button"><X aria-hidden="true" /></button><img alt={expandedImage.title || "Imagen ampliada"} src={expandedImage.imageUrl} /></div> : null}
    </section>
  );
}

function HomeDragItem({ children, dragCameraOffset, editing, item, onDelete, onDuplicate, onEdit, onExpand, zoom }: { children: React.ReactNode; dragCameraOffset?: { x: number; y: number }; editing: boolean; item: OrbitItem; onDelete: () => void; onDuplicate: () => void; onEdit: () => void; onExpand: () => void; zoom: number }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ disabled: editing, id: `item:${item.id}` });
  const style = { "--home-x": `${item.positionX}px`, "--home-y": `${item.positionY}px`, transform: transform ? `translate3d(${(transform.x - (dragCameraOffset?.x ?? 0)) / zoom}px, ${(transform.y - (dragCameraOffset?.y ?? 0)) / zoom}px, 0)` : undefined } as CSSProperties;
  return (
    <article {...attributes} {...(editing ? {} : listeners)} className={`home-item home-item--${item.kind}${editing ? " is-editing" : ""}`} ref={setNodeRef} style={style}>
      <WidgetControls editing={editing} onDelete={onDelete} onDuplicate={onDuplicate} onEdit={onEdit} onExpand={item.kind === "image" ? onExpand : undefined} />
      {children}
    </article>
  );
}
