"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { authErrorMessage, fieldErrors, register as registerAccount, registerSchema, safeNextPath } from "@slvn/auth";
import type { RegisterValues } from "@slvn/auth";
import { cn } from "@slvn/ui";
import { FORM_ERROR, INPUT, LABEL, SUBMIT } from "@/components/form-styles";
import { TextField } from "@/components/TextField";

const REGISTER_FIELDS = ["fullName", "email", "phoneNumber", "password"] as const;

/** Đăng ký tài khoản khách hàng. Backend trả luôn phiên đăng nhập nên đăng ký xong chuyển thẳng tới `?next=`. */
export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  // Giữ nút ở trạng thái chờ trong lúc chuyển trang để không đăng ký hai lần.
  const [redirecting, setRedirecting] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", phoneNumber: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: RegisterValues) => {
    try {
      await registerAccount(values);
      setRedirecting(true);
      // Đọc lúc submit thay vì `useSearchParams` để trang đăng ký vẫn render tĩnh.
      router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
    } catch (error) {
      if (isApiError(error) && error.code === "EMAIL_TAKEN") {
        setError("email", { message: authErrorMessage(error) });
        return;
      }
      const invalidFields = fieldErrors(error, REGISTER_FIELDS);
      invalidFields.forEach(({ field, message }) => setError(field, { message }));
      if (invalidFields.length === 0) {
        setError("root.server", { message: authErrorMessage(error) });
      }
    }
  };

  const busy = isSubmitting || redirecting;
  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <TextField
          id="fullName"
          label="Họ tên"
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          registration={register("fullName")}
          error={errors.fullName?.message}
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          placeholder="ban@example.com"
          registration={register("email")}
          error={errors.email?.message}
        />
        <TextField
          id="phoneNumber"
          label="Số điện thoại (không bắt buộc)"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="0901234567"
          registration={register("phoneNumber")}
          error={errors.phoneNumber?.message}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className={LABEL}>
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Tối thiểu 8 ký tự"
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
        <TextField
          id="confirmPassword"
          label="Nhập lại mật khẩu"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          registration={register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />
        <button type="submit" disabled={busy} className={SUBMIT}>
          {busy ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
          <ArrowRight size={18} />
        </button>
        {errors.root?.server && (
          <p role="alert" className={FORM_ERROR}>
            {errors.root.server.message}
          </p>
        )}
      </form>
      <p className="text-mist text-[15px]">
        Đã có tài khoản?{" "}
        <Link
          href="/dang-nhap"
          onClick={(event) => {
            // Giữ `?next=` để đăng nhập xong vẫn quay lại đúng trang; không có JS thì link thường vẫn hoạt động.
            event.preventDefault();
            router.push(`/dang-nhap${window.location.search}`);
          }}
          className="text-gold link-underline"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
