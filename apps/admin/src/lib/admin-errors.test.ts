import { ApiError } from "@slvn/api-client";
import { adminErrorMessage, formFieldErrors } from "./admin-errors";

function apiError(code: string, status = 409, errors?: Record<string, string[]>) {
  return new ApiError({ status, code, title: `title ${code}`, errors, traceId: "00-trace" });
}

describe("adminErrorMessage", () => {
  it("dùng câu chữ theo code, mã lạ thì dùng title của backend", () => {
    expect(adminErrorMessage(apiError("SLUG_DUPLICATE"))).toMatch("Slug này đã được dùng");
    expect(adminErrorMessage(apiError("SOMETHING_NEW"))).toBe("title SOMETHING_NEW");
  });

  it("ưu tiên câu chữ truyền vào", () => {
    expect(adminErrorMessage(apiError("NOT_FOUND", 404), { NOT_FOUND: "Không có popup." })).toBe("Không có popup.");
  });

  it("lỗi 5xx kèm mã tra cứu", () => {
    expect(adminErrorMessage(apiError("INTERNAL_ERROR", 500))).toMatch("Mã tra cứu: 00-trace");
  });

  it("phân biệt lỗi mạng và lỗi không rõ", () => {
    expect(adminErrorMessage(new TypeError("Failed to fetch"))).toMatch("Không kết nối được máy chủ");
    expect(adminErrorMessage(new Error("x"))).toBe("Đã có lỗi xảy ra, vui lòng thử lại sau.");
  });
});

describe("formFieldErrors", () => {
  const fields = ["title", "slug", "isbn"] as const;

  it("map mã lỗi nghiệp vụ về field tương ứng", () => {
    expect(formFieldErrors(apiError("SLUG_DUPLICATE"), fields)).toEqual([
      { field: "slug", message: expect.stringContaining("Slug này đã được dùng") },
    ]);
  });

  it("lấy lỗi validation theo field form đang có", () => {
    const error = apiError("VALIDATION_ERROR", 400, { title: ["Bắt buộc"], other: ["Bỏ qua"] });
    expect(formFieldErrors(error, fields)).toEqual([{ field: "title", message: "Bắt buộc" }]);
  });

  it("không có field phù hợp thì trả mảng rỗng", () => {
    expect(formFieldErrors(apiError("SKU_CODE_DUPLICATE"), fields)).toEqual([]);
    expect(formFieldErrors(new Error("x"), fields)).toEqual([]);
  });
});
