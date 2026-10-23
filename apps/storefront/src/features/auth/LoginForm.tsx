"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Info, LockKeyhole } from "lucide-react";
import { Button } from "@slvn/ui";
import { loginSchema } from "./schemas";
import type { LoginValues } from "./schemas";

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
    <form onSubmit={handleSubmit(() => setSubmitted(true))} noValidate className="mt-8 space-y-6">
      <div>
        <label htmlFor="email" className="text-primary mb-2 block text-sm font-semibold">
          Địa chỉ email <span className="text-accent">*</span>
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="ban@example.com"
          {...register("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="border-border bg-background focus:border-primary h-12 w-full rounded-md border px-4 transition-colors"
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-danger mt-2 text-sm">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="text-primary mb-2 block text-sm font-semibold">
          Mật khẩu <span className="text-accent">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu của bạn"
            {...register("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="border-border bg-background focus:border-primary h-12 w-full rounded-md border pr-12 pl-4"
          />
          <button
            type="button"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword(!showPassword)}
            className="text-muted absolute top-1 right-1 rounded p-3"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" role="alert" className="text-danger mt-2 text-sm">
            {errors.password.message}
          </p>
        )}
      </div>
      <label className="text-muted flex w-fit items-center gap-2.5 text-sm">
        <input type="checkbox" {...register("rememberMe")} className="accent-primary size-4 rounded" />
        Ghi nhớ đăng nhập
      </label>
      <Button type="submit" disabled={isSubmitting} size="lg" className="w-full justify-between">
        {isSubmitting ? "Đang kiểm tra…" : "Đăng nhập"}
        <ArrowRight size={19} />
      </Button>
      {submitted && (
        <p role="status" className="border-border bg-surface text-primary rounded-md border p-4 text-sm leading-6">
          Thông tin đã hợp lệ. Đây là bản xem trước giao diện; chức năng đăng nhập sẽ hoạt động sau khi kết nối backend.
        </p>
      )}
      <div className="text-muted flex items-center justify-center gap-2 text-xs">
        <LockKeyhole size={14} />
        Bảo vệ thông tin tài khoản của bạn
      </div>
      <div className="bg-paper text-muted flex gap-2.5 rounded-md p-3 text-xs leading-5">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>Bản xem trước chưa kết nối đăng nhập. Vui lòng dùng thông tin thử nghiệm.</p>
      </div>
    </form>
  );
}
