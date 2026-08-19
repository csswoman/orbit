import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { tallyJobs, tallySales, tallyTravel, type HomeSummaries } from "@/lib/home-summaries";
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

const MISSING_SPACE_HREF = "/";

export async function getHomeSummaries(): Promise<HomeSummaries> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    if (!claimsData?.claims?.sub) return null;

    const { data: spaces } = await supabase
      .from("orbit_spaces")
      .select("id, kind")
      .eq("is_prebuilt", true)
      .in("kind", ["travel", "sales", "jobs"])
      .is("archived_at", null);

    const travelSpace = spaces?.find((space) => space.kind === "travel");
    const salesSpace = spaces?.find((space) => space.kind === "sales");
    const jobsSpace = spaces?.find((space) => space.kind === "jobs");

    if (!travelSpace && !salesSpace && !jobsSpace) return null;

    const [travelFolders, salesFolders, jobLinks] = await Promise.all([
      travelSpace
        ? supabase
            .from("orbit_items")
            .select("status")
            .eq("space_id", travelSpace.id)
            .eq("kind", "folder")
            .is("parent_id", null)
        : Promise.resolve({ data: [] as { status: string | null }[] }),
      salesSpace
        ? supabase
            .from("orbit_items")
            .select("status")
            .eq("space_id", salesSpace.id)
            .eq("kind", "folder")
            .is("parent_id", null)
        : Promise.resolve({ data: [] as { status: string | null }[] }),
      jobsSpace
        ? supabase
            .from("orbit_items")
            .select("status")
            .eq("space_id", jobsSpace.id)
            .eq("kind", "link")
        : Promise.resolve({ data: [] as { status: string | null }[] }),
    ]);

    return {
      jobs: {
        ...tallyJobs(jobLinks.data ?? []),
        href: jobsSpace ? `/spaces/${jobsSpace.id}` : MISSING_SPACE_HREF,
      },
      sales: {
        ...tallySales(salesFolders.data ?? []),
        href: salesSpace ? `/spaces/${salesSpace.id}` : MISSING_SPACE_HREF,
      },
      travel: {
        ...tallyTravel(travelFolders.data ?? []),
        href: travelSpace ? `/spaces/${travelSpace.id}` : MISSING_SPACE_HREF,
      },
    };
  } catch {
    return null;
  }
}
