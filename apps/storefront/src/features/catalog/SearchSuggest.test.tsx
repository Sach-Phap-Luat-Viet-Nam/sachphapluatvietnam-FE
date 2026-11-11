import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { SearchSuggest } from "./SearchSuggest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

function summary(id: number, title: string, slug: string) {
  return {
    id,
    title,
    slug,
    bookType: "code",
    skuCode: null,
    editionName: "Tái bản lần 3",
    publishYear: 2026,
    coverImageUrl: null,
    updatedToText: null,
    editionStatus: "on_sale",
    salePrice: 150000,
    listPrice: 200000,
    discountPercent: 25,
    saleEndsAt: null,
    inStock: true,
  };
}

function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <form action="/sach">
        <label htmlFor="q">Tìm sách</label>
        <SearchSuggest inputId="q" placeholder="Tên sách" maxLength={200} />
      </form>
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
});
afterAll(() => server.close());

describe("SearchSuggest", () => {
  it("suggests matching books and opens the one picked with the keyboard", async () => {
    let query = "";
    server.use(
      http.get(`${ORIGIN}/api/v1/books`, ({ request }) => {
        query = new URL(request.url).searchParams.toString();
        return HttpResponse.json({
          items: [
            summary(1, "Bộ luật Dân sự 2026", "bo-luat-dan-su"),
            summary(2, "Dân sự chú giải", "dan-su-chu-giai"),
          ],
          meta: { page: 1, limit: 5, total: 2 },
        });
      }),
    );
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByRole("combobox", { name: "Tìm sách" });
    await user.type(input, "dân sự");

    expect(await screen.findByRole("option", { name: /Bộ luật Dân sự 2026/ })).toBeVisible();
    expect(screen.getByRole("option", { name: "Xem tất cả kết quả cho “dân sự”" })).toBeVisible();
    expect(new URLSearchParams(query).get("Q")).toBe("dân sự");

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("option", { name: /Dân sự chú giải/ })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/sach/dan-su-chu-giai");
  });

  it("hints at Vietnamese accents when an unaccented search finds nothing", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/books`, () => HttpResponse.json({ items: [], meta: { page: 1, limit: 5, total: 0 } })),
    );
    const user = userEvent.setup();
    renderSearch();

    await user.type(screen.getByRole("combobox"), "bo luat");

    expect(await screen.findByText(/tìm theo tiếng Việt có dấu/)).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("does not call the API for a single character", async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole("combobox"), "d");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });
});
