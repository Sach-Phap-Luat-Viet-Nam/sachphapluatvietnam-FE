import Link from "next/link";
import { Avatar } from "@slvn/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD } from "@/components/form-styles";
import { roleLabel } from "@/lib/roles";
import { AccountActions } from "./AccountActions";
import type { CustomerUser, StaffUser } from "./schemas";

export interface UserCardProps {
  account: StaffUser | CustomerUser;
  kind: "staff" | "customer";
  currentUserId: number;
}

/**
 * Một dòng trong danh sách Nhân viên hoặc Khách hàng, cùng bố cục cho cả hai: tên và nhãn trạng thái, email (kèm số điện
 * thoại nếu có), vai trò, rồi thanh thao tác `AccountActions`. Khách hàng thêm link tới trang chi tiết.
 */
export function UserCard({ account, kind, currentUserId }: UserCardProps) {
  const phoneNumber = "phoneNumber" in account ? account.phoneNumber : null;
  const staffRoles = account.roles.filter((role) => role !== "customer");
  return (
    <li className={`${CARD} flex flex-col gap-4 p-5`}>
      <div className="flex items-start gap-4">
        {/* Tên hiện ngay cạnh nên avatar chỉ để trang trí. */}
        <Avatar name={account.fullName} url={account.avatarUrl} size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {kind === "customer" ? (
              <Link href={`/khach-hang/${account.id}`} className="text-primary text-lg font-semibold hover:underline">
                {account.fullName}
              </Link>
            ) : (
              <span className="text-lg font-semibold">{account.fullName}</span>
            )}
            {account.id === currentUserId && <StatusBadge tone="info">Bạn</StatusBadge>}
            {account.isActive ? (
              <StatusBadge tone="success">Hoạt động</StatusBadge>
            ) : (
              <StatusBadge tone="danger">Đã vô hiệu hóa</StatusBadge>
            )}
            {kind === "staff" &&
              (account.twoFactorEnabled ? (
                <StatusBadge tone="info">Đã bật 2FA</StatusBadge>
              ) : (
                // Chỉ Super Admin bị bắt buộc 2FA nên mới tô cảnh báo; nhân viên khác chưa bật là bình thường.
                <StatusBadge tone={account.requiresTwoFactorSetup ? "warning" : "neutral"}>Chưa bật 2FA</StatusBadge>
              ))}
          </div>
          <p className="text-muted text-sm break-all">
            {account.email}
            {phoneNumber && <span className="break-normal"> · {phoneNumber}</span>}
          </p>
          {kind === "staff" && (
            <p className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-muted">Vai trò:</span>
              {staffRoles.length > 0 ? (
                staffRoles.map((role) => (
                  <StatusBadge key={role} tone="neutral">
                    {roleLabel(role)}
                  </StatusBadge>
                ))
              ) : (
                <span className="text-muted">Chưa có</span>
              )}
            </p>
          )}
        </div>
      </div>

      <AccountActions
        account={account}
        currentUserId={currentUserId}
        rolesEditable={kind === "staff"}
        detailHref={kind === "customer" ? `/khach-hang/${account.id}` : undefined}
      />
    </li>
  );
}
