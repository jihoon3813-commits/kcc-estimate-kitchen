import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * 특정 견적서 조회
 */
export const getEstimate = query({
  args: { quoteNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("estimates")
      .filter((q) => q.eq(q.field("quoteNumber"), args.quoteNumber))
      .first();
  },
});

/**
 * 모든 견적서 조회 (목록)
 */
export const listEstimates = query({
  handler: async (ctx) => {
    return await ctx.db.query("estimates").order("desc").collect();
  },
});

/**
 * 새 견적서 추가
 */
export const createEstimate = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("estimates", args);
    return id;
  },
});
