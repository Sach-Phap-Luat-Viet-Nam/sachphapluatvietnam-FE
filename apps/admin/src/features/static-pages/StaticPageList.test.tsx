import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { StaticPageList } from "./StaticPageList";

const ORIGIN = window.location.origin;
const server = setupServer();

const ITEMS = [
  {
    id: 2,
    slug: "chinh-sach-bao-mat",
    title: "Chính sách bảo mật",
    isPublished: true,
    updatedAt: "2026-11-11T17:00:00Z",
  },
  { id: 3, slug: "faq", title: "Câu hỏi thường gặp", isPublished: false, updatedAt: "2026-11-20T03:00:00Z" },
];

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
  clearSession();
});
afterAll(() => server.close());

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StaticPageList />
    </QueryClientProvider>,
  );
}

/** Dòng thứ `index` của danh sách trang. */
async function row(index: number): Promise<HTMLElement> {
  const list = await screen.findByRole("list", { name: "Danh sách trang tĩnh" });
  const item = within(list).getAllByRole("listitem")[index];
  if (!item) throw new Error(`Không có dòng ${index}`);
  return item;
}

describe("StaticPageList", () => {
  it("liệt kê trang với trạng thái xuất bản và link sửa", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/pages`, () =>
        HttpResponse.json({ items: ITEMS, meta: { page: 1, limit: 20, total: 2 } }),
      ),
    );
    renderList();

    const privacy = await row(0);
    const faq = await row(1);
    expect(within(privacy).getByText("Đang hiển thị")).toBeInTheDocument();
    expect(within(faq).getByText("Chưa xuất bản")).toBeInTheDocument();
    expect(within(faq).getByRole("link", { name: "Sửa trang Câu hỏi thường gặp" })).toHaveAttribute(
      "href",
      "/noi-dung/trang-tinh/3",
    );
  });

  it("xóa trang sau khi xác nhận rồi tải lại danh sách", async () => {
    let deleted: string | undefined;
    let items = ITEMS;
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/pages`, () =>
        HttpResponse.json({ items, meta: { page: 1, limit: 20, total: items.length } }),
      ),
      http.delete(`${ORIGIN}/api/v1/admin/pages/:id`, ({ params }) => {
        deleted = String(params.id);
        items = ITEMS.filter((item) => String(item.id) !== deleted);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderList();

    const faq = await row(1);
    await user.click(within(faq).getByRole("button", { name: "Xóa" }));
    const confirm = within(faq).getByRole("group", { name: /Xóa trang “Câu hỏi thường gặp”/ });
    await user.click(within(confirm).getByRole("button", { name: "Xóa" }));

    await vi.waitFor(() => expect(screen.queryByText("Câu hỏi thường gặp")).not.toBeInTheDocument());
    expect(deleted).toBe("3");
  });
});
