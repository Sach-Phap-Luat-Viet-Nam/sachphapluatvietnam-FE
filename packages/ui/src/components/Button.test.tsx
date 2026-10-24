import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button, buttonClassName } from "./Button";

describe("Button", () => {
  it("mặc định là type=button để không submit form", () => {
    render(<Button>Thêm vào giỏ</Button>);

    expect(screen.getByRole("button", { name: "Thêm vào giỏ" })).toHaveAttribute("type", "button");
  });

  it("gọi onClick khi bấm", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Mua ngay</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Mua ngay" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("không gọi onClick khi disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Đặt hàng
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("buttonClassName", () => {
  it("class truyền vào ghi đè class mặc định cùng nhóm", () => {
    expect(buttonClassName({ className: "px-8" })).toContain("px-8");
    expect(buttonClassName({ className: "px-8" })).not.toContain("px-4");
  });

  it("nút viền cho thao tác nguy hiểm và tích cực dùng màu danger và success", () => {
    expect(buttonClassName({ variant: "danger-outline" })).toContain("text-danger");
    expect(buttonClassName({ variant: "danger-outline" })).toContain("border-danger/50");
    expect(buttonClassName({ variant: "success-outline" })).toContain("text-success");
    expect(buttonClassName({ variant: "success-outline" })).toContain("border-success/50");
  });
});
