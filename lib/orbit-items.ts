import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { assembleTree, mapOrbitItemRow, type OrbitItem, type OrbitItemRow } from "@/lib/orbit-item";
import { createClient } from "@/lib/supabase/server";

export async function getOrbitItems(spaceId: string | null): Promise<OrbitItem[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createClient();
    let query = supabase.from("orbit_items").select("*").order("sort_order", { ascending: true });
    query = spaceId === null ? query.is("space_id", null) : query.eq("space_id", spaceId);
    const { data } = await query;
    const rows = (data ?? []) as OrbitItemRow[];
    const signed = await Promise.all(rows.map(async (row) => ({
      coverUrl: await signCanvasPath(supabase, row.cover_path),
      imageUrl: await signCanvasPath(supabase, row.image_path),
      ogImageUrl: await signCanvasPath(supabase, row.og_image_path),
    })));

    return assembleTree(rows.map((row, index) => mapOrbitItemRow(row, signed[index] ?? {})));
  } catch {
    return [];
  }
}

async function signCanvasPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
) {
  if (!path) return null;
  const { data } = await supabase.storage.from("orbit-canvas").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
