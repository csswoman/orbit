export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <header className="max-w-2xl">
        <p className="orbit-kicker">
          Configuración
        </p>
        <h1 className="orbit-display-title mt-2 text-3xl font-semibold">Apariencia</h1>
        <p className="mt-3 leading-7 text-[var(--orbit-muted)]">
          Tu universo puede cambiar sin que tus colecciones pierdan claridad.
          Los estilos de cada space se guardan en este navegador.
        </p>
      </header>
      <div className="dashboard-panel max-w-3xl p-5 sm:p-7">
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="grid size-20 place-items-center rounded-full border border-[color-mix(in_oklch,var(--orbit-pearl)_38%,transparent)] bg-[color-mix(in_oklch,var(--orbit-accent)_18%,var(--orbit-background))] text-3xl text-[var(--orbit-pearl)]">
            ✦
          </div>
          <div>
            <h2 className="text-xl font-semibold">Cada space tiene su propia atmósfera</h2>
            <p className="mt-2 max-w-xl leading-7 text-[var(--orbit-muted)]">
              Entra a cualquier space para elegir Aurora, Pop, Lima o Lunar; cambia su tipografía y alterna entre una vista ordenada o un canvas libre.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
