import { ChevronDown, Plus } from "lucide-react";

import { DeleteItemForm } from "@/components/spaces/delete-item-form";
import { ResourceForm } from "@/components/spaces/resource-form";
import type { CrudField, CrudResource } from "@/lib/space-crud";
import type { CrudRow, RelationOption, ResourceData } from "@/lib/space-data";

export function ResourceSection({
  data,
  fixedValues,
  hiddenFieldKeys = [],
  nested = false,
  relationOptions,
  resource,
  sectionId = resource.key,
  space,
}: {
  data?: ResourceData;
  fixedValues?: Record<string, string>;
  hiddenFieldKeys?: readonly string[];
  nested?: boolean;
  relationOptions: Record<string, RelationOption[]>;
  resource: CrudResource;
  sectionId?: string;
  space: string;
}) {
  const Heading = nested ? "h3" : "h2";

  return (
    <section aria-labelledby={`${sectionId}-title`} className="space-y-4">
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Heading
            className={`${nested ? "text-base" : "text-xl"} font-semibold tracking-[-0.02em]`}
            id={`${sectionId}-title`}
          >
            {resource.title}
          </Heading>
          {data?.status === "success" ? (
            <span className="text-sm text-[var(--orbit-muted)]">
              {data.items.length} {data.items.length === 1
                ? resource.singular
                : nested
                  ? resource.title.toLocaleLowerCase("es")
                  : "elementos"}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--orbit-muted)]">
          {resource.description}
        </p>
      </header>

      <details className="group rounded-xl bg-[var(--orbit-surface)]">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--orbit-accent)] sm:px-5">
          <span className="flex items-center gap-2">
            <Plus aria-hidden="true" className="size-4 text-[var(--orbit-accent)]" />
            Agregar {resource.singular}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-[var(--orbit-line)] p-4 sm:p-5">
          <ResourceForm
            fixedValues={fixedValues}
            mode="create"
            relationOptions={relationOptions}
            resource={resource}
            space={space}
          />
        </div>
      </details>

      {data?.status === "error" ? (
        <div className="rounded-xl bg-[var(--orbit-surface)] p-5 text-sm text-[var(--orbit-danger)]">
          No se pudieron cargar estos datos. Recarga la página e inténtalo otra vez.
        </div>
      ) : data?.items.length ? (
        <ul className="space-y-3">
          {data.items.map((item) => (
            <ResourceItem
              fixedValues={fixedValues}
              hiddenFieldKeys={hiddenFieldKeys}
              item={item}
              key={item.id}
              relationOptions={relationOptions}
              resource={resource}
              space={space}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-xl bg-[var(--orbit-surface)] p-5 text-sm leading-6 text-[var(--orbit-muted)]">
          {resource.emptyMessage}
        </div>
      )}
    </section>
  );
}

function ResourceItem({
  fixedValues,
  hiddenFieldKeys,
  item,
  relationOptions,
  resource,
  space,
}: {
  fixedValues?: Record<string, string>;
  hiddenFieldKeys: readonly string[];
  item: CrudRow;
  relationOptions: Record<string, RelationOption[]>;
  resource: CrudResource;
  space: string;
}) {
  const title = String(item[resource.titleField] || resource.singular);
  const summaryFields = resource.fields
    .filter((field) => !["image", "textarea", "url"].includes(field.type))
    .filter((field) => !hiddenFieldKeys.includes(field.key))
    .filter((field) => field.key !== resource.titleField)
    .filter((field) => item[field.key] !== null && item[field.key] !== "")
    .slice(0, 4);

  return (
    <li className="rounded-xl bg-[var(--orbit-surface)]">
      <details className="group/item">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--orbit-accent)] sm:px-5">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{title}</span>
            {summaryFields.length ? (
              <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--orbit-muted)]">
                {summaryFields.map((field) => (
                  <span key={field.key}>
                    {field.label}: {formatDisplayValue(field, item[field.key], relationOptions)}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open/item:rotate-180" />
        </summary>

        <div className="border-t border-[var(--orbit-line)] p-4 sm:p-5">
          <ResourceForm
            fixedValues={fixedValues}
            initialValues={item}
            mode="edit"
            relationOptions={relationOptions}
            resource={resource}
            space={space}
          />
          <div className="mt-5 border-t border-[var(--orbit-line)] pt-3">
            <DeleteItemForm id={item.id} resource={resource.key} space={space} />
          </div>
        </div>
      </details>
    </li>
  );
}

function formatDisplayValue(
  field: CrudField,
  value: unknown,
  relationOptions: Record<string, RelationOption[]>,
) {
  if (field.type === "checkbox") {
    return value ? "Sí" : "No";
  }

  if (field.optionsFrom) {
    return relationOptions[field.optionsFrom.resource]?.find(
      (option) => option.value === value,
    )?.label ?? "Sin relación";
  }

  if (field.options) {
    return field.options.find((option) => option.value === value)?.label ?? String(value);
  }

  if (field.type === "date") {
    const date = new Date(`${String(value)}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(date);
    }
  }

  if (field.type === "datetime-local") {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Lima",
      }).format(date);
    }
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}
