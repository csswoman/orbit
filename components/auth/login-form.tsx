"use client";

import { useActionState } from "react";

import {
  signInWithEmail,
  signInWithGoogle,
} from "@/app/login/actions";
import type { LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(
    signInWithEmail,
    initialState,
  );

  return (
    <div className="w-full max-w-sm space-y-5">
      <form action={formAction} className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="email">
          Correo
        </label>
        <input
          autoComplete="email"
          className="min-h-11 w-full rounded-lg border border-[var(--orbit-line)] bg-[var(--orbit-background)] px-3 text-[var(--orbit-text)] outline-none placeholder:text-[var(--orbit-muted)] focus-visible:border-[var(--orbit-accent)] focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!configured || pending}
          id="email"
          name="email"
          placeholder="tu@correo.com"
          required
          type="email"
        />
        <button
          className="min-h-11 w-full rounded-lg bg-[var(--orbit-accent)] px-4 font-medium text-white transition-colors duration-150 hover:bg-[var(--orbit-accent-strong)] hover:text-[var(--orbit-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!configured || pending}
          type="submit"
        >
          {pending ? "Enviando…" : "Continuar con correo"}
        </button>
        <p aria-live="polite" className="min-h-6 text-sm text-[var(--orbit-muted)]">
          {state.error ?? state.message}
        </p>
      </form>

      <form action={signInWithGoogle}>
        <button
          className="min-h-11 w-full rounded-lg border border-[var(--orbit-line)] bg-transparent px-4 font-medium text-[var(--orbit-text)] transition-colors duration-150 hover:bg-[var(--orbit-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!configured}
          type="submit"
        >
          Continuar con Google
        </button>
      </form>
    </div>
  );
}
