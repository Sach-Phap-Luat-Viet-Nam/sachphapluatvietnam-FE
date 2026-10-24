import { DISPLAY_FREQUENCIES } from "./labels";
import type { DisplayFrequency } from "./labels";
import type { AdminPopup, PopupFormValues } from "./schemas";

// Việt Nam không đổi giờ theo mùa: luôn UTC+7. Ô `datetime-local` nhập theo giờ Việt Nam, backend nhận kèm offset
// và trả về UTC.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const VN_OFFSET = "+07:00";

/** Thời điểm UTC từ backend → giá trị ô `datetime-local` theo giờ Việt Nam. */
export function toVnDateTimeInput(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "" : new Date(time + VN_OFFSET_MS).toISOString().slice(0, 16);
}

/** Giá trị ô `datetime-local` (giờ Việt Nam) → chuỗi kèm offset gửi backend: `2026-11-01T08:30:00+07:00`. */
export function fromVnDateTimeInput(value: string): string {
  return `${value}:00${VN_OFFSET}`;
}

/** Popup mới: bắt đầu từ đầu giờ kế tiếp (giờ Việt Nam), đang bật, hiện một lần mỗi ngày. */
export function emptyPopupForm(now: Date = new Date()): PopupFormValues {
  const nextHour = new Date(Math.ceil(now.getTime() / 3_600_000) * 3_600_000);
  return {
    title: "",
    imageUrl: "",
    linkUrl: "",
    startsAt: toVnDateTimeInput(nextHour.toISOString()),
    endsAt: "",
    isActive: true,
    priority: "0",
    displayFrequency: "once_per_day",
  };
}

function frequencyOf(value: string): DisplayFrequency {
  return DISPLAY_FREQUENCIES.find((item) => item === value) ?? "once_per_day";
}

export function popupToFormValues(popup: AdminPopup): PopupFormValues {
  return {
    title: popup.title,
    imageUrl: popup.imageUrl,
    linkUrl: popup.linkUrl ?? "",
    startsAt: toVnDateTimeInput(popup.startsAt),
    endsAt: toVnDateTimeInput(popup.endsAt),
    isActive: popup.isActive,
    priority: String(popup.priority),
    displayFrequency: frequencyOf(popup.displayFrequency),
  };
}

/** Body `UpsertPopupRequest`. */
export function toPopupBody(values: PopupFormValues) {
  const linkUrl = values.linkUrl.trim();
  return {
    title: values.title.trim(),
    imageUrl: values.imageUrl.trim(),
    linkUrl: linkUrl === "" ? null : linkUrl,
    startsAt: fromVnDateTimeInput(values.startsAt),
    endsAt: values.endsAt === "" ? null : fromVnDateTimeInput(values.endsAt),
    isActive: values.isActive,
    priority: Number(values.priority),
    displayFrequency: values.displayFrequency,
  };
}
export type PopupBody = ReturnType<typeof toPopupBody>;
