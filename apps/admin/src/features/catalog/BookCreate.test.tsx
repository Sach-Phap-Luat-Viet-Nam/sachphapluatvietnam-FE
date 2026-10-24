import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { BookCreate } from "./BookCreate";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

const CATEGORIES = [
  { id: 3, name: "Dân sự", slug: "dan-su", parentId: null, sortOrder: 1 },
  { id: 7, name: "Hợp đồng", slug: "hop-dong", parentId: 3, sortOrder: 1 },
];
const AUTHORS = {
  items: [{ id: 2, name: "Ban biên tập", slug: "ban-bien-tap", biography: null, sortOrder: 0 }],
  meta: { page: 1, limit: 20, total: 1 },
};

function bookResponse(body: Record<string, unknown>) {
  return {
    id: 41,
    description: null,
    metaTitle: null,
    metaDescription: null,
    targetAudiences: [],
    categories: [],
    authors: [],
    editions: [],
    createdAt: "2026-10-24T03:00:00Z",
    updatedAt: "2026-10-24T03:00:00Z",
    ...body,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BookCreate />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "pm@sachluat.vn", fullName: "PM", roles: ["product_manager"], requiresTwoFactorSetup: false },
  });
  server.use(
    http.get(`${ORIGIN}/api/v1/admin/categories`, () => HttpResponse.json(CATEGORIES)),
    http.get(`${ORIGIN}/api/v1/admin/authors`, () => HttpResponse.json(AUTHORS)),
  );
});
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
  clearSession();
});
afterAll(() => server.close());

describe("BookCreate", () => {
  it("tự gợi ý slug, gửi đúng body rồi chuyển sang màn chi tiết", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/books`, async ({ request }) => {
        const json: Record<string, unknown> = await request.json();
        body = json;
        return HttpResponse.json(bookResponse(json), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Tên sách"), "Bộ luật Dân sự 2026");
    expect(screen.getByLabelText("Slug (đường dẫn)")).toHaveValue("bo-luat-dan-su-2026");
    await user.selectOptions(screen.getByLabelText("Loại sách"), "Chú giải");
    await user.click(screen.getByLabelText("Sinh viên"));
    await user.click(await screen.findByLabelText("Hợp đồng"));
    await user.click(await screen.findByRole("button", { name: "Thêm Ban biên tập" }));
    expect(within(screen.getByRole("list", { name: "Tác giả đã chọn" })).getByText("Ban biên tập")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tạo đầu sách" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/sach/41"));
    expect(body).toEqual({
      title: "Bộ luật Dân sự 2026",
      slug: "bo-luat-dan-su-2026",
      bookType: "commentary",
      status: "draft",
      description: null,
      targetAudiences: ["student"],
      metaTitle: null,
      metaDescription: null,
      categoryIds: [7],
      authorIds: [2],
    });
  });

  it("báo lỗi ở ô slug khi slug đã được dùng", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/books`, () =>
        HttpResponse.json({ status: 409, code: "SLUG_DUPLICATE", title: "Slug đã tồn tại" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Tên sách"), "Luật Đất đai");
    await user.click(screen.getByRole("button", { name: "Tạo đầu sách" }));

    expect(await screen.findByText(/Slug này đã được dùng/)).toBeVisible();
    expect(screen.getByLabelText("Slug (đường dẫn)")).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("kiểm tra dữ liệu trước khi gửi", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Tạo đầu sách" }));

    await vi.waitFor(() =>
      expect(screen.getByLabelText("Tên sách")).toHaveAccessibleDescription("Anh/chị nhập thông tin này."),
    );
    expect(screen.getByLabelText("Tên sách")).toHaveAttribute("aria-invalid", "true");
  });
});
