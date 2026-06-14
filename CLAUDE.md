# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Expo API Reference

**Always read the versioned Expo docs before writing any Expo/React Native code.**
Expo APIs change between SDK versions. Use: https://docs.expo.dev/versions/v56.0.0/

---

## Commands

```bash
# Install dependencies (--legacy-peer-deps required: @expo/webpack-config peer conflict with expo@54)
npm install --legacy-peer-deps

# Build web app (only deployed target)
npm run build:web         # EXPO_OFFLINE=1 npx expo export --platform web → dist/

# Serve locally
node server.js            # HTTP on port 3000; auto-switches to HTTPS if cert.pem present

# Generate self-signed HTTPS cert (required for getUserMedia live QR camera on mobile)
npm run gen-cert          # openssl → cert.pem + key.pem; then restart node server.js

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Native development (not the primary target)
npx expo start
```

No tests, no linter configured.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81.5 |
| Language | TypeScript (strict mode) |
| Deployment | Web-only — `npx expo export --platform web` |
| Auth | Firebase Auth (email/password) |
| Database | Firestore — project `stargym-bec65` |
| Email | EmailJS `@emailjs/browser` v4 |
| Navigation | React Navigation — DrawerNavigator + NativeStack |
| QR (web) | `jsqr` + `getUserMedia` live viewfinder |
| QR (native) | `expo-camera` `CameraView` |
| Icons | `@expo/vector-icons` Ionicons |
| Server | Node.js HTTP/HTTPS static file server (`server.js`) |

---

## Folder Structure

```
stargym/
├── App.tsx                         # Root — Firebase auth gate, NavigationContainer
├── index.ts                        # Expo entry point (registerRootComponent)
├── server.js                       # Static file server, auto-HTTPS if cert.pem present
├── firestore.rules                 # Production Firestore security rules
├── firebase.json                   # Firebase CLI config (rules + hosting)
├── src/
│   ├── config.ts                   # GYM_CHECKIN_CODE constant
│   ├── theme/
│   │   └── colors.ts               # All colors — dark navy theme, never hardcode colors
│   ├── services/                   # All Firebase/API calls — screens never import firebase directly
│   │   ├── firebase.ts             # App init, exports: auth, db
│   │   ├── auth.ts                 # signIn, signUp, logOut, resetPassword, ensureUserProfile
│   │   ├── users.ts                # UserProfile CRUD, exports UserProfile type
│   │   ├── attendance.ts           # checkIn, isCheckedInToday, getAttendanceDates, getMonthlyCount
│   │   └── email.ts                # sendNewMemberNotification via EmailJS
│   ├── navigation/
│   │   ├── AppNavigator.tsx        # NativeStack wrapping DrawerNavigator
│   │   └── DrawerContent.tsx       # Sidebar UI + adminOnly/memberOnly role filtering
│   └── screens/
│       ├── LoginScreen.tsx         # Sign in / Sign up / Forgot password
│       ├── DashboardScreen.tsx     # Member home or Admin overview
│       ├── CheckinScreen.tsx       # Native: live QR scanner (expo-camera)
│       ├── CheckinScreen.web.tsx   # Web: getUserMedia viewfinder + URL param auto check-in
│       ├── CalendarScreen.tsx      # Attendance calendar (members only)
│       ├── WorkoutsScreen.tsx      # Workout category reference (accordion cards)
│       ├── AdminScreen.tsx         # Member list, search, stats, delete
│       └── AdminUserDetailScreen.tsx # Add/edit member form (modal push)
```

---

## Firestore Schema

```
users/{uid}
  ├── uid             String
  ├── email           String
  ├── displayName     String
  ├── phone           String
  ├── role            'admin' | 'member'
  ├── membershipType  'basic' | 'premium' | 'vip'
  ├── isActive        Boolean
  └── joinedAt        Timestamp

users/{uid}/attendance/{YYYY-MM-DD}
  ├── date            Timestamp
  ├── checkedInAt     ServerTimestamp
  └── uid             String
```

---

## Navigation Structure

```
App.tsx
 └── onAuthChange
       ├── [no user]  → LoginScreen
       └── [user]     → AppNavigator (NativeStack)
                            ├── Main (DrawerNavigator)
                            │     ├── Dashboard
                            │     ├── Checkin       ← memberOnly
                            │     ├── Calendar      ← memberOnly
                            │     ├── Admin         ← adminOnly
                            │     └── Workouts
                            └── AdminUserDetail     ← modal push
```

---

## Coding Conventions

### General
- **No comments** unless the WHY is non-obvious (not the what)
- **No `Alert.alert` on web** — use `(window as any).alert` / `(window as any).confirm` or a `Modal`. See `AdminScreen.tsx → confirmDelete`
- **No hardcoded colors** — always use `colors` from `src/theme/colors.ts`
- **No direct Firestore imports in screens** — all data access goes through `src/services/`

### Data Fetching
- Use `useFocusEffect` (not `useEffect`) on drawer screens — drawer screens stay mounted, `useEffect([])` only fires once on first mount
- Wrap fetch calls in `useCallback` when passed to `useFocusEffect`

### Platform Files
- Metro resolves `.web.tsx` over `.tsx` automatically on web builds
- Only create platform-specific files when the implementation genuinely differs (camera API, web-only DOM APIs)

### Web-Specific
- DOM elements (`<video>`, `<canvas>`) can be used directly in `.web.tsx` files
- `typeof window !== 'undefined'` guard before any `window.*` access in shared files

### Optimistic UI
- For check-in: show success screen immediately on valid QR, write to Firestore in background

### Admin Delete
- `deleteUserProfile` removes only the Firestore doc — Firebase Auth account persists
- `signUp` handles re-registration: catches `auth/email-already-in-use`, re-creates Firestore profile if password matches

---

## QR Check-In Flow (Web)

```
Gym QR encodes: https://<host>/?checkin=STARGYM-CHECKIN-V1

Path A — native camera scan:
  Scan QR → Safari opens URL → DashboardScreen detects ?checkin= → navigate to Checkin
  → CheckinScreen.web.tsx reads param, clears URL, validates, setDone(true), checkIn() in bg

Path B — in-app live scanner:
  Tap Check In → getUserMedia (needs HTTPS) → rAF loop → jsQR on 600px-downscaled frame
  → match GYM_CHECKIN_CODE → setDone(true) → checkIn() in bg
```

---

## Role-Based Access

| Feature | Member | Admin |
|---|---|---|
| Dashboard | Personal stats + check-in card | Member overview + gym QR |
| Check In | Live QR scanner | Hidden |
| Attendance Calendar | Own history | Hidden |
| Workouts | Visible | Visible |
| Members panel | Hidden | Full CRUD |
