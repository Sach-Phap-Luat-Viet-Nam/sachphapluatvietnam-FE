import type { ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { ShippingManager } from "./ShippingManager";

const ORIGIN = window.location.origin;
const server = setupServer();

const SETTINGS = {
  freeShippingThreshold: 300000,
  packagingWeightGram: 200,
  defaultBookWeightGram: 500,
  flatFee: 30000,
};

const NORTH = {
  id: 1,
  name: "Miền Bắc",
  isActive: true,
  sortOrder: 0,
  provinces: ["Hà Nội", "Hải Phòng"],
  baseWeightGram: 1000,
  baseFee: 20000,
  stepWeightGram: 500,
  stepFee: 5000,
  etaMinDays: 2,
  etaMaxDays: 4,
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
    user: { id: 1, email: "om@sachluat.vn", fullName: "OM", roles: ["order_manager"], requiresTwoFactorSetup: false },
  }),
);
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("ShippingManager", () => {
  it("lưu cấu hình chung, để trống ngưỡng nghĩa là tắt miễn phí theo ngưỡng", async () => {
    let body: unknown;
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/shipping/settings`, () => HttpResponse.json(SETTINGS)),
      http.get(`${ORIGIN}/api/v1/admin/shipping/zones`, () => HttpResponse.json([])),
      http.put(`${ORIGIN}/api/v1/admin/shipping/settings`, async ({ request }) => {
        const sent = (await request.json()) as typeof SETTINGS;
        body = sent;
        return HttpResponse.json(sent);
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<ShippingManager />);

    const threshold = await screen.findByLabelText(/Miễn phí vận chuyển từ đơn/);
    expect(threshold).toHaveValue("300000");
    await user.clear(threshold);
    await user.click(screen.getByRole("button", { name: "Lưu cấu hình" }));

    expect(await screen.findByText("Đã lưu cấu hình vận chuyển.")).toBeVisible();
    expect(body).toEqual({ ...SETTINGS, freeShippingThreshold: null });
  });

  it("báo khi cấu hình đang là mặc định chưa ai lưu", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/shipping/settings`, () => HttpResponse.json({ ...SETTINGS, isDefault: true })),
      http.get(`${ORIGIN}/api/v1/admin/shipping/zones`, () => HttpResponse.json([])),
    );
    renderWithQuery(<ShippingManager />);
    expect(await screen.findByText(/Chưa có ai lưu cấu hình/)).toBeVisible();
  });

  it("liệt kê vùng và cảnh báo các tỉnh chưa thuộc vùng nào đang bật", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/shipping/settings`, () => HttpResponse.json(SETTINGS)),
      http.get(`${ORIGIN}/api/v1/admin/shipping/zones`, () => HttpResponse.json([NORTH])),
    );
    renderWithQuery(<ShippingManager />);

    const list = await screen.findByRole("list", { name: "Danh sách vùng giao hàng" });
    expect(within(list).getByText("Miền Bắc")).toBeVisible();
    expect(within(list).getByText(/20\.000 ₫ cho 1000 g đầu, thêm 5\.000 ₫ mỗi 500 g · giao 2–4 ngày/)).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Còn 32/34 tỉnh/thành chưa thuộc vùng nào đang bật");
  });

  it("tạo vùng đầu tiên: cảnh báo vận hành, tính thử phí và gửi biểu phí", async () => {
    let body: unknown;
    let zones: unknown[] = [];
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/shipping/settings`, () => HttpResponse.json(SETTINGS)),
      http.get(`${ORIGIN}/api/v1/admin/shipping/zones`, () => HttpResponse.json(zones)),
      http.post(`${ORIGIN}/api/v1/admin/shipping/zones`, async ({ request }) => {
        body = await request.json();
        zones = [NORTH];
        return HttpResponse.json(NORTH, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<ShippingManager />);

    await user.click(await screen.findByRole("button", { name: "Thêm vùng" }));
    expect(screen.getByRole("note")).toHaveTextContent("ngay khi tạo vùng đầu tiên");
    // Ví dụ trong docs: 1.900 g với biểu phí mặc định của form là 30.000 ₫.
    expect(screen.getByText("Phí minh họa: 30.000 ₫")).toBeVisible();

    await user.type(screen.getByLabelText("Tên vùng"), "Miền Bắc");
    await user.click(screen.getByLabelText("Hà Nội"));
    await user.click(screen.getByLabelText("Hải Phòng"));
    expect(screen.getByText("Đã chọn 2")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tạo vùng" }));

    expect(await screen.findByRole("list", { name: "Danh sách vùng giao hàng" })).toBeVisible();
    expect(body).toEqual({
      name: "Miền Bắc",
      isActive: true,
      sortOrder: 0,
      provinces: ["Hà Nội", "Hải Phòng"],
      baseWeightGram: 1000,
      baseFee: 20000,
      stepWeightGram: 500,
      stepFee: 5000,
      etaMinDays: 2,
      etaMaxDays: 4,
    });
  });

  it("khóa tỉnh đã thuộc vùng khác và yêu cầu chọn ít nhất một tỉnh", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/shipping/settings`, () => HttpResponse.json(SETTINGS)),
      http.get(`${ORIGIN}/api/v1/admin/shipping/zones`, () => HttpResponse.json([NORTH])),
    );
    const user = userEvent.setup();
    renderWithQuery(<ShippingManager />);

    await user.click(await screen.findByRole("button", { name: "Thêm vùng" }));
    expect(screen.getByLabelText(/^Hà Nội/)).toBeDisabled();
    expect(screen.getAllByText("Thuộc vùng “Miền Bắc”")).toHaveLength(2);
    expect(screen.getByLabelText("Đà Nẵng")).toBeEnabled();

    await user.type(screen.getByLabelText("Tên vùng"), "Miền Trung");
    await user.click(screen.getByRole("button", { name: "Tạo vùng" }));
    expect(await screen.findByText("Chọn ít nhất một tỉnh/thành.")).toBeVisible();
  });

  it("sửa vùng giữ tỉnh cũ và báo tỉnh trùng của backend", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/shipping/settings`, () => HttpResponse.json(SETTINGS)),
      http.get(`${ORIGIN}/api/v1/admin/shipping/zones`, () => HttpResponse.json([NORTH])),
      http.put(`${ORIGIN}/api/v1/admin/shipping/zones/1`, () =>
        HttpResponse.json(
          { status: 409, code: "SHIPPING_PROVINCE_DUPLICATE", title: "x", traceId: "t" },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<ShippingManager />);

    await user.click(await screen.findByRole("button", { name: "Sửa vùng Miền Bắc" }));
    expect(screen.getByLabelText("Tên vùng")).toHaveValue("Miền Bắc");
    expect(screen.getByLabelText("Hà Nội")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Lưu vùng" }));
    expect(
      await screen.findByText("Có tỉnh đã thuộc vùng giao hàng khác. Mỗi tỉnh chỉ nằm trong một vùng."),
    ).toBeVisible();
  });

  it("xóa vùng sau khi xác nhận", async () => {
    let deleted = false;
    let zones = [NORTH];
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/shipping/settings`, () => HttpResponse.json(SETTINGS)),
      http.get(`${ORIGIN}/api/v1/admin/shipping/zones`, () => HttpResponse.json(zones)),
      http.delete(`${ORIGIN}/api/v1/admin/shipping/zones/1`, () => {
        deleted = true;
        zones = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<ShippingManager />);

    const list = await screen.findByRole("list", { name: "Danh sách vùng giao hàng" });
    await user.click(within(list).getByRole("button", { name: "Xóa" }));
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(await screen.findByText(/Chưa có vùng nào/)).toBeVisible();
    expect(deleted).toBe(true);
  });
});
