import type { ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { PromotionCreate, PromotionEdit } from "./PromotionEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

const PROMOTION = {
  id: 7,
  name: "Sale mùa thi",
  title: "Giảm 10% mùa thi",
  description: null,
  kind: "order_discount",
  mode: "automatic",
  discountType: "percent",
  discountValue: 10,
  maxDiscountAmount: null,
  minOrderAmount: 0,
  scopeType: "all",
  targetIds: [],
  excludeOnSaleItems: false,
  audience: "everyone",
  usageLimit: null,
  perCustomerLimit: null,
  startsAt: "2026-10-31T17:00:00Z",
  endsAt: null,
  isActive: true,
  priority: 0,
  isPublic: true,
  status: "running",
  usedCount: 3,
  couponCount: 0,
  createdAt: "2026-10-24T03:00:00Z",
  updatedAt: "2026-10-24T03:00:00Z",
};

const STATS = {
  usedCount: 12,
  releasedCount: 2,
  totalOrderDiscount: 1200000,
  totalShippingDiscount: 0,
  uniqueCustomers: 9,
};

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() =>
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "mkt@sachluat.vn", fullName: "MKT", roles: ["marketing"], requiresTwoFactorSetup: false },
  }),
);
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
  clearSession();
});
afterAll(() => server.close());

