import { emptyPopupForm, fromVnDateTimeInput, popupToFormValues, toPopupBody, toVnDateTimeInput } from "./popup-form";
import { isSafeLinkUrl, popupFormSchema } from "./schemas";
import type { AdminPopup } from "./schemas";

const POPUP: AdminPopup = {
  id: 5,
  title: "Sale sách luật mùa thi",
  imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/sachluat/popups/mua-thi.jpg",
  linkUrl: "/khuyen-mai",
  startsAt: "2026-10-31T17:00:00Z",
  endsAt: "2026-11-30T16:59:00Z",
  isActive: true,
  priority: 10,
  displayFrequency: "once_per_day",
  status: "scheduled",
  createdAt: "2026-10-24T03:00:00Z",
  updatedAt: "2026-10-24T03:00:00Z",
};

describe("giờ Việt Nam", () => {
  it("đổi UTC sang ô datetime-local theo giờ Việt Nam", () => {
    expect(toVnDateTimeInput("2026-10-31T17:00:00Z")).toBe("2026-11-01T00:00");
    expect(toVnDateTimeInput(null)).toBe("");
    expect(toVnDateTimeInput("không phải ngày")).toBe("");
  });

  it("gửi kèm offset +07:00", () => {
    expect(fromVnDateTimeInput("2026-11-01T00:00")).toBe("2026-11-01T00:00:00+07:00");
  });

  it("popup mới bắt đầu từ đầu giờ kế tiếp", () => {
    // 10:20 giờ Việt Nam → 11:00.
    expect(emptyPopupForm(new Date("2026-11-01T03:20:00Z")).startsAt).toBe("2026-11-01T11:00");
  });
});

describe("form popup", () => {
  it("đi qua form vẫn giữ đúng thời điểm", () => {
    expect(toPopupBody(popupToFormValues(POPUP))).toEqual({
      title: "Sale sách luật mùa thi",
      imageUrl: POPUP.imageUrl,
      linkUrl: "/khuyen-mai",
      startsAt: "2026-11-01T00:00:00+07:00",
      endsAt: "2026-11-30T23:59:00+07:00",
      isActive: true,
      priority: 10,
      displayFrequency: "once_per_day",
    });
  });

  it("link và thời điểm kết thúc để trống gửi null", () => {
    const body = toPopupBody({ ...popupToFormValues(POPUP), linkUrl: "  ", endsAt: "" });
    expect(body.linkUrl).toBeNull();
    expect(body.endsAt).toBeNull();
  });

  it("thời điểm kết thúc phải sau bắt đầu", () => {
    const result = popupFormSchema.safeParse({ ...popupToFormValues(POPUP), endsAt: "2026-11-01T00:00" });
    expect(result.error?.issues).toMatchObject([{ path: ["endsAt"] }]);
  });

  it("ưu tiên trong khoảng 0–1000", () => {
    expect(popupFormSchema.safeParse({ ...popupToFormValues(POPUP), priority: "1001" }).success).toBe(false);
    expect(popupFormSchema.safeParse({ ...popupToFormValues(POPUP), priority: "1000" }).success).toBe(true);
  });
});

describe("isSafeLinkUrl", () => {
  it.each(["/khuyen-mai", "/sach?q=dan-su#top", "https://zalo.me/sachluat", "http://example.com"])("nhận %s", (url) => {
    expect(isSafeLinkUrl(url)).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "//evil.com", "/\\evil.com", "khuyen-mai", "ftp://x.com"])(
    "chặn %s",
    (url) => {
      expect(isSafeLinkUrl(url)).toBe(false);
    },
  );
});
