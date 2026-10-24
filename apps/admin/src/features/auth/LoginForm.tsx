"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import {
  authErrorMessage,
  clearSession,
  fieldErrors,
  login,
  loginSchema,
  loginWithTwoFactor,
  logout,
} from "@slvn/auth";
import type { LoginValues, SessionUser } from "@slvn/auth";
import { CodeForm } from "./CodeForm";
import { FIELD_ERROR, FORM_ERROR, INPUT, LABEL, SUBMIT } from "@/components/form-styles";
import { signInDestination } from "./sign-in";

const LOGIN_FIELDS = ["email", "password"] as const;
const NOT_STAFF = "Tài khoản này không có quyền vào trang quản trị. Anh/chị dùng tài khoản nhân viên.";

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
    // Máy nhân viên có thể dùng chung nên không có "Giữ đăng nhập 30 ngày": luôn là phiên 12 giờ.
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const finish = async (user: SessionUser) => {
    // Đọc lúc đăng nhập xong thay vì `useSearchParams` để trang đăng nhập vẫn render tĩnh.
    const destination = signInDestination(user, new URLSearchParams(window.location.search).get("next"));
    if (destination) {
      setRedirecting(true);
      router.replace(destination);
      return;
    }
    // Không để lại phiên của khách hàng trên domain admin.
    try {
      await logout();
    } catch {
      // Backend lỗi thì cookie còn, nhưng vẫn xóa token ở tab này; lần sau SessionGate hiện màn không có quyền.
      clearSession();
    }
    setTwoFactorToken(null);
    setError("root.server", { message: NOT_STAFF });
  };

  const onSubmit = async (values: LoginValues) => {
    try {
      const result = await login(values);
      if (result.status === "two-factor") {
        setTwoFactorToken(result.twoFactorToken);
        return;
      }
      await finish(result.user);
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

  if (twoFactorToken) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-muted leading-7">Anh/chị nhập mã 6 số đang hiện trong ứng dụng xác thực.</p>
        <CodeForm
          submitLabel="Xác nhận"
          pendingLabel="Đang xác thực…"
          onSubmitCode={async (code) => finish(await loginWithTwoFactor(twoFactorToken, code))}
          onError={(error) => {
            if (isApiError(error) && error.code === "TWO_FACTOR_TOKEN_INVALID") {
              restart(authErrorMessage(error));
              return true;
            }
            return false;
          }}
        />
        <button
          type="button"
          onClick={() => restart()}
          className="text-muted hover:text-foreground flex min-h-11 w-fit items-center gap-2 text-base"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Đăng nhập bằng tài khoản khác
        </button>
      </div>
    );
  }

  const busy = isSubmitting || redirecting;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={LABEL}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="ten@sachluat.vn"
          {...register("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={INPUT}
        />
        {errors.email && (
          <p id="email-error" role="alert" className={FIELD_ERROR}>
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
            {...register("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`${INPUT} pr-13`}
          />
          <button
            type="button"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword(!showPassword)}
            className="text-muted hover:text-foreground absolute top-0.5 right-0.5 flex size-11 items-center justify-center"
          >
            {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" role="alert" className={FIELD_ERROR}>
            {errors.password.message}
          </p>
        )}
      </div>
      <button type="submit" disabled={busy} className={SUBMIT}>
        {busy ? "Đang kiểm tra…" : "Đăng nhập"}
      </button>
      {errors.root?.server && (
        <p role="alert" className={FORM_ERROR}>
          {errors.root.server.message}
        </p>
      )}
    </form>
  );
}
