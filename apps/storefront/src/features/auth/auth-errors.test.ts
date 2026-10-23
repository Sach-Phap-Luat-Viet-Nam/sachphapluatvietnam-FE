import { ApiError } from "@slvn/api-client";
import { authErrorMessage, fieldErrors } from "./auth-errors";

describe("authErrorMessage", () => {
  it("dùng câu chữ riêng cho mã lỗi đăng nhập", () => {
    const error = new ApiError({ status: 401, code: "INVALID_CREDENTIALS", title: "Invalid credentials" });
    expect(authErrorMessage(error)).toBe("Email hoặc mật khẩu không đúng.");
  });

  it("dùng title của backend với mã lỗi khác", () => {
    const error = new ApiError({ status: 429, code: "TOO_MANY_REQUESTS", title: "Bạn thao tác quá nhanh." });
    expect(authErrorMessage(error)).toBe("Bạn thao tác quá nhanh.");
  });

  it("kèm mã tra cứu với lỗi 5xx", () => {
    const error = new ApiError({ status: 500, code: "INTERNAL_ERROR", title: "Đã có lỗi xảy ra.", traceId: "00-abc" });
    expect(authErrorMessage(error)).toBe("Đã có lỗi xảy ra. Mã tra cứu: 00-abc");
  });

  it("báo lỗi mạng khi fetch thất bại", () => {
    expect(authErrorMessage(new TypeError("Failed to fetch"))).toContain("Không kết nối được máy chủ");
  });
});

describe("fieldErrors", () => {
  it("chỉ lấy lỗi của field có trên form", () => {
    const error = new ApiError({
      status: 400,
      code: "VALIDATION_ERROR",
      title: "Dữ liệu chưa hợp lệ",
      errors: { email: ["Email không hợp lệ."], rememberMe: ["Sai kiểu."] },
    });
    expect(fieldErrors(error, ["email", "password"])).toEqual([{ field: "email", message: "Email không hợp lệ." }]);
  });

  it("trả rỗng với lỗi không phải ApiError", () => {
    expect(fieldErrors(new Error("x"), ["email"])).toEqual([]);
  });
});
