"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canCreateChild, type ItemKind } from "@/lib/item-nesting";
import { isHttpUrl, linkTitleFromUrl } from "@/lib/item-url";
import {
  defaultSize,
  emptyDocument,
  mapOrbitItemRow,
  type OrbitItem,
  type OrbitItemKind,
  type OrbitItemRow,
  ORBIT_ITEM_KINDS,
} from "@/lib/orbit-item";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return { supabase, userId: data.claims.sub };
}

async function getOwnedSpace(space: string, userId: string) {
  if (!UUID_PATTERN.test(space)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("orbit_spaces").select("kind").eq("id", space).eq("user_id", userId).maybeSingle();
  return data?.kind ? String(data.kind) : null;
}

export async function createOrbitItem(input: {
  dueDate?: string | null;
  imagePath?: string | null;
  kind: OrbitItemKind;
  parentId?: string | null;
  spaceId: string | null;
  title?: string;
  url?: string | null;
  x: number;
  y: number;
}): Promise<{ error?: string; item?: OrbitItem }> {
  if (!ORBIT_ITEM_KINDS.includes(input.kind) || !validPosition(input.x) || !validPosition(input.y)) {
    return { error: "Elemento no válido." };
  }

  const { supabase, userId } = await getAuthenticatedClient();
  if (input.spaceId !== null) {
    const owned = await getOwnedSpace(input.spaceId, userId);
    if (!owned) return { error: "Elemento no válido." };
  }

  const parentId = input.parentId ?? null;
  if (parentId && !UUID_PATTERN.test(parentId)) return { error: "No se puede crear aquí." };

  let parent: { kind: ItemKind; parentId: string | null } | null = null;
  if (parentId) {
    const { data } = await supabase
      .from("orbit_items")
      .select("kind, parent_id, space_id")
      .eq("id", parentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data || (data.space_id ?? null) !== input.spaceId || !isItemKind(data.kind)) {
      return { error: "No se puede crear aquí." };
    }
    parent = { kind: data.kind, parentId: data.parent_id };
  }

  if (!canCreateChild(parent, input.kind)) return { error: "No se puede crear aquí." };

  if (input.kind === "link") {
    if (!input.url || !isHttpUrl(input.url)) return { error: "Enlace no válido." };
  }
  if (input.kind === "image") {
    if (!input.imagePath || !input.imagePath.startsWith(`${userId}/`)) return { error: "Imagen no válida." };
  }
  if (input.kind === "countdown") {
    if (!input.dueDate || !validIsoDate(input.dueDate)) return { error: "Fecha no válida." };
  }

  const size = defaultSize(input.kind);
  const title = resolveTitle(input);
  const url = input.kind === "link" && input.url ? input.url.trim() : null;
  const { data, error } = await supabase
    .from("orbit_items")
    .insert({
      body: input.kind === "note" ? emptyDocument() : {},
      due_date: input.kind === "countdown" ? input.dueDate : input.dueDate ?? null,
      height: size.height || 80,
      image_path: input.kind === "image" ? input.imagePath : null,
      kind: input.kind,
      parent_id: parentId,
      position_x: input.x,
      position_y: input.y,
      space_id: input.spaceId,
      title,
      url,
      user_id: userId,
      width: size.width || 160,
    })
    .select("*")
    .single();

  if (error || !data) return { error: "No se pudo crear el elemento." };
  revalidateItemPath(input.spaceId);
  return { item: mapOrbitItemRow(data as OrbitItemRow) };
}

export async function saveOrbitItemPosition(input: { id: string; x: number; y: number }): Promise<void> {
  if (!UUID_PATTERN.test(input.id) || !validPosition(input.x) || !validPosition(input.y)) return;
  const { supabase, userId } = await getAuthenticatedClient();
  const { data } = await supabase
    .from("orbit_items")
    .update({ position_x: input.x, position_y: input.y })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("space_id")
    .maybeSingle();
  if (data) revalidateItemPath(data.space_id);
}

export async function saveOrbitNote(input: { body: Record<string, unknown>; id: string; title: string }): Promise<void> {
  if (!UUID_PATTERN.test(input.id) || !validDocument(input.body)) return;
  const { supabase, userId } = await getAuthenticatedClient();
  const title = input.title.trim().slice(0, 120) || "Nota";
  const { data } = await supabase
    .from("orbit_items")
    .update({ body: input.body, title })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("space_id")
    .maybeSingle();
  if (data) revalidateItemPath(data.space_id);
}

export async function deleteOrbitItem(id: string): Promise<void> {
  if (!UUID_PATTERN.test(id)) return;
  const { supabase, userId } = await getAuthenticatedClient();
  const { data } = await supabase.from("orbit_items").select("space_id").eq("id", id).eq("user_id", userId).maybeSingle();
  await supabase.from("orbit_items").delete().eq("id", id).eq("user_id", userId);
  revalidateItemPath(data?.space_id ?? null);
}

export async function duplicateOrbitItem(id: string): Promise<{ error?: string; item?: OrbitItem }> {
  if (!UUID_PATTERN.test(id)) return { error: "Elemento no válido." };
  const { supabase, userId } = await getAuthenticatedClient();
  const { data: source } = await supabase.from("orbit_items").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!source) return { error: "No se encontró el elemento." };
  const row = source as OrbitItemRow;
  const { data, error } = await supabase
    .from("orbit_items")
    .insert({
      body: isObject(row.body) ? row.body : emptyDocument(),
      checked: Boolean(row.checked),
      cover_path: row.cover_path,
      due_date: row.due_date,
      height: Number(row.height),
      image_path: row.image_path,
      kind: row.kind,
      parent_id: row.parent_id,
      position_x: Math.min(1_000_000, Number(row.position_x) + 48),
      position_y: Math.min(1_000_000, Number(row.position_y) + 48),
      price: row.price,
      sort_order: Number(row.sort_order),
      space_id: row.space_id,
      status: row.status,
      title: row.title,
      url: row.url,
      user_id: userId,
      width: Number(row.width),
    })
    .select("*")
    .single();
  if (error || !data) return { error: "No se pudo duplicar el elemento." };
  revalidateItemPath(row.space_id);
  return { item: mapOrbitItemRow(data as OrbitItemRow) };
}

function resolveTitle(input: {
  kind: OrbitItemKind;
  title?: string;
  url?: string | null;
}) {
  const trimmed = input.title?.trim().slice(0, 120) ?? "";
  if (trimmed) return trimmed;
  if (input.kind === "folder") return "Nueva carpeta";
  if (input.kind === "list") return "Lista";
  if (input.kind === "link" && input.url) return linkTitleFromUrl(input.url).slice(0, 120) || "Enlace";
  if (input.kind === "image") return "Imagen";
  if (input.kind === "countdown") return "Contador";
  if (input.kind === "check_item") return "Ítem";
  return "Nota";
}

function revalidateItemPath(spaceId: string | null | undefined) {
  revalidatePath(spaceId ? `/spaces/${spaceId}` : "/");
}

function isItemKind(value: unknown): value is ItemKind {
  return typeof value === "string" && ORBIT_ITEM_KINDS.includes(value as OrbitItemKind);
}

function validDocument(value: Record<string, unknown>) {
  return value.type === "doc" && JSON.stringify(value).length <= 50_000;
}

function validPosition(value: number) {
  return Number.isFinite(value) && value >= -1_000_000 && value <= 1_000_000;
}

function validIsoDate(value: string) {
  return Number.isFinite(Date.parse(value));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
