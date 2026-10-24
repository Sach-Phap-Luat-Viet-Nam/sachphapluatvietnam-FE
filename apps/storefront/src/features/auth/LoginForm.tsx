"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { authErrorMessage, fieldErrors, login, loginSchema, safeNextPath } from "@slvn/auth";
import type { LoginValues } from "@slvn/auth";
import { cn } from "@slvn/ui";
import { FORM_ERROR, INPUT, LABEL, SUBMIT } from "./form-styles";
import { TwoFactorForm } from "./TwoFactorForm";

const LOGIN_FIELDS = ["email", "password"] as const;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  // Giữ nút ở trạng thái chờ trong lúc chuyển trang để không gửi lại form.
  const [redirecting, setRedirecting] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const goNext = () => {
    setRedirecting(true);
    // Đọc lúc submit thay vì `useSearchParams` để trang đăng nhập vẫn render tĩnh.
    router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
  };

  const onSubmit = async (values: LoginValues) => {
    try {
      const result = await login(values);
      if (result.status === "two-factor") {
        setTwoFactorToken(result.twoFactorToken);
        return;
      }
      goNext();
    } catch (error) {
      const invalidFields = fieldErrors(error, LOGIN_FIELDS);
      invalidFields.forEach(({ field, message }) => setError(field, { message }));
      if (invalidFields.length === 0) {
        setError("root.server", { message: authErrorMessage(error) });
      }
    }
  };

  const restart = (message?: string) => {
    setTwoFactorToken(null);
    if (message) {
      setError("root.server", { message });
    }
  };

  const busy = isSubmitting || redirecting;
  return (
    <div className="flex flex-col gap-6">
      {twoFactorToken ? (
        <TwoFactorForm twoFactorToken={twoFactorToken} onSuccess={goNext} onRestart={restart} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className={LABEL}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="ban@example.com"
              {...register("email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={cn(INPUT, "border-border")}
            />
            {errors.email && (
              <p id="email-error" role="alert" className="text-danger text-sm">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className={LABEL}>
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                {...register("password")}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                className={cn(INPUT, "border-border pr-14")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
                className="text-mist hover:text-gold absolute top-1 right-1 flex size-11 items-center justify-center"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" role="alert" className="text-danger text-sm">
                {errors.password.message}
              </p>
            )}
          </div>
          <label className="text-sand flex min-h-8 w-fit items-center gap-3 text-[15px]">
            <input type="checkbox" {...register("rememberMe")} className="accent-gold size-4.5" />
            Giữ đăng nhập 30 ngày
          </label>
          <button type="submit" disabled={busy} className={SUBMIT}>
            {busy ? "Đang kiểm tra…" : "Đăng nhập"}
            <ArrowRight size={18} />
          </button>
          {errors.root?.server && (
            <p role="alert" className={FORM_ERROR}>
              {errors.root.server.message}
            </p>
          )}
        </form>
      )}
      <div className="text-dim flex items-center gap-3.5 text-[13px]">
        <span className="bg-ivory/18 h-px flex-1" />
        hoặc
        <span className="bg-ivory/18 h-px flex-1" />
      </div>
      <Link
        href="/sach"
        className="border-ivory/30 hover:border-gold flex min-h-12.5 items-center justify-center border text-center text-[15px] transition-colors"
      >
        Tiếp tục mua sách không cần đăng nhập
      </Link>
    </div>
  );
}
