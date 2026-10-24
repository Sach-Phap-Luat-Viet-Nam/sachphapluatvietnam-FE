import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { CategoryStrip } from "@/components/CategoryStrip";
import { TrustBand } from "@/components/TrustBand";
import { BookCard } from "@/features/catalog/BookCard";
import { getBooks, getCategoryTree } from "@/features/catalog/api";
import type { BookSummary, CategoryNode } from "@/features/catalog/schemas";
import { Book3D } from "@/features/home/Book3D";
import { DustMotes } from "@/features/home/DustMotes";
import { HeroFanBook } from "@/features/home/HeroFanBook";
import { HeroSpotlight } from "@/features/home/HeroSpotlight";
import { LawTicker } from "@/features/home/LawTicker";
import { tickerItems } from "@/features/home/home";
import { QuickAddButton } from "@/features/ordering/QuickAddButton";
import { OfferShelf } from "@/features/popup/OfferShelf";
import { getRunningPopups } from "@/features/popup/server";

const NEW_BOOKS_LIMIT = 4;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "Sách Luật Việt Nam — Đọc đúng luật, bản mới nhất",
    description: "Bộ luật, văn bản hợp nhất, chú giải và giáo trình ghi rõ văn bản được cập nhật đến đâu.",
    locale: "vi_VN",
    type: "website",
  },
};

/**
 * Trang chủ được dựng tĩnh và làm mới sau mỗi 60 giây; backend lỗi lúc dựng thì vẫn hiện hero, các phần dữ liệu ẩn
 * đi và được thử lại ở lần làm mới sau.
 */
async function loadHomeData(): Promise<{ books: BookSummary[]; categories: CategoryNode[] }> {
  try {
    const [page, categories] = await Promise.all([
      getBooks({ Page: 1, Limit: NEW_BOOKS_LIMIT, Sort: "newest" }),
      getCategoryTree(),
    ]);
    return { books: page.items, categories };
  } catch (error) {
    console.error("Không tải được dữ liệu trang chủ", error);
    return { books: [], categories: [] };
  }
}

