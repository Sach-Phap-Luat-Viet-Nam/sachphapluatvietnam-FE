import { cn } from "@slvn/ui";

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning-surface text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-surface text-muted border-border border",
  info: "bg-primary/10 text-primary",
};

/** Nhãn trạng thái nhỏ (Đang bán, Nháp, Ẩn...). */
export function StatusBadge({ tone, children }: { tone: BadgeTone; children: string }) {
  return (
    <span
      className={cn("inline-flex w-fit rounded px-2 py-0.5 text-sm font-medium whitespace-nowrap", TONE_CLASSES[tone])}
    >
      {children}
    </span>
  );
}
