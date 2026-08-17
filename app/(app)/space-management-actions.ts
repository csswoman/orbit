"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCrudConfig, type SpaceKind } from "@/lib/space-crud";
import {
  ACCENT_COLOR_PATTERN,
  defaultAccentForKind,
  isSpaceIcon,
  normalizeAccentColor,
} from "@/lib/space-identity";
import {
  isOwnedStoragePath,
  normalizeBackgroundOverlay,
  SPACE_IDENTITY_BUCKET,
} from "@/lib/space-media";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return { supabase, userId: data.claims.sub };
}

function parseSpace(formData: FormData) {
  const kind = String(formData.get("kind") ?? "") as SpaceKind;
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const icon = String(formData.get("icon") ?? "");
  if (!getCrudConfig(kind) || !name || !isSpaceIcon(icon)) return null;
  return { icon, kind, name };
}

function parseIdentity(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const icon = String(formData.get("icon") ?? "");
  const accentColor = String(formData.get("accent_color") ?? "").trim();
  const backgroundOverlay = normalizeBackgroundOverlay(formData.get("background_overlay"));
  const clearIcon = formData.get("clear_icon") === "true";
  const clearBackground = formData.get("clear_background") === "true";
  const iconImagePath = String(formData.get("icon_image_path") ?? "").trim();
  const backgroundImagePath = String(formData.get("background_image_path") ?? "").trim();

  if (!name || !isSpaceIcon(icon) || !ACCENT_COLOR_PATTERN.test(accentColor)) return null;

  return {
    accentColor: normalizeAccentColor(accentColor),
    backgroundImagePath: backgroundImagePath || null,
    backgroundOverlay,
    clearBackground,
    clearIcon,
    icon,
    iconImagePath: iconImagePath || null,
    name,
  };
}

export async function createOrbitSpace(formData: FormData) {
  const input = parseSpace(formData);
  if (!input) throw new Error("Los datos del espacio no son válidos.");
  const { supabase, userId } = await currentUser();
  const { data: lastSpace, error: lastSpaceError } = await supabase
    .from("orbit_spaces")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSpaceError) throw new Error("No pudimos preparar el nuevo espacio.");

  const { data, error } = await supabase
    .from("orbit_spaces")
    .insert({
      ...input,
      accent_color: defaultAccentForKind(input.kind),
      position: (lastSpace?.position ?? 0) + 10,
      user_id: userId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("No pudimos crear el espacio. Inténtalo de nuevo.");
  revalidatePath("/", "layout");
  redirect(`/spaces/${data.id}`);
}

export async function updateOrbitSpace(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const input = parseIdentity(formData);
  if (!UUID_PATTERN.test(id) || !input) return { error: "Datos no válidos." };

  const { supabase, userId } = await currentUser();
  const update: Record<string, unknown> = {
    accent_color: input.accentColor,
    background_overlay: input.backgroundOverlay,
    icon: input.icon,
    name: input.name,
  };

  if (input.clearIcon) {
    update.icon_image_path = null;
  } else if (input.iconImagePath) {
    if (!isOwnedStoragePath(input.iconImagePath, userId, id)) {
      return { error: "La imagen del icono no es válida." };
    }
    update.icon_image_path = input.iconImagePath;
  }

  if (input.clearBackground) {
    update.background_image_path = null;
  } else if (input.backgroundImagePath) {
    if (!isOwnedStoragePath(input.backgroundImagePath, userId, id)) {
      return { error: "La imagen de fondo no es válida." };
    }
    update.background_image_path = input.backgroundImagePath;
  }

  const { error } = await supabase
    .from("orbit_spaces")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { error: "No se pudo guardar la configuración." };

  revalidatePath("/", "layout");
  revalidatePath(`/spaces/${id}`);

  let iconImageUrl: string | null = null;
  let backgroundImageUrl: string | null = null;

  if (typeof update.icon_image_path === "string") {
    const { data } = await supabase.storage
      .from(SPACE_IDENTITY_BUCKET)
      .createSignedUrl(update.icon_image_path, 60 * 60);
    iconImageUrl = data?.signedUrl ?? null;
  }

  if (typeof update.background_image_path === "string") {
    const { data } = await supabase.storage
      .from(SPACE_IDENTITY_BUCKET)
      .createSignedUrl(update.background_image_path, 60 * 60);
    backgroundImageUrl = data?.signedUrl ?? null;
  }

  return {
    backgroundImageUrl: input.clearBackground ? null : backgroundImageUrl,
    iconImageUrl: input.clearIcon ? null : iconImageUrl,
  };
}

export async function archiveOrbitSpace(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!UUID_PATTERN.test(id)) return;
  const { supabase, userId } = await currentUser();
  await supabase
    .from("orbit_spaces")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/", "layout");
  redirect("/");
}
