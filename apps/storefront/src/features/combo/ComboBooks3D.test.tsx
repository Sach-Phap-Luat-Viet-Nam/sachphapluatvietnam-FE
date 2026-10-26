import { render, screen } from "@testing-library/react";
import { ComboBooks3D, canShow3D } from "./ComboBooks3D";

const ITEMS = [
  { skuId: 1, bookTitle: "Luật Quản lý nợ công", coverImageUrl: "https://example.com/1.png" },
  { skuId: 2, bookTitle: "Luật Xây dựng", coverImageUrl: null },
];

describe("ComboBooks3D", () => {
  it("dựng một mô hình 3D cho mỗi cuốn trong combo", () => {
    render(<ComboBooks3D items={ITEMS} />);

    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Bìa sách Luật Quản lý nợ công" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bìa sách Luật Xây dựng" })).toBeInTheDocument();
  });

  it("combo một cuốn dựng cỡ lớn như trang chi tiết sách", () => {
    render(<ComboBooks3D items={ITEMS.slice(0, 1)} />);

    expect(screen.getByRole("img", { name: "Bìa sách Luật Quản lý nợ công" })).toHaveClass("h-92");
  });

  it("chỉ dựng 3D cho combo 1–2 sách", () => {
    expect(canShow3D([])).toBe(false);
    expect(canShow3D([1])).toBe(true);
    expect(canShow3D([1, 2])).toBe(true);
    expect(canShow3D([1, 2, 3])).toBe(false);
  });
});
