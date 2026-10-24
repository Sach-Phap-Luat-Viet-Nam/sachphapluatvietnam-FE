import type { Metadata } from "next";
import { AuthLayout } from "@/components/AuthLayout";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <AuthLayout title="Đăng nhập quản trị" lead="Dành cho nhân viên Sách Luật Việt Nam.">
      <LoginForm />
    </AuthLayout>
  );
}
