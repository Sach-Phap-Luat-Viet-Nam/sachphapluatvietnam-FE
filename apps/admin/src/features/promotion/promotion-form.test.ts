import { describe, expect, it } from "vitest";
import { emptyPromotionForm, promotionToFormValues, toPromotionBody } from "./promotion-form";
import { parseTargetIds, promotionFormSchema } from "./schemas";
import type { AdminPromotion, PromotionFormValues } from "./schemas";

const NOW = new Date("2026-10-24T03:20:00Z");

function form(overrides: Partial<PromotionFormValues> = {}): PromotionFormValues {
  return { ...emptyPromotionForm(NOW), name: "Sale mùa thi", title: "Giảm 10% mùa thi", ...overrides };
}

describe("emptyPromotionForm", () => {
  it("starts at the next hour in Vietnam time", () => {
    // 03:20 UTC = 10:20 giờ Việt Nam → 11:00.
    expect(emptyPromotionForm(NOW).startsAt).toBe("2026-10-24T11:00");
  });
});

describe("toPromotionBody", () => {
  it("maps a percent promotion, converting Vietnam time to an offset and empty limits to null", () => {
    const body = toPromotionBody(
      form({ maxDiscountAmount: "50000", endsAt: "2027-01-01T00:00", minOrderAmount: "300000", priority: "5" }),
    );
    expect(body).toEqual({
      name: "Sale mùa thi",
      title: "Giảm 10% mùa thi",
      kind: "order_discount",
      mode: "automatic",
      discountType: "percent",
      discountValue: 10,
      maxDiscountAmount: 50000,
      minOrderAmount: 300000,
      scopeType: "all",
      excludeOnSaleItems: false,
      audience: "everyone",
      usageLimit: null,
      perCustomerLimit: null,
      startsAt: "2026-10-24T11:00:00+07:00",
      endsAt: "2027-01-01T00:00:00+07:00",
      isActive: true,
      priority: 5,
      isPublic: true,
    });
  });

  it("drops the cap for fixed amounts and sends the target ids only for a scoped promotion", () => {
    const body = toPromotionBody(
      form({
        discountType: "fixed_amount",
        discountValue: "30000",
        maxDiscountAmount: "99999",
        scopeType: "books",
        targetIds: "3, 5\n3 8",
      }),
    );
    expect(body.maxDiscountAmount).toBeNull();
    expect(body.targetIds).toEqual([3, 5, 8]);
  });

  it("forces free shipping to cover every book and not exclude on-sale items", () => {
    const body = toPromotionBody(
      form({ kind: "free_shipping", scopeType: "books", targetIds: "1", excludeOnSaleItems: true }),
    );
    expect(body.scopeType).toBe("all");
    expect(body.excludeOnSaleItems).toBe(false);
    expect(body).not.toHaveProperty("targetIds");
  });
});

describe("promotionToFormValues", () => {
  it("round-trips a backend promotion into form values in Vietnam time", () => {
    const promotion: AdminPromotion = {
      id: 1,
      name: "Freeship",
      title: "Miễn phí vận chuyển",
      description: null,
      kind: "free_shipping",
      mode: "coupon",
      discountType: "percent",
      discountValue: 100,
      maxDiscountAmount: null,
      minOrderAmount: 0,
      scopeType: "all",
      targetIds: [],
      excludeOnSaleItems: false,
      audience: "members_only",
      usageLimit: 100,
      perCustomerLimit: null,
      startsAt: "2026-10-31T17:00:00Z",
      endsAt: "2026-12-31T17:00:00Z",
      isActive: true,
      priority: 3,
      isPublic: false,
      status: "running",
      usedCount: 4,
      couponCount: 2,
      createdAt: "2026-10-24T03:00:00Z",
      updatedAt: "2026-10-24T03:00:00Z",
    };
    expect(promotionToFormValues(promotion)).toMatchObject({
      startsAt: "2026-11-01T00:00",
      endsAt: "2027-01-01T00:00",
      usageLimit: "100",
      perCustomerLimit: "",
      audience: "members_only",
    });
  });
});

describe("promotionFormSchema", () => {
  const messages = (values: PromotionFormValues) => {
    const result = promotionFormSchema.safeParse(values);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it("accepts the default form once named", () => {
    expect(messages(form())).toEqual([]);
  });

  it("limits percent to 1–100 and fixed amounts to more than 0", () => {
    expect(messages(form({ discountValue: "101" }))).toContain("Phần trăm giảm từ 1 đến 100.");
    expect(messages(form({ discountValue: "0" }))).toContain("Phần trăm giảm từ 1 đến 100.");
    expect(messages(form({ discountType: "fixed_amount", discountValue: "0" }))).toContain(
      "Số tiền giảm phải lớn hơn 0.",
    );
  });

  it("requires 1–500 target ids for a scoped order discount but not for free shipping", () => {
    expect(messages(form({ scopeType: "skus", targetIds: "" }))).toContain(
      "Nhập ít nhất một ID (số nguyên dương), cách nhau bằng dấu phẩy.",
    );
    expect(messages(form({ scopeType: "skus", targetIds: "abc" }))).not.toEqual([]);
    expect(messages(form({ scopeType: "skus", targetIds: "7" }))).toEqual([]);
    expect(messages(form({ kind: "free_shipping", scopeType: "skus", targetIds: "" }))).toEqual([]);
  });

  it("requires the end to be after the start", () => {
    expect(messages(form({ startsAt: "2026-11-01T08:00", endsAt: "2026-11-01T08:00" }))).toContain(
      "Thời điểm kết thúc phải sau thời điểm bắt đầu.",
    );
  });
});

describe("parseTargetIds", () => {
  it("splits on commas, semicolons and whitespace, de-duplicates, and rejects non-numbers", () => {
    expect(parseTargetIds("1,2;3 4\n2")).toEqual([1, 2, 3, 4]);
    expect(parseTargetIds("")).toEqual([]);
    expect(parseTargetIds("1, x")).toBeNull();
    expect(parseTargetIds("0")).toBeNull();
  });
});
