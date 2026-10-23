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
});
