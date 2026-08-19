import { HomeCanvas } from "@/components/home/home-canvas";
import { HomeSummaries } from "@/components/home/home-summaries";
import { HomeUpcoming } from "@/components/home/home-upcoming";
import { getDashboardData } from "@/lib/dashboard";
import { getHomeSummaries, getOrbitItems } from "@/lib/orbit-items";

export default async function HomePage() {
  const [canvas, dashboard, summaries] = await Promise.all([
    getOrbitItems(null),
    getDashboardData(),
    getHomeSummaries(),
  ]);

  return (
    <section className="canvas-page">
      <div className="home-hud">
        <HomeUpcoming
          state={dashboard.status === "ready" ? dashboard.upcoming : { status: "error" }}
        />
        {summaries ? <HomeSummaries summaries={summaries} /> : null}
      </div>
      <HomeCanvas items={canvas} />
    </section>
  );
}
