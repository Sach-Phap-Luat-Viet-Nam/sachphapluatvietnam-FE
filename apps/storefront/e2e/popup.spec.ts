import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const IMAGE_URL = "https://res.cloudinary.com/demo/image/upload/v1/sachluat/popups/e2e.png";
const IMAGE_FILE = fileURLToPath(new URL("../src/app/icon.png", import.meta.url));

/** Giả lập popup đang chạy; ảnh lấy từ icon của app để không phụ thuộc Cloudinary. */
async function mockPopup(page: Page, displayFrequency: string, linkUrl: string | null = "/sach") {
  await page.route("**/api/v1/popups/active", (route) =>
    route.fulfill({
      json: {
        id: 9,
        title: "Sale sách luật mùa thi",
        imageUrl: IMAGE_URL,
        linkUrl,
        displayFrequency,
        updatedAt: "2026-11-01T02:00:00Z",
      },
    }),
  );
  await page.route(IMAGE_URL, (route) => route.fulfill({ path: IMAGE_FILE }));
}

test("shows the running popup, follows its link and closes", async ({ page }, testInfo) => {
  await mockPopup(page, "every_visit");
  await page.goto("/");

  const dialog = page.getByRole("dialog", { name: "Sale sách luật mùa thi" });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("popup.png") });

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Sale sách luật mùa thi" }).click();
  await expect(page).toHaveURL(/\/sach$/);
  await expect(dialog).toBeHidden();
});

test("shows a once-per-session popup only once", async ({ page }) => {
  await mockPopup(page, "once_per_session");
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Sale sách luật mùa thi" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng quảng cáo" }).click();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Đợi request popup xong rồi mới kết luận popup không hiện.
  await page.waitForLoadState("networkidle");
  await expect(dialog).toBeHidden();
});
