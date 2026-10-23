import { Search } from "lucide-react";
import { Container } from "@slvn/ui";
import { AccountNav } from "./AccountNav";
import { BrandMark } from "./BrandMark";

export function Header() {
  return (
    <header className="motion-drop border-gold/20 relative z-20 border-b">
      <div className="border-gold/15 text-mist border-b text-xs sm:text-[13px]">
        <Container className="flex justify-center py-2 sm:justify-between">
          <span>Miễn phí vận chuyển cho đơn từ 300.000đ</span>
          <span className="hidden sm:inline">Thanh toán khi nhận hàng hoặc chuyển khoản</span>
        </Container>
      </div>
      <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-4 sm:py-5">
        <BrandMark />
        <form
          action="/sach"
          role="search"
          className="border-border bg-ink-deep focus-within:border-gold order-3 flex h-12 w-full items-center gap-2.5 border pr-1.5 pl-4 transition-colors lg:order-0 lg:max-w-xl lg:flex-1"
        >
          <label htmlFor="header-search" className="sr-only">
            Tìm theo tên sách hoặc ISBN
          </label>
          <Search size={19} strokeWidth={1.6} className="text-mist shrink-0" />
          <input
            id="header-search"
            name="q"
            placeholder="Tên sách hoặc mã ISBN"
            maxLength={200}
            className="text-ivory h-full min-w-0 flex-1 bg-transparent outline-none"
          />
          <button type="submit" className="btn-sweep bg-gold text-ink h-9.5 px-4 text-sm font-semibold">
            Tìm
          </button>
        </form>
        <nav aria-label="Tài khoản">
          <AccountNav />
        </nav>
      </Container>
    </header>
  );
}
