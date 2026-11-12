import type { Metadata } from "next";
import { PolicyPage } from "@/features/legal/PolicyPage";
import { terms } from "@/features/legal/content";

export const metadata: Metadata = {
  title: terms.title,
  description: terms.description,
  // Drafts must not be presented by search engines as effective policies.
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return <PolicyPage document={terms} />;
}
