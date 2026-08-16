import { notFound } from "next/navigation";

import { getSpace, spaces } from "@/lib/spaces";

export function generateStaticParams() {
  return spaces.map((space) => ({ space: space.slug }));
}

export default async function SpacePage({
  params,
}: {
  params: Promise<{ space: string }>;
}) {
  const { space: slug } = await params;
  const space = getSpace(slug);

  if (!space) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <p className="text-sm font-medium text-[var(--orbit-accent)]">Space</p>
      <h1 className="text-3xl font-semibold tracking-[-0.025em]">
        {space.label}
      </h1>
      <div className="max-w-2xl rounded-xl bg-[var(--orbit-surface)] p-6">
        <p className="leading-7 text-[var(--orbit-muted)]">
          Este espacio ya forma parte de la navegación. Su CRUD llegará después
          de revisar el scaffold, la base de datos y el dashboard.
        </p>
      </div>
    </section>
  );
}
