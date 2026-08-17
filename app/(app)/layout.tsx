import type { CSSProperties, ReactNode } from "react";

import { MobileNavigation } from "@/components/navigation/mobile-navigation";
import { Sidebar } from "@/components/navigation/sidebar";
import { getAppearance } from "@/lib/appearance";
import { getOrbitSpaces } from "@/lib/orbit-spaces";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const appearance = await getAppearance();
  const spaces = await getOrbitSpaces();
  const safeBackgroundUrl = appearance.dashboardBackgroundUrl?.replaceAll(
    '"',
    "%22",
  );
  const themeStyle = {
    "--orbit-accent": appearance.accentColor,
    "--orbit-background": appearance.backgroundColor,
    "--orbit-dashboard-image": safeBackgroundUrl
      ? `url("${safeBackgroundUrl}")`
      : "none",
    "--orbit-dashboard-overlay": String(appearance.dashboardOverlay),
    "--orbit-surface": appearance.surfaceColor,
    "--orbit-text": appearance.textColor,
  } as CSSProperties;

  return (
    <div className="app-frame" style={themeStyle}>
      <Sidebar spaces={spaces} />
      <div className="app-frame__stage">
        <MobileNavigation spaces={spaces} />
        <main className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
