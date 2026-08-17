import { Database, MoveRight } from "lucide-react";
import Link from "next/link";

export function DashboardNotice({
  description,
  href,
  linkLabel,
  title,
}: {
  description: string;
  href?: string;
  linkLabel?: string;
  title: string;
}) {
  return (
    <section className="dashboard-panel flex min-h-64 flex-col justify-between gap-8 p-6 sm:p-8">
      <div className="space-y-4">
        <span className="grid size-11 place-items-center rounded-full bg-[var(--orbit-accent-soft)] text-[var(--orbit-accent)]">
          <Database aria-hidden="true" className="size-5" />
        </span>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">{title}</h2>
          <p className="max-w-2xl leading-7 text-[var(--orbit-muted)]">
            {description}
          </p>
        </div>
      </div>
      {href && linkLabel ? (
        <Link
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-[var(--orbit-accent)] px-4 font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent-strong)]"
          href={href}
        >
          {linkLabel}
          <MoveRight aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </section>
  );
}
