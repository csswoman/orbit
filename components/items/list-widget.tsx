"use client";

import { useState, type FormEvent } from "react";

import { createOrbitItem } from "@/app/(app)/item-actions";
import type { OrbitItem } from "@/lib/orbit-item";

export function ListWidget({ item, onChildAdded, onToggleCheck }: {
  item: OrbitItem;
  onChildAdded: (child: OrbitItem) => void;
  onToggleCheck: (id: string, checked: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const lines = item.children.filter((child) => child.kind === "check_item");

  async function addLine(event: FormEvent) {
    event.preventDefault();
    const line = title.trim();
    if (!line) return;
    setTitle("");
    const result = await createOrbitItem({
      kind: "check_item",
      parentId: item.id,
      spaceId: item.spaceId,
      title: line,
      x: 0,
      y: 0,
    });
    if (result.item) onChildAdded(result.item);
  }

  return (
    <article className="list-widget">
      <p className="list-widget__title">{item.title}</p>
      <ul className="list-widget__lines">
        {lines.map((child) => (
          <li key={child.id}>
            <label className="list-widget__check">
              <input checked={child.checked} onChange={(event) => onToggleCheck(child.id, event.target.checked)} type="checkbox" />
              {child.title}
            </label>
          </li>
        ))}
      </ul>
      <form className="list-widget__add" onSubmit={(event) => void addLine(event)}>
        <input aria-label="Añadir línea" onChange={(event) => setTitle(event.target.value)} placeholder="Añadir línea" value={title} />
      </form>
    </article>
  );
}
