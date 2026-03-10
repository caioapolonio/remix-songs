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
- `/app` - Main player (accessible without auth — free tier explores, paywall on Pro features)
- `/app/pro` - Upgrade/manage subscription page
- `/pricing` - Pricing page (public)
- `/(auth)/login`, `/(auth)/signup` - Auth pages
- `/auth/confirm`, `/auth/callback`, `/auth/signout` - Supabase auth routes
- `/api/checkout`, `/api/portal` - Stripe billing endpoints
- `/api/webhooks/stripe` - Stripe webhook handler
- `/api/verify-pro` - Server-side Pro status verification
- `/api/presets` - CRUD for user presets (Pro gated on server)

### Auth & Billing

- **Supabase** for auth. Middleware (`middleware.ts` -> `lib/supabase/middleware.ts`) refreshes sessions and redirects authenticated users away from auth pages.
- **Stripe** for subscriptions. Subscription status stored in Supabase `profiles` table, exposed via `SubscriptionProvider` context (`useSubscription()` hook, `isPro` flag).
- A Supabase trigger (`on_auth_user_created`) auto-creates a `profiles` row on signup with `subscription_status = 'free'`.

### Pro Feature Gating

Five features are gated behind Pro subscription:

| Feature        | Gate type                             |
| -------------- | ------------------------------------- |
| MP3 Download   | Server (`/api/verify-pro`) + UI modal |
| Bass Boost     | UI disabled + lock icon               |
| Batch Remixing | UI modal (max 1 file for free)        |
| Custom Presets | Client + Server (POST returns 403)    |
| Trim & Cut     | UI disabled + lock icon               |

Gates live in `hooks/use-audio-player.ts`, `components/player/effect-controls.tsx`, `components/player/file-list.tsx`, `components/player/preset-selector.tsx`, and `components/player/waveform-display.tsx`.

### Player Components

The player UI in `app/app/page.tsx` uses `createPortal` to teleport `WaveformDisplay` between desktop and mobile mount points. Mobile uses a drawer sheet (`MobilePlayerSheet`), desktop shows sidebar + waveform + controls.

### Toasts

Uses `sonner`. The `<Toaster>` is in `app/layout.tsx`. Import `toast` from `sonner` to show notifications.

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
- Sonner for toast notifications
- Path alias: `@/*` maps to project root

## Database (Supabase)

Three tables in `public` schema, all with RLS enabled:

- **profiles** - User subscription data (linked to `auth.users` via FK on `id`)
- **presets** - Saved effect presets (FK to `profiles.id`, max 10 per user enforced server-side)
- **user_defaults** - Per-user default effect settings (FK to `profiles.id`)
