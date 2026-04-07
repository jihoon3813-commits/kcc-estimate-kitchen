import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. 견적서 테이블
  estimates: defineTable({
    customerName: v.string(),     // 고객명
    contact: v.string(),          // 연락처
    round: v.number(),            // 견적 차수 (1, 2, 3)
    quoteNumber: v.string(),      // 견적번호
    address: v.string(),          // 현장 주소
    siteType: v.string(),         // 현장 유형 (APT 등)
    estimateDate: v.string(),     // 견적일
    globalMargin: v.optional(v.number()),     // 전체 마진율 (레거시)
    extraPrice: v.optional(v.number()),       // 기타 추가금/할인금 (레거시)
    paymentSettings: v.optional(v.any()), // 결제방식 설정 (새 구조)
    initialTotal: v.optional(v.number()), // 초기 총액
    conditions: v.any(),          // 시공 현장 조건 스냅샷
    designConcept: v.any(),       // 디자인 컨셉 스냅샷
    quoteDetails: v.any(),        // 견적 상세 항목 리스트
    notes: v.array(v.string()),   // 상세 안내사항
    manager: v.any(),             // 담당 매니저 정보 스냅샷
    createdAt: v.number(),        // 생성 시간
    updatedAt: v.number(),        // 수정 시간
  })
  .index("by_customer_search", ["customerName", "contact", "round"]) // 고객별/차수별 검색 색인
  .index("by_quote_number", ["quoteNumber"]), // 견적번호 검색 색인

  // 2. 글로벌 설정 테이블
  settings: defineTable({
    notes: v.array(v.string()),   // 공통 안내사항
    manager: v.any(),             // 공통 담당 매니저 정보
  }),
});
