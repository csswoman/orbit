import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type CanvasFont = "classic" | "grotesk" | "soft";
export type CanvasLayout = "free" | "order";
export type CanvasTheme = "aurora" | "bubblegum" | "lime" | "lunar";

export type CanvasPreference = {
  font: CanvasFont;
  layout: CanvasLayout;
  positions: Record<string, { x: number; y: number }>;
  theme: CanvasTheme;
};

export const defaultCanvasPreference: CanvasPreference = {
  font: "grotesk",
  layout: "free",
  positions: {},
  theme: "aurora",
};

export async function getCanvasPreference(spaceId: string): Promise<CanvasPreference> {
  if (!isSupabaseConfigured()) return defaultCanvasPreference;

  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    if (!claimsData?.claims?.sub) return defaultCanvasPreference;

    const { data: preference } = await supabase
      .from("space_preferences")
      .select("canvas_layout, canvas_theme, canvas_font, canvas_positions")
      .eq("space_id", spaceId)
      .maybeSingle();

    return normalizePreference(preference);
  } catch {
    return defaultCanvasPreference;
  }
}

function normalizePreference(value: unknown): CanvasPreference {
  if (!isObject(value)) return defaultCanvasPreference;
  return {
    font: value.canvas_font === "soft" || value.canvas_font === "classic" ? value.canvas_font : "grotesk",
    layout: value.canvas_layout === "order" ? "order" : "free",
    positions: normalizePositions(value.canvas_positions),
    theme: value.canvas_theme === "bubblegum" || value.canvas_theme === "lime" || value.canvas_theme === "lunar" ? value.canvas_theme : "aurora",
  };
}

function normalizePositions(value: unknown): Record<string, { x: number; y: number }> {
  if (!isObject(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, position]) => {
      if (!isObject(position) || !isFinitePosition(position.x) || !isFinitePosition(position.y)) return [];
      return [[key, { x: Number(position.x), y: Number(position.y) }]];
    }),
  );
}

function isFinitePosition(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= -1_000_000 && value <= 1_000_000;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
