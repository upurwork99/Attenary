import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

export const processQueue = action({
  args: {
    user_id: v.string(),
    items: v.array(v.object({
      entity_type: v.string(),
      entity_id: v.string(),
      operation: v.union(v.literal("upsert"), v.literal("delete")),
      payload: v.string(),
      created_at: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const processedIds: string[] = [];
    const watermarkUpdates: Record<string, number> = {};

    const byType = new Map<string, typeof args.items>();
    for (const item of args.items) {
      const list = byType.get(item.entity_type) || [];
      list.push(item);
      byType.set(item.entity_type, list);
    }

    for (const [entityType, items] of byType) {
      let maxTs = 0;

      if (entityType === "sessions") {
        const sessionPayloads = items
          .filter((i) => i.operation === "upsert")
          .map((i) => JSON.parse(i.payload));

        if (sessionPayloads.length > 0) {
          await ctx.runMutation(api.sessions.bulkUpsert, { items: sessionPayloads });
        }

        for (const item of items.filter((i) => i.operation === "delete")) {
          // delete logic placeholder
        }
      } else if (entityType === "profiles") {
        for (const item of items) {
          if (item.operation === "upsert") {
            await ctx.runMutation(api.profiles.upsert, JSON.parse(item.payload));
          }
        }
      } else if (entityType === "feedbacks") {
        for (const item of items) {
          if (item.operation === "upsert") {
            await ctx.runMutation(api.feedbacks.insert, JSON.parse(item.payload));
          }
        }
      } else if (entityType === "app_settings") {
        for (const item of items) {
          if (item.operation === "upsert") {
            await ctx.runMutation(api.settings.upsert, JSON.parse(item.payload));
          }
        }
      }

      for (const item of items) {
        maxTs = Math.max(maxTs, item.created_at);
      }
      watermarkUpdates[entityType] = maxTs;
    }

    for (const [entityType, ts] of Object.entries(watermarkUpdates)) {
      await ctx.runMutation(api.sync.updateWatermark, {
        user_id: args.user_id,
        entity_type: entityType,
        last_synced_ts: ts,
      });
    }

    return { processed: args.items.length, watermarks: watermarkUpdates };
  },
});

export const updateWatermark = mutation({
  args: {
    user_id: v.string(),
    entity_type: v.string(),
    last_synced_ts: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sync_watermark")
      .withIndex("by_user_entity", (q) =>
        q.eq("user_id", args.user_id).eq("entity_type", args.entity_type)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { last_synced_ts: args.last_synced_ts });
    } else {
      await ctx.db.insert("sync_watermark", args);
    }
  },
});

export const getWatermarks = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sync_watermark")
      .withIndex("by_user_entity", (q) => q.eq("user_id", args.user_id))
      .collect();
  },
});
