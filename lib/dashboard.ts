import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const UPCOMING_DAYS = 7;

export type DeadlineItem = {
  color: string | null;
  due_date: string;
  id: string;
  image_url: string | null;
  is_recurring: boolean;
  source_id: string;
  space_type: "food_item" | "gacha_event" | "subscription" | "orbit_item";
  title: string;
};

export type ResurfaceItem = {
  color: string | null;
  created_at: string;
  id: string;
  image_url: string | null;
  item_type: "inspiration" | "project";
  last_viewed_at: string;
  summary: string | null;
  title: string;
};

type QueryState<T> =
  | { items: T[]; status: "success" }
  | { status: "error" };

export type DashboardData =
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | {
      resurface: QueryState<ResurfaceItem>;
      status: "ready";
      upcoming: QueryState<DeadlineItem>;
    };

export async function getDashboardData(now = new Date()): Promise<DashboardData> {
  if (!isSupabaseConfigured()) {
    return { status: "unconfigured" };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    return { status: "unauthenticated" };
  }

  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() + UPCOMING_DAYS);

  const upcomingQuery = supabase
    .from("deadlines")
    .select(
      "id, source_id, space_type, title, due_date, is_recurring, image_url, color",
    )
    .eq("status", "active")
    .lt("due_date", cutoff.toISOString())
    .order("due_date", { ascending: true })
    .overrideTypes<DeadlineItem[], { merge: false }>();

  const resurfaceQuery = supabase
    .from("resurface_items")
    .select(
      "id, item_type, title, summary, image_url, color, last_viewed_at, created_at",
    )
    .order("last_viewed_at", { ascending: true })
    .limit(5)
    .overrideTypes<ResurfaceItem[], { merge: false }>();

  const [upcomingResult, resurfaceResult] = await Promise.all([
    upcomingQuery,
    resurfaceQuery,
  ]);

  return {
    resurface: resurfaceResult.error
      ? { status: "error" }
      : { items: resurfaceResult.data ?? [], status: "success" },
    status: "ready",
    upcoming: upcomingResult.error
      ? { status: "error" }
      : { items: upcomingResult.data ?? [], status: "success" },
  };
}
