# Orbit

A personal second brain for scattered life areas: gacha events, food expiry, subscriptions, wishlist, clothing, travel packing, things to sell, jobs, side projects, and visual inspiration.

Orbit is not a task manager. Saved ideas in Notion or Pinterest tend to disappear into an archive. The home screen keeps the next seven days visible and resurfaces projects and inspiration you have not opened in a while.

This is a single-user app with Row Level Security (RLS) on every table.

## What it does

Home combines three things:

- **Upcoming**: deadlines due in the next 7 days, ordered by date
- **Resurface**: projects and inspiration ordered by `last_viewed_at`, oldest first
- **Canvas**: a freeform board for notes, images, links, lists, folders, and countdowns

Each life area is its own space, with its own accent, icon, and optional background. You can also create custom spaces.

### Prebuilt spaces

| Space | Kind | Role |
| --- | --- | --- |
| Gacha | Deadline | Banners, abyss resets, farming targets |
| Food | Deadline | Items that expire or need restocking |
| Subscriptions | Deadline | Renewals and costs |
| Wishlist | Inventory | Courses, PDFs, and things you want |
| Clothing | Inventory | Wardrobe pieces and replacements |
| Travel | Inventory | Bags and packing checklists |
| Sales | Inventory | Items listed or sold |
| Jobs | Inventory | Work-related tracking |
| Projects | Inventory | Ideas, active work, and paused work |
| Inspiration | Inventory | Sketches, uploads, and references |

Deadline spaces write to a shared `deadlines` table. Inventory spaces never do. Wishlist is “things I want”, not “things expiring”.

### Canvas items

Home and each space share the same item types: folder, list, checklist item, note, image, link, and countdown. Countdowns sync to `deadlines` so they show up in Upcoming.

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router) and React 19
- TypeScript and Tailwind CSS 4
- [Supabase](https://supabase.com/) for Postgres, Auth, and Storage
- Vitest for unit tests
- pnpm 11

Deploy target: Vercel.

## Requirements

- Node.js 20.9 or later
- pnpm 11
- A free Supabase account

## Configure Supabase

1. Open [database.new](https://database.new) and create a project.
2. Wait until the database is ready.
3. In the project, open **Connect** and choose **App Frameworks → Next.js**.
4. Copy `.env.example` to `.env.local`.
5. Paste the **Project URL** and **Publishable key** into `.env.local`.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The publishable key is public by design. Auth, grants, and RLS protect your data. Do not copy a **Secret key** or the old `service_role` key. Those skip RLS and must never appear in `NEXT_PUBLIC_*` variables, commits, or chats.

### Configure Auth

In Supabase, open **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

Email login works with the default settings. For Google, enable the provider in **Authentication → Providers → Google** and follow the Client ID and Secret steps Supabase shows. You can stay on email only until you need Google.

### Apply the schema

Copy the **Project ref** from the dashboard URL (`https://supabase.com/dashboard/project/PROJECT_REF`) and run:

```bash
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

`login` opens the browser. Do not paste the token or the database password into versioned files. The dry run shows which migration will apply before you change the remote project.

Versioned migrations live in `supabase/migrations`.

## Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm lint
pnpm test
pnpm build
```

## Project layout

- `app/`: App Router pages, layouts, and server actions
- `components/`: UI for home, spaces, canvas items, and navigation
- `lib/`: queries, space config, deadlines, and other business logic
- `supabase/migrations/`: Postgres schema, RLS, and storage

Business logic stays in `lib/`. Pages and route handlers should stay thin.

## License

Personal project. Not licensed for reuse unless stated otherwise.
