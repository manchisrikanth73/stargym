# StarGym — Database Design

## Firestore Collections

---

### `users/{uid}`

Main member/admin profile document.

| Field | Type | Description |
|---|---|---|
| `uid` | String | Firebase Auth UID |
| `email` | String | Email address |
| `displayName` | String | Full name |
| `phone` | String | Phone number (optional) |
| `role` | `'admin' \| 'member'` | Access role |
| `membershipType` | `'basic' \| 'premium' \| 'vip'` | Plan tier |
| `isActive` | Boolean | Whether member can check in |
| `joinedAt` | Timestamp | Account creation time (serverTimestamp) |
| `activationStartDate` | String \| null | Membership start `YYYY-MM-DD` |
| `activationEndDate` | String \| null | Membership end `YYYY-MM-DD` (null = open-ended) |
| `age` | Number \| null | Age entered at signup |
| `gender` | String \| null | `'Male' \| 'Female' \| 'Other'` |

**Auto-expiry rule (client-enforced):**
On dashboard load, if `activationEndDate < today`, set `isActive = false` and write back to Firestore.

**Admin-created members:**
When admin manually adds a member, a placeholder UID `manual_{timestamp}` is used. No Firebase Auth account is created.

---

### `users/{uid}/attendance/{YYYY-MM-DD}`

One document per check-in day per user.

| Field | Type | Description |
|---|---|---|
| `date` | Timestamp | Date of attendance (client-set) |
| `checkedInAt` | Timestamp | Exact check-in time (serverTimestamp) |
| `uid` | String | Owner UID (redundant for collection group queries) |

**Document ID:** `YYYY-MM-DD` (e.g., `2026-06-15`)

---

### `checkins/{uid}_{date}`

Top-level denormalized collection for real-time admin check-in feed.
Written alongside `users/{uid}/attendance/{date}` on every check-in.

| Field | Type | Description |
|---|---|---|
| `uid` | String | Member UID |
| `displayName` | String | Member name at time of check-in |
| `email` | String | Member email at time of check-in |
| `checkedInAt` | Timestamp | Check-in time (serverTimestamp) |
| `date` | String | Date key `YYYY-MM-DD` |

**Document ID:** `{uid}_{YYYY-MM-DD}` — one per member per day, overwrites on duplicate.

**Why denormalized:** Avoids Firestore collection group query (which requires explicit COLLECTION_GROUP index). Admin dashboard subscribes to this flat collection with a simple `checkedInAt >= 24h ago` filter — auto-indexed, no deployment needed.

---

### `gymConfig/membership`

Singleton document for admin-configurable gym settings.

| Field | Type | Description |
|---|---|---|
| `basic` | Number | Monthly price for Basic plan |
| `premium` | Number | Monthly price for Premium plan |
| `vip` | Number | Monthly price for VIP plan |
| `workoutAccess.basic` | Boolean | Whether Basic members can access Workout guide |
| `workoutAccess.premium` | Boolean | Whether Premium members can access Workout guide |
| `workoutAccess.vip` | Boolean | Whether VIP members can access Workout guide |

**Defaults:** `{ basic: 0, premium: 0, vip: 0, workoutAccess: { basic: false, premium: true, vip: true } }`

**Real-time:** Subscribed via `onSnapshot` in both `DrawerContent` and `WorkoutsScreen` so UI updates live when admin changes settings.

---

## Security Rules Summary

| Collection | Read | Write |
|---|---|---|
| `users/{uid}` | Owner or Admin | Owner or Admin |
| `users/{uid}/attendance/{date}` | Owner or Admin | Create: Owner; Update/Delete: Admin |
| `checkins/{docId}` | Admin | Any signed-in user |
| `gymConfig/{docId}` | Any signed-in user | Admin only |
| `errorLogs/{logId}` | Admin | Any signed-in user |

> **Note:** Test rules (open read/write) are active until 2026-07-13. Run `firebase deploy --only firestore:rules` before going to production.

---

## Indexes

| Collection | Field | Scope | Status |
|---|---|---|---|
| `checkins` | `checkedInAt` DESC | COLLECTION | Auto (no deployment needed) |
| `attendance` (per user) | `date` ASC | COLLECTION | Auto |
| `attendance` (per user) | `date` range | COLLECTION | Auto |
