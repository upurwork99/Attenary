import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("app_settings")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    user_id: v.string(),
    theme: v.optional(v.string()),
    notifications: v.optional(v.boolean()),
    onboarding_completed: v.optional(v.boolean()),
    onboarding_progress: v.optional(v.number()),
    hour_rate: v.optional(v.number()),
    currency: v.optional(v.string()),
    last_sync_token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("app_settings")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert("app_settings", { ...args });
    }
  },
});
