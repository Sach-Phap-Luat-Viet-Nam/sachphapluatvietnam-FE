"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, LogIn, LogOut, LockOpen } from "lucide-react";
import { Button } from "@slvn/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { FORM_ERROR, FORM_SUCCESS, INPUT } from "@/components/form-styles";
import { adminErrorMessage, showServerError } from "@/lib/admin-errors";
import { lockUser, logoutUser, resetPassword, unlockUser, userKeys } from "./api";
import { canManage, openImpersonation } from "./impersonation";
import { resetPasswordSchema } from "./schemas";
import type { AdminUser, ResetPasswordValues } from "./schemas";

const ERROR_OVERRIDES = {
  CANNOT_MANAGE_USER: "Không thao tác được với chính mình hoặc tài khoản Super Admin khác.",
  CANNOT_IMPERSONATE: "Không đăng nhập hộ được chính mình hoặc tài khoản Super Admin khác.",
  USER_NOT_FOUND: "Không tìm thấy tài khoản, có thể trang đã cũ. Anh/chị tải lại trang.",
};

export interface AccountActionsProps {
  account: AdminUser;
  currentUserId: number;
}

type Notice = { tone: "success" | "error"; message: string } | null;

/** Đăng nhập hộ, đăng xuất hộ, khóa/mở khóa, đặt lại mật khẩu cho một tài khoản (nhân viên hoặc khách hàng). */
export function AccountActions({ account, currentUserId }: AccountActionsProps) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<Notice>(null);
  const [resetting, setResetting] = useState(false);
  const manageable = canManage(account, currentUserId);

  const done = async (message: string) => {
    setNotice({ tone: "success", message });
    await queryClient.invalidateQueries({ queryKey: userKeys.all });
  };
  const failed = (error: unknown) =>
    setNotice({
      tone: "error",
      message: error instanceof Error && !("code" in error) ? error.message : adminErrorMessage(error, ERROR_OVERRIDES),
    });

  const impersonation = useMutation({
    mutationFn: () => openImpersonation(account),
    onSuccess: () => setNotice({ tone: "success", message: `Đã mở tab đăng nhập hộ ${account.email}.` }),
    onError: failed,
  });
  const logout = useMutation({
    mutationFn: () => logoutUser(account.id),
    onSuccess: (revoked) => done(`Đã đăng xuất ${revoked} phiên đăng nhập của ${account.email}.`),
    onError: failed,
  });
  const lock = useMutation({
    mutationFn: () => (account.isLocked ? unlockUser(account.id) : lockUser(account.id)),
    onSuccess: (updated) =>
      done(updated.isLocked ? `Đã khóa ${account.email} và đăng xuất mọi phiên.` : `Đã mở khóa ${account.email}.`),
    onError: failed,
  });
  const pending = impersonation.isPending || logout.isPending || lock.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {manageable && (
          <ConfirmButton
            question={`Đăng nhập hộ ${account.email}? Mọi thao tác sẽ ghi nhận như do chính người này làm.`}
            confirmLabel="Đăng nhập hộ"
            onConfirm={() => impersonation.mutate()}
            pending={pending}
          >
            <LogIn size={16} aria-hidden="true" /> Đăng nhập hộ
          </ConfirmButton>
        )}
        <ConfirmButton
          question={`Đăng xuất ${account.email} trên mọi thiết bị?`}
          confirmLabel="Đăng xuất hộ"
          onConfirm={() => logout.mutate()}
          pending={pending}
        >
          <LogOut size={16} aria-hidden="true" /> Đăng xuất hộ
        </ConfirmButton>
        {manageable &&
          (account.isLocked ? (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => lock.mutate()}>
              <LockOpen size={16} aria-hidden="true" /> Mở khóa
            </Button>
          ) : (
            <ConfirmButton
              question={`Khóa ${account.email}? Tài khoản bị đăng xuất và không đăng nhập được tới khi mở khóa.`}
              confirmLabel="Khóa tài khoản"
              onConfirm={() => lock.mutate()}
              pending={pending}
            >
              <Lock size={16} aria-hidden="true" /> Khóa
            </ConfirmButton>
          ))}
        {manageable && !resetting && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setResetting(true)}>
            <KeyRound size={16} aria-hidden="true" /> Đặt lại mật khẩu
          </Button>
        )}
      </div>

      {resetting && (
        <ResetPasswordForm
          account={account}
          onCancel={() => setResetting(false)}
          onDone={() => {
            setResetting(false);
            void done(
              `Đã đặt mật khẩu tạm cho ${account.email} và đăng xuất mọi phiên. Gửi mật khẩu cho họ qua kênh riêng.`,
            );
          }}
        />
      )}

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={notice.tone === "error" ? FORM_ERROR : FORM_SUCCESS}
        >
          {notice.message}
        </p>
      )}
    </div>
  );
}

function ResetPasswordForm({
  account,
  onCancel,
  onDone,
}: {
  account: AdminUser;
  onCancel: () => void;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { newPassword: "" } });
  const id = `reset-password-${account.id}`;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async ({ newPassword }) => {
        try {
          await resetPassword(account.id, newPassword);
          onDone();
        } catch (error) {
          showServerError(error, ["newPassword"], setError);
        }
      })}
      className="flex max-w-md flex-col gap-4"
    >
      <Field
        id={id}
        label="Mật khẩu tạm mới"
        hint="Tối thiểu 8 ký tự. Người dùng nên đổi mật khẩu sau khi đăng nhập."
        error={errors.newPassword?.message}
      >
        <input
          type="text"
          autoComplete="off"
          className={INPUT}
          {...fieldA11y(id, errors.newPassword?.message, true)}
          {...register("newPassword")}
        />
      </Field>
      <FormActions
        pending={isSubmitting}
        submitLabel="Đặt mật khẩu"
        onCancel={onCancel}
        error={errors.root?.server?.message}
      />
    </form>
  );
}
