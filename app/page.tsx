import Link from "next/link";

import { isSupabaseConfigured } from "@/lib/env";

export default function HomePage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="w-full max-w-2xl space-y-8">
        <div className="space-y-3">
          <p className="font-semibold text-indigo-700">Orbit</p>
          <h1 className="text-4xl font-semibold tracking-tight">
            La base está lista.
          </h1>
          <p className="max-w-prose text-lg leading-8 text-zinc-700">
            El siguiente paso conecta tu base de datos. Después aparecerán aquí
            Upcoming y Resurface.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <p className="font-medium">
            Supabase: {configured ? "conectado" : "pendiente de configurar"}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Sigue las instrucciones de README.md. Solo necesitas la URL y la
            publishable key; nunca uses una secret key en el navegador.
          </p>
        </div>

        <Link
          className="inline-flex min-h-11 items-center rounded-lg bg-zinc-950 px-5 font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          href="/login"
        >
          Abrir acceso
        </Link>
      </section>
    </main>
  );
}
