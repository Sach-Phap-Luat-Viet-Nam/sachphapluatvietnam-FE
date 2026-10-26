import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Info } from "lucide-react";
import { Container } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { serializeJsonLd } from "@/features/catalog/book-detail";
import { getCombo } from "@/features/combo/api";
import { ComboCover, ComboCovers } from "@/features/combo/ComboCovers";
import {
  comboJsonLd,
  comboPath,
  hasSavings,
  itemDetail,
  payablePrice,
  savingsPercent,
  totalCopies,
} from "@/features/combo/combo";
import { BuyComboButton } from "@/features/ordering/BuyComboButton";
import { validityText } from "@/features/promotion/promotion";

interface ComboPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ComboPageProps): Promise<Metadata> {
  const { slug } = await params;
  const combo = await getCombo(slug);
  if (!combo) {
    return { title: "Không tìm thấy combo", robots: { index: false, follow: true } };
  }

  const description =
    combo.description || `${combo.name}: ${totalCopies(combo)} cuốn, giá ${formatPrice(payablePrice(combo))}.`;
  const image = combo.imageUrl ?? combo.items.find((item) => item.coverImageUrl)?.coverImageUrl;
  return {
    title: combo.name,
    description,
    alternates: { canonical: comboPath(combo.slug) },
    openGraph: {
      title: `${combo.name} | Sách Luật Việt Nam`,
      description,
      locale: "vi_VN",
      type: "website",
      images: image ? [{ url: image, alt: combo.name }] : undefined,
    },
  };
}

export default async function ComboPage({ params }: ComboPageProps) {
  const { slug } = await params;
  const combo = await getCombo(slug);
  if (!combo) notFound();

  const percent = savingsPercent(combo);
  // Sách đang có lịch giá làm mua lẻ không cao hơn giá combo: backend không áp combo nên không bán như một ưu đãi.
  const deal = hasSavings(combo);
  // JSON-LD tự sinh qua JSON.stringify và đã thoát `<` (SKILL.md mục 5).
  const jsonLd = serializeJsonLd(comboJsonLd(combo));

  return (
    <main id="noi-dung">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Container className="pt-8 sm:pt-10">
        <nav aria-label="Đường dẫn" className="text-mist flex flex-wrap items-center gap-2 text-[13px]">
          <Link href="/" className="link-underline">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/khuyen-mai" className="link-underline">
            Khuyến mãi
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-ivory line-clamp-1" aria-current="page">
            {combo.name}
          </span>
        </nav>
      </Container>

      <Container className="grid gap-10 pt-6 pb-14 sm:pt-8 lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-14">
        <div className="lg:sticky lg:top-6 lg:self-start">
          {combo.imageUrl ? (
            <div className="border-gold/30 relative aspect-[4/3] overflow-hidden border">
              <Image
                src={combo.imageUrl}
                alt={`Ảnh combo ${combo.name}`}
                fill
                sizes="(min-width: 1024px) 440px, 100vw"
                // Chưa chốt CDN ảnh nên chưa khai báo `images.remotePatterns`; bỏ tối ưu để nhận mọi URL backend trả.
                unoptimized
                priority
                className="object-cover"
              />
            </div>
          ) : (
            <ComboCovers items={combo.items} size="hero" />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-7">
          <div>
            <p className="text-gold text-xs font-medium tracking-[0.24em] uppercase">
              Combo bộ sách · {totalCopies(combo)} cuốn
            </p>
            <h1 className="font-editorial motion-rise mt-3 text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">
              {combo.name}
            </h1>
            {combo.description && (
              <p className="text-sand mt-4 max-w-2xl leading-8 whitespace-pre-line">{combo.description}</p>
            )}
          </div>

          <section
            aria-label="Đặt mua"
            className="border-gold/30 bg-panel flex flex-col gap-5 border px-6 py-7 sm:px-8"
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-gold-pale text-3xl font-semibold">{formatPrice(payablePrice(combo))}</span>
                {deal && (
                  <span className="text-mist line-through">
                    <span className="sr-only">Giá mua lẻ </span>
                    {formatPrice(combo.retailPrice)}
                  </span>
                )}
                {percent !== null && (
                  <span className="bg-burgundy text-cream px-2 py-0.5 text-sm font-semibold">
                    <span className="sr-only">Tiết kiệm </span>−{percent}%
                  </span>
                )}
              </div>
              {deal ? (
                <p className="text-ok">Tiết kiệm {formatPrice(combo.savings)} so với mua lẻ.</p>
              ) : (
                <p className="text-mist text-sm">Giá mua lẻ cả bộ hiện tại (đã gồm giá ưu đãi của từng cuốn).</p>
              )}
              <p className="text-mist text-sm">{validityText(combo)}</p>
            </div>

            {deal ? (
              <>
                <BuyComboButton
                  lines={combo.items.map(({ skuId, quantity }) => ({ skuId, quantity }))}
                  isSellable={combo.isSellable}
                />

                <p className="text-mist flex gap-2.5 text-sm leading-6">
                  <Info size={17} className="text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  Giá combo tự áp ở bước thanh toán khi giỏ có đủ các sách bên dưới; mua nhiều bộ thì mỗi bộ được giảm
                  riêng. Combo không cộng dồn với khuyến mãi giảm trên tổng đơn: hệ thống tự chọn ưu đãi có lợi hơn cho
                  bạn.
                </p>
              </>
            ) : (
              <p
                role="note"
                className="border-upcoming/50 bg-upcoming/10 flex gap-2.5 border px-4 py-3 text-sm leading-6"
              >
                <AlertTriangle size={17} className="text-upcoming mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Các sách trong combo đang có giá ưu đãi nên mua lẻ ({formatPrice(combo.retailPrice)}) không cao hơn
                  giá combo ({formatPrice(combo.comboPrice)}). Giá combo sẽ tự áp dụng trở lại khi giá ưu đãi kết thúc;
                  bây giờ bạn mua từng cuốn ở danh sách bên dưới với giá ưu đãi.
                </span>
              </p>
            )}
          </section>

          <section aria-labelledby="trong-combo">
            <h2 id="trong-combo" className="font-editorial text-[28px] font-bold">
              Trong combo
            </h2>
            <ul className="border-gold/20 divide-gold/20 mt-4 divide-y border-y">
              {combo.items.map((item) => (
                <li key={item.skuId} className="flex items-center gap-4 py-4">
                  <ComboCover item={item} className="w-14 shrink-0 sm:w-16" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/sach/${item.bookSlug}`}
                      className="link-underline font-editorial text-lg leading-snug font-bold"
                    >
                      {item.bookTitle}
                    </Link>
                    <p className="text-mist mt-0.5 text-sm">{itemDetail(item)}</p>
                    {!item.isSellable && <p className="text-upcoming mt-0.5 text-sm">Tạm ngừng bán</p>}
                  </div>
                  <p className="shrink-0 text-right text-sm">
                    <span className="text-sand block">× {item.quantity}</span>
                    <span className="text-mist block">{formatPrice(item.unitPrice)} / cuốn</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Container>

      {/* Chừa khoảng trống trước chân trang */}
      <div aria-hidden="true" className="h-20 sm:h-24" />
    </main>
  );
}
