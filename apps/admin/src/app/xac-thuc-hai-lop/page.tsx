import type { Metadata } from "next";
import { AuthLayout } from "@/components/AuthLayout";
import { TwoFactorSetupScreen } from "@/features/auth/TwoFactorSetupScreen";

export const metadata: Metadata = { title: "Bật xác thực 2 lớp" };

export default function TwoFactorSetupPage() {
  return (
    <AuthLayout title="Bật xác thực 2 lớp">
      <TwoFactorSetupScreen />
    </AuthLayout>
  );
}
