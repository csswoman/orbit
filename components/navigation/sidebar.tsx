import { LogOut, Orbit, Settings } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/(app)/actions";
import { NavigationLinks } from "@/components/navigation/navigation-links";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[17.5rem] shrink-0 flex-col bg-[var(--orbit-sidebar)] px-4 py-5 lg:flex">
      <Link
        aria-label="Ir al inicio de Orbit"
        className="mb-8 flex min-h-11 items-center gap-3 rounded-lg px-3 text-[var(--orbit-nav-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)]"
        href="/"
      >
        <span className="grid size-9 place-items-center rounded-full bg-[var(--orbit-accent)] text-white">
          <Orbit aria-hidden="true" className="size-5" />
        </span>
        <span className="text-lg font-semibold tracking-[-0.02em]">Orbit</span>
      </Link>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <NavigationLinks />
      </div>

      <div className="mt-5 space-y-1 border-t border-white/10 pt-4">
        <Link
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--orbit-nav-text)] hover:bg-[var(--orbit-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)]"
          href="/settings"
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
  );
}
