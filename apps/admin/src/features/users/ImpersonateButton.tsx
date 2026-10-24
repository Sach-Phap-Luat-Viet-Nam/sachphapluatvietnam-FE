"use client";

import { useMutation } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { ConfirmButton } from "@/components/ConfirmButton";
import { adminErrorMessage } from "@/lib/admin-errors";
import { openImpersonation } from "./impersonation";

const ERROR_OVERRIDES = {
  CANNOT_IMPERSONATE: "Không đăng nhập hộ được chính mình hoặc tài khoản Super Admin khác.",
  ACCOUNT_DISABLED: "Tài khoản đã bị vô hiệu hóa, kích hoạt lại trước khi đăng nhập hộ.",
};

export interface ImpersonateButtonProps {
  account: { id: number; email: string; fullName: string; roles: readonly string[] };
  onResult: (result: { ok: true; message: string } | { ok: false; message: string }) => void;
}

/** Nút "Đăng nhập hộ" có bước xác nhận; mở tab mới ở app đích (khách → Storefront, nhân viên → Admin). */
export function ImpersonateButton({ account, onResult }: ImpersonateButtonProps) {
  const impersonation = useMutation({
    mutationFn: () => openImpersonation(account),
    onSuccess: () => onResult({ ok: true, message: `Đã mở tab đăng nhập hộ ${account.email}.` }),
    onError: (error) =>
      onResult({
        ok: false,
        // Lỗi trước khi gọi API (chặn popup, thiếu cấu hình) là `Error` thường, đã có câu chữ tiếng Việt.
        message:
          error instanceof Error && !("code" in error) ? error.message : adminErrorMessage(error, ERROR_OVERRIDES),
      }),
  });

  return (
    <ConfirmButton
      question={`Đăng nhập hộ ${account.fullName}? Mọi thao tác sẽ ghi nhận như do chính người này làm.`}
      confirmLabel="Đăng nhập hộ"
      onConfirm={() => impersonation.mutate()}
      pending={impersonation.isPending}
    >
      <LogIn size={16} aria-hidden="true" /> Đăng nhập hộ
    </ConfirmButton>
  );
}
