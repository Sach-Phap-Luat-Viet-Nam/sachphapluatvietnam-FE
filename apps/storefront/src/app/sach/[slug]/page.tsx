import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BookOpen, Check } from "lucide-react";
import { Container, cn } from "@slvn/ui";
import { formatDate } from "@slvn/utils";
import { TrustBand } from "@/components/TrustBand";
import { coverTypeLabel } from "@/lib/labels";
import { getBook } from "@/features/catalog/api";
import {
  EDITION_PARAM,
  audienceText,
  bookJsonLd,
  bookPath,
  editionHref,
  editionLabel,
  latestEdition,
  publishingFacts,
  purchaseState,
  safePreviewUrl,
  selectEdition,
  serializeJsonLd,
} from "@/features/catalog/book-detail";
import { bookTypeLabel, param } from "@/features/catalog/catalog";
import type { CatalogParams } from "@/features/catalog/catalog";
import { descriptionText, formatRichText } from "@/features/catalog/description";
import { Book3D } from "@/features/home/Book3D";
import { HeroSpotlight } from "@/features/home/HeroSpotlight";
import { AddToCartForm } from "@/features/ordering/AddToCartForm";

interface BookPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogParams>;
}

/** Kiểu chữ cho HTML mô tả đã lọc (chỉ còn p, ul/ol, h2–h4, strong/em, blockquote, a). */
const DESCRIPTION_CLASS =
  "text-sand max-w-3xl leading-8 [&_a]:text-gold [&_a]:underline [&_blockquote]:border-gold/40 [&_blockquote]:mt-4 [&_blockquote]:border-l [&_blockquote]:pl-5 [&_blockquote]:italic [&_h2]:font-editorial [&_h2]:text-ivory [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-ivory [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:text-ivory [&_h4]:mt-5 [&_h4]:font-semibold [&_hr]:border-gold/20 [&_hr]:my-6 [&_li]:mt-1.5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_p:first-child]:mt-0 [&_strong]:text-ivory [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6";

export async function generateMetadata({ params, searchParams }: BookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) {
    return { title: "Không tìm thấy sách", robots: { index: false, follow: true } };
  }

  const edition = selectEdition(book, param(await searchParams, EDITION_PARAM));
  const title = book.metaTitle || book.title;
  const description =
    book.metaDescription ||
    descriptionText(book.description) ||
    [book.title, edition?.updatedToText].filter(Boolean).join(". ");
  return {
    title,
    description,
    // Mọi ấn bản dùng chung một trang: canonical luôn là URL gốc của sách.
    alternates: { canonical: bookPath(book.slug) },
    openGraph: {
      title: `${title} | Sách Luật Việt Nam`,
      description,
      locale: "vi_VN",
      type: "book",
      isbn: edition?.isbn,
      images: edition?.coverImageUrl ? [{ url: edition.coverImageUrl, alt: `Bìa sách ${book.title}` }] : undefined,
    },
  };
}

