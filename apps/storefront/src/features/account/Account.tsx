"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { authErrorMessage } from "@slvn/auth";
import { BookLoader } from "@/components/BookLoader";
import { FORM_ERROR } from "@/components/form-styles";
import { SignInRequired } from "@/components/SignInRequired";
import { useProfile } from "@/lib/use-account";
import { AddressBook } from "./AddressBook";
import { ProfileForm } from "./ProfileForm";

const SECTION = "border-gold/30 bg-panel flex flex-col gap-6 border px-6 py-7 sm:px-8";
const SECTION_TITLE = "font-editorial text-2xl font-bold";

/** Trang tài khoản: thông tin cá nhân và sổ địa chỉ, dùng để tự điền khi đặt hàng. Cần đăng nhập. */
export function Account() {
  const { session, data: profile, error, isError, isFetching, refetch } = useProfile();

  if (session.status === "anonymous") {
    return (
      <SignInRequired
        next="/tai-khoan"
        title="Đăng nhập để xem tài khoản"
        description="Lưu họ tên, số điện thoại và địa chỉ giao hàng để lần sau đặt sách không phải nhập lại."
      />
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className={FORM_ERROR}>
          Chưa tải được thông tin tài khoản. {authErrorMessage(error)}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="link-underline text-gold flex min-h-11 items-center gap-2"
        >
          <RefreshCw size={16} /> Thử lại
        </button>
      </div>
    );
  }

  if (!profile) {
    return <BookLoader label="Đang mở tài khoản" />;
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <section aria-labelledby="thong-tin-ca-nhan" className={SECTION}>
        <h2 id="thong-tin-ca-nhan" className={SECTION_TITLE}>
          Thông tin cá nhân
        </h2>
        {/* `key` để form nhận lại giá trị khi đổi tài khoản trong cùng trình duyệt. */}
        <ProfileForm key={profile.id} profile={profile} />
      </section>
      <div className="flex flex-col gap-8">
        <section aria-labelledby="so-dia-chi" className={SECTION}>
          <div>
            <h2 id="so-dia-chi" className={SECTION_TITLE}>
              Sổ địa chỉ
            </h2>
            <p className="text-mist mt-1.5 text-sm">Địa chỉ mặc định được chọn sẵn khi bạn đặt hàng.</p>
          </div>
          <AddressBook profile={profile} />
        </section>
        <Link href="/don-hang" className="link-underline text-gold flex min-h-11 w-fit items-center gap-2">
          Xem đơn hàng của tôi <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
