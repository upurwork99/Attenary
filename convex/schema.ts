import { defineTable, defineSchema } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  feedbacks: defineTable({
    user_id: v.string(),
    type: v.string(),
    email: v.optional(v.string()),
    content: v.string(),
    metadata: v.optional(v.string()),
    created_at: v.number(),
  })
    .index("by_user_id", ["user_id"]),
});
