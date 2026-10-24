import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromoBar } from "./PromoBar";

describe("PromoBar", () => {
  it("hides the duplicated marquee row from screen readers", () => {
    render(<PromoBar />);
    // 3 ưu đãi x 3 lần lặp ở dãy đầu; dãy nối đuôi để chạy liền mạch thì aria-hidden.
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(screen.getByRole("region", { name: "Ưu đãi" })).toHaveTextContent("Miễn phí vận chuyển cho đơn từ 300.000đ");
  });

  it("collapses and becomes inert when closed", async () => {
    render(<PromoBar />);
    const bar = screen.getByRole("region", { name: "Ưu đãi" });
    expect(bar.closest("[inert]")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Đóng thanh ưu đãi" }));

    expect(bar.closest("[inert]")).not.toBeNull();
  });
});
