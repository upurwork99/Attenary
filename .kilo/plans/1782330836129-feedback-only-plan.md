# Plan: Feedback-Only Data Architecture

## Goal
Eliminate all Convex sync for profiles, sessions, settings, and the generic sync queue. Feedbacks become the sole remotely-synced entity -- submitted instantly when online, stored in SQLite when offline, and drained to Convex on reconnect.

---

## Confirmed Decisions

| Decision | Answer |
|---|---|
| Profiles/sessions/settings to Convex | Stop syncing -- keep local only |
| AppSettings | Keep local only (AsyncStorage), no Convex table |
| Feedback online path | Direct `api.feedbacks.insert` mutation, no AsyncStorage queue |
| Feedback offline path | SQLite `feedbacks` table as the durable local store |
| Convex schema | Only the `feedbacks` table remains |

---

## Phase 1 -- Convex Backend (server-side)

### 1.1 `convex/schema.ts`
Delete these tables entirely: profiles, sessions, app_settings, sync_watermark, sync_queue.
Keep only `feedbacks` (with `by_user_id` index).

### 1.2 `convex/feedbacks.ts`
Keep unchanged. `get`, `insert`, `upsert` are all valid and sufficient.

### 1.3 Delete these files
- `convex/sync.ts`
- `convex/profiles.ts`
- `convex/sessions.ts`
- `convex/settings.ts`

### 1.4 Regenerate `convex/_generated/`
Run `npx convex dev` after deploying the schema changes. The generated `api` will only expose `feedbacks.get / insert / upsert`.

---

## Phase 2 -- `src/context/ConvexContext.tsx` (complete rewrite)

### Remove
All AsyncStorage queue helpers (loadQueue/saveQueue), watermark helpers, dispatchItem, queueMutation, flushQueue, forceSync, the 10-second setInterval timer, sync_queue/sync_watermark constants, in-flight dedup, retry-count, pushDebug/debugLog.

### Keep
- `deviceId` state + `getOrCreateDeviceId` init
- `isOnline` via NetInfo
- `isConvexHealthy` health-check (ping `api.feedbacks.get` on mount)

### New interface
```ts
export interface ConvexContextType {
  deviceId: string | null;
  isOnline: boolean;
  isSubmittingFeedback: boolean;
  submitFeedback: (args) => Promise<void>;
  drainPendingFeedbacks: () => Promise<void>;
}
```

`submitFeedback`: try `api.feedbacks.insert` directly. On failure call `db.feedbacks.put(args)` to save to SQLite. UI shows "saved locally".

`drainPendingFeedbacks`: on NetInfo reconnect (false->true) and on AppState.active, call `db.feedbacks.getAll(deviceId)`, then for each row call `api.feedbacks.insert` and delete on success. Retain rows that still fail (retry next reconnect).

---

## Phase 3 -- `src/db/database.ts`

Remove table DDL from `init()`: profiles, sessions, sync_queue, sync_watermark, app_settings.
Remove corresponding exported method groups (profiles.*, sessions.*, syncQueue.*). Keep feedbacks.* and backup_events.* unchanged.

---

## Phase 4 -- `src/screens/FeedbacksScreen.tsx`

Replace `useConvexSync().queueMutation` with `submitFeedback`, `drainPendingFeedbacks`, `isSubmittingFeedback`.

`handleSubmit` rewrite:
1. Validate (type, min 10 chars, max 5000) -- unchanged.
2. Call `submitFeedback(payload)`.
3. On success: show existing success bottom-sheet.
4. On direct-mutation failure: feedback saved to SQLite; show "saved locally -- will send when connection returns".

Remove `retryAttempts` state, manual retry Alert dialog, and all `queueMutation` call sites.

Call `drainPendingFeedbacks()` in a useEffect on mount (silent, no UI).

---

## Phase 5 -- `src/context/AppContext.tsx`

Remove all `queueMutation(...)` calls from:
- setEmployeeName, setEmail, setJobTitle, setDepartment, setAvatarUrl, setHourRate
- checkIn, checkOut, addSessions
- deleteSession, updateSessionReason
- completeOnboarding, updateOnboardingProgress, resetOnboardingProgress

These methods already call `saveData()` (AsyncStorage). No further changes needed.

---

## Phase 6 -- `src/context/ConvexIdentityProvider.tsx`

**Recommended: Delete entirely.** Remove from App.tsx provider nesting.
Quick alternative: replace body with a no-op `<>{children}</>`.

---

## Phase 7 -- `App.tsx`

Remove `<ConvexIdentityProvider>` from the provider nest. Result:
```tsx
<ConvexProvider client={convex}>
  <ConvexSyncProvider>
    <Provider>
      <Navigation />
    </Provider>
  </ConvexSyncProvider>
</ConvexProvider>
```

---

## Phase 8 -- Migration: Clean up stale AsyncStorage key

Call `AsyncStorage.removeItem('@convex_sync_queue_v2')` once on first launch (unconditional, safe since nothing reads it anymore).

---

## Validation Checklist

- [ ] Convex dashboard shows only one table: `feedbacks`
- [ ] Online: submit feedback -> appears in Convex immediately
- [ ] Offline: submit feedback -> SQLite row created; Convex not called
- [ ] Reconnect: pending SQLite feedbacks drained to Convex and removed from SQLite
- [ ] Changing theme/notifications -> AsyncStorage only, zero Convex app_settings writes
- [ ] Check-in/out -> AsyncStorage only, zero Convex network calls
- [ ] `isConvexHealthy` pings `api.feedbacks.get`, not `profiles.listAll`
- [ ] No console errors about missing sync_queue / sync_watermark / app_settings / profiles / sessions tables

---

## Files Changed

| File | Action |
|---|---|
| `convex/schema.ts` | Keep only `feedbacks` table |
| `convex/sync.ts` | Delete |
| `convex/profiles.ts` | Delete |
| `convex/sessions.ts` | Delete |
| `convex/settings.ts` | Delete |
| `convex/feedbacks.ts` | Keep |
| `convex/_generated/` | Regenerate with `npx convex dev` |
| `src/context/ConvexContext.tsx` | Rewrite -- direct mutation + SQLite drain for feedbacks only |
| `src/db/database.ts` | Remove unused table DDL/methods |
| `src/screens/FeedbacksScreen.tsx` | Use new context API, drop retry counter |
| `src/context/ConvexIdentityProvider.tsx` | Delete |
| `src/context/AppContext.tsx` | Remove `queueMutation` calls from non-feedback methods |
| `App.tsx` | Remove `<ConvexIdentityProvider>` |
