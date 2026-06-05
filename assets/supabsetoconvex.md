# Migration Guide: Moving an AI Agent from Supabase to Convex

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture & Mental Model Shift](#architecture--mental-model-shift)
3. [Phase 1: Project Setup & Schema Migration](#phase-1-project-setup--schema-migration)
4. [Phase 2: Authentication Migration](#phase-2-authentication-migration)
5. [Phase 3: Database Queries & Logic Migration](#phase-3-database-queries--logic-migration)
6. [Phase 4: Real-time & Subscriptions](#phase-4-real-time--subscriptions)
7. [Phase 5: External APIs & AI Integration](#phase-5-external-apis--ai-integration)
8. [Phase 6: Vector Search & RAG Migration](#phase-6-vector-search--rag-migration)
9. [Phase 7: File Storage Migration](#phase-7-file-storage-migration)
10. [Phase 8: Convex AI Agent Component (Optional)](#phase-8-convex-ai-agent-component-optional)
11. [Phase 9: Client SDK & Frontend Updates](#phase-9-client-sdk--frontend-updates)
12. [Deployment & Testing Checklist](#deployment--testing-checklist)
13. [Common Pitfalls](#common-pitfalls)

---

## Executive Summary

**Supabase** is a PostgreSQL-centric backend: you define SQL schemas, write RLS policies, and query directly from the client. **Convex** is a reactive function-centric backend: you write TypeScript functions that run server-side, and the platform handles real-time sync, caching, and execution automatically.

For **AI agents**, Convex offers specific advantages:
- **Built-in reactivity**: Agent state updates stream to clients automatically without WebSocket configuration
- **Actions**: Purpose-built for external API calls (OpenAI, Anthropic, etc.) without blocking transactions
- **Agent Component**: Official library for persistent agent threads, tool calling, and workflows
- **Vector search**: Native vector storage without managing pgvector extensions

---

## Architecture & Mental Model Shift

| Concept | Supabase | Convex |
|---------|----------|--------|
| **Core unit** | Database table | TypeScript function |
| **Data access** | SQL / PostgREST / Client SDK | `query`, `mutation`, `action` functions |
| **Schema** | SQL migrations (`*.sql`) | TypeScript schema file (`convex/schema.ts`) |
| **Auth enforcement** | Row Level Security (RLS) policies | Logic inside functions |
| **Real-time** | WAL subscriptions (manual setup) | Automatic reactive queries |
| **External APIs** | Edge Functions (Deno) | Actions (Node.js runtime) |
| **Vector search** | `pgvector` extension | Built-in vector indexes |

### The Biggest Shift: From "Client talks to DB" to "Client calls Functions"

In Supabase, your frontend often queries the database directly:
```typescript
// Supabase pattern
const { data } = await supabase
  .from('agent_runs')
  .select('*')
  .eq('status', 'running');
```

In Convex, **all data access goes through functions** you define:
```typescript
// Convex pattern
const agentRuns = await ctx.db.query("agent_runs")
  .withIndex("by_status", q => q.eq("status", "running"))
  .collect();
```

There is no direct database access from the client. This is a feature, not a limitation—it means your authorization logic lives in TypeScript alongside your business logic, rather than in SQL RLS policies.

---

## Phase 1: Project Setup & Schema Migration

### 1.1 Initialize Convex

```bash
npm install convex
npx convex dev
```

Create `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Equivalent to: CREATE TABLE agent_sessions (...)
  agent_sessions: defineTable({
    userId: v.string(),           // was uuid, now string
    model: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("error")
    ),
    context: v.optional(v.array(v.string())),
    createdAt: v.number(),        // timestamps as epoch ms
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  // Equivalent to: CREATE TABLE messages (...)
  messages: defineTable({
    sessionId: v.id("agent_sessions"),  // foreign key via ID type
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_time", ["sessionId", "createdAt"]),

  // Vector store for RAG (replaces pgvector table)
  knowledge_chunks: defineTable({
    source: v.string(),
    content: v.string(),
    embedding: v.array(v.number()),  // vector storage
    metadata: v.optional(v.record(v.string(), v.any())),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,  // OpenAI text-embedding-3-small
      metric: "cosine",
    }),
});
```

**Key differences from SQL:**
- No `JOIN`s. Fetch related data by storing document IDs and looking them up in function code.
- No `ALTER TABLE` migrations. Update the schema file and redeploy; Convex validates compatibility.
- Indexes are declared in schema, not created via SQL.

### 1.2 Data Migration Strategy

Since no automated migration tool exists between Supabase Postgres and Convex, use an ETL script:

```typescript
// scripts/migrate.ts
import { createClient } from "@supabase/supabase-js";
import { api } from "../convex/_generated/api";
import { ConvexClient } from "convex/browser";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const convex = new ConvexClient(process.env.CONVEX_URL!);

async function migrate() {
  // Batch fetch from Supabase
  const { data: sessions } = await supabase
    .from('agent_sessions')
    .select('*')
    .range(0, 999);
  
  // Insert into Convex via mutation
  for (const session of sessions || []) {
    await convex.mutation(api.migrations.insertSession, {
      userId: session.user_id,
      model: session.model,
      status: session.status,
      context: session.context,
      createdAt: new Date(session.created_at).getTime(),
    });
  }
}
```

Create the migration mutation in `convex/migrations.ts`:
```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const insertSession = mutation({
  args: {
    userId: v.string(),
    model: v.string(),
    status: v.string(),
    context: v.optional(v.array(v.string())),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agent_sessions", args);
  },
});
```

---

## Phase 2: Authentication Migration

You have **two strategies**:

### Strategy A: Keep Supabase Auth, Use Convex for Data (Bridge)
Best for gradual migration. Supabase continues issuing JWTs; Convex verifies them.

**1. Configure Convex to trust Supabase JWTs** in `convex/auth.config.ts`:
```typescript
import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      type: "customJwt",
      issuer: `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/auth/v1`,
      jwks: `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/auth/v1/.well-known/jwks.json`,
      algorithm: "ES256",
    },
  ],
} satisfies AuthConfig;
```

**2. Pass tokens from Supabase client to Convex**:
```typescript
// lib/providers.tsx
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { createClient, Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const useSupabaseAuth = () => {
  const [session, setSession] = useState<<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return useMemo(() => ({
    isLoading,
    isAuthenticated: !!session,
    fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        const { data } = await supabase.auth.refreshSession();
        return data.session?.access_token ?? null;
      }
      return session?.access_token ?? null;
    },
  }), [session, isLoading]);
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useSupabaseAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
```

**3. Access user identity in Convex functions**:
```typescript
import { query } from "./_generated/server";

export const getMySessions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // identity.tokenIdentifier contains the Supabase user ID
    return await ctx.db.query("agent_sessions")
      .withIndex("by_user", q => q.eq("userId", identity.tokenIdentifier))
      .collect();
  },
});
```

### Strategy B: Full Migration to Convex Auth
If you want to drop Supabase entirely, use Convex Auth:

```bash
npm install @convex-dev/auth
```

Configure `convex/auth.config.ts` with OAuth providers or email/password. Convex Auth supports:
- Email/password with verification
- OAuth (Google, GitHub, etc.)
- Magic links
- Anonymous auth

---

## Phase 3: Database Queries & Logic Migration

### Supabase RLS → Convex Function Authorization

In Supabase, you wrote RLS policies:
```sql
-- Supabase RLS
CREATE POLICY "Users can only see their own sessions"
  ON agent_sessions FOR SELECT
  USING (auth.uid() = user_id);
```

In Convex, authorization lives in the function:

```typescript
// convex/sessions.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Helper to enforce auth
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity.tokenIdentifier;
}

export const listMySessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUser(ctx);
    return await ctx.db.query("agent_sessions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const createSession = mutation({
  args: {
    model: v.string(),
    initialContext: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUser(ctx);
    return await ctx.db.insert("agent_sessions", {
      userId,
      model: args.model,
      status: "idle",
      context: args.initialContext ?? [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id("agent_sessions"),
    status: v.union(
      v.literal("idle"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.patch(args.sessionId, { 
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
```

### Handling Relations (No SQL JOINs)

Supabase:
```typescript
const { data } = await supabase
  .from('messages')
  .select('*, agent_sessions(model, status)')
  .eq('session_id', sessionId);
```

Convex:
```typescript
export const getSessionWithMessages = query({
  args: { sessionId: v.id("agent_sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    
    const messages = await ctx.db.query("messages")
      .withIndex("by_session", q => q.eq("sessionId", sessionId))
      .order("asc")
      .collect();
    
    return { ...session, messages };
  },
});
```

---

## Phase 4: Real-time & Subscriptions

This is where Convex eliminates the most boilerplate.

### Supabase (manual subscription):
```typescript
const channel = supabase
  .channel('session_updates')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'agent_sessions' },
    (payload) => {
      setSession(payload.new);
    }
  )
  .subscribe();
```

### Convex (automatic reactivity):
Any query function becomes a live subscription automatically.

```typescript
// hooks/useSession.ts
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function useSession(sessionId: string) {
  // This automatically re-runs when data changes
  return useQuery(api.sessions.getSessionWithMessages, { sessionId });
}
```

When `updateSessionStatus` mutation changes a session, **all subscribed clients receive the updated data automatically**—no channel setup, no manual cache invalidation.

---

## Phase 5: External APIs & AI Integration

In Supabase, you called OpenAI from Edge Functions (Deno runtime). In Convex, you use **Actions**—they run outside transactions and can call any external API.

```typescript
// convex/agentActions.ts
import { v } from "convex/values";
import { action } from "./_generated/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runAgentStep = action({
  args: {
    sessionId: v.id("agent_sessions"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch session (read from DB via internal mutation)
    const session = await ctx.runMutation(internal.sessions.getSessionInternal, {
      sessionId: args.sessionId,
    });
    
    // 2. Call OpenAI (external API - no transaction)
    const completion = await openai.chat.completions.create({
      model: session.model,
      messages: [
        ...session.context.map(c => ({ role: "system" as const, content: c })),
        { role: "user", content: args.userMessage },
      ],
    });
    
    const assistantMessage = completion.choices[0].message.content;
    
    // 3. Save results (write via internal mutation)
    await ctx.runMutation(internal.messages.insertMessage, {
      sessionId: args.sessionId,
      role: "assistant",
      content: assistantMessage,
    });
    
    await ctx.runMutation(internal.sessions.updateSessionInternal, {
      sessionId: args.sessionId,
      status: "completed",
    });
    
    return assistantMessage;
  },
});
```

**Critical pattern**: Actions cannot directly read/write the database. They must call `ctx.runQuery()` or `ctx.runMutation()` to access data. This keeps transactions pure while allowing external API calls.

---

## Phase 6: Vector Search & RAG Migration

Replace `pgvector` with Convex's built-in vector indexes.

### Supabase (pgvector):
```sql
CREATE EXTENSION vector;
CREATE TABLE knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text,
  embedding vector(1536)
);
CREATE INDEX ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);
```

```typescript
const { data } = await supabase.rpc('match_documents', {
  query_embedding: embedding,
  match_threshold: 0.78,
  match_count: 5,
});
```

### Convex:
Schema already defined in Phase 1. Query like this:

```typescript
// convex/rag.ts
import { v } from "convex/values";
import { query } from "./_generated/server";

export const findRelevantContext = query({
  args: {
    embedding: v.array(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { embedding, limit = 5 }) => {
    return await ctx.db.query("knowledge_chunks")
      .withSearchVector("by_embedding", embedding, {
        maxResults: limit,
      })
      .collect();
  },
});
```

**Hybrid search** (vector + text filter):
```typescript
export const searchEngineeringDocs = query({
  args: { embedding: v.array(v.number()), query: v.string() },
  handler: async (ctx, args) => {
    const vectorResults = await ctx.db.query("knowledge_chunks")
      .withSearchVector("by_embedding", args.embedding, { maxResults: 20 })
      .collect();
    
    // Post-filter in TypeScript (Convex doesn't support SQL WHERE on vector queries yet)
    return vectorResults.filter(r => 
      r.source.includes("engineering") && r.content.includes(args.query)
    );
  },
});
```

---

## Phase 7: File Storage Migration

### Supabase:
```typescript
const { data, error } = await supabase.storage
  .from('agent-assets')
  .upload(`session-${sessionId}/${fileName}`, file);
```

### Convex:
```typescript
// convex/storage.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: { fileName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getCurrentUser(ctx);
    const uploadUrl = await ctx.storage.generateUploadUrl();
    // Store reference in DB
    await ctx.db.insert("files", {
      userId,
      fileName: args.fileName,
      storageId: uploadUrl.id, // reference to Convex storage
      createdAt: Date.now(),
    });
    return uploadUrl.url; // Return URL to client
  },
});

export const getFileUrl = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (!file) throw new Error("Not found");
    // Return URL for client to download
    return await ctx.storage.getUrl(file.storageId);
  },
});
```

Client-side upload:
```typescript
const uploadUrl = await convex.mutation(api.storage.generateUploadUrl, { fileName });
await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": file.type },
  body: file,
});
```

---

## Phase 8: Convex AI Agent Component (Optional)

For production AI agents, consider Convex's official **Agent Component** instead of building from scratch:

```bash
npm install @convex-dev/agent
```

Features:
- Persistent thread/message history with vector search
- Streaming text/objects over WebSocket (no HTTP streaming complexity)
- Tool calling with automatic context inclusion
- Rate limiting integration
- Usage tracking per user/model/provider
- File attachments in conversations

```typescript
// convex/agent.ts
import { agent } from "@convex-dev/agent";

export const myAgent = agent({
  name: "researchAssistant",
  model: "gpt-4",
  instructions: "You are a helpful research assistant...",
  tools: [searchKnowledgeBase, fetchWebPage],
});
```

This replaces much of the custom session/message management you built in Supabase.

---

## Phase 9: Client SDK & Frontend Updates

### Supabase client:
```typescript
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);
```

### Convex client:
```typescript
import { ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);
```

### React hooks comparison:

| Task | Supabase | Convex |
|------|----------|--------|
| Fetch data | `useEffect` + `supabase.from()` | `useQuery(api.functions.myQuery)` |
| Subscribe to changes | `supabase.channel().on()` | `useQuery` (automatic) |
| Call mutation | `supabase.from().insert()` | `useMutation(api.functions.myMutation)` |
| Call AI action | Edge Function fetch | `useAction(api.agentActions.runAgentStep)` |

Example React component:
```typescript
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

export function AgentChat({ sessionId }: { sessionId: string }) {
  const session = useQuery(api.sessions.getSessionWithMessages, { sessionId });
  const sendMessage = useMutation(api.messages.sendMessage);
  const runAgent = useAction(api.agentActions.runAgentStep);
  
  async function handleSubmit(message: string) {
    await sendMessage({ sessionId, content: message, role: "user" });
    await runAgent({ sessionId, userMessage: message });
    // No need to manually refresh - useQuery re-runs automatically
  }
  
  return (
    <div>
      {session?.messages.map(m => (
        <div key={m._id} className={m.role}>{m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>...</form>
    </div>
  );
}
```

---

## Deployment & Testing Checklist

### Pre-migration
- [ ] Export all Supabase data (use `pg_dump` or Supabase CLI)
- [ ] Document all RLS policies → translate to Convex function checks
- [ ] List all Edge Functions → plan as Convex Actions
- [ ] Identify all real-time subscriptions → verify automatic reactivity covers them

### Migration
- [ ] Set up Convex project and schema
- [ ] Run data migration scripts (batch insert via mutations)
- [ ] Implement auth bridge (Strategy A) or migrate users (Strategy B)
- [ ] Port core queries/mutations
- [ ] Port external API calls to Actions
- [ ] Set up vector indexes and migrate embeddings
- [ ] Migrate file storage references

### Testing
- [ ] Verify auth flow (sign in, token refresh, sign out)
- [ ] Test all CRUD operations with authorization
- [ ] Verify real-time updates across multiple clients
- [ ] Test AI agent end-to-end (message → OpenAI → response → persistence)
- [ ] Test vector search accuracy and performance
- [ ] Load test with concurrent agent sessions
- [ ] Verify file uploads/downloads

### Post-migration
- [ ] Update environment variables in deployment
- [ ] Set up Convex dashboard monitoring (function logs, performance)
- [ ] Configure rate limiting for AI calls
- [ ] Set up usage tracking for LLM costs

---

## Common Pitfalls

### 1. **Assuming SQL features exist**
Convex does not support `JOIN`, `GROUP BY`, `DISTINCT`, or window functions. Compute aggregations in application code or use separate lookup patterns.

### 2. **Trying to call `fetch` inside mutations**
Mutations are transactional and cannot call external APIs. Use **Actions** for OpenAI/Anthropic calls, then write results via `ctx.runMutation()`.

### 3. **Expecting immediate consistency across regions**
Convex runs in a single region (like Supabase primary). Reads and writes are strongly consistent within that region, but there's no built-in read replica geo-distribution like Supabase offers.

### 4. **Forgetting to index**
Without indexes, Convex queries scan entire tables. Always define `.index()` or `.vectorIndex()` in schema for production queries.

### 5. **RLS policy translation errors**
Convex functions run server-side, so "client-side" RLS doesn't apply. But you must explicitly check `ctx.auth.getUserIdentity()` in every function that needs protection. Missing this exposes data.

### 6. **Vector dimension mismatches**
Ensure your Convex `vectorIndex` `dimensions` exactly match your embedding model (1536 for OpenAI `text-embedding-3-small`, 3072 for `text-embedding-3-large`, etc.).

### 7. **Migration timing**
Convex does not support transactions across the Supabase→Convex boundary. Plan for a maintenance window or dual-write period during migration.

---

## Quick Reference: Syntax Map

| Task | Supabase | Convex |
|------|----------|--------|
| **Create record** | `.insert()` | `ctx.db.insert("table", {...})` |
| **Read by ID** | `.eq('id', id)` | `ctx.db.get(id)` |
| **Query with filter** | `.eq().order()` | `ctx.db.query().withIndex().order()` |
| **Update** | `.update()` | `ctx.db.patch(id, {...})` |
| **Delete** | `.delete()` | `ctx.db.delete(id)` |
| **Transaction** | RPC or function | Built into `mutation` |
| **Real-time** | `.channel().on()` | Automatic with `useQuery` |
| **Vector search** | `pgvector` + `rpc()` | `withSearchVector()` |
| **File upload** | `storage.upload()` | `ctx.storage.generateUploadUrl()` |
| **Auth check** | RLS `auth.uid()` | `ctx.auth.getUserIdentity()` |

---

This migration fundamentally shifts your backend from a **database-centric** model to a **function-centric reactive** model. For AI agents specifically, Convex's automatic reactivity, purpose-built Actions for LLM calls, and optional Agent Component can significantly reduce the boilerplate you maintained manually in Supabase.



......
Great question — this is one of the biggest conceptual differences between the two platforms.

## The Short Answer

| Supabase | Convex Equivalent |
|----------|-------------------|
| **Project URL** (`https://<ref>.supabase.co`) | **Deployment URL** (`https://<name>-<number>.convex.cloud`) |
| **Anon Key** (`eyJhbG...`) | **Nothing. Convex has no equivalent.** |

## Why There Is No "Anon Key"

In **Supabase**, the `anon key` exists because your frontend talks **directly to the database** via PostgREST. The key tells Supabase which project you're hitting and grants baseline access — RLS policies then restrict what you can actually see.

In **Convex**, your frontend **never touches the database directly**. It only calls **functions you write** (`query`, `mutation`, `action`). There is no public REST API surface to protect with a key. The URL alone is enough to route the request to your deployment. Authorization happens inside your functions via `ctx.auth.getUserIdentity()`, not via a shared secret key.

---

## The Convex URLs You Actually Need

When you run `npx convex dev`, Convex creates an `.env.local` file with your deployment URL:

```bash
# React / Vite
VITE_CONVEX_URL=https://cheerful-oyster-123.convex.cloud

# Next.js
NEXT_PUBLIC_CONVEX_URL=https://cheerful-oyster-123.convex.cloud

# Generic
CONVEX_URL=https://cheerful-oyster-123.convex.cloud
```

You pass this to the client:

```typescript
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
```

That's it. **No key required.**

### The Second URL: `.site` (for HTTP Actions)

Convex also gives you a **site URL** ending in `.site` instead of `.cloud`:

```bash
NEXT_PUBLIC_CONVEX_SITE_URL=https://cheerful-oyster-123.convex.site
```

This is **only** for HTTP Actions — REST-like endpoints you explicitly expose (e.g., for webhooks, OAuth callbacks, or external services that can't use the Convex SDK). Your regular React/Vue/Next.js app does **not** use this for normal queries/mutations.

---

## What About Public/Unauthenticated Access?

In Supabase, you use the `anon key` to let anyone read public data (RLS allows it). In Convex, you simply **don't check for authentication** in your function:

```typescript
// Public query — anyone can call it, no key needed
export const listPublicPosts = query({
  args: {},
  handler: async (ctx) => {
    // No auth check = publicly accessible
    return await ctx.db.query("posts").take(10);
  },
});
```

If you want to lock it down, add the auth check:

```typescript
// Private query — requires logged-in user
export const getMyPosts = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");
    
    return await ctx.db.query("posts")
      .withIndex("by_user", q => q.eq("userId", user.tokenIdentifier))
      .collect();
  },
});
```

---

## Side-by-Side Client Setup

### Supabase
```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://abc123.supabase.co",      // project URL
  "eyJhbGciOiJIUzI1NiIs..."         // anon key (REQUIRED)
);
```

### Convex
```typescript
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(
  "https://cheerful-oyster-123.convex.cloud"  // deployment URL only
  // No key. No secret. The URL is enough.
);
```

---

## Summary

- **Project URL** → `CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL` / `VITE_CONVEX_URL`
- **Anon Key** → **Does not exist.** Convex's function-centric architecture removes the need for a public access key. The deployment URL identifies your backend, and your function code controls who can do what.
- **Site URL** (`*.convex.site`) → Only for HTTP Actions / webhooks, not for normal client SDK usage.