import { Button, cn } from "@slvn/ui";
import { FORM_ERROR } from "./form-styles";

export interface FormActionsProps {
  pending: boolean;
  submitLabel: string;
  /** Không truyền thì không có nút Hủy. */
  onCancel?: () => void;
  /** Lỗi chung của form (`errors.root.server`). */
  error?: string;
  className?: string;
}

/** Nút lưu (khóa khi đang gửi để không gửi hai lần), nút hủy và lỗi chung của form. */
export function FormActions({ pending, submitLabel, onCancel, error, className }: FormActionsProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending} className="font-semibold">
          {pending ? "Đang lưu…" : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Hủy
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className={FORM_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}
