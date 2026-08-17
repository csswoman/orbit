"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { deleteSpaceItem } from "@/app/(app)/space-actions";

export function DeleteItemForm({
  confirmationMessage = "¿Eliminar este elemento? Esta acción no se puede deshacer.",
  id,
  resource,
  space,
}: {
  confirmationMessage?: string;
  id: string;
  resource: string;
  space: string;
}) {
  return (
    <form
      action={deleteSpaceItem}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={id} />
      <input name="resource" type="hidden" value={resource} />
      <input name="space" type="hidden" value={space} />
      <DeleteButton />
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
        className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[var(--orbit-danger)] hover:bg-[var(--orbit-danger-soft)] disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      <Trash2 aria-hidden="true" className="size-4" />
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
