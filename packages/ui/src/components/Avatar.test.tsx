import { fireEvent, render, screen } from "@testing-library/react";

import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("shows the Cloudinary photo cropped at twice the display size", () => {
    render(
      <Avatar
        name="Nguyễn Văn An"
        url="https://res.cloudinary.com/demo/image/upload/v1/sachluat/avatars/1-ab.jpg"
        size={40}
        alt="Ảnh đại diện"
      />,
    );
    const image = screen.getByRole("img", { name: "Ảnh đại diện" });
    expect(image).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_80,h_80,f_auto,q_auto/v1/sachluat/avatars/1-ab.jpg",
    );
  });

  it("falls back to the initials without a photo or when the photo fails to load", () => {
    const { rerender } = render(<Avatar name="Nguyễn Văn An" url={null} size={40} alt="Ảnh đại diện" />);
    expect(screen.getByRole("img", { name: "Ảnh đại diện" })).toHaveTextContent("NA");

    rerender(<Avatar name="Nguyễn Văn An" url="https://example.com/missing.png" size={40} alt="Ảnh đại diện" />);
    fireEvent.error(screen.getByRole("img", { name: "Ảnh đại diện" }));
    expect(screen.getByRole("img", { name: "Ảnh đại diện" })).toHaveTextContent("NA");
  });
});
