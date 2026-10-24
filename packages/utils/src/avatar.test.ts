import { avatarImageUrl, nameInitials } from "./avatar";

describe("avatarImageUrl", () => {
  it("crops Cloudinary images square around the face at the requested size", () => {
    expect(
      avatarImageUrl("https://res.cloudinary.com/demo/image/upload/v1712345678/sachluat/avatars/42-ab.jpg", 72),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_72,h_72,f_auto,q_auto/v1712345678/sachluat/avatars/42-ab.jpg",
    );
  });

  it("leaves other links untouched", () => {
    expect(avatarImageUrl("https://example.com/avatar.png", 72)).toBe("https://example.com/avatar.png");
    expect(avatarImageUrl("https://res.cloudinary.com/demo/video/upload/v1/a.mp4", 72)).toBe(
      "https://res.cloudinary.com/demo/video/upload/v1/a.mp4",
    );
  });
});

describe("nameInitials", () => {
  it("takes the first letters of the first and last words", () => {
    expect(nameInitials("Nguyễn Văn An")).toBe("NA");
    expect(nameInitials("  ánh   đào ")).toBe("ÁĐ");
  });

  it("handles single-word and empty names", () => {
    expect(nameInitials("Phát")).toBe("P");
    expect(nameInitials("   ")).toBe("");
  });
});
