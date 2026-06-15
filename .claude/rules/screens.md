---
glob: src/screens/**
---

# Screen Coding Rules

- Use `useFocusEffect` + `useCallback` for data fetching on drawer screens — `useEffect([])` only fires on first mount, drawer screens stay mounted
- Never use `Alert.alert` — use `(window as any).alert` / `(window as any).confirm` or an inline Modal
- Never hardcode colors — always import from `src/theme/colors`
- Never import firebase directly — use functions from `src/services/`
- Platform-specific implementations go in `.web.tsx` files (Metro auto-picks them for web builds); only create them when the implementation genuinely differs
- Admin-only UI: check `isAdmin` from the user profile, not from Firebase Auth claims
- Real-time Firestore data in screens: subscribe with `onSnapshot` inside `useFocusEffect`, return the unsubscribe function as the cleanup
