"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { emptyDocument, type CanvasPreference } from "@/lib/space-widgets";
import { getSpace } from "@/lib/spaces";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return { supabase, userId: data.claims.sub };
}

function validSpace(space: string) {
  return Boolean(getSpace(space));
}

export async function createSheetWidget(space: string, title = "Nueva hoja", content = emptyDocument()) {
  if (!validSpace(space) || !validDocument(content)) return { error: "Hoja no válida." };
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("space_widgets")
    .insert({ content, space_type: space, title: title.trim().slice(0, 120) || "Nueva hoja", user_id: userId })
    .select("id, title, content, image_path, link_url, position_x, position_y, width, height")
    .single();

  if (error || !data) return { error: "No se pudo crear la hoja." };
  revalidatePath(`/${space}`);
  return {
    widget: {
      content: data.content,
      height: Number(data.height),
      id: data.id,
      imagePath: data.image_path,
      imageUrl: null,
      linkUrl: data.link_url,
      positionX: Number(data.position_x),
      positionY: Number(data.position_y),
      title: data.title,
      type: "sheet" as const,
      width: Number(data.width),
    },
  };
}

export async function createImageWidget(space: string, input: { imagePath: string; title: string; x: number; y: number }) {
  if (!validSpace(space) || !validPosition(input.x) || !validPosition(input.y)) return { error: "Imagen no válida." };
  const { supabase, userId } = await getAuthenticatedClient();
  if (!input.imagePath.startsWith(`${userId}/`)) return { error: "Imagen no válida." };
  const { data, error } = await supabase
    .from("space_widgets")
    .insert({ content: emptyDocument(), image_path: input.imagePath, position_x: input.x, position_y: input.y, space_type: space, title: input.title.trim().slice(0, 120) || "Imagen", user_id: userId, widget_type: "image" })
    .select("id, title, content, image_path, link_url, position_x, position_y, width, height")
    .single();
  if (error || !data) return { error: "No se pudo crear la imagen." };
  revalidatePath(`/${space}`);
  return { widget: { content: data.content as Record<string, unknown>, height: Number(data.height), id: data.id, imagePath: data.image_path, imageUrl: null, linkUrl: data.link_url, positionX: Number(data.position_x), positionY: Number(data.position_y), title: data.title, type: "image" as const, width: Number(data.width) } };
}

export async function createLinkWidget(space: string, input: { title: string; url: string; x: number; y: number }) {
  if (!validSpace(space) || !validPosition(input.x) || !validPosition(input.y) || !isUrl(input.url)) return { error: "Enlace no válido." };
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("space_widgets")
    .insert({ content: emptyDocument(), link_url: input.url, position_x: input.x, position_y: input.y, space_type: space, title: input.title.trim().slice(0, 120) || new URL(input.url).hostname, user_id: userId, widget_type: "link" })
    .select("id, title, content, image_path, link_url, position_x, position_y, width, height")
    .single();
  if (error || !data) return { error: "No se pudo crear el enlace." };
  revalidatePath(`/${space}`);
  return { widget: { content: data.content as Record<string, unknown>, height: Number(data.height), id: data.id, imagePath: data.image_path, imageUrl: null, linkUrl: data.link_url, positionX: Number(data.position_x), positionY: Number(data.position_y), title: data.title, type: "link" as const, width: Number(data.width) } };
}

export async function saveCanvasPreference(space: string, preference: CanvasPreference) {
  if (!validSpace(space) || !validPreference(preference)) return;
  const { supabase, userId } = await getAuthenticatedClient();
  await supabase.from("space_preferences").upsert(
    {
      canvas_font: preference.font,
      canvas_layout: preference.layout,
      canvas_positions: preference.positions,
      canvas_theme: preference.theme,
      space_type: space,
      user_id: userId,
    },
    { onConflict: "user_id,space_type" },
  );
  revalidatePath(`/${space}`);
}

