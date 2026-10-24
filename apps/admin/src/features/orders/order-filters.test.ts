import { activeFilterCount, normalizeOrderSearch, toOrderQuery } from "./order-filters";
import { isDestructiveTransition, transitionEffect } from "./labels";
import { orderFilterFormSchema } from "./schemas";

describe("normalizeOrderSearch", () => {
  it("bỏ khoảng trắng, dấu chấm ở số điện thoại và viết hoa mã đơn", () => {
    expect(normalizeOrderSearch(" 0901 234.567 ")).toBe("0901234567");
    expect(normalizeOrderSearch("+84 901234567")).toBe("+84901234567");
    expect(normalizeOrderSearch("slvn2610230001")).toBe("SLVN2610230001");
    expect(normalizeOrderSearch("  ")).toBe("");
  });
});

describe("orderFilterFormSchema", () => {
  const base = { status: "", paymentMethod: "", from: "", to: "", q: "" } as const;

  it("nhận bộ lọc trống", () => {
    expect(orderFilterFormSchema.safeParse(base).success).toBe(true);
  });

  it("báo ngày không có thật và khoảng ngày ngược", () => {
    expect(orderFilterFormSchema.safeParse({ ...base, from: "2026-02-30" }).success).toBe(false);
    const reversed = orderFilterFormSchema.safeParse({ ...base, from: "2026-10-24", to: "2026-10-01" });
    expect(reversed.error?.issues).toEqual([expect.objectContaining({ path: ["to"] })]);
    expect(orderFilterFormSchema.safeParse({ ...base, from: "2026-10-24", to: "2026-10-24" }).success).toBe(true);
  });
});

describe("toOrderQuery / activeFilterCount", () => {
  it("về trang 1 và đếm bộ lọc đang bật", () => {
    const query = toOrderQuery({
      status: "pending_confirm",
      paymentMethod: "",
      from: "2026-10-01",
      to: "",
      q: "slvn1",
    });
    expect(query).toEqual({
      status: "pending_confirm",
      paymentMethod: "",
      from: "2026-10-01",
      to: "",
      q: "SLVN1",
      page: 1,
    });
    expect(activeFilterCount(query)).toBe(3);
  });
});

describe("chuyển trạng thái", () => {
  it("hủy và hoàn tiền là thao tác khó quay lại", () => {
    expect(isDestructiveTransition("cancelled")).toBe(true);
    expect(isDestructiveTransition("refunded")).toBe(true);
    expect(isDestructiveTransition("packing")).toBe(false);
  });

  it("nêu tác động kèm theo; đã giao chỉ ghi thu tiền với đơn COD", () => {
    expect(transitionEffect("packing", "cod")).toMatch(/Trừ tồn kho/);
    expect(transitionEffect("delivered", "cod")).toMatch(/thu tiền/);
    expect(transitionEffect("delivered", "bank_transfer")).toBeNull();
    expect(transitionEffect("shipping", "cod")).toBeNull();
  });
});
