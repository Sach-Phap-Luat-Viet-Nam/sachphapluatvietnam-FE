"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { CheckoutPreviewBody } from "@slvn/api-client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { previewCheckout } from "./api";

/** Chờ khách ngừng gõ tỉnh/số điện thoại trước khi gọi lại (backend giới hạn 60 request/phút/IP). */
const PREVIEW_DEBOUNCE_MS = 400;

export interface PreviewInput extends CheckoutPreviewBody {
  /** Đổi khi nội dung giỏ đổi (giỏ không nằm trong request) để tải lại preview. */
  signature: string;
}

/** Bỏ field rỗng để request gọn và khóa cache không đổi khi khách chỉ xóa/gõ lại khoảng trắng. */
function cleaned(input: PreviewInput): PreviewInput {
  const { province, couponCode, phone, ...rest } = input;
  return {
    ...rest,
    ...(province?.trim() ? { province: province.trim() } : {}),
    ...(couponCode ? { couponCode } : {}),
    ...(phone ? { phone } : {}),
  };
}

export const previewKey = (input: PreviewInput) => ["checkout-preview", cleaned(input)] as const;

/**
 * `POST /checkout/preview`: số tiền duy nhất FE hiển thị ở bước thanh toán. Đổi tỉnh, số điện thoại, mã thì gọi lại sau
 * một nhịp debounce; trong lúc chờ vẫn giữ số cũ (`updating = true`) để tóm tắt không nhấp nháy.
 */
export function useCheckoutPreview(input: PreviewInput) {
  // Chỉ tỉnh và số điện thoại là thứ khách gõ dần; mã giảm giá và giỏ đổi theo thao tác một lần nên áp dụng ngay.
  const typed = useDebouncedValue({ province: input.province, phone: input.phone }, PREVIEW_DEBOUNCE_MS);
  const debounced = cleaned({ ...input, ...typed });
  const query = useQuery({
    queryKey: previewKey(debounced),
    queryFn: () => previewCheckout(debounced),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
  const settled = typed.province === input.province && typed.phone === input.phone;
  return { ...query, updating: query.isFetching || query.isPlaceholderData || !settled, debounced };
}
