# Morning Rider — Courier Service

Courier management system: public site + parcel tracking, merchant panel, rider panel, and a separate admin panel.

- Main site (public, merchants, riders): https://morning-rider.vercel.app
- Admin site: https://morning-rider-admin.vercel.app

Stack: Convex (backend/DB) · React + Vite + Tailwind · Vercel. One codebase builds both sites; `VITE_PORTAL=admin` builds the admin site.

## Accounts
- Merchants sign up on the main site and wait for admin approval.
- Riders and extra admins are created by an admin (Riders & staff page).
- The first admin is created from the command line only:

```
npx convex run --prod auth:createAdmin '{"name":"Your Name","phone":"01XXXXXXXXX","password":"..."}'
```

Admins can only sign in on the admin site; merchants and riders only on the main site (enforced by the server).

## Deploy
```
npx convex deploy -y          # backend
npx vercel --prod --yes       # main site (project: morning-rider)
```
The admin site is the Vercel project `morning-rider-admin` (same code, env `VITE_PORTAL=admin`).
