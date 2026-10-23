import { ApiError, isApiError } from "./api-error";

const response = (status: number) => new Response(null, { status });

describe("ApiError.fromResponse", () => {
  it("giữ lỗi validation theo field", () => {
    const error = ApiError.fromResponse(response(400), {
      title: "Dữ liệu không hợp lệ",
      status: 400,
      code: "VALIDATION_ERROR",
      errors: { email: ["Email không hợp lệ"] },
      traceId: "00-1",
    });

    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.errors).toEqual({ email: ["Email không hợp lệ"] });
  });

  it.each([
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [429, "TOO_MANY_REQUESTS"],
    [502, "INTERNAL_ERROR"],
  ])("dùng mã chung theo HTTP %i khi body không phải ProblemDetails", (status, code) => {
    const error = ApiError.fromResponse(response(status), "<html>Bad Gateway</html>");

    expect(error.code).toBe(code);
    expect(error.traceId).toBeNull();
  });

  it("dùng câu tiếng Việt của FE cho lỗi chung thay vì title tiếng Anh của backend", () => {
    const error = ApiError.fromResponse(response(400), {
      title: "One or more validation errors occurred.",
      code: "VALIDATION_ERROR",
    });

    expect(error.title).toBe("Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.");
  });

  it("giữ title tiếng Việt của lỗi nghiệp vụ", () => {
    const error = ApiError.fromResponse(response(422), { title: "Giỏ hàng đang trống", code: "CART_EMPTY" });

    expect(error).toMatchObject({ code: "CART_EMPTY", title: "Giỏ hàng đang trống" });
  });

  it("không hiện title của lỗi 5xx cho người dùng nhưng giữ traceId", () => {
    const error = ApiError.fromResponse(response(500), {
      title: "NullReferenceException at OrderService",
      code: "INTERNAL_ERROR",
      traceId: "00-trace",
    });

    expect(error.title).not.toContain("NullReferenceException");
    expect(error.traceId).toBe("00-trace");
  });
});

describe("isApiError", () => {
  it("phân biệt ApiError với lỗi khác", () => {
    expect(isApiError(new ApiError({ status: 404, code: "NOT_FOUND", title: "Không tìm thấy" }))).toBe(true);
    expect(isApiError(new Error("x"))).toBe(false);
  });
});
