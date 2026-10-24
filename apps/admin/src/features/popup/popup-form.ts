import { fromVnDateTimeInput, toVnDateTimeInput } from "@/lib/vn-datetime";
import { DISPLAY_FREQUENCIES } from "./labels";
import type { DisplayFrequency } from "./labels";
import type { AdminPopup, PopupFormValues } from "./schemas";

export { fromVnDateTimeInput, toVnDateTimeInput };

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
    // Tiêu đề nhập trong ô nhiều dòng nhưng là mô tả ảnh một dòng: xuống dòng đổi thành khoảng trắng.
    title: values.title.replace(/\s*\n\s*/g, " ").trim(),
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
