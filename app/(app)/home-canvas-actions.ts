"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { HomeCanvasKind } from "@/lib/home-canvas";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return { supabase, userId: data.claims.sub };
}

function validPosition(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 92;
}

function validContent(value: Record<string, unknown>) {
  return JSON.stringify(value).length <= 10_000;
}

export async function createHomeCanvasItem(input: {
  content: Record<string, unknown>;
  imagePath?: string;
  kind: HomeCanvasKind;
  positionX: number;
  positionY: number;
}) {
  if (!validPosition(input.positionX) || !validPosition(input.positionY) || !validContent(input.content)) return { error: "Datos no válidos." };
  if (input.kind === "image" && !input.imagePath) return { error: "Falta la imagen." };
  const { supabase, userId } = await getAuthenticatedClient();
  if (input.imagePath && !input.imagePath.startsWith(`${userId}/`)) return { error: "Imagen no válida." };

  const { data, error } = await supabase
    .from("home_canvas_items")
    .insert({
      content: input.content,
      image_path: input.imagePath ?? null,
      kind: input.kind,
      position_x: input.positionX,
      position_y: input.positionY,
      user_id: userId,
    })
    .select("id, kind, content, image_path, position_x, position_y")
    .single();
  if (error || !data) return { error: "No se pudo crear el elemento." };
  revalidatePath("/");
  return { item: { content: data.content as Record<string, unknown>, id: data.id, imagePath: data.image_path, kind: data.kind as HomeCanvasKind, positionX: Number(data.position_x), positionY: Number(data.position_y) } };
}

export async function saveHomeCanvasItem(input: { content: Record<string, unknown>; id: string; positionX: number; positionY: number }) {
  if (!UUID_PATTERN.test(input.id) || !validPosition(input.positionX) || !validPosition(input.positionY) || !validContent(input.content)) return;
  const { supabase, userId } = await getAuthenticatedClient();
  await supabase.from("home_canvas_items").update({ content: input.content, position_x: input.positionX, position_y: input.positionY }).eq("id", input.id).eq("user_id", userId);
  revalidatePath("/");
}

export async function deleteHomeCanvasItem(id: string) {
  if (!UUID_PATTERN.test(id)) return;
  const { supabase, userId } = await getAuthenticatedClient();
  await supabase.from("home_canvas_items").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/");
}

export async function duplicateHomeCanvasItem(id: string) {
  if (!UUID_PATTERN.test(id)) return { error: "Elemento no válido." };
  const { supabase, userId } = await getAuthenticatedClient();
  const { data: source } = await supabase.from("home_canvas_items").select("kind, content, image_path, position_x, position_y").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!source) return { error: "No se encontró el elemento." };
  const { data, error } = await supabase.from("home_canvas_items").insert({ content: source.content, image_path: source.image_path, kind: source.kind, position_x: Math.min(92, Number(source.position_x) + 4), position_y: Math.min(92, Number(source.position_y) + 4), user_id: userId }).select("id, kind, content, image_path, position_x, position_y").single();
  if (error || !data) return { error: "No se pudo duplicar el elemento." };
  revalidatePath("/");
  return { item: { content: data.content as Record<string, unknown>, id: data.id, imagePath: data.image_path, kind: data.kind as HomeCanvasKind, positionX: Number(data.position_x), positionY: Number(data.position_y) } };
}
