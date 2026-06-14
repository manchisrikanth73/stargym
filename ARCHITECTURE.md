# StarGym — Project Architecture & Workflow

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81.5 |
| Deployment | Web-only (`npx expo export --platform web`) |
| Auth | Firebase Auth (email/password) |
| Database | Firestore (project: `stargym-bec65`) |
| Email | EmailJS (`@emailjs/browser` v4) |
| Navigation | React Navigation — Drawer + NativeStack |
| QR Scanning (web) | `jsqr` + `getUserMedia` live viewfinder |
| QR Scanning (native) | `expo-camera` `CameraView` |
| Server | Node.js HTTP/HTTPS static file server (`server.js`) |

---

## Folder Structure

```
stargym/
├── App.tsx                        # Root — auth gate, NavigationContainer
├── index.ts                       # Expo entry point
├── server.js                      # Static file server (HTTP + HTTPS)
├── firestore.rules                # Firestore security rules
├── firebase.json                  # Firebase CLI config
├── src/
│   ├── config.ts                  # GYM_CHECKIN_CODE constant
│   ├── theme/
│   │   └── colors.ts              # Single source of truth for all colors
│   ├── services/
│   │   ├── firebase.ts            # Firebase app init, exports auth + db
│   │   ├── auth.ts                # signIn, signUp, logOut, resetPassword
│   │   ├── users.ts               # CRUD for UserProfile Firestore docs
│   │   ├── attendance.ts          # checkIn, isCheckedInToday, getAttendanceDates
│   │   └── email.ts               # EmailJS — new member signup notification
│   ├── navigation/
│   │   ├── AppNavigator.tsx       # NativeStack wrapping DrawerNavigator
│   │   └── DrawerContent.tsx      # Sidebar UI + role-based nav filtering
│   └── screens/
│       ├── LoginScreen.tsx        # Sign in / Sign up / Forgot password
│       ├── DashboardScreen.tsx    # Home screen (member stats or admin stats)
│       ├── CheckinScreen.tsx      # Native — live QR scanner (expo-camera)
│       ├── CheckinScreen.web.tsx  # Web — live viewfinder (getUserMedia + jsqr)
│       ├── CalendarScreen.tsx     # Attendance calendar (members only)
│       ├── WorkoutsScreen.tsx     # Workout categories reference
│       ├── AdminScreen.tsx        # Member list with search, stats, delete
│       └── AdminUserDetailScreen.tsx # Add/edit member form
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
 └── onAuthChange ──► [No user] → LoginScreen
                  └── [User]    → NavigationContainer
                                    └── AppNavigator (NativeStack)
                                          ├── Main (DrawerNavigator)
                                          │     ├── Dashboard
                                          │     ├── Checkin       ← memberOnly
                                          │     ├── Calendar      ← memberOnly
                                          │     ├── Admin         ← adminOnly
                                          │     └── Workouts
                                          └── AdminUserDetail     ← modal push
```

`DrawerContent.tsx` filters nav items by `adminOnly` / `memberOnly` flags by reading the user's Firestore `role` field on mount.

---

## Authentication Flow

```
LoginScreen
  │
  ├── Sign Up ──► createUserWithEmailAndPassword
  │               ├── updateProfile (displayName)
  │               ├── createUserProfile (Firestore doc)
  │               └── sendNewMemberNotification (EmailJS)
  │
  ├── Sign In ──► signInWithEmailAndPassword
  │               └── ensureUserProfile (re-creates Firestore doc if deleted)
  │
  └── Forgot  ──► sendPasswordResetEmail
```

**Email re-use after admin delete:**
Admin deleting a member removes only the Firestore doc — the Firebase Auth account persists. If the same email signs up again, `signUp` catches `auth/email-already-in-use`, attempts `signInWithEmailAndPassword`, and re-creates the Firestore profile if missing.

---

## QR Check-In Flow

### Path A — Native camera scans the gym QR (URL-based)

