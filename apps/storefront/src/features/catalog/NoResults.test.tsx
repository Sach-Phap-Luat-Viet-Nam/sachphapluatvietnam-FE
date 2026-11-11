import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NoResults } from "./NoResults";

const categories = [
  { slug: "dan-su", name: "Dân sự" },
  { slug: "hinh-su", name: "Hình sự" },
];

describe("NoResults", () => {
  it("gợi ý cách tìm khác, không nhắc gõ có dấu (backend đã tìm không dấu)", () => {
    render(<NoResults query="bo luat dan su" keepQueryHref={null} categories={categories} />);

    expect(screen.getByRole("heading", { name: "Chưa tìm thấy sách phù hợp" })).toBeVisible();
    expect(screen.getByText(/Tìm theo tên tác giả, mã sách/)).toBeVisible();
    expect(screen.queryByText(/có dấu/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bỏ bộ lọc, giữ từ khóa" })).not.toBeInTheDocument();
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
