# Prime Rides — Dealer Console (PWA)

This is your artifact app, rewired to run outside Claude.ai as a real, installable
web app — for staff (login required) and customers (public read-only stock list).

## What changed from the artifact version
- `window.storage` calls now hit a real Supabase database instead of the
  Claude-only artifact storage. No business logic was touched — same tabs,
  same screens, same calculations.
- Staff must log in (Supabase auth) to open the console. The public stock
  link (`?public=1`) still works with no login, same as before.
- Added a manifest + service worker so it installs like an app on iOS and
  Android home screens.

## 1. Create a Supabase project (free)
1. Go to supabase.com → New project.
2. Once it's created, open **SQL Editor** → paste in the contents of
   `sql/schema.sql` → Run.
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key

## 2. Add your staff logins
In Supabase, go to **Authentication → Users → Add user** and create one
login per staff member (email + password). There's no public sign-up page —
only people you add here can access the console.

## 3. Configure the app
```bash
cp .env.example .env
```
Paste your Project URL and anon key into `.env`.

## 4. Run it locally to test
```bash
npm install
npm run dev
```
Open the printed localhost URL. Log in with one of the staff accounts you
created. Test the public link by adding `?public=1` to the URL.

## 5. Deploy it for real (Vercel, free)
1. Push this folder to a GitHub repo (or use `npx vercel` directly from here).
2. Go to vercel.com → New Project → import the repo.
3. In Vercel's project settings, add the two env vars from your `.env`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Deploy. You'll get a URL like `prime-rides.vercel.app` — add a custom
   domain (e.g. `app.primeridesuae.com`) under Vercel's Domains tab if you
   own one.

## 6. Installing it like an app
- **iPhone (Safari):** open the site → Share icon → "Add to Home Screen."
- **Android (Chrome):** open the site → menu (⋮) → "Install app" (or
  "Add to Home screen").

Both give a real home-screen icon, splash screen, and full-screen window —
no App Store / Play Store listing needed, no developer account fees.

## Sharing the public stock list
Send customers: `https://your-domain.com/?public=1` — it shows only
available cars with asking/offer price, nothing else, no login prompt.

## If you outgrow this later
- Want to be listed on the actual App Store / Google Play? Wrap this same
  build with [Capacitor](https://capacitorjs.com) — the web code doesn't
  change, you're just adding a native shell around it.
- Want push notifications, camera-based barcode scanning, or offline-first
  editing? Those need small additions on top of this base — ask when ready.
