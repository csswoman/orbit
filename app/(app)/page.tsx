import { HomeCanvas } from "@/components/home/home-canvas";
import { getOrbitItems } from "@/lib/orbit-items";

export default async function HomePage() {
  const items = await getOrbitItems(null);
  return (
    <section className="canvas-page">
      <HomeCanvas items={items} />
    </section>
  );
}
