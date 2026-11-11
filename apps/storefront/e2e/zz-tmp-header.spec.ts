import { expect, test } from "@playwright/test";

// Spec tạm để đo header, xóa sau khi chạy.
test("header buttons stay on one row", async ({ page }) => {
  await page.goto("/");
  const brand = await page.getByRole("link", { name: /Trang chủ/ }).first().boundingBox();
  const lookup = await page.getByRole("link", { name: "Tra cứu đơn hàng" }).first().boundingBox();
  const login = await page.locator('[data-tour="account"]').first().boundingBox();
  const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.warn(JSON.stringify({ brand, lookup, login, overflowX: width }));
  expect(Math.abs((lookup?.y ?? 0) + (lookup?.height ?? 0) / 2 - ((brand?.y ?? 0) + (brand?.height ?? 0) / 2))).toBeLessThan(20);
  expect(Math.abs((login?.y ?? 0) - (lookup?.y ?? 0))).toBeLessThan(20);
  expect(width).toBeLessThanOrEqual(0);
});
