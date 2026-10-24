"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./useCart";

/** Link giỏ hàng trên header, kèm số cuốn đang có. Lỗi tải giỏ thì vẫn hiện link, không hiện số. */
export function CartLink() {
  const { data: cart } = useCart();
  const count = cart?.totalQuantity ?? 0;

  return (
    <Link
      href="/gio-hang"
      aria-label={count ? `Giỏ hàng, ${count} cuốn` : "Giỏ hàng"}
      // Hẹp hơn trên mobile để logo, giỏ và nút Đăng nhập vẫn nằm một hàng ở màn 390px.
      className="hover:text-gold relative flex h-11 w-9 items-center justify-center transition-colors sm:w-11"
    >
      <ShoppingBag size={22} strokeWidth={1.6} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="bg-gold text-ink absolute top-0.5 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
