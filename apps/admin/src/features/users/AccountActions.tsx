"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Ban, CircleCheck, KeyRound, LogOut, UserCog } from "lucide-react";
import { buttonClassName, Button } from "@slvn/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FORM_ERROR, FORM_SUCCESS } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import { customerKeys, logoutEverywhere, resetPassword, setActive, setRoles, staffKeys } from "./api";
import { ImpersonateButton } from "./ImpersonateButton";
import type { StaffUser } from "./schemas";
import { canManage, toSetRolesBody } from "./user-forms";
import { PasswordForm, RolesForm } from "./UserForms";

/** Form đang mở dưới thanh nút; mở form này thì đóng form kia. */
type Panel = "roles" | "password" | null;
type Notice = { ok: boolean; message: string } | null;

export interface AccountActionsProps {
  /** Nhân viên hoặc khách hàng: cùng các field `id`, `email`, `fullName`, `roles`, `isActive`. */
  account: StaffUser;
  currentUserId: number;
  /** Chỉ màn Nhân viên cho đổi vai trò; khách hàng không có vai trò để đổi. */
  rolesEditable?: boolean;
  /** Đường dẫn trang chi tiết; có thì hiện nút "Xem chi tiết". */
  detailHref?: string;
}

/**
 * Thanh thao tác chung cho nhân viên và khách hàng, xếp theo ba nhóm để dễ nhìn:
 * 1. nút chính **Đăng nhập hộ** (xanh navy, đặc);
 * 2. quản lý tài khoản: Đổi vai trò, Đặt mật khẩu, Xem chi tiết (viền xám);
 * 3. thao tác nhạy cảm đẩy sang phải: Đăng xuất hộ (viền xám), Vô hiệu hóa (viền đỏ) hoặc Kích hoạt lại (viền xanh lá).
 * Thao tác nào backend không cho (chính mình, Super Admin khác) thì không hiện. Kết quả và lỗi hiện ngay dưới thanh nút.
 */
export function AccountActions({ account, currentUserId, rolesEditable, detailHref }: AccountActionsProps) {
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const manageable = canManage(account, currentUserId);
  const isSelf = account.id === currentUserId;
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: staffKeys.lists }),
      queryClient.invalidateQueries({ queryKey: customerKeys.all }),
    ]);
  };
  const fail = (error: unknown) => setNotice({ ok: false, message: adminErrorMessage(error) });

  const roles = useMutation({
    mutationFn: ({ staffRoles }: { staffRoles: Parameters<typeof toSetRolesBody>[1] }) =>
      setRoles(account.id, toSetRolesBody(account, staffRoles).roles),
    onSuccess: refresh,
  });
  const password = useMutation({ mutationFn: (newPassword: string) => resetPassword(account.id, newPassword) });
  const active = useMutation({
    mutationFn: (value: boolean) => setActive(account.id, value),
    onSuccess: async (_user, value) => {
      setNotice({
        ok: true,
        message: value
          ? `Đã kích hoạt lại ${account.fullName}.`
          : `Đã vô hiệu hóa ${account.fullName} và đăng xuất mọi thiết bị.`,
      });
      await refresh();
    },
    onError: fail,
  });
  const logout = useMutation({
    mutationFn: () => logoutEverywhere(account.id),
    onSuccess: (count) =>
      setNotice({
        ok: true,
        message:
          count > 0
            ? `Đã buộc đăng xuất ${account.fullName} khỏi mọi thiết bị (${count} phiên), có hiệu lực ngay.`
            : `Đã buộc đăng xuất ${account.fullName}: không còn phiên làm mới nào, token đang dùng cũng đã bị vô hiệu ngay.`,
      }),
    onError: fail,
  });

  const canImpersonate = manageable && account.isActive;
  const showRoles = Boolean(rolesEditable) && manageable;
  const hasManageGroup = showRoles || manageable || Boolean(detailHref);
  const hasSensitiveGroup = !isSelf || manageable;
  const hasAnyAction = canImpersonate || hasManageGroup || hasSensitiveGroup;
  if (!hasAnyAction && !notice) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-4">
        {canImpersonate && (
          <ImpersonateButton account={account} variant="primary" onResult={(result) => setNotice(result)} />
        )}

        {hasManageGroup && (
          <div role="group" aria-label="Quản lý tài khoản" className="flex flex-wrap items-center gap-2">
            {showRoles && (
              <Button
                variant="outline"
                size="sm"
                aria-label={`Đổi vai trò của ${account.fullName}`}
                onClick={() => {
                  setNotice(null);
                  setPanel(panel === "roles" ? null : "roles");
                }}
              >
                <UserCog size={16} aria-hidden="true" /> Đổi vai trò
              </Button>
            )}
            {manageable && (
              <Button
                variant="outline"
                size="sm"
                aria-label={`Đặt mật khẩu mới cho ${account.fullName}`}
                onClick={() => {
                  setNotice(null);
                  setPanel(panel === "password" ? null : "password");
                }}
              >
                <KeyRound size={16} aria-hidden="true" /> Đặt mật khẩu
              </Button>
            )}
            {detailHref && (
              <Link href={detailHref} className={buttonClassName({ variant: "outline", size: "sm" })}>
                Xem chi tiết <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        {hasSensitiveGroup && (
          <div role="group" aria-label="Thao tác nhạy cảm" className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {!isSelf && (
              <ConfirmButton
                question={`Buộc ${account.fullName} đăng xuất khỏi mọi thiết bị ngay lập tức?`}
                confirmLabel="Buộc đăng xuất"
                pending={logout.isPending}
                onConfirm={() => {
                  setNotice(null);
                  logout.mutate();
                }}
              >
                <LogOut size={16} aria-hidden="true" /> Đăng xuất hộ
              </ConfirmButton>
            )}
            {manageable &&
              (account.isActive ? (
                <ConfirmButton
                  variant="danger-outline"
                  question={`Vô hiệu hóa ${account.fullName}? Tài khoản bị đăng xuất và không đăng nhập lại được.`}
                  confirmLabel="Vô hiệu hóa"
                  pending={active.isPending}
                  onConfirm={() => {
                    setNotice(null);
                    active.mutate(false);
                  }}
                >
                  <Ban size={16} aria-hidden="true" /> Vô hiệu hóa
                </ConfirmButton>
              ) : (
                <Button
                  variant="success-outline"
                  size="sm"
                  aria-label={`Kích hoạt lại ${account.fullName}`}
                  disabled={active.isPending}
                  onClick={() => {
                    setNotice(null);
                    active.mutate(true);
                  }}
                >
                  <CircleCheck size={16} aria-hidden="true" /> Kích hoạt lại
                </Button>
              ))}
          </div>
        )}
      </div>

      {panel === "roles" && showRoles && (
        <RolesForm
          user={account}
          onCancel={() => setPanel(null)}
          onSave={async ({ roles: staffRoles }) => {
            await roles.mutateAsync({ staffRoles });
            setPanel(null);
            setNotice({ ok: true, message: `Đã cập nhật vai trò của ${account.fullName}.` });
          }}
        />
      )}
      {panel === "password" && manageable && (
        <PasswordForm
          user={account}
          onCancel={() => setPanel(null)}
          onSave={async ({ newPassword }) => {
            await password.mutateAsync(newPassword);
            setPanel(null);
            setNotice({
              ok: true,
              message: `Đã đặt mật khẩu mới cho ${account.fullName} và đăng xuất mọi thiết bị của họ.`,
            });
          }}
        />
      )}
      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={notice.ok ? FORM_SUCCESS : FORM_ERROR}>
          {notice.message}
        </p>
      )}
    </div>
  );
}
