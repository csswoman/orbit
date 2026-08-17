"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

import { SpaceNavIcon } from "@/components/navigation/space-nav-icon";
import { SpaceCreator } from "@/components/navigation/space-creator";
import type { OrbitSpace } from "@/lib/orbit-spaces";

type NavigationLinksProps = {
  onNavigate?: () => void;
  spaces: OrbitSpace[];
};

export function NavigationLinks({ onNavigate, spaces }: NavigationLinksProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Espacios de Orbit" className="space-y-1">
      <Link
        aria-current={pathname === "/" ? "page" : undefined}
        className={`orbit-nav-link ${
          pathname === "/"
            ? "orbit-nav-link--active text-white"
            : "text-[var(--orbit-nav-text)] hover:bg-[var(--orbit-nav-hover)]"
        }`}
        href="/"
        onClick={onNavigate}
      >
        <span className="orbit-nav-link__icon">
          <House aria-hidden="true" className="size-[1.125rem]" />
        </span>
        <span className="min-w-0 truncate">Inicio</span>
      </Link>

      <section className="pt-4">
        <h2 className="sr-only">Tus spaces</h2>
        <ul className="space-y-1">
          {spaces.map((space) => {
            const href = `/spaces/${space.id}`;
            return (
              <li key={space.id}>
                <NavigationLink
                  accent={space.accentColor}
                  active={pathname.startsWith(href)}
                  href={href}
                  icon={space.icon}
                  iconImageUrl={space.iconImageUrl}
                  label={space.name}
                  onNavigate={onNavigate}
                />
              </li>
            );
          })}
        </ul>
        <SpaceCreator onCreated={onNavigate} />
      </section>
    </nav>
  );
}

function NavigationLink({
  accent,
  active,
  href,
  icon,
  iconImageUrl,
  label,
  onNavigate,
}: {
  accent?: string;
  active: boolean;
  href: string;
  icon: string;
  iconImageUrl?: string | null;
  label: string;
  onNavigate?: () => void;
}) {
  const style = accent
    ? ({ "--space-identity": accent } as CSSProperties)
    : undefined;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`orbit-nav-link ${accent ? "orbit-nav-link--space" : ""} ${
        active && accent
          ? "orbit-nav-link--space-active"
          : active
            ? "orbit-nav-link--active text-white"
            : "text-[var(--orbit-nav-text)] hover:bg-[var(--orbit-nav-hover)]"
      }`}
      href={href}
      onClick={onNavigate}
      style={style}
    >
      <span className="orbit-nav-link__icon">
        <SpaceNavIcon icon={icon} iconImageUrl={iconImageUrl ?? null} label={label} />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}
