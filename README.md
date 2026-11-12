# جمبزة (Jambaza)

تطبيق استماع للموسيقى بواجهة عربية (RTL): ارفع أغانيك، نظّم قوائم التشغيل، واستمع مع أصدقائك في غرف مشتركة.

A social music listening web app built with Next.js (App Router), TypeScript, Tailwind CSS, Supabase, Zustand, and Dexie. The UI is Arabic-first and RTL.

## Stack

- **Next.js 16 (App Router)** + TypeScript
- **Tailwind CSS v4**
- **Supabase** — Auth, Postgres, Realtime, Storage
- **Zustand** — client-side player state
- **Dexie (IndexedDB)** — offline cache for user-uploaded audio
- **Serwist** — service worker + app-shell caching
- **Vitest** — unit tests
- Deploy target: **Vercel**

## Requirements

- Node.js 20.9+ (tested on Node 26)
- npm 10+
- A Supabase project (free tier is fine)

## 1. Install

```bash
npm install
```

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the two public values from your Supabase dashboard (**Project Settings → API**):

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Only the public URL and anon key belong in client code. Never add a service-role key to this app.

## 3. Database

Apply the migration in `supabase/migrations/` to your project. Either:

```bash
# with the Supabase CLI linked to your project
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

or paste the SQL file into the Supabase SQL editor and run it.

The migration creates every table with RLS enabled, RLS policies, the profile-creation trigger on signup, the `covers` (public) and `audio` (private) storage buckets with their policies, and adds `listening_rooms` to the Realtime publication.

## 4. Run locally

```bash
npm run dev
```

Open <http://localhost:3000>.

### Useful scripts

| Script              | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Start the dev server               |
| `npm run build`     | Production build                   |
| `npm run start`     | Start the production server        |
| `npm run lint`      | ESLint                             |
| `npm run typecheck` | TypeScript, no emit                |
| `npm run test`      | Vitest unit tests (single run)     |
| `npm run test:watch`| Vitest in watch mode               |
| `npm run format`    | Prettier                           |

## Deploy to Vercel

1. Push the repository to GitHub (or GitLab/Bitbucket).
2. In Vercel, choose **Add New → Project** and import the repo.
3. Framework preset: **Next.js** (auto-detected). Build command `npm run build`, output `.next`.
4. Add the environment variables for **Production** (and Preview/Development if you like):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. In Supabase, add your deployment URL to **Authentication → URL Configuration → Site URL / Redirect URLs** (for example `https://your-app.vercel.app`).
6. Deploy.

No server secret is required. The service worker is served from `/serwist/sw.js` by a route handler and is not affected by Vercel's static output.

## Project structure

```text
src/
  app/            App Router routes (home, search, library, friends, login, signup, rooms/[id])
  components/     ui/, player/, layout/, auth/
  lib/
    supabase/     browser client, server client, middleware session helper
    offline/      Dexie database + file cache helpers
    rooms/        drift-correction logic
    api/          consistent API response helpers
  stores/         Zustand player store
  types/          shared types (database, tracks, rooms, API)
supabase/
  migrations/     SQL migrations (schema, RLS, triggers, storage)
```

## Notes

- YouTube tracks are played **only** through the official YouTube IFrame Player API, with the player visibly rendered. There is no downloader or audio extraction of any kind.
- Offline caching applies **only** to files the user uploaded themselves.
