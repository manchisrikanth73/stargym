---
glob: src/navigation/**
---

# Navigation Rules

- Drawer screen visibility is controlled by `adminOnly` / `memberOnly` flags in `NAV_ITEMS` — never conditionally render drawer screens elsewhere
- Role and workout-access state in `DrawerContent` must use real-time subscriptions (`subscribeWorkoutAccess`) so the UI updates live when an admin changes settings
- New screens must be registered in `AppNavigator.tsx` before they can be navigated to
- Modal pushes (e.g. `AdminUserDetail`) belong in the NativeStack in `AppNavigator`, not the DrawerNavigator
