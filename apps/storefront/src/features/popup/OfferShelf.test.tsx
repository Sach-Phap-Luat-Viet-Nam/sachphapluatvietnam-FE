import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferShelf } from "./OfferShelf";
import type { Popup } from "./schemas";

function popup(id: number, overrides: Partial<Popup> = {}): Popup {
  return {
    id,
    title: `Chương trình ${id}`,
    imageUrl: `https://res.cloudinary.com/demo/image/upload/v1/sachluat/popups/${id}.jpg`,
    linkUrl: `/khuyen-mai/${id}`,
    displayFrequency: "once_per_day",
    updatedAt: "2026-11-01T02:00:00Z",
    ...overrides,
  };
}

const scrollTo = vi.fn();

beforeAll(() => {
  // jsdom chưa có Element.scrollTo.
  Element.prototype.scrollTo = scrollTo;
  // jsdom chưa cài đặt <dialog>.showModal() và close().
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(() => {
  scrollTo.mockClear();
  sessionStorage.clear();
  localStorage.clear();
});

describe("OfferShelf", () => {
  it("không hiện gì khi không có popup nào", () => {
    const { container } = render(<OfferShelf popups={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("hiện đủ mọi chương trình, không cắt ở 3 thẻ", () => {
    render(<OfferShelf popups={Array.from({ length: 7 }, (_, index) => popup(index + 1))} />);

    const cards = within(screen.getByRole("list")).getAllByRole("button");
    expect(cards).toHaveLength(7);
    expect(cards.at(-1)).toHaveTextContent("Chương trình 7");
  });

  it("chỉ có một chương trình thì không hiện nút trái/phải và chấm tròn", () => {
    render(<OfferShelf popups={[popup(1)]} />);

    expect(screen.queryByRole("button", { name: "Chương trình sau" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chuyển tới chương trình 1" })).not.toBeInTheDocument();
  });

  it("nút sau/trước và chấm tròn chuyển băng-rôn, hết vòng thì quay lại", async () => {
    const user = userEvent.setup();
    render(<OfferShelf popups={[popup(1), popup(2), popup(3)]} />);
    const dot = (position: number) => screen.getByRole("button", { name: `Chuyển tới chương trình ${position}` });
    expect(dot(1)).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Chương trình sau" }));
    expect(dot(2)).toHaveAttribute("aria-current", "true");

    await user.click(dot(3));
    expect(dot(3)).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Chương trình sau" }));
    expect(dot(1)).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Chương trình trước" }));
    expect(dot(3)).toHaveAttribute("aria-current", "true");
    expect(scrollTo).toHaveBeenCalledTimes(4);
  });

  it("hiện mỗi popup một thẻ có tên chương trình", () => {
    render(<OfferShelf popups={[popup(1), popup(2), popup(3)]} />);

    const list = screen.getByRole("list");
    const cards = within(list).getAllByRole("button");
    expect(cards.map((card) => card.textContent)).toEqual(["Chương trình 1", "Chương trình 2", "Chương trình 3"]);
    expect(screen.getByRole("heading", { name: "Chương trình đang diễn ra" })).toBeVisible();
  });

  it("bấm thẻ thì mở lại popup đó kèm nút tới chương trình, đóng được", async () => {
    const user = userEvent.setup();
    render(<OfferShelf popups={[popup(1), popup(2)]} />);

    await user.click(screen.getByRole("button", { name: /Chương trình 2/ }));

    const dialog = screen.getByRole("dialog", { name: "Chương trình 2" });
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByRole("img", { name: "Chương trình 2" })).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Xem chương trình" })).toHaveAttribute("href", "/khuyen-mai/2");

    await user.click(within(dialog).getByRole("button", { name: "Đóng quảng cáo" }));
    expect(dialog).not.toHaveAttribute("open");

    // Mở lại thẻ khác sau khi đóng.
    await user.click(screen.getByRole("button", { name: /Chương trình 1/ }));
    expect(screen.getByRole("dialog", { name: "Chương trình 1" })).toHaveAttribute("open");
  });

  it("không ghi dấu đã xem của popup tự bật", async () => {
    const user = userEvent.setup();
    render(<OfferShelf popups={[popup(1)]} />);

    await user.click(screen.getByRole("button", { name: /Chương trình 1/ }));

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("link ngoài mở tab mới, link không an toàn bị bỏ", async () => {
    const user = userEvent.setup();
    render(
      <OfferShelf
        popups={[
          popup(1, { linkUrl: "https://example.com/uu-dai" }),
          popup(2, { linkUrl: "javascript:alert(1)" }),
          popup(3, { linkUrl: null }),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Chương trình 1/ }));
    const external = screen.getByRole("link", { name: "Xem chương trình" });
    expect(external).toHaveAttribute("href", "https://example.com/uu-dai");
    expect(external).toHaveAttribute("target", "_blank");
    expect(external).toHaveAttribute("rel", "noopener noreferrer");

    await user.click(screen.getByRole("button", { name: "Đóng quảng cáo" }));
    await user.click(screen.getByRole("button", { name: /Chương trình 2/ }));
    expect(screen.queryByRole("link", { name: "Xem chương trình" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Đóng quảng cáo" }));
    await user.click(screen.getByRole("button", { name: /Chương trình 3/ }));
    expect(screen.queryByRole("link", { name: "Xem chương trình" })).not.toBeInTheDocument();
  });
});
