import { Button } from "@slvn/ui";
import { adminErrorMessage } from "@/lib/admin-errors";
import { FORM_ERROR } from "./form-styles";

/** Dòng "đang tải" cho dữ liệu lấy bằng TanStack Query. */
export function LoadingStatus({ label = "Đang tải dữ liệu…" }: { label?: string }) {
  return (
    <p role="status" className="text-muted py-6">
      {label}
    </p>
  );
}

export interface ErrorStatusProps {
  error: unknown;
  onRetry?: () => void;
  overrides?: Record<string, string>;
}

/** Thông báo lỗi khi tải dữ liệu, kèm nút thử lại. */
export function ErrorStatus({ error, onRetry, overrides }: ErrorStatusProps) {
  return (
    <div role="alert" className={`${FORM_ERROR} flex flex-wrap items-center justify-between gap-3`}>
      <span>{adminErrorMessage(error, overrides)}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
