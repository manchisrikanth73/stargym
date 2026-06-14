# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Expo API Reference

**Always read the versioned Expo docs before writing any Expo/React Native code.**
Expo APIs change between SDK versions. Use: https://docs.expo.dev/versions/v56.0.0/

---

## Commands

```bash
# Install dependencies (use --legacy-peer-deps due to @expo/webpack-config peer conflict with expo@54)
npm install --legacy-peer-deps

# Build the web app (the only deployed target)
npm run build:web         # runs: EXPO_OFFLINE=1 npx expo export --platform web

# Serve the built app locally
node server.js            # HTTP on port 3000 — camera requires HTTPS (see below)

# Generate a self-signed cert for HTTPS (needed for live QR camera on iOS/Android)
npm run gen-cert          # then node server.js auto-detects cert.pem / key.pem → serves HTTPS

# Native development (not the primary target)
npx expo start
```

There are no tests and no linter configured.

---

## Architecture

### Deployment Target
This is a **web-only** Expo app (`npx expo export --platform web`), served by `server.js` (a plain Node.js HTTP/HTTPS static file server). Native builds exist but are not the focus.

### Auth & Data
- **Firebase Auth** (email/password) — `src/services/firebase.ts` exports `auth` and `db`
- **Firestore** (project `stargym-bec65`) — all data lives here; test rules open until 2026-07-13
- Admin vs member role is stored as `role: 'admin' | 'member'` on the Firestore user profile doc

### Firestore Schema
```
users/{uid}                        # UserProfile document
  └── attendance/{YYYY-MM-DD}      # one doc per calendar day checked in
        ├── date          Timestamp
        ├── checkedInAt   ServerTimestamp
        └── uid           String
```

### Navigation Structure
```
AppNavigator (NativeStack)
  └── Main (DrawerNavigator)
        ├── Dashboard
        ├── Checkin      ← members only (hidden from admin in drawer)
        ├── Calendar     ← members only
        └── Admin        ← admin only
  └── AdminUserDetail    ← pushed modally from AdminScreen
```
- `DrawerContent.tsx` filters nav items using `adminOnly` / `memberOnly` flags
- `useFocusEffect` (not `useEffect`) is used for data fetching on screens reachable via the drawer, because drawer screens stay mounted and `useEffect([])` only fires once

### Platform-Specific Files
Metro resolves `.web.tsx` over `.tsx` automatically on web builds:
- `CheckinScreen.web.tsx` — web check-in using `getUserMedia` live QR scanner (jsqr)
- `CheckinScreen.tsx` — native check-in using `expo-camera` `CameraView`

### QR Check-In Flow (Web)
1. Admin's Dashboard shows a QR code modal encoding: `${window.location.origin}/?checkin=STARGYM-CHECKIN-V1`
2. Member scans with native camera → Safari opens the URL → `DashboardScreen` detects `?checkin=` param → navigates to `CheckinScreen`
3. `CheckinScreen.web.tsx` on mount: if `?checkin=` param present → auto check-in; otherwise opens live camera viewfinder
4. Live scanner: `getUserMedia({ video: { facingMode: 'environment' } })` → `requestAnimationFrame` loop → frames downscaled to 600px max → `jsQR` decodes → match against `GYM_CHECKIN_CODE`
5. On valid scan: show success immediately (optimistic), then write to Firestore in background
6. `getUserMedia` requires HTTPS — use `npm run gen-cert` + `node server.js` for local HTTPS

### Key Constants
- `src/config.ts` — exports `GYM_CHECKIN_CODE = 'STARGYM-CHECKIN-V1'` (the string encoded in the physical gym QR)
- `src/theme/colors.ts` — single source of truth for all colors (dark navy theme)
- `src/services/email.ts` — EmailJS for new-member signup notifications; `emailjs.init()` must be called before `emailjs.send()` (already done at module level)

### Admin Delete Behavior
`deleteUserProfile` removes only the Firestore doc — Firebase Auth account persists. `signUp` in `auth.ts` handles re-registration of the same email: catches `auth/email-already-in-use`, attempts sign-in with the provided password, and re-creates the Firestore profile if missing.

### Web-Specific Alert Pattern
`Alert.alert` is unreliable on web. Use `(window as any).confirm` / `(window as any).alert` for web dialogs, or a React `Modal` component. See `AdminScreen.tsx` `confirmDelete` for the pattern.
