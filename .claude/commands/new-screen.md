# New Screen

Scaffold a new screen in the StarGym app.

The user will provide a screen name and description. Use `$ARGUMENTS` to read them.

## Steps

1. Create `src/screens/<Name>Screen.tsx` following these conventions:
   - Dark theme using `colors` from `src/theme/colors.ts`
   - Header row with hamburger menu (`DrawerActions.openDrawer()`) on the left and title centered
   - `useFocusEffect` (not `useEffect`) for any data fetching so it re-runs when navigating back to the screen
   - Use `Alert.alert` for native; use `(window as any).alert` / `(window as any).confirm` for web dialogs
   - No comments unless the logic is non-obvious

2. Register the screen in `src/navigation/AppNavigator.tsx`:
   - If it belongs in the drawer: add a `<Drawer.Screen>` inside `DrawerNav`
   - If it's pushed modally: add a `<Stack.Screen>` in the root `AppNavigator`

3. If it should appear in the sidebar, add a nav item to the `NAV_ITEMS` array in `src/navigation/DrawerContent.tsx` with the appropriate `adminOnly` or `memberOnly` flag.

4. Report which files were changed.

## Screen name from arguments
$ARGUMENTS
