import type { Metadata } from "next";
import { PolicyPage } from "@/features/legal/PolicyPage";
import { privacy } from "@/features/legal/content";

export const metadata: Metadata = {
  title: privacy.title,
  description: privacy.description,
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return <PolicyPage document={privacy} />;
}
