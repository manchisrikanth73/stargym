# Tests

Manual test cases are in `docs/test-plan.md`.

This folder is reserved for automated tests when a test runner is configured.

## Planned Structure (when tests are added)

```
tests/
├── unit/
│   ├── services/
│   │   ├── auth.test.ts
│   │   ├── users.test.ts
│   │   ├── attendance.test.ts
│   │   └── gymSettings.test.ts
│   └── utils/
│       └── retry.test.ts
├── integration/
│   ├── checkin-flow.test.ts
│   └── member-management.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── member-dashboard.spec.ts
    └── admin-dashboard.spec.ts
```

## To add tests

1. Choose a runner (Jest for unit/integration, Playwright for E2E)
2. Install: `npm install --save-dev jest @testing-library/react-native`
3. Add test cases following the plan in `docs/test-plan.md`
4. Cover P1 cases first
