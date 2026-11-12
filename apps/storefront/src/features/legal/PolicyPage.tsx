import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, FileText, ShieldCheck } from "lucide-react";
import { Container } from "@slvn/ui";
import { POLICY_DRAFT_DATE, privacy } from "./content";
import type { PolicyDocument } from "./content";

function Contents({ document }: { document: PolicyDocument }) {
  return (
    <ol className="space-y-0.5">
      {document.sections.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="group hover:bg-gold/8 flex gap-3 rounded-sm px-3 py-2.5 transition-colors"
          >
            <span aria-hidden="true" className="text-gold/75 font-editorial w-5 shrink-0 text-xs tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-mist group-hover:text-ivory text-[13px] leading-5">
              {section.title.replace(/^\d+\.\s*/, "")}
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export function PolicyPage({ document }: { document: PolicyDocument }) {
  const isPrivacy = document === privacy;
  const otherHref = isPrivacy ? "/dieu-khoan-su-dung" : "/chinh-sach-bao-mat";
  const otherTitle = isPrivacy ? "Điều khoản sử dụng" : "Chính sách bảo mật";
  const titleParts = isPrivacy ? ["Chính sách", "bảo mật"] : ["Điều khoản", "sử dụng"];
  const Icon = isPrivacy ? ShieldCheck : FileText;

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
              {document.title}
            </span>
          </nav>
          <div className="mt-10 flex items-end justify-between gap-12 sm:mt-14">
            <div className="max-w-3xl">
              <p className="text-gold flex items-center gap-3 text-[11px] font-semibold tracking-[0.22em] uppercase">
                <span aria-hidden="true" className="bg-gold h-px w-8" /> Sách Luật Việt Nam
              </p>
              <h1 className="font-editorial mt-5 text-[40px] leading-[1.14] font-bold tracking-tight sm:text-[58px] lg:text-[66px]">
                {titleParts[0]} <span className="text-gold font-medium italic">{titleParts[1]}</span>
              </h1>
              <p className="text-mist mt-5 max-w-2xl text-[15px] leading-7 sm:text-base sm:leading-8">
                {document.description}
              </p>
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
            <span className="text-gold flex items-center gap-2 font-semibold">
              <span aria-hidden="true" className="bg-gold size-1.5 rounded-full" /> Bản dự thảo
            </span>
            <span className="text-mist">Soạn ngày {POLICY_DRAFT_DATE}</span>
            <span className="text-mist">{document.sections.length} mục nội dung</span>
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
        <aside
          aria-label="Trạng thái tài liệu"
          className="border-gold/35 bg-gold/5 flex items-start gap-4 border-l-2 px-5 py-4 sm:px-6"
        >
          <span aria-hidden="true" className="text-gold font-editorial text-2xl leading-none">
            ✳
          </span>
          <div>
            <p className="text-ivory text-sm font-semibold">Tài liệu đang được hoàn thiện</p>
            <p className="text-mist mt-1 text-[13px] leading-6">
              Chưa công bố ngày hiệu lực. Đầu mối tiếp nhận yêu cầu, thời hạn xử lý và lưu giữ dữ liệu cần được xác nhận
              trước khi áp dụng chính thức.
            </p>
          </div>
        </aside>

        <div
          id="bat-dau"
          className="mt-8 scroll-mt-8 lg:mt-12 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-14 xl:grid-cols-[270px_minmax(0,1fr)] xl:gap-20"
        >
          <aside className="lg:sticky lg:top-6">
            <details className="border-border bg-panel group border lg:hidden">
              <summary className="text-ivory flex min-h-14 list-none items-center justify-between gap-3 px-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                Mục lục <span className="text-mist ml-auto text-xs font-normal">{document.sections.length} mục</span>
                <ChevronDown size={16} className="text-gold transition-transform group-open:rotate-180" />
              </summary>
              <nav aria-label="Mục lục" className="border-border max-h-80 overflow-y-auto border-t p-2">
                <Contents document={document} />
              </nav>
            </details>
            <div className="hidden lg:block">
              <div className="border-gold/50 border-t-2 pt-5">
                <p className="text-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Trong tài liệu này</p>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <h2 className="font-editorial text-2xl font-bold">Mục lục</h2>
                  <span className="text-dim text-xs">{document.sections.length} mục</span>
                </div>
              </div>
              <nav aria-label="Mục lục" className="mt-4 max-h-[56vh] overflow-y-auto pr-1">
                <Contents document={document} />
              </nav>
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

          <article aria-label={document.title} className="mt-10 min-w-0 lg:mt-0">
            <div className="border-border text-mist flex items-center justify-between gap-4 border-b pb-5 text-[11px] font-semibold tracking-[0.16em] uppercase">
              <span>Nội dung chi tiết</span>
              <span className="text-gold">{isPrivacy ? "Bảo mật" : "Điều khoản"}</span>
            </div>
            {document.sections.map((section, index) => (
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
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id={`${section.id}-title`}
                      className="font-editorial text-ivory text-[23px] leading-snug font-bold sm:text-[27px]"
                    >
                      {section.title.replace(/^\d+\.\s*/, "")}
                    </h2>
                    <div className="text-sand mt-5 space-y-4 text-[15px] leading-[1.9] break-words sm:mt-6 sm:text-base">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {section.items && (
                        <ul className="border-gold/20 bg-panel mt-6 space-y-4 border-l-2 px-5 py-5 sm:px-6">
                          {section.items.map((item) => (
                            <li key={item} className="flex gap-3">
                              <span aria-hidden="true" className="bg-gold mt-[0.8em] size-1.5 shrink-0 rounded-full" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ))}
            <div className="bg-panel border-border mt-10 flex flex-col items-start justify-between gap-5 border p-6 sm:flex-row sm:items-center sm:p-8">
              <div>
                <p className="text-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Đọc tiếp</p>
                <p className="font-editorial mt-2 text-xl font-bold">{otherTitle}</p>
              </div>
              <Link
                href={otherHref}
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