export async function saveSheetWidget(
  space: string,
  widget: { content: Record<string, unknown>; id: string; title: string },
) {
  if (!validSpace(space) || !UUID_PATTERN.test(widget.id) || !validDocument(widget.content)) return;
  const title = widget.title.trim().slice(0, 120) || "Nueva hoja";
  const { supabase, userId } = await getAuthenticatedClient();
  await supabase
    .from("space_widgets")
    .update({ content: widget.content, title })
    .eq("id", widget.id)
    .eq("space_type", space)
    .eq("user_id", userId);
  revalidatePath(`/${space}`);
}

export async function saveImageWidget(space: string, widget: { id: string; title: string }) {
  if (!validSpace(space) || !UUID_PATTERN.test(widget.id)) return;
  const { supabase, userId } = await getAuthenticatedClient();
  await supabase.from("space_widgets").update({ title: widget.title.trim().slice(0, 120) || "Imagen" }).eq("id", widget.id).eq("space_type", space).eq("user_id", userId).eq("widget_type", "image");
  revalidatePath(`/${space}`);
}

export async function saveWidgetDescription(space: string, widget: { description: string; id: string }) {
  if (!validSpace(space) || !UUID_PATTERN.test(widget.id) || widget.description.length > 5_000) return;
  const { supabase, userId } = await getAuthenticatedClient();
  await supabase.from("space_widgets").update({ content: { description: widget.description } }).eq("id", widget.id).eq("space_type", space).eq("user_id", userId).in("widget_type", ["image", "link"]);
  revalidatePath(`/${space}`);
}

export async function saveWidgetPosition(
  space: string,
  widget: { id: string; x: number; y: number },
) {
  if (!validSpace(space) || !UUID_PATTERN.test(widget.id) || !validPosition(widget.x) || !validPosition(widget.y)) return;
  const { supabase, userId } = await getAuthenticatedClient();
  await supabase
    .from("space_widgets")
    .update({ position_x: widget.x, position_y: widget.y })
    .eq("id", widget.id)
    .eq("space_type", space)
    .eq("user_id", userId);
  revalidatePath(`/${space}`);
}

export async function deleteSpaceWidget(space: string, id: string) {
  if (!validSpace(space) || !UUID_PATTERN.test(id)) return;
  const { supabase, userId } = await getAuthenticatedClient();
  await supabase.from("space_widgets").delete().eq("id", id).eq("space_type", space).eq("user_id", userId);
  revalidatePath(`/${space}`);
}

export async function duplicateSpaceWidget(space: string, id: string) {
  if (!validSpace(space) || !UUID_PATTERN.test(id)) return { error: "Elemento no válido." };
  const { supabase, userId } = await getAuthenticatedClient();
  const { data: source } = await supabase.from("space_widgets").select("widget_type, title, content, image_path, link_url, position_x, position_y, width, height").eq("id", id).eq("space_type", space).eq("user_id", userId).maybeSingle();
  if (!source) return { error: "No se encontró el elemento." };
  const { data, error } = await supabase.from("space_widgets").insert({ content: source.content, height: source.height, image_path: source.image_path, link_url: source.link_url, position_x: Math.min(92, Number(source.position_x) + 4), position_y: Math.min(92, Number(source.position_y) + 4), space_type: space, title: source.title, user_id: userId, widget_type: source.widget_type, width: source.width }).select("id, widget_type, title, content, image_path, link_url, position_x, position_y, width, height").single();
  if (error || !data) return { error: "No se pudo duplicar el elemento." };
  revalidatePath(`/${space}`);
  return { widget: { content: data.content as Record<string, unknown>, height: Number(data.height), id: data.id, imagePath: data.image_path, imageUrl: null, linkUrl: data.link_url, positionX: Number(data.position_x), positionY: Number(data.position_y), title: data.title, type: data.widget_type as "image" | "link" | "sheet", width: Number(data.width) } };
}

function validPreference(value: CanvasPreference) {
  if (!["order", "free"].includes(value.layout) || !["aurora", "bubblegum", "lime", "lunar"].includes(value.theme) || !["grotesk", "soft", "classic"].includes(value.font)) return false;
  return Object.keys(value.positions).length <= 80 && Object.values(value.positions).every((position) => validPosition(position.x) && validPosition(position.y));
}

function validDocument(value: Record<string, unknown>) {
  return value.type === "doc" && JSON.stringify(value).length <= 50_000;
}

function validPosition(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function isUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}
