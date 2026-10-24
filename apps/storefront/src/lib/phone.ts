/** `0xxxxxxxxx` hoặc `+84xxxxxxxxx` (docs/api_reference.md, `CreateOrderRequest.phone`, `RegisterRequest.phoneNumber`). */
const PHONE_PATTERN = /^(0\d{9}|\+84\d{9})$/;

export const PHONE_MESSAGE = "Số điện thoại gồm 10 số, bắt đầu bằng 0 (hoặc +84).";

/** Bỏ khoảng trắng, dấu chấm, gạch nối khách hay gõ (`090 123 4567`). */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s.-]/g, "");
}

export function isValidPhone(phone: string): boolean {
  return PHONE_PATTERN.test(normalizePhone(phone));
}
