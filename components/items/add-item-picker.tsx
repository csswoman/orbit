"use client";

import { Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { isHttpUrl } from "@/lib/item-url";

const OPTIONS = [
  { kind: "folder" as const, label: "Carpeta" },
  { kind: "list" as const, label: "Lista" },
  { kind: "note" as const, label: "Nota" },
  { kind: "image" as const, label: "Imagen" },
  { kind: "link" as const, label: "Enlace" },
  { kind: "countdown" as const, label: "Contador" },
];

type ImmediateKind = "folder" | "list" | "note";

export function AddItemPicker({
  disabled,
  onCountdown,
  onCreate,
  onImage,
  onLink,
}: {
  disabled?: boolean;
  onCountdown: (input: { dueDate: string; title: string }) => void;
  onCreate: (kind: ImmediateKind) => void;
  onImage: () => void;
  onLink: (url: string) => void;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const linkDialog = useRef<HTMLDialogElement>(null);
  const countdownDialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [countdownError, setCountdownError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(kind: (typeof OPTIONS)[number]["kind"]) {
    setOpen(false);
    if (kind === "folder" || kind === "list" || kind === "note") {
      onCreate(kind);
      return;
    }
    if (kind === "image") {
      onImage();
      return;
    }
    if (kind === "link") {
      setLinkError(null);
      linkDialog.current?.showModal();
      return;
    }
    setCountdownError(null);
    countdownDialog.current?.showModal();
  }

  function submitLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = String(new FormData(event.currentTarget).get("url") ?? "").trim();
    if (!isHttpUrl(url)) {
      setLinkError("Enlace no válido.");
      return;
    }
    event.currentTarget.reset();
    linkDialog.current?.close();
    onLink(url);
  }

  function submitCountdown(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const dueDate = datetimeLocalToIso(String(data.get("due") ?? ""));
    if (!dueDate) {
      setCountdownError("Fecha no válida.");
      return;
    }
    event.currentTarget.reset();
    countdownDialog.current?.close();
    onCountdown({ dueDate, title });
  }

  return (
    <div className="add-item-picker" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Agregar"
        className="add-item-picker__trigger canvas-tooltip space-canvas__tool"
        data-tooltip="Agregar · N nota · T lista · I imagen"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Plus aria-hidden="true" className="size-4" />
        Agregar
      </button>
      {open ? (
        <div className="add-item-picker__menu" id={menuId} role="menu">
          {OPTIONS.map((option) => (
            <button key={option.kind} onClick={() => choose(option.kind)} role="menuitem" type="button">
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      <dialog
        aria-label="Añadir enlace"
        className="add-item-picker__dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        ref={linkDialog}
      >
        <form className="add-item-picker__form" onSubmit={submitLink}>
          <label>
            URL
            <input autoFocus name="url" placeholder="https://" type="url" />
          </label>
          {linkError ? <p role="alert">{linkError}</p> : null}
          <div className="add-item-picker__actions">
            <button onClick={() => linkDialog.current?.close()} type="button">Cancelar</button>
            <button type="submit">Añadir</button>
          </div>
        </form>
      </dialog>
      <dialog
        aria-label="Añadir contador"
        className="add-item-picker__dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        ref={countdownDialog}
      >
        <form className="add-item-picker__form" onSubmit={submitCountdown}>
          <label>
            Título
            <input name="title" placeholder="Contador" type="text" />
          </label>
          <label>
            Fecha y hora
            <input name="due" required type="datetime-local" />
          </label>
          {countdownError ? <p role="alert">{countdownError}</p> : null}
          <div className="add-item-picker__actions">
            <button onClick={() => countdownDialog.current?.close()} type="button">Cancelar</button>
            <button type="submit">Crear</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

function datetimeLocalToIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
