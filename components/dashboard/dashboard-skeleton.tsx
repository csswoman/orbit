export function DashboardSkeleton() {
  return (
    <div
      aria-label="Cargando dashboard"
      className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
      role="status"
    >
      <SkeletonPanel rows={4} />
      <SkeletonPanel rows={3} />
    </div>
  );
}

function SkeletonPanel({ rows }: { rows: number }) {
  return (
    <div className="dashboard-panel p-6">
      <div className="dashboard-skeleton h-6 w-36 rounded-md" />
      <div className="mt-7 space-y-4">
        {Array.from({ length: rows }, (_, index) => (
          <div className="flex items-center gap-4" key={index}>
            <div className="dashboard-skeleton size-12 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="dashboard-skeleton h-4 w-3/5 rounded" />
              <div className="dashboard-skeleton h-3 w-2/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
