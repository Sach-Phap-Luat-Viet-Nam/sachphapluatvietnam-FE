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

test("navigates to login and validates fields", async ({ page }, testInfo) => {
  await page.goto("/sach");
  await page.getByRole("link", { name: "Đăng nhập" }).first().click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText("Anh/chị vui lòng nhập email hợp lệ.")).toBeVisible();
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("sau khi kết nối backend");
  await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true });
  expect(await page.evaluate(noHorizontalScroll)).toBe(true);
});
