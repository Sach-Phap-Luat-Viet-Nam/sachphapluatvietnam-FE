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
  await expect(page).toHaveURL(/\/sach\/[^/?]+/);
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
