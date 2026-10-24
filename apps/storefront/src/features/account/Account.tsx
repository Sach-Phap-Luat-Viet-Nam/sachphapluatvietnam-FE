"use client";

import Link from "next/link";
import { ArrowRight, Gift, PackageSearch, RefreshCw } from "lucide-react";
import { authErrorMessage } from "@slvn/auth";
import { BookLoader } from "@/components/BookLoader";
import { FORM_ERROR } from "@/components/form-styles";
import { SignInRequired } from "@/components/SignInRequired";
import { useProfile } from "@/lib/use-account";
import { AddressBook } from "./AddressBook";
import { AvatarField } from "./AvatarField";
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
    <div className="flex flex-col gap-8">
      <section
        aria-label="Hồ sơ"
        className="border-gold/30 bg-panel relative overflow-hidden border px-6 py-9 sm:px-10 sm:py-10"
      >
        {/* Ánh vàng ở góc cho phần đầu trang bớt phẳng. */}
        <span
          aria-hidden="true"
          className="from-gold/15 pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-radial-[closest-side] to-transparent"
        />
        <div className="relative flex flex-col gap-7">
          <AvatarField profile={profile} />
          <nav
            aria-label="Lối tắt tài khoản"
            className="border-gold/20 flex flex-wrap justify-center gap-x-8 gap-y-1 border-t pt-4 sm:justify-start"
          >
            <Link href="/don-hang" className="link-underline text-gold flex min-h-11 items-center gap-2">
              <PackageSearch size={18} aria-hidden="true" /> Đơn hàng của tôi <ArrowRight size={16} />
            </Link>
            <Link href="/khuyen-mai" className="link-underline text-gold flex min-h-11 items-center gap-2">
              <Gift size={18} aria-hidden="true" /> Khuyến mãi đang chạy <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section aria-labelledby="thong-tin-ca-nhan" className={SECTION}>
          <div>
            <h2 id="thong-tin-ca-nhan" className={SECTION_TITLE}>
              Thông tin cá nhân
            </h2>
            <p className="text-mist mt-1.5 text-sm">Dùng để điền sẵn khi bạn đặt hàng.</p>
          </div>
          {/* `key` để form nhận lại giá trị khi đổi tài khoản trong cùng trình duyệt. */}
          <ProfileForm key={profile.id} profile={profile} />
        </section>
        <section aria-labelledby="so-dia-chi" className={SECTION}>
          <div>
            <h2 id="so-dia-chi" className={SECTION_TITLE}>
              Sổ địa chỉ
            </h2>
            <p className="text-mist mt-1.5 text-sm">Địa chỉ mặc định được chọn sẵn khi bạn đặt hàng.</p>
          </div>
          <AddressBook profile={profile} />
        </section>
      </div>
    </div>
  );
}
