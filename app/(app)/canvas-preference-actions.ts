"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { CanvasPreference } from "@/lib/space-widgets";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveCanvasPreference(space: string, preference: CanvasPreference) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  const userId = data.claims.sub;
  if (!UUID_PATTERN.test(space) || !validPreference(preference)) return;
  const { data: owned } = await supabase.from("orbit_spaces").select("kind").eq("id", space).eq("user_id", userId).maybeSingle();
  const kind = owned?.kind ? String(owned.kind) : null;
  if (!kind) return;
  await supabase.from("space_preferences").upsert(
    {
      canvas_font: preference.font,
      canvas_layout: preference.layout,
      canvas_positions: preference.positions,
      canvas_theme: preference.theme,
      space_id: space,
      space_type: kind,
      user_id: userId,
    },
    { onConflict: "user_id,space_id" },
  );
  revalidatePath(`/spaces/${space}`);
}

function validPreference(value: CanvasPreference) {
  if (!["order", "free"].includes(value.layout) || !["aurora", "bubblegum", "lime", "lunar"].includes(value.theme) || !["grotesk", "soft", "classic"].includes(value.font)) return false;
  return Object.keys(value.positions).length <= 80 && Object.values(value.positions).every((position) => validPosition(position.x) && validPosition(position.y));
}

function validPosition(value: number) {
  return Number.isFinite(value) && value >= -1_000_000 && value <= 1_000_000;
}
