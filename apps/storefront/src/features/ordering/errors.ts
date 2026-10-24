import { isApiError } from "@slvn/api-client";
import { MAX_QUANTITY_PER_SKU } from "./cart";

/** Thông báo theo `code` cho giỏ hàng và đặt hàng (bảng mã lỗi ở docs/api_reference.md). */
const MESSAGES_BY_CODE: Record<string, string> = {
  MAX_QTY_EXCEEDED: `Mỗi đơn mua tối đa ${MAX_QUANTITY_PER_SKU} cuốn cho mỗi sách. Cần số lượng lớn hơn, bạn vui lòng liên hệ CSKH để nhận báo giá sỉ.`,
  OUT_OF_STOCK: "Sách không còn đủ số lượng bạn chọn. Bạn vui lòng giảm số lượng hoặc chọn sách khác.",
  SKU_NOT_AVAILABLE: "Sách này hiện không còn bán. Bạn vui lòng xóa khỏi giỏ để tiếp tục.",
  CART_FULL: "Giỏ đã có 50 loại sách, mức tối đa của một giỏ. Bạn vui lòng đặt bớt trước khi thêm sách mới.",
  CART_EMPTY: "Giỏ sách đang trống, bạn vui lòng chọn sách trước khi đặt hàng.",
  PAYMENT_METHOD_NOT_SUPPORTED: "Phương thức thanh toán này chưa được hỗ trợ, bạn vui lòng chọn phương thức khác.",
  TOO_MANY_REQUESTS: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.",
};

const NETWORK_ERROR = "Không kết nối được máy chủ. Bạn kiểm tra mạng rồi thử lại.";
const UNKNOWN_ERROR = "Đã có lỗi xảy ra, vui lòng thử lại sau.";

/**
 * Thông báo tiếng Việt cho lỗi khi thao tác giỏ hàng, đặt hàng, tra cứu đơn. `overrides` thay câu chữ theo ngữ cảnh
 * (ví dụ `NOT_FOUND` khi tra cứu). Lỗi 5xx kèm `traceId` để khách báo CSKH.
 */
export function orderingErrorMessage(error: unknown, overrides: Record<string, string> = {}): string {
  if (isApiError(error)) {
    const message = overrides[error.code] ?? MESSAGES_BY_CODE[error.code] ?? error.title;
    return error.status >= 500 && error.traceId ? `${message} Mã tra cứu: ${error.traceId}` : message;
  }
  // `fetch` ném TypeError khi mất mạng hoặc proxy không tới được backend.
  return error instanceof TypeError ? NETWORK_ERROR : UNKNOWN_ERROR;
}
