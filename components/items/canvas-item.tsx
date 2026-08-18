"use client";
/* eslint-disable @next/next/no-img-element -- signed, user-uploaded URLs cannot be declared as fixed Next image hosts. */

import { Copy, Edit3, Expand, Trash2 } from "lucide-react";

import { CountdownWidget } from "@/components/items/countdown-widget";
import { FolderWidget } from "@/components/items/folder-widget";
import { LinkCard } from "@/components/items/link-card";
import { ListWidget } from "@/components/items/list-widget";
import { SheetWidget } from "@/components/spaces/sheet-widget";
import type { ItemKind } from "@/lib/item-nesting";
import type { OrbitItem } from "@/lib/orbit-item";

export function OrbitCanvasItem({ item, editing, openFolderId, spaceKind, onOpenFolder, onCloseFolder, onChangeCover, onAddChild, onToggleCheck, onChildAdded, onSaveNote, onExpandImage, onItemUpdated }: {
  editing: boolean;
  item: OrbitItem;
  onAddChild: (parentId: string, kind: ItemKind) => void;
  onChangeCover?: (id: string) => void;
  onChildAdded: (parentId: string, child: OrbitItem) => void;
  onCloseFolder: (id: string, parentId: string | null) => void;
  onExpandImage?: () => void;
  onItemUpdated?: (item: OrbitItem) => void;
  onOpenFolder: (id: string) => void;
  onSaveNote: (next: { body: Record<string, unknown>; id: string; title: string }) => void;
  onToggleCheck: (id: string, checked: boolean) => void;
  openFolderId: string | null;
  spaceKind: string | null;
}) {
  if (item.kind === "folder") {
    return (
      <FolderWidget
        activeFolderId={openFolderId}
        item={item}
        onAddChild={(kind) => onAddChild(item.id, kind)}
        onAddChildTo={onAddChild}
        onChangeCover={onChangeCover}
        onChildAdded={onChildAdded}
        onCloseFolder={onCloseFolder}
        onItemUpdated={onItemUpdated}
        onOpenFolder={onOpenFolder}
        onToggleCheck={onToggleCheck}
        spaceKind={spaceKind}
      />
    );
  }
  if (item.kind === "list") {
    return <ListWidget item={item} onChildAdded={(child) => onChildAdded(item.id, child)} onToggleCheck={onToggleCheck} />;
  }
  if (item.kind === "note") return <SheetWidget editing={editing} item={item} onSave={onSaveNote} />;
  if (item.kind === "image") {
    return (
      <article className="space-image-widget">
        <img alt={item.title || "Imagen"} draggable={false} onClick={onExpandImage} src={item.imageUrl ?? ""} />
      </article>
    );
  }
  if (item.kind === "link" && item.url) {
    return <LinkCard item={item} onUpdated={onItemUpdated} spaceKind={spaceKind} />;
  }
  if (item.kind === "countdown" && item.dueDate) {
    return <CountdownWidget dueDate={item.dueDate} title={item.title} />;
  }
  return null;
}

export function WidgetControls({ editing, onDelete, onDuplicate, onEdit, onExpand }: {
  editing: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit?: () => void;
  onExpand?: () => void;
}) {
  return (
    <div className="canvas-element-controls" data-no-dnd>
      {onEdit ? <button aria-label="Editar" aria-pressed={editing} onClick={onEdit} type="button"><Edit3 aria-hidden="true" /></button> : null}
      {onExpand ? <button aria-label="Ampliar imagen" onClick={onExpand} type="button"><Expand aria-hidden="true" /></button> : null}
      <button aria-label="Duplicar elemento" onClick={onDuplicate} type="button"><Copy aria-hidden="true" /></button>
      <button aria-label="Eliminar elemento" className="is-danger" onClick={onDelete} type="button"><Trash2 aria-hidden="true" /></button>
    </div>
  );
}
