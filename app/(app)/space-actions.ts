"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCrudConfig,
  getCrudResource,
  type CrudField,
} from "@/lib/space-crud";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COLOR_PATTERN = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
const CANVAS_BUCKET = "orbit-canvas";

async function getOwnedSpace(spaceId: string, userId: string) {
  if (!UUID_PATTERN.test(spaceId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orbit_spaces")
    .select("id, kind")
    .eq("id", spaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return data && getCrudConfig(String(data.kind)) ? data : null;
}

export type CrudActionState = {
  message?: string;
  resetKey?: number;
  status: "error" | "idle" | "success";
};

function error(message: string): CrudActionState {
  return { message, status: "error" };
}

function parseField(field: CrudField, formData: FormData, userId: string) {
  if (field.type === "checkbox") {
    return formData.get(field.key) === "on";
  }

  const raw = String(formData.get(field.key) ?? "").trim();

  if (!raw) {
    if (field.required) {
      throw new Error(`${field.label} es obligatorio.`);
    }
    return null;
  }

  if (field.type === "number") {
    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0) {
      throw new Error(`${field.label} debe ser un número válido.`);
    }
    return number;
  }

  if (field.type === "datetime-local") {
    const date = new Date(`${raw}:00-05:00`);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${field.label} no tiene una fecha válida.`);
    }
    return date.toISOString();
  }

  if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`${field.label} no tiene una fecha válida.`);
  }

  if (field.type === "url") {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error(`${field.label} debe ser una URL válida.`);
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`${field.label} debe comenzar con http:// o https://.`);
    }
  }

  if (field.type === "image") {
    if (!raw.startsWith(`${userId}/`)) {
      throw new Error(`${field.label} no es válida.`);
    }
    if (raw.length > 512) {
      throw new Error(`${field.label} es demasiado larga.`);
    }
    return raw;
  }

  if (field.key === "color" && !COLOR_PATTERN.test(raw)) {
    throw new Error(`${field.label} debe tener el formato #RRGGBB.`);
  }

  if (field.type === "select") {
    if (field.options && !field.options.some((option) => option.value === raw)) {
      throw new Error(`${field.label} no es válido.`);
    }
    if (field.optionsFrom && !UUID_PATTERN.test(raw)) {
      throw new Error(`${field.label} no es válido.`);
    }
  }

  if (field.type === "tags") {
    const tags = raw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tags.length > 20 || tags.some((tag) => tag.length > 50)) {
      throw new Error("Usa como máximo 20 etiquetas de 50 caracteres.");
    }
    return [...new Set(tags)];
  }

  const maxLength = field.type === "textarea" ? 5000 : field.type === "url" ? 2048 : 300;
  if (raw.length > maxLength) {
    throw new Error(`${field.label} es demasiado largo.`);
  }

  return raw;
}

function validateCombinedData(resourceKey: string, data: Record<string, unknown>) {
  if (
    resourceKey === "events" &&
    data.starts_at &&
    data.ends_at &&
    String(data.starts_at) > String(data.ends_at)
  ) {
    throw new Error("La fecha de inicio no puede ser posterior al final.");
  }

  if (
    resourceKey === "items" &&
    data.purchased_at &&
    data.expires_at &&
    String(data.purchased_at) > String(data.expires_at)
  ) {
    throw new Error("La compra no puede ser posterior al vencimiento.");
  }

  if ("source_type" in data) {
    const hasContent = [
      data.title,
      data.image_path,
      data.image_url,
      data.source_url,
      data.note,
    ].some(Boolean);
    if (!hasContent) {
      throw new Error("Agrega un título, una imagen, un enlace o una nota.");
    }
    if (data.source_type === "url" && !data.source_url) {
      throw new Error("Una inspiración de enlace necesita su URL de origen.");
    }
    if (data.source_type === "sketch" && !data.image_path && !data.image_url) {
      throw new Error("Un boceto necesita su imagen.");
    }
  }
}

function applyImageFieldEdits(
  resource: { fields: readonly CrudField[] },
  values: Record<string, unknown>,
  formData: FormData,
  existingRow: Record<string, unknown> | null,
) {
  for (const field of resource.fields) {
    if (field.type !== "image") continue;

    const submittedRaw = String(formData.get(field.key) ?? "").trim();
    const existingPath = existingRow?.[field.key];

    if (existingRow) {
      if (!submittedRaw) {
        if (existingPath) {
          values[field.key] = null;
        } else {
          delete values[field.key];
        }
      }
    }
  }
}

