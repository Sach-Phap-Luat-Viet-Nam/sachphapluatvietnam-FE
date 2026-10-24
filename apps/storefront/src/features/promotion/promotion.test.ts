import { describe, expect, it } from "vitest";
import type { PublicPromotion } from "../ordering/checkout-preview";
import { benefitLabel, conditionLines, lastValidDate, validityText } from "./promotion";

function promo(overrides: Partial<PublicPromotion> = {}): PublicPromotion {
  return {
    id: 1,
    title: "Khuyến mãi",
    description: null,
    kind: "order_discount",
    mode: "automatic",
    discountType: "percent",
    discountValue: 10,
    maxDiscountAmount: null,
    minOrderAmount: 0,
    scopeType: "all",
    excludeOnSaleItems: false,
    audience: "everyone",
    startsAt: "2026-01-01T00:00:00Z",
    endsAt: null,
    ...overrides,
  };
}

describe("benefitLabel", () => {
  it("labels percent, capped percent, fixed and free shipping", () => {
    expect(benefitLabel(promo())).toBe("Giảm 10%");
    expect(benefitLabel(promo({ maxDiscountAmount: 50000 }))).toBe("Giảm 10% · tối đa 50.000 ₫");
    expect(benefitLabel(promo({ discountType: "fixed_amount", discountValue: 30000 }))).toBe("Giảm 30.000 ₫");
    expect(benefitLabel(promo({ kind: "free_shipping", discountValue: 100 }))).toBe("Miễn phí vận chuyển");
    expect(benefitLabel(promo({ kind: "free_shipping", discountType: "fixed_amount", discountValue: 15000 }))).toBe(
      "Giảm phí vận chuyển 15.000 ₫",
    );
  });
});

describe("validityText", () => {
  it("shows the last valid day, not the exclusive end instant", () => {
    // "đến hết 31/12/2026" được lưu là 0h ngày 01/01/2027 giờ Việt Nam.
    expect(lastValidDate("2027-01-01T00:00:00+07:00")).toBe("31/12/2026");
    expect(validityText(promo({ endsAt: "2027-01-01T00:00:00+07:00" }), new Date("2026-10-01T00:00:00Z"))).toBe(
      "Đến hết 31/12/2026",
    );
  });

  it("handles open-ended and not-yet-started promotions", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    expect(validityText(promo(), now)).toBe("Chưa có hạn kết thúc");
    expect(validityText(promo({ startsAt: "2026-11-01T00:00:00+07:00" }), now)).toBe("Từ 01/11/2026");
    expect(
      validityText(promo({ startsAt: "2026-11-01T00:00:00+07:00", endsAt: "2026-12-01T00:00:00+07:00" }), now),
    ).toBe("Từ 01/11/2026 đến hết 30/11/2026");
  });
});

describe("conditionLines", () => {
  it("tells how to get the offer and lists the conditions", () => {
    expect(conditionLines(promo({ mode: "coupon", minOrderAmount: 300000, audience: "members_only" }))).toEqual([
      "Nhập mã giảm giá ở bước thanh toán",
      "Đơn từ 300.000 ₫",
      "Áp dụng cho mọi sách",
      "Dành cho thành viên đã đăng nhập",
    ]);
    expect(conditionLines(promo({ excludeOnSaleItems: true }))).toContain("Không áp dụng cho sách đang giảm giá sẵn");
  });
});
