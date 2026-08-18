"use client";
/* eslint-disable @next/next/no-img-element -- signed, user-uploaded URLs cannot be declared as fixed Next image hosts. */

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { CheckSquare2, Copy, Edit3, Expand, Grid2X2, ImagePlus, LayoutPanelTop, Link2, Maximize2, Minus, MousePointer2, Palette, Plus, Settings2, Sparkles, StickyNote, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { createImageWidget, createLinkWidget, createSheetWidget, deleteSpaceWidget, duplicateSpaceWidget, saveCanvasPreference, saveSheetWidget, saveWidgetDescription, saveWidgetPosition } from "@/app/(app)/space-widget-actions";
import { SheetWidget } from "@/components/spaces/sheet-widget";
import { SpaceSettings } from "@/components/spaces/space-settings";
import { GradientBg } from "@/components/spaces/gradient-bg";
import type { OrbitSpace } from "@/lib/orbit-spaces";
import { createClient } from "@/lib/supabase/client";
import type { CanvasPreference, SpaceWidget } from "@/lib/space-widgets";

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

class CanvasPointerSensor extends PointerSensor {
  static activators = [{
    eventName: "onPointerDown" as const,
    handler: ({ nativeEvent }: { nativeEvent: PointerEvent }) => {
      const target = nativeEvent.target;
      if (!(target instanceof Element)) return false;
      return !target.closest("button, a, input, textarea, select, [contenteditable='true'], [data-no-dnd]");
    },
  }];
}

export function SpaceCanvas({ adjustmentContent, children, preference: initialPreference, space, spaceDetails, widgets: initialWidgets }: {
  adjustmentContent?: ReactNode; children: ReactNode; preference: CanvasPreference; space: string; spaceDetails: OrbitSpace; widgets: SpaceWidget[];
}) {
  const [preference, setPreference] = useState(initialPreference);
  const [accentColor, setAccentColor] = useState(spaceDetails.accentColor);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(spaceDetails.backgroundImageUrl);
  const [backgroundOverlay, setBackgroundOverlay] = useState(spaceDetails.backgroundOverlay);
  const [widgets, setWidgets] = useState(initialWidgets);
  const [adjusting, setAdjusting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, [contenteditable='true']")) return;
      if (event.key.toLowerCase() === "n") { event.preventDefault(); void addSheet(); }
      if (event.key.toLowerCase() === "t") { event.preventDefault(); void addSheet("Tarea"); }
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
      if (image) { event.preventDefault(); void addImage(image); return; }
      const text = event.clipboardData?.getData("text/plain").trim();
      if (text) { event.preventDefault(); void addPastedText(text); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  function updatePreference(next: CanvasPreference) {
    setPreference(next);
    void saveCanvasPreference(space, next);
  }

  function updatePartialPreference(partial: Partial<CanvasPreference>) {
    updatePreference({ ...preference, ...partial });
  }

  function changeZoom(nextZoom: number, focus?: { x: number; y: number }) {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(nextZoom * 100) / 100));
    setCamera((current) => {
      const bounds = viewportRef.current?.getBoundingClientRect();
      if (!bounds) { const next = { ...current, zoom }; cameraRef.current = next; return next; }
      const focusX = focus?.x ?? bounds.width / 2;
      const focusY = focus?.y ?? bounds.height / 2;
      const next = {
        x: focusX - ((focusX - current.x) / current.zoom) * zoom,
        y: focusY - ((focusY - current.y) / current.zoom) * zoom,
        zoom,
      };
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

  async function addSheet(title = "Nueva hoja") {
    setCreating(true);
    const result = await createSheetWidget(space, title, undefined, nextWidgetPosition());
    setCreating(false);
    if (result.widget) {
      setWidgets((current) => [result.widget, ...current]);
      setEditingWidgetId(result.widget.id);
    }
  }

  async function addPastedText(text: string) {
    const position = nextWidgetPosition();
    const url = safeUrl(text);
    if (url) {
      const result = await createLinkWidget(space, { title: new URL(url).hostname, url, ...position });
      if (result.widget) setWidgets((current) => [...current, result.widget]);
      return;
    }
    const result = await createSheetWidget(space, "Texto", documentWithText(text), position);
    if (result.widget) {
      setWidgets((current) => [...current, { ...result.widget, positionX: position.x, positionY: position.y }]);
      void saveWidgetPosition(space, { id: result.widget.id, ...position });
    }
  }

  async function addImage(file?: File) {
    if (!file || !file.type.match(/^image\/(avif|jpeg|png|webp)$/) || file.size > 10 * 1024 * 1024) return;
    const supabase = createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (!userId) return;
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("orbit-canvas").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return;
    const position = nextWidgetPosition();
    const result = await createImageWidget(space, { imagePath: path, title: file.name.replace(/\.[^.]+$/, ""), ...position });
    if (!result.widget) { await supabase.storage.from("orbit-canvas").remove([path]); return; }
    setWidgets((current) => [...current, { ...result.widget, imageUrl: URL.createObjectURL(file) }]);
  }

  function nextWidgetPosition() {
    const bounds = viewportRef.current?.getBoundingClientRect();
    const x = bounds ? (bounds.width / 2 - camera.x) / camera.zoom : 144;
    const y = bounds ? (bounds.height / 2 - camera.y) / camera.zoom : 96;
    const offset = (widgets.length % 4) * 36;
    return { x: clamp(x + offset), y: clamp(y + offset) };
  }

  async function duplicateWidget(widget: SpaceWidget) {
    const result = await duplicateSpaceWidget(space, widget.id);
    if (result.widget) setWidgets((current) => [...current, { ...result.widget, imageUrl: widget.imageUrl }]);
  }

  function deleteWidget(widget: SpaceWidget) {
    setWidgets((current) => current.filter((candidate) => candidate.id !== widget.id));
    void deleteSpaceWidget(space, widget.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.delta.x && !event.delta.y) return;
    const identifier = String(event.active.id);
    const currentPosition = getPosition(identifier, preference, widgets, resourceChildren.length);
    const board = boardRef.current;
    if (!board) return;
    const cameraStart = dragCameraStartRef.current;
    const activeCamera = cameraRef.current;
    const cameraOffset = cameraStart ? { x: activeCamera.x - cameraStart.x, y: activeCamera.y - cameraStart.y } : { x: 0, y: 0 };
    const next = { x: clamp(currentPosition.x + (event.delta.x - cameraOffset.x) / activeCamera.zoom), y: clamp(currentPosition.y + (event.delta.y - cameraOffset.y) / activeCamera.zoom) };
    if (identifier.startsWith("widget:")) {
      const widgetId = identifier.slice("widget:".length);
      setWidgets((current) => current.map((widget) => widget.id === widgetId ? { ...widget, positionX: next.x, positionY: next.y } : widget));
      void saveWidgetPosition(space, { id: widgetId, ...next });
      return;
    }
    updatePreference({ ...preference, positions: { ...preference.positions, [identifier]: next } });
  }

  return (
    <div
      className="space-canvas"
      data-font={preference.font}
      data-has-background={backgroundImageUrl ? "true" : undefined}
      data-layout={preference.layout}
      data-theme={preference.theme}
      style={{ "--space-accent": accentColor } as CSSProperties}
    >
      {backgroundImageUrl ? (
        <div
          aria-hidden="true"
          className="space-canvas__backdrop"
          style={
            {
              "--space-background-image": `url("${backgroundImageUrl.replaceAll('"', "%22")}")`,
              "--space-background-overlay": backgroundOverlay,
            } as CSSProperties
          }
        />
      ) : (
        <GradientBg className="canvas-gradient" />
      )}
      <SpaceSettings
        font={preference.font}
        onAccentChange={setAccentColor}
        onBackgroundChange={(url, overlay) => {
          setBackgroundImageUrl(url);
          setBackgroundOverlay(overlay);
        }}
        onFontChange={(nextFont) => updatePartialPreference({ font: nextFont })}
        space={spaceDetails}
      />
      <header className="space-canvas__toolbar">
        <div className="space-canvas__actions">
          <span aria-label="Mover (V)" className="space-canvas__move canvas-tooltip" data-tooltip="Mover · V"><MousePointer2 aria-hidden="true" className="size-4" /></span>
          <button aria-label="Crear nota (N)" className="space-canvas__tool canvas-tooltip" data-tooltip={creating ? "Creando…" : "Nota · N"} disabled={creating} onClick={() => void addSheet()} type="button"><StickyNote aria-hidden="true" className="size-4" /></button>
          <button aria-label="Crear tarea (T)" className="space-canvas__tool canvas-tooltip" data-tooltip="Tarea · T" disabled={creating} onClick={() => void addSheet("Tarea")} type="button"><CheckSquare2 aria-hidden="true" className="size-4" /></button>
          <button aria-label="Añadir imagen (I)" className="space-canvas__tool canvas-tooltip" data-tooltip="Imagen · I" disabled={creating} onClick={() => imageInput.current?.click()} type="button"><ImagePlus aria-hidden="true" className="size-4" /></button>
          <button aria-expanded={adjusting} aria-label="Ajustar canvas" className="space-canvas__adjust canvas-tooltip" data-tooltip="Ajustar" onClick={() => setAdjusting((open) => !open)} type="button"><Settings2 aria-hidden="true" className="size-4" /></button>
        </div>
        <input accept="image/avif,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void addImage(event.target.files?.[0]); event.target.value = ""; }} ref={imageInput} type="file" />
      </header>

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
      <DndContext
        onDragEnd={(event) => { handleDragEnd(event); window.setTimeout(() => { didDragRef.current = false; dragCameraStartRef.current = null; setDragCameraStart(null); }, 0); }}
        onDragMove={keepDraggedItemVisible}
        onDragStart={() => {
          didDragRef.current = true;
          const activeCamera = cameraRef.current;
          dragCameraStartRef.current = { x: activeCamera.x, y: activeCamera.y };
          setDragCameraStart({ x: activeCamera.x, y: activeCamera.y });
          if (preference.layout === "order") updatePartialPreference({ layout: "free" });
        }}
        sensors={sensors}
      >
        <div className="space-canvas__viewport" onPointerCancel={endPan} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} ref={viewportRef}>
        <div className="space-canvas__board" ref={boardRef} style={preference.layout === "free" ? { transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})` } : undefined}>
          {resourceChildren.map((child, index) => {
            const id = `resource:${index}`;
            return <CanvasItem dragCameraOffset={dragCameraStart ? { x: camera.x - dragCameraStart.x, y: camera.y - dragCameraStart.y } : undefined} id={id} key={id} layout={preference.layout} position={getPosition(id, preference, widgets, index)} zoom={camera.zoom}><div className="space-canvas__resource">{child}</div></CanvasItem>;
          })}
          {widgets.map((widget, index) => {
            const id = `widget:${widget.id}`;
            const expandImage = () => { if (!didDragRef.current && widget.imageUrl) setExpandedImage(widget.imageUrl); };
            return <CanvasItem controls={<WidgetControls editing={editingWidgetId === widget.id} onDelete={() => deleteWidget(widget)} onDuplicate={() => void duplicateWidget(widget)} onEdit={() => setEditingWidgetId((current) => current === widget.id ? null : widget.id)} onExpand={widget.type === "image" && widget.imageUrl ? expandImage : undefined} />} dragCameraOffset={dragCameraStart ? { x: camera.x - dragCameraStart.x, y: camera.y - dragCameraStart.y } : undefined} editing={editingWidgetId === widget.id} id={id} key={id} layout={preference.layout} position={getPosition(id, preference, widgets, resourceChildren.length + index)} zoom={camera.zoom}>{widget.type === "image" ? <ImageWidget editing={editingWidgetId === widget.id} onExpand={expandImage} onSaveDescription={(description) => void saveWidgetDescription(space, { description, id: widget.id })} widget={widget} /> : widget.type === "link" ? <LinkWidget editing={editingWidgetId === widget.id} onSaveDescription={(description) => void saveWidgetDescription(space, { description, id: widget.id })} widget={widget} /> : <SheetWidget editing={editingWidgetId === widget.id} onSave={(next) => void saveSheetWidget(space, next)} widget={widget} />}</CanvasItem>;
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

function CanvasItem({ children, controls, dragCameraOffset, editing, id, layout, position, zoom }: { children: ReactNode; controls?: ReactNode; dragCameraOffset?: { x: number; y: number }; editing?: boolean; id: string; layout: CanvasLayout; position: { x: number; y: number }; zoom: number }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ disabled: Boolean(editing), id });
  const style = layout === "free" ? ({ "--widget-x": `${position.x}px`, "--widget-y": `${position.y}px`, transform: transform ? `translate3d(${(transform.x - (dragCameraOffset?.x ?? 0)) / zoom}px, ${(transform.y - (dragCameraOffset?.y ?? 0)) / zoom}px, 0)` : undefined } as CSSProperties) : undefined;
  return <div {...attributes} {...(editing ? {} : listeners)} aria-label="Widget movible" className={`space-canvas__widget${editing ? " is-editing" : ""}`} ref={setNodeRef} style={style}>{controls}{children}</div>;
}

function getPosition(id: string, preference: CanvasPreference, widgets: SpaceWidget[], fallbackIndex: number) {
  if (id.startsWith("widget:")) {
    const widget = widgets.find((item) => item.id === id.slice("widget:".length));
    if (widget) return { x: widget.positionX, y: widget.positionY };
  }
  return preference.positions[id] ?? fallbackPositions[fallbackIndex % fallbackPositions.length];
}

function clamp(value: number) { return Math.min(1_000_000, Math.max(-1_000_000, Math.round(value * 100) / 100)); }

function ImageWidget({ editing, onExpand, onSaveDescription, widget }: { editing: boolean; onExpand: () => void; onSaveDescription: (description: string) => void; widget: SpaceWidget }) {
  return <article className="space-image-widget"><img alt="Imagen en tu tablero" draggable={false} onClick={onExpand} src={widget.imageUrl ?? ""} />{editing ? <textarea aria-label="Descripción opcional" className="canvas-item-description" data-no-dnd defaultValue={typeof widget.content.description === "string" ? widget.content.description : ""} onBlur={(event) => onSaveDescription(event.target.value)} placeholder="Añade una descripción opcional" /> : null}</article>;
}

function WidgetControls({ editing, onDelete, onDuplicate, onEdit, onExpand }: { editing: boolean; onDelete: () => void; onDuplicate: () => void; onEdit?: () => void; onExpand?: () => void }) {
  return <div className="canvas-element-controls" data-no-dnd>{onEdit ? <button aria-label="Editar" aria-pressed={editing} onClick={onEdit} type="button"><Edit3 aria-hidden="true" /></button> : null}{onExpand ? <button aria-label="Ampliar imagen" onClick={onExpand} type="button"><Expand aria-hidden="true" /></button> : null}<button aria-label="Duplicar elemento" onClick={onDuplicate} type="button"><Copy aria-hidden="true" /></button><button aria-label="Eliminar elemento" className="is-danger" onClick={onDelete} type="button"><Trash2 aria-hidden="true" /></button></div>;
}

function LinkWidget({ editing, onSaveDescription, widget }: { editing: boolean; onSaveDescription: (description: string) => void; widget: SpaceWidget }) {
  if (!widget.linkUrl) return null;
  return <><a className="space-link-widget" href={widget.linkUrl} rel="noreferrer" target="_blank"><Link2 aria-hidden="true" /><span><strong>{widget.title}</strong><small>{widget.linkUrl}</small></span></a>{editing ? <textarea aria-label="Descripción opcional" className="canvas-item-description" data-no-dnd defaultValue={typeof widget.content.description === "string" ? widget.content.description : ""} onBlur={(event) => onSaveDescription(event.target.value)} placeholder="Añade una descripción opcional" /> : null}</>;
}

function documentWithText(text: string) { return { content: text.slice(0, 5000).split(/\r?\n/).filter(Boolean).map((line) => ({ content: [{ text: line, type: "text" }], type: "paragraph" })), type: "doc" }; }

function safeUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; }
}
