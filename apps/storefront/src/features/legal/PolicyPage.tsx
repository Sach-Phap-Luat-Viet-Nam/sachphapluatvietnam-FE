import Link from "next/link";
import { Container } from "@slvn/ui";
import { POLICY_DRAFT_DATE } from "./content";
import type { PolicyDocument } from "./content";

export function PolicyPage({ document }: { document: PolicyDocument }) {
  return (
    <main id="noi-dung">
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-gold mb-4 text-xs tracking-[0.2em] uppercase">Thông tin & chính sách</p>
          <h1 className="font-editorial text-4xl leading-tight font-bold sm:text-5xl">{document.title}</h1>
          <p className="text-mist mt-5 max-w-3xl text-base leading-8">{document.description}</p>
          <aside aria-label="Trạng thái tài liệu" className="border-gold/35 bg-panel mt-7 border p-5 text-sm leading-7">
            <p className="text-gold font-semibold">Bản dự thảo • Soạn ngày {POLICY_DRAFT_DATE}</p>
            <p className="text-sand mt-1">
              Tài liệu đang được hoàn thiện, chưa công bố ngày hiệu lực. Đầu mối tiếp nhận yêu cầu, thời hạn xử lý và
              lưu giữ dữ liệu cần được xác nhận trước khi áp dụng chính thức.
            </p>
          </aside>
          <nav aria-label="Các chính sách" className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link href="/dieu-khoan-su-dung" className="text-gold underline underline-offset-4">
              Điều khoản sử dụng
            </Link>
            <Link href="/chinh-sach-bao-mat" className="text-gold underline underline-offset-4">
              Chính sách bảo mật
            </Link>
            <a
              href="https://zalo.me/0932000035"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline underline-offset-4"
            >
              Liên hệ hỗ trợ qua Zalo (mở tab mới)
            </a>
          </nav>
          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <nav
              aria-label="Mục lục"
              className="border-border bg-panel rounded-sm border p-5 lg:sticky lg:top-24 lg:max-h-[75vh] lg:overflow-y-auto"
            >
              <h2 className="font-editorial mb-4 text-xl font-bold">Mục lục</h2>
              <ol className="space-y-3 text-sm leading-6">
                {document.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="text-sand hover:text-gold underline-offset-4 hover:underline">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <article aria-label={document.title} className="min-w-0 space-y-10">
              {document.sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-title`}
                  className="scroll-mt-28"
                >
                  <h2 id={`${section.id}-title`} className="font-editorial text-2xl leading-snug font-bold">
                    {section.title}
                  </h2>
                  <div className="text-sand mt-4 space-y-4 text-base leading-8 break-words">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.items && (
                      <ul className="marker:text-gold list-disc space-y-3 pl-5">
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              ))}
              <a href="#noi-dung" className="text-gold inline-block underline underline-offset-4">
                Về đầu trang
              </a>
            </article>
          </div>
        </div>
      </Container>
    </main>
  );
}
