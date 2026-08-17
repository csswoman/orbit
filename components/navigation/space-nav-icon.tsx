/* eslint-disable @next/next/no-img-element -- signed storage URLs are user-specific. */

import { spaceIcon } from "@/components/navigation/space-icons";

export function SpaceNavIcon({
  icon,
  iconImageUrl,
}: {
  icon: string;
  iconImageUrl: string | null;
  label?: string;
}) {
  if (iconImageUrl) {
    return (
      <img
        alt=""
        className="orbit-nav-link__icon-image"
        height={18}
        src={iconImageUrl}
        width={18}
      />
    );
  }

  const Icon = spaceIcon(icon);
  return <Icon aria-hidden="true" className="size-[1.125rem]" />;
}
