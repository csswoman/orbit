"use client";

import { useEffect, useState } from "react";

import { previewUrl } from "@/app/(app)/item-actions";
import { isHttpUrl } from "@/lib/item-url";

export function UrlOgPreview({
  defaultValue,
  id,
  name,
  placeholder,
  required,
  resetKey,
}: {
  defaultValue: string;
  id: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  resetKey?: number;
}) {
  const [preview, setPreview] = useState<{ description: string | null; title: string | null } | null>(null);

  useEffect(() => {
    setPreview(null);
  }, [resetKey]);

  async function load(raw: string) {
    const url = raw.trim();
    if (!isHttpUrl(url)) {
      setPreview(null);
      return;
    }
    const result = await previewUrl(url);
    if (!result.title && !result.description) {
      setPreview(null);
      return;
    }
    setPreview({ description: result.description, title: result.title });
  }

  return (
    <>
      <input
        className="min-h-11 rounded-lg border border-[var(--orbit-line)] bg-[var(--orbit-background)] px-3 py-2 font-normal outline-none focus:border-[var(--orbit-accent)] focus:ring-2 focus:ring-[var(--orbit-accent-soft)]"
        defaultValue={defaultValue}
        id={id}
        name={name}
        onBlur={(event) => void load(event.target.value)}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text/plain").trim();
          if (text) void load(text);
        }}
        placeholder={placeholder}
        required={required}
        type="url"
      />
      {preview?.title || preview?.description ? (
        <div className="rounded-lg border border-[var(--orbit-line)] bg-[var(--orbit-background)] px-3 py-2">
          {preview.title ? <p className="text-sm font-semibold">{preview.title}</p> : null}
          {preview.description ? (
            <p className="line-clamp-2 text-sm font-normal text-[var(--orbit-muted)]">{preview.description}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
