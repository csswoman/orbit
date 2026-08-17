import { LogOut } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/(app)/actions";
import { OrbitLogo } from "@/components/brand/orbit-logo";
import { NavigationLinks } from "@/components/navigation/navigation-links";
import type { OrbitSpace } from "@/lib/orbit-spaces";

export function Sidebar({ spaces }: { spaces: OrbitSpace[] }) {
  return (
    <aside className="orbit-sidebar sticky top-0 hidden h-full w-[17.5rem] shrink-0 flex-col px-4 py-5 lg:flex">
      <Link
        aria-label="Ir al inicio de Orbit"
        className="mb-7 flex min-h-16 items-center rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)]"
        href="/"
      >
        <OrbitLogo alt="" className="w-[9.5rem]" preload />
      </Link>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <NavigationLinks spaces={spaces} />
      </div>

      <div className="mt-5 space-y-1 border-t border-white/10 pt-4">
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
