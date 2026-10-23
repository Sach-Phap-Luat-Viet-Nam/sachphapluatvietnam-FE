import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, LibraryBig, SearchX, ShieldCheck, Truck } from "lucide-react";
import { Container } from "@slvn/ui";
import { CatalogFilters } from "@/features/catalog/CatalogFilters";
import { BookCard } from "@/features/catalog/BookCard";
import { getBooks, getCategoryTree } from "@/features/catalog/api";
import {
  SORT_LABELS,
  catalogHref,
  flattenCategories,
  pageCount,
  pageWindow,
  param,
  toBooksQuery,
} from "@/features/catalog/catalog";
import type { CatalogParams } from "@/features/catalog/catalog";

export function generateMetadata(): Metadata {
  return {
    title: "Tủ sách pháp luật",
    alternates: { canonical: "/sach" },
    openGraph: {
      title: "Tủ sách pháp luật | Sách Luật Việt Nam",
      description: "Tìm bộ luật, văn bản pháp luật, chú giải và giáo trình phù hợp với bạn.",
      locale: "vi_VN",
      type: "website",
    },
  };
}

export default async function BooksPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams;
  const [books, categoryTree] = await Promise.all([getBooks(toBooksQuery(params)), getCategoryTree()]);
  const { page, limit, total } = books.meta;
  const totalPages = pageCount(total, limit);
  const firstShown = (page - 1) * limit + 1;
  const hasFilters = Object.keys(params).some((key) => key !== "page" && key !== "sort" && param(params, key));
  return (
    <main id="noi-dung">
      <section className="border-border bg-paper overflow-hidden border-b">
        <Container className="relative py-9 sm:py-12">
          <div className="text-muted mb-7 flex items-center gap-2 text-xs">
            <Link href="/">Trang chủ</Link>
            <ChevronRight size={12} />
            <span className="text-primary">Tủ sách pháp luật</span>
          </div>
          <div className="relative z-10 max-w-2xl">
            <p className="text-accent mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.18em]">
              <span className="bg-accent h-px w-7" /> HIỂU LUẬT ĐỂ VỮNG BƯỚC
            </p>
            <h1 className="font-editorial text-primary text-4xl leading-tight sm:text-5xl">
              Tủ sách <span className="italic">pháp luật.</span>
            </h1>
            <p className="text-muted mt-4 max-w-lg leading-7">
              Từ kiến thức nền tảng đến góc nhìn chuyên sâu.
              <br className="hidden sm:block" /> Tìm cuốn sách đồng hành cùng công việc và cuộc sống của bạn.
            </p>
          </div>
          <LibraryBig
            aria-hidden="true"
            className="text-primary/10 absolute right-8 bottom-0 hidden size-52 rotate-[-10deg] md:block"
            strokeWidth={0.7}
          />
        </Container>
      </section>
      <Container className="py-8 sm:py-10">
        <div className="grid items-start gap-8 lg:grid-cols-[215px_1fr] lg:gap-10">
          <aside aria-label="Lọc danh sách sách">
            <CatalogFilters key={JSON.stringify(params)} params={params} categories={flattenCategories(categoryTree)} />
            <div className="bg-primary text-primary-foreground mt-7 hidden rounded-lg p-5 lg:block">
              <BookOpen size={27} strokeWidth={1.3} />
              <h2 className="font-editorial mt-4 text-xl">
                Một cuốn sách hay.
                <br />
                Một nền tảng vững.
              </h2>
              <p className="text-primary-foreground/70 mt-3 text-xs leading-6">
                Tra cứu thuận tiện, học tập hiệu quả, tự tin áp dụng pháp luật.
              </p>
            </div>
          </aside>
          <section aria-label="Danh sách sách">
            <div className="border-border mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
              <div>
                <h2 className="text-primary text-xl font-semibold">
                  {param(params, "q") ? `Kết quả cho “${param(params, "q")}”` : "Tất cả sách luật"}
                </h2>
                <p className="text-muted mt-1 text-xs">
                  {total} cuốn sách
                  {books.items.length ? ` · Hiển thị ${firstShown}–${firstShown + books.items.length - 1}` : ""}
                </p>
              </div>
              <form action="/sach" className="flex flex-wrap items-center gap-2">
                {Object.entries(params)
                  .filter(([key, value]) => key !== "sort" && key !== "page" && typeof value === "string")
                  .map(([key, value]) => (
                    <input type="hidden" key={key} name={key} value={typeof value === "string" ? value : ""} />
                  ))}
                <label htmlFor="sort" className="sr-only">
                  Sắp xếp sách
                </label>
                <select
                  id="sort"
                  name="sort"
                  defaultValue={param(params, "sort") || "newest"}
                  className="border-border bg-background h-10 rounded-md border px-3 text-sm"
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  aria-label="Áp dụng sắp xếp"
                  className="border-border text-primary hover:bg-surface rounded-md border p-2.5"
                >
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
            {books.items.length ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-6 xl:grid-cols-4">
                {books.items.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
                <SearchX size={40} strokeWidth={1} className="text-muted" />
                {hasFilters || page > 1 ? (
                  <>
                    <h3 className="text-primary text-xl font-semibold">Chưa tìm thấy sách phù hợp</h3>
                    <p className="text-muted text-sm">Thử từ khóa khác hoặc bỏ bớt bộ lọc.</p>
                    <Link href="/sach" className="text-accent font-medium underline underline-offset-4">
                      Xem tất cả sách
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="text-primary text-xl font-semibold">Tủ sách đang được cập nhật</h3>
                    <p className="text-muted text-sm">Sách sẽ sớm có mặt, mời bạn quay lại sau.</p>
                  </>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <div className="border-border mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
                <span className="text-muted text-xs">
                  Trang {page} / {totalPages}
                </span>
                <nav aria-label="Phân trang" className="flex items-center gap-2">
                  {page > 1 && (
                    <Link
                      aria-label="Trang trước"
                      href={catalogHref(params, { page: String(page - 1) })}
                      className="border-border rounded border p-2.5"
                    >
                      <ChevronLeft size={18} />
                    </Link>
                  )}
                  {pageWindow(page, totalPages).map((number) => (
                    <Link
                      key={number}
                      aria-label={`Trang ${number}`}
                      aria-current={number === page ? "page" : undefined}
                      href={catalogHref(params, { page: String(number) })}
                      className={`flex size-10 items-center justify-center rounded text-sm ${number === page ? "bg-primary text-primary-foreground" : "border-border hover:bg-surface border"}`}
                    >
                      {number}
                    </Link>
                  ))}
                  {page < totalPages && (
                    <Link
                      aria-label="Trang sau"
                      href={catalogHref(params, { page: String(page + 1) })}
                      className="border-border rounded border p-2.5"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  )}
                </nav>
              </div>
            )}
          </section>
        </div>
      </Container>
      <div className="border-border border-t">
        <Container className="grid gap-7 py-8 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Nội dung chính thống", text: "Biên soạn với sự cẩn trọng" },
            { icon: BookOpen, title: "Tri thức thiết thực", text: "Đồng hành trong học tập và công việc" },
            { icon: Truck, title: "Giao sách tận nơi", text: "Miễn phí vận chuyển từ 300.000đ" },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-4">
              <Icon size={28} strokeWidth={1.3} className="text-primary shrink-0" />
              <div>
                <p className="text-primary text-sm font-semibold">{title}</p>
                <p className="text-muted mt-1 text-xs">{text}</p>
              </div>
            </div>
          ))}
        </Container>
      </div>
    </main>
  );
}
