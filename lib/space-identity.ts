import type { SpaceKind } from "@/lib/space-crud";

export type SpaceFontId = "classic" | "grotesk" | "soft";

export const SPACE_ICON_IDS = [
  "apple",
  "briefcase",
  "folder-kanban",
  "gamepad",
  "heart",
  "luggage",
  "repeat",
  "shirt",
  "sparkles",
  "tag",
] as const;

export type SpaceIconId = (typeof SPACE_ICON_IDS)[number];

export const SPACE_ICON_LABELS: Record<SpaceIconId, string> = {
  apple: "Comida",
  briefcase: "Trabajo",
  "folder-kanban": "Proyectos",
  gamepad: "Juegos",
  heart: "Deseos",
  luggage: "Viajes",
  repeat: "Recurrente",
  shirt: "Ropa",
  sparkles: "Inspiración",
  tag: "Ventas",
};

export const SPACE_FONTS: Array<{ id: SpaceFontId; label: string; sample: string }> = [
  { id: "grotesk", label: "Space", sample: "Aa" },
  { id: "soft", label: "Suave", sample: "Aa" },
  { id: "classic", label: "Clásica", sample: "Aa" },
];

export const SPACE_COLOR_SWATCHES = [
  "#9388ff",
  "#e8a07a",
  "#6ea8ff",
  "#f4a8d4",
  "#b5e3a8",
  "#7ec8e3",
  "#f0c36a",
  "#edf0ff",
] as const;

export const ACCENT_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const defaultAccents: Record<SpaceKind, string> = {
  clothing: "#b5e3a8",
  food: "#e8a07a",
  gacha: "#9388ff",
  inspiration: "#edf0ff",
  jobs: "#c4a574",
  projects: "#a99bff",
  sales: "#f0c36a",
  subscriptions: "#6ea8ff",
  travel: "#7ec8e3",
  wishlist: "#f4a8d4",
};

export function defaultAccentForKind(kind: string) {
  return defaultAccents[kind as SpaceKind] ?? "#9388ff";
}

export function normalizeAccentColor(value: unknown) {
  const color = String(value ?? "").trim();
  return ACCENT_COLOR_PATTERN.test(color) ? color.toLowerCase() : "#9388ff";
}

export function isSpaceIcon(value: string): value is SpaceIconId {
  return SPACE_ICON_IDS.includes(value as SpaceIconId);
}

export function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "jpg";
}
