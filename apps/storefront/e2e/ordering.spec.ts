import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const noHorizontalScroll = () => document.documentElement.scrollWidth <= window.innerWidth;

interface MockLine {
  skuId: number;
  quantity: number;
}

/**
 * Giả lập API giỏ hàng, phí ship và đặt hàng ở trình duyệt để không tạo giỏ/đơn thật trên backend dùng chung. Trang chi
 * tiết sách vẫn render từ backend tại `API_BASE_URL`.
 */
async function mockOrdering(page: Page) {
  const lines: MockLine[] = [];
  const cart = () => ({
    items: lines.map((line) => ({
      skuId: line.skuId,
      skuCode: `E2E-${line.skuId}`,
      bookTitle: "Sách thử nghiệm e2e",
      bookSlug: "sach-thu-nghiem-e2e",
      editionName: null,
      coverType: "paperback",
      coverImageUrl: null,
      quantity: line.quantity,
      unitPrice: 150000,
      listPrice: 150000,
      lineTotal: line.quantity * 150000,
      isLatestEdition: true,
      isSellable: true,
      availableQuantity: 20,
    })),
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce((sum, line) => sum + line.quantity * 150000, 0),
  });

  await page.route("**/api/v1/cart", (route) => route.fulfill({ json: cart() }));
  await page.route("**/api/v1/cart/items", async (route) => {
    const body: unknown = route.request().postDataJSON();
    if (body && typeof body === "object" && "skuId" in body && "quantity" in body) {
      const skuId = Number(body.skuId);
      const existing = lines.find((line) => line.skuId === skuId);
      if (existing) existing.quantity += Number(body.quantity);
      else lines.push({ skuId, quantity: Number(body.quantity) });
    }
    await route.fulfill({ json: cart() });
  });
  await page.route("**/api/v1/shipping/quote", (route) =>
    route.fulfill({ json: { shippingFee: 30000, freeShippingThreshold: 300000 } }),
  );
  await page.route("**/api/v1/orders", (route) =>
    route.fulfill({
      status: 201,
      json: {
        orderCode: "SLVN2610240001",
        status: "pending_confirm",
        paymentMethod: "cod",
        paymentStatus: "unpaid",
        customerName: "Khách Demo",
        phone: "0901234567",
        email: null,
        shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
        items: [],
        subtotal: 150000,
        discount: 0,
        shippingFee: 30000,
        total: 180000,
        invoiceRequired: false,
        invoiceInfo: null,
        note: null,
        paymentExpiresAt: null,
        canCancel: true,
        createdAt: "2026-10-24T03:00:00Z",
        history: [{ fromStatus: null, toStatus: "pending_confirm", note: null, createdAt: "2026-10-24T03:00:00Z" }],
      },
    }),
  );
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/popups/active", (route) => route.fulfill({ status: 204 }));
});

