import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@slvn/ui";
import { SUBMIT } from "@/components/form-styles";

export interface SignInRequiredProps {
  /** Trang quay lại sau khi đăng nhập. */
  next: string;
  title: string;
  description: string;
  /** Lối đi khác cho khách chưa có tài khoản, ví dụ link tra cứu đơn. */
  secondaryAction?: ReactNode;
}

/** Trang chỉ dành cho thành viên khi chưa đăng nhập: mời đăng nhập rồi quay lại đúng trang. */
export function SignInRequired({ next, title, description, secondaryAction }: SignInRequiredProps) {
  return (
    <div className="border-gold/25 flex min-h-80 flex-col items-center justify-center gap-4 border px-6 py-10 text-center">
      <h2 className="font-editorial text-3xl font-bold">{title}</h2>
      <p className="text-mist max-w-md leading-7">{description}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href={`/dang-nhap?next=${encodeURIComponent(next)}`} className={cn(SUBMIT, "px-7")}>
          Đăng nhập <ArrowRight size={18} />
        </Link>
        {secondaryAction}
      </div>
    </div>
  );
}

/** Link phụ cùng kiểu viền dùng cho `secondaryAction`. */
export const SECONDARY_LINK =
  "border-ivory/30 hover:border-gold flex min-h-13.5 items-center border px-7 transition-colors";
