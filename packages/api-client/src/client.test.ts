import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { ApiError } from "./api-error";
import { createApiClient, unwrap } from "./client";

const BASE_URL = "http://api.test";
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const api = createApiClient({ baseUrl: BASE_URL });

describe("unwrap", () => {
  it("trả data khi backend trả 200", async () => {
    server.use(http.get(`${BASE_URL}/api/v1/categories`, () => HttpResponse.json([])));

    await expect(unwrap(api.GET("/api/v1/categories"))).resolves.toEqual([]);
  });

  it("ném ApiError theo ProblemDetails khi backend trả lỗi nghiệp vụ", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v1/cart/items`, () =>
        HttpResponse.json(
          {
            type: "https://sachluat.vn/errors/out-of-stock",
            title: "Sách đã hết hàng hoặc không đủ số lượng",
            status: 409,
            code: "OUT_OF_STOCK",
            traceId: "00-abc",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    const error = await unwrap(api.POST("/api/v1/cart/items", { body: { skuId: 1, quantity: 99 } })).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "OUT_OF_STOCK",
      title: "Sách đã hết hàng hoặc không đủ số lượng",
      traceId: "00-abc",
    });
  });

  it("ném ApiError khi lỗi không có body", async () => {
    server.use(http.get(`${BASE_URL}/api/v1/me`, () => new HttpResponse(null, { status: 401 })));

    await expect(unwrap(api.GET("/api/v1/me"))).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
  });
});
