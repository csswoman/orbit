export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_EDGE = 1200;
export const JPEG_QUALITY = 0.7;

export function isAllowedImage(mime: string) {
  return /^image\/(avif|jpeg|png|webp)$/.test(mime);
}

export function fileStem(name: string) {
  return name.replace(/\.[^.]+$/, "") || "Imagen";
}

export function extensionForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/avif") return "avif";
  return "jpg";
}

export async function compressImage(file: File): Promise<File> {
  if (!isAllowedImage(file.type) || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Imagen no válida.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const keepPng = file.type === "image/png";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, keepPng ? "image/png" : "image/jpeg", keepPng ? undefined : JPEG_QUALITY),
  );
  if (!blob) return file;

  const name = keepPng
    ? file.name.replace(/\.[^.]+$/, ".png")
    : file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([blob], name, { type: blob.type });
}
