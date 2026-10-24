import {
  activeFilterCount,
  normalizeOrderSearch,
  recentDaysRange,
  resolveOrderQuery,
  toOrderQuery,
} from "./order-filters";
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

describe("resolveOrderQuery", () => {
  const values = {
    status: "pending_confirm",
    paymentMethod: "cod",
    from: "2026-10-01",
    to: "2026-10-24",
    q: "slvn1",
  } as const;

  it("builds the query with the search term normalized", () => {
    const { query, errors } = resolveOrderQuery(values, 2);
    expect(errors).toEqual({});
    expect(query).toEqual({ ...values, q: "SLVN1", page: 2 });
  });

  it("drops only the invalid fields and reports them", () => {
    const reversed = resolveOrderQuery({ ...values, from: "2026-10-24", to: "2026-10-01" }, 1);
    expect(reversed.errors.to).toBe("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
    expect(reversed.query).toMatchObject({ from: "2026-10-24", to: "", status: "pending_confirm" });

    const partial = resolveOrderQuery({ ...values, from: "01/10" }, 1);
    expect(partial.errors.from).toBe("Nhập ngày theo dạng dd/mm/yyyy.");
    expect(partial.query.from).toBe("");
  });
});

describe("recentDaysRange", () => {
  it("counts today as the first day, in Vietnam time", () => {
    // 20:00 UTC ngày 23/10 đã là 03:00 ngày 24/10 ở Việt Nam.
    const now = new Date("2026-10-23T20:00:00Z");
    expect(recentDaysRange(1, now)).toEqual({ from: "2026-10-24", to: "2026-10-24" });
    expect(recentDaysRange(7, now)).toEqual({ from: "2026-10-18", to: "2026-10-24" });
  });
});
