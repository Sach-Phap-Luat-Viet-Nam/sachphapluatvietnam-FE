import { render, screen } from "@testing-library/react";
import { ZaloContact } from "./ZaloContact";

describe("ZaloContact", () => {
  it("links to the consultant's Zalo in a new tab", () => {
    render(<ZaloContact />);
    const link = screen.getByRole("link", { name: "Tư vấn qua Zalo" });
    expect(link).toHaveAttribute("href", "https://zalo.me/0984739739");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
