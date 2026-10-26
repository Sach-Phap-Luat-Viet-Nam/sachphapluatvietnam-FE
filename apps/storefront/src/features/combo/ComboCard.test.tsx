import { render, screen } from "@testing-library/react";
import { formatPrice } from "@slvn/utils";
import { ComboCard } from "./ComboCard";
import type { Combo, ComboItem } from "./schemas";

function item(skuId: number, overrides: Partial<ComboItem> = {}): ComboItem {
  return {
    skuId,
    skuCode: `SKU-${skuId}`,
    bookTitle: `Tập ${skuId}`,
    bookSlug: `tap-${skuId}`,
    editionName: null,
    coverType: "paperback",
    coverImageUrl: null,
    quantity: 1,
    unitPrice: 50000,
    isSellable: true,
    ...overrides,
  };
}

function combo(overrides: Partial<Combo> = {}): Combo {
  return {
    id: 5,
    name: "Combo trọn bộ sách AB",
    slug: "combo-tron-bo-sach-ab",
    description: null,
    imageUrl: null,
    comboPrice: 70000,
    retailPrice: 100000,
    savings: 30000,
    items: [item(11), item(12)],
    isSellable: true,
    startsAt: "2026-11-01T00:00:00Z",
    endsAt: null,
    ...overrides,
  };
}

function renderCard(value: Combo) {
  return render(
    <ul>
      <ComboCard combo={value} />
    </ul>,
  );
}

describe("ComboCard", () => {
  it("hiện tên, số cuốn, các sách trong bộ và liên kết tới trang combo", () => {
    renderCard(combo({ items: [item(11), item(12, { quantity: 2 })] }));

    expect(screen.getByRole("link", { name: "Combo trọn bộ sách AB" })).toHaveAttribute(
      "href",
      "/combo/combo-tron-bo-sach-ab",
    );
    expect(screen.getByText("Combo · 3 cuốn")).toBeVisible();
    expect(screen.getByText("Tập 11 + Tập 12 ×2")).toBeVisible();
  });

  it("hiện giá combo, giá mua lẻ gạch ngang, phần trăm và số tiền tiết kiệm", () => {
    renderCard(combo());

    expect(screen.getByText(formatPrice(70000))).toBeVisible();
    expect(screen.getByText(formatPrice(100000))).toBeVisible();
    expect(screen.getByText(/−30%/)).toBeVisible();
    expect(screen.getByText(`Tiết kiệm ${formatPrice(30000)} so với mua lẻ`)).toBeVisible();
  });

  it("không tiết kiệm thì chỉ hiện giá combo", () => {
    renderCard(combo({ comboPrice: 100000, savings: 0 }));

    expect(screen.getByText(formatPrice(100000))).toBeVisible();
    expect(screen.queryByText(/Tiết kiệm/)).not.toBeInTheDocument();
    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
  });

  it("có ảnh bìa thì hiện ảnh với alt mô tả, chưa có thì vẽ bìa thay thế từ tên sách", () => {
    renderCard(combo({ items: [item(11, { coverImageUrl: "https://cdn.example/11.jpg" }), item(12)] }));

    expect(screen.getByRole("img", { name: "Bìa sách Tập 11" })).toBeInTheDocument();
    expect(screen.getAllByText("Tập 12").length).toBeGreaterThan(0);
  });

  it("chỉ hiện tối đa 4 bìa dù bộ có nhiều sách hơn", () => {
    const items = Array.from({ length: 6 }, (_, index) =>
      item(index + 1, { coverImageUrl: `https://cdn.example/${index + 1}.jpg` }),
    );

    renderCard(combo({ items }));

    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByText("Combo · 6 cuốn")).toBeVisible();
  });
});
