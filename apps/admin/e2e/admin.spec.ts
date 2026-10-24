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

test("blocks search engines", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");
});
