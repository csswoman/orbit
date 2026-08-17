"use server";

import { redirect } from "next/navigation";

import { getSiteUrl, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
  message?: string;
};

export async function signInWithEmail(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    return { error: "Conecta Supabase antes de iniciar sesión." };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Escribe un correo válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: "No pudimos enviar el enlace. Inténtalo otra vez." };
  }

  return { message: "Revisa tu correo para entrar a Orbit." };
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=supabase");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback`,
    },
    provider: "google",
  });

  if (error || !data.url) {
    redirect("/login?error=google");
  }

  redirect(data.url);
}
