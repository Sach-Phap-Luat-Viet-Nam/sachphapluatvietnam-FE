"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isApiError } from "@slvn/api-client";
import { authErrorMessage, fieldErrors, twoFactorSchema } from "@slvn/auth";
import type { TwoFactorValues } from "@slvn/auth";
import { FIELD_ERROR, FORM_ERROR, INPUT, LABEL, SUBMIT } from "./form-styles";

export interface CodeFormProps {
  submitLabel: string;
  pendingLabel: string;
  /** Gửi mã lên backend; ném lỗi để form hiển thị. */
  onSubmitCode: (code: string) => Promise<void>;
  /** Xử lý riêng một số lỗi (ví dụ hết phiên 2FA). Trả `true` nếu đã xử lý. */
  onError?: (error: unknown) => boolean;
}

/** Ô nhập mã 6 số từ ứng dụng xác thực, dùng cho bước đăng nhập 2FA và màn bật 2FA. */
export function CodeForm({ submitLabel, pendingLabel, onSubmitCode, onError }: CodeFormProps) {
  // Giữ nút ở trạng thái chờ sau khi thành công (đang chuyển trang) để không gửi lại mã.
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TwoFactorValues>({ resolver: zodResolver(twoFactorSchema), defaultValues: { code: "" } });

  const onSubmit = async ({ code }: TwoFactorValues) => {
    try {
      await onSubmitCode(code);
      setDone(true);
    } catch (error) {
      if (onError?.(error)) {
        return;
      }
      const [codeError] = fieldErrors(error, ["code"]);
      if (codeError || (isApiError(error) && error.code === "OTP_INVALID")) {
        setError("code", { message: codeError?.message ?? authErrorMessage(error) }, { shouldFocus: true });
      } else {
        setError("root.server", { message: authErrorMessage(error) });
      }
    }
  };

  const busy = isSubmitting || done;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="otp-code" className={LABEL}>
          Mã xác thực
        </label>
        <input
          id="otp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          // Ô nhập mã hiện ra ngay sau thao tác của người dùng nên đưa focus vào luôn.
          autoFocus
          {...register("code")}
          aria-invalid={Boolean(errors.code)}
          aria-describedby={errors.code ? "otp-code-error" : undefined}
          className={`${INPUT} tracking-[0.4em]`}
        />
        {errors.code && (
          <p id="otp-code-error" role="alert" className={FIELD_ERROR}>
            {errors.code.message}
          </p>
        )}
      </div>
      <button type="submit" disabled={busy} className={SUBMIT}>
        {busy ? pendingLabel : submitLabel}
      </button>
      {errors.root?.server && (
        <p role="alert" className={FORM_ERROR}>
          {errors.root.server.message}
        </p>
      )}
    </form>
  );
}
