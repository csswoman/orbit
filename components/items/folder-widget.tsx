"use client";

import { useState } from "react";

import { CountdownWidget } from "@/components/items/countdown-widget";
import { ItemStatusFields } from "@/components/items/item-status-fields";
import { LinkCard } from "@/components/items/link-card";
import { ListWidget } from "@/components/items/list-widget";
import { allowedChildKinds, packingProgress, type ItemKind } from "@/lib/item-nesting";
import { statusOptionsFor } from "@/lib/item-status";
import { folderTreeContainsId, type OrbitItem } from "@/lib/orbit-item";

const KIND_LABELS: Record<ItemKind, string> = {
  check_item: "Ítem",
  countdown: "Contador",
  folder: "Carpeta",
  image: "Imagen",
  link: "Enlace",
  list: "Lista",
  note: "Nota",
};

export function FolderWidget({ item, activeFolderId, onOpenFolder, onCloseFolder, onChangeCover, spaceKind, onAddChild, onToggleCheck, onAddChildTo, onChildAdded, onItemUpdated }: {
  activeFolderId: string | null;
  item: OrbitItem;
  onAddChild: (kind: ItemKind) => void;
  onAddChildTo?: (parentId: string, kind: ItemKind) => void;
  onChangeCover?: (id: string) => void;
  onChildAdded?: (parentId: string, child: OrbitItem) => void;
  onCloseFolder: (id: string, parentId: string | null) => void;
  onItemUpdated?: (item: OrbitItem) => void;
  onOpenFolder: (id: string) => void;
  onToggleCheck: (id: string, checked: boolean) => void;
  spaceKind: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const expanded = activeFolderId !== null && (activeFolderId === item.id || folderTreeContainsId(item, activeFolderId));
  const progress = packingProgress(item);
  const statusLabel = statusOptionsFor(spaceKind, "folder").find((option) => option.value === item.status)?.label ?? item.status;
  const kinds = allowedChildKinds({ kind: "folder", parentId: item.parentId });
  const coverStyle = item.coverUrl
    ? { backgroundImage: `url("${item.coverUrl.replaceAll('"', "%22")}")` }
    : { background: "var(--orbit-surface)" };
  const collapsedMeta = collapsedFolderMeta(spaceKind, progress, statusLabel, item.price);

  if (!expanded) {
    return (
      <article className="folder-widget">
        <button className="folder-widget__body" onClick={() => onOpenFolder(item.id)} type="button">
          <span className="folder-widget__cover" style={coverStyle} />
          <span className="folder-widget__title">{item.title}</span>
          {collapsedMeta ? <span className="folder-widget__meta">{collapsedMeta}</span> : null}
        </button>
      </article>
    );
  }

  return (
    <article className="folder-widget is-open" data-no-dnd>
      <header className="folder-widget__header">
        <p className="folder-widget__title">{item.title}</p>
        <div className="folder-widget__header-actions">
          {onChangeCover ? (
            <button onClick={() => onChangeCover(item.id)} type="button">Portada</button>
          ) : null}
          <button onClick={() => onCloseFolder(item.id, item.parentId)} type="button">Cerrar</button>
        </div>
      </header>
      <ItemStatusFields item={item} onUpdated={onItemUpdated} spaceKind={spaceKind} />
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
                activeFolderId={activeFolderId}
                item={child}
                onAddChild={(kind) => (onAddChildTo ?? ((_parentId, nestedKind) => onAddChild(nestedKind)))(child.id, kind)}
                onAddChildTo={onAddChildTo}
                onChangeCover={onChangeCover}
                onChildAdded={onChildAdded}
                onCloseFolder={onCloseFolder}
                onItemUpdated={onItemUpdated}
                onOpenFolder={onOpenFolder}
                onToggleCheck={onToggleCheck}
                spaceKind={spaceKind}
              />
            ) : child.kind === "link" && child.url ? (
              <LinkCard item={child} onUpdated={onItemUpdated} spaceKind={spaceKind} />
            ) : child.kind === "countdown" && child.dueDate ? (
              <CountdownWidget dueDate={child.dueDate} title={child.title} />
            ) : (
              <p className="folder-widget__child">{child.title}</p>
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

function NestedFolder({ item, activeFolderId, spaceKind, onAddChild, onAddChildTo, onChangeCover, onChildAdded, onItemUpdated, onOpenFolder, onCloseFolder, onToggleCheck }: {
  activeFolderId: string | null;
  item: OrbitItem;
  onAddChild: (kind: ItemKind) => void;
  onAddChildTo?: (parentId: string, kind: ItemKind) => void;
  onChangeCover?: (id: string) => void;
  onChildAdded?: (parentId: string, child: OrbitItem) => void;
  onCloseFolder: (id: string, parentId: string | null) => void;
  onItemUpdated?: (item: OrbitItem) => void;
  onOpenFolder: (id: string) => void;
  onToggleCheck: (id: string, checked: boolean) => void;
  spaceKind: string | null;
}) {
  return (
    <FolderWidget
      activeFolderId={activeFolderId}
      item={item}
      onAddChild={onAddChild}
      onAddChildTo={onAddChildTo}
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

function collapsedFolderMeta(
  spaceKind: string | null,
  progress: { done: number; total: number },
  statusLabel: string | null,
  price: number | null,
) {
  if (spaceKind === "travel") {
    return `${progress.done}/${progress.total}${statusLabel ? ` · ${statusLabel}` : ""}`;
  }
  if (spaceKind === "sales") {
    const bits = [price == null ? null : String(price), statusLabel].filter(Boolean);
    return bits.length ? bits.join(" · ") : null;
  }
  return statusLabel || null;
}