describe("PromotionCreate", () => {
  it("tạo khuyến mãi giảm 10% và quay về danh sách", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/promotions`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(PROMOTION, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<PromotionCreate />);

    await user.type(screen.getByLabelText("Tên nội bộ"), "Sale mùa thi");
    await user.type(screen.getByLabelText("Tiêu đề hiển thị cho khách"), "Giảm 10% mùa thi");
    await user.type(screen.getByLabelText(/Giảm tối đa/), "50000");
    await user.click(screen.getByRole("button", { name: "Tạo khuyến mãi" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/khuyen-mai"));
    expect(body).toMatchObject({
      name: "Sale mùa thi",
      title: "Giảm 10% mùa thi",
      kind: "order_discount",
      mode: "automatic",
      discountType: "percent",
      discountValue: 10,
      maxDiscountAmount: 50000,
      scopeType: "all",
      endsAt: null,
    });
  });

  it("chương trình dùng mã mở trang sửa để thêm mã ngay", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/promotions`, () =>
        HttpResponse.json({ ...PROMOTION, mode: "coupon" }, { status: 201 }),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<PromotionCreate />);

    await user.type(screen.getByLabelText("Tên nội bộ"), "Mã sinh viên");
    await user.type(screen.getByLabelText("Tiêu đề hiển thị cho khách"), "Mã sinh viên");
    await user.click(screen.getByLabelText("Khách nhập mã giảm giá"));
    await user.click(screen.getByRole("button", { name: "Tạo khuyến mãi" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/khuyen-mai/7"));
  });

  it("khóa phạm vi khi chọn miễn phí vận chuyển và gửi phạm vi toàn bộ", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/promotions`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(PROMOTION, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<PromotionCreate />);

    await user.type(screen.getByLabelText("Tên nội bộ"), "Freeship");
    await user.type(screen.getByLabelText("Tiêu đề hiển thị cho khách"), "Freeship toàn quốc");
    await user.click(screen.getByLabelText("Giảm / miễn phí vận chuyển"));
    expect(screen.getByText(/luôn áp cho cả đơn/)).toBeVisible();
    expect(screen.queryByLabelText("Áp dụng cho")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tạo khuyến mãi" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalled());
    expect(body).toMatchObject({ kind: "free_shipping", scopeType: "all", excludeOnSaleItems: false });
  });

  it("báo lỗi từng ô khi nhập sai và không gọi API", async () => {
    const create = vi.fn(() => HttpResponse.json(PROMOTION, { status: 201 }));
    server.use(http.post(`${ORIGIN}/api/v1/admin/promotions`, create));
    const user = userEvent.setup();
    renderWithQuery(<PromotionCreate />);

    await user.type(screen.getByLabelText("Tên nội bộ"), "Sale");
    await user.type(screen.getByLabelText("Tiêu đề hiển thị cho khách"), "Sale");
    await user.clear(screen.getByLabelText("Phần trăm giảm"));
    await user.type(screen.getByLabelText("Phần trăm giảm"), "150");
    await user.selectOptions(screen.getByLabelText("Áp dụng cho"), "skus");
    await user.click(screen.getByRole("button", { name: "Tạo khuyến mãi" }));

    expect(await screen.findByText("Phần trăm giảm từ 1 đến 100.")).toBeVisible();
    expect(screen.getByText("Nhập ít nhất một ID (số nguyên dương), cách nhau bằng dấu phẩy.")).toBeVisible();
    expect(create).not.toHaveBeenCalled();
  });

  it("hiện lỗi của backend ở form khi lưu thất bại", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/promotions`, () =>
        HttpResponse.json(
          {
            status: 400,
            code: "VALIDATION_ERROR",
            title: "Dữ liệu không hợp lệ",
            traceId: "t",
            errors: { name: ["Tên đã tồn tại."] },
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<PromotionCreate />);

    await user.type(screen.getByLabelText("Tên nội bộ"), "Sale");
    await user.type(screen.getByLabelText("Tiêu đề hiển thị cho khách"), "Sale");
    await user.click(screen.getByRole("button", { name: "Tạo khuyến mãi" }));

    expect(await screen.findByText("Tên đã tồn tại.")).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("PromotionEdit", () => {
  it("hiện thống kê, điền sẵn form và không có phần mã khi chương trình tự động", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/promotions/7`, () => HttpResponse.json(PROMOTION)),
      http.get(`${ORIGIN}/api/v1/admin/promotions/7/stats`, () => HttpResponse.json(STATS)),
    );
    renderWithQuery(<PromotionEdit promotionId={7} />);

    expect(await screen.findByRole("heading", { name: "Sửa khuyến mãi “Sale mùa thi”" })).toBeVisible();
    expect(screen.getByLabelText("Tên nội bộ")).toHaveValue("Sale mùa thi");
    expect(screen.getByLabelText("Bắt đầu (giờ Việt Nam)")).toHaveValue("01/11/2026 00:00");
    const stats = await screen.findByRole("region", { name: "Thống kê sử dụng" });
    expect(within(stats).getByText("1.200.000 ₫")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Mã giảm giá" })).not.toBeInTheDocument();
  });

  it("chương trình dùng mã: liệt kê mã, thêm mã, sinh hàng loạt và tắt mã", async () => {
    let added: unknown;
    let generate: unknown;
    let toggled: unknown;
    let coupons = [{ id: 1, code: "SV2026", usageLimit: 100, usedCount: 4, isActive: true }];
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/promotions/7`, () => HttpResponse.json({ ...PROMOTION, mode: "coupon" })),
      http.get(`${ORIGIN}/api/v1/admin/promotions/7/stats`, () => HttpResponse.json(STATS)),
      http.get(`${ORIGIN}/api/v1/admin/promotions/7/coupons`, () => HttpResponse.json(coupons)),
      http.post(`${ORIGIN}/api/v1/admin/promotions/7/coupons`, async ({ request }) => {
        added = await request.json();
        coupons = [...coupons, { id: 2, code: "MOI2026", usageLimit: 5, usedCount: 0, isActive: true }];
        return HttpResponse.json(coupons[1], { status: 201 });
      }),
      http.post(`${ORIGIN}/api/v1/admin/promotions/7/coupons/generate`, async ({ request }) => {
        generate = await request.json();
        return HttpResponse.json(["TET-AAAA", "TET-BBBB"]);
      }),
      http.put(`${ORIGIN}/api/v1/admin/coupons/1`, async ({ request }) => {
        toggled = await request.json();
        coupons = coupons.map((coupon) => (coupon.id === 1 ? { ...coupon, isActive: false } : coupon));
        return HttpResponse.json(coupons.find((coupon) => coupon.id === 1));
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<PromotionEdit promotionId={7} />);

    const table = await screen.findByRole("table", { name: "Mã giảm giá của chương trình" });
    expect(within(table).getByText("SV2026")).toBeVisible();
    expect(within(table).getByText("4/100")).toBeVisible();

    const addForm = screen.getByRole("form", { name: "Thêm mã" });
    await user.type(within(addForm).getByLabelText("Mã"), "moi2026");
    await user.type(within(addForm).getByLabelText(/Số lượt dùng/), "5");
    await user.click(within(addForm).getByRole("button", { name: "Thêm mã" }));
    expect(await screen.findByText("MOI2026")).toBeVisible();
    expect(added).toEqual({ code: "MOI2026", usageLimit: 5 });

    const generateForm = screen.getByRole("form", { name: "Sinh mã hàng loạt" });
    await user.clear(within(generateForm).getByLabelText("Số mã"));
    await user.type(within(generateForm).getByLabelText("Số mã"), "2");
    await user.type(within(generateForm).getByLabelText(/Tiền tố/), "tet-");
    await user.click(within(generateForm).getByRole("button", { name: "Sinh mã" }));
    expect(await screen.findByLabelText(/2 mã vừa sinh/)).toHaveValue("TET-AAAA\nTET-BBBB");
    expect(generate).toEqual({ count: 2, prefix: "TET-" });

    await user.click(screen.getByRole("button", { name: "Tắt mã SV2026" }));
    expect(await screen.findByText("Đã tắt")).toBeVisible();
    expect(toggled).toEqual({ isActive: false, usageLimit: 100 });
  });

  it("báo mã trùng của backend ngay trong form thêm mã", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/promotions/7`, () => HttpResponse.json({ ...PROMOTION, mode: "coupon" })),
      http.get(`${ORIGIN}/api/v1/admin/promotions/7/stats`, () => HttpResponse.json(STATS)),
      http.get(`${ORIGIN}/api/v1/admin/promotions/7/coupons`, () => HttpResponse.json([])),
      http.post(`${ORIGIN}/api/v1/admin/promotions/7/coupons`, () =>
        HttpResponse.json({ status: 409, code: "COUPON_CODE_DUPLICATE", title: "x", traceId: "t" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<PromotionEdit promotionId={7} />);

    const addForm = await screen.findByRole("form", { name: "Thêm mã" });
    await user.type(within(addForm).getByLabelText("Mã"), "TRUNG");
    await user.click(within(addForm).getByRole("button", { name: "Thêm mã" }));
    expect(await screen.findByText("Mã này đã tồn tại. Anh/chị dùng mã khác.")).toBeVisible();
  });

  it("báo không tìm thấy khi khuyến mãi đã bị xóa", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/promotions/9`, () =>
        HttpResponse.json({ status: 404, code: "NOT_FOUND", title: "x", traceId: "t" }, { status: 404 }),
      ),
    );
    renderWithQuery(<PromotionEdit promotionId={9} />);
    expect(await screen.findByText("Không tìm thấy khuyến mãi này, có thể đã bị xóa.")).toBeVisible();
  });
});