function buildValidationData(
  resource: { fields: readonly CrudField[] },
  values: Record<string, unknown>,
  existingRow: Record<string, unknown> | null,
) {
  const validationData = { ...values };

  if (!existingRow) return validationData;

  for (const field of resource.fields) {
    if (field.type !== "image") continue;
    if (validationData[field.key]) continue;
    if (existingRow[field.key]) {
      validationData[field.key] = existingRow[field.key];
    }
  }

  if (!validationData.image_path && existingRow.image_path) {
    validationData.image_path = existingRow.image_path;
  }
  if (!validationData.image_url && existingRow.image_url) {
    validationData.image_url = existingRow.image_url;
  }

  return validationData;
}

async function removeOwnedCanvasPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  path: unknown,
) {
  const storagePath = String(path ?? "");
  if (!storagePath.startsWith(`${userId}/`)) return;
  await supabase.storage.from(CANVAS_BUCKET).remove([storagePath]);
}

export async function saveSpaceItem(
  _previousState: CrudActionState,
  formData: FormData,
): Promise<CrudActionState> {
  const space = String(formData.get("space") ?? "");
  const resourceKey = String(formData.get("resource") ?? "");
  const id = String(formData.get("id") ?? "");
  if (id && !UUID_PATTERN.test(id)) {
    return error("La solicitud no es válida.");
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const ownedSpace = await getOwnedSpace(space, userId);
  const resource = ownedSpace ? getCrudResource(String(ownedSpace.kind), resourceKey) : undefined;
  if (!resource) return error("El espacio ya no está disponible.");

  let existingRow: Record<string, unknown> | null = null;
  if (id) {
    const { data: existing } = await supabase
      .from(resource.table)
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .eq("space_id", space)
      .maybeSingle();
    if (!existing) return error("El elemento ya no está disponible.");
    existingRow = existing;
  }

  let values: Record<string, unknown>;
  try {
    values = Object.fromEntries(
      resource.fields.map((field) => [field.key, parseField(field, formData, userId)]),
    );
    applyImageFieldEdits(resource, values, formData, existingRow);
    validateCombinedData(
      resourceKey,
      buildValidationData(resource, values, existingRow),
    );
  } catch (validationError) {
    return error(
      validationError instanceof Error
        ? validationError.message
        : "Revisa los campos del formulario.",
    );
  }

  const query = id
    ? supabase
        .from(resource.table)
        .update(values)
        .eq("id", id)
        .eq("user_id", userId)
        .eq("space_id", space)
        .select("id")
        .maybeSingle()
    : supabase
        .from(resource.table)
        .insert({ ...values, space_id: space, user_id: userId })
        .select("id")
        .single();

  const { data, error: mutationError } = await query;

  if (mutationError || !data) {
    console.error("Orbit CRUD mutation failed", {
      code: mutationError?.code,
      message: mutationError?.message,
      resource: resource.table,
    });
    return error("No se pudo guardar. Revisa los datos e inténtalo otra vez.");
  }

  if (existingRow) {
    for (const field of resource.fields) {
      if (field.type !== "image") continue;
      const oldPath = existingRow[field.key];
      const newPath = values[field.key];
      if (oldPath && newPath !== oldPath) {
        await removeOwnedCanvasPath(supabase, userId, oldPath);
      }
    }
  }

  revalidatePath(`/spaces/${space}`);
  revalidatePath("/");

  return {
    message: `${resource.singular[0].toUpperCase()}${resource.singular.slice(1)} guardado.`,
    resetKey: Date.now(),
    status: "success",
  };
}

export async function deleteSpaceItem(formData: FormData) {
  const space = String(formData.get("space") ?? "");
  const resourceKey = String(formData.get("resource") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!UUID_PATTERN.test(id)) {
    return;
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const ownedSpace = await getOwnedSpace(space, userId);
  const resource = ownedSpace ? getCrudResource(String(ownedSpace.kind), resourceKey) : undefined;
  if (!resource) return;

  const { error: deleteError } = await supabase
    .from(resource.table)
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("space_id", space);

  if (deleteError) {
    console.error("Orbit CRUD deletion failed", {
      code: deleteError.code,
      message: deleteError.message,
      resource: resource.table,
    });
    return;
  }

  revalidatePath(`/spaces/${space}`);
  revalidatePath("/");
}
