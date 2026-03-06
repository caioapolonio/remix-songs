# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `bun dev` - Start dev server (Next.js 16, port 3000)
- `bun run build` - Production build
- `bun run lint` - ESLint (flat config, v9)
- `bun add <pkg>` - Install dependencies (uses bun, not npm/yarn)

No test framework is configured.

## Architecture

Web audio player for remixing songs with real-time effects (slowed+reverb, nightcore, speed/pitch control). Uses a dual audio engine and has auth + subscription billing.

### Audio Engine (dual system)

The core audio logic lives in `hooks/use-audio-player.ts`. Two separate audio systems run in parallel:

- **WaveSurfer.js v7** - Waveform visualization only (volume set to 0)
- **Tone.js v15** - Actual audio playback and effects (Tone.Player -> Tone.Reverb -> destination)

Time sync between the two uses a `timeRef` based on system clock, not player position. Refs (`stateRef`, `filesRef`, `currentFileIdRef`) are used throughout callbacks to avoid stale closures.

MP3 encoding runs in a Web Worker (`workers/mp3-encoder.worker.ts`) using `@breezystack/lamejs`.

### Route Structure

- `/` - Landing page (public)
- `/app` - Main player (protected, requires auth)
- `/pricing` - Pricing page (public)
- `/(auth)/login`, `/(auth)/signup` - Auth pages
- `/auth/confirm`, `/auth/callback`, `/auth/signout` - Supabase auth routes
- `/api/checkout`, `/api/portal` - Stripe billing endpoints
- `/api/webhooks/stripe` - Stripe webhook handler

### Auth & Billing

- **Supabase** for auth. Middleware (`middleware.ts` -> `lib/supabase/middleware.ts`) refreshes sessions, protects `/app` routes, and redirects authenticated users away from auth pages.
- **Stripe** for subscriptions. Subscription status stored in Supabase `profiles` table, exposed via `SubscriptionProvider` context (`useSubscription()` hook, `isPro` flag).

### Player Components

The player UI in `app/app/page.tsx` uses `createPortal` to teleport `WaveformDisplay` between desktop and mobile mount points. Mobile uses a drawer sheet (`MobilePlayerSheet`), desktop shows sidebar + waveform + controls.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PRICE_ID
NEXT_PUBLIC_APP_URL
```

## Stack

- Next.js 16 + React 19 + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui (Radix primitives)
- Path alias: `@/*` maps to project root
