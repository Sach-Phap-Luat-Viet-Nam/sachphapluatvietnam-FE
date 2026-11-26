import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, FileText, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@slvn/ui";
import { formatDate } from "@slvn/utils";
import type { PolicyContent, PolicySection } from "./policy-html";
import type { StaticPage } from "./schemas";

/** Hai trang chính sách có route riêng; phần khung (icon, link đọc tiếp) theo slug, nội dung lấy từ backend. */
export const POLICY_PAGES = {
  "dieu-khoan-su-dung": {
    label: "Điều khoản",
    icon: FileText,
    related: { href: "/chinh-sach-bao-mat", title: "Chính sách bảo mật" },
  },
  "chinh-sach-bao-mat": {
    label: "Bảo mật",
    icon: ShieldCheck,
    related: { href: "/dieu-khoan-su-dung", title: "Điều khoản sử dụng" },
  },
} satisfies Record<string, { label: string; icon: LucideIcon; related: { href: string; title: string } }>;

export type PolicySlug = keyof typeof POLICY_PAGES;

/** Kiểu chữ cho HTML Admin soạn (đã lọc ở `policy-html.ts`), giữ giao diện của bản viết cứng trước đây. */
const BODY_CLASS =
  "text-sand mt-5 space-y-4 text-[15px] leading-[1.9] break-words sm:mt-6 sm:text-base [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-gold/40 [&_blockquote]:border-l [&_blockquote]:pl-5 [&_blockquote]:italic [&_h3]:text-ivory [&_h3]:pt-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:text-ivory [&_h4]:font-semibold [&_hr]:border-gold/20 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_strong]:text-ivory [&_ul]:border-gold/20 [&_ul]:bg-panel [&_ul]:mt-6[&_ul]:space-y-4 [&_ul]:border-l-2 [&_ul]:px-5 [&_ul]:py-5 sm:[&_ul]:px-6 [&_ul>li]:relative [&_ul>li]:pl-[1.125rem] [&_ul>li]:before:bg-gold [&_ul>li]:before:absolute [&_ul>li]:before:top-[0.8em] [&_ul>li]:before:left-0 [&_ul>li]:before:size-1.5 [&_ul>li]:before:rounded-full [&_ul>li]:before:content-['']";

/** Khối trước mục đầu tiên (thông báo dự thảo...): `blockquote` hiển thị như ghi chú trạng thái. */
const INTRO_CLASS =
  "text-mist text-[13px] leading-6 [&_a]:text-gold [&_a]:underline [&_blockquote]:border-gold/35 [&_blockquote]:bg-gold/5 [&_blockquote]:border-l-2 [&_blockquote]:px-5 [&_blockquote]:py-4 sm:[&_blockquote]:px-6 [&_p+p]:mt-2 [&_strong]:text-ivory [&_strong]:font-semibold";

/** Nửa đầu tiêu đề chữ thường, nửa sau in nghiêng màu vàng: "Điều khoản | sử dụng". */
function splitTitle(title: string): [string, string] {
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return [title, ""];
  const head = Math.ceil(words.length / 2);
  return [words.slice(0, head).join(" "), words.slice(head).join(" ")];
}

const sectionNumber = (index: number) => String(index + 1).padStart(2, "0");

