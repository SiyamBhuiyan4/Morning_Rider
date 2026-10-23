# Morning Rider — Courier Service

Courier management system with public parcel tracking, merchant dashboard, rider portal, and an administrative control panel.

- **Main site** (Public, Merchants, Riders): [https://morning-rider.vercel.app](https://morning-rider.vercel.app)
- **Admin site**: [https://morning-rider-admin.vercel.app](https://morning-rider-admin.vercel.app)

**Tech Stack**:
- **Backend / Database**: [Convex](https://www.convex.dev/) (reactive real-time database, functions, server actions)
- **Frontend**: React 19, Vite, Tailwind CSS
- **Document CDN**: Telegram CDN (Bot API storage for verification documents)
- **Hosting**: Vercel (unified codebase for both main and admin portals)

---

## 🚀 Setting Up Your Convex Database (New Account Setup)

If you are setting up a new Convex account or connecting a new Convex project, follow these simple steps:

### 1. Authenticate with your Convex account
```bash
npx convex login
```
This opens your browser to log in or switch to your new Convex account.

### 2. Connect the project (Development)
```bash
npx convex dev
```
- When prompted, choose **"Create a new project"** (or link to an existing project in your new account).
- Enter a project name (e.g., `morning-rider`).
- Convex CLI will automatically create a `.env.local` file containing:
  ```env
  CONVEX_DEPLOYMENT=dev:<your-deployment-name>
  VITE_CONVEX_URL=https://<your-deployment-name>.convex.cloud
  ```

### 3. Initialize the Admin Passcode
Before logging into the `/admin` portal, initialize your admin passcode:
```bash
# Development deployment:
npm run admin:setup -- your_secret_passcode

# Or directly via Convex CLI:
npx convex run auth:setAdminPasscode '{"passcode":"your_secret_passcode"}'
```

### 4. Run Development Server
```bash
npm run dev
```
This concurrently starts:
- Frontend dev server on `http://localhost:5173`
- Convex backend watcher with real-time sync

---

## ⚙️ Environment Variables

Copy `.env.example` to review available configuration options:

```bash
cp .env.example .env.local
```

### Frontend Environment Variables (`.env.local` or Vercel Environment Variables)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_CONVEX_URL` | URL of your Convex deployment (required) | Auto-filled by `convex dev` |
| `VITE_PORTAL` | Site mode: `main` (public/merchant/rider) or `admin` (admin panel) | `main` |
| `VITE_TITLE` | Browser tab title | `Morning Rider — Courier Service` |
| `VITE_ROBOTS` | SEO robots directive | `index,follow` |
| `VITE_TELEGRAM_BOT_TOKEN` | Custom Telegram Bot Token for CDN uploads (optional) | Built-in default |
| `VITE_TELEGRAM_CHAT_ID` | Telegram Channel/Group Chat ID for CDN storage (optional) | Built-in default |

### Backend Convex Environment Variables (Optional)

Used by `convex/mailer.ts` for sending automated password reset and notification emails:
```bash
npx convex env set GMAIL_USER "your-office@gmail.com"
npx convex env set GMAIL_APP_PASSWORD "xxxx xxxx xxxx xxxx"
npx convex env set SITE_URL "https://morning-rider.vercel.app"

# For production, append --prod:
npx convex env set GMAIL_USER "your-office@gmail.com" --prod
npx convex env set GMAIL_APP_PASSWORD "xxxx xxxx xxxx xxxx" --prod
npx convex env set SITE_URL "https://morning-rider.vercel.app" --prod
```

---

## 🔐 Admin Access & Security

There are two ways to set up and manage the admin account:

### Option 1: Web Initial Setup Screen (`/admin`)
When visiting `/admin` on a fresh database where no admin has been created yet:
- The system automatically detects that setup is needed and prompts to create the admin passcode.
- Enter your admin passcode, and you are immediately logged in.
- Once configured, subsequent visits require entering this passcode on the sign-in form.

### Option 2: CLI Passcode Setup / Reset (Recommended & Lockout Recovery)
You can set or reset the admin passcode directly from the command line. This works whether the admin account exists or not, and **automatically clears any 1-hour brute-force lockout**:

```bash
# Development:
npm run admin:setup -- <passcode>

# Production:
npm run admin:setup:prod -- <passcode>

# Or directly with Convex CLI:
npx convex run auth:setAdminPasscode '{"passcode":"your_passcode"}'
npx convex run --prod auth:setAdminPasscode '{"passcode":"your_passcode"}'
```

- **Single Passcode Access**: The admin portal does not require an email or phone number.
- **Lockout Protection**: Repeated invalid attempts result in a 1-hour lockout (can be cleared anytime using the CLI setup command above).

---

## 📁 Telegram CDN Storage

Merchant onboarding requires identity verification files (NID card front & back, Trade License, TIN certificate).
- To eliminate expensive cloud blob storage overhead, files are uploaded directly to a private Telegram channel via the Telegram Bot API.
- Direct file URLs (`https://api.telegram.org/file/bot...`) are stored in Convex.
- Pre-configured defaults are included out of the box in `src/lib/telegramCdn.ts`, and can be customized with your own bot by setting `VITE_TELEGRAM_BOT_TOKEN` and `VITE_TELEGRAM_CHAT_ID`.
- Content Security Policy (CSP) in `vercel.json` is pre-configured to permit requests and image rendering from `https://api.telegram.org` and `https://*.convex.cloud`.

---

## 🌐 Deploy to Production

### 1. Deploy Convex Backend
```bash
npx convex deploy -y
```
After deployment, initialize the production admin passcode:
```bash
npm run admin:setup:prod -- <your-production-passcode>
```

### 2. Deploy Frontend to Vercel
Set the following environment variables in your Vercel project:
- `VITE_CONVEX_URL`: Your production Convex deployment URL (e.g. `https://<deployment-name>.convex.cloud`).

**Deploy Main Site**:
```bash
npx vercel --prod --yes
```

**Deploy Admin Site**:
Create a second Vercel project (e.g. `morning-rider-admin`) linked to the same repository, with:
- `VITE_PORTAL=admin`
- `VITE_CONVEX_URL=https://<deployment-name>.convex.cloud`

---

## 🛠️ Available NPM Scripts

- `npm run dev`: Runs frontend Vite server and Convex backend concurrently.
- `npm run dev:frontend`: Runs Vite dev server only.
- `npm run dev:backend`: Runs Convex dev synchronization only.
- `npm run build`: Performs TypeScript type check (`tsc -b`) and builds production bundle (`vite build`).
- `npm run lint`: Performs TypeScript compilation check without emitting files (`tsc -b --noEmit`).
- `npm run preview`: Previews the production build locally.
- `npm run admin:setup -- <passcode>`: Sets or resets the admin passcode in the development database.
- `npm run admin:setup:prod -- <passcode>`: Sets or resets the admin passcode in the production database.

---

## 🌍 Language & Themes

- Built-in English and Bengali (বাংলা) support with a global toggle on every screen.
- UI strings are translated in `src/lib/bn.ts`.
- Dark mode / light mode toggle supported with persistent user preference.
