# StarGym — Architecture

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81.5 |
| Language | TypeScript (strict) |
| Deployment | Web-only — `npx expo export --platform web` → `dist/` |
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
├── App.tsx                           # Root — Firebase auth gate, NavigationContainer
├── index.ts                          # Expo entry point (registerRootComponent)
├── server.js                         # Static file server (HTTP + HTTPS)
├── firestore.rules                   # Firestore security rules
├── firestore.indexes.json            # Firestore index definitions
├── firebase.json                     # Firebase CLI config
├── docs/                             # Project documentation
│   ├── requirements.md
│   ├── db-design.md
│   ├── api-design.md
│   └── test-plan.md
├── tests/                            # Manual test cases and future automated tests
├── src/
│   ├── config.ts                     # GYM_CHECKIN_CODE constant
│   ├── theme/
│   │   └── colors.ts                 # Single source of truth — all colors
│   ├── services/
│   │   ├── firebase.ts               # App init, exports: auth, db
│   │   ├── auth.ts                   # signIn, signUp, logOut, resetPassword, ensureUserProfile
│   │   ├── users.ts                  # UserProfile CRUD — UserProfile type defined here
│   │   ├── attendance.ts             # checkIn, isCheckedInToday, getAttendanceDates, getMonthlyCount, subscribeRecentCheckins
│   │   ├── gymSettings.ts            # getMembershipPrices, setMembershipPrices, getWorkoutAccess, setWorkoutAccess, subscribeWorkoutAccess
│   │   └── email.ts                  # sendNewMemberNotification via EmailJS
│   ├── components/
│   │   ├── DateInput.tsx             # Native date text input (YYYY-MM-DD)
│   │   └── DateInput.web.tsx         # Web date text input
│   ├── navigation/
│   │   ├── AppNavigator.tsx          # NativeStack wrapping DrawerNavigator
│   │   └── DrawerContent.tsx         # Sidebar — role-based nav + real-time workout access
│   ├── utils/
│   │   └── retry.ts                  # withRetry() for resilient Firestore reads
│   └── screens/
│       ├── LoginScreen.tsx           # Sign in / Sign up / Forgot password
│       ├── DashboardScreen.tsx       # Member home (stats, membership card) OR Admin home (member overview, live feed)
│       ├── CheckinScreen.tsx         # Native: live QR scanner (expo-camera)
│       ├── CheckinScreen.web.tsx     # Web: getUserMedia viewfinder + URL param auto check-in
│       ├── CalendarScreen.tsx        # Attendance calendar (members only)
│       ├── WorkoutsScreen.tsx        # Workout categories — access-gated by plan type
│       ├── SettingsScreen.tsx        # Profile edit + admin membership config
│       ├── AdminScreen.tsx           # Member list, search, stats, delete
│       └── AdminUserDetailScreen.tsx # Add/edit member form (modal push)
```

---

## Firestore Schema

```
users/{uid}
  ├── uid                 String
  ├── email               String
  ├── displayName         String
  ├── phone               String
  ├── role                'admin' | 'member'
  ├── membershipType      'basic' | 'premium' | 'vip'
  ├── isActive            Boolean
  ├── joinedAt            Timestamp
  ├── activationStartDate String | null   (YYYY-MM-DD)
  ├── activationEndDate   String | null   (YYYY-MM-DD)
  ├── age                 Number | null
  └── gender              String | null   ('Male' | 'Female' | 'Other')

users/{uid}/attendance/{YYYY-MM-DD}
  ├── date                Timestamp
  ├── checkedInAt         ServerTimestamp
  └── uid                 String

checkins/{uid}_{YYYY-MM-DD}            ← top-level, for real-time admin feed
  ├── uid                 String
  ├── displayName         String
  ├── email               String
  ├── checkedInAt         ServerTimestamp
  └── date                String

gymConfig/membership                   ← singleton, admin-configurable
  ├── basic               Number
  ├── premium             Number
  ├── vip                 Number
  └── workoutAccess
        ├── basic         Boolean
        ├── premium       Boolean
        └── vip           Boolean
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
                            │     ├── Workouts      ← memberOnly
                            │     └── Settings
                            └── AdminUserDetail     ← modal push
```

`DrawerContent.tsx` filters nav items by `adminOnly` / `memberOnly` flags using the Firestore role field. Workout access is subscribed via `subscribeWorkoutAccess` (real-time).

---

## Key Patterns

**Service layer isolation** — All Firebase calls go through `src/services/`. Screens never import from `firebase/*`.

**useFocusEffect** — Drawer screens stay mounted; `useEffect([])` fires only once. Use `useFocusEffect + useCallback` for data that must refresh on each visit.

**Real-time subscriptions** — Use `onSnapshot` for: workout access config (DrawerContent, WorkoutsScreen), recent check-ins (DashboardScreen admin). Return the unsubscribe from `useEffect` cleanup.

**Web alerts** — `Alert.alert` is broken on web. Use `(window as any).alert` / `(window as any).confirm` or an inline Modal.

**Platform files** — Metro auto-picks `.web.tsx` over `.tsx` on web builds. Only create platform files when the implementation genuinely differs.

**Optimistic check-in** — Show success screen immediately after QR validation; write to Firestore in the background.

**Membership expiry** — Client-side check on dashboard load: if `activationEndDate < today`, write `isActive: false` to Firestore. Admin-side: end date controls active status automatically when saving.

**Denormalized checkins** — Top-level `checkins/` collection is written on every check-in alongside the subcollection doc. Avoids Firestore collection group indexes for the admin live feed.

---

## Role-Based Access

| Feature | Member | Admin |
|---|---|---|
| Dashboard | Stats + check-in card + membership card | Member overview + live check-in feed |
| Check In | QR scanner | Hidden |
| Attendance Calendar | Own history | Hidden |
| Workouts | Access-gated by plan | Hidden |
| Members panel | Hidden | Full CRUD |
| Settings | Profile + age/gender (readonly) | Profile + membership config |

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

## Build & Deploy

```bash
npm install --legacy-peer-deps        # peer conflict: @expo/webpack-config
npm run build:web                     # EXPO_OFFLINE=1 expo export → dist/
npm run gen-cert                      # openssl self-signed cert (HTTPS for live camera)
node server.js                        # Serve on port 3000 (auto-HTTPS if cert.pem present)

firebase deploy --only firestore:rules    # Deploy security rules
firebase deploy --only firestore:indexes  # Deploy indexes (checkins query auto-indexed)
```
