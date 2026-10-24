import { formatDate } from "@slvn/utils";
import type { BookDetail, Edition } from "./schemas";

/** Query chọn ấn bản trên trang chi tiết: `/sach/<slug>?an-ban=<id>` (docs/api_reference.md, mục Catalog). */
export const EDITION_PARAM = "an-ban";

const AUDIENCE_LABELS: Record<string, string> = {
  student: "Sinh viên",
  lawyer: "Luật sư",
  business: "Doanh nghiệp",
  citizen: "Người dân",
};

/** `["student", "lawyer"]` → `Sinh viên · Luật sư`; bỏ giá trị chưa có nhãn. */
export function audienceText(audiences: readonly string[]): string {
  return audiences.flatMap((audience) => AUDIENCE_LABELS[audience] ?? []).join(" · ");
}

export function bookPath(slug: string): string {
  return `/sach/${slug}`;
}

/** Link tới một ấn bản; ấn bản mới nhất dùng URL gốc của sách (cũng là canonical). */
export function editionHref(slug: string, edition: Pick<Edition, "id" | "isLatest">): string {
  return edition.isLatest ? bookPath(slug) : `${bookPath(slug)}?${EDITION_PARAM}=${edition.id}`;
}

export function latestEdition(book: Pick<BookDetail, "editions">): Edition | null {
  return book.editions.find((edition) => edition.isLatest) ?? book.editions[0] ?? null;
}

/** Ấn bản theo `?an-ban=`; id không hợp lệ hoặc không thuộc sách thì về ấn bản mới nhất. */
export function selectEdition(book: Pick<BookDetail, "editions">, editionParam: string): Edition | null {
  const id = /^\d+$/.test(editionParam) ? Number(editionParam) : null;
  return book.editions.find((edition) => edition.id === id) ?? latestEdition(book);
}

/** Tên ngắn của ấn bản, ví dụ `Tái bản lần 3 – 2026 · 2026`. */
export function editionLabel(edition: Pick<Edition, "editionName" | "publishYear" | "isbn">): string {
  const parts = [edition.editionName, edition.publishYear].filter((part) => part !== null && part !== "");
  return parts.length ? parts.join(" · ") : `ISBN ${edition.isbn}`;
}

export interface PurchaseState {
  /** Ấn bản đang bán (`on_sale`, `clearance`) và có ít nhất một SKU. */
  buyable: boolean;
  /** Lý do không mua được, hoặc nhãn phụ khi đang thanh lý. */
  label: string | null;
}

/** Ấn bản có mua được không (BR-03: chỉ `on_sale` hoặc `clearance`). */
export function purchaseState(edition: Pick<Edition, "status" | "skus" | "releaseDate">): PurchaseState {
  switch (edition.status) {
    case "on_sale":
    case "clearance":
      return edition.skus.length
        ? { buyable: true, label: edition.status === "clearance" ? "Đang thanh lý" : null }
        : { buyable: false, label: "Chưa có giá bán" };
    case "upcoming": {
      const date = formatDate(edition.releaseDate);
      return { buyable: false, label: date ? `Sắp phát hành, dự kiến ${date}` : "Sắp phát hành" };
    }
    case "discontinued":
      return { buyable: false, label: "Ngừng bán" };
    default:
      return { buyable: false, label: "Chưa mở bán" };
  }
}

export interface Fact {
  label: string;
  value: string;
}

/** Thông tin xuất bản (FR-21) theo thứ tự hiển thị, bỏ các mục chưa có dữ liệu. */
export function publishingFacts(edition: Edition): Fact[] {
  const facts: Array<[string, string | number | null]> = [
    ["ISBN", edition.isbn],
    ["Nhà xuất bản", edition.publisher],
    ["Số quyết định xuất bản", edition.publishingDecisionNo],
    ["Số đăng ký xuất bản", edition.registrationNo],
    ["Năm xuất bản", edition.publishYear],
    ["Ngày phát hành", formatDate(edition.releaseDate)],
    ["Số trang", edition.pages],
    ["Khổ sách", edition.size],
    ["Trọng lượng", edition.weightGram === null ? null : `${edition.weightGram} g`],
    ["Cập nhật văn bản đến ngày", formatDate(edition.updatedToDate)],
  ];
  return facts.flatMap(([label, value]) => (value === null || value === "" ? [] : [{ label, value: String(value) }]));
}

/** Link đọc thử chỉ nhận `https://`, tránh `javascript:` hay link tương đối lạ từ dữ liệu nhập tay. */
export function safePreviewUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const SCHEMA = "https://schema.org";

function offerAvailability(edition: Edition, inStock: boolean): string {
  if (edition.status === "discontinued") return `${SCHEMA}/Discontinued`;
  return purchaseState(edition).buyable && inStock ? `${SCHEMA}/InStock` : `${SCHEMA}/OutOfStock`;
}

/**
 * Dữ liệu có cấu trúc schema.org `Book` + `Product`/`Offer` + `BreadcrumbList` (NFR-31). URL để dạng tương đối vì chưa
 * cấu hình domain chính thức của storefront.
 */
export function bookJsonLd(book: BookDetail, edition: Edition, description: string): Record<string, unknown> {
  const path = bookPath(book.slug);
  const category = book.categories[0];
  const breadcrumb = [
    { name: "Trang chủ", item: "/" },
    { name: "Tủ sách", item: "/sach" },
    ...(category ? [{ name: category.name, item: `/sach?category=${encodeURIComponent(category.slug)}` }] : []),
    { name: book.title, item: path },
  ];

  const datePublished = edition.releaseDate ?? (edition.publishYear === null ? null : String(edition.publishYear));
  // `undefined` bị JSON.stringify bỏ qua nên các field chưa có dữ liệu không xuất hiện trong JSON-LD.
  return {
    "@context": SCHEMA,
    "@graph": [
      {
        "@type": ["Book", "Product"],
        name: book.title,
        url: path,
        isbn: edition.isbn,
        inLanguage: "vi",
        bookEdition: edition.editionName ?? undefined,
        description: description || undefined,
        image: edition.coverImageUrl ?? undefined,
        numberOfPages: edition.pages ?? undefined,
        datePublished: datePublished ?? undefined,
        publisher: { "@type": "Organization", name: edition.publisher },
        author: book.authors.length ? book.authors.map(({ name }) => ({ "@type": "Person", name })) : undefined,
        offers: edition.skus.map((sku) => ({
          "@type": "Offer",
          sku: sku.skuCode,
          price: sku.salePrice,
          priceCurrency: "VND",
          availability: offerAvailability(edition, sku.inStock),
          itemCondition: `${SCHEMA}/NewCondition`,
          url: editionHref(book.slug, edition),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumb.map((entry, index) => ({ "@type": "ListItem", position: index + 1, ...entry })),
      },
    ],
  };
}

/** Chuỗi JSON-LD an toàn để đặt trong `<script>`: đổi `<` để dữ liệu không đóng được thẻ script. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
