import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { CategoryManager } from "./CategoryManager";

const ORIGIN = window.location.origin;
const server = setupServer();

let categories = [
  { id: 3, name: "Dân sự", slug: "dan-su", parentId: null, sortOrder: 1 },
  { id: 7, name: "Hợp đồng", slug: "hop-dong", parentId: 3, sortOrder: 1 },
];

function renderManager() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CategoryManager />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  categories = [
    { id: 3, name: "Dân sự", slug: "dan-su", parentId: null, sortOrder: 1 },
    { id: 7, name: "Hợp đồng", slug: "hop-dong", parentId: 3, sortOrder: 1 },
  ];
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "a@sachluat.vn", fullName: "Admin", roles: ["super_admin"], requiresTwoFactorSetup: false },
  });
  server.use(http.get(`${ORIGIN}/api/v1/admin/categories`, () => HttpResponse.json(categories)));
});
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("CategoryManager", () => {
  it("thêm danh mục con, slug tự tạo từ tên", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/categories`, async ({ request }) => {
        body = await request.json();
        const created = { id: 9, name: "Thừa kế", slug: "thua-ke", parentId: 3, sortOrder: 2 };
        categories = [...categories, created];
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Thêm danh mục" }));
    await user.type(screen.getByLabelText("Tên danh mục"), "Thừa kế");
    expect(screen.getByLabelText("Slug")).toHaveValue("thua-ke");
    await user.selectOptions(screen.getByLabelText("Danh mục cha"), "Dân sự");
    await user.clear(screen.getByLabelText("Thứ tự"));
    await user.type(screen.getByLabelText("Thứ tự"), "2");
    await user.click(screen.getByRole("button", { name: "Thêm danh mục" }));

    expect(await screen.findByText("Thừa kế")).toBeVisible();
    expect(body).toEqual({ name: "Thừa kế", slug: "thua-ke", parentId: 3, sortOrder: 2 });
  });

  it("không cho chọn chính nó hoặc con cháu làm danh mục cha", async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Sửa Dân sự" }));

    const parent = screen.getByLabelText("Danh mục cha");
    expect(
      within(parent)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["— Danh mục gốc —"]);
  });

  it("hỏi xác nhận trước khi xóa và báo lỗi khi còn danh mục con", async () => {
    const remove = vi.fn(() =>
      HttpResponse.json(
        { status: 409, code: "CATEGORY_HAS_CHILDREN", title: "Danh mục còn danh mục con" },
        { status: 409 },
      ),
    );
    server.use(http.delete(`${ORIGIN}/api/v1/admin/categories/3`, remove));
    const user = userEvent.setup();
    renderManager();

    const row = (await screen.findByText("Dân sự")).closest("li");
    expect(row).not.toBeNull();
    await user.click(within(row ?? document.body).getByRole("button", { name: "Xóa" }));
    expect(remove).not.toHaveBeenCalled();

    const confirm = screen.getByRole("group", { name: "Xóa danh mục “Dân sự”?" });
    expect(within(confirm).getByRole("button", { name: "Xóa" })).toHaveFocus();
    await user.click(within(confirm).getByRole("button", { name: "Xóa" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Danh mục còn danh mục con");
    expect(remove).toHaveBeenCalledOnce();
  });
});
