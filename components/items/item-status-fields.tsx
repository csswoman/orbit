"use client";

import { saveOrbitFields } from "@/app/(app)/item-actions";
import { showsStatus, statusOptionsFor } from "@/lib/item-status";
import type { OrbitItem } from "@/lib/orbit-item";

export function ItemStatusFields({ item, onUpdated, spaceKind }: {
  item: OrbitItem;
  onUpdated?: (item: OrbitItem) => void;
  spaceKind: string | null;
}) {
  const options = statusOptionsFor(spaceKind, item.kind);
  const showStatus = showsStatus(spaceKind, item.kind) || (spaceKind === null && Boolean(item.status));
  const showPrice = spaceKind === "sales" && item.kind === "folder";
  const selectOptions = options.length > 0
    ? options
    : item.status
      ? [{ label: item.status, value: item.status }]
      : [];

  if (!showStatus && !showPrice) return null;

  async function save(patch: { price?: number | null; status?: string | null }) {
    const result = await saveOrbitFields({ id: item.id, ...patch });
    if (result.item) onUpdated?.(result.item);
  }

  return (
    <div className="item-status-fields" data-no-dnd>
      {showPrice ? (
        <label>
          Precio
          <input
            inputMode="decimal"
            min="0"
            onBlur={(event) => {
              const raw = event.target.value.trim();
              const next = raw === "" ? null : Number(raw);
              if (next !== null && !Number.isFinite(next)) return;
              if (next === item.price) return;
              void save({ price: next });
            }}
            step="0.01"
            type="number"
            defaultValue={item.price ?? ""}
          />
        </label>
      ) : null}
      {showStatus && selectOptions.length > 0 ? (
        <label>
          Estado
          <select
            onChange={(event) => {
              const next = event.target.value || null;
              if (next === item.status) return;
              void save({ status: next });
            }}
            value={item.status ?? ""}
          >
            <option value="">Sin estado</option>
            {selectOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
