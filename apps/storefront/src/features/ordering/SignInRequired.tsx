import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@slvn/ui";
import { SUBMIT } from "@/components/form-styles";

export interface SignInRequiredProps {
  /** Trang quay lại sau khi đăng nhập. */
  next: string;
}

/** Trang chỉ dành cho thành viên khi chưa đăng nhập: mời đăng nhập, hoặc tra cứu đơn bằng mã nếu đặt khi chưa có tài khoản. */
export function SignInRequired({ next }: SignInRequiredProps) {
  return (
    <div className="border-gold/25 flex min-h-80 flex-col items-center justify-center gap-4 border px-6 py-10 text-center">
      <h2 className="font-editorial text-3xl font-bold">Đăng nhập để xem đơn hàng</h2>
      <p className="text-mist max-w-md leading-7">
        Đơn đặt khi đã đăng nhập được lưu trong tài khoản. Đơn đặt khi chưa đăng nhập, bạn tra cứu bằng mã đơn và số
        điện thoại.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href={`/dang-nhap?next=${encodeURIComponent(next)}`} className={cn(SUBMIT, "px-7")}>
          Đăng nhập <ArrowRight size={18} />
        </Link>
        <Link
          href="/don-hang/tra-cuu"
          className="border-ivory/30 hover:border-gold flex min-h-13.5 items-center border px-7 transition-colors"
        >
          Tra cứu đơn hàng
        </Link>
      </div>
    </div>
  );
}
