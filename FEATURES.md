# Remix Songs — SaaS Features Tracking

## Stack

- **Auth:** Supabase Auth
- **DB:** Supabase Postgres
- **Payments:** Stripe ($5/month)
- **Framework:** Next.js App Router

## Infrastructure

- [x] Supabase project setup (tables, RLS, triggers)
- [x] Supabase Auth integration (login, signup, session management)
- [x] Stripe integration (checkout, portal, webhooks)
- [x] Middleware route protection
- [x] Landing page (`/`)
- [x] Pricing page (`/pricing`)
- [x] App route restructure (`/app`)

## Pro Features ($5/month)

- [ ] Create multiple remixes at once (batch queue)
- [ ] Create own preset (save speed/reverb/bass/volume to DB)
- [ ] Download MP3 (WAV remains free)
- [ ] Boost bass (EQ low-shelf filter)
- [ ] Trim remix start and end (waveform UI + AudioBuffer slice)
- [ ] Set custom default settings for remixes (saved to DB)
