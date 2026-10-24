import Link from "next/link";
import { SECONDARY_LINK, SignInRequired } from "@/components/SignInRequired";

/** Màn mời đăng nhập của "Đơn của tôi": đơn đặt khi chưa đăng nhập thì tra cứu bằng mã đơn. */
export function OrdersSignInRequired({ next }: { next: string }) {
  return (
    <SignInRequired
      next={next}
      title="Đăng nhập để xem đơn hàng"
      description="Đơn đặt khi đã đăng nhập được lưu trong tài khoản. Đơn đặt khi chưa đăng nhập, bạn tra cứu bằng mã đơn và số điện thoại."
      secondaryAction={
        <Link href="/don-hang/tra-cuu" className={SECONDARY_LINK}>
          Tra cứu đơn hàng
        </Link>
      }
    />
  );
}
