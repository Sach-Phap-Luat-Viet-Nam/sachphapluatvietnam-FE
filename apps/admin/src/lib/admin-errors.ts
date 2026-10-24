import { isApiError } from "@slvn/api-client";

/** Thông báo theo `code` cho các màn quản trị (bảng mã lỗi ở docs/api_reference.md). */
const MESSAGES_BY_CODE: Record<string, string> = {
  SLUG_DUPLICATE: "Slug này đã được dùng, anh/chị chọn slug khác.",
  SLUG_INVALID: "Slug chỉ gồm chữ thường không dấu, số và dấu gạch nối.",
  ISBN_DUPLICATE: "ISBN này đã có ở một ấn bản khác.",
  ISBN_INVALID: "ISBN-13 không hợp lệ (13 số, bắt đầu 978/979, đúng số kiểm tra).",
  SKU_CODE_DUPLICATE: "Mã SKU này đã được dùng.",
  SKU_CODE_INVALID: "Mã SKU chỉ gồm chữ in hoa, số và dấu gạch nối, tối đa 50 ký tự.",
  SKU_COVER_DUPLICATE: "Ấn bản đã có SKU cho loại bìa này.",
  PRICE_INVALID: "Giá phải là số nguyên VNĐ lớn hơn 0, giá bán không vượt giá bìa.",
  CATEGORY_PARENT_INVALID: "Không chọn chính danh mục này hoặc danh mục con của nó làm danh mục cha.",
  CATEGORY_HAS_CHILDREN: "Danh mục còn danh mục con. Anh/chị chuyển hoặc xóa danh mục con trước.",
  REFERENCE_NOT_FOUND: "Có danh mục, tác giả hoặc văn bản vừa bị xóa. Anh/chị tải lại trang rồi chọn lại.",
  EDITION_NOT_FOUND: "Không tìm thấy ấn bản, có thể trang đã cũ. Anh/chị tải lại trang.",
  UPLOAD_NOT_CONFIGURED: "Máy chủ chưa cấu hình nơi lưu ảnh (Cloudinary). Anh/chị dán link ảnh có sẵn.",
  FORBIDDEN: "Tài khoản của anh/chị không có quyền thực hiện thao tác này.",
};

const NETWORK_ERROR = "Không kết nối được máy chủ. Anh/chị kiểm tra mạng rồi thử lại.";
const UNKNOWN_ERROR = "Đã có lỗi xảy ra, vui lòng thử lại sau.";

/**
 * Thông báo tiếng Việt cho lỗi khi gọi API Admin. `overrides` thay câu chữ theo ngữ cảnh. Lỗi 5xx kèm `traceId`
 * để báo lại cho backend.
 */
export function adminErrorMessage(error: unknown, overrides: Record<string, string> = {}): string {
  if (isApiError(error)) {
    const message = overrides[error.code] ?? MESSAGES_BY_CODE[error.code] ?? error.title;
    return error.status >= 500 && error.traceId ? `${message} Mã tra cứu: ${error.traceId}` : message;
  }
  // `fetch` ném TypeError khi mất mạng hoặc proxy không tới được backend.
  return error instanceof TypeError ? NETWORK_ERROR : UNKNOWN_ERROR;
}

/** Mã lỗi nghiệp vụ gắn với một field cụ thể của form. */
const FIELD_BY_CODE: Record<string, string> = {
  SLUG_DUPLICATE: "slug",
  SLUG_INVALID: "slug",
  ISBN_DUPLICATE: "isbn",
  ISBN_INVALID: "isbn",
  SKU_CODE_DUPLICATE: "skuCode",
  SKU_CODE_INVALID: "skuCode",
  SKU_COVER_DUPLICATE: "coverType",
  PRICE_INVALID: "salePrice",
  CATEGORY_PARENT_INVALID: "parentId",
};

/**
 * Lỗi của backend theo field của form: `errors` trong ProblemDetails (key camelCase) và mã lỗi nghiệp vụ gắn với
 * một field (ví dụ `SLUG_DUPLICATE` → `slug`). Chỉ lấy field form đang có; còn lại hiển thị chung ở form.
 */
export function formFieldErrors<Field extends string>(
  error: unknown,
  fields: readonly Field[],
): Array<{ field: Field; message: string }> {
  if (!isApiError(error)) {
    return [];
  }
  const codeField = fields.find((field) => FIELD_BY_CODE[error.code] === field);
  if (codeField) {
    return [{ field: codeField, message: adminErrorMessage(error) }];
  }
  return fields.flatMap((field) => {
    const message = error.errors[field]?.[0];
    return message ? [{ field, message }] : [];
  });
}
