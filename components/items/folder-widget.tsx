"use client";

import { useState } from "react";

import { ListWidget } from "@/components/items/list-widget";
import { allowedChildKinds, packingProgress, type ItemKind } from "@/lib/item-nesting";
import { statusOptionsFor } from "@/lib/item-status";
import type { OrbitItem } from "@/lib/orbit-item";

const KIND_LABELS: Record<ItemKind, string> = {
  check_item: "Ítem",
  countdown: "Contador",
  folder: "Carpeta",
  image: "Imagen",
  link: "Enlace",
  list: "Lista",
  note: "Nota",
};

export function FolderWidget({ item, open, onOpen, onClose, spaceKind, onAddChild, onToggleCheck, onAddChildTo, onChildAdded }: {
  item: OrbitItem;
  onAddChild: (kind: ItemKind) => void;
  onAddChildTo?: (parentId: string, kind: ItemKind) => void;
  onChildAdded?: (parentId: string, child: OrbitItem) => void;
  onClose: () => void;
  onOpen: () => void;
  onToggleCheck: (id: string, checked: boolean) => void;
  open: boolean;
  spaceKind: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const progress = packingProgress(item);
  const statusLabel = statusOptionsFor(spaceKind, "folder").find((option) => option.value === item.status)?.label ?? item.status;
  const kinds = allowedChildKinds({ kind: "folder", parentId: item.parentId });
  const coverStyle = item.coverUrl
    ? { backgroundImage: `url("${item.coverUrl.replaceAll('"', "%22")}")` }
    : { background: "var(--orbit-surface)" };

  if (!open) {
    return (
      <article className="folder-widget">
        <button className="folder-widget__body" onClick={onOpen} type="button">
          <span className="folder-widget__cover" style={coverStyle} />
          <span className="folder-widget__title">{item.title}</span>
          {spaceKind === "travel" ? (
            <span className="folder-widget__meta">{progress.done}/{progress.total}{statusLabel ? ` · ${statusLabel}` : ""}</span>
          ) : null}
        </button>
      </article>
    );
  }

  return (
    <article className="folder-widget is-open" data-no-dnd>
      <header className="folder-widget__header">
        <p className="folder-widget__title">{item.title}</p>
        <button onClick={onClose} type="button">Cerrar</button>
      </header>
      <ul className="folder-widget__children">
        {item.children.map((child) => (
          <li key={child.id}>
            {child.kind === "check_item" ? (
              <label className="folder-widget__check">
                <input checked={child.checked} onChange={(event) => onToggleCheck(child.id, event.target.checked)} type="checkbox" />
                {child.title}
              </label>
            ) : child.kind === "list" ? (
              <ListWidget item={child} onChildAdded={(added) => onChildAdded?.(child.id, added)} onToggleCheck={onToggleCheck} />
            ) : child.kind === "folder" ? (
              <NestedFolder
                item={child}
                onAddChild={(kind) => (onAddChildTo ?? ((_parentId, nestedKind) => onAddChild(nestedKind)))(child.id, kind)}
                onAddChildTo={onAddChildTo}
                onChildAdded={onChildAdded}
                onToggleCheck={onToggleCheck}
                spaceKind={spaceKind}
              />
            ) : (
              <p className="folder-widget__child">{child.title}{child.kind === "countdown" && child.dueDate ? ` · ${child.dueDate}` : ""}</p>
            )}
          </li>
        ))}
      </ul>
      <div className="folder-widget__add">
        <button onClick={() => setMenuOpen((current) => !current)} type="button">Añadir dentro</button>
        {menuOpen ? (
          <div className="folder-widget__kinds">
            {kinds.map((kind) => (
              <button key={kind} onClick={() => { onAddChild(kind); setMenuOpen(false); }} type="button">{KIND_LABELS[kind]}</button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function NestedFolder({ item, spaceKind, onAddChild, onAddChildTo, onChildAdded, onToggleCheck }: {
  item: OrbitItem;
  onAddChild: (kind: ItemKind) => void;
  onAddChildTo?: (parentId: string, kind: ItemKind) => void;
  onChildAdded?: (parentId: string, child: OrbitItem) => void;
  onToggleCheck: (id: string, checked: boolean) => void;
  spaceKind: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FolderWidget
      item={item}
      onAddChild={onAddChild}
      onAddChildTo={onAddChildTo}
      onChildAdded={onChildAdded}
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
      onToggleCheck={onToggleCheck}
      open={open}
      spaceKind={spaceKind}
    />
  );
}
