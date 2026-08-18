"use client";
/* eslint-disable @next/next/no-img-element -- previews use blob or signed user uploads. */

import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  CANVAS_BUCKET,
  uploadCanvasImage,
} from "@/lib/upload-canvas-image";

type ImageUploaderProps = {
  initialPath?: string | null;
  label?: string;
  name: string;
  onPathChange?: (path: string | null) => void;
};

export function ImageUploader({
  initialPath,
  label = "Imagen",
  name,
  onPathChange,
}: ImageUploaderProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(initialPath ? String(initialPath) : "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadPreview() {
      if (!initialPath) {
        setPath("");
        setPreviewUrl(null);
        return;
      }

      setPath(String(initialPath));
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.storage
        .from(CANVAS_BUCKET)
        .createSignedUrl(String(initialPath), 60 * 60);

      if (!cancelled && data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [initialPath]);

  async function handleFile(file?: File) {
    if (!file) return;

    setUploading(true);
    setError(null);

    const result = await uploadCanvasImage(file);
    setUploading(false);

    if (result.error || !result.path) {
      setError(result.error ?? "No se pudo subir la imagen.");
      return;
    }

    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPath(result.path);
    setPreviewUrl(result.previewUrl ?? null);
    onPathChange?.(result.path);
  }

  function clearImage() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPath("");
    setPreviewUrl(null);
    onPathChange?.(null);
  }

  return (
    <div className="grid gap-2 sm:col-span-2">
      <span className="text-sm font-medium">{label}</span>
      <input name={name} type="hidden" value={path} />
      {previewUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-[var(--orbit-line)]">
          <img
            alt=""
            className="block max-h-40 w-full object-cover"
            src={previewUrl}
          />
          <button
            aria-label="Quitar imagen"
            className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white"
            onClick={clearImage}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--orbit-line)] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <ImagePlus aria-hidden="true" className="size-4" />
          {uploading ? "Subiendo…" : previewUrl ? "Cambiar imagen" : "Subir imagen"}
        </button>
        <input
          accept="image/avif,image/jpeg,image/png,image/webp"
          className="sr-only"
          id={inputId}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
          ref={fileInputRef}
          type="file"
        />
      </div>
      {error ? <p className="text-sm text-[var(--orbit-danger)]">{error}</p> : null}
    </div>
  );
}
