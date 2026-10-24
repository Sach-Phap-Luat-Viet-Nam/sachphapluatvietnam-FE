import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { cloudinaryFormData, ImageUploadError, optimizedImageUrl, uploadImage } from "./image-upload";

const ORIGIN = window.location.origin;
const UPLOAD_URL = "https://api.cloudinary.com/v1_1/demo/image/upload";
const server = setupServer();

const SIGNATURE = {
  uploadUrl: UPLOAD_URL,
  apiKey: "123",
  timestamp: 1761200000,
  folder: "sachluat/covers",
  allowedFormats: ["jpg", "png", "webp"],
  signature: "abc",
};

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() =>
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "a@sachluat.vn", fullName: "Admin", roles: ["super_admin"], requiresTwoFactorSetup: false },
  }),
);
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("cloudinaryFormData", () => {
  it("gửi đúng các tham số đã ký", () => {
    const form = cloudinaryFormData(new Blob(["x"]), {
      ...SIGNATURE,
      timestamp: "1761200000",
      allowedFormats: "jpg,png,webp",
    });

    expect([...form.keys()]).toEqual(["file", "api_key", "timestamp", "folder", "allowed_formats", "signature"]);
    expect(form.get("allowed_formats")).toBe("jpg,png,webp");
  });
});

describe("uploadImage", () => {
  it("lấy chữ ký theo loại ảnh rồi trả secure_url", async () => {
    const sent: { form?: FormData } = {};
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/uploads/cover-signature`, () => HttpResponse.json(SIGNATURE)),
      http.post(UPLOAD_URL, async ({ request }) => {
        sent.form = await request.formData();
        return HttpResponse.json({ secure_url: "https://res.cloudinary.com/demo/image/upload/v1/a.jpg" });
      }),
    );

    const url = await uploadImage(new File(["x"], "bia.jpg", { type: "image/jpeg" }), "cover");

    expect(url).toBe("https://res.cloudinary.com/demo/image/upload/v1/a.jpg");
    expect(sent.form?.get("timestamp")).toBe("1761200000");
  });

  it("chặn file không phải ảnh trước khi gọi API", async () => {
    await expect(uploadImage(new File(["x"], "a.pdf", { type: "application/pdf" }), "popup")).rejects.toBeInstanceOf(
      ImageUploadError,
    );
  });

  it("báo lỗi khi Cloudinary từ chối", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/uploads/popup-signature`, () => HttpResponse.json(SIGNATURE)),
      http.post(UPLOAD_URL, () => HttpResponse.json({ error: { message: "Invalid" } }, { status: 400 })),
    );

    await expect(
      uploadImage(new File(["x"], "a.png", { type: "image/png" }), "popup"),
    ).rejects.toBeInstanceOf(ImageUploadError);
  });

  it("trả ApiError khi backend chưa cấu hình Cloudinary", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/uploads/cover-signature`, () =>
        HttpResponse.json({ status: 503, code: "UPLOAD_NOT_CONFIGURED", title: "x" }, { status: 503 }),
      ),
    );

    await expect(uploadImage(new File(["x"], "a.png", { type: "image/png" }), "cover")).rejects.toMatchObject({
      status: 503,
    });
  });
});

describe("optimizedImageUrl", () => {
  it("chèn f_auto,q_auto cho link Cloudinary", () => {
    expect(optimizedImageUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg")).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/a.jpg",
    );
  });

  it("giữ nguyên link khác hoặc đã tối ưu", () => {
    expect(optimizedImageUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    const optimized = "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/a.jpg";
    expect(optimizedImageUrl(optimized)).toBe(optimized);
  });
});
