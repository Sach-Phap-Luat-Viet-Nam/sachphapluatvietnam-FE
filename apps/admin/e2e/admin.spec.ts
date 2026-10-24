import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const noHorizontalScroll = () => document.documentElement.scrollWidth <= window.innerWidth;

/** Giả lập phiên đã đăng nhập: có cờ phiên và `/auth/refresh` trả người dùng với vai trò cho trước. */
async function mockSession(page: Page, roles: string[], requiresTwoFactorSetup = false) {
  await page.addInitScript(() => localStorage.setItem("slvn:has-session", "1"));
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({
      json: {
        accessToken: "e2e-token",
        tokenType: "Bearer",
        expiresIn: 900,
        user: {
          id: 7,
          email: "kho@sachluat.vn",
          fullName: "Trần Thủ Kho",
          phoneNumber: null,
          birthDate: null,
          occupation: null,
          roles,
          twoFactorEnabled: !requiresTwoFactorSetup,
          requiresTwoFactorSetup,
        },
      },
    }),
  );
}

// Không cần backend: trình duyệt mới chưa có cờ phiên nên không gọi `/auth/refresh`.
test("redirects to the login page when not signed in", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dang-nhap$/);
  await expect(page.getByRole("heading", { level: 1, name: "Đăng nhập quản trị" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);
});

test("validates the login form before calling the backend", async ({ page }) => {
  await page.goto("/dang-nhap");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByText("Anh/chị vui lòng nhập email hợp lệ.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
});

test("shows the overview and the menu for the staff member's roles", async ({ page, isMobile }, testInfo) => {
  await mockSession(page, ["warehouse_keeper", "order_manager"]);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Xin chào, Trần Thủ Kho" })).toBeVisible();
  if (isMobile) {
    await page.getByRole("button", { name: "Mở menu" }).click();
  }
  const nav = page.getByRole("navigation", { name: "Quản trị" });
  await expect(nav).toContainText("Kho");
  await expect(nav).toContainText("Đơn hàng");
  await expect(nav).not.toContainText("Nhân viên");
  await page.screenshot({ path: testInfo.outputPath("overview.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);
});

test("sends staff without 2FA to the setup screen and shows the QR code", async ({ page }, testInfo) => {
  await mockSession(page, ["product_manager"], true);
  await page.route("**/api/v1/auth/2fa/setup", (route) =>
    route.fulfill({
      json: {
        sharedKey: "JBSWY3DPEHPK3PXP",
        authenticatorUri: "otpauth://totp/Sach%20Luat:kho%40sachluat.vn?secret=JBSWY3DPEHPK3PXP&issuer=Sach%20Luat",
      },
    }),
  );
  await page.goto("/");
  await expect(page).toHaveURL(/\/xac-thuc-hai-lop$/);
  await page.getByRole("button", { name: "Tạo mã QR" }).click();
  await expect(page.getByRole("img", { name: "Mã QR thêm tài khoản vào ứng dụng xác thực" })).toBeVisible();
  await expect(page.getByText("JBSW Y3DP EHPK 3PXP")).toBeVisible();
  await expect(page.getByLabel("Mã xác thực")).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("two-factor-setup.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);
});

test("order manager opens an order and moves it to the next status", async ({ page }, testInfo) => {
  await mockSession(page, ["order_manager"]);
  const order = {
    orderCode: "SLVN2610230001",
    status: "pending_confirm",
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    customerName: "Nguyễn Văn A",
    phone: "0901234567",
    email: null,
    shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
    items: [
      {
        skuId: 100,
        skuCode: "SLVN-BLDS-BM",
        bookTitle: "Bộ luật Dân sự 2026",
        editionName: "Tái bản lần 3",
        isbn: "9780306406157",
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
    createdAt: "2026-10-23T03:00:00Z",
    history: [{ fromStatus: null, toStatus: "pending_confirm", note: null, createdAt: "2026-10-23T03:00:00Z" }],
  };
  await page.route("**/api/v1/admin/orders?**", (route) =>
    route.fulfill({ json: { items: [{ ...order, itemCount: 2 }], meta: { page: 1, limit: 20, total: 1 } } }),
  );
  await page.route("**/api/v1/admin/orders/SLVN2610230001", (route) =>
    route.fulfill({ json: { order, userId: null, nextStatuses: ["confirmed", "cancelled"], costOfGoods: null } }),
  );
  await page.route("**/api/v1/admin/orders/SLVN2610230001/status", (route) =>
    route.fulfill({
      json: {
        order: { ...order, status: "confirmed" },
        userId: null,
        nextStatuses: ["packing", "cancelled"],
        costOfGoods: null,
      },
    }),
  );

  await page.goto("/don-hang");
  await page.getByRole("link", { name: "SLVN2610230001" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Đơn SLVN2610230001" })).toBeVisible();
  await page.getByRole("button", { name: "Chờ xử lý" }).click();
  await page.getByRole("button", { name: "Xác nhận: Chờ xử lý" }).click();
  await expect(page.getByText("Đã chuyển đơn sang “Chờ xử lý”.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("order-detail.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);
});

test("warehouse keeper sees receipts and the low-stock list", async ({ page }, testInfo) => {
  await mockSession(page, ["warehouse_keeper"]);
  await page.route("**/api/v1/admin/inventory/receipts?**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: 7,
            status: "draft",
            note: "Nhập lô tháng 10",
            createdBy: 7,
            createdAt: "2026-10-23T03:00:00Z",
            decidedBy: null,
            decidedAt: null,
            rejectReason: null,
            lines: [
              {
                id: 11,
                skuId: 100,
                skuCode: "SLVN-BLDS-BM",
                batchCode: "LO-2026-10",
                printerName: null,
                quantity: 500,
                unitCost: 45000,
                receivedAt: "2026-10-20",
                printBatchId: null,
              },
            ],
          },
        ],
        meta: { page: 1, limit: 20, total: 1 },
      },
    }),
  );
  await page.route("**/api/v1/admin/inventory/low-stock?**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            skuId: 100,
            skuCode: "SLVN-BLDS-BM",
            bookTitle: "Bộ luật Dân sự 2026",
            available: 12,
            reserved: 0,
            lowStockThreshold: 50,
          },
        ],
        meta: { page: 1, limit: 50, total: 1 },
      },
    }),
  );

  await page.goto("/kho");
  await expect(page.getByRole("link", { name: "Phiếu #7" })).toBeVisible();
  await expect(page.getByText("Chờ duyệt").last()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("receipts.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);

  await page.getByRole("link", { name: "Tồn thấp" }).click();
  await expect(page.getByRole("link", { name: "SLVN-BLDS-BM" })).toHaveAttribute("href", "/kho/the-kho/100");
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);
});

test("blocks search engines", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");
});
