import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NoResults } from "./NoResults";

const categories = [
  { slug: "dan-su", name: "Dân sự" },
  { slug: "hinh-su", name: "Hình sự" },
];

describe("NoResults", () => {
  it("nhắc gõ có dấu khi từ khóa không dấu", () => {
    render(<NoResults query="bo luat dan su" keepQueryHref={null} categories={categories} />);

    expect(screen.getByRole("heading", { name: "Chưa tìm thấy sách phù hợp" })).toBeVisible();
    expect(screen.getByText("tiếng Việt có dấu")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Bỏ bộ lọc, giữ từ khóa" })).not.toBeInTheDocument();
  });

  it("không nhắc gõ có dấu khi từ khóa đã có dấu hoặc là mã", () => {
    const { rerender } = render(<NoResults query="bộ luật dân sự" keepQueryHref={null} categories={[]} />);
    expect(screen.queryByText("tiếng Việt có dấu")).not.toBeInTheDocument();

    rerender(<NoResults query="9786045712345" keepQueryHref={null} categories={[]} />);
    expect(screen.queryByText("tiếng Việt có dấu")).not.toBeInTheDocument();
  });

  it("cho bỏ bộ lọc giữ từ khóa và duyệt theo danh mục", () => {
    render(
      <NoResults query="hợp đồng" keepQueryHref="/sach?q=h%E1%BB%A3p+%C4%91%E1%BB%93ng" categories={categories} />,
    );

    expect(screen.getByRole("link", { name: "Bỏ bộ lọc, giữ từ khóa" })).toHaveAttribute(
      "href",
      "/sach?q=h%E1%BB%A3p+%C4%91%E1%BB%93ng",
    );
    const nav = within(screen.getByRole("navigation", { name: "Duyệt theo danh mục" }));
    expect(nav.getByRole("link", { name: "Dân sự" })).toHaveAttribute("href", "/sach?category=dan-su");
    expect(nav.getByRole("link", { name: "Hình sự" })).toHaveAttribute("href", "/sach?category=hinh-su");
  });

  it("chỉ lọc không có từ khóa thì không hiện mẹo tìm kiếm", () => {
    render(<NoResults query="" keepQueryHref={null} categories={[]} />);

    expect(screen.getByText("Không có sách nào trong bộ lọc đang chọn.")).toBeVisible();
    expect(screen.queryByText(/mã ISBN/)).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
