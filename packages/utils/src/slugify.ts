/**
 * Chuyển chuỗi tiếng Việt thành slug theo quy tắc của backend: chữ thường không dấu, số, gạch nối đơn.
 *
 * @example slugify("Bộ luật Dân sự 2026") // "bo-luat-dan-su-2026"
 */
export function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      // Bỏ dấu thanh và dấu mũ (dấu kết hợp sau khi tách NFD).
      .replace(/[̀-ͯ]/g, "")
      // "đ" không tách được bằng NFD.
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

/** Slug hợp lệ với backend: `bo-luat-dan-su-2026`. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
