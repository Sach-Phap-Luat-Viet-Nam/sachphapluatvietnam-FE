import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { BookCard } from "./BookCard";
import type { BookSummary } from "./schemas";

beforeAll(() => {
  // jsdom chưa cài đặt <dialog>.showModal().
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
});

const book: BookSummary = {
  id: 1,
  title: "Bộ luật Dân sự 2026",
  slug: "bo-luat-dan-su-2026",
  bookType: "code",
  editionName: "Tái bản lần 3 – 2026",
  publishYear: 2026,
  coverImageUrl: null,
  updatedToText: "Cập nhật đến Bộ luật Dân sự 91/2015/QH13",
  editionStatus: "on_sale",
  salePrice: 150000,
  listPrice: 200000,
  discountPercent: 25,
  inStock: true,
};

describe("BookCard", () => {
  it("shows the API price, discount badge, book type and update label", () => {
    render(<BookCard book={book} />);
    expect(screen.getAllByText("Bộ luật")).not.toHaveLength(0);
    expect(screen.getByText("Giảm 25%")).toBeInTheDocument();
    expect(screen.getAllByText("150.000 ₫")).not.toHaveLength(0);
    expect(screen.getAllByText("200.000 ₫")).not.toHaveLength(0);
    expect(screen.getAllByText(book.updatedToText ?? "")).not.toHaveLength(0);
    // Còn hàng thì không cần nhãn trạng thái trên thẻ.
    expect(screen.queryByText("Còn hàng", { selector: "article > div span" })).not.toBeInTheDocument();
  });

  it("marks upcoming books and books without a price", () => {
    render(
      <BookCard
        book={{ ...book, editionStatus: "upcoming", salePrice: null, listPrice: null, discountPercent: null }}
      />,
    );
    expect(screen.getAllByText("Sắp phát hành")).not.toHaveLength(0);
    expect(screen.queryByText(/^Giảm/)).not.toBeInTheDocument();
    expect(screen.queryByText("150.000 ₫")).not.toBeInTheDocument();
  });

  it("opens the quick view from the title with stock status", async () => {
    render(<BookCard book={{ ...book, inStock: false }} />);
    await userEvent.click(screen.getByRole("button", { name: book.title }));
    const dialog = screen.getByRole("dialog", { name: book.title });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveTextContent("Tạm hết hàng");
    expect(dialog).toHaveTextContent(book.updatedToText ?? "");
  });

  it("shows the cart actions only for books that can be bought", async () => {
    const actions = {
      cartAction: <button type="button">Thêm nhanh</button>,
      dialogCartAction: <button type="button">Thêm vào giỏ trong hộp</button>,
    };
    const { unmount } = render(<BookCard book={book} {...actions} />);
    expect(screen.getByRole("button", { name: "Thêm nhanh" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: book.title }));
    expect(screen.getByRole("button", { name: "Thêm vào giỏ trong hộp" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem chi tiết sách" })).toHaveAttribute("href", `/sach/${book.slug}`);
    unmount();

    render(<BookCard book={{ ...book, inStock: false }} {...actions} />);
    expect(screen.queryByRole("button", { name: "Thêm nhanh" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Tạm hết hàng")).not.toHaveLength(0);
  });

  it("uses the cover image from the API instead of the drawn cover", () => {
    const coverImageUrl = "https://res.cloudinary.com/demo/image/upload/bia.jpg";
    render(<BookCard book={{ ...book, coverImageUrl }} />);
    const covers = screen.getAllByRole("img", { name: `Bìa sách ${book.title}` });
    expect(covers[0]).toHaveAttribute("src", coverImageUrl);
  });
});
