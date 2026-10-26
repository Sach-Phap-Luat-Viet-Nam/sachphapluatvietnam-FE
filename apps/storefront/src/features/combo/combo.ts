import { coverTypeLabel } from "@/lib/labels";
import type { Combo, ComboItem } from "./schemas";

const SCHEMA = "https://schema.org";

export function comboPath(slug: string): string {
  return `/combo/${slug}`;
}

/** Tổng số cuốn trong một bộ. */
export function totalCopies(combo: Pick<Combo, "items">): number {
  return combo.items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Phần trăm tiết kiệm so với mua lẻ, làm tròn (`70.000` so với `100.000` → `30`). Chỉ để hiển thị nhãn "−30%": số tiền
 * thật luôn lấy từ backend. `null` khi không tiết kiệm.
 */
export function savingsPercent(combo: Pick<Combo, "retailPrice" | "savings">): number | null {
  if (combo.retailPrice <= 0 || combo.savings <= 0) return null;
  return Math.max(1, Math.round((combo.savings / combo.retailPrice) * 100));
}

/** Combo có chứa ít nhất một trong các SKU (dùng cho mục "Có trong combo" ở trang sách), giữ thứ tự backend trả. */
export function combosForSkus(combos: readonly Combo[], skuIds: readonly number[]): Combo[] {
  const wanted = new Set(skuIds);
  return combos.filter((combo) => combo.items.some((item) => wanted.has(item.skuId)));
}

/** "Tập 1 + Tập 2 ×2": tên sách trong bộ, kèm số cuốn khi nhiều hơn một. */
export function itemsSummary(items: readonly ComboItem[]): string {
  return items.map((item) => (item.quantity > 1 ? `${item.bookTitle} ×${item.quantity}` : item.bookTitle)).join(" + ");
}

/** "Bìa mềm · Ấn bản 2026" cho dòng sách trong trang combo. */
export function itemDetail(item: Pick<ComboItem, "coverType" | "editionName">): string {
  return [coverTypeLabel(item.coverType), item.editionName].filter(Boolean).join(" · ");
}

/** JSON-LD `Product` + `Offer` của trang combo (giá một bộ), cùng kiểu với trang sách. */
export function comboJsonLd(combo: Combo): Record<string, unknown> {
  const path = comboPath(combo.slug);
  const image = combo.imageUrl ?? combo.items.find((item) => item.coverImageUrl)?.coverImageUrl ?? undefined;
  // `undefined` bị JSON.stringify bỏ qua nên các field chưa có dữ liệu không xuất hiện trong JSON-LD.
  return {
    "@context": SCHEMA,
    "@graph": [
      {
        "@type": "Product",
        name: combo.name,
        url: path,
        description: combo.description ?? undefined,
        image,
        offers: {
          "@type": "Offer",
          price: combo.comboPrice,
          priceCurrency: "VND",
          priceValidUntil: combo.endsAt ?? undefined,
          availability: `${SCHEMA}/${combo.isSellable ? "InStock" : "OutOfStock"}`,
          itemCondition: `${SCHEMA}/NewCondition`,
          url: path,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
          { "@type": "ListItem", position: 2, name: "Khuyến mãi", item: "/khuyen-mai" },
          { "@type": "ListItem", position: 3, name: combo.name, item: path },
        ],
      },
    ],
  };
}
