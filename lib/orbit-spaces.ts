import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCrudConfig, type SpaceKind } from "@/lib/space-crud";
import { defaultAccentForKind, normalizeAccentColor } from "@/lib/space-identity";
import { normalizeBackgroundOverlay, SPACE_IDENTITY_BUCKET } from "@/lib/space-media";

export type OrbitSpace = {
  accentColor: string;
  backgroundImageUrl: string | null;
  backgroundOverlay: number;
  icon: string;
  iconImageUrl: string | null;
  id: string;
  isPrebuilt: boolean;
  kind: SpaceKind;
  name: string;
  position: number;
};

export const prebuiltSpaces = [
  { icon: "gamepad", kind: "gacha", name: "Gacha", position: 10 },
  { icon: "apple", kind: "food", name: "Comida", position: 20 },
  { icon: "repeat", kind: "subscriptions", name: "Suscripciones", position: 30 },
  { icon: "heart", kind: "wishlist", name: "Lista de deseos", position: 40 },
  { icon: "shirt", kind: "clothing", name: "Ropa", position: 50 },
  { icon: "luggage", kind: "travel", name: "Viajes", position: 60 },
  { icon: "tag", kind: "sales", name: "Ventas", position: 70 },
  { icon: "briefcase", kind: "jobs", name: "Trabajo", position: 75 },
  { icon: "folder-kanban", kind: "projects", name: "Proyectos", position: 80 },
  { icon: "sparkles", kind: "inspiration", name: "Inspiración", position: 90 },
] as const satisfies ReadonlyArray<Omit<OrbitSpace, "accentColor" | "backgroundImageUrl" | "backgroundOverlay" | "iconImageUrl" | "id" | "isPrebuilt">>;

async function signMediaPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null | undefined,
) {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(SPACE_IDENTITY_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

async function asSpace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: Record<string, unknown>,
): Promise<OrbitSpace> {
  const [iconImageUrl, backgroundImageUrl] = await Promise.all([
    signMediaPath(supabase, row.icon_image_path ? String(row.icon_image_path) : null),
    signMediaPath(supabase, row.background_image_path ? String(row.background_image_path) : null),
  ]);

  return {
    accentColor: normalizeAccentColor(row.accent_color),
    backgroundImageUrl,
    backgroundOverlay: normalizeBackgroundOverlay(row.background_overlay),
    icon: String(row.icon),
    iconImageUrl,
    id: String(row.id),
    isPrebuilt: Boolean(row.is_prebuilt),
    kind: String(row.kind) as SpaceKind,
    name: String(row.name),
    position: Number(row.position),
  };
}

export async function getOrbitSpaces(): Promise<OrbitSpace[]> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: existing, error } = await supabase
    .from("orbit_spaces")
    .select(
      "id, kind, name, icon, icon_image_path, accent_color, background_image_path, background_overlay, is_prebuilt, position, archived_at",
    )
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Orbit spaces could not be loaded", error.message);
    return [];
  }

  const existingKinds = new Set((existing ?? []).filter((row) => row.is_prebuilt).map((row) => row.kind));
  const missing = prebuiltSpaces.filter((space) => !existingKinds.has(space.kind));
  if (missing.length) {
    await supabase.from("orbit_spaces").insert(
      missing.map((space) => ({
        ...space,
        accent_color: defaultAccentForKind(space.kind),
        is_prebuilt: true,
        user_id: userId,
      })),
    );
    return getOrbitSpaces();
  }

  const active = (existing ?? []).filter((space) => space.archived_at === null);
  return Promise.all(active.map((row) => asSpace(supabase, row)));
}

export async function getOrbitSpace(spaceId: string): Promise<OrbitSpace | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data } = await supabase
    .from("orbit_spaces")
    .select(
      "id, kind, name, icon, icon_image_path, accent_color, background_image_path, background_overlay, is_prebuilt, position",
    )
    .eq("id", spaceId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();

  return data && getCrudConfig(String(data.kind)) ? asSpace(supabase, data) : null;
}
