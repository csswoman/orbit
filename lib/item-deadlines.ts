import type { SupabaseClient } from "@supabase/supabase-js";

export function orbitDeadlineRow(item: { dueDate: string; id: string; title: string }) {
  return {
    space_type: "orbit_item" as const,
    source_id: item.id,
    title: item.title,
    due_date: item.dueDate,
    status: "active" as const,
    is_recurring: false,
    image_url: null,
  };
}

export function shouldDeleteDeadline(dueDate: string | null): dueDate is null {
  return dueDate === null;
}

export function countdownDayLabel(days: number) {
  if (days > 0) return `Faltan ${days} días`;
  if (days < 0) return `Hace ${Math.abs(days)} días`;
  return "Hoy";
}

export async function syncOrbitDeadline(
  supabase: SupabaseClient,
  userId: string,
  item: { dueDate: string | null; id: string; title: string },
) {
  if (shouldDeleteDeadline(item.dueDate)) {
    const { error } = await supabase
      .from("deadlines")
      .delete()
      .eq("space_type", "orbit_item")
      .eq("source_id", item.id)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("deadlines").upsert(
    {
      ...orbitDeadlineRow({ dueDate: item.dueDate, id: item.id, title: item.title }),
      user_id: userId,
    },
    { onConflict: "user_id,space_type,source_id" },
  );
  if (error) throw error;
}
