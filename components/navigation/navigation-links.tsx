"use client";

import {
  Apple,
  FolderKanban,
  Gamepad2,
  Heart,
  House,
  Luggage,
  Repeat2,
  Shirt,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { spaceGroups } from "@/lib/spaces";

const icons: Record<string, LucideIcon> = {
  apple: Apple,
  "folder-kanban": FolderKanban,
  gamepad: Gamepad2,
  heart: Heart,
  luggage: Luggage,
  repeat: Repeat2,
  shirt: Shirt,
  sparkles: Sparkles,
  tag: Tag,
};

type NavigationLinksProps = {
  onNavigate?: () => void;
};

export function NavigationLinks({ onNavigate }: NavigationLinksProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Espacios de Orbit" className="space-y-7">
      <NavigationLink
        active={pathname === "/"}
        href="/"
        icon={House}
        label="Inicio"
        onNavigate={onNavigate}
      />

      {spaceGroups.map((group) => (
        <section className="space-y-2" key={group.id}>
          <div className="px-3">
            <h2 className="text-[0.8125rem] font-semibold text-[var(--orbit-nav-heading)]">
              {group.label}
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-[var(--orbit-nav-muted)]">
              {group.description}
            </p>
          </div>
          <ul className="space-y-1">
            {group.spaces.map((space) => {
              const Icon = icons[space.icon];
              return (
                <li key={space.slug}>
                  <NavigationLink
                    active={pathname.startsWith(space.href)}
                    href={space.href}
                    icon={Icon}
                    label={space.label}
                    onNavigate={onNavigate}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function NavigationLink({
  active,
  href,
  icon: Icon,
  label,
  onNavigate,
}: {
  active: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent)] ${
        active
          ? "orbit-nav-link--active text-white"
          : "text-[var(--orbit-nav-text)] hover:bg-[var(--orbit-nav-hover)]"
      }`}
      href={href}
      onClick={onNavigate}
    >
      <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
