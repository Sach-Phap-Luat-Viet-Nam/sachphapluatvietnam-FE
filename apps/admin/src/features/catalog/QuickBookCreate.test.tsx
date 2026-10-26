import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { QuickBookCreate } from "./QuickBookCreate";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

const CATEGORIES = [{ id: 3, name: "Dân sự", slug: "dan-su", parentId: null, sortOrder: 1 }];
const AUTHOR = { id: 2, name: "Ban biên tập", slug: "ban-bien-tap", biography: null, sortOrder: 0 };

function bookResponse() {
  return {
    id: 41,
    title: "Luật Quản lý nợ công",
    slug: "luat-quan-ly-no-cong",
    description: null,
    bookType: "code",
    status: "active",
    targetAudiences: [],
    metaTitle: null,
    metaDescription: null,
    categories: [],
    authors: [],
    editions: [],
    createdAt: "2026-10-24T03:00:00Z",
    updatedAt: "2026-10-24T03:00:00Z",
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <QuickBookCreate />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  localStorage.clear();
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "pm@sachluat.vn", fullName: "PM", roles: ["product_manager"], requiresTwoFactorSetup: false },
  });
  server.use(
    http.get(`${ORIGIN}/api/v1/admin/categories`, () => HttpResponse.json(CATEGORIES)),
    http.get(`${ORIGIN}/api/v1/admin/authors`, () =>
      HttpResponse.json({ items: [AUTHOR], meta: { page: 1, limit: 20, total: 1 } }),
    ),
  );
});
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
  clearSession();
});
afterAll(() => server.close());

describe("QuickBookCreate", () => {
  it("nhập sách, ấn bản và SKU trong một màn rồi gửi một request tạo trọn gói", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/books/quick`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(bookResponse(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Tên sách"), "Luật Quản lý nợ công");
    expect(screen.getByLabelText("Slug (đường dẫn)")).toHaveValue("luat-quan-ly-no-cong");
    await user.click(await screen.findByRole("checkbox", { name: "Dân sự" }));
    await user.click(await screen.findByRole("button", { name: "Thêm Ban biên tập" }));

    await user.type(screen.getByLabelText("ISBN-13"), "978-0-306-40615-7");
    await user.type(screen.getByLabelText("Số quyết định xuất bản (QĐXB)"), "123/QĐ-NXBTC");
    await user.type(screen.getByLabelText("Nhà xuất bản"), "NXB Tài Chính");
    await user.type(screen.getByLabelText("Mã SKU"), "pl250-bm");
    await user.type(screen.getByLabelText("Giá bìa (VNĐ)"), "250000");
    await user.tab();
    // Giá bán thường bằng giá bìa nên được điền sẵn.
    expect(screen.getByLabelText("Giá bán (VNĐ)")).toHaveValue("250000");
    await user.clear(screen.getByLabelText("Giá bán (VNĐ)"));
    await user.type(screen.getByLabelText("Giá bán (VNĐ)"), "199000");
    await user.click(screen.getByRole("button", { name: "Tạo sách" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/sach/41"));
    expect(body).toMatchObject({
      book: {
        title: "Luật Quản lý nợ công",
        slug: "luat-quan-ly-no-cong",
        bookType: "code",
        status: "active",
        categoryIds: [3],
        authorIds: [2],
      },
      edition: {
        isbn: "9780306406157",
        publisher: "NXB Tài Chính",
        publishingDecisionNo: "123/QĐ-NXBTC",
        status: "on_sale",
      },
      skus: [{ skuCode: "PL250-BM", coverType: "paperback", listPrice: 250000, salePrice: 199000 }],
    });
    expect(localStorage.getItem("slvn.admin.last-publisher")).toBe("NXB Tài Chính");
  });

  it("bỏ chọn đăng bán ngay thì lưu ở trạng thái nháp", async () => {
    let body: { book: { status: string }; edition: { status: string } } | undefined;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/books/quick`, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return HttpResponse.json(bookResponse(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Tên sách"), "Sách nháp");
    await user.type(screen.getByLabelText("ISBN-13"), "9780306406157");
    await user.type(screen.getByLabelText("Số quyết định xuất bản (QĐXB)"), "1/QĐ");
    await user.type(screen.getByLabelText("Nhà xuất bản"), "NXB A");
    await user.type(screen.getByLabelText("Mã SKU"), "SACH-NHAP");
    await user.type(screen.getByLabelText("Giá bìa (VNĐ)"), "100000");
    await user.click(screen.getByRole("checkbox", { name: /Hiển thị và mở bán ngay/ }));
    await user.click(screen.getByRole("button", { name: "Tạo sách" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalled());
    expect(body?.book.status).toBe("draft");
    expect(body?.edition.status).toBe("draft");
  });

  it("điền sẵn nhà xuất bản lần trước và báo lỗi từng ô khi thiếu", async () => {
    localStorage.setItem("slvn.admin.last-publisher", "NXB Tài Chính");
    const create = vi.fn(() => HttpResponse.json(bookResponse(), { status: 201 }));
    server.use(http.post(`${ORIGIN}/api/v1/admin/books/quick`, create));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByLabelText("Nhà xuất bản")).toHaveValue("NXB Tài Chính");
    await user.click(screen.getByRole("button", { name: "Tạo sách" }));

    expect(await screen.findByText(/ISBN-13 gồm 13 số/)).toBeVisible();
    expect(screen.getAllByText("Anh/chị nhập thông tin này.").length).toBeGreaterThan(0);
    expect(create).not.toHaveBeenCalled();
  });

  it("thêm SKU bìa cứng rồi chặn trùng loại bìa", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Thêm SKU bìa cứng" }));

    expect(screen.getAllByLabelText("Mã SKU")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Thêm SKU/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa SKU 2" })).toBeVisible();
  });

  it("tạo nhanh tác giả mới ngay trong ô chọn", async () => {
    let created: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/authors`, async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({
          id: 9,
          name: "Nguyễn Văn Mới",
          slug: "nguyen-van-moi",
          biography: null,
          sortOrder: 0,
        });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Tìm tác giả"), "Nguyễn Văn Mới");
    await user.click(await screen.findByRole("button", { name: "Tạo mới “Nguyễn Văn Mới”" }));

    expect(await screen.findByRole("button", { name: "Bỏ Nguyễn Văn Mới" })).toBeVisible();
    expect(created).toEqual({ name: "Nguyễn Văn Mới", slug: "nguyen-van-moi", biography: null, sortOrder: 0 });
  });
});
