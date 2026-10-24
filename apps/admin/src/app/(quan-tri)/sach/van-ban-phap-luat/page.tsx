import type { Metadata } from "next";
import { LegalDocumentManager } from "@/features/catalog/LegalDocumentManager";

export const metadata: Metadata = { title: "Văn bản pháp luật" };

export default function LegalDocumentsPage() {
  return <LegalDocumentManager />;
}
