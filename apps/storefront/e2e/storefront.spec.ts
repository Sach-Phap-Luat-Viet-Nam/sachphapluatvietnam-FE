import { expect, test } from "@playwright/test";

test("finds books and opens a preview", async ({ page }) => {
  await page.goto("/sach");
  await expect(page.getByRole("heading", { name: "Tủ sách pháp luật." })).toBeVisible();
  await page.getByLabel("Tìm theo tên sách hoặc ISBN").fill("Dân sự");
  await page.getByRole("button", { name: "Tìm sách", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kết quả cho “Dân sự”" })).toBeVisible();
  await page.getByRole("button", { name: "Xem nhanh Bộ luật Dân sự", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Đóng thông tin sách" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("navigates to login and validates fields", async ({ page }) => {
  await page.goto("/sach");
  await page.getByRole("link", { name: "Đăng nhập" }).click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText("Anh/chị vui lòng nhập email hợp lệ.")).toBeVisible();
  await page.getByLabel(/Địa chỉ email/).fill("demo@example.com");
  await page.getByLabel(/^Mật khẩu/).fill("test-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("sau khi kết nối backend");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
