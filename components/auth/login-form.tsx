"use client";

import { useActionState } from "react";

import {
  initialState,
  signInWithEmail,
  signInWithGoogle,
} from "@/app/login/actions";

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
          className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:bg-zinc-100"
          disabled={!configured || pending}
          id="email"
          name="email"
          placeholder="tu@correo.com"
          required
          type="email"
        />
        <button
          className="min-h-11 w-full rounded-lg bg-zinc-950 px-4 font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!configured || pending}
          type="submit"
        >
          {pending ? "Enviando…" : "Continuar con correo"}
        </button>
        <p aria-live="polite" className="min-h-6 text-sm text-zinc-700">
          {state.error ?? state.message}
        </p>
      </form>

      <form action={signInWithGoogle}>
        <button
          className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 font-medium text-zinc-950 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!configured}
          type="submit"
        >
          Continuar con Google
        </button>
      </form>
    </div>
  );
}
