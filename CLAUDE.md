# Orbit — CLAUDE.md

## What this is

Personal life-organization app. Not a task manager. A second brain for scattered
life areas: gacha games, food expiry, subscriptions, wishlist, clothing, travel
packing, items to sell, side projects, and creative inspiration.

Core problem it solves: things get saved in Notion/Pinterest and never resurface.
Orbit's home screen actively resurfaces stale content instead of being a passive
archive.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Supabase (Postgres + Auth + Storage) — single user app, but use RLS anyway
- Zustand for client state if needed
- Deployment target: Vercel (or user's usual)

## Core architectural principle

Two kinds of tables:

1. **Deadline-bearing spaces** — write a row to the shared `deadlines` table.
   Used for anything with a due/renewal/reset date. Powers the home dashboard's
   "upcoming" section.
   - `gacha_events`
   - `food_items`
   - `subscriptions`

2. **Inventory spaces** — no deadline, pure organization/state tracking. Never
   touch `deadlines`.
   - `wishlist` (courses/PDFs wanted, not owned/done yet)
   - `clothing_items`
   - `travel_bags` + `bag_items`
   - `sale_items`
   - `projects`
   - `inspiration`

Do not conflate the two. A space either produces urgency (deadline) or it
doesn't. `wishlist` is inventory, not a deadline space — it's "things I want",
not "things expiring."

## Database schema

### Shared

```sql
create table deadlines (
  id uuid primary key default gen_random_uuid(),
  space_type text not null, -- 'gacha_event' | 'food_item' | 'subscription'
  source_table text not null,
  source_id uuid not null,
  title text not null,
  due_date timestamptz not null,
  is_recurring boolean default false,
  recurrence_rule text, -- e.g. 'monthly_reset_day_1_16'
  image_url text,
  color text, -- hex
  status text default 'active', -- 'active' | 'done' | 'dismissed'
  created_at timestamptz default now()
);
```

### Gacha space

```sql
create table gacha_games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text,
  color text
);

create table gacha_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references gacha_games(id),
  title text not null,
  image_url text,
  color text,
  starts_at timestamptz,
  ends_at timestamptz not null,
  type text not null, -- 'banner' | 'abyss' | 'other'
  is_recurring boolean default false,
  recurrence_rule text
);

create table farming_targets (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references gacha_games(id),
  event_id uuid references gacha_events(id), -- nullable, can farm without active event
  name text not null,
  image_url text,
  color text,
  notes text,
  status text default 'farming' -- 'farming' | 'done' | 'paused'
);

-- optional: log each completed recurring cycle instead of losing history
create table event_completions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references gacha_events(id),
  completed_at timestamptz default now()
);
```

### Food space

```sql
create table food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity text,
  expires_at date not null,
  purchased_at date,
  image_url text,
  status text default 'active' -- 'active' | 'consumed' | 'expired'
);
```

Home dashboard queries food_items for "expiring soon" + "need to buy" (derive
"need to buy" from items marked consumed/expired that user wants to restock —
consider a `restock_flag boolean` if this comes up).

### Subscriptions space

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text, -- 'course' | 'streaming' | 'tool' | 'other'
  renews_at date,
  cost numeric,
  status text default 'active' -- 'active' | 'cancelled'
);
```

### Wishlist (inventory, not deadline)

```sql
create table wishlist (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text, -- 'course' | 'pdf' | 'other'
  image_url text,
  status text default 'quiero_ver', -- 'quiero_ver' | 'viendo' | 'completado' | 'quiero_comprar' | 'comprado'
  url text,
  notes text
);
```

### Clothing (inventory)

```sql
create table clothing_items (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- 'top' | 'bottom' | 'shoes' | 'outerwear' | etc
  name text,
  image_url text, -- compressed, see image handling below
  needs_replacement boolean default false,
  notes text
);
```

### Travel (inventory)

```sql
create table travel_bags (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- 'Maleta cabina', 'Mochila día'
  trip_name text,
  image_url text
);

create table bag_items (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid references travel_bags(id) on delete cascade,
  name text not null,
  packed boolean default false
);
```

### Sale items (inventory)

```sql
create table sale_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  price numeric,
  status text default 'available', -- 'available' | 'sold'
  notes text
);
```

### Projects (inventory)

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text default 'idea', -- 'idea' | 'active' | 'paused' | 'done'
  color text,
  image_url text,
  last_viewed_at timestamptz default now()
);
```

### Inspiration (inventory)

```sql
create table inspiration (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id), -- nullable, can be standalone
  image_url text,
  note text,
  tags text[],
  source_type text default 'upload', -- 'upload' | 'sketch' | 'url'
  last_viewed_at timestamptz default now(),
  created_at timestamptz default now()
);
```

## Home dashboard logic (the whole point of this app)

Two sections, not one:

1. **Upcoming** — query `deadlines where due_date < now() + interval '7 days'
   order by due_date`. This is the "don't forget" section.

2. **Resurface** — the anti-Pinterest mechanism. Pull items from `projects`
   and `inspiration` ordered by `last_viewed_at asc` (oldest-viewed first),
   limit ~3-5. Every time the user opens/views an item, update
   `last_viewed_at = now()`. This is spaced-repetition logic applied to ideas
   instead of vocabulary — same underlying pattern as English Journal's SM-2,
   much simpler (no scoring, just recency-based resurfacing).

Do not build resurface as an afterthought. It's the feature that makes Orbit
different from Notion.

## Image handling

- Uploads go to Supabase Storage.
- Client-side compression before upload (canvas resize + toBlob quality param,
  or browser-image-compression package) — required for `clothing_items` and
  encouraged everywhere else. Target: max ~1200px longest edge, ~0.7 quality.
- Sketch capture (`inspiration.source_type = 'sketch'`): `<canvas>` +
  Pointer Events API, not a drawing library. Detect `pointerType === 'pen'`
  and scale stroke width by `e.pressure`. `touch-action: none` on canvas,
  `preventDefault()` on pointer events to stop scroll/zoom while drawing.
  Export via `canvas.toBlob()`, upload like any other image. No OCR, no
  handwriting-to-text — sketches stay as images.

## Coding discipline (same as other projects)

- One task per PR.
- Components under 250 lines.
- Pure logic in `/lib`, no business logic in pages/route handlers.
- RLS on every table even though single-user — habit worth keeping.
- Recurring deadlines (gacha abyss resets): store `recurrence_rule`, compute
  next `due_date` via a function when the cycle completes — don't create a new
  row per cycle. Log completed cycles in `event_completions` only if historical
  tracking is wanted later.

## MVP scope (build in this order)

1. Auth + base layout + Supabase project setup
2. `deadlines` table + home dashboard "Upcoming" section (read-only, seed data)
3. Gacha space (full CRUD) — most unique/urgent per user
4. Food space (full CRUD)
5. Subscriptions space (full CRUD)
6. Home dashboard "Resurface" section
7. Projects + Inspiration spaces (including sketch canvas)
8. Wishlist, Clothing, Travel, Sale items (straightforward CRUD, lower priority)