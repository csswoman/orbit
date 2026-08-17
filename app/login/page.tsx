import { LoginForm } from "@/components/auth/login-form";
import { OrbitLogo } from "@/components/brand/orbit-logo";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="login-page flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden px-6 py-12 sm:py-16">
      <section className="w-full max-w-[calc(100vw-3rem)] rounded-2xl bg-[var(--orbit-surface)] p-6 sm:max-w-md sm:p-9">
        <div className="space-y-4">
          <OrbitLogo className="w-48" preload />
          <h1 className="orbit-display-title break-words text-3xl font-semibold">
            Tu vida, en una órbita más clara.
          </h1>
          <p className="max-w-prose leading-7 text-[var(--orbit-muted)]">
            Entra para ver lo próximo y volver a encontrar las ideas que habías
            guardado.
          </p>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-xl bg-[var(--orbit-accent-soft)] p-4 text-sm leading-6">
            Falta conectar Supabase. Copia <code>.env.example</code> como{" "}
            <code>.env.local</code> y completa los dos valores del panel Connect
            de tu proyecto.
          </div>
        ) : null}

        <div className="mt-8">
          <LoginForm configured={configured} />
        </div>
      </section>
    </main>
  );
}
