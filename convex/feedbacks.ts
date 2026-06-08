import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
