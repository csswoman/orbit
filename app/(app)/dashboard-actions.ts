"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function openResurfaceItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const itemType = String(formData.get("itemType") ?? "");

  if (!UUID_PATTERN.test(id) || !["project", "inspiration"].includes(itemType)) {
    return;
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    redirect("/login");
  }

  const table = itemType === "project" ? "projects" : "inspiration";
  await supabase
    .from(table)
    .update({ last_viewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", claimsData.claims.sub);

  revalidatePath("/");
  redirect(`/${itemType === "project" ? "projects" : "inspiration"}?item=${id}`);
}
