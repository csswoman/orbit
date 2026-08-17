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
  accentColor: "#6350C9",
  backgroundColor: "#0A0D1E",
  dashboardBackgroundUrl: null,
  dashboardOverlay: 0.72,
  surfaceColor: "#14182F",
  textColor: "#F5F4FF",
};

const legacyDefaultAppearance = {
  accentColor: "#4F46E5",
  backgroundColor: "#FAFAFA",
  surfaceColor: "#FFFFFF",
  textColor: "#18181B",
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

    const savedAppearance = {
      accentColor: preferences.accent_color,
      backgroundColor: preferences.background_color,
      dashboardBackgroundUrl,
      dashboardOverlay: Number(preferences.dashboard_overlay),
      surfaceColor: preferences.surface_color,
      textColor: preferences.text_color,
    };

    const usesLegacyDefaults = Object.entries(legacyDefaultAppearance).every(
      ([key, value]) =>
        savedAppearance[key as keyof typeof legacyDefaultAppearance] === value,
    );

    return usesLegacyDefaults
      ? {
          ...defaultAppearance,
          dashboardBackgroundUrl,
          dashboardOverlay: Number(preferences.dashboard_overlay),
        }
      : savedAppearance;
  } catch {
    return defaultAppearance;
  }
}
