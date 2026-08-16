import { connection } from "next/server";

import { DashboardNotice } from "@/components/dashboard/dashboard-notice";
import { ResurfaceSection } from "@/components/dashboard/resurface-section";
import { UpcomingSection } from "@/components/dashboard/upcoming-section";
import { getDashboardData } from "@/lib/dashboard";

export async function Dashboard() {
  await connection();
  const now = new Date();
  const data = await getDashboardData(now);

  if (data.status === "unconfigured") {
    return (
      <DashboardNotice
        description="Crea tu proyecto, copia la URL y la publishable key en .env.local y aplica la migración. README.md contiene los pasos exactos."
        title="Conecta Supabase para activar tu dashboard"
      />
    );
  }

  if (data.status === "unauthenticated") {
    return (
      <DashboardNotice
        description="Tu sesión terminó. Vuelve a entrar para cargar tus próximos eventos e ideas."
        href="/login"
        linkLabel="Volver a entrar"
        title="Orbit necesita una sesión activa"
      />
    );
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <UpcomingSection now={now} state={data.upcoming} />
      <ResurfaceSection now={now} state={data.resurface} />
    </div>
  );
}
