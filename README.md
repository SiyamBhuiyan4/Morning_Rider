# Morning Rider — Courier Service

Courier management system: public site + parcel tracking, merchant panel, rider panel, and a separate admin panel.

- Main site (public, merchants, riders): https://morning-rider.vercel.app
- Admin site: https://morning-rider-admin.vercel.app

Stack: Convex (backend/DB) · React + Vite + Tailwind · Vercel. One codebase builds both sites; `VITE_PORTAL=admin` builds the admin site.

## Accounts
- Merchants sign up on the main site and wait for admin approval.
- Riders are created by the admin (Riders page).
- The admin site signs in with a single passcode (no phone). Set or reset it — this also clears the 1-hour lockout — from the command line only:

```
npx convex run --prod auth:setAdminPasscode '{"passcode":"..."}'
```

The admin passcode only works on the admin site; merchants and riders only sign in on the main site (enforced by the server).

## Language & theme
Bangla/English and night mode toggles are on every page. Translations live in `src/lib/bn.ts`, keyed by the English text — wrap new UI text in `t("...")` and add its Bangla there.

## Deploy
```
npx convex deploy -y          # backend
npx vercel --prod --yes       # main site (project: morning-rider)
```
The admin site is the Vercel project `morning-rider-admin` (same code, env `VITE_PORTAL=admin`).
