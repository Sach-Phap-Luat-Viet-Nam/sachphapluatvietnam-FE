import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("shows field errors without submitting an empty form", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByText("Anh/chị vui lòng nhập email hợp lệ.")).toBeVisible();
    expect(screen.getByText("Anh/chị vui lòng nhập mật khẩu.")).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("toggles password visibility and explains the demo after valid submission", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "demo@example.com");
    const password = screen.getByLabelText("Mật khẩu");
    await user.type(password, "test-password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("status")).toHaveTextContent("sau khi kết nối backend");
  });
  it("offers buying without an account", () => {
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: "Tiếp tục mua sách không cần đăng nhập" })).toHaveAttribute(
      "href",
      "/sach",
    );
  });
});
