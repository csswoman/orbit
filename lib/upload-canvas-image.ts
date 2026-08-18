"use client";

import {
  compressImage,
  extensionForMime,
  isAllowedImage,
  MAX_IMAGE_BYTES,
} from "@/lib/compress-image";
import { createClient } from "@/lib/supabase/client";

export const CANVAS_BUCKET = "orbit-canvas";

export async function uploadCanvasImage(file: File): Promise<{
  error?: string;
  path?: string;
  previewUrl?: string;
}> {
  if (!isAllowedImage(file.type) || file.size > MAX_IMAGE_BYTES) {
    return { error: "Usa JPG, PNG, WebP o AVIF de hasta 10 MB." };
  }

  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    return { error: "Tu sesión expiró. Vuelve a entrar." };
  }

  try {
    const compressed = await compressImage(file);
    const extension = extensionForMime(compressed.type);
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from(CANVAS_BUCKET)
      .upload(path, compressed, { contentType: compressed.type, upsert: false });

    if (error) {
      return { error: "No se pudo subir la imagen." };
    }

    return { path, previewUrl: URL.createObjectURL(compressed) };
  } catch {
    return { error: "Imagen no válida." };
  }
}
