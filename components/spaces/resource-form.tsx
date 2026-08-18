"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  saveSpaceItem,
  type CrudActionState,
} from "@/app/(app)/space-actions";
import { ImageUploader } from "@/components/items/image-uploader";
import type { CrudField, CrudResource } from "@/lib/space-crud";
import type { RelationOption } from "@/lib/space-data";

const initialState: CrudActionState = { status: "idle" };

type ResourceFormProps = {
  fixedValues?: Record<string, string>;
  initialValues?: Record<string, unknown>;
  mode: "create" | "edit";
  relationOptions: Record<string, RelationOption[]>;
  resource: CrudResource;
  space: string;
};

export function ResourceForm({
  fixedValues = {},
  initialValues,
  mode,
  relationOptions,
  resource,
  space,
}: ResourceFormProps) {
  const [state, formAction, pending] = useActionState(
    saveSpaceItem,
    initialState,
  );
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (mode === "create" && state.status === "success") {
      formRef.current?.reset();
    }
  }, [mode, state.resetKey, state.status]);

  const missingRelation = resource.fields.find(
    (field) =>
      !(field.key in fixedValues) &&
      field.required &&
      field.optionsFrom &&
      (relationOptions[field.optionsFrom.resource]?.length ?? 0) === 0,
  );

  return (
    <form action={formAction} className="space-y-4" ref={formRef}>
      <input name="space" type="hidden" value={space} />
      <input name="resource" type="hidden" value={resource.key} />
      {initialValues?.id ? (
        <input name="id" type="hidden" value={String(initialValues.id)} />
      ) : null}
      {Object.entries(fixedValues).map(([key, value]) => (
        <input key={key} name={key} type="hidden" value={value} />
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        {resource.fields
          .filter((field) => !(field.key in fixedValues))
          .map((field) => (
            <FormField
              field={field}
              idPrefix={formId}
              initialValue={initialValues?.[field.key]}
              key={field.key}
              onImageUploadingChange={setImageUploading}
              relationOptions={relationOptions}
              resetKey={mode === "create" ? state.resetKey : undefined}
            />
          ))}
      </div>

      {missingRelation?.optionsFrom ? (
        <p className="rounded-lg bg-[var(--orbit-background)] px-3 py-2 text-sm text-[var(--orbit-muted)]">
          Crea primero una opción para «{missingRelation.label}».
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="min-h-11 rounded-lg bg-[var(--orbit-accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending || imageUploading || Boolean(missingRelation)}
          type="submit"
        >
          {pending
            ? "Guardando…"
            : mode === "create"
              ? `Agregar ${resource.singular}`
              : "Guardar cambios"}
        </button>
        <p
          aria-live="polite"
          className={`text-sm ${
            state.status === "error"
              ? "text-[var(--orbit-danger)]"
              : "text-[var(--orbit-muted)]"
          }`}
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}

function FormField({
  field,
  idPrefix,
  initialValue,
  onImageUploadingChange,
  relationOptions,
  resetKey,
}: {
  field: CrudField;
  idPrefix: string;
  initialValue: unknown;
  onImageUploadingChange?: (uploading: boolean) => void;
  relationOptions: Record<string, RelationOption[]>;
  resetKey?: number;
}) {
  const id = `${idPrefix}-${field.key}`;
  const fieldClass = field.type === "textarea" ? "sm:col-span-2" : undefined;
  const options = field.optionsFrom
    ? relationOptions[field.optionsFrom.resource] ?? []
    : field.options ?? [];

  if (field.type === "image") {
    return (
      <ImageUploader
        initialPath={initialValue ? String(initialValue) : null}
        label={field.label}
        name={field.key}
        onUploadingChange={onImageUploadingChange}
        resetKey={resetKey}
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <label
        className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--orbit-line)] px-3 py-2 text-sm font-medium"
        htmlFor={id}
      >
        <input
          className="size-4 accent-[var(--orbit-accent)]"
          defaultChecked={Boolean(initialValue ?? field.defaultValue)}
          id={id}
          name={field.key}
          type="checkbox"
        />
        {field.label}
      </label>
    );
  }

  const defaultValue = formatInputValue(field, initialValue);

  return (
    <label className={`grid gap-1.5 text-sm font-medium ${fieldClass ?? ""}`} htmlFor={id}>
      {field.label}
      {field.type === "textarea" ? (
        <textarea
          className="min-h-24 resize-y rounded-lg border border-[var(--orbit-line)] bg-[var(--orbit-background)] px-3 py-2.5 font-normal outline-none focus:border-[var(--orbit-accent)] focus:ring-2 focus:ring-[var(--orbit-accent-soft)]"
          defaultValue={defaultValue}
          id={id}
          maxLength={5000}
          name={field.key}
          placeholder={field.placeholder}
          required={field.required}
        />
      ) : field.type === "select" ? (
        <select
          className="min-h-11 rounded-lg border border-[var(--orbit-line)] bg-[var(--orbit-background)] px-3 py-2 font-normal outline-none focus:border-[var(--orbit-accent)] focus:ring-2 focus:ring-[var(--orbit-accent-soft)]"
          defaultValue={
            defaultValue ||
            String(field.defaultValue ?? (field.required ? options[0]?.value ?? "" : ""))
          }
          id={id}
          name={field.key}
          required={field.required}
        >
          {!field.required || options.length === 0 ? (
            <option value="">{field.emptyLabel ?? "Selecciona una opción"}</option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="min-h-11 rounded-lg border border-[var(--orbit-line)] bg-[var(--orbit-background)] px-3 py-2 font-normal outline-none focus:border-[var(--orbit-accent)] focus:ring-2 focus:ring-[var(--orbit-accent-soft)]"
          defaultValue={defaultValue}
          id={id}
          min={field.type === "number" ? "0" : undefined}
          name={field.key}
          placeholder={field.placeholder}
          required={field.required}
          step={field.step}
          type={field.type === "tags" ? "text" : field.type}
        />
      )}
    </label>
  );
}

function formatInputValue(field: CrudField, value: unknown) {
  if (value === null || value === undefined) {
    return typeof field.defaultValue === "string" ? field.defaultValue : "";
  }

  if (field.type === "tags" && Array.isArray(value)) {
    return value.join(", ");
  }

  if (field.type === "datetime-local") {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      const limaTime = new Date(date.getTime() - 5 * 60 * 60 * 1000);
      return limaTime.toISOString().slice(0, 16);
    }
  }

  return String(value);
}
