"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Tag, X } from "lucide-react";
import { INPUT, LABEL } from "@/components/form-styles";

export interface CouponNotice {
  tone: "error" | "info";
  message: string;
  /** `COUPON_LOGIN_REQUIRED`: mã chỉ dành cho thành viên. */
  loginRequired?: boolean;
}

export interface CouponBoxProps {
  /** Mã đã được backend xác nhận và đang áp. */
  applied: string | null;
  checking: boolean;
  notice: CouponNotice | null;
  onApply: (code: string) => void;
  onRemove: () => void;
}

/** Ô nhập mã giảm giá: thành công thì giữ mã (hiện chip), lỗi thì hiện `title` của backend dưới ô nhập và không giữ mã. */
export function CouponBox({ applied, checking, notice, onApply, onRemove }: CouponBoxProps) {
  const [code, setCode] = useState("");

  const submit = (event: FormEvent) => {
    // Nằm trong `<form>` đặt hàng nên không để Enter ở ô này gửi cả đơn.
    event.preventDefault();
    event.stopPropagation();
    // Mã luôn viết hoa (không phân biệt hoa thường ở backend).
    const value = code.trim().toUpperCase();
    if (value) onApply(value);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {applied ? (
        <p className="border-ok/50 bg-ok/10 text-ok flex min-h-11 items-center justify-between gap-3 border px-4 text-[15px]">
          <span className="flex items-center gap-2 font-medium">
            <Tag size={16} aria-hidden="true" /> Mã {applied}
          </span>
          <button
            type="button"
            onClick={() => {
              setCode("");
              onRemove();
            }}
            aria-label={`Bỏ mã ${applied}`}
            className="hover:text-ivory flex size-9 items-center justify-center transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor="coupon-code" className={LABEL}>
            Mã giảm giá
          </label>
          <div className="flex gap-2">
            <input
              id="coupon-code"
              value={code}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="Nhập mã"
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit(event);
              }}
              aria-invalid={notice?.tone === "error"}
              aria-describedby={notice ? "coupon-notice" : undefined}
              className={`${INPUT} border-border h-12 min-w-0 flex-1 uppercase placeholder:normal-case`}
            />
            <button
              type="button"
              onClick={submit}
              disabled={checking || !code.trim()}
              className="border-gold text-gold hover:bg-gold/10 min-h-12 shrink-0 border px-5 font-medium transition-colors disabled:opacity-50"
            >
              {checking ? "Đang kiểm tra…" : "Áp dụng"}
            </button>
          </div>
        </div>
      )}
      {notice && (
        <p
          id="coupon-notice"
          role={notice.tone === "error" ? "alert" : "status"}
          className={notice.tone === "error" ? "text-danger text-sm leading-6" : "text-ok text-sm leading-6"}
        >
          {notice.message}
          {notice.loginRequired && (
            <>
              {" "}
              <Link href="/dang-nhap?next=%2Fthanh-toan" className="link-underline text-gold font-medium">
                Đăng nhập
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
