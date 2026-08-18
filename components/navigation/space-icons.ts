import {
  Apple,
  Briefcase,
  FolderKanban,
  Gamepad2,
  Heart,
  Luggage,
  Repeat2,
  Shirt,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";

import type { SpaceIconId } from "@/lib/space-identity";

export const spaceIcons: Record<SpaceIconId, LucideIcon> = {
  apple: Apple,
  briefcase: Briefcase,
  "folder-kanban": FolderKanban,
  gamepad: Gamepad2,
  heart: Heart,
  luggage: Luggage,
  repeat: Repeat2,
  shirt: Shirt,
  sparkles: Sparkles,
  tag: Tag,
};

export function spaceIcon(icon: string): LucideIcon {
  return spaceIcons[icon as SpaceIconId] ?? Sparkles;
}
