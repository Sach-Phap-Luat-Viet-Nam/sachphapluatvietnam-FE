import type { Metadata } from "next";
import Link from "next/link";
import { Container, cn } from "@slvn/ui";
import { CategoryStrip } from "@/components/CategoryStrip";
import { TrustBand } from "@/components/TrustBand";
import { ActiveFilters } from "@/features/catalog/ActiveFilters";
import { BookCard } from "@/features/catalog/BookCard";
import { CatalogFilters } from "@/features/catalog/CatalogFilters";
import { CatalogPagination } from "@/features/catalog/CatalogPagination";
import { MobileFilterSheet } from "@/features/catalog/MobileFilterSheet";
import { SortForm } from "@/features/catalog/SortForm";
import { getBooks, getCategoryTree } from "@/features/catalog/api";
import {
  activeFilters,
  catalogHref,
  flattenCategories,
  pageCount,
  rootCategorySlug,
  subcategoryGroup,
  toBooksQuery,
} from "@/features/catalog/catalog";
import type { CatalogParams } from "@/features/catalog/catalog";
import { QuickPurchase } from "@/features/ordering/QuickPurchase";

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
  const query = toBooksQuery(params);
  const [books, categoryTree] = await Promise.all([getBooks(query), getCategoryTree()]);
  const { page, limit, total } = books.meta;
  const totalPages = pageCount(total, limit);
  const firstShown = (page - 1) * limit + 1;

  const activeCategory = query.Category ?? "";
  const activeRoot = rootCategorySlug(categoryTree, activeCategory);
  const subcategories = subcategoryGroup(categoryTree, activeCategory);
  const filters = activeFilters(params, flattenCategories(categoryTree));
  const filterCount = filters.filter((filter) => filter.key !== "q" && filter.key !== "category").length;
  const categoryHref = (slug: string) => catalogHref(params, { category: slug, page: "" });

  return (
    <main id="noi-dung">
      <Container className="pt-8 sm:pt-10">
        <nav aria-label="Đường dẫn" className="text-mist flex items-center gap-2 text-[13px]">
          <Link href="/" className="link-underline">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-ivory">Tủ sách</span>
        </nav>
        <div className="mt-3.5 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <h1 className="font-editorial motion-rise text-[44px] leading-[1.05] font-extrabold tracking-tight sm:text-[64px]">
            Tủ sách <span className="text-gold font-medium italic">pháp luật</span>
          </h1>
          <p className="text-sand motion-rise mb-2.5 max-w-md text-[15px] font-light [animation-delay:150ms]">
            Mỗi cuốn ghi rõ văn bản được cập nhật đến đâu, kèm ISBN và số quyết định xuất bản.
          </p>
        </div>
      </Container>

      <CategoryStrip
        className="mt-8 sm:mt-9"
        startAt={0}
        items={[
          { key: "", label: "Tất cả", href: categoryHref(""), active: !activeRoot },
          ...categoryTree.map((category) => ({
            key: category.slug,
            label: category.name,
            href: categoryHref(category.slug),
            active: category.slug === activeRoot,
          })),
        ]}
      />
      {subcategories && (
        <Container className="flex flex-wrap items-center gap-2 pt-5">
          <span className="text-mist mr-1 text-sm">{subcategories.parent.name}:</span>
          {subcategories.items.map((item) => (
            <Link
              key={item.slug}
              href={categoryHref(item.slug)}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex min-h-9 items-center border px-3.5 text-sm transition-colors",
                item.active ? "border-gold bg-gold/12 text-gold" : "border-border hover:border-gold",
              )}
            >
              {item.name}
            </Link>
          ))}
        </Container>
      )}

      <Container className="flex items-start gap-12 pt-10 pb-6 sm:pt-12">
        <aside
          aria-label="Bộ lọc"
          className="border-gold/25 bg-panel hidden w-72 shrink-0 flex-col gap-7 border px-6.5 py-7 lg:flex"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-editorial text-[26px] font-bold">Bộ lọc</h2>
            <Link href="/sach" className="link-underline text-gold text-[13px]">
              Xóa tất cả
            </Link>
          </div>
          <CatalogFilters key={JSON.stringify(params)} params={params} idPrefix="desktop" />
        </aside>

        <section aria-label="Kết quả" className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 className="font-editorial text-[28px] leading-tight font-bold sm:text-[34px]">
                {query.Q ? (
                  <>
                    Kết quả cho <span className="text-gold italic">“{query.Q}”</span>
                  </>
                ) : (
                  "Tất cả sách"
                )}
              </h2>
              <p className="text-mist mt-1.5 text-sm">
                {total} cuốn sách
                {books.items.length ? ` · hiển thị ${firstShown}–${firstShown + books.items.length - 1}` : ""}
              </p>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <MobileFilterSheet activeCount={filterCount}>
                <CatalogFilters key={JSON.stringify(params)} params={params} idPrefix="mobile" />
              </MobileFilterSheet>
              <div className="min-w-0 flex-1 sm:flex-none">
                <SortForm params={params} />
              </div>
            </div>
          </div>

          {filters.length > 0 && (
            <div className="border-gold/20 border-b pb-5">
              <ActiveFilters filters={filters} />
            </div>
          )}

          {books.items.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 pt-2 sm:gap-x-8 sm:gap-y-14 xl:grid-cols-3">
              {books.items.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  cartAction={<QuickPurchase slug={book.slug} title={book.title} />}
                  dialogCartAction={<QuickPurchase slug={book.slug} title={book.title} variant="full" />}
                />
              ))}
            </div>
          ) : (
            <div className="border-gold/25 flex min-h-80 flex-col items-center justify-center gap-4 border px-6 text-center">
              {filters.length || page > 1 ? (
                <>
                  <h3 className="font-editorial text-3xl font-bold">Chưa tìm thấy sách phù hợp</h3>
                  <p className="text-mist">Thử từ khóa khác hoặc bỏ bớt bộ lọc.</p>
                  <Link href="/sach" className="link-underline text-gold mt-1">
                    Xem tất cả sách
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="font-editorial text-3xl font-bold">Tủ sách đang được cập nhật</h3>
                  <p className="text-mist">Sách sẽ sớm lên kệ, mời bạn quay lại sau.</p>
                </>
              )}
            </div>
          )}

          <CatalogPagination params={params} page={page} totalPages={totalPages} />
        </section>
      </Container>

      <TrustBand />
    </main>
  );
}
