"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@slvn/ui";
import { loginSchema } from "./schemas";
import type { LoginValues } from "./schemas";

// Chữ hoa bằng CSS để trình đọc màn hình vẫn đọc nhãn như từ thường.
const LABEL = "text-gold text-[11px] tracking-[0.26em] uppercase";
const INPUT =
  "bg-ink-deep text-ivory h-13 w-full border px-4 text-base transition-colors focus:border-gold aria-invalid:border-danger";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });
  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit(() => setSubmitted(true))} noValidate className="flex flex-col gap-5">
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-sweep bg-gold text-ink flex min-h-13.5 items-center justify-center gap-2.5 text-base font-semibold disabled:opacity-60"
        >
          {isSubmitting ? "Đang kiểm tra…" : "Đăng nhập"}
          <ArrowRight size={18} />
        </button>
        {submitted && (
          <p role="status" className="border-gold/40 text-sand border px-4 py-3 text-sm leading-6">
            Thông tin đã hợp lệ. Chức năng đăng nhập sẽ hoạt động sau khi kết nối backend.
          </p>
        )}
      </form>
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
