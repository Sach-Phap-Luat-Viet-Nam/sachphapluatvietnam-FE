import type { ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { StaticPageCreate, StaticPageEdit } from "./StaticPageEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

const PAGE = {
  id: 1,
  slug: "dieu-khoan-su-dung",
  title: "Điều khoản sử dụng",
  description: "Điều kiện sử dụng tài khoản.",
  contentHtml: '<blockquote><p>Bản dự thảo.</p></blockquote><h2 id="pham-vi">Phạm vi áp dụng</h2><p>Đoạn một.</p>',
  isPublished: true,
  createdAt: "2026-11-11T17:00:00Z",
  updatedAt: "2026-11-11T17:00:00Z",
};

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Nhập nội dung qua chế độ mã HTML (jsdom không gõ được vào vùng contenteditable của ProseMirror). */
async function typeHtml(user: ReturnType<typeof userEvent.setup>, html: string) {
  await user.click(await screen.findByRole("button", { name: "Sửa mã HTML" }));
  const source = screen.getByLabelText("Mã HTML của nội dung");
  fireEvent.change(source, { target: { value: html } });
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() =>
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "mkt@sachluat.vn", fullName: "MKT", roles: ["marketing"], requiresTwoFactorSetup: false },
  }),
);
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
  clearSession();
});
afterAll(() => server.close());

describe("StaticPageCreate", () => {
  it("gợi ý slug theo tiêu đề và tạo trang với id cho tiêu đề mục", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/pages`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...PAGE, id: 9 }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<StaticPageCreate />);

    await user.type(screen.getByLabelText("Tiêu đề"), "Chính sách đổi trả");
    expect(screen.getByLabelText("Đường dẫn")).toHaveValue("chinh-sach-doi-tra");
    expect(screen.getByText(/khách chưa\s+xem được/)).toBeInTheDocument();
    await typeHtml(user, "<h2>Điều kiện đổi</h2><p>Trong 7 ngày.</p>");
    await user.click(screen.getByLabelText(/Xuất bản trên website/));
    await user.click(screen.getByRole("button", { name: "Tạo trang" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/noi-dung/trang-tinh"));
    expect(body).toEqual({
      slug: "chinh-sach-doi-tra",
      title: "Chính sách đổi trả",
      description: null,
      contentHtml: '<h2 id="dieu-kien-doi">Điều kiện đổi</h2><p>Trong 7 ngày.</p>',
      isPublished: true,
    });
  });

  it("không cho lưu khi nội dung trống", async () => {
    const user = userEvent.setup();
    renderWithQuery(<StaticPageCreate />);

    await user.type(screen.getByLabelText("Tiêu đề"), "FAQ");
    await user.click(await screen.findByRole("button", { name: "Tạo trang" }));

    expect(await screen.findByText("Anh/chị nhập nội dung trang.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("slug người dùng tự sửa không bị ghi đè khi đổi tiêu đề", async () => {
    const user = userEvent.setup();
    renderWithQuery(<StaticPageCreate />);

    await user.type(screen.getByLabelText("Đường dẫn"), "faq");
    await user.type(screen.getByLabelText("Tiêu đề"), "Câu hỏi thường gặp");

    expect(screen.getByLabelText("Đường dẫn")).toHaveValue("faq");
  });
});

describe("StaticPageEdit", () => {
  it("mở nội dung đã lưu trong trình soạn thảo, giữ id tiêu đề khi lưu", async () => {
    let body: unknown;
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/pages/1`, () => HttpResponse.json(PAGE)),
      http.put(`${ORIGIN}/api/v1/admin/pages/1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...PAGE, updatedAt: "2026-11-26T03:00:00Z" });
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<StaticPageEdit pageId={1} />);

    expect(await screen.findByRole("heading", { name: "Sửa trang “Điều khoản sử dụng”" })).toBeInTheDocument();
    const editor = await screen.findByRole("textbox", { name: "Nội dung" });
    expect(editor.querySelector('h2[id="pham-vi"]')).toHaveTextContent("Phạm vi áp dụng");

    await user.clear(screen.getByLabelText("Tiêu đề"));
    await user.type(screen.getByLabelText("Tiêu đề"), "Điều khoản");
    // Sửa tiêu đề không tự đổi slug của trang đã có.
    expect(screen.getByLabelText("Đường dẫn")).toHaveValue("dieu-khoan-su-dung");
    await user.click(screen.getByRole("button", { name: "Lưu trang" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/noi-dung/trang-tinh"));
    expect(body).toMatchObject({ slug: "dieu-khoan-su-dung", title: "Điều khoản", isPublished: true });
    expect((body as { contentHtml: string }).contentHtml).toContain('<h2 id="pham-vi">Phạm vi áp dụng</h2>');
  });

  it("báo lỗi trùng đường dẫn ngay dưới ô đường dẫn", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/pages/1`, () => HttpResponse.json(PAGE)),
      http.put(`${ORIGIN}/api/v1/admin/pages/1`, () =>
        HttpResponse.json(
          { status: 409, code: "SLUG_DUPLICATE", title: "Đường dẫn đã được trang khác sử dụng" },
          { status: 409, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<StaticPageEdit pageId={1} />);

    const slug = await screen.findByLabelText("Đường dẫn");
    await user.clear(slug);
    await user.type(slug, "chinh-sach-bao-mat");
    expect(screen.getByText(/link cũ \(\/dieu-khoan-su-dung\)/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lưu trang" }));

    expect(await screen.findByText("Slug này đã được dùng, anh/chị chọn slug khác.")).toBeInTheDocument();
    expect(slug).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("trang đã bị xóa thì báo không tìm thấy", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/pages/1`, () =>
        HttpResponse.json(
          { status: 404, code: "NOT_FOUND", title: "Không tìm thấy trang" },
          { status: 404, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    renderWithQuery(<StaticPageEdit pageId={1} />);

    expect(await screen.findByText("Không tìm thấy trang này, có thể đã bị xóa.")).toBeInTheDocument();
  });
});
