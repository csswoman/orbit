import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type HomeCanvasKind = "image" | "link" | "note" | "task";

export type HomeCanvasItem = {
  content: { body?: string; checked?: boolean; title?: string; url?: string };
  id: string;
  imagePath: string | null;
  imageUrl: string | null;
  kind: HomeCanvasKind;
  positionX: number;
  positionY: number;
};

export type HomeCanvasData =
  | { items: HomeCanvasItem[]; status: "ready" }
  | { status: "unconfigured" | "unauthenticated" | "error" };

export async function getHomeCanvas(): Promise<HomeCanvasData> {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { status: "unauthenticated" };

  const { data, error } = await supabase
    .from("home_canvas_items")
    .select("id, kind, content, image_path, position_x, position_y")
    .order("created_at", { ascending: true });
  if (error) return { status: "error" };

  const rows = data ?? [];
  const signedUrls = await Promise.all(rows.map(async (row) => {
    if (!row.image_path) return null;
    const { data: signed } = await supabase.storage.from("orbit-canvas").createSignedUrl(row.image_path, 60 * 60);
    return signed?.signedUrl ?? null;
  }));

  return {
    items: rows.map((row, index) => ({
      content: isContent(row.content) ? row.content : {},
      id: row.id,
      imagePath: row.image_path,
      imageUrl: signedUrls[index],
      kind: row.kind as HomeCanvasKind,
      positionX: Number(row.position_x),
      positionY: Number(row.position_y),
    })),
    status: "ready",
  };
}

function isContent(value: unknown): value is HomeCanvasItem["content"] {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
