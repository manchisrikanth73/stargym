# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Goal

StarGym is a gym management web app for a single gym. Members check in via QR code, track attendance, and view workout guides. Admins manage members, configure membership plans and pricing, and monitor real-time check-in activity.

---

## Important: Expo API Reference

**Always read the versioned Expo docs before writing any Expo/React Native code.**
Use: https://docs.expo.dev/versions/v54.0.0/

---

## Commands

```bash
npm install --legacy-peer-deps        # peer conflict: @expo/webpack-config
npm run build:web                     # EXPO_OFFLINE=1 expo export → dist/
node server.js                        # Serve on port 3000 (auto-HTTPS if cert.pem present)
npm run gen-cert                      # openssl self-signed cert for HTTPS (live camera)
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
npx expo start                        # Native dev (not primary target)
```

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

## Architecture

See `ARCHITECTURE.md` for full detail. Key decisions:
- Web-only deployment (no native app store builds)
- All Firebase calls go through `src/services/` — screens never import from `firebase/*`
- Real-time data uses `onSnapshot`; one-time reads use `getDoc`/`getDocs`
- Denormalized `checkins/` top-level collection for admin live feed (avoids collection group index)

---

## Folder Structure

```
stargym/
├── App.tsx                         # Root — auth gate, NavigationContainer
├── docs/                           # requirements, db-design, api-design, test-plan
├── tests/                          # manual test cases, future automated tests
├── src/
│   ├── config.ts                   # GYM_CHECKIN_CODE constant
│   ├── theme/colors.ts             # All colors — never hardcode
│   ├── services/                   # All Firebase/API calls
│   │   ├── firebase.ts             # App init — exports auth, db
│   │   ├── auth.ts                 # signIn, signUp, logOut, resetPassword
│   │   ├── users.ts                # UserProfile CRUD + type + disableMember/enableMember
│   │   ├── attendance.ts           # checkIn, subscribeRecentCheckins, getMemberCheckinHistory
│   │   ├── gymSettings.ts          # Membership prices + workout access config
│   │   └── email.ts                # EmailJS new-member notification
│   ├── components/
│   │   └── DateInput[.web].tsx     # YYYY-MM-DD text input
│   ├── navigation/
│   │   ├── AppNavigator.tsx        # NativeStack wrapping Drawer
│   │   └── DrawerContent.tsx       # Sidebar — role-based + real-time workout access
│   ├── utils/retry.ts              # withRetry() for cold-start Firestore reads
│   └── screens/
│       ├── LoginScreen.tsx
│       ├── DashboardScreen.tsx
│       ├── CheckinScreen[.web].tsx
│       ├── CalendarScreen.tsx
│       ├── WorkoutsScreen.tsx
│       ├── SettingsScreen.tsx
│       ├── AdminScreen.tsx
│       └── AdminUserDetailScreen.tsx
```

---

## Business Rules

- Members are inactive by default at signup — admin must activate or set valid dates
- `activationEndDate < today` → auto-set `isActive = false` (enforced client-side on dashboard load)
- `activationEndDate >= today` → auto-set `isActive = true` (enforced on admin save)
- Workout access per plan type is configured by admin in Settings — defaults: basic=false, premium=true, vip=true
- Admin-created members use a placeholder UID (`manual_{timestamp}`) — no Firebase Auth account
- Disabling a member sets `isActive = false` and `scheduledDeleteAt = today + 60 days`
- AdminScreen auto-purges members whose `scheduledDeleteAt <= today` on every load
- Disabled members can be re-enabled (clears `isActive = true`, `scheduledDeleteAt = null`) before the 60-day window expires
- Duplicate check-in on the same day is silently rejected (idempotent)
- Admin email (manchisrikanth73@gmail.com) is notified via EmailJS on every new member signup
- Roles: `admin` and `member` — read from Firestore, not from Firebase Auth claims

---

## UserProfile Schema

```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: 'admin' | 'member';
  membershipType: 'basic' | 'premium' | 'vip';
  isActive: boolean;
  joinedAt: Timestamp | null;
  activationStartDate: string | null;   // YYYY-MM-DD
  activationEndDate: string | null;     // YYYY-MM-DD
  age: number | null;
  gender: string | null;                // 'Male' | 'Female' | 'Other'
  scheduledDeleteAt: string | null;     // YYYY-MM-DD, set by disableMember()
}
```

When adding fields to `UserProfile`, update `createUserProfile` in the same commit.

---

## Admin Member Management

- **AdminScreen** (member list): "Check-in History" and "Update" buttons per card; no manual delete
- **AdminUserDetailScreen** (edit form): shows "Disable Member" for active members, "Enable Member" for disabled ones (those with `scheduledDeleteAt` set)
- Check-in history (last 60 days) is lazy-loaded via a modal in AdminScreen — not on the edit screen

---

## Database Rules

- Document: `users/{uid}` — read/write by owner or admin
- Document: `users/{uid}/attendance/{date}` — read by owner or admin; create by owner only
- Document: `checkins/{uid}_{date}` — create by any signed-in user; read by admin only
- Document: `gymConfig/membership` — read by any signed-in user; write by admin only
- Test rules (open) active until 2026-07-13 — deploy production rules before then

---

## API Rules

- All Firestore/Auth calls go through `src/services/` — never import firebase directly in screens
- Service functions are `async` and throw on failure — callers handle errors
- Use `withRetry` for `getDoc`/`getDocs` that may hit cold-start latency
- Use `onSnapshot` for any data the UI needs to update live
- `subscribeX` functions return an unsubscribe function — always call it in useEffect cleanup

---

## Security Rules

- No `Alert.alert` on web — use `(window as any).alert` / `(window as any).confirm` or inline Modal
- `typeof window !== 'undefined'` guard before any `window.*` access in shared (non-.web) files
- Admin-only features are gated by Firestore `role` field — never trust client-side state alone

---

## Coding Standards

- No hardcoded colors — always import from `src/theme/colors.ts`
- `useFocusEffect + useCallback` on drawer screens (stay mounted; `useEffect([])` fires once)
- Platform files (`.web.tsx`) only when implementation genuinely differs
- DOM elements (`<video>`, `<canvas>`) only in `.web.tsx` files

---

## Testing Rules

- See `docs/test-plan.md` for full manual test cases
- Before any deploy: run P1 test cases for Auth, Check-In, and Role-Based Access
- For new features: add test cases to `docs/test-plan.md` before implementing
- No automated test runner configured — tests are manual for now

---

## Deployment Steps

```bash
npm run build:web                          # Build to dist/
node server.js                             # Verify locally on port 3000
firebase deploy --only firestore:rules     # If rules changed
firebase deploy --only firestore:indexes   # If indexes changed
# Then copy dist/ to hosting (or update server)
```

---

## Do Not Change Without Approval

- `src/services/firebase.ts` — Firebase app init and config
- `src/config.ts` — `GYM_CHECKIN_CODE` (changing breaks all QR codes in the field)
- `firestore.rules` — security boundary; review carefully before deploying
- `App.tsx` — auth gate logic; changes affect all navigation
- `src/theme/colors.ts` — changing colors affects the whole UI
- `UserProfile` interface in `users.ts` — must update `createUserProfile` simultaneously

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

## Role-Based Access Summary

| Feature | Member | Admin |
|---|---|---|
| Dashboard | Stats + check-in card + membership card | Member overview + live check-in feed |
| Check In | QR scanner | Hidden |
| Attendance Calendar | Own history | Hidden |
| Workouts | Access-gated by plan type | Hidden |
| Members panel | Hidden | Full CRUD |
| Settings | Profile + age/gender (readonly) | Profile + membership config |