export default async function BookDetailPage({ params, searchParams }: BookPageProps) {
  const { slug } = await params;
  const book = await getBook(slug);
  const edition = book && selectEdition(book, param(await searchParams, EDITION_PARAM));
  if (!book || !edition) notFound();

  const latest = latestEdition(book);
  const newer = !edition.isLatest && latest && latest.id !== edition.id ? latest : null;
  const purchase = purchaseState(edition);
  const description = formatRichText(book.description);
  const tableOfContents = formatRichText(edition.tableOfContents);
  const facts = publishingFacts(edition);
  const preview = safePreviewUrl(edition.previewFileUrl);
  const category = book.categories[0];
  const audiences = audienceText(book.targetAudiences);
  const typeLabel = bookTypeLabel(book.bookType);
  const jsonLd = serializeJsonLd(bookJsonLd(book, edition, descriptionText(book.description, 500)));

  return (
    <main id="noi-dung">
      {/* JSON-LD tự sinh qua JSON.stringify và đã thoát `<` (CLAUDE.md mục 5). */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Container className="pt-8 sm:pt-10">
        <nav aria-label="Đường dẫn" className="text-mist flex flex-wrap items-center gap-2 text-[13px]">
          <Link href="/" className="link-underline">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/sach" className="link-underline">
            Tủ sách
          </Link>
          {category && (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/sach?category=${encodeURIComponent(category.slug)}`} className="link-underline">
                {category.name}
              </Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span className="text-ivory line-clamp-1" aria-current="page">
            {book.title}
          </span>
        </nav>
      </Container>

      {newer && (
        <Container className="pt-6">
          <div className="border-upcoming/50 bg-upcoming/10 flex flex-wrap items-center gap-x-4 gap-y-2 border px-5 py-4">
            <AlertTriangle size={20} className="text-upcoming shrink-0" />
            <p className="flex-1">
              Bạn đang xem ấn bản cũ. Đã có ấn bản mới: <strong>{editionLabel(newer)}</strong>.
            </p>
            <Link href={editionHref(book.slug, newer)} className="link-underline text-gold font-medium">
              Xem ấn bản mới
            </Link>
          </div>
        </Container>
      )}

      <Container className="grid gap-8 pt-4 pb-14 sm:pt-6 lg:grid-cols-[420px_1fr] lg:gap-14">
        {/* Mô hình sách 3D nghiêng theo chuột (như hero); dính theo khi cuộn đọc mô tả trên desktop. */}
        <HeroSpotlight className="flex flex-col items-center gap-2 lg:sticky lg:top-6 lg:self-start">
          <div className="relative flex h-115 w-full items-center justify-center sm:h-145">
            <span
              aria-hidden="true"
              className="book-floor absolute bottom-6 h-10 w-72 rounded-full bg-radial-[closest-side] from-black/85 to-transparent sm:bottom-4"
            />
            <Book3D title={book.title} coverImageUrl={edition.coverImageUrl} size="detail" />
          </div>
          {preview && (
            <a
              href={preview}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline text-gold flex min-h-11 items-center gap-2"
            >
              <BookOpen size={18} /> Đọc thử
            </a>
          )}
        </HeroSpotlight>

        <div className="flex min-w-0 flex-col gap-7">
          <div>
            {typeLabel && <p className="text-gold text-xs font-medium tracking-[0.24em] uppercase">{typeLabel}</p>}
            <h1 className="font-editorial motion-rise mt-3 text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">
              {book.title}
            </h1>
            <p className="text-mist mt-3">
              {editionLabel(edition)}
              {book.authors.length > 0 && ` · ${book.authors.map((author) => author.name).join(", ")}`}
            </p>
            {edition.updatedToText && (
              <p className="text-sand mt-4 flex gap-2.5 leading-7">
                <Check size={17} strokeWidth={2} className="text-gold mt-1.5 shrink-0" />
                {edition.updatedToText}
              </p>
            )}
            {audiences && <p className="text-mist mt-2 text-sm">Dành cho: {audiences}</p>}
            {book.categories.length > 0 && (
              <p className="text-mist mt-1 flex flex-wrap gap-x-2 text-sm">
                Danh mục:
                {book.categories.map((item, index) => (
                  <span key={item.id}>
                    <Link href={`/sach?category=${encodeURIComponent(item.slug)}`} className="link-underline text-sand">
                      {item.name}
                    </Link>
                    {index < book.categories.length - 1 && ","}
                  </span>
                ))}
              </p>
            )}
          </div>

          {book.editions.length > 1 && (
            <nav aria-label="Các ấn bản" className="flex flex-col gap-2.5">
              <span className="text-gold text-[11px] tracking-[0.26em] uppercase">Ấn bản</span>
              <ul className="flex flex-wrap gap-2.5">
                {book.editions.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={editionHref(book.slug, item)}
                      aria-current={item.id === edition.id ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center border px-4 text-sm transition-colors",
                        item.id === edition.id ? "border-gold bg-gold/12 text-gold" : "border-border hover:border-gold",
                      )}
                    >
                      {editionLabel(item)}
                      {item.isLatest && <span className="text-mist ml-2">(mới nhất)</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <section aria-label="Đặt mua" className="border-gold/30 bg-panel border px-6 py-7 sm:px-8">
            {purchase.buyable ? (
              <>
                {purchase.label && <p className="text-upcoming mb-3 text-sm">{purchase.label}</p>}
                <AddToCartForm
                  // Đổi ấn bản là đổi danh sách SKU: tạo lại form để không giữ SKU của ấn bản trước.
                  key={edition.id}
                  options={edition.skus.map((sku) => ({
                    skuId: sku.id,
                    label: coverTypeLabel(sku.coverType),
                    salePrice: sku.salePrice,
                    listPrice: sku.listPrice,
                    regularSalePrice: sku.regularSalePrice ?? null,
                    discountPercent: sku.discountPercent,
                    saleEndsAt: sku.saleEndsAt ?? null,
                    inStock: sku.inStock,
                  }))}
                  newerEdition={newer && { name: editionLabel(newer), href: editionHref(book.slug, newer) }}
                />
              </>
            ) : (
              <p className="text-upcoming text-lg font-medium">{purchase.label}</p>
            )}
          </section>

          {/* Gọn: lưới chữ nhỏ để phần giới thiệu sách nằm cao, khách đọc ngay dưới khối đặt mua. */}
          <section aria-labelledby="thong-tin-xuat-ban" className="border-gold/20 border-y py-5">
            <h2 id="thong-tin-xuat-ban" className="text-gold text-[11px] tracking-[0.26em] uppercase">
              Thông tin xuất bản
            </h2>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="min-w-0">
                  <dt className="text-mist text-xs">{fact.label}</dt>
                  <dd className="mt-0.5 break-words">{fact.value}</dd>
                </div>
              ))}
            </dl>
            {edition.legalDocuments.length > 0 && (
              <div className="mt-4">
                <h3 className="text-mist text-xs">Văn bản pháp luật được cập nhật</h3>
                <ul className="mt-1.5 flex flex-col gap-1 text-sm">
                  {edition.legalDocuments.map((document) => {
                    const effective = formatDate(document.effectiveDate);
                    return (
                      <li key={document.id}>
                        <span className="text-gold-pale font-medium">{document.docNumber}</span> · {document.title}
                        {effective && <span className="text-mist"> (hiệu lực từ {effective})</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          {description && (
            <section aria-labelledby="gioi-thieu">
              <h2 id="gioi-thieu" className="font-editorial text-[28px] font-bold">
                Giới thiệu sách
              </h2>
              {/* Admin nhập HTML hoặc chữ thuần, đã chuyển và lọc bằng sanitize-html trên server (description.ts). */}
              <div className={cn(DESCRIPTION_CLASS, "mt-4")} dangerouslySetInnerHTML={{ __html: description }} />
            </section>
          )}
          {tableOfContents && (
            <details className="border-gold/30 border px-6 py-5">
              <summary className="font-editorial text-2xl font-bold">Mục lục</summary>
              <div className={cn(DESCRIPTION_CLASS, "mt-4")} dangerouslySetInnerHTML={{ __html: tableOfContents }} />
            </details>
          )}
        </div>
      </Container>

      <TrustBand />
    </main>
  );
}
