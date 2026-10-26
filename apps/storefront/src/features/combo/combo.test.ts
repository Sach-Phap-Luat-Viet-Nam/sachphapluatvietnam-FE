import {
  comboJsonLd,
  comboPath,
  combosForSkus,
  hasSavings,
  itemDetail,
  itemsSummary,
  originalPrice,
  payablePrice,
  savingsAmount,
  savingsPercent,
  totalCopies,
} from "./combo";
import type { Combo, ComboItem } from "./schemas";

function item(skuId: number, overrides: Partial<ComboItem> = {}): ComboItem {
  return {
    skuId,
    skuCode: `SKU-${skuId}`,
    bookTitle: `Tập ${skuId}`,
    bookSlug: `tap-${skuId}`,
    editionName: "Ấn bản 2026",
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
    id: 1,
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

describe("comboPath", () => {
  it("dùng URL /combo/{slug} theo đặc tả", () => {
    expect(comboPath("combo-tron-bo-sach-ab")).toBe("/combo/combo-tron-bo-sach-ab");
  });
});

describe("totalCopies", () => {
  it("cộng số cuốn của mọi sách trong một bộ", () => {
    expect(totalCopies(combo({ items: [item(11, { quantity: 2 }), item(12)] }))).toBe(3);
  });
});

describe("giá gốc, số tiền và phần trăm tiết kiệm", () => {
  // Ví dụ thật: giá gốc 2 × 550.000đ = 1.100.000đ, đang giảm còn 290.000đ/cuốn (mua lẻ 580.000đ), combo 575.000đ.
  const onSchedule = { comboPrice: 575000, retailPrice: 580000, listPrice: 1100000 };

  it("giá cũ gạch ngang là giá gốc, thiếu thì dùng giá lẻ hiện hành", () => {
    expect(originalPrice(onSchedule)).toBe(1100000);
    expect(originalPrice({ retailPrice: 100000 })).toBe(100000);
    expect(originalPrice({ listPrice: 90000, retailPrice: 100000 })).toBe(100000);
  });

  it("tiết kiệm tính theo giá gốc chứ không theo giá lẻ đang giảm", () => {
    expect(savingsAmount(onSchedule)).toBe(525000);
    expect(savingsPercent(onSchedule)).toBe(48);
  });

  it("70.000đ so với 100.000đ lẻ (chưa có giá gốc riêng) là tiết kiệm 30%", () => {
    expect(savingsAmount(combo())).toBe(30000);
    expect(savingsPercent(combo())).toBe(30);
  });

  it("làm tròn và không bao giờ thấp hơn 1% khi có tiết kiệm", () => {
    expect(savingsPercent({ comboPrice: 130000, retailPrice: 150000 })).toBe(13);
    expect(savingsPercent({ comboPrice: 999900, retailPrice: 1_000_000 })).toBe(1);
  });

  it("không rẻ hơn giá gốc thì không có số tiền hay nhãn phần trăm", () => {
    expect(savingsAmount({ comboPrice: 100000, retailPrice: 100000 })).toBe(0);
    expect(savingsPercent({ comboPrice: 100000, retailPrice: 100000 })).toBeNull();
    expect(savingsPercent({ comboPrice: 0, retailPrice: 0 })).toBeNull();
  });
});

describe("hasSavings và payablePrice", () => {
  // Sách đang có lịch giá 290.000đ/cuốn: mua lẻ cả bộ 580.000đ, thấp hơn giá combo 625.000đ nên backend không áp combo.
  const onSchedule = combo({ comboPrice: 625000, retailPrice: 580000, savings: 0 });

  it("combo chỉ có lợi khi tiết kiệm được tiền", () => {
    expect(hasSavings(combo())).toBe(true);
    expect(hasSavings(onSchedule)).toBe(false);
  });

  it("khách thực trả giá combo khi có lợi, còn không thì trả giá mua lẻ", () => {
    expect(payablePrice(combo())).toBe(70000);
    expect(payablePrice(onSchedule)).toBe(580000);
  });
});

describe("combosForSkus", () => {
  const ab = combo({ id: 1 });
  const bc = combo({ id: 2, items: [item(12), item(13)] });

  it("lấy combo có chứa ít nhất một SKU, giữ thứ tự backend trả", () => {
    expect(combosForSkus([ab, bc], [12]).map((entry) => entry.id)).toEqual([1, 2]);
    expect(combosForSkus([ab, bc], [11]).map((entry) => entry.id)).toEqual([1]);
    expect(combosForSkus([ab, bc], [13, 99]).map((entry) => entry.id)).toEqual([2]);
  });

  it("không có SKU nào thuộc combo thì rỗng", () => {
    expect(combosForSkus([ab, bc], [99])).toEqual([]);
    expect(combosForSkus([ab, bc], [])).toEqual([]);
  });
});

describe("itemsSummary", () => {
  it("nối tên sách, kèm số cuốn khi nhiều hơn một", () => {
    expect(itemsSummary([item(11), item(12, { quantity: 2 })])).toBe("Tập 11 + Tập 12 ×2");
  });
});

describe("itemDetail", () => {
  it("ghép loại bìa với tên ấn bản", () => {
    expect(itemDetail(item(11))).toBe("Bìa mềm · Ấn bản 2026");
    expect(itemDetail(item(11, { coverType: "hardcover", editionName: null }))).toBe("Bìa cứng");
  });
});

describe("comboJsonLd", () => {
  const graph = (value: Combo) =>
    (JSON.parse(JSON.stringify(comboJsonLd(value))) as { "@graph": Array<Record<string, unknown>> })["@graph"];

  it("là Product với Offer theo giá một bộ", () => {
    const [product, breadcrumb] = graph(combo({ description: "Trọn bộ hai tập" }));

    expect(product).toMatchObject({
      "@type": "Product",
      name: "Combo trọn bộ sách AB",
      url: "/combo/combo-tron-bo-sach-ab",
      description: "Trọn bộ hai tập",
      offers: { "@type": "Offer", price: 70000, priceCurrency: "VND", availability: "https://schema.org/InStock" },
    });
    expect(breadcrumb?.itemListElement).toHaveLength(3);
  });

  it("báo hết hàng khi combo tạm ngừng bán và lấy ảnh bìa đầu tiên khi chưa có ảnh combo", () => {
    const [product] = graph(
      combo({ isSellable: false, items: [item(11), item(12, { coverImageUrl: "https://cdn.example/12.jpg" })] }),
    );

    expect(product).toMatchObject({
      image: "https://cdn.example/12.jpg",
      offers: { availability: "https://schema.org/OutOfStock" },
    });
  });

  it("giá của Offer là số tiền khách thực trả, không phải giá combo chưa áp dụng", () => {
    const [product] = graph(combo({ comboPrice: 625000, retailPrice: 580000, savings: 0 }));

    expect(product).toMatchObject({ offers: { price: 580000 } });
  });

  it("bỏ các field chưa có dữ liệu thay vì xuất null", () => {
    const [product] = graph(combo());

    expect(product).not.toHaveProperty("description");
    expect(product).not.toHaveProperty("image");
    expect(product?.offers).not.toHaveProperty("priceValidUntil");
  });
});