```
Gym QR encodes: https://<server>/?checkin=STARGYM-CHECKIN-V1
    │
    ▼
Member scans with iPhone native camera
    │
    ▼
Safari opens the URL → App loads → DashboardScreen mounts
    │
    ▼
useEffect detects ?checkin= param → navigates to CheckinScreen
    │
    ▼
CheckinScreen.web.tsx useEffect:
  1. Reads ?checkin= param
  2. Clears URL with history.replaceState
  3. Validates code === GYM_CHECKIN_CODE
  4. setDone(true) immediately (optimistic)
  5. checkIn() writes to Firestore in background
```

### Path B — In-app live camera scanner

```
Member taps Check In → CheckinScreen.web.tsx
    │
    ▼
getUserMedia({ facingMode: 'environment' }) — requires HTTPS
    │
    ▼
requestAnimationFrame loop:
  - Draw video frame to canvas (downscaled to 600px max)
  - jsQR decodes frame
  - Match against GYM_CHECKIN_CODE (handles raw code or full URL)
    │
    ▼ QR detected
setDone(true) immediately → checkIn() in background
```

> HTTPS is required for `getUserMedia` on iOS Safari.  
> Run `npm run gen-cert` then `node server.js` for local HTTPS.

---

## Admin Workflow

```
Admin Dashboard
  ├── Member Overview (total / active / inactive counts)
  ├── Gym QR Code modal — QR encodes full check-in URL for printing
  └── [Members] quick action → AdminScreen

AdminScreen
  ├── Search members by name or email
  ├── Stat chips (Total / Active / Inactive)
  ├── Member card → edit (pencil) or delete (trash)
  │     ├── Edit → AdminUserDetailScreen (pre-filled form)
  │     └── Delete → window.confirm (web) / Modal (native)
  └── [+] button → AdminUserDetailScreen (blank form)

AdminUserDetailScreen
  ├── Fields: name, email, phone, membership type, role, active toggle
  ├── New member: creates Firestore doc with placeholder UID
  └── Edit member: updateUserProfile (Firestore only, no Auth changes)
```

---

## Data Service Layer

All Firestore and Auth calls go through `src/services/`. Screens never import from `firebase/firestore` directly.

| Service | Exports |
|---|---|
| `auth.ts` | `signIn`, `signUp`, `logOut`, `resetPassword`, `onAuthChange`, `ensureUserProfile` |
| `users.ts` | `createUserProfile`, `getUserProfile`, `getAllUsers`, `updateUserProfile`, `deleteUserProfile` |
| `attendance.ts` | `checkIn`, `isCheckedInToday`, `getAttendanceDates`, `getMonthlyCount` |
| `email.ts` | `sendNewMemberNotification` |

---

## Key Patterns

**Web alerts** — `Alert.alert` is unreliable on web. Use `(window as any).alert` / `(window as any).confirm` for web dialogs. See `AdminScreen.tsx → confirmDelete`.

**Data refresh on focus** — Drawer screens stay mounted. Use `useFocusEffect` (not `useEffect`) so data re-fetches when navigating back. See `AdminScreen.tsx`.

**Platform files** — Metro picks `.web.tsx` over `.tsx` automatically on web builds. Used for `CheckinScreen` where web needs `getUserMedia` and native needs `expo-camera`.

**Optimistic UI** — Check-in shows the success screen immediately after QR validation. The Firestore write happens in the background so the user feels instant feedback.

---

## Build & Deploy

```bash
# One-time: generate HTTPS cert (needed for live QR camera on mobile)
npm run gen-cert

# Build web app
npm run build:web        # → dist/

# Serve locally
node server.js           # HTTP on port 3000, or HTTPS if cert.pem present

# Deploy Firestore security rules
firebase deploy --only firestore:rules
```

---

## Role-Based Access Summary

| Feature | Member | Admin |
|---|---|---|
| Dashboard | Personal stats + check-in card | Member overview + gym QR |
| Check In | Live QR scanner | Hidden |
| Attendance Calendar | Own history | Hidden |
| Workouts | Visible | Visible |
| Members panel | Hidden | Full CRUD |
| Drawer nav | Check In, Attendance, Workouts | Members, Workouts |
