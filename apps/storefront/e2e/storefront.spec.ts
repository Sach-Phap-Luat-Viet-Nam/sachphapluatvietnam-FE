import { expect, test } from "@playwright/test";

const noHorizontalScroll = () => document.documentElement.scrollWidth <= window.innerWidth;

test("home page shows the hero and links into the catalogue", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Đọc đúng luật/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Bìa sách / }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mới phát hành" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);
  await page.getByRole("link", { name: "Khám phá tủ sách" }).click();
  await expect(page).toHaveURL(/\/sach$/);
});

// Dữ liệu sách lấy từ backend tại API_BASE_URL nên test không giả định có cuốn sách cụ thể nào.
test("searches books and opens a quick view when results exist", async ({ page }, testInfo) => {
  await page.goto("/sach");
  await expect(page.getByRole("heading", { level: 1, name: "Tủ sách pháp luật" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("catalog.png"), fullPage: true });
  await page.getByLabel("Tìm theo tên sách hoặc ISBN").fill("Dân sự");
  await page.getByRole("button", { name: "Tìm", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kết quả cho “Dân sự”" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bỏ lọc “Dân sự”" })).toBeVisible();

  const quickView = page.getByRole("button", { name: /^Xem nhanh / }).first();
  if (await quickView.count()) {
    await quickView.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Đóng thông tin sách" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "Chưa tìm thấy sách phù hợp" })).toBeVisible();
  }
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);
});

// Giả lập backend để không phụ thuộc tài khoản thật và giới hạn 10 request/phút của `/auth/*`.
test("navigates to login, validates fields and signs in", async ({ page }, testInfo) => {
  let attempts = 0;
  await page.route("**/api/v1/auth/login", (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 401, json: { title: "Invalid", status: 401, code: "INVALID_CREDENTIALS" } })
      : route.fulfill({
          json: {
            requiresTwoFactor: false,
            twoFactorToken: null,
            session: {
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
          },
        });
  });

  await page.goto("/sach");
  await page.getByRole("link", { name: "Đăng nhập" }).first().click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText("Anh/chị vui lòng nhập email hợp lệ.")).toBeVisible();
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText("Email hoặc mật khẩu không đúng.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);

  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible();
  await expect(page.getByText("Khách Demo")).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Đăng nhập" })).toHaveCount(0);
});
