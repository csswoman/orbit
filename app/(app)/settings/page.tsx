export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <p className="text-sm font-medium text-[var(--orbit-accent)]">
        Configuración
      </p>
      <h1 className="text-3xl font-semibold tracking-[-0.025em]">Apariencia</h1>
      <div className="max-w-2xl rounded-xl bg-[var(--orbit-surface)] p-6">
        <p className="leading-7 text-[var(--orbit-muted)]">
          La base de datos ya admite colores, fondo del dashboard y preferencias
          de columnas. El editor visual se construirá cuando definamos el diseño
          final.
        </p>
      </div>
    </section>
  );
}
