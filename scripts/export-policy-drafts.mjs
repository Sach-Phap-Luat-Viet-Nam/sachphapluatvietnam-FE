import { mkdir, writeFile } from "node:fs/promises";
import { terms, privacy, POLICY_DRAFT_DATE } from "../apps/storefront/src/features/legal/content.ts";

const directory = new URL("../docs/legal/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const [filename, document] of [
  ["dieu-khoan-su-dung.md", terms],
  ["chinh-sach-bao-mat.md", privacy],
]) {
  const sections = document.sections.map((section) =>
    [
      `## ${section.title}`,
      ...section.paragraphs,
      ...(section.items ? [section.items.map((item) => `- ${item}`).join("\n\n")] : []),
    ].join("\n\n"),
  );
  const markdown = [
    `# ${document.title}`,
    `> BẢN DỰ THẢO — soạn ngày ${POLICY_DRAFT_DATE}, chưa có ngày hiệu lực.`,
    "> Xuất từ apps/storefront/src/features/legal/content.ts. Sửa nguồn rồi chạy node scripts/export-policy-drafts.mjs để cập nhật.",
    document.description,
    ...sections,
    "---",
    "Các thông tin cần hoàn thiện và căn cứ rà soát: [storefront-policies.md](../features/storefront-policies.md).",
  ].join("\n\n");
  await writeFile(new URL(filename, directory), `${markdown}\n`, "utf8");
  console.log(`Exported docs/legal/${filename}`);
}
