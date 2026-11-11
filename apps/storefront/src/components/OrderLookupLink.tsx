import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { tourAnchor } from "@/lib/tour-anchor";

/**
 * Lối vào trang tra cứu đơn (mã đơn + số điện thoại, không cần tài khoản) trên header. Mobile chỉ có biểu tượng, hẹp như
 * nút giỏ để logo, các nút và nút Đăng nhập vẫn nằm một hàng; màn rộng hiện thêm chữ.
 */
export function OrderLookupLink() {
  return (
    <Link
      href="/don-hang/tra-cuu"
      {...tourAnchor("order-lookup")}
      aria-label="Tra cứu đơn hàng"
      title="Tra cứu đơn hàng"
      className="text-mist hover:text-gold flex h-11 w-9 shrink-0 items-center justify-center gap-2 transition-colors sm:w-11 xl:w-auto"
    >
      <PackageSearch size={22} strokeWidth={1.6} aria-hidden="true" />
      <span className="hidden text-[15px] whitespace-nowrap xl:inline">Tra cứu đơn</span>
    </Link>
  );
}
