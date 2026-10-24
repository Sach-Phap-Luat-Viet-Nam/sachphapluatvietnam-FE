import sanitizeHtml from "sanitize-html";

// Chỉ import từ Server Component để `sanitize-html` không vào bundle trình duyệt.

/** Thẻ được giữ trong mô tả, mục lục (Admin nhập); mọi thẻ, thuộc tính khác bị bỏ. */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "ul",
    "ol",
    "li",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "a",
  ],
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

/** Có thẻ HTML (`<p>`, `<ul>`, `<br/>`…) thì coi là HTML; không thì là chữ thuần gõ xuống dòng. */
const HTML_TAG = /<\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>/i;
/** Dòng chỉ gồm `-`, `_`, `=` hoặc `*` (≥ 3 ký tự) dùng làm đường phân cách trong chữ thuần. */
const DIVIDER_LINE = /^[-_=*]{3,}$/;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Chữ thuần → HTML: dòng trống tách đoạn `<p>`, xuống dòng đơn thành `<br>`, dòng `-----` thành `<hr>`. */
function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) =>
      DIVIDER_LINE.test(block)
        ? "<hr>"
        : `<p>${block
            .split("\n")
            .map((line) => escapeHtml(line.trim()))
            .join("<br>")}</p>`,
    )
    .join("");
}

/**
 * HTML an toàn để render cho mô tả sách, mục lục. Nhận cả HTML lẫn chữ thuần có xuống dòng (dữ liệu thật đang là chữ
 * thuần). Trả `null` khi không còn nội dung chữ.
 */
export function formatRichText(input: string | null): string | null {
  if (!input?.trim()) return null;
  const html = HTML_TAG.test(input) ? input : plainTextToHtml(input);
  const clean = sanitizeHtml(html, RICH_TEXT_OPTIONS).trim();
  return descriptionText(clean, Number.POSITIVE_INFINITY) ? clean : null;
}

/** Chữ thuần từ mô tả (HTML hoặc chữ thuần), cắt ở `maxLength` ký tự theo ranh giới từ (dùng cho meta description). */
export function descriptionText(html: string | null, maxLength = 160): string {
  if (!html) return "";
  const text = sanitizeHtml(html.replace(/<\/(p|li|h[1-6])>|<br\s*\/?>/gi, " "), TEXT_ONLY)
    .replace(/&(lt|gt|quot|#39|amp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/[-_=*]{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
