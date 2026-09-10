# Shopping List

A real-time shared shopping list. Add items, check them off, and see updates
instantly across everyone on the list.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind)
- [Supabase](https://supabase.com) — Postgres, Auth (magic link), Realtime
- [Vercel](https://vercel.com) — hosting

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. In **Project Settings > API**, copy the Project URL and anon public key.
4. Copy `.env.local.example` to `.env.local` and fill in those two values.
5. In **Authentication > URL Configuration**, add `http://localhost:3000/auth/callback`
   (and your production URL once deployed) as a redirect URL.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

- Sign in with a magic link (no password).
- Create a list, or join one with an invite code from someone who already has one.
- Everyone on a list sees items added/checked/removed in real time (Supabase Realtime).

## Roadmap

- Recipes that auto-add their ingredients to the shopping list
- A cocktail helper for tracking recipes and adding ingredients to the list
