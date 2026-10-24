import { Banknote, Search, Truck } from "lucide-react";
import { Container } from "@slvn/ui";
import { AccountNav } from "./AccountNav";
import { BrandMark } from "./BrandMark";

export function Header() {
  return (
    <header className="motion-drop bg-ink-deep relative z-20">
      <div className="bg-burgundy text-ivory text-xs sm:text-[13px]">
        <Container className="flex items-center justify-center gap-x-5 py-2">
          <span className="flex items-center gap-2">
            <Truck size={15} strokeWidth={1.6} className="text-gold-pale shrink-0" />
            Miễn phí vận chuyển cho đơn từ 300.000đ
          </span>
          <span aria-hidden="true" className="bg-gold-pale hidden size-1.5 rotate-45 sm:block" />
          <span className="hidden items-center gap-2 sm:flex">
            <Banknote size={15} strokeWidth={1.6} className="text-gold-pale shrink-0" />
            Thanh toán khi nhận hàng hoặc chuyển khoản
          </span>
        </Container>
      </div>
      <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-4 sm:py-5">
        <BrandMark />
        <form
          action="/sach"
          role="search"
          className="group border-ivory/15 bg-panel focus-within:border-gold order-3 flex h-12 w-full items-stretch border transition-[border-color,box-shadow] duration-300 focus-within:shadow-[0_0_0_4px_rgb(203_166_94/0.15)] lg:order-0 lg:max-w-xl lg:flex-1"
        >
          <label htmlFor="header-search" className="sr-only">
            Tìm theo tên sách hoặc ISBN
          </label>
          <Search
            size={19}
            strokeWidth={1.6}
            className="text-mist group-focus-within:text-gold ml-4 shrink-0 self-center transition-colors"
          />
          <input
            id="header-search"
            name="q"
            placeholder="Tên sách hoặc mã ISBN"
            maxLength={200}
            className="text-ivory min-w-0 flex-1 bg-transparent px-3 outline-none"
          />
          <button type="submit" className="btn-sweep bg-gold text-ink px-6 text-sm font-semibold">
            Tìm
          </button>
        </form>
        <nav aria-label="Tài khoản">
          <AccountNav />
        </nav>
      </Container>
      <span
        aria-hidden="true"
        className="via-gold/55 absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent to-transparent"
      />
    </header>
  );
}
