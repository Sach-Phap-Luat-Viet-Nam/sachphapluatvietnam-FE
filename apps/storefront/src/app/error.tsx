"use client";

import { ErrorState } from "@/components/ErrorState";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} title="Đã có lỗi xảy ra" />;
}
