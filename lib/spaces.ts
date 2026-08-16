export type Space = {
  href: string;
  icon: string;
  label: string;
  slug: string;
};

type SpaceGroup = {
  description: string;
  id: string;
  label: string;
  spaces: readonly Space[];
};

export const spaceGroups: readonly SpaceGroup[] = [
  {
    description: "Lo que cambia con el tiempo",
    id: "rhythm",
    label: "En movimiento",
    spaces: [
      { href: "/gacha", icon: "gamepad", label: "Gacha", slug: "gacha" },
      { href: "/food", icon: "apple", label: "Comida", slug: "food" },
      {
        href: "/subscriptions",
        icon: "repeat",
        label: "Suscripciones",
        slug: "subscriptions",
      },
    ],
  },
  {
    description: "Lo que quieres conservar y explorar",
    id: "inventory",
    label: "Tu universo",
    spaces: [
      {
        href: "/wishlist",
        icon: "heart",
        label: "Lista de deseos",
        slug: "wishlist",
      },
      { href: "/clothing", icon: "shirt", label: "Ropa", slug: "clothing" },
      { href: "/travel", icon: "luggage", label: "Viajes", slug: "travel" },
      { href: "/sales", icon: "tag", label: "Ventas", slug: "sales" },
      {
        href: "/projects",
        icon: "folder-kanban",
        label: "Proyectos",
        slug: "projects",
      },
      {
        href: "/inspiration",
        icon: "sparkles",
        label: "Inspiración",
        slug: "inspiration",
      },
    ],
  },
] as const;

export const spaces: readonly Space[] = spaceGroups.flatMap(
  (group) => group.spaces,
);

export function getSpace(slug: string) {
  return spaces.find((space) => space.slug === slug);
}
