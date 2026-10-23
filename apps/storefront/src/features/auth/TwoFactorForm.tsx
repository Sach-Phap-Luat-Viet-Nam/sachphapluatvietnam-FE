"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { cn } from "@slvn/ui";
import { loginWithTwoFactor } from "./api";
import { authErrorMessage, fieldErrors } from "./auth-errors";
import { FORM_ERROR, INPUT, LABEL, SUBMIT } from "./form-styles";
import { twoFactorSchema } from "./schemas";
import type { TwoFactorValues } from "./schemas";

export interface TwoFactorFormProps {
  twoFactorToken: string;
  onSuccess: () => void;
  /** Quay lại bước nhập mật khẩu, kèm lý do nếu `twoFactorToken` đã hết hạn. */
  onRestart: (message?: string) => void;
}

export function TwoFactorForm({ twoFactorToken, onSuccess, onRestart }: TwoFactorFormProps) {
  // Giữ nút ở trạng thái chờ trong lúc chuyển trang để không gửi lại mã.
  const [redirecting, setRedirecting] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TwoFactorValues>({ resolver: zodResolver(twoFactorSchema), defaultValues: { code: "" } });

  const onSubmit = async ({ code }: TwoFactorValues) => {
    try {
      await loginWithTwoFactor(twoFactorToken, code);
      setRedirecting(true);
      onSuccess();
    } catch (error) {
      if (isApiError(error) && error.code === "TWO_FACTOR_TOKEN_INVALID") {
        onRestart(authErrorMessage(error));
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <p className="text-sand leading-7">
        Tài khoản đã bật xác thực 2 lớp. Anh/chị nhập mã 6 số đang hiện trong ứng dụng xác thực.
      </p>
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
          // Chuyển bước do khách vừa bấm Đăng nhập nên đưa focus vào ô nhập mã luôn.
          autoFocus
          {...register("code")}
          aria-invalid={Boolean(errors.code)}
          aria-describedby={errors.code ? "otp-code-error" : undefined}
          className={cn(INPUT, "border-border tracking-[0.4em]")}
        />
        {errors.code && (
          <p id="otp-code-error" role="alert" className="text-danger text-sm">
            {errors.code.message}
          </p>
        )}
      </div>
      <button type="submit" disabled={isSubmitting || redirecting} className={SUBMIT}>
        {isSubmitting || redirecting ? "Đang xác thực…" : "Xác nhận"}
        <ArrowRight size={18} />
      </button>
      {errors.root?.server && (
        <p role="alert" className={FORM_ERROR}>
          {errors.root.server.message}
        </p>
      )}
      <button
        type="button"
        onClick={() => onRestart()}
        className="link-underline text-mist hover:text-gold flex min-h-11 w-fit items-center gap-2 text-[15px]"
      >
        <ArrowLeft size={16} /> Đăng nhập bằng tài khoản khác
      </button>
    </form>
  );
}
