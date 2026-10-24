import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { PopupCreate, PopupEdit } from "./PopupEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const ORIGIN = window.location.origin;
const IMAGE = "https://res.cloudinary.com/demo/image/upload/v1/sachluat/popups/mua-thi.jpg";
const server = setupServer();

const POPUP = {
  id: 5,
  title: "Sale mùa thi",
  imageUrl: IMAGE,
  linkUrl: "/khuyen-mai",
  startsAt: "2026-10-31T17:00:00Z",
  endsAt: null,
  isActive: true,
  priority: 10,
  displayFrequency: "once_per_session",
  status: "running",
  createdAt: "2026-10-24T03:00:00Z",
  updatedAt: "2026-10-24T03:00:00Z",
};

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
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

describe("PopupCreate", () => {
  it("tạo popup với lịch chạy theo giờ Việt Nam", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/popups`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(POPUP, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<PopupCreate />);

    await user.type(screen.getByLabelText("Tiêu đề"), "Sale mùa thi");
    await user.type(screen.getByLabelText("Hoặc dán link ảnh"), IMAGE);
    await user.type(screen.getByLabelText(/Link khi bấm vào ảnh/), "/khuyen-mai");
    await user.clear(screen.getByLabelText("Bắt đầu (giờ Việt Nam)"));
    await user.type(screen.getByLabelText("Bắt đầu (giờ Việt Nam)"), "2026-11-01T00:00");
    await user.type(screen.getByLabelText(/Kết thúc \(giờ Việt Nam\)/), "2026-11-30T23:59");
    await user.clear(screen.getByLabelText("Độ ưu tiên"));
    await user.type(screen.getByLabelText("Độ ưu tiên"), "10");
    await user.click(screen.getByLabelText("Một lần mỗi phiên trình duyệt"));
    await user.click(screen.getByRole("button", { name: "Tạo popup" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/noi-dung/popup"));
    expect(body).toEqual({
      title: "Sale mùa thi",
      imageUrl: IMAGE,
      linkUrl: "/khuyen-mai",
      startsAt: "2026-11-01T00:00:00+07:00",
      endsAt: "2026-11-30T23:59:00+07:00",
      isActive: true,
      priority: 10,
      displayFrequency: "once_per_session",
    });
  });

  it("chặn link không an toàn trước khi gửi", async () => {
    const create = vi.fn(() => HttpResponse.json(POPUP, { status: 201 }));
    server.use(http.post(`${ORIGIN}/api/v1/admin/popups`, create));
    const user = userEvent.setup();
    renderWithQuery(<PopupCreate />);

    await user.type(screen.getByLabelText("Tiêu đề"), "Sale");
    await user.type(screen.getByLabelText("Hoặc dán link ảnh"), IMAGE);
    await user.type(screen.getByLabelText(/Link khi bấm vào ảnh/), "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: "Tạo popup" }));

    expect(await screen.findByText(/Nhập đường dẫn trong site/)).toBeVisible();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("PopupEdit", () => {
  it("điền sẵn dữ liệu theo giờ Việt Nam và lưu", async () => {
    let body: unknown;
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/popups/5`, () => HttpResponse.json(POPUP)),
      http.put(`${ORIGIN}/api/v1/admin/popups/5`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...POPUP, isActive: false, status: "inactive" });
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<PopupEdit popupId={5} />);

    expect(await screen.findByRole("heading", { name: "Sửa popup “Sale mùa thi”" })).toBeVisible();
    expect(screen.getByText("Đang chạy")).toBeVisible();
    expect(screen.getByLabelText("Bắt đầu (giờ Việt Nam)")).toHaveValue("2026-11-01T00:00");
    await user.click(screen.getByLabelText("Bật popup"));
    await user.click(screen.getByRole("button", { name: "Lưu popup" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/noi-dung/popup"));
    expect(body).toMatchObject({ isActive: false, startsAt: "2026-11-01T00:00:00+07:00", endsAt: null });
  });

  it("báo không tìm thấy khi popup đã bị xóa", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/popups/9`, () =>
        HttpResponse.json({ status: 404, code: "NOT_FOUND", title: "Not found" }, { status: 404 }),
      ),
    );
    renderWithQuery(<PopupEdit popupId={9} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy popup này");
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
  });
});
