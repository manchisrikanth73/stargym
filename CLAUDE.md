# CLAUDE.md

StarGym is a gym management web app. Members check in via QR code, track attendance, and view workout guides. Admins manage members, membership plans, and monitor real-time check-in activity.

---

## Expo API Reference

**Always read the versioned Expo docs before writing any Expo/React Native code.**
Use: https://docs.expo.dev/versions/v54.0.0/

---

## Quick Commands

```bash
npm install --legacy-peer-deps        # peer conflict: @expo/webpack-config
npm run build:web                     # EXPO_OFFLINE=1 expo export → dist/
node server.js                        # Serve on port 3000 (auto-HTTPS if cert.pem present)
npm run gen-cert                      # openssl self-signed cert for HTTPS (live camera)
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Key Documentation

| Topic | File |
|---|---|
| Stack, architecture, patterns, schema, QR flow | `ARCHITECTURE.md` |
| Business rules, roles, UserProfile schema, DB access rules | `docs/business-rules.md` |
| Database schema & indexes | `docs/db-design.md` |
| API design | `docs/api-design.md` |
| Test plan | `docs/test-plan.md` |
| Coding standards | `.claude/rules/coding.md` |
| Screen rules | `.claude/rules/screens.md` |
| Services layer rules | `.claude/rules/services.md` |
| Navigation rules | `.claude/rules/navigation.md` |

---

## Do Not Change Without Approval

- `src/services/firebase.ts` — Firebase app init and config
- `src/config.ts` — `GYM_CHECKIN_CODE` (changing breaks all QR codes in the field)
- `firestore.rules` — security boundary; review carefully before deploying
- `App.tsx` — auth gate logic; changes affect all navigation
- `src/theme/colors.ts` — changing colors affects the whole UI
- `UserProfile` interface in `users.ts` — must update `createUserProfile` simultaneously
