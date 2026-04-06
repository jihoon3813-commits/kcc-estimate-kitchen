import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  estimates: defineTable({
    quoteNumber: v.string(),
    customerName: v.string(),
    address: v.string(),
    totalPrice: v.number(),
    status: v.string(),
    manager: v.string(),
    items: v.array(v.object({
      name: v.string(),
      category: v.string(),
      price: v.number(),
      description: v.optional(v.string()),
    })),
  }),
});
