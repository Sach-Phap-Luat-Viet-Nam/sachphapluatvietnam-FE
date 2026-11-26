import { PolicyRoute, policyMetadata } from "@/features/legal/policy-route";

const SLUG = "chinh-sach-bao-mat";

export function generateMetadata() {
  return policyMetadata(SLUG);
}

export default function PrivacyPage() {
  return <PolicyRoute slug={SLUG} />;
}
