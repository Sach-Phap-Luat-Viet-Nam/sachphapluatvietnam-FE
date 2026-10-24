import { Search } from "lucide-react";
import { Container } from "@slvn/ui";
import { getFreeShippingThreshold } from "@/features/ordering/shipping-threshold-server";
import { CartLink } from "@/features/ordering/CartLink";
import { AccountNav } from "./AccountNav";
import { BrandMark } from "./BrandMark";
import { PromoBar } from "./PromoBar";
import { ThemeToggle } from "./ThemeToggle";

export async function Header() {
  const freeShippingThreshold = await getFreeShippingThreshold();
  return (
    <header className="motion-drop bg-ink-deep relative z-20">
      <PromoBar freeShippingThreshold={freeShippingThreshold} />
      <Container className="flex flex-wrap items-center justify-between gap-x-2 gap-y-4 py-4 sm:gap-x-8 sm:py-5">
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
        <nav aria-label="Tài khoản" className="flex items-center gap-1 sm:gap-5">
          <ThemeToggle />
          <CartLink />
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