function Contents({ sections }: { sections: PolicySection[] }) {
  return (
    <ol className="space-y-0.5">
      {sections.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="group hover:bg-gold/8 flex gap-3 rounded-sm px-3 py-2.5 transition-colors"
          >
            <span aria-hidden="true" className="text-gold/75 font-editorial w-5 shrink-0 text-xs tabular-nums">
              {sectionNumber(index)}
            </span>
            <span className="text-mist group-hover:text-ivory text-[13px] leading-5">{section.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

interface PolicyPageProps {
  slug: PolicySlug;
  page: StaticPage;
  content: PolicyContent;
}

export function PolicyPage({ slug, page, content }: PolicyPageProps) {
  const { label, icon: Icon, related } = POLICY_PAGES[slug];
  const [titleHead, titleTail] = splitTitle(page.title);
  const { intro, sections } = content;
  const updatedAt = formatDate(page.updatedAt);

  return (
    <main id="noi-dung" className="overflow-clip">
      <div className="border-border/60 bg-ink-deep relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-56 right-[-10rem] size-[38rem] rounded-full bg-[radial-gradient(circle,rgba(203,166,94,0.12),transparent_68%)]"
        />
        <Container className="relative pt-7 pb-9 sm:pt-9 sm:pb-12">
          <nav aria-label="Đường dẫn" className="text-mist flex flex-wrap items-center gap-2.5 text-xs sm:text-[13px]">
            <Link href="/" className="hover:text-gold transition-colors">
              Trang chủ
            </Link>
            <span aria-hidden="true" className="text-gold/60">
              /
            </span>
            <span>Thông tin & chính sách</span>
            <span aria-hidden="true" className="text-gold/60">
              /
            </span>
            <span aria-current="page" className="text-ivory">
              {page.title}
            </span>
          </nav>
          <div className="mt-10 flex items-end justify-between gap-12 sm:mt-14">
            <div className="max-w-3xl">
              <p className="text-gold flex items-center gap-3 text-[11px] font-semibold tracking-[0.22em] uppercase">
                <span aria-hidden="true" className="bg-gold h-px w-8" /> Sách Luật Việt Nam
              </p>
              <h1 className="font-editorial mt-5 text-[40px] leading-[1.14] font-bold tracking-tight sm:text-[58px] lg:text-[66px]">
                {titleHead} {titleTail && <span className="text-gold font-medium italic">{titleTail}</span>}
              </h1>
              {page.description && (
                <p className="text-mist mt-5 max-w-2xl text-[15px] leading-7 sm:text-base sm:leading-8">
                  {page.description}
                </p>
              )}
            </div>
            <div
              aria-hidden="true"
              className="border-gold/25 text-gold/70 hidden size-32 shrink-0 items-center justify-center rounded-full border md:flex lg:size-40"
            >
              <div className="border-gold/20 flex size-[calc(100%-14px)] items-center justify-center rounded-full border">
                <Icon size={43} strokeWidth={1} />
              </div>
            </div>
          </div>
          <div className="border-gold/25 mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-5 text-xs sm:mt-12 sm:text-[13px]">
            {updatedAt && (
              <span className="text-gold flex items-center gap-2 font-semibold">
                <span aria-hidden="true" className="bg-gold size-1.5 rounded-full" /> Cập nhật ngày {updatedAt}
              </span>
            )}
            <span className="text-mist">{sections.length} mục nội dung</span>
            <a
              href="#bat-dau"
              className="text-ivory hover:text-gold ml-auto inline-flex items-center gap-2 transition-colors"
            >
              Bắt đầu đọc <ArrowDown size={15} />
            </a>
          </div>
        </Container>
      </div>

      <Container className="pt-6 pb-20 sm:pt-9 sm:pb-28">
        {intro && (
          // Admin nhập HTML, đã lọc bằng sanitize-html trên server (policy-html.ts).
          <div className={INTRO_CLASS} dangerouslySetInnerHTML={{ __html: intro }} />
        )}

        <div
          id="bat-dau"
          className="mt-8 scroll-mt-8 lg:mt-12 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-14 xl:grid-cols-[270px_minmax(0,1fr)] xl:gap-20"
        >
          <aside className="lg:sticky lg:top-6">
            {sections.length > 0 && (
              <details className="border-border bg-panel group border lg:hidden">
                <summary className="text-ivory flex min-h-14 list-none items-center justify-between gap-3 px-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  Mục lục <span className="text-mist ml-auto text-xs font-normal">{sections.length} mục</span>
                  <ChevronDown size={16} className="text-gold transition-transform group-open:rotate-180" />
                </summary>
                <nav aria-label="Mục lục" className="border-border max-h-80 overflow-y-auto border-t p-2">
                  <Contents sections={sections} />
                </nav>
              </details>
            )}
            <div className="hidden lg:block">
              {sections.length > 0 && (
                <>
                  <div className="border-gold/50 border-t-2 pt-5">
                    <p className="text-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Trong tài liệu này</p>
                    <div className="mt-3 flex items-baseline justify-between gap-3">
                      <h2 className="font-editorial text-2xl font-bold">Mục lục</h2>
                      <span className="text-dim text-xs">{sections.length} mục</span>
                    </div>
                  </div>
                  <nav aria-label="Mục lục" className="mt-4 max-h-[56vh] overflow-y-auto pr-1">
                    <Contents sections={sections} />
                  </nav>
                </>
              )}
              <a
                href="https://zalo.me/0932000035"
                target="_blank"
                rel="noopener noreferrer"
                className="border-border hover:border-gold/50 group mt-6 flex items-center justify-between gap-3 border px-4 py-4 transition-colors"
              >
                <span>
                  <span className="text-dim block text-xs">Bạn cần hỗ trợ?</span>
                  <span className="text-ivory mt-1 block text-sm font-semibold">Liên hệ qua Zalo</span>
                </span>
                <ArrowUpRight
                  size={17}
                  className="text-gold transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
                <span className="sr-only"> (mở tab mới)</span>
              </a>
            </div>
          </aside>

          <article aria-label={page.title} className="mt-10 min-w-0 lg:mt-0">
            <div className="border-border text-mist flex items-center justify-between gap-4 border-b pb-5 text-[11px] font-semibold tracking-[0.16em] uppercase">
              <span>Nội dung chi tiết</span>
              <span className="text-gold">{label}</span>
            </div>
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="border-border/70 scroll-mt-8 border-b py-8 sm:py-11"
              >
                <div className="flex items-start gap-4 sm:gap-6">
                  <span
                    aria-hidden="true"
                    className="font-editorial text-gold/70 pt-1 text-base tabular-nums sm:text-lg"
                  >
                    {sectionNumber(index)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id={`${section.id}-title`}
                      className="font-editorial text-ivory text-[23px] leading-snug font-bold sm:text-[27px]"
                    >
                      {section.title}
                    </h2>
                    {section.html && (
                      // Admin nhập HTML, đã lọc bằng sanitize-html trên server (policy-html.ts).
                      <div className={BODY_CLASS} dangerouslySetInnerHTML={{ __html: section.html }} />
                    )}
                  </div>
                </div>
              </section>
            ))}
            <div className="bg-panel border-border mt-10 flex flex-col items-start justify-between gap-5 border p-6 sm:flex-row sm:items-center sm:p-8">
              <div>
                <p className="text-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Đọc tiếp</p>
                <p className="font-editorial mt-2 text-xl font-bold">{related.title}</p>
              </div>
              <Link
                href={related.href}
                className="text-gold inline-flex min-h-11 items-center gap-3 text-sm font-semibold"
              >
                Xem chính sách <ArrowRight size={17} />
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
              <a
                href="https://zalo.me/0932000035"
                target="_blank"
                rel="noopener noreferrer"
                className="text-mist hover:text-gold inline-flex min-h-11 items-center gap-1.5 lg:hidden"
              >
                Liên hệ hỗ trợ qua Zalo <ArrowUpRight size={15} />
                <span className="sr-only"> (mở tab mới)</span>
              </a>
              <a href="#noi-dung" className="text-gold ml-auto inline-flex min-h-11 items-center gap-2">
                Về đầu trang <span aria-hidden="true">↑</span>
              </a>
            </div>
          </article>
        </div>
      </Container>
    </main>
  );
}
