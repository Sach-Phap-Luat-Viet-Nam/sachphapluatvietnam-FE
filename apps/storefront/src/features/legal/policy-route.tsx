import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStaticPage } from "./api";
import { PolicyPage } from "./PolicyPage";
import type { PolicySlug } from "./PolicyPage";
import { preparePolicyHtml } from "./policy-html";

// Dùng chung cho `/dieu-khoan-su-dung` và `/chinh-sach-bao-mat`: nội dung lấy từ `GET /api/v1/pages/{slug}`.

export async function policyMetadata(slug: PolicySlug): Promise<Metadata> {
  const page = await getStaticPage(slug);
  return {
    title: page?.title ?? "Không tìm thấy trang",
    description: page?.description ?? undefined,
    // Bản dự thảo chưa được rà soát pháp lý: không để công cụ tìm kiếm trình bày như chính sách đang hiệu lực.
    robots: { index: false, follow: true },
  };
}

export async function PolicyRoute({ slug }: { slug: PolicySlug }) {
  const page = await getStaticPage(slug);
  if (!page) notFound();
  return <PolicyPage slug={slug} page={page} content={preparePolicyHtml(page.contentHtml)} />;
}
