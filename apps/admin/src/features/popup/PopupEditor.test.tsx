import type { ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
    await user.type(screen.getByLabelText("Bắt đầu (giờ Việt Nam)"), "01/11/2026 00:00");
    await user.type(screen.getByLabelText(/Kết thúc \(giờ Việt Nam\)/), "30/11/2026 23:59");
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

  it("ô ngày giờ tự thêm dấu phân cách khi gõ số liền, báo lỗi khi gõ dở hoặc ngày không có thật", async () => {
    const create = vi.fn(() => HttpResponse.json(POPUP, { status: 201 }));
    server.use(http.post(`${ORIGIN}/api/v1/admin/popups`, create));
    const user = userEvent.setup();
    renderWithQuery(<PopupCreate />);

    await user.type(screen.getByLabelText("Tiêu đề"), "Sale");
    await user.type(screen.getByLabelText("Hoặc dán link ảnh"), IMAGE);
    const starts = screen.getByLabelText("Bắt đầu (giờ Việt Nam)");
    await user.clear(starts);
    await user.type(starts, "010120260800");
    expect(starts).toHaveValue("01/01/2026 08:00");

    const ends = screen.getByLabelText(/Kết thúc \(giờ Việt Nam\)/);
    await user.type(ends, "31022026");
    await user.click(screen.getByRole("button", { name: "Tạo popup" }));
    expect(await screen.findByText(/Nhập thời điểm kết thúc dạng dd\/mm\/yyyy hh:mm/)).toBeVisible();

    await user.type(ends, "2359");
    expect(ends).toHaveValue("31/02/2026 23:59");
    await user.click(screen.getByRole("button", { name: "Tạo popup" }));
    expect(await screen.findByText(/Nhập thời điểm kết thúc dạng dd\/mm\/yyyy hh:mm/)).toBeVisible();
    expect(create).not.toHaveBeenCalled();

    // Kết thúc trước bắt đầu cũng bị chặn.
    await user.clear(ends);
    await user.type(ends, "311220250000");
    await user.click(screen.getByRole("button", { name: "Tạo popup" }));
    expect(await screen.findByText("Thời điểm kết thúc phải sau thời điểm bắt đầu.")).toBeVisible();
    expect(create).not.toHaveBeenCalled();
  });

  it("tiêu đề là ô nhiều dòng, xuống dòng được đổi thành khoảng trắng khi gửi", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/popups`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(POPUP, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<PopupCreate />);

    const title = screen.getByLabelText("Tiêu đề");
    expect(title.tagName).toBe("TEXTAREA");
    await user.type(title, "Miễn phí vận chuyển{Enter}cho đơn từ 300.000đ");
    await user.type(screen.getByLabelText("Hoặc dán link ảnh"), IMAGE);
    await user.click(screen.getByRole("button", { name: "Tạo popup" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/noi-dung/popup"));
    expect(body).toMatchObject({ title: "Miễn phí vận chuyển cho đơn từ 300.000đ", endsAt: null });
  });

  it("nút lịch mở bộ chọn của trình duyệt và đổ giá trị về ô chữ", async () => {
    const user = userEvent.setup();
    renderWithQuery(<PopupCreate />);
    const picker = document.querySelector<HTMLInputElement>("#popup-ends + button + input[type=datetime-local]");
    expect(picker).not.toBeNull();
    const showPicker = vi.fn();
    if (picker) {
      picker.showPicker = showPicker;
    }

    const calendars = screen.getAllByRole("button", { name: "Chọn ngày giờ từ lịch" });
    expect(calendars).toHaveLength(2);
    // Nút thứ hai là của ô Kết thúc.
    await user.click(calendars.at(-1) as HTMLElement);
    expect(showPicker).toHaveBeenCalledTimes(1);

    fireEvent.change(picker as HTMLInputElement, { target: { value: "2026-12-20T18:30" } });
    expect(screen.getByLabelText(/Kết thúc \(giờ Việt Nam\)/)).toHaveValue("20/12/2026 18:30");
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
    expect(screen.getByLabelText("Bắt đầu (giờ Việt Nam)")).toHaveValue("01/11/2026 00:00");
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
