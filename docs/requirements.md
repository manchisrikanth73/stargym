# StarGym — Requirements

## 1. Functional Requirements

### 1.1 Authentication
- REQ-AUTH-01: Members can sign up with full name, email, password, confirm password, age, gender
- REQ-AUTH-02: Sign-up validates passwords match before submitting
- REQ-AUTH-03: If email already exists and password matches, user is silently signed in
- REQ-AUTH-04: If email already exists and password does not match, show inline banner with "Sign In" and "Forgot Password?" actions
- REQ-AUTH-05: Members can sign in with email and password
- REQ-AUTH-06: Members can reset password via email link
- REQ-AUTH-07: All auth errors are shown inline — no `Alert.alert`

### 1.2 Member Dashboard
- REQ-DASH-01: Show greeting (Good Morning/Afternoon/Evening) with member name
- REQ-DASH-02: Show monthly session count and today check-in status
- REQ-DASH-03: Show membership card with type (Basic/Premium/VIP), start date, end date
- REQ-DASH-04: If membership end date has passed, mark member inactive and show "Membership Expired" banner
- REQ-DASH-05: If account is inactive and not expired, show "Account Pending Approval" banner
- REQ-DASH-06: Show check-in card; disabled and locked if inactive or expired
- REQ-DASH-07: Quick actions: Attendance, Progress (coming soon), Workouts (coming soon)
- REQ-DASH-08: Show motivational quote

### 1.3 Admin Dashboard
- REQ-ADASH-01: Show member overview: total, active, inactive counts
- REQ-ADASH-02: Show gym QR code card — tap to expand and display printable QR
- REQ-ADASH-03: Quick actions: Members, Settings, Workouts
- REQ-ADASH-04: Show live check-in feed (last 24h) — updates in real time via Firestore subscription
- REQ-ADASH-05: Check-in feed shows member full name, email, and formatted check-in time

### 1.4 Check-In
- REQ-CI-01: Member can check in by scanning the gym QR code (web: getUserMedia live viewfinder; native: expo-camera)
- REQ-CI-02: Show success immediately (optimistic UI); write to Firestore in background
- REQ-CI-03: If gym URL is opened with `?checkin=` param, auto-trigger check-in flow
- REQ-CI-04: Prevent duplicate check-ins on the same day
- REQ-CI-05: Write check-in to both `users/{uid}/attendance/{date}` and top-level `checkins/{uid}_{date}`
- REQ-CI-06: HTTPS is required for live camera on mobile (run gen-cert)

### 1.5 Attendance Calendar
- REQ-CAL-01: Members can view their own attendance calendar
- REQ-CAL-02: Attended days are visually highlighted
- REQ-CAL-03: Calendar is read-only (members cannot edit their own attendance)

### 1.6 Workout Guide
- REQ-WO-01: Show 8 workout categories with expandable accordion cards
- REQ-WO-02: Access controlled per membership type — admin configures which plans can access via Settings
- REQ-WO-03: Locked members see a gate screen instead of workout content
- REQ-WO-04: Drawer shows lock icon and hint text for members with no access
- REQ-WO-05: Workout access config updates in real time without page refresh (Firestore onSnapshot)
- REQ-WO-06: Workout menu is hidden for admin users

### 1.7 Member Settings
- REQ-SET-01: Members can update first name and last name
- REQ-SET-02: Members see age and gender as read-only fields (set at signup)
- REQ-SET-03: Cancel restores last-saved values
- REQ-SET-04: Save shows success banner "All changes applied successfully."

### 1.8 Admin Settings
- REQ-ASET-01: Admin can update first name and last name
- REQ-ASET-02: Admin does NOT see age and gender fields
- REQ-ASET-03: Admin can view and edit email and phone
- REQ-ASET-04: Membership grid shows Basic/Premium/VIP rows with price and workout access toggle
- REQ-ASET-05: Admin edits prices inline; bottom Save button saves profile + prices together
- REQ-ASET-06: Workout access toggles save immediately on change (no Save needed)
- REQ-ASET-07: Cancel restores profile fields and price draft

### 1.9 Member Management (Admin)
- REQ-MEM-01: Admin can search members by name or email
- REQ-MEM-02: Admin can add new members manually (without Firebase Auth account)
- REQ-MEM-03: Admin can edit member: name, email, phone, age, gender, membership type, activation dates, active status
- REQ-MEM-04: Admin can delete members (removes Firestore doc only; Auth account persists)
- REQ-MEM-05: Activation end date auto-controls active status — past = inactive, future = active
- REQ-MEM-06: Active toggle is disabled when an end date is set

### 1.10 Role-Based Access
- REQ-ROLE-01: Roles: `admin` and `member`
- REQ-ROLE-02: Admin sees: Dashboard, Members, Workouts, Settings in drawer
- REQ-ROLE-03: Member sees: Dashboard, Check In, Attendance, Workouts, Settings in drawer
- REQ-ROLE-04: Role is read from Firestore `users/{uid}.role` — not from Firebase Auth claims

---

## 2. Non-Functional Requirements

- NFR-01: Web-only deployment (Expo web export → `dist/`) served by `server.js`
- NFR-02: HTTPS required for live QR camera on mobile Safari
- NFR-03: All colors from `src/theme/colors.ts` — no hardcoded hex values in components
- NFR-04: No `Alert.alert` on web — use `window.alert` / `window.confirm` or inline Modal
- NFR-05: Firestore writes go through `src/services/` — no direct firebase imports in screens
- NFR-06: Real-time data uses `onSnapshot`; one-time reads use `getDoc`/`getDocs`
- NFR-07: Drawer screens use `useFocusEffect` + `useCallback` for data fetching
- NFR-08: Admin email notifications sent via EmailJS on new member signup
