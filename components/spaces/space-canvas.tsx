"use client";
/* eslint-disable @next/next/no-img-element -- signed, user-uploaded URLs cannot be declared as fixed Next image hosts. */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CheckSquare2, Copy, Edit3, Expand, Grid2X2, ImagePlus, LayoutPanelTop, Link2, MousePointer2, Palette, Settings2, Sparkles, StickyNote, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { createImageWidget, createLinkWidget, createSheetWidget, deleteSpaceWidget, duplicateSpaceWidget, saveCanvasPreference, saveImageWidget, saveSheetWidget, saveWidgetDescription, saveWidgetPosition } from "@/app/(app)/space-widget-actions";
import { SheetWidget } from "@/components/spaces/sheet-widget";
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
const fallbackPositions = [{ x: 4, y: 4 }, { x: 54, y: 10 }, { x: 24, y: 52 }, { x: 63, y: 55 }];

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

export function SpaceCanvas({ adjustmentContent, children, preference: initialPreference, space, widgets: initialWidgets }: {
  adjustmentContent?: ReactNode; children: ReactNode; preference: CanvasPreference; space: string; widgets: SpaceWidget[];
}) {
  const [preference, setPreference] = useState(initialPreference);
  const [widgets, setWidgets] = useState(initialWidgets);
  const [adjusting, setAdjusting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const didDragRef = useRef(false);
  const sensors = useSensors(useSensor(CanvasPointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor));
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

  async function addSheet(title = "Nueva hoja") {
    setCreating(true);
    const result = await createSheetWidget(space, title);
    setCreating(false);
    if (result.widget) setWidgets((current) => [result.widget, ...current]);
  }

  async function addPastedText(text: string) {
    const position = nextWidgetPosition();
    const url = safeUrl(text);
    if (url) {
      const result = await createLinkWidget(space, { title: new URL(url).hostname, url, ...position });
      if (result.widget) setWidgets((current) => [...current, result.widget]);
      return;
    }
    const result = await createSheetWidget(space, "Texto", documentWithText(text));
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

  function nextWidgetPosition() { return { x: 14 + (widgets.length % 4) * 12, y: 18 + (widgets.length % 3) * 14 }; }

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
    const next = { x: clamp(currentPosition.x + (event.delta.x / board.clientWidth) * 100), y: clamp(currentPosition.y + (event.delta.y / board.clientHeight) * 100) };
    if (identifier.startsWith("widget:")) {
      const widgetId = identifier.slice("widget:".length);
      setWidgets((current) => current.map((widget) => widget.id === widgetId ? { ...widget, positionX: next.x, positionY: next.y } : widget));
      void saveWidgetPosition(space, { id: widgetId, ...next });
      return;
    }
    updatePreference({ ...preference, positions: { ...preference.positions, [identifier]: next } });
  }

  return (
    <div className="space-canvas" data-font={preference.font} data-layout={preference.layout} data-theme={preference.theme}>
      <header className="space-canvas__toolbar">
        <div className="space-canvas__actions">
          <span className="space-canvas__move"><MousePointer2 aria-hidden="true" className="size-4" /> Mover <kbd>V</kbd></span>
          <button aria-label="Crear nota (N)" className="space-canvas__tool" disabled={creating} onClick={() => void addSheet()} title="Nota · N" type="button"><StickyNote aria-hidden="true" className="size-4" /><span>{creating ? "Creando…" : "Nota"}</span></button>
          <button aria-label="Crear tarea (T)" className="space-canvas__tool" disabled={creating} onClick={() => void addSheet("Tarea")} title="Tarea · T" type="button"><CheckSquare2 aria-hidden="true" className="size-4" /><span>Tarea</span></button>
          <button aria-label="Añadir imagen (I)" className="space-canvas__tool" disabled={creating} onClick={() => imageInput.current?.click()} title="Imagen · I" type="button"><ImagePlus aria-hidden="true" className="size-4" /><span>Imagen</span></button>
          <button aria-expanded={adjusting} className="space-canvas__adjust" onClick={() => setAdjusting((open) => !open)} type="button"><Settings2 aria-hidden="true" className="size-4" /> Ajustar</button>
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

      <DndContext
        onDragEnd={(event) => { handleDragEnd(event); window.setTimeout(() => { didDragRef.current = false; }, 0); }}
        onDragStart={() => {
          didDragRef.current = true;
          if (preference.layout === "order") updatePartialPreference({ layout: "free" });
        }}
        sensors={sensors}
      >
        <div className="space-canvas__board" ref={boardRef}>
          {resourceChildren.map((child, index) => {
            const id = `resource:${index}`;
            return <CanvasItem id={id} key={id} layout={preference.layout} position={getPosition(id, preference, widgets, index)}><div className="space-canvas__resource">{child}</div></CanvasItem>;
          })}
          {widgets.map((widget, index) => {
            const id = `widget:${widget.id}`;
            const editableMeta = widget.type === "image" || widget.type === "link";
            const expandImage = () => { if (!didDragRef.current && widget.imageUrl) setExpandedImage(widget.imageUrl); };
            return <CanvasItem controls={<WidgetControls editing={editingWidgetId === widget.id} onDelete={() => deleteWidget(widget)} onDuplicate={() => void duplicateWidget(widget)} onEdit={editableMeta ? () => setEditingWidgetId((current) => current === widget.id ? null : widget.id) : undefined} onExpand={widget.type === "image" && widget.imageUrl ? expandImage : undefined} />} id={id} key={id} layout={preference.layout} position={getPosition(id, preference, widgets, resourceChildren.length + index)}>{widget.type === "image" ? <ImageWidget editing={editingWidgetId === widget.id} onExpand={expandImage} onSave={(title) => void saveImageWidget(space, { id: widget.id, title })} onSaveDescription={(description) => void saveWidgetDescription(space, { description, id: widget.id })} widget={widget} /> : widget.type === "link" ? <LinkWidget editing={editingWidgetId === widget.id} onSaveDescription={(description) => void saveWidgetDescription(space, { description, id: widget.id })} widget={widget} /> : <SheetWidget onSave={(next) => void saveSheetWidget(space, next)} widget={widget} />}</CanvasItem>;
          })}
        </div>
      </DndContext>
      {expandedImage ? <div aria-label="Imagen ampliada" aria-modal="true" className="canvas-image-lightbox" onMouseDown={(event) => { if (event.target === event.currentTarget) setExpandedImage(null); }} role="dialog"><button aria-label="Cerrar imagen" className="canvas-image-lightbox__close" onClick={() => setExpandedImage(null)} type="button">×</button><img alt="Imagen ampliada" src={expandedImage} /></div> : null}
    </div>
  );
}

function CanvasItem({ children, controls, id, layout, position }: { children: ReactNode; controls?: ReactNode; id: string; layout: CanvasLayout; position: { x: number; y: number } }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = layout === "free" ? ({ "--widget-x": `${position.x}%`, "--widget-y": `${position.y}%`, transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined } as CSSProperties) : undefined;
  return <div {...attributes} {...listeners} aria-label="Widget movible" className="space-canvas__widget" ref={setNodeRef} style={style}>{controls}{children}</div>;
}

function getPosition(id: string, preference: CanvasPreference, widgets: SpaceWidget[], fallbackIndex: number) {
  if (id.startsWith("widget:")) {
    const widget = widgets.find((item) => item.id === id.slice("widget:".length));
    if (widget) return { x: widget.positionX, y: widget.positionY };
  }
  return preference.positions[id] ?? fallbackPositions[fallbackIndex % fallbackPositions.length];
}

function clamp(value: number) { return Math.min(82, Math.max(1, Math.round(value * 100) / 100)); }

function ImageWidget({ editing, onExpand, onSave, onSaveDescription, widget }: { editing: boolean; onExpand: () => void; onSave: (title: string) => void; onSaveDescription: (description: string) => void; widget: SpaceWidget }) {
  return <article className="space-image-widget"><img alt="Imagen en tu tablero" draggable={false} onClick={onExpand} src={widget.imageUrl ?? ""} /><input aria-label="Texto sobre la imagen" data-no-dnd defaultValue={widget.title} onBlur={(event) => onSave(event.target.value)} placeholder="Escribe sobre la imagen…" />{editing ? <textarea aria-label="Descripción opcional" className="canvas-item-description" data-no-dnd defaultValue={typeof widget.content.description === "string" ? widget.content.description : ""} onBlur={(event) => onSaveDescription(event.target.value)} placeholder="Añade una descripción opcional" /> : null}</article>;
}

function WidgetControls({ editing, onDelete, onDuplicate, onEdit, onExpand }: { editing: boolean; onDelete: () => void; onDuplicate: () => void; onEdit?: () => void; onExpand?: () => void }) {
  return <div className="canvas-element-controls" data-no-dnd>{onEdit ? <button aria-label="Editar descripción" aria-pressed={editing} onClick={onEdit} type="button"><Edit3 aria-hidden="true" /></button> : null}{onExpand ? <button aria-label="Ampliar imagen" onClick={onExpand} type="button"><Expand aria-hidden="true" /></button> : null}<button aria-label="Duplicar elemento" onClick={onDuplicate} type="button"><Copy aria-hidden="true" /></button><button aria-label="Eliminar elemento" className="is-danger" onClick={onDelete} type="button"><Trash2 aria-hidden="true" /></button></div>;
}

function LinkWidget({ editing, onSaveDescription, widget }: { editing: boolean; onSaveDescription: (description: string) => void; widget: SpaceWidget }) {
  if (!widget.linkUrl) return null;
  return <><a className="space-link-widget" href={widget.linkUrl} rel="noreferrer" target="_blank"><Link2 aria-hidden="true" /><span><strong>{widget.title}</strong><small>{widget.linkUrl}</small></span></a>{editing ? <textarea aria-label="Descripción opcional" className="canvas-item-description" data-no-dnd defaultValue={typeof widget.content.description === "string" ? widget.content.description : ""} onBlur={(event) => onSaveDescription(event.target.value)} placeholder="Añade una descripción opcional" /> : null}</>;
}

function documentWithText(text: string) { return { content: text.slice(0, 5000).split(/\r?\n/).filter(Boolean).map((line) => ({ content: [{ text: line, type: "text" }], type: "paragraph" })), type: "doc" }; }

function safeUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; }
}
