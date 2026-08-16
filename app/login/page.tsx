import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="w-full max-w-md space-y-8">
        <div className="space-y-3">
          <p className="font-semibold text-indigo-700">Orbit</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Tu vida, en una órbita más clara.
          </h1>
          <p className="max-w-prose leading-7 text-zinc-700">
            Entra para ver lo próximo y volver a encontrar las ideas que habías
            guardado.
          </p>
        </div>

        {!configured ? (
          <div className="rounded-xl bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">
            Falta conectar Supabase. Copia <code>.env.example</code> como{" "}
            <code>.env.local</code> y completa los dos valores del panel Connect
            de tu proyecto.
          </div>
        ) : null}

        <LoginForm configured={configured} />
      </section>
    </main>
  );
}
