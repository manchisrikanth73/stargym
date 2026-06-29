# StarGym — Business Rules

## Member Lifecycle

- Members are inactive by default at signup — admin must activate or set valid dates
- `activationEndDate < today` → auto-set `isActive = false` (enforced client-side on dashboard load)
- `activationEndDate >= today` → auto-set `isActive = true` (enforced on admin save)
- Admin-created members use a placeholder UID (`manual_{timestamp}`) — no Firebase Auth account
- Disabling a member sets `isActive = false` and `scheduledDeleteAt = today + 60 days`
- Disabled members can be re-enabled (clears `isActive = true`, `scheduledDeleteAt = null`) before the 60-day window
- AdminScreen auto-purges members whose `scheduledDeleteAt <= today` on every load
- Duplicate check-in on the same day is silently rejected (idempotent)
- Admin email (manchisrikanth73@gmail.com) is notified via EmailJS on every new member signup

## Roles

- Roles: `admin`, `member`, `trainer` — read from Firestore, never from Firebase Auth claims
- Workout access per plan type is configured by admin in Settings — defaults: basic=false, premium=true, vip=true

## Trainer Rules

- Trainers cannot be deleted if they have assigned members — remove all assignments first
- Member-to-trainer assignment is managed from the member's edit screen (AdminUserDetailScreen)

## Admin Member Management

- **AdminScreen** (member list): search, stats, check-in history modal per card
- **AdminUserDetailScreen** (edit form): shows "Disable Member" for active members, "Enable Member" for disabled ones (those with `scheduledDeleteAt` set)
- Check-in history (last 60 days) is lazy-loaded via a modal in AdminScreen — not on the edit screen

## UserProfile Schema

```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: 'admin' | 'member' | 'trainer';
  membershipType: 'basic' | 'premium' | 'vip';
  isActive: boolean;
  joinedAt: Timestamp | null;
  activationStartDate: string | null;   // YYYY-MM-DD
  activationEndDate: string | null;     // YYYY-MM-DD
  age: number | null;
  gender: string | null;                // 'Male' | 'Female' | 'Other'
  weightKg: number | null;
  scheduledDeleteAt: string | null;     // YYYY-MM-DD, set by disableMember()
  promoWorkoutExpiry: string | null;    // YYYY-MM-DD
  photoURL: string | null;
  assignedMemberUids?: string[];        // trainers only
}
```

When adding fields to `UserProfile`, update `createUserProfile` in the same commit.

## Firestore Access Rules

- `users/{uid}` — read/write by owner or admin
- `users/{uid}/attendance/{date}` — read by owner or admin; create by owner only
- `checkins/{uid}_{date}` — create by any signed-in user; read by admin only
- `gymConfig/membership` — read by any signed-in user; write by admin only
- `payments/{uid}` — read/write by admin; read by owner
- Test rules (open) active until 2026-07-13 — deploy production rules before then

## Payments (Razorpay)

- Admin creates a subscription for a member; member authorizes via Razorpay's hosted URL
- Grace period: 7 days after `subscription.halted` before member access is affected
- `payments/{uid}` stores live subscription state; `paymentEvents/` is the append-only audit trail
- Razorpay plans cached in `gymConfig/razorpayPlans` keyed by `{membershipType}_{amount}`
