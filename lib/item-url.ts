export function isHttpUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function linkTitleFromUrl(raw: string): string {
  try {
    return new URL(raw.trim()).hostname || "Enlace";
  } catch {
    return "Enlace";
  }
}
