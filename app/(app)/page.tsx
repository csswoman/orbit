import { Suspense } from "react";

import { Dashboard } from "@/components/dashboard/dashboard";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function HomePage() {
  return (
    <section className="dashboard-stage">
      <div className="relative z-10">
        <header className="mb-7 max-w-3xl sm:mb-9">
          <p className="text-sm font-medium text-[var(--orbit-accent-strong)]">
            Hola ✦
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            ¿Qué necesita volver a tu órbita hoy?
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--orbit-muted)]">
            Primero lo que no puede esperar. Después, una idea que merece otra
            mirada.
          </p>
        </header>

        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard />
        </Suspense>
      </div>
    </section>
  );
}
