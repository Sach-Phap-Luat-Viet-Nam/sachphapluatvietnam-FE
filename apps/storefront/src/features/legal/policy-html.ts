import sanitizeHtml from "sanitize-html";
import { slugify } from "@slvn/utils";

// Chỉ import từ Server Component để `sanitize-html` không vào bundle trình duyệt.

export interface PolicySection {
  id: string;
  title: string;
  /** HTML đã lọc của phần thân mục (sau `<h2>`, trước `<h2>` kế tiếp). */
  html: string;
}

export interface PolicyContent {
  /** HTML đã lọc trước tiêu đề `<h2>` đầu tiên (ví dụ thông báo dự thảo); `null` khi không có. */
  intro: string | null;
  sections: PolicySection[];
}

/** `id` đã dùng trong khung trang (`PolicyPage`): mục trùng tên được thêm hậu tố để link `#id` không nhảy sai chỗ. */
const RESERVED_IDS = new Set(["noi-dung", "bat-dau"]);

const isInternalHref = (href: string) => (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#");

/** Thẻ văn bản Admin soạn được giữ; `id` chỉ giữ ở `h2`/`h3` để làm mục lục và link tới mục. */
const POLICY_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "hr", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "a"],
  allowedAttributes: { a: ["href", "rel", "target"], h2: ["id"], h3: ["id"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  transformTags: {
    // Trang đã có h1 là tên văn bản: hạ tiêu đề trong nội dung xuống để giữ thứ bậc heading.
    h1: "h2",
    // Link trong site mở tại chỗ; link ra ngoài mở tab mới, không gửi referrer.
    a: (tagName, attribs) => {
      const href = attribs.href?.trim() ?? "";
      const safe: sanitizeHtml.Attributes = isInternalHref(href)
        ? { href }
        : { href, rel: "nofollow noopener noreferrer", target: "_blank" };
      return { tagName, attribs: safe };
    },
  },
};

const ENTITIES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&amp;": "&" };

/** Chữ thuần của một đoạn HTML đã lọc (để hiển thị qua React, không mã hóa hai lần). */
function htmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&(lt|gt|quot|#39|amp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

/** Chuẩn hóa `id` về kebab-case, sinh từ tiêu đề khi thiếu; trùng thì thêm `-2`, `-3`... */
function uniqueId(candidate: string | undefined, title: string, index: number, used: Set<string>): string {
  const base = slugify(candidate ?? "") || slugify(title) || `muc-${index + 1}`;
  let id = base;
  for (let suffix = 2; used.has(id) || RESERVED_IDS.has(id); suffix++) {
    id = `${base}-${suffix}`;
  }
  used.add(id);
  return id;
}

/** `sanitize-html` luôn ghi `<h2>` hoặc `<h2 id="...">` (thuộc tính duy nhất được giữ), nên tách được bằng regex. */
const H2 = /<h2(?: id="([^"]*)")?>([\s\S]*?)<\/h2>/g;

/**
 * Lọc HTML trang tĩnh từ backend rồi tách theo `<h2>` thành các mục cho mục lục. Tiêu đề bỏ số thứ tự gõ tay
 * ("1. ...") vì trang tự đánh số. Mục không còn chữ (chỉ có thẻ rỗng) vẫn giữ để mục lục khớp với tiêu đề Admin đặt.
 */
export function preparePolicyHtml(input: string): PolicyContent {
  const clean = sanitizeHtml(input, POLICY_HTML_OPTIONS);
  const headings = [...clean.matchAll(H2)];
  const used = new Set<string>();

  const introHtml = clean.slice(0, headings[0]?.index ?? clean.length).trim();
  const sections = headings.map((match, index) => {
    const title = htmlText(match[2] ?? "").replace(/^\d+\.\s*/, "");
    const bodyStart = match.index + match[0].length;
    const bodyEnd = headings[index + 1]?.index ?? clean.length;
    return {
      id: uniqueId(match[1], title, index, used),
      title,
      html: clean.slice(bodyStart, bodyEnd).trim(),
    };
  });

  return { intro: htmlText(introHtml) ? introHtml : null, sections };
}
