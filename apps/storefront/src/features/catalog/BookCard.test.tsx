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
  it("shows the API price, discount and book type", () => {
    render(<BookCard book={book} />);
    expect(screen.getByText("Bộ luật")).toBeInTheDocument();
    expect(screen.getByText("-25%")).toBeInTheDocument();
    expect(screen.getAllByText("150.000 ₫")).not.toHaveLength(0);
    expect(screen.getAllByText("200.000 ₫")).not.toHaveLength(0);
  });

  it("hides the discount and list price when there is no price yet", () => {
    render(<BookCard book={{ ...book, salePrice: null, listPrice: null, discountPercent: null }} />);
    expect(screen.queryByText(/^-\d+%$/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Chưa có giá bán")).not.toHaveLength(0);
  });

  it("opens the quick view with stock status", async () => {
    render(<BookCard book={{ ...book, inStock: false }} />);
    await userEvent.click(screen.getByRole("button", { name: `Xem nhanh ${book.title}` }));
    const dialog = screen.getByRole("dialog", { name: book.title });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveTextContent("Tạm hết hàng");
    expect(dialog).toHaveTextContent(book.updatedToText ?? "");
  });
});
