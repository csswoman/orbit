import { isHttpUrl, linkTitleFromUrl } from "@/lib/item-url";
import { mapOrbitItemRow, type OrbitItem, type OrbitItemRow } from "@/lib/orbit-item";
import type { createClient } from "@/lib/supabase/server";

const CANVAS_BUCKET = "orbit-canvas";
const FETCH_TIMEOUT_MS = 5000;
const MAX_OG_IMAGE_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60;

export type OgPreview = {
  description: string | null;
  image: string | null;
  title: string | null;
};

const EMPTY_OG: OgPreview = { description: null, image: null, title: null };

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export function parseOgTags(html: string): OgPreview {
  return {
    description: meta(html, "og:description") ?? meta(html, "twitter:description"),
    image: meta(html, "og:image") ?? meta(html, "twitter:image"),
    title: meta(html, "og:title") ?? meta(html, "twitter:title") ?? documentTitle(html),
  };
}

export async function fetchOg(url: string): Promise<OgPreview> {
  if (!isHttpUrl(url)) return { ...EMPTY_OG };
  try {
    const response = await fetch(url, {
      headers: { Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return { ...EMPTY_OG };
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("html")) return { ...EMPTY_OG };
    return parseOgTags(await response.text());
  } catch {
    return { ...EMPTY_OG };
  }
}

export async function applyOrbitLinkPreview(input: {
  id: string;
  supabase: ServerSupabase;
  userId: string;
}): Promise<{ error?: string; item?: OrbitItem }> {
  const { data, error: loadError } = await input.supabase
    .from("orbit_items")
    .select("*")
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .eq("kind", "link")
    .maybeSingle();

  if (loadError || !data) return { error: "No se encontró el enlace." };

  const row = data as OrbitItemRow;
  if (!row.url || !isHttpUrl(row.url)) return { error: "Enlace no válido." };

  const og = await fetchOg(row.url);
  if (!og.title && !og.description && !og.image) {
    return { error: "No se pudo cargar la vista previa." };
  }

  let ogImagePath = row.og_image_path;
  const imageUrl = resolveHttpUrl(og.image, row.url);
  if (imageUrl) {
    const downloaded = await downloadOgImage(imageUrl);
    if (downloaded) {
      const path = `${input.userId}/og/${input.id}.jpg`;
      const { error: uploadError } = await input.supabase.storage
        .from(CANVAS_BUCKET)
        .upload(path, downloaded.bytes, { contentType: downloaded.contentType, upsert: true });
      if (!uploadError) ogImagePath = path;
    }
  }

  const title =
    row.title === linkTitleFromUrl(row.url) && og.title
      ? og.title.slice(0, 120)
      : row.title;

  const { data: updated, error: updateError } = await input.supabase
    .from("orbit_items")
    .update({
      og_description: og.description,
      og_image_path: ogImagePath,
      og_title: og.title,
      title,
    })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (updateError || !updated) return { error: "No se pudo guardar la vista previa." };

  const next = updated as OrbitItemRow;
  return {
    item: mapOrbitItemRow(next, {
      coverUrl: await signCanvasPath(input.supabase, next.cover_path),
      imageUrl: await signCanvasPath(input.supabase, next.image_path),
      ogImageUrl: await signCanvasPath(input.supabase, next.og_image_path),
    }),
  };
}

function meta(html: string, property: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
  const alt = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i");
  return trimOrNull(re.exec(html)?.[1] ?? alt.exec(html)?.[1] ?? null);
}

function documentTitle(html: string) {
  return trimOrNull(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? null);
}

function trimOrNull(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolveHttpUrl(image: string | null, pageUrl: string) {
  if (!image) return null;
  try {
    const resolved = new URL(image, pageUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved.href;
  } catch {
    return null;
  }
}

async function downloadOgImage(imageUrl: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  if (!isHttpUrl(imageUrl)) return null;
  try {
    const response = await fetch(imageUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    if (!contentType.startsWith("image/")) return null;
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_OG_IMAGE_BYTES) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_OG_IMAGE_BYTES) return null;
    return { bytes, contentType };
  } catch {
    return null;
  }
}

async function signCanvasPath(supabase: ServerSupabase, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(CANVAS_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  return data?.signedUrl ?? null;
}
