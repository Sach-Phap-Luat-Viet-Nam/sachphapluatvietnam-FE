import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromoBar } from "./PromoBar";

describe("PromoBar", () => {
  it("hides the duplicated marquee row from screen readers", () => {
    render(<PromoBar freeShippingThreshold={300000} />);
    // 3 ưu đãi x 3 lần lặp ở dãy đầu; dãy nối đuôi để chạy liền mạch thì aria-hidden.
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(screen.getByRole("region", { name: "Ưu đãi" })).toHaveTextContent("Miễn phí vận chuyển cho đơn từ 300.000đ");
  });

  it("uses the threshold from the backend and drops the message when there is none", () => {
    const { unmount } = render(<PromoBar freeShippingThreshold={500000} />);
    const bar = screen.getByRole("region", { name: "Ưu đãi" });
    expect(bar).toHaveTextContent("Miễn phí vận chuyển cho đơn từ 500.000đ");
    expect(bar).not.toHaveTextContent("300.000đ");
    unmount();

    render(<PromoBar freeShippingThreshold={null} />);
    // Còn 2 ưu đãi x 3 lần lặp, không đoán số khi chưa có dữ liệu.
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByRole("region", { name: "Ưu đãi" })).not.toHaveTextContent("Miễn phí vận chuyển");
  });

  it("collapses and becomes inert when closed", async () => {
    render(<PromoBar freeShippingThreshold={300000} />);
    const bar = screen.getByRole("region", { name: "Ưu đãi" });
    expect(bar.closest("[inert]")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Đóng thanh ưu đãi" }));

    expect(bar.closest("[inert]")).not.toBeNull();
  });
});
