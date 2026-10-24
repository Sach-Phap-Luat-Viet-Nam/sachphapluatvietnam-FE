const CLOUDINARY_PREFIX = "https://res.cloudinary.com/";
const UPLOAD_MARKER = "/image/upload/";

/**
 * Link avatar đã cắt vuông quanh khuôn mặt và nén, cạnh `size` px (truyền kích thước hiển thị × 2 cho màn retina).
 * Ảnh gốc trên Cloudinary không được resize khi upload nên luôn chèn transformation khi hiển thị. Link không phải
 * Cloudinary (môi trường dev) giữ nguyên.
 *
 * @example
 * avatarImageUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg", 96)
 * // → "https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_96,h_96,f_auto,q_auto/v1/a.jpg"
 */
export function avatarImageUrl(url: string, size: number): string {
  if (!url.startsWith(CLOUDINARY_PREFIX) || !url.includes(UPLOAD_MARKER)) {
    return url;
  }
  const side = Math.round(size);
  return url.replace(UPLOAD_MARKER, `${UPLOAD_MARKER}c_fill,g_face,w_${side},h_${side},f_auto,q_auto/`);
}

/**
 * Chữ cái đầu để làm avatar mặc định: chữ đầu của từ đầu và từ cuối trong họ tên, viết hoa (`Nguyễn Văn An` → `NA`).
 * Tên chỉ có một từ thì lấy một chữ; tên rỗng trả chuỗi rỗng.
 */
export function nameInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  // `Array.from` để không cắt đôi ký tự ngoài BMP; chữ tiếng Việt có dấu dựng sẵn vẫn là một ký tự.
  return [first, last]
    .map((word) => (word ? (Array.from(word)[0] ?? "") : ""))
    .join("")
    .toLocaleUpperCase("vi-VN");
}
