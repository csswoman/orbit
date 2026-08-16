import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type Appearance = {
  accentColor: string;
  backgroundColor: string;
  dashboardBackgroundUrl: string | null;
  dashboardOverlay: number;
  surfaceColor: string;
  textColor: string;
};

export const defaultAppearance: Appearance = {
  accentColor: "oklch(0.55 0.16 65.1)",
  backgroundColor: "oklch(1 0 0)",
  dashboardBackgroundUrl: null,
  dashboardOverlay: 0.65,
  surfaceColor: "oklch(0.97 0.006 65.1)",
  textColor: "oklch(0.17 0.015 65.1)",
};

export async function getAppearance(): Promise<Appearance> {
  if (!isSupabaseConfigured()) {
    return defaultAppearance;
  }

  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();

    if (!claimsData?.claims?.sub) {
      return defaultAppearance;
    }

    const { data: preferences } = await supabase
      .from("user_preferences")
      .select(
        "accent_color, background_color, surface_color, text_color, dashboard_background_path, dashboard_overlay",
      )
      .maybeSingle();

    if (!preferences) {
      return defaultAppearance;
    }

    let dashboardBackgroundUrl: string | null = null;

    if (preferences.dashboard_background_path) {
      const { data } = await supabase.storage
        .from("orbit-backgrounds")
        .createSignedUrl(preferences.dashboard_background_path, 60 * 60);
      dashboardBackgroundUrl = data?.signedUrl ?? null;
    }

    return {
      accentColor: preferences.accent_color,
      backgroundColor: preferences.background_color,
      dashboardBackgroundUrl,
      dashboardOverlay: Number(preferences.dashboard_overlay),
      surfaceColor: preferences.surface_color,
      textColor: preferences.text_color,
    };
  } catch {
    return defaultAppearance;
  }
}
