import { expect, test } from "@playwright/test";

// Dữ liệu sách lấy từ backend tại API_BASE_URL nên test không giả định có cuốn sách cụ thể nào.
test("searches books and opens a quick view when results exist", async ({ page }, testInfo) => {
  await page.goto("/sach");
  await expect(page.getByRole("heading", { name: "Tủ sách pháp luật." })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("catalog.png"), fullPage: true });
  await page.getByLabel("Tìm theo tên sách hoặc ISBN").fill("Dân sự");
  await page.getByRole("button", { name: "Tìm sách", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kết quả cho “Dân sự”" })).toBeVisible();

  const quickView = page.getByRole("button", { name: /^Xem nhanh / }).first();
  if (await quickView.count()) {
    await quickView.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Đóng thông tin sách" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "Chưa tìm thấy sách phù hợp" })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("navigates to login and validates fields", async ({ page }, testInfo) => {
  await page.goto("/sach");
  await page.getByRole("link", { name: "Đăng nhập" }).click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText("Anh/chị vui lòng nhập email hợp lệ.")).toBeVisible();
  await page.getByLabel(/Địa chỉ email/).fill("demo@example.com");
  await page.getByLabel(/^Mật khẩu/).fill("test-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("sau khi kết nối backend");
  await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
