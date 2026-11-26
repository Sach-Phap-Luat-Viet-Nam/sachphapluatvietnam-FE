import { PolicyRoute, policyMetadata } from "@/features/legal/policy-route";

const SLUG = "dieu-khoan-su-dung";

export function generateMetadata() {
  return policyMetadata(SLUG);
}

export default function TermsPage() {
  return <PolicyRoute slug={SLUG} />;
}
