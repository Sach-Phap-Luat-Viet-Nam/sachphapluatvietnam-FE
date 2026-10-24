import { isApiError } from "@slvn/api-client";

const MESSAGES_BY_CODE: Record<string, string> = {
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  ACCOUNT_LOCKED: "Tài khoản tạm khóa 15 phút do nhập sai nhiều lần. Anh/chị vui lòng thử lại sau.",
  ACCOUNT_DISABLED: "Tài khoản đã bị khóa. Anh/chị vui lòng liên hệ quản trị viên.",
  SUPER_ADMIN_PORTAL_FORBIDDEN: "Tài khoản Super Admin chỉ đăng nhập ở trang quản trị.",
  OTP_INVALID: "Mã xác thực không đúng. Anh/chị vui lòng nhập lại.",
  TWO_FACTOR_TOKEN_INVALID: "Phiên xác thực đã hết 5 phút. Anh/chị vui lòng đăng nhập lại.",
};

const NETWORK_ERROR = "Không kết nối được máy chủ. Anh/chị kiểm tra mạng rồi thử lại.";
const UNKNOWN_ERROR = "Đã có lỗi xảy ra, vui lòng thử lại sau.";

/** Thông báo tiếng Việt cho lỗi khi đăng nhập/đăng xuất; lỗi 5xx kèm `traceId` để tra cứu. */
export function authErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const message = MESSAGES_BY_CODE[error.code] ?? error.title;
    return error.status >= 500 && error.traceId ? `${message} Mã tra cứu: ${error.traceId}` : message;
  }
  // `fetch` ném TypeError khi mất mạng hoặc proxy không tới được backend.
  return error instanceof TypeError ? NETWORK_ERROR : UNKNOWN_ERROR;
}

/** Lỗi validation theo field của backend, chỉ lấy các field form đang có. */
export function fieldErrors<Field extends string>(
  error: unknown,
  fields: readonly Field[],
): Array<{ field: Field; message: string }> {
  if (!isApiError(error)) {
    return [];
  }
  return fields.flatMap((field) => {
    const message = error.errors[field]?.[0];
    return message ? [{ field, message }] : [];
  });
}
