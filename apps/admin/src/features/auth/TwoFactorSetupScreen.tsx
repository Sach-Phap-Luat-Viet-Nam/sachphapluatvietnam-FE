"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { authErrorMessage } from "@slvn/auth";
import { buttonClassName } from "@slvn/ui";
import { LogoutButton } from "@/components/LogoutButton";
import { SessionGate } from "@/components/SessionGate";
import { CodeForm } from "./CodeForm";
import { FORM_ERROR } from "@/components/form-styles";
import { HOME_PATH } from "@/lib/routes";
import { enableTwoFactor, formatSharedKey, setupTwoFactor } from "./two-factor-setup";

const STEP = "flex flex-col gap-3";
const STEP_TITLE = "text-base font-semibold";

/**
 * Màn bật 2FA: bắt buộc với Super Admin chưa bật (`requiresTwoFactorSetup = true`), tự chọn với nhân viên khác (vào từ
 * menu, có nút quay lại).
 */
export function TwoFactorSetupScreen() {
  return (
    <SessionGate requirement="two-factor-setup">
      {(user) => (
        <div className="flex flex-col gap-6">
          {user.requiresTwoFactorSetup ? (
            <p className="text-muted leading-7">
              Tài khoản <strong className="text-foreground">{user.email}</strong> cần bật xác thực 2 lớp trước khi vào
              trang quản trị.
            </p>
          ) : (
            <p className="text-muted leading-7">
              Bật xác thực 2 lớp để bảo vệ tài khoản <strong className="text-foreground">{user.email}</strong>: mỗi lần
              đăng nhập cần thêm mã từ điện thoại. Không bắt buộc, bật rồi thì không tự tắt được.
            </p>
          )}
          <TwoFactorSetupSteps />
          {user.requiresTwoFactorSetup ? (
            <LogoutButton />
          ) : (
            <Link href={HOME_PATH} className="text-muted hover:text-foreground min-h-11 text-sm underline">
              Để sau, quay lại trang quản trị
            </Link>
          )}
        </div>
      )}
    </SessionGate>
  );
}

function TwoFactorSetupSteps() {
  const setup = useMutation({ mutationFn: setupTwoFactor });

  if (!setup.data) {
    return (
      <div className="flex flex-col gap-4">
        <p className="leading-7">
          Anh/chị cài một ứng dụng xác thực trên điện thoại (Google Authenticator, Microsoft Authenticator…) rồi bấm nút
          dưới để lấy mã QR.
        </p>
        <button
          type="button"
          disabled={setup.isPending}
          onClick={() => setup.mutate()}
          className={buttonClassName({ size: "lg", className: "w-full font-semibold" })}
        >
          {setup.isPending ? "Đang tạo mã…" : "Tạo mã QR"}
        </button>
        {setup.isError && (
          <p role="alert" className={FORM_ERROR}>
            {authErrorMessage(setup.error)}
          </p>
        )}
      </div>
    );
  }

  const { authenticatorUri, sharedKey } = setup.data;
  return (
    <ol className="flex flex-col gap-6">
      <li className={STEP}>
        <h2 className={STEP_TITLE}>1. Quét mã QR bằng ứng dụng xác thực</h2>
        <div className="bg-background border-border w-fit rounded-md border p-3">
          <QRCodeSVG
            value={authenticatorUri}
            size={184}
            marginSize={1}
            title="Mã QR thêm tài khoản vào ứng dụng xác thực"
          />
        </div>
        <p className="text-muted text-sm leading-6">Không quét được thì nhập khóa này vào ứng dụng:</p>
        {/* Chỉ xuống dòng ở khoảng trắng giữa các nhóm 4 ký tự để không ngắt giữa nhóm. */}
        <code className="text-foreground bg-surface w-fit rounded px-2 py-1 font-mono text-base break-normal select-all">
          {formatSharedKey(sharedKey)}
        </code>
      </li>
      <li className={STEP}>
        <h2 className={STEP_TITLE}>2. Nhập mã 6 số ứng dụng hiển thị</h2>
        {/* Bật xong thì phiên mới có `twoFactorEnabled = true`, SessionGate tự chuyển về trang quản trị. */}
        <CodeForm submitLabel="Bật xác thực 2 lớp" pendingLabel="Đang xác nhận…" onSubmitCode={enableTwoFactor} />
      </li>
    </ol>
  );
}
