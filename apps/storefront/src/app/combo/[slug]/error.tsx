"use client";

import { ErrorState } from "@/components/ErrorState";

export default function ComboError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} title="Chưa tải được thông tin combo" />;
}
