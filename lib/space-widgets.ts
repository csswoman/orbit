import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { emptyDocument } from "@/lib/orbit-item";
import { createClient } from "@/lib/supabase/server";

export { emptyDocument };

export type CanvasFont = "classic" | "grotesk" | "soft";
export type CanvasLayout = "free" | "order";
export type CanvasTheme = "aurora" | "bubblegum" | "lime" | "lunar";

export type CanvasPreference = {
  font: CanvasFont;
  layout: CanvasLayout;
  positions: Record<string, { x: number; y: number }>;
  theme: CanvasTheme;
};

export type SpaceWidget = {
  content: Record<string, unknown>;
  height: number;
  id: string;
  imagePath: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  positionX: number;
  positionY: number;
  title: string;
  type: "image" | "link" | "sheet";
  width: number;
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

export async function getSpaceCanvas(spaceId: string): Promise<{
  preference: CanvasPreference;
  widgets: SpaceWidget[];
}> {
  if (!isSupabaseConfigured()) {
    return { preference: defaultCanvasPreference, widgets: [] };
  }

  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    if (!claimsData?.claims?.sub) {
      return { preference: defaultCanvasPreference, widgets: [] };
    }

    const [{ data: widgets }, preference] = await Promise.all([
      supabase
        .from("space_widgets")
        .select("id, widget_type, title, content, image_path, link_url, position_x, position_y, width, height")
        .eq("space_id", spaceId)
        .order("updated_at", { ascending: false }),
      getCanvasPreference(spaceId),
    ]);

    const signedUrls = await Promise.all((widgets ?? []).map(async (widget) => {
      if (!widget.image_path) return null;
      const { data } = await supabase.storage.from("orbit-canvas").createSignedUrl(widget.image_path, 60 * 60);
      return data?.signedUrl ?? null;
    }));

    return {
      preference,
      widgets: (widgets ?? []).map((widget, index) => ({
        content: isObject(widget.content) ? widget.content : emptyDocument(),
        height: Number(widget.height),
        id: widget.id,
        imagePath: widget.image_path,
        imageUrl: signedUrls[index],
        linkUrl: widget.link_url,
        positionX: Number(widget.position_x),
        positionY: Number(widget.position_y),
        title: widget.title,
        type: widget.widget_type === "image" ? "image" : widget.widget_type === "link" ? "link" : "sheet",
        width: Number(widget.width),
      })),
    };
  } catch {
    return { preference: defaultCanvasPreference, widgets: [] };
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
