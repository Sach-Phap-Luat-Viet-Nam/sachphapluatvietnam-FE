import { render, screen } from "@testing-library/react";
import { ZaloContact } from "./ZaloContact";

describe("ZaloContact", () => {
  it.each([
    ["Tư vấn mua bán", "0984739739"],
    ["Kỹ thuật, sự cố, hỏi đáp về đơn", "0932000035"],
  ])("links %s to its Zalo in a new tab", (label, phone) => {
    render(<ZaloContact />);
    // Danh sách nằm trong <details> đóng nên phải bật `hidden` để tìm thấy link.
    const link = screen.getByRole("link", { name: `${label}${phone}`, hidden: true });
    expect(link).toHaveAttribute("href", `https://zalo.me/${phone}`);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
