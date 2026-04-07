import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * 1. 견적서 저장 (생성 및 수정)
 */
export const saveEstimate = mutation({
  args: {
    id: v.optional(v.id("estimates")),
    customerName: v.string(),
    contact: v.string(),
    round: v.number(),
    quoteNumber: v.string(),
    address: v.string(),
    siteType: v.string(),
    estimateDate: v.string(),
    globalMargin: v.optional(v.number()),
    extraPrice: v.optional(v.number()),
    paymentSettings: v.optional(v.any()),
    conditions: v.any(),
    designConcept: v.any(),
    quoteDetails: v.any(),
    initialTotal: v.optional(v.number()),
    notes: v.array(v.string()),
    manager: v.any(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;

    // 1. 명시적인 ID가 전달된 경우 (수정 모드), 해당 ID를 우선하여 패치
    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
      return id;
    }

    // 2. ID가 없는 경우 (신규 저장/엑셀 업로드), 고객명/연락처/차수 기반으로 중복 체크
    const existing = await ctx.db
      .query("estimates")
      .withIndex("by_customer_search", (q) => 
        q.eq("customerName", data.customerName).eq("contact", data.contact).eq("round", data.round)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...data, updatedAt: Date.now() });
      return existing._id;
    } else {
      const newId = await ctx.db.insert("estimates", {
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return newId;
    }
  },
});

/**
 * 2. 견적서 단건 조회 (고객용/상세용)
 */
export const getEstimate = query({
  args: { id: v.id("estimates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * 2.5 견적서 검색 (고객용 로그인)
 */
export const searchEstimate = query({
  args: { 
    customerName: v.string(), 
    contact: v.string(), 
    round: v.number() 
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("estimates")
      .withIndex("by_customer_search", (q) => 
        q.eq("customerName", args.customerName).eq("contact", args.contact).eq("round", args.round)
      )
      .unique();
  },
});

/**
 * 3. 전체 견적 리스트 조회 (어드민용)
 */
export const listEstimates = query({
  handler: async (ctx) => {
    return await ctx.db.query("estimates").order("desc").collect();
  },
});

/**
 * 4. 글로벌 설정 저장 (안내사항, 매니저)
 */
export const saveGlobalSettings = mutation({
  args: {
    notes: v.array(v.string()),
    manager: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("settings").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("settings", args);
    }
  },
});

/**
 * 5. 글로벌 설정 조회
 */
export const getGlobalSettings = query({
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").first();
    return settings || {
      notes: ["기본 안내사항입니다."],
      manager: { name: "관리자", role: "지원", dept: "KCC", imageUrl: "" }
    };
  },
});
