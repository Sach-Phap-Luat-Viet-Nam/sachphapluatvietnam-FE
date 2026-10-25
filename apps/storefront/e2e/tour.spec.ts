import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const IMAGE_URL = "https://res.cloudinary.com/demo/image/upload/v1/sachluat/popups/tour.png";
const IMAGE_FILE = fileURLToPath(new URL("../src/app/icon.png", import.meta.url));

// Thiết bị mới: không có dấu đã xem hướng dẫn (playwright.config.ts mặc định đã đặt dấu này).
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/popups/active", (route) => route.fulfill({ status: 204 }));
});

test("walks a new device through the tour and does not show it again", async ({ page }, testInfo) => {
  await page.goto("/");
  const tour = page.getByRole("dialog", { name: "Chào mừng bạn đến Sách Luật Việt Nam" });
  await expect(tour).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("tour-welcome.png") });

  // Số bước phụ thuộc dữ liệu backend (không có ưu đãi thì bỏ bước ưu đãi) nên đọc tổng từ bộ đếm "1/12".
  const total = Number((await tour.getByText(/^1\/\d+$/).textContent())?.split("/")[1]);
  await tour.getByRole("button", { name: "Bắt đầu" }).click();
  const step = page.getByRole("dialog");
  await expect(step).toContainText(`2/${total}`);
  await page.screenshot({ path: testInfo.outputPath("tour-step.png") });

  // Đợi bộ đếm đổi sau mỗi lần bấm để không bấm vào nút đang được vẽ lại.
  for (let current = 2; current < total; current += 1) {
    await step.getByRole("button", { name: "Tiếp" }).click();
    await expect(step).toContainText(`${current + 1}/${total}`);
  }
  await expect(step).toContainText("Vậy là xong!");
  await step.getByRole("button", { name: "Hoàn tất" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("skips the tour, then replays it from the footer", async ({ page }) => {
  await page.goto("/");
  const welcome = page.getByRole("dialog", { name: "Chào mừng bạn đến Sách Luật Việt Nam" });
  await welcome.getByRole("button", { name: "Bỏ qua", exact: true }).click();
  await expect(welcome).toBeHidden();

  await page.goto("/sach");
  await page.getByRole("button", { name: "Xem hướng dẫn sử dụng" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(welcome).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(welcome).toBeHidden();
});

test("shows the promo popup only after the tour ends", async ({ page }) => {
  await page.route("**/api/v1/popups/active", (route) =>
    route.fulfill({
      json: {
        id: 7,
        title: "Ưu đãi sau hướng dẫn",
        imageUrl: IMAGE_URL,
        linkUrl: null,
        displayFrequency: "every_visit",
        updatedAt: "2026-11-01T02:00:00Z",
      },
    }),
  );
  await page.route(IMAGE_URL, (route) => route.fulfill({ path: IMAGE_FILE }));

  await page.goto("/");
  const welcome = page.getByRole("dialog", { name: "Chào mừng bạn đến Sách Luật Việt Nam" });
  await expect(welcome).toBeVisible();
  const popup = page.getByRole("dialog", { name: "Ưu đãi sau hướng dẫn" });
  await expect(popup).toBeHidden();

  await welcome.getByRole("button", { name: "Bỏ qua", exact: true }).click();
  await expect(popup).toBeVisible();
});
