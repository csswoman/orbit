import { HomeCanvas } from "@/components/home/home-canvas";
import { getHomeCanvas } from "@/lib/home-canvas";

export default async function HomePage() {
  const data = await getHomeCanvas();
  return (
    <section className="canvas-page">
      <HomeCanvas data={data} />
    </section>
  );
}
