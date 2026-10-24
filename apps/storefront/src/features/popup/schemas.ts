import { z } from "zod";

// `PopupResponse` theo docs/features/popup.md; OpenAPI trong repo chưa có route này nên parse bằng Zod.
export const popupSchema = z.object({
  id: z.number(),
  title: z.string(),
  imageUrl: z.string(),
  linkUrl: z.string().nullable(),
  displayFrequency: z.enum(["every_visit", "once_per_session", "once_per_day"]),
  updatedAt: z.string(),
});
export type Popup = z.infer<typeof popupSchema>;
