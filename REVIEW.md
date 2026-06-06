# REVIEW.md — Review Guidelines for Attenary

This file defines project-specific rules, conventions, and review criteria
used when reviewing or modifying code in the Attenary repository.

---

## Project Overview

- **App**: React Native (Expo SDK 55) cross-platform app (iOS, Android, Web)
- **Language**: TypeScript (`.tsx` for components, `.ts` for utilities)
- **State**: Local-first via React Context (`AppContext`, `LanguageContext`, `ThemeContext`, `SupabaseContext`, `TabBarVisibilityContext`)
- **Storage**: Primary = `PHARMACY_ATTENDANCE_DATA_V2` JSON blob via `getStorageItem` / `setStorageItem` (abstracts `AsyncStorage` vs `localStorage`); Secondary = `op-sqlite` / `expo-sqlite`; Cloud = Supabase (offline-first, fire-and-forget)
- **Design**: Dark-first design system with tokens in `src/theme/colors.ts`

---

## Naming Conventions

- **Screens**: `PascalCase` + `Screen.tsx` suffix (e.g., `TimeClockScreen.tsx`). Use **named exports**.
- **Components**: `PascalCase` component names, defined as functional components with hooks.
- **Types/Interfaces**: `PascalCase`.
- **Utilities**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE` for truly constant values, `camelCase` for object/config containers.
- **Files**: Add new files as `.ts` / `.tsx` only. Do **not** add new `.js` files.

---

## Styling and Theme

- Use `StyleSheet.create` and array-based style merging.
- Reuse design tokens from `src/theme/colors.ts` and `ThemeContext`.
- Do **not** hardcode inline hex colors or arbitrary spacing values in JSX when a token exists.
- Mirror existing component patterns (e.g., `CustomTabBar` for navigation chrome).

---

## State and Persistence Patterns

- Use the `getStorageItem` / `setStorageItem` helpers for all cross-platform storage reads/writes.
- Do **not** call `AsyncStorage` or `localStorage` directly in components.
- SQLite interaction goes through `src/db/database.ts` wrappers; always map raw rows to typed objects via the provided row-mappers.
- Supabase client is accessed via `SupabaseContext`. Remote sync is fire-and-forget; log non-critical errors, surface critical errors via `Alert.alert`.

---

## i18n and RTL

- All user-facing strings must exist in `src/context/LanguageContext.tsx`.
- Every new string must have entries in **both** the `en` and `ar` translation objects.
- Tests and screens must verify `I18nManager.isRTL` behavior when layout depends on direction.

---

## Platform Awareness

- Branch explicitly with `Platform.OS === 'web'` when behavior differs.
- Web uses `localStorage` and Web Crypto; native uses `AsyncStorage` and `expo-crypto`.
- File IO / sharing must use `expo-sharing` / web `Blob` branches consistently.

---

## Navigation and Screens

- Root navigator is defined in `src/navigation/Navigation.tsx`.
- Use conditional initial route (`Onboarding` vs `Main`) based on `profile.onboarding_completed`.
- Modal screens are added to the native stack; do not cram modal-only flows under a tab.
- Keep `CustomTabBar` as the single source of truth for tab chrome and animations; reuse the local `TOKEN` object pattern when adding tab-related styling.

---

## Error Handling

- Wrap new entry screens or risky components in `ComponentErrorBoundary` where appropriate.
- Do **not** add global `try/catch` that silently swallows errors; log non-critical, alert critical.

---

## Data Modeling and Migrations

- Session IDs must use the established pattern: `Date.now().toString(36) + Math.random().toString(36).substring(2, 11)`
- Do **not** change SQLite schema or backup JSON schema without bumping the `BACKUP_SCHEMA_VERSION` and updating `src/types/backup.ts`.
- Any breaking change to `AppData` shape must update the migration / restore paths.

---

## Review Checklist Before Submitting a PR

- [ ] No `.env`, keystore paths, or secrets appear in diffs.
- [ ] New strings added to both `en` and `ar` in `LanguageContext`.
- [ ] Cross-platform storage goes through `getStorageItem` / `setStorageItem`.
- [ ] SQLite operations use mapped types, not raw row indices.
- [ ] Design tokens used instead of inline hardcoded colors/spacing.
- [ ] Schema/backup version bumped if data contracts changed.
- [ ] No new `.js` files introduced (use `.ts` / `.tsx`).
- [ ] Platform branches present for any behavior that differs on web vs native.
- [ ] `ErrorBoundary` / `ComponentErrorBoundary` used appropriately.
- [ ] Lint passes (`npx expo lint`).
