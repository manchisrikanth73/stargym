---
glob: src/services/**
---

# Services Layer Rules

- Never import `firebase/firestore` or `firebase/auth` directly in screens — all Firestore/Auth access goes through these service files
- Every exported function must be `async` and throw on failure (callers handle errors)
- Use `withRetry` from `../utils/retry` for any `getDocs`/`getDoc` that may fail under cold-start latency
- Firestore document shape must match the `UserProfile` interface in `users.ts` — update the interface first, then the function
- Use `onSnapshot` (not `getDoc`) when the caller needs real-time updates (e.g. drawer badge counts, live config)
- `gymConfig/membership` document is the single source of truth for `MembershipPrices` and `WorkoutAccess`
