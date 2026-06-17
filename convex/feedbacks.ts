import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("feedbacks")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .order("desc")
      .collect();
  },
});

export const insert = mutation({
  args: {
    user_id: v.string(),
    type: v.string(),
    email: v.optional(v.string()),
    content: v.string(),
    metadata: v.optional(v.string()),
    created_at: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("feedbacks", args);
  },
});

export const upsert = mutation({
  args: {
    user_id: v.string(),
    type: v.string(),
    email: v.optional(v.string()),
    content: v.string(),
    metadata: v.optional(v.string()),
    created_at: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("feedbacks")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .filter((q) => q.eq(q.field("created_at"), args.created_at))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
      return existing._id;
    }
    return await ctx.db.insert("feedbacks", { ...args });
  },
});
