"use client";
/* eslint-disable @next/next/no-img-element -- signed, user-uploaded URLs cannot be declared as fixed Next image hosts. */

import { DndContext, useDraggable, useSensor, useSensors, type DragEndEvent, type DragMoveEvent } from "@dnd-kit/core";
import { CheckSquare2, Folder, Grid2X2, ImagePlus, LayoutPanelTop, Link2, Maximize2, Minus, MousePointer2, Palette, Plus, Settings2, Sparkles, StickyNote, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { saveCanvasPreference } from "@/app/(app)/space-widget-actions";
import { OrbitCanvasItem, WidgetControls } from "@/components/items/canvas-item";
import { CanvasPointerSensor } from "@/components/items/canvas-pointer-sensor";
import { useOrbitCanvas } from "@/components/items/use-orbit-canvas";
import { GradientBg } from "@/components/spaces/gradient-bg";
import { SpaceSettings } from "@/components/spaces/space-settings";
import { clampCanvas, type OrbitItem } from "@/lib/orbit-item";
import type { OrbitSpace } from "@/lib/orbit-spaces";
import type { CanvasPreference } from "@/lib/space-widgets";

type CanvasLayout = CanvasPreference["layout"];
type CanvasTheme = CanvasPreference["theme"];
type CanvasFont = CanvasPreference["font"];

const themes: Array<{ id: CanvasTheme; label: string }> = [
  { id: "aurora", label: "Aurora" }, { id: "bubblegum", label: "Pop" },
  { id: "lime", label: "Lima" }, { id: "lunar", label: "Lunar" },
];
const fonts: Array<{ id: CanvasFont; label: string }> = [
  { id: "grotesk", label: "Space" }, { id: "soft", label: "Soft" }, { id: "classic", label: "Classic" },
];
const fallbackPositions = [{ x: 48, y: 32 }, { x: 648, y: 80 }, { x: 288, y: 416 }, { x: 756, y: 440 }];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

export function SpaceCanvas({ adjustmentContent, children, items: initialItems, preference: initialPreference, space, spaceDetails }: {
  adjustmentContent?: ReactNode; children: ReactNode; items: OrbitItem[]; preference: CanvasPreference; space: string; spaceDetails: OrbitSpace;
}) {
  const [preference, setPreference] = useState(initialPreference);
  const [accentColor, setAccentColor] = useState(spaceDetails.accentColor);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(spaceDetails.backgroundImageUrl);
  const [backgroundOverlay, setBackgroundOverlay] = useState(spaceDetails.backgroundOverlay);
  const [adjusting, setAdjusting] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  const boardRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const didDragRef = useRef(false);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const dragCameraStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragCameraStart, setDragCameraStart] = useState<{ x: number; y: number } | null>(null);
  const sensors = useSensors(useSensor(CanvasPointerSensor, { activationConstraint: { distance: 8 } }));
  const resourceChildren = Array.isArray(children) ? children : [children];
  const canvas = useOrbitCanvas({ getPosition: nextItemPosition, imageInput, initialItems, spaceId: space });
  const rootItems = canvas.items.filter((item) => item.parentId === null);
  const cameraOffset = dragCameraStart ? { x: camera.x - dragCameraStart.x, y: camera.y - dragCameraStart.y } : undefined;

  function updatePreference(next: CanvasPreference) { setPreference(next); void saveCanvasPreference(space, next); }
  function updatePartialPreference(partial: Partial<CanvasPreference>) { updatePreference({ ...preference, ...partial }); }

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

  function resetCamera() { const next = { x: 0, y: 0, zoom: 1 }; cameraRef.current = next; setCamera(next); }

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

  function startPan(event: React.PointerEvent<HTMLDivElement>) {
    if (preference.layout !== "free" || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest(".space-canvas__widget, button, a, input, textarea, select, [contenteditable='true']")) return;
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: cameraRef.current.x, y: cameraRef.current.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event: React.PointerEvent<HTMLDivElement>) {
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

  function endPan(event: React.PointerEvent<HTMLDivElement>) {
    if (panRef.current?.pointerId !== event.pointerId) return;
    panRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function nextItemPosition() {
    const bounds = viewportRef.current?.getBoundingClientRect();
    const x = bounds ? (bounds.width / 2 - camera.x) / camera.zoom : 144;
    const y = bounds ? (bounds.height / 2 - camera.y) / camera.zoom : 96;
    const offset = (canvas.items.length % 4) * 36;
    return { x: clampCanvas(x + offset), y: clampCanvas(y + offset) };
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.delta.x && !event.delta.y) return;
    const identifier = String(event.active.id);
    const currentPosition = getPosition(identifier, preference, canvas.items, resourceChildren.length);
    if (!boardRef.current) return;
    const cameraStart = dragCameraStartRef.current;
    const activeCamera = cameraRef.current;
    const offset = cameraStart ? { x: activeCamera.x - cameraStart.x, y: activeCamera.y - cameraStart.y } : { x: 0, y: 0 };
    const next = { x: clampCanvas(currentPosition.x + (event.delta.x - offset.x) / activeCamera.zoom), y: clampCanvas(currentPosition.y + (event.delta.y - offset.y) / activeCamera.zoom) };
    if (identifier.startsWith("item:")) {
      canvas.moveItem(identifier.slice("item:".length), next.x, next.y);
      return;
    }
    updatePreference({ ...preference, positions: { ...preference.positions, [identifier]: next } });
  }

  return (
    <div className="space-canvas" data-font={preference.font} data-has-background={backgroundImageUrl ? "true" : undefined} data-layout={preference.layout} data-theme={preference.theme} style={{ "--space-accent": accentColor } as CSSProperties}>
      {backgroundImageUrl ? (
        <div aria-hidden="true" className="space-canvas__backdrop" style={{ "--space-background-image": `url("${backgroundImageUrl.replaceAll('"', "%22")}")`, "--space-background-overlay": backgroundOverlay } as CSSProperties} />
      ) : <GradientBg className="canvas-gradient" />}
      <SpaceSettings font={preference.font} onAccentChange={setAccentColor} onBackgroundChange={(url, overlay) => { setBackgroundImageUrl(url); setBackgroundOverlay(overlay); }} onFontChange={(nextFont) => updatePartialPreference({ font: nextFont })} space={spaceDetails} />
      <header className="space-canvas__toolbar">
        <div className="space-canvas__actions">
          <span aria-label="Mover (V)" className="space-canvas__move canvas-tooltip" data-tooltip="Mover · V"><MousePointer2 aria-hidden="true" className="size-4" /></span>
          <button aria-label="Crear carpeta" className="space-canvas__tool canvas-tooltip" data-tooltip="Carpeta" disabled={canvas.creating} onClick={() => void canvas.createItem("folder")} type="button"><Folder aria-hidden="true" className="size-4" /></button>
          <button aria-label="Crear lista (T)" className="space-canvas__tool canvas-tooltip" data-tooltip="Lista · T" disabled={canvas.creating} onClick={() => void canvas.createItem("list")} type="button"><CheckSquare2 aria-hidden="true" className="size-4" /></button>
          <button aria-label="Crear nota (N)" className="space-canvas__tool canvas-tooltip" data-tooltip={canvas.creating ? "Creando…" : "Nota · N"} disabled={canvas.creating} onClick={() => void canvas.createItem("note")} type="button"><StickyNote aria-hidden="true" className="size-4" /></button>
          <button aria-label="Añadir imagen (I)" className="space-canvas__tool canvas-tooltip" data-tooltip="Imagen · I" disabled={canvas.creating} onClick={() => { canvas.clearPendingImageParent(); imageInput.current?.click(); }} type="button"><ImagePlus aria-hidden="true" className="size-4" /></button>
          <button aria-label="Añadir enlace" className="space-canvas__tool canvas-tooltip" data-tooltip="Enlace" disabled={canvas.creating} onClick={() => void canvas.addLink()} type="button"><Link2 aria-hidden="true" className="size-4" /></button>
          <button aria-expanded={adjusting} aria-label="Ajustar canvas" className="space-canvas__adjust canvas-tooltip" data-tooltip="Ajustar" onClick={() => setAdjusting((open) => !open)} type="button"><Settings2 aria-hidden="true" className="size-4" /></button>
        </div>
        <input accept="image/avif,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) canvas.clearPendingImageParent(); void canvas.addImage(file); event.target.value = ""; }} ref={imageInput} type="file" />
      </header>
      {canvas.message ? <p className="home-canvas-message" role="status">{canvas.message}<button aria-label="Cerrar mensaje" onClick={() => canvas.setMessage(null)} type="button"><X aria-hidden="true" /></button></p> : null}
      <div aria-label="Personalización del space" className="space-canvas__controls" hidden={!adjusting}>
        <div className="space-canvas__control-group" role="group" aria-label="Distribución">
          <button aria-pressed={preference.layout === "order"} className="space-canvas__mode" onClick={() => updatePartialPreference({ layout: "order" })} type="button"><Grid2X2 aria-hidden="true" /> Ordenado</button>
          <button aria-pressed={preference.layout === "free"} className="space-canvas__mode" onClick={() => updatePartialPreference({ layout: "free" })} type="button"><LayoutPanelTop aria-hidden="true" /> Libre</button>
        </div>
        <div className="space-canvas__control-group" role="group" aria-label="Tema"><Palette aria-hidden="true" className="size-4" />{themes.map((item) => <button aria-label={`Tema ${item.label}`} aria-pressed={preference.theme === item.id} className="space-canvas__theme" data-theme-choice={item.id} key={item.id} onClick={() => updatePartialPreference({ theme: item.id })} type="button"><span aria-hidden="true" /><span className="sr-only">{item.label}</span></button>)}</div>
        <div className="space-canvas__control-group space-canvas__font-control" role="group" aria-label="Tipografía"><Sparkles aria-hidden="true" className="size-4" />{fonts.map((item) => <button aria-pressed={preference.font === item.id} className="space-canvas__font" key={item.id} onClick={() => updatePartialPreference({ font: item.id })} type="button">{item.label}</button>)}</div>
        {adjustmentContent ? <div className="space-canvas__custom-controls">{adjustmentContent}</div> : null}
      </div>
      <div className="space-canvas__stage">
        <DndContext onDragEnd={(event) => { handleDragEnd(event); window.setTimeout(() => { didDragRef.current = false; dragCameraStartRef.current = null; setDragCameraStart(null); }, 0); }} onDragMove={keepDraggedItemVisible} onDragStart={() => { didDragRef.current = true; const activeCamera = cameraRef.current; dragCameraStartRef.current = { x: activeCamera.x, y: activeCamera.y }; setDragCameraStart({ x: activeCamera.x, y: activeCamera.y }); if (preference.layout === "order") updatePartialPreference({ layout: "free" }); }} sensors={sensors}>
          <div className="space-canvas__viewport" onPointerCancel={endPan} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} ref={viewportRef}>
            <div className="space-canvas__board" ref={boardRef} style={preference.layout === "free" ? { transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})` } : undefined}>
              {resourceChildren.map((child, index) => {
                const id = `resource:${index}`;
                return <DraggableWidget dragCameraOffset={cameraOffset} id={id} key={id} layout={preference.layout} position={getPosition(id, preference, canvas.items, index)} zoom={camera.zoom}><div className="space-canvas__resource">{child}</div></DraggableWidget>;
              })}
              {rootItems.map((item, index) => {
                const id = `item:${item.id}`;
                const expandImage = () => { if (!didDragRef.current && item.imageUrl) setExpandedImage(item.imageUrl); };
                return (
                  <DraggableWidget
                    controls={<WidgetControls editing={canvas.editingId === item.id} onDelete={() => canvas.removeItem(item)} onDuplicate={() => void canvas.duplicateItem(item)} onEdit={() => canvas.setEditingId((current) => current === item.id ? null : item.id)} onExpand={item.kind === "image" && item.imageUrl ? expandImage : undefined} />}
                    dragCameraOffset={cameraOffset}
                    editing={canvas.editingId === item.id}
                    id={id}
                    key={id}
                    layout={preference.layout}
                    position={getPosition(id, preference, canvas.items, resourceChildren.length + index)}
                    zoom={camera.zoom}
                  >
                    <OrbitCanvasItem editing={canvas.editingId === item.id} item={item} onAddChild={(parentId, kind) => void canvas.addChild(parentId, kind)} onChildAdded={canvas.childAdded} onCloseFolder={() => canvas.setOpenFolderId(null)} onExpandImage={expandImage} onOpenFolder={canvas.setOpenFolderId} onSaveNote={canvas.saveNote} onToggleCheck={canvas.toggleCheck} openFolderId={canvas.openFolderId} spaceKind={spaceDetails.kind} />
                  </DraggableWidget>
                );
              })}
            </div>
          </div>
        </DndContext>
      </div>
      {preference.layout === "free" ? <div aria-label="Controles de vista" className="canvas-view-controls" role="group">
        <button aria-label="Alejar" className="canvas-tooltip" data-tooltip="Alejar" disabled={camera.zoom <= MIN_ZOOM} onClick={() => changeZoom(camera.zoom - ZOOM_STEP)} type="button"><Minus aria-hidden="true" /></button>
        <button aria-label="Acercar" className="canvas-tooltip" data-tooltip="Acercar" disabled={camera.zoom >= MAX_ZOOM} onClick={() => changeZoom(camera.zoom + ZOOM_STEP)} type="button"><Plus aria-hidden="true" /></button>
        <button aria-label="Restablecer zoom y posición" className="canvas-tooltip" data-tooltip="Restablecer vista" onClick={resetCamera} type="button"><Maximize2 aria-hidden="true" /></button>
      </div> : null}
      {expandedImage ? <div aria-label="Imagen ampliada" aria-modal="true" className="canvas-image-lightbox" onMouseDown={(event) => { if (event.target === event.currentTarget) setExpandedImage(null); }} role="dialog"><button aria-label="Cerrar imagen" className="canvas-image-lightbox__close" onClick={() => setExpandedImage(null)} type="button">×</button><img alt="Imagen ampliada" src={expandedImage} /></div> : null}
    </div>
  );
}

function DraggableWidget({ children, controls, dragCameraOffset, editing, id, layout, position, zoom }: { children: ReactNode; controls?: ReactNode; dragCameraOffset?: { x: number; y: number }; editing?: boolean; id: string; layout: CanvasLayout; position: { x: number; y: number }; zoom: number }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ disabled: Boolean(editing), id });
  const style = layout === "free" ? ({ "--widget-x": `${position.x}px`, "--widget-y": `${position.y}px`, transform: transform ? `translate3d(${(transform.x - (dragCameraOffset?.x ?? 0)) / zoom}px, ${(transform.y - (dragCameraOffset?.y ?? 0)) / zoom}px, 0)` : undefined } as CSSProperties) : undefined;
  return <div {...attributes} {...(editing ? {} : listeners)} aria-label="Widget movible" className={`space-canvas__widget${editing ? " is-editing" : ""}`} ref={setNodeRef} style={style}>{controls}{children}</div>;
}

function getPosition(id: string, preference: CanvasPreference, items: OrbitItem[], fallbackIndex: number) {
  if (id.startsWith("item:")) {
    const item = items.find((candidate) => candidate.id === id.slice("item:".length));
    if (item) return { x: item.positionX, y: item.positionY };
  }
  return preference.positions[id] ?? fallbackPositions[fallbackIndex % fallbackPositions.length];
}