export default async function HomePage() {
  const [{ books, categories }, offers] = await Promise.all([loadHomeData(), getRunningPopups()]);
  const featured = books[0];

  return (
    <main id="noi-dung">
      <HeroSpotlight className="relative overflow-hidden">
        <div aria-hidden="true" className="hero-lamp pointer-events-none absolute inset-0" />
        <DustMotes />
        <Container className="relative flex flex-wrap items-center gap-x-10 gap-y-6 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-7">
            <p className="motion-rise text-gold flex items-center gap-3.5 text-[11px] tracking-[0.3em] [animation-delay:200ms] sm:text-xs">
              <span className="motion-rule bg-gold h-px w-11 [animation-delay:300ms]" />
              TỦ SÁCH PHÁP LUẬT · BIÊN SOẠN VÀ IN TRỰC TIẾP
            </p>
            <h1 className="font-editorial text-[52px] leading-[1.02] font-extrabold tracking-tight sm:text-7xl xl:text-[92px]">
              <span className="motion-line">
                <span className="[animation-delay:350ms]">Đọc đúng luật.</span>
              </span>
              <span className="motion-line">
                <span className="text-gold font-medium italic [animation-delay:550ms]">Bản mới nhất.</span>
              </span>
            </h1>
            <p className="motion-rise text-sand max-w-lg text-lg leading-8 font-light [animation-delay:900ms]">
              Bộ luật, văn bản hợp nhất, chú giải và giáo trình — mỗi cuốn ghi rõ văn bản được cập nhật đến đâu, kèm
              ISBN và số quyết định xuất bản.
            </p>
            <div className="motion-rise flex flex-wrap items-center gap-6 [animation-delay:1100ms]">
              <Link
                href="/sach"
                className="btn-sweep bg-gold text-ink flex h-14 items-center gap-3 px-8 text-base font-semibold"
              >
                Khám phá tủ sách
                <ArrowRight size={18} />
              </Link>
              <Link href="/sach?sort=newest" className="link-underline py-1.5 text-[15px]">
                Sách mới phát hành
              </Link>
            </div>
          </div>

          <div className="relative flex h-120 min-w-0 flex-[1_1_420px] items-center justify-center perspective-[1500px] sm:h-150">
            {/* Hai cuốn xòe phía sau là sách mới thứ 2 và 3; cuốn 3D ở giữa là sách mới nhất. */}
            <HeroFanBook book={books[1]} className="book-fan-left bg-cover-wine top-24 left-[6%] h-85 w-60" />
            <HeroFanBook book={books[2]} className="book-fan-right bg-cover-green top-36 right-[4%] h-77.5 w-55" />
            <span
              aria-hidden="true"
              className="book-floor absolute bottom-16 h-10 w-80 rounded-full bg-radial-[closest-side] from-black/85 to-transparent"
            />
            <Book3D title={featured?.title ?? "Tủ sách pháp luật"} coverImageUrl={featured?.coverImageUrl ?? null} />
            {featured && (
              <>
                <span className="stamp-in bg-burgundy text-ivory outline-burgundy border-ivory/55 absolute top-10 right-[12%] flex size-24 flex-col items-center justify-center rounded-full border border-dashed text-center shadow-[0_16px_30px_-12px_rgb(0_0_0/0.7)] outline-6 sm:top-14 sm:size-29">
                  <span className="text-[9px] tracking-[0.22em] sm:text-[10px]">ẤN BẢN</span>
                  <span className="font-editorial text-2xl leading-none font-bold italic sm:text-[26px]">mới</span>
                </span>
                <Link
                  href={`/sach/${featured.slug}`}
                  className="motion-rise border-gold/35 bg-ink/90 hover:border-gold absolute bottom-0 flex w-[min(350px,100%)] items-end justify-between gap-3 border px-5 py-4 transition-colors [animation-delay:2100ms]"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-editorial truncate text-lg font-bold">{featured.title}</span>
                    {featured.updatedToText && (
                      <span className="text-sand line-clamp-2 text-[13px]">{featured.updatedToText}</span>
                    )}
                  </span>
                  {featured.salePrice !== null && (
                    <span className="text-gold font-semibold whitespace-nowrap">{formatPrice(featured.salePrice)}</span>
                  )}
                </Link>
              </>
            )}
          </div>
        </Container>
      </HeroSpotlight>

      <LawTicker items={tickerItems(books)} />

      <CategoryStrip
        className="border-t-0"
        items={categories.map((category) => ({
          key: category.slug,
          label: category.name,
          href: `/sach?category=${encodeURIComponent(category.slug)}`,
        }))}
      />

      <OfferShelf popups={offers} />

      <section aria-labelledby="new-books" className="shelf-lamp">
        <Container className="flex flex-col gap-8 py-20 sm:gap-14 sm:py-28">
          <div className="motion-reveal flex flex-wrap items-end justify-between gap-x-6 gap-y-6">
            <div className="flex max-w-xl flex-col gap-4">
              <p className="text-gold flex items-center gap-3.5 text-xs tracking-[0.3em]">
                <span className="bg-gold h-px w-10" />
                VỪA LÊN KỆ
              </p>
              <h2 id="new-books" className="font-editorial text-[42px] leading-[1.05] font-bold sm:text-6xl">
                Mới <span className="foil-text font-medium italic">phát hành</span>
              </h2>
              <p className="text-sand text-[17px] leading-8">
                Những ấn bản vừa in, mỗi cuốn ghi rõ văn bản được cập nhật đến đâu.
              </p>
            </div>
            <Link
              href="/sach?sort=newest"
              className="btn-sweep border-gold/50 hover:text-ink flex h-12 items-center gap-2.5 border px-6 text-[15px] font-medium transition-colors duration-500"
            >
              Xem tất cả sách mới
              <ArrowRight size={16} />
            </Link>
          </div>
          {books.length ? (
            // Mobile/tablet: kệ vuốt ngang, lộ một phần cuốn kế tiếp để gợi ý vuốt; desktop: lưới 4 cột.
            // Khoảng trống trên bìa trong BookCard đã đủ cho sách nhấc lên khi hover nên vùng cuộn không cắt mất.
            <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-8 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
              {books.map((book, index) => (
                <li key={book.id} className="w-[68%] shrink-0 snap-start sm:w-[40%] lg:w-auto">
                  <BookCard
                    book={book}
                    index={index + 1}
                    cartAction={<QuickAddButton slug={book.slug} title={book.title} />}
                    dialogCartAction={<QuickAddButton slug={book.slug} title={book.title} variant="full" />}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-mist border-gold/25 border-y py-10 text-center">
              Tủ sách đang được cập nhật. Sách mới sẽ sớm lên kệ.
            </p>
          )}
        </Container>
      </section>

      <TrustBand />
    </main>
  );
}
