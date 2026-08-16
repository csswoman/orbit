"use client";

import { LogOut, Menu, Orbit, Settings, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { signOut } from "@/app/(app)/actions";
import { NavigationLinks } from "@/components/navigation/navigation-links";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[var(--orbit-line)] bg-[var(--orbit-background)] px-4 lg:hidden">
        <Link
          className="flex min-h-11 items-center gap-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)]"
          href="/"
        >
          <Orbit aria-hidden="true" className="size-5 text-[var(--orbit-accent)]" />
          Orbit
        </Link>
        <button
          aria-expanded={open}
          aria-label="Abrir navegación"
          className="grid size-11 place-items-center rounded-lg hover:bg-[var(--orbit-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)]"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Cerrar navegación"
            className="absolute inset-0 bg-black/55"
            onClick={() => setOpen(false)}
            type="button"
          />
          <aside
            aria-label="Navegación móvil"
            className="relative flex h-full w-[min(21rem,88vw)] flex-col bg-[var(--orbit-sidebar)] p-4 text-[var(--orbit-nav-text)]"
          >
            <div className="mb-6 flex min-h-11 items-center justify-between pl-3">
              <span className="flex items-center gap-2 font-semibold">
                <Orbit aria-hidden="true" className="size-5 text-[var(--orbit-accent)]" />
                Orbit
              </span>
              <button
                aria-label="Cerrar navegación"
                className="grid size-11 place-items-center rounded-lg hover:bg-[var(--orbit-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)]"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavigationLinks onNavigate={() => setOpen(false)} />
            </div>

            <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
              <Link
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-[var(--orbit-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)]"
                href="/settings"
                onClick={() => setOpen(false)}
              >
                <Settings aria-hidden="true" className="size-[1.125rem]" />
                Apariencia
              </Link>
              <form action={signOut}>
                <button
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--orbit-nav-muted)] hover:bg-[var(--orbit-nav-hover)] hover:text-[var(--orbit-nav-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)]"
                  type="submit"
                >
                  <LogOut aria-hidden="true" className="size-[1.125rem]" />
                  Cerrar sesión
                </button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
