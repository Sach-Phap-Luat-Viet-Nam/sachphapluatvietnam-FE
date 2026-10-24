import { z } from "zod";
import { DISPLAY_FREQUENCIES } from "./labels";

// `/admin/popups` chưa có trong OpenAPI (khai báo ở packages/api-client/src/pending-paths.ts): parse theo
// docs/features/popup.md.

export const adminPopupSchema = z.object({
  id: z.number(),
  title: z.string(),
  imageUrl: z.string(),
  linkUrl: z.string().nullable(),
  /** UTC (`...Z`). */
  startsAt: z.string(),
  /** UTC; `null` = chạy đến khi tắt. */
  endsAt: z.string().nullable(),
  isActive: z.boolean(),
  priority: z.number(),
  displayFrequency: z.string(),
  /** `inactive`, `scheduled`, `running`, `ended`: backend tính lúc trả về. */
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminPopup = z.infer<typeof adminPopupSchema>;

export const popupPageSchema = z.object({
  items: z.array(adminPopupSchema),
  meta: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
});
export type PopupPage = z.infer<typeof popupPageSchema>;

/**
 * Link an toàn để Storefront gán thẳng vào `href`: đường dẫn trong site (`/khuyen-mai`) hoặc URL `http`/`https`.
 * Chặn `javascript:`, `data:`, `//host`, `/\host` giống backend.
 */
export function isSafeLinkUrl(value: string): boolean {
  const link = value.trim();
  if (link.startsWith("/")) {
    return !link.startsWith("//") && !link.startsWith("/\\");
  }
  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Giá trị của `<input type="datetime-local">`: `2026-11-01T08:30`. */
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const popupFormSchema = z
  .object({
    title: z.string().trim().min(1, "Anh/chị nhập tiêu đề.").max(255, "Tối đa 255 ký tự."),
    imageUrl: z
      .string()
      .trim()
      .min(1, "Anh/chị chọn ảnh hoặc dán link ảnh.")
      .max(500, "Link ảnh tối đa 500 ký tự.")
      .refine((value) => /^https?:\/\//.test(value), "Link ảnh phải bắt đầu bằng http:// hoặc https://."),
    linkUrl: z
      .string()
      .trim()
      .max(500, "Tối đa 500 ký tự.")
      .refine(
        (value) => value === "" || isSafeLinkUrl(value),
        "Nhập đường dẫn trong site (bắt đầu bằng /) hoặc link http/https.",
      ),
    startsAt: z
      .string()
      .regex(DATE_TIME_PATTERN, "Nhập thời điểm bắt đầu dạng dd/mm/yyyy hh:mm, ví dụ 01/11/2026 08:00."),
    endsAt: z
      .string()
      .refine(
        (value) => value === "" || DATE_TIME_PATTERN.test(value),
        "Nhập thời điểm kết thúc dạng dd/mm/yyyy hh:mm, ví dụ 30/11/2026 23:59.",
      ),
    isActive: z.boolean(),
    priority: z
      .string()
      .trim()
      .regex(/^\d{1,4}$/, "Nhập số nguyên từ 0 đến 1000.")
      .refine((value) => Number(value) <= 1000, "Nhập số nguyên từ 0 đến 1000."),
    displayFrequency: z.enum(DISPLAY_FREQUENCIES),
  })
  .superRefine((values, ctx) => {
    // Cùng định dạng `YYYY-MM-DDTHH:mm` nên so sánh chuỗi là so sánh thời gian.
    if (values.endsAt !== "" && values.endsAt <= values.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Thời điểm kết thúc phải sau thời điểm bắt đầu." });
    }
  });
export type PopupFormValues = z.infer<typeof popupFormSchema>;
