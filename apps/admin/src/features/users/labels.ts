import { formatDateTime } from "@slvn/utils";
import type { BadgeTone } from "@/components/StatusBadge";
import type { AdminUser } from "./schemas";

/** Trạng thái tài khoản: bị Super Admin khóa, tạm khóa do sai mật khẩu (kèm giờ mở), hoặc đang hoạt động. */
export function accountStatus(account: AdminUser): { tone: BadgeTone; label: string } {
  if (!account.isLocked) {
    return { tone: "success", label: "Hoạt động" };
  }
  return account.lockedUntil
    ? { tone: "warning", label: `Tạm khóa đến ${formatDateTime(account.lockedUntil) ?? ""}` }
    : { tone: "danger", label: "Đã khóa" };
}

export const OCCUPATION_LABELS: Record<string, string> = {
  student: "Sinh viên",
  lawyer: "Luật sư",
  accountant: "Kế toán",
  other: "Khác",
};
