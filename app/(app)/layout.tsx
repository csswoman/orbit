import type { CSSProperties, ReactNode } from "react";

import { MobileNavigation } from "@/components/navigation/mobile-navigation";
import { Sidebar } from "@/components/navigation/sidebar";
import { getAppearance } from "@/lib/appearance";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const appearance = await getAppearance();
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
      <Sidebar />
      <div className="min-w-0 flex-1">
        <MobileNavigation />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
