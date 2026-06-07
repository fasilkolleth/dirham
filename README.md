# My Finance — Personal Finance PWA

A mobile-first Progressive Web App for personal finance management. Built with React + Vite, Firebase, and Claude AI.

## Features

- **Dashboard** — Monthly summary, AI-powered insights (Claude), upcoming alerts
- **Budget Tracker** — Monthly budgets with planned vs actual, templates, progress bars
- **EMI Tracker** — Track loans, mortgages, installments with auto-calculated status
- **Bank Balances** — Multi-account balance tracking with history logs
- **Properties** — Owned (Dubai) + Rented (Sharjah) property management, cheques, maintenance fees, file uploads
- **Lending Tracker** — Track money lent to others with repayment logging
- **AI Assistant** — Natural language Q&A powered by Claude Sonnet
- **Notifications** — Push alerts for EMIs, cheques, contract expiries, repayments
- **PWA** — Installable on iPhone via "Add to Home Screen", works offline

---

## Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd finance-app
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Authentication** → Google sign-in provider
3. Enable **Firestore Database** (start in production mode)
4. Enable **Storage**
5. Enable **Cloud Messaging** (for push notifications)
6. Add a web app and copy the config

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required keys:
- `VITE_FIREBASE_API_KEY` — from Firebase project settings
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY` — from Firebase Cloud Messaging → Web Push certificates
- `VITE_CLAUDE_API_KEY` — from [Anthropic Console](https://console.anthropic.com/)

Optional:
- `VITE_ALLOWED_EMAIL` — lock the app to your Google account email (recommended)

### 4. Firebase Messaging Service Worker

Update `public/firebase-messaging-sw.js` with your Firebase config (hardcoded, runs outside Vite):

```js
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  // ... rest of config
})
```

### 5. Firebase Security Rules

In Firestore, restrict access to your account:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.token.email == "YOUR_EMAIL@gmail.com";
    }
  }
}
```

Apply the same restriction in Storage rules.

### 6. App Icons

Replace placeholder icons in `public/icons/` with proper 192×192 and 512×512 PNG files.

---

## Development

```bash
npm run dev
```

## Build & Deploy to GitHub Pages

```bash
npm run build
gh-pages -d dist
```

Ensure the repo name matches the `base` in `vite.config.js` (currently `/finance-app/`).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| UI Framework | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI primitives |
| Icons | Lucide React |
| Routing | React Router v7 |
| Data Fetching | TanStack Query v5 |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google OAuth) |
| Storage | Firebase Storage |
| Push Notifications | Firebase Cloud Messaging |
| AI | Claude Sonnet (claude-sonnet-4-20250514) |
| PWA | vite-plugin-pwa + Workbox |

---

## Project Structure

```
src/
├── components/
│   ├── layout/       # BottomNav, Header, Layout
│   ├── shared/       # EmptyState, FAB, LoadingSpinner, SectionHeader
│   └── ui/           # Button, Card, Input, Modal, Badge, ProgressBar
├── context/          # AuthContext, AppContext
├── hooks/            # useBudget, useEMI, useBankAccounts, useProperties, useLending, useAlerts, useSettings
├── pages/
│   ├── Auth/
│   ├── Dashboard/    # + AIChat, AIInsights, UpcomingAlerts
│   ├── Budget/
│   ├── Properties/   # Owned, Rented
│   ├── Trackers/     # EMI, BankBalances, Lending
│   └── Settings/
├── services/         # firebase.js, firestore.js, storage.js, fcm.js, claude.js
└── utils/            # dateHelpers, currencyFormatter, alertCalculators, cn
```

---

## Notes

- **Security**: Never commit `.env`. Keys are excluded via `.gitignore`.
- **Single-user**: Set `VITE_ALLOWED_EMAIL` to prevent unauthorized access.
- **Claude API**: Key is used client-side — acceptable for personal use. Monitor usage.
- **PWA on iOS**: Install via Safari → Share → "Add to Home Screen" to enable push notifications.
