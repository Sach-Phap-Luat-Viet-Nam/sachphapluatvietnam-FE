import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { MyOrders } from "./MyOrders";

const ORIGIN = window.location.origin;
const server = setupServer();

const SESSION = {
  accessToken: "token-1",
  expiresIn: 900,
  user: {
    id: 12,
    email: "khach@example.com",
    fullName: "Nguyễn Văn A",
    roles: ["customer"],
    requiresTwoFactorSetup: false,
  },
};

function summary(orderCode: string, status: string) {
  return {
    orderCode,
    status,
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    customerName: "Nguyễn Văn A",
    phone: "0901234567",
    itemCount: 3,
    total: 480000,
    createdAt: "2026-10-23T03:00:00Z",
  };
}

function renderOrders(page = 1) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MyOrders page={page} />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("MyOrders", () => {
  it("lists the member's orders with the access token", async () => {
    let authorization: string | null = null;
    let requestedPage: string | null = null;
    server.use(
      http.get(`${ORIGIN}/api/v1/orders`, ({ request }) => {
        authorization = request.headers.get("Authorization");
        requestedPage = new URL(request.url).searchParams.get("Page");
        return HttpResponse.json({
          items: [summary("SLVN2610230002", "shipping"), summary("SLVN2610230001", "cancelled")],
          meta: { page: 2, limit: 10, total: 25 },
        });
      }),
    );
    startSession(SESSION);
    renderOrders(2);

    const first = await screen.findByRole("link", { name: /SLVN2610230002/ });
    expect(first).toHaveAttribute("href", "/don-hang/SLVN2610230002");
    expect(first).toHaveTextContent("Đang giao");
    expect(first).toHaveTextContent("480.000 ₫");
    expect(first).toHaveTextContent("3 cuốn · COD");
    expect(screen.getByRole("link", { name: /SLVN2610230001/ })).toHaveTextContent("Đã hủy");
    expect(authorization).toBe("Bearer token-1");
    expect(requestedPage).toBe("2");

    const pagination = screen.getByRole("navigation", { name: "Phân trang đơn hàng" });
    expect(pagination).toHaveTextContent("Trang 2/3");
    expect(screen.getByRole("link", { name: "Trang trước" })).toHaveAttribute("href", "/don-hang");
    expect(screen.getByRole("link", { name: "Trang sau" })).toHaveAttribute("href", "/don-hang?page=3");
  });

  it("explains where guest orders are when the member has none", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/orders`, () =>
        HttpResponse.json({ items: [], meta: { page: 1, limit: 10, total: 0 } }),
      ),
    );
    startSession(SESSION);
    renderOrders();

    expect(await screen.findByRole("heading", { name: "Bạn chưa có đơn hàng nào" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Tra cứu đơn hàng" })).toHaveAttribute("href", "/don-hang/tra-cuu");
  });

  it("asks guests to sign in and come back", async () => {
    let called = false;
    server.use(
      http.get(`${ORIGIN}/api/v1/orders`, () => {
        called = true;
        return HttpResponse.json({ items: [], meta: { page: 1, limit: 10, total: 0 } });
      }),
    );
    clearSession();
    renderOrders(2);

    expect(await screen.findByRole("heading", { name: "Đăng nhập để xem đơn hàng" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
      "href",
      "/dang-nhap?next=%2Fdon-hang%3Fpage%3D2",
    );
    expect(called).toBe(false);
  });
});
