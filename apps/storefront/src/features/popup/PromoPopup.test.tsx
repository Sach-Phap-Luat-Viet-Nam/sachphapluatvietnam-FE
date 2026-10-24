import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { PromoPopup } from "./PromoPopup";

const ORIGIN = window.location.origin;
const server = setupServer();

const POPUP = {
  id: 5,
  title: "Sale sách luật mùa thi",
  imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/sachluat/popups/mua-thi.jpg",
  linkUrl: "/khuyen-mai",
  displayFrequency: "once_per_session",
  updatedAt: "2026-11-01T02:00:00Z",
};

function activePopup(body: Record<string, unknown> | null) {
  return http.get(`${ORIGIN}/api/v1/popups/active`, () =>
    body ? HttpResponse.json(body) : new HttpResponse(null, { status: 204 }),
  );
}

/** Ảnh trong jsdom không tự tải: giả lập tải xong rồi chờ popup mở (`next/image` gọi `onLoad` sau `decode()`). */
async function loadImage() {
  fireEvent.load(await screen.findByRole("img", { hidden: true }));
  await vi.waitFor(() => expect(screen.getByRole("dialog")).toHaveAttribute("open"));
}

beforeAll(() => {
  // jsdom chưa cài đặt <dialog>.showModal() và close().
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
  server.listen({ onUnhandledFrame: "error" });
});
afterEach(() => {
  server.resetHandlers();
  sessionStorage.clear();
  localStorage.clear();
});
afterAll(() => server.close());

describe("PromoPopup", () => {
  it("mở popup khi ảnh tải xong, có link và nút đóng", async () => {
    server.use(activePopup(POPUP));
    const user = userEvent.setup();
    render(<PromoPopup />);

    await loadImage();
    const dialog = screen.getByRole("dialog", { name: "Sale sách luật mùa thi" });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: "Xem chi tiết" })).toHaveAttribute("href", "/khuyen-mai");

    await user.click(screen.getByRole("button", { name: "Đóng quảng cáo" }));
    expect(dialog).not.toHaveAttribute("open");
  });

  it("không hiện lại trong cùng phiên với once_per_session", async () => {
    let requests = 0;
    server.use(
      http.get(`${ORIGIN}/api/v1/popups/active`, () => {
        requests += 1;
        return HttpResponse.json(POPUP);
      }),
    );
    const { unmount } = render(<PromoPopup />);
    await loadImage();
    unmount();

    render(<PromoPopup />);
    await vi.waitFor(() => expect(requests).toBe(2));
    // Cho promise sau request chạy xong: popup đã xem thì không render ảnh.
    await Promise.resolve();
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
  });

  it("mở link ngoài ở tab mới", async () => {
    server.use(activePopup({ ...POPUP, linkUrl: "https://zalo.me/sachluat" }));
    render(<PromoPopup />);

    await loadImage();
    const cta = screen.getByRole("link", { name: "Xem chi tiết" });
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("bỏ link không an toàn, chỉ hiện ảnh", async () => {
    server.use(activePopup({ ...POPUP, linkUrl: "javascript:alert(1)" }));
    render(<PromoPopup />);

    await loadImage();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("không render gì khi không có popup (204)", async () => {
    const request = vi.fn();
    server.use(
      http.get(`${ORIGIN}/api/v1/popups/active`, () => {
        request();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { container } = render(<PromoPopup />);

    await vi.waitFor(() => expect(request).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
