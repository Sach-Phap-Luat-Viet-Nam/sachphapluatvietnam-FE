import { z } from "zod";

/** Mã lỗi chung: `title` của backend có thể là tiếng Anh nên FE dùng câu chữ riêng (docs/api_reference.md). */
const GENERIC_ERROR_MESSAGES = {
  VALIDATION_ERROR: "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy nội dung yêu cầu.",
  METHOD_NOT_ALLOWED: "Thao tác không được hỗ trợ.",
  TOO_MANY_REQUESTS: "Bạn thao tác quá nhanh, vui lòng thử lại sau.",
  INTERNAL_ERROR: "Đã có lỗi xảy ra, vui lòng thử lại sau.",
} as const;

/** Mã lỗi nghiệp vụ backend trả về trong `code` (bảng mã lỗi ở docs/api_reference.md). */
export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "TOO_MANY_REQUESTS",
  "INTERNAL_ERROR",
  "CONFLICT",
  "INVALID_CREDENTIALS",
  "ACCOUNT_LOCKED",
  "EMAIL_TAKEN",
  "INVALID_REFRESH_TOKEN",
  "TWO_FACTOR_TOKEN_INVALID",
  "OTP_INVALID",
  "TWO_FACTOR_ALREADY_ENABLED",
  "USER_NOT_FOUND",
  "ROLE_INVALID",
  "CANNOT_MANAGE_USER",
  "CANNOT_IMPERSONATE",
  "ACCOUNT_DISABLED",
  "SUPER_ADMIN_PORTAL_FORBIDDEN",
  "IDENTITY_ERROR",
  "SLUG_DUPLICATE",
  "SLUG_INVALID",
  "ISBN_DUPLICATE",
  "ISBN_INVALID",
  "SKU_CODE_DUPLICATE",
  "SKU_CODE_INVALID",
  "SKU_COVER_DUPLICATE",
  "PRICE_INVALID",
  "EDITION_NOT_FOUND",
  "CATEGORY_PARENT_INVALID",
  "CATEGORY_HAS_CHILDREN",
  "REFERENCE_NOT_FOUND",
  "OUT_OF_STOCK",
  "RECEIPT_NOT_DRAFT",
  "RECEIPT_SELF_APPROVAL",
  "BATCH_CODE_DUPLICATE",
  "RECEIPT_EMPTY",
  "MAX_QTY_EXCEEDED",
  "SKU_NOT_AVAILABLE",
  "CART_FULL",
  "CART_EMPTY",
  "PAYMENT_METHOD_NOT_SUPPORTED",
  "IDEMPOTENCY_KEY_REUSED",
  "ORDER_NOT_CANCELLABLE",
  "ORDER_INVALID_TRANSITION",
  "ORDER_NOT_PAID",
] as const;

/** Mã lỗi đã biết; vẫn nhận chuỗi khác để không vỡ khi backend thêm mã mới. */
export type ApiErrorCode = (typeof API_ERROR_CODES)[number] | (string & {});

const problemDetailsSchema = z.looseObject({
  title: z.string().optional(),
  status: z.number().int().optional(),
  code: z.string().optional(),
  traceId: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
});

function fallbackCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return "VALIDATION_ERROR";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 405:
      return "METHOD_NOT_ALLOWED";
    case 409:
      return "CONFLICT";
    case 429:
      return "TOO_MANY_REQUESTS";
    default:
      return "INTERNAL_ERROR";
  }
}

function isGenericCode(code: string): code is keyof typeof GENERIC_ERROR_MESSAGES {
  return Object.hasOwn(GENERIC_ERROR_MESSAGES, code);
}

/**
 * Lỗi chuẩn hóa từ ProblemDetails (RFC 9457) của backend. UI rẽ nhánh theo `code`, hiển thị `title`;
 * lỗi 5xx chỉ hiện thông báo chung kèm `traceId`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  /** Thông báo tiếng Việt hiển thị được cho người dùng. */
  readonly title: string;
  /** Lỗi validation theo field (camelCase, field lồng dạng `shippingAddress.ward`). */
  readonly errors: Readonly<Record<string, readonly string[]>>;
  readonly traceId: string | null;

  constructor(init: {
    status: number;
    code: ApiErrorCode;
    title: string;
    errors?: Record<string, string[]>;
    traceId?: string | null;
  }) {
    super(init.title);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.title = init.title;
    this.errors = init.errors ?? {};
    this.traceId = init.traceId ?? null;
  }

  /**
   * Tạo `ApiError` từ response lỗi và body đã parse. Body không đúng dạng ProblemDetails (ví dụ trang HTML
   * của proxy) thì dùng mã lỗi chung theo HTTP status.
   */
  static fromResponse(response: Response, body: unknown): ApiError {
    const parsed = problemDetailsSchema.safeParse(body);
    const problem = parsed.success ? parsed.data : {};
    // Lỗi 5xx luôn coi là INTERNAL_ERROR để không lộ chi tiết kỹ thuật (CLAUDE.md mục 4).
    const code = response.status >= 500 ? "INTERNAL_ERROR" : (problem.code ?? fallbackCode(response.status));
    const title = isGenericCode(code)
      ? GENERIC_ERROR_MESSAGES[code]
      : (problem.title ?? GENERIC_ERROR_MESSAGES.INTERNAL_ERROR);

    return new ApiError({ status: response.status, code, title, errors: problem.errors, traceId: problem.traceId });
  }
}

/** Kiểm tra một giá trị bất kỳ (thường lấy từ `catch`) có phải `ApiError` không. */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
