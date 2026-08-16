# Orbit

App personal para organizar áreas de vida con dos mecanismos centrales:
deadlines próximos y resurfacing de proyectos e inspiración olvidados.

## Requisitos

- Node.js 20.9 o superior
- pnpm 11
- Una cuenta gratuita de Supabase

## Configurar Supabase

1. Abre [database.new](https://database.new) y crea un proyecto.
2. Espera a que termine la preparación de la base de datos.
3. En el proyecto, abre **Connect** y selecciona **App Frameworks → Next.js**.
4. Copia `.env.example` como `.env.local`.
5. Copia en `.env.local` la **Project URL** y la **Publishable key**.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

La publishable key es pública por diseño y queda protegida por Auth, grants y
RLS. No copies una **Secret key** ni la antigua `service_role`: ambas omiten RLS
y nunca deben aparecer en variables `NEXT_PUBLIC_*`, commits o chats.

### Configurar Auth

En Supabase abre **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

El acceso por correo funciona con la configuración estándar. Para Google,
activa el proveedor en **Authentication → Providers → Google** y sigue las
instrucciones de Client ID/Secret que muestra Supabase. Si todavía no lo haces,
puedes usar únicamente el correo.

### Aplicar el schema

Cuando el proyecto ya exista, copia su **Project ref** desde la URL del panel
(`https://supabase.com/dashboard/project/PROJECT_REF`) y ejecuta:

```bash
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

`login` abre el navegador; no pegues el token ni la contraseña de la base de
datos en archivos versionados. El `dry-run` permite revisar qué migración se
aplicará antes de modificar el proyecto remoto.

## Desarrollo

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Validación

```bash
pnpm lint
pnpm build
```

Las migraciones versionadas viven en `supabase/migrations`.
