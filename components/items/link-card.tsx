"use client";
/* eslint-disable @next/next/no-img-element -- signed Open Graph URLs cannot be declared as fixed Next image hosts. */

import { useState, type MouseEvent } from "react";
import { Link2 } from "lucide-react";

import { retryLinkPreview } from "@/app/(app)/item-actions";
import { linkTitleFromUrl } from "@/lib/item-url";
import type { OrbitItem } from "@/lib/orbit-item";

export function LinkCard({ item, onUpdated }: {
  item: OrbitItem;
  onUpdated?: (item: OrbitItem) => void;
}) {
  const [pending, setPending] = useState(false);
  const image = item.coverUrl ?? item.ogImageUrl;
  const title = item.ogTitle ?? item.title;
  const showRetry = !item.ogTitle && !item.ogImageUrl && !item.coverUrl;

  if (!item.url) return null;

  async function retry(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    setPending(true);
    const result = await retryLinkPreview(item.id);
    setPending(false);
    if (result.item) onUpdated?.(result.item);
  }

  return (
    <div className="space-link-card">
      <a className="space-link-widget" href={item.url} rel="noreferrer" target="_blank">
        {image ? (
          <span className="space-link-widget__media">
            <img alt="" src={image} />
          </span>
        ) : (
          <Link2 aria-hidden="true" />
        )}
        <span>
          <strong>{title}</strong>
          {item.ogDescription ? <p className="line-clamp-2">{item.ogDescription}</p> : null}
          <small>{linkTitleFromUrl(item.url)}</small>
        </span>
      </a>
      {showRetry ? (
        <button
          className="space-link-widget__retry"
          data-no-dnd
          disabled={pending}
          onClick={(event) => void retry(event)}
          type="button"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