// Dữ liệu sách lấy từ backend nên bỏ qua khi tủ sách trống hoặc cuốn đầu tiên chưa mua được.
test("opens a book, adds it to the cart and places a COD order", async ({ page }, testInfo) => {
  await mockOrdering(page);
  await page.goto("/sach");
  const quickView = page.getByRole("button", { name: /^Xem nhanh / }).first();
  test.skip((await quickView.count()) === 0, "Backend chưa có sách");

  await quickView.click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /^Xem chi tiết/ })
    .click();
  // `next dev` biên dịch route chi tiết ở lần mở đầu tiên, có thể lâu hơn 5 giây mặc định.
  await expect(page).toHaveURL(/\/sach\/[^/?]+/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thông tin xuất bản" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("book-detail.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);

  const addButton = page.getByRole("button", { name: "Thêm vào giỏ" });
  test.skip((await addButton.count()) === 0, "Cuốn đầu tiên chưa mua được");
  await addButton.click();
  await expect(page.getByRole("status")).toHaveText(/Đã thêm 1 cuốn vào giỏ/);
  await expect(page.getByRole("link", { name: "Giỏ hàng, 1 cuốn" })).toBeVisible();

  await page.getByRole("link", { name: "Xem giỏ hàng" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Giỏ sách" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sách thử nghiệm e2e" })).toBeVisible();
  await expect(page.getByText("Mua thêm 150.000 ₫ để được miễn phí vận chuyển", { exact: false })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("cart.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);

  await page.getByRole("link", { name: "Đặt hàng" }).click();
  await expect(page).toHaveURL(/\/thanh-toan$/);
  await page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(page.getByText("Vui lòng nhập họ tên người nhận.")).toBeVisible();
  await page.getByLabel("Họ và tên").fill("Khách Demo");
  await page.getByLabel("Số điện thoại").fill("0901234567");
  await page.getByLabel("Tỉnh/Thành phố").fill("Hà Nội");
  await page.getByLabel("Phường/Xã").fill("Phường Cầu Giấy");
  await page.getByLabel("Số nhà, tên đường").fill("1 Xuân Thủy");
  await page.screenshot({ path: testInfo.outputPath("checkout.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);

  await page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(page.getByRole("heading", { name: "Cảm ơn bạn đã đặt sách" })).toBeVisible();
  await expect(page.getByText("SLVN2610240001").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Giỏ hàng" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("order-placed.png"), fullPage: true });
});

test("looks up an order by code and phone", async ({ page }) => {
  await page.route("**/api/v1/orders/lookup", (route) =>
    route.fulfill({ status: 404, json: { title: "Not found", status: 404, code: "NOT_FOUND" } }),
  );
  await page.goto("/don-hang/tra-cuu?ma=SLVN2610240001");
  await expect(page.getByLabel("Mã đơn hàng")).toHaveValue("SLVN2610240001");
  await page.getByLabel("Số điện thoại đặt hàng").fill("0901234567");
  await page.getByRole("button", { name: "Tra cứu" }).click();
  // Không dùng getByRole("alert"): Next.js có sẵn `__next-route-announcer__` cũng mang role này.
  await expect(page.getByText(/^Không tìm thấy đơn hàng\./)).toBeVisible();
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);
});

function memberOrder(overrides: Record<string, unknown> = {}) {
  return {
    orderCode: "SLVN2610240002",
    status: "pending_confirm",
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    customerName: "Khách Demo",
    phone: "0901234567",
    email: null,
    shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
    items: [
      {
        skuId: 5,
        skuCode: "E2E-5",
        bookTitle: "Sách thử nghiệm e2e",
        editionName: null,
        isbn: "9786049902444",
        coverType: "paperback",
        unitPrice: 150000,
        quantity: 2,
        lineTotal: 300000,
      },
    ],
    subtotal: 300000,
    discount: 0,
    shippingFee: 0,
    total: 300000,
    invoiceRequired: false,
    invoiceInfo: null,
    note: null,
    paymentExpiresAt: null,
    canCancel: true,
    createdAt: "2026-10-24T03:00:00Z",
    history: [{ fromStatus: null, toStatus: "pending_confirm", note: null, createdAt: "2026-10-24T03:00:00Z" }],
    ...overrides,
  };
}

// Giả lập phiên đăng nhập (cờ `slvn:has-session` + `/auth/refresh`) và API đơn để không cần tài khoản thật.
test("lets a member open an order from their account and cancel it", async ({ page }, testInfo) => {
  let cancelled = false;
  await page.addInitScript(() => localStorage.setItem("slvn:has-session", "1"));
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({
      json: {
        accessToken: "e2e-token",
        tokenType: "Bearer",
        expiresIn: 900,
        user: {
          id: 1,
          email: "demo@example.com",
          fullName: "Khách Demo",
          roles: ["customer"],
          requiresTwoFactorSetup: false,
        },
      },
    }),
  );
  await page.route("**/api/v1/cart", (route) => route.fulfill({ json: { items: [], totalQuantity: 0, subtotal: 0 } }));
  await page.route("**/api/v1/orders?*", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            orderCode: "SLVN2610240002",
            status: cancelled ? "cancelled" : "pending_confirm",
            paymentMethod: "cod",
            paymentStatus: "unpaid",
            customerName: "Khách Demo",
            phone: "0901234567",
            itemCount: 2,
            total: 300000,
            createdAt: "2026-10-24T03:00:00Z",
          },
        ],
        meta: { page: 1, limit: 10, total: 1 },
      },
    }),
  );
  await page.route("**/api/v1/orders/SLVN2610240002", (route) =>
    route.fulfill({ json: cancelled ? memberOrder({ status: "cancelled", canCancel: false }) : memberOrder() }),
  );
  await page.route("**/api/v1/orders/SLVN2610240002/cancel", (route) => {
    cancelled = true;
    return route.fulfill({ json: memberOrder({ status: "cancelled", canCancel: false }) });
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Đơn của tôi" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Đơn của tôi" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("my-orders.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);

  await page.getByRole("link", { name: /SLVN2610240002/ }).click();
  await expect(page).toHaveURL(/\/don-hang\/SLVN2610240002$/);
  await expect(page.getByRole("heading", { level: 1, name: "Đơn hàng SLVN2610240002" })).toBeVisible();
  await page.getByRole("button", { name: "Hủy đơn hàng" }).click();
  await page.getByLabel("Lý do hủy (không bắt buộc)").fill("Đặt nhầm");
  await page.screenshot({ path: testInfo.outputPath("cancel-dialog.png") });
  await page.getByRole("button", { name: "Xác nhận hủy đơn" }).click();
  await expect(page.getByText("Đã hủy đơn hàng.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Hủy đơn hàng" })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("my-order.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);
});
