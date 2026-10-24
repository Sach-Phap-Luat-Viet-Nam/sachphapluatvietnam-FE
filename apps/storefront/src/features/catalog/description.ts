import sanitizeHtml from "sanitize-html";

// Chỉ import từ Server Component để `sanitize-html` không vào bundle trình duyệt.

/** Thẻ được giữ trong mô tả sách (Admin nhập HTML); mọi thẻ, thuộc tính khác bị bỏ. */
const DESCRIPTION_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "a"],
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    // Trang đã có h1 là tên sách: hạ tiêu đề trong mô tả xuống để giữ thứ bậc heading.
    h1: "h2",
    a: sanitizeHtml.simpleTransform("a", { rel: "nofollow noopener noreferrer", target: "_blank" }),
  },
};

const TEXT_ONLY: sanitizeHtml.IOptions = { allowedTags: [], allowedAttributes: {} };

// `sanitize-html` mã hóa lại `& < > "` trong chữ; giải mã để chuỗi thuần không bị mã hóa hai lần khi render.
const ENTITIES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&amp;": "&" };

/** HTML mô tả sách đã lọc, an toàn để render. Trả `null` khi không còn nội dung chữ. */
export function sanitizeDescription(html: string | null): string | null {
  if (!html) return null;
  const clean = sanitizeHtml(html, DESCRIPTION_OPTIONS).trim();
  return descriptionText(clean, Number.POSITIVE_INFINITY) ? clean : null;
}

/** Chữ thuần từ mô tả HTML, cắt ở `maxLength` ký tự theo ranh giới từ (dùng cho meta description). */
export function descriptionText(html: string | null, maxLength = 160): string {
  if (!html) return "";
  const text = sanitizeHtml(html.replace(/<\/(p|li|h[1-6])>|<br\s*\/?>/gi, " "), TEXT_ONLY)
    .replace(/&(lt|gt|quot|#39|amp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
