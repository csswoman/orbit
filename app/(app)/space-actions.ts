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

export type CrudActionState = {
  message?: string;
  resetKey?: number;
  status: "error" | "idle" | "success";
};

function error(message: string): CrudActionState {
  return { message, status: "error" };
}

function parseField(field: CrudField, formData: FormData) {
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
    const hasContent = [data.title, data.image_url, data.source_url, data.note].some(Boolean);
    if (!hasContent) {
      throw new Error("Agrega un título, una imagen, un enlace o una nota.");
    }
    if (data.source_type === "url" && !data.source_url) {
      throw new Error("Una inspiración de enlace necesita su URL de origen.");
    }
    if (data.source_type === "sketch" && !data.image_url) {
      throw new Error("Un boceto necesita la URL de su imagen.");
    }
  }
}

export async function saveSpaceItem(
  _previousState: CrudActionState,
  formData: FormData,
): Promise<CrudActionState> {
  const space = String(formData.get("space") ?? "");
  const resourceKey = String(formData.get("resource") ?? "");
  const id = String(formData.get("id") ?? "");
  const resource = getCrudResource(space, resourceKey);

  if (!getCrudConfig(space) || !resource || (id && !UUID_PATTERN.test(id))) {
    return error("La solicitud no es válida.");
  }

  let values: Record<string, unknown>;
  try {
    values = Object.fromEntries(
      resource.fields.map((field) => [field.key, parseField(field, formData)]),
    );
    validateCombinedData(resourceKey, values);
  } catch (validationError) {
    return error(
      validationError instanceof Error
        ? validationError.message
        : "Revisa los campos del formulario.",
    );
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const query = id
    ? supabase
        .from(resource.table)
        .update(values)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle()
    : supabase
        .from(resource.table)
        .insert({ ...values, user_id: userId })
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

  revalidatePath(`/${space}`);
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
  const resource = getCrudResource(space, resourceKey);

  if (!resource || !UUID_PATTERN.test(id)) {
    return;
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { error: deleteError } = await supabase
    .from(resource.table)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Orbit CRUD deletion failed", {
      code: deleteError.code,
      message: deleteError.message,
      resource: resource.table,
    });
    return;
  }

  revalidatePath(`/${space}`);
  revalidatePath("/");
}
