"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getServerSessionState, getSessionState, restoreSession, subscribeSession } from "@slvn/auth";
import type { SessionUser } from "@slvn/auth";
import { loginPath } from "@/lib/routes";
import { gateDecision } from "@/lib/session-gate";
import type { GateRequirement } from "@/lib/session-gate";
import { LogoutButton } from "./LogoutButton";

export interface SessionGateProps {
  requirement: GateRequirement;
  children: (user: SessionUser) => ReactNode;
}

/** Chỉ hiện nội dung khi phiên đạt yêu cầu; chưa đăng nhập hoặc chưa bật 2FA thì chuyển trang. */
export function SessionGate({ requirement, children }: SessionGateProps) {
  const router = useRouter();
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  const decision = gateDecision(session, requirement);
  const needsLogin = decision.kind === "login";
  const redirectTo = decision.kind === "redirect" ? decision.to : null;

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (needsLogin) {
      // Đọc path lúc chuyển trang thay vì `useSearchParams` để trang vẫn render tĩnh.
      router.replace(loginPath(window.location.pathname + window.location.search));
    } else if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [needsLogin, redirectTo, router]);

  if (decision.kind === "allow") {
    return children(decision.user);
  }
  if (decision.kind === "forbidden") {
    return <Forbidden email={decision.user.email} />;
  }
  return (
    <main id="noi-dung" className="flex min-h-dvh items-center justify-center p-4">
      <p role="status" className="text-muted">
        Đang kiểm tra phiên đăng nhập…
      </p>
    </main>
  );
}

function Forbidden({ email }: { email: string }) {
  return (
    <main id="noi-dung" className="flex min-h-dvh items-center justify-center p-4">
      <section className="bg-background border-border flex w-full max-w-md flex-col gap-4 rounded-lg border p-6 sm:p-8">
        <ShieldAlert size={32} className="text-danger" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Không có quyền truy cập</h1>
        <p className="text-muted leading-7">
          Tài khoản <strong className="text-foreground">{email}</strong> không có vai trò nhân viên nên không vào được
          trang quản trị. Anh/chị đăng xuất rồi đăng nhập bằng tài khoản nhân viên.
        </p>
        <LogoutButton />
      </section>
    </main>
  );
}
