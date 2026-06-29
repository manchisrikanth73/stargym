# StarGym — API / Service Layer Design

All external data access goes through `src/services/`. Screens never import from `firebase/*` directly.

---

## `src/services/auth.ts`

| Function | Signature | Description |
|---|---|---|
| `signUp` | `(email, password, displayName, age?, gender?) → Promise<UserCredential>` | Creates Auth account + Firestore profile. On `email-already-in-use`, silently tries sign-in; re-creates Firestore doc if deleted. |
| `signIn` | `(email, password) → Promise<UserCredential>` | Firebase `signInWithEmailAndPassword` |
| `logOut` | `() → Promise<void>` | Firebase `signOut` |
| `resetPassword` | `(email) → Promise<void>` | Sends password reset email |
| `onAuthChange` | `(cb) → Unsubscribe` | Auth state observer — used in `App.tsx` to gate navigation |
| `ensureUserProfile` | `(user) → Promise<void>` | Re-creates missing Firestore profile on sign-in (edge case after admin delete) |

---

## `src/services/users.ts`

| Function | Signature | Description |
|---|---|---|
| `createUserProfile` | `(uid, email, displayName, age?, gender?) → Promise<void>` | Writes new `users/{uid}` doc with default role=member, isActive=false |
| `getUserProfile` | `(uid) → Promise<UserProfile \| null>` | Reads single user doc |
| `getAllUsers` | `() → Promise<UserProfile[]>` | Returns all users ordered by `joinedAt` desc (admin only) |
| `updateUserProfile` | `(uid, data: Partial<UserProfile>) → Promise<void>` | Partial update via `updateDoc` |
| `deleteUserProfile` | `(uid) → Promise<void>` | Deletes Firestore doc (Firebase Auth account persists) |
| `isCurrentUserAdmin` | `(uid) → Promise<boolean>` | Convenience check for role |

### `UserProfile` Type

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
}
```

---

## `src/services/attendance.ts`

| Function | Signature | Description |
|---|---|---|
| `checkIn` | `() → Promise<boolean>` | Writes to `users/{uid}/attendance/{date}` AND `checkins/{uid}_{date}`. Returns `false` if already checked in today. |
| `isCheckedInToday` | `() → Promise<boolean>` | Checks if attendance doc exists for today |
| `getAttendanceDates` | `() → Promise<string[]>` | Returns all attended dates as `YYYY-MM-DD` strings (for calendar) |
| `getMonthlyCount` | `(year, month) → Promise<number>` | Count of check-ins in a calendar month |
| `subscribeRecentCheckins` | `(cb) → Unsubscribe` | Real-time subscription to `checkins` collection, last 24h, ordered by `checkedInAt` desc |

### `CheckinRecord` Type

```typescript
interface CheckinRecord {
  uid: string;
  displayName: string;
  email: string;
  checkedInAt: Timestamp;
  date: string;   // YYYY-MM-DD
}
```

---

## `src/services/gymSettings.ts`

| Function | Signature | Description |
|---|---|---|
| `getMembershipPrices` | `() → Promise<MembershipPrices>` | Reads `gymConfig/membership` prices |
| `setMembershipPrices` | `(prices) → Promise<void>` | Writes prices to `gymConfig/membership` (merge) |
| `getWorkoutAccess` | `() → Promise<WorkoutAccess>` | Reads `workoutAccess` from `gymConfig/membership` |
| `setWorkoutAccess` | `(access) → Promise<void>` | Writes workout access config (merge) |
| `subscribeWorkoutAccess` | `(cb) → Unsubscribe` | Real-time subscription — fires immediately and on every change |

### Types

```typescript
interface MembershipPrices { basic: number; premium: number; vip: number; }
interface WorkoutAccess   { basic: boolean; premium: boolean; vip: boolean; }
```

---

## `src/services/email.ts`

| Function | Signature | Description |
|---|---|---|
| `sendNewMemberNotification` | `(displayName, email) → Promise<void>` | Sends admin notification via EmailJS on new signup. Fire-and-forget — errors logged, not thrown. |

---

## Error Handling Conventions

- All service functions throw on failure — callers handle errors
- Screens catch errors and show inline messages (never `Alert.alert` on web)
- `withRetry` from `src/utils/retry.ts` wraps `getDocs`/`getDoc` calls that may fail under cold-start latency
- `subscribeX` functions log errors to console via the `onSnapshot` error callback — they never throw
