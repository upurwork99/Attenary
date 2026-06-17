# AppSettings Implementation Plan

## Analysis of Existing Patterns

### Schema Definition (`convex/schema.ts`)
- Tables use `defineTable()` with typed fields
- Fields use `v.string()`, `v.number()`, `v.boolean()`, `v.optional()`
- Indexes defined with `.index("by_field", ["field"])`
- `created_at` and `updated_at` timestamps for tracking (used in profiles, sessions)
- `feedbacks` omits `updated_at` (append-only data)

### Mutation Patterns (`convex/feedbacks.ts`, `convex/profiles.ts`, `convex/settings.ts`)

**Profiles (reference pattern):**
- `get` query: single result by `user_id` with `.unique()`
- `listAll` query: returns all records with `.collect()`
- `upsert` mutation: checks existing → `patch()` if exists, `insert()` if not
- On insert: sets `created_at` from `updated_at` arg
- On patch: updates `updated_at` timestamp

**Feedbacks:**
- `get` query: returns list ordered by `created_at DESC`
- `insert` mutation: simple insert
- `upsert` mutation: different logic using `created_at` as uniqueness filter

**Settings (current implementation):**
- `get` query: single result by `user_id`
- `upsert` mutation: checks existing → `patch()` if exists, `insert()` if not
- Missing `updated_at` field in schema (inconsistent with profiles)

### Database Layer (`src/db/database.ts`)
- Local SQLite table `app_settings` exists (lines 99-109)
- Missing from `Database` interface and implementation
- No `rowToAppSettings` mapper function

## Issues Found

1. **Missing `updated_at` in schema**: `app_settings` schema lacks `updated_at` field but database.ts SQLite schema has it
2. **Missing database interface**: No `appsettings` in Database interface or implementation
3. **Inconsistent naming**: Schema uses `app_settings`, module uses `settings`

## Recommended Implementation

### 1. Update `convex/schema.ts`
- Add `updated_at: v.number()` field to `app_settings` table

### 2. Update `convex/settings.ts`
- Modify `upsert` to set `created_at` on insert
- Ensure consistency with profiles pattern

### 3. Update `src/db/database.ts`
- Add `rowToAppSettings` mapper
- Add `appsettings` to `Database` interface
- Implement `get`, `put`, and `clear` methods

### 4. Rename module (optional but recommended for consistency)
- Rename `settings.ts` to `appsettings.ts`
- Update import in `convex/_generated/api.d.ts` (auto-generated on `convex dev`)