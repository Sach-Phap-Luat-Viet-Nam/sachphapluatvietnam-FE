import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { catalogKeys } from "./api";
import type { AdminBook, Edition } from "./schemas";
import { SkuTable } from "./SkuTable";

const ORIGIN = window.location.origin;
const server = setupServer();

const EDITION: Edition = {
  id: 10,
  editionName: "Tái bản lần 3 – 2026",
  isbn: "9780306406157",
  publisher: "NXB Tư pháp",
  publishingDecisionNo: "123/QĐ-NXBTP",
  registrationNo: null,
  publishYear: 2026,
  updatedToText: null,
  updatedToDate: null,
  pages: null,
  size: null,
  weightGram: null,
  coverImageUrl: null,
  previewFileUrl: null,
  tableOfContents: null,
  releaseDate: null,
  isLatest: true,
  status: "on_sale",
  skus: [
    {
      id: 100,
      skuCode: "SLVN-BLDS-2026-BM",
      coverType: "paperback",
      listPrice: 200000,
      salePrice: 150000,
      discountPercent: 25,
      allowPreorder: false,
      inStock: true,
    },
  ],
  legalDocuments: [],
};

function book(edition: Edition): AdminBook {
  return {
    id: 1,
    title: "Bộ luật Dân sự 2026",
    slug: "bo-luat-dan-su-2026",
    description: null,
    bookType: "code",
    status: "active",
    targetAudiences: [],
    metaTitle: null,
    metaDescription: null,
    categories: [],
    authors: [],
    editions: [edition],
    createdAt: "2026-10-23T03:00:00Z",
    updatedAt: "2026-10-24T03:00:00Z",
  };
}

function renderTable() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <SkuTable edition={EDITION} />
    </QueryClientProvider>,
  );
  return client;
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() =>
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "a@sachluat.vn", fullName: "Admin", roles: ["super_admin"], requiresTwoFactorSetup: false },
  }),
);
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("SkuTable", () => {
  it("hiện giá theo VNĐ và tình trạng kho", () => {
    renderTable();

    expect(screen.getByRole("cell", { name: "200.000 ₫" })).toBeVisible();
    expect(screen.getByText("-25%")).toBeVisible();
    expect(screen.getByText("Còn hàng")).toBeVisible();
  });

  it("chỉ cho thêm SKU loại bìa chưa có, kiểm tra giá rồi cập nhật cache đầu sách", async () => {
    let body: unknown;
    const updated = book({
      ...EDITION,
      skus: [
        ...EDITION.skus,
        {
          id: 101,
          skuCode: "SLVN-BLDS-2026-BC",
          coverType: "hardcover",
          listPrice: 300000,
          salePrice: 280000,
          discountPercent: 6,
          allowPreorder: false,
          inStock: false,
        },
      ],
    });
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/editions/10/skus`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(updated, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const client = renderTable();

    await user.click(screen.getByRole("button", { name: "Thêm SKU" }));
    const cover = screen.getByLabelText("Loại bìa");
    expect(cover).toHaveDisplayValue("Bìa cứng");
    expect(screen.queryByRole("option", { name: "Bìa mềm" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Mã SKU"), "slvn-blds-2026-bc");
    await user.type(screen.getByLabelText("Giá bìa"), "300000");
    await user.type(screen.getByLabelText("Giá bán"), "350000");
    await user.click(screen.getByRole("button", { name: "Thêm SKU" }));
    expect(await screen.findByText("Giá bán không được lớn hơn giá bìa.")).toBeVisible();

    await user.clear(screen.getByLabelText("Giá bán"));
    await user.type(screen.getByLabelText("Giá bán"), "280000");
    await user.click(screen.getByRole("button", { name: "Thêm SKU" }));

    await vi.waitFor(() => expect(client.getQueryData(catalogKeys.book(1))).toEqual(updated));
    expect(body).toEqual({
      skuCode: "SLVN-BLDS-2026-BC",
      coverType: "hardcover",
      listPrice: 300000,
      salePrice: 280000,
      allowPreorder: false,
    });
  });

  it("sửa giá SKU và hiện lỗi giá của backend", async () => {
    server.use(
      http.put(`${ORIGIN}/api/v1/admin/skus/100`, () =>
        HttpResponse.json({ status: 422, code: "PRICE_INVALID", title: "Giá không hợp lệ" }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("button", { name: "Sửa giá SLVN-BLDS-2026-BM" }));
    expect(screen.getByLabelText("Giá bìa")).toHaveValue("200000");
    await user.click(screen.getByRole("button", { name: "Lưu giá" }));

    expect(await screen.findByText(/Giá phải là số nguyên VNĐ/)).toBeVisible();
  });
});
