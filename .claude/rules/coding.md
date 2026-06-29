# Coding Standards

- No hardcoded colors — always import from `src/theme/colors.ts`
- `useFocusEffect + useCallback` on drawer screens (they stay mounted; `useEffect([])` fires only once)
- Platform files (`.web.tsx`) only when implementation genuinely differs; Metro auto-picks them for web builds
- DOM elements (`<video>`, `<canvas>`) only in `.web.tsx` files
- No `Alert.alert` on web — use `(window as any).alert` / `(window as any).confirm` or an inline Modal
- `typeof window !== 'undefined'` guard before any `window.*` access in shared (non-.web) files
- Admin-only features are gated by Firestore `role` field — never trust client-side state alone
