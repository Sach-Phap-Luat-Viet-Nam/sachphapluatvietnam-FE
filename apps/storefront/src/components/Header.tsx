import Link from "next/link";
import { BookOpen, ChevronDown, Menu, Search, ShieldCheck, UserRound } from "lucide-react";
import { Container } from "@slvn/ui";

export function Header() {
  return (
    <header className="bg-background relative z-20">
      <div className="bg-primary text-primary-foreground py-2.5">
        <Container className="flex items-center justify-between gap-4 text-xs sm:text-sm">
          <span className="flex items-center gap-2">
            <ShieldCheck size={15} /> Sách chính thống. Tri thức vững vàng.
          </span>
          <span className="hidden sm:block">Miễn phí vận chuyển cho đơn từ 300.000đ</span>
        </Container>
      </div>
      <Container className="flex flex-wrap items-center justify-between gap-5 py-6 lg:gap-12">
        <Link href="/sach" aria-label="Sách Luật Việt Nam — Trang chủ" className="flex shrink-0 items-center gap-3">
          <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-lg">
            <BookOpen size={26} strokeWidth={1.5} />
          </span>
          <span>
            <span className="text-primary block text-lg font-bold tracking-tight">SÁCH LUẬT VIỆT NAM</span>
            <span className="text-muted block text-[10px] tracking-[0.2em]">TRI THỨC PHÁP LUẬT CHO MỌI NGƯỜI</span>
          </span>
        </Link>
        <form
          action="/sach"
          role="search"
          className="border-border bg-surface order-3 flex w-full items-center rounded-lg border px-4 lg:order-none lg:max-w-lg"
        >
          <label htmlFor="header-search" className="sr-only">
            Tìm theo tên sách hoặc ISBN
          </label>
          <input
            id="header-search"
            name="q"
            placeholder="Tìm tên sách, mã ISBN…"
            className="h-12 min-w-0 flex-1 bg-transparent outline-none"
            maxLength={200}
          />
          <button aria-label="Tìm sách" className="text-primary p-2">
            <Search size={21} />
          </button>
        </form>
        <Link href="/dang-nhap" aria-label="Đăng nhập" className="text-primary flex items-center gap-2 text-sm font-medium">
          <UserRound size={22} />
          <span className="hidden sm:inline">Đăng nhập</span>
        </Link>
      </Container>
      <div className="border-border border-y">
        <Container className="flex h-13 items-center justify-between gap-6">
          <nav aria-label="Điều hướng chính" className="hidden h-full items-center gap-9 md:flex">
            <Link
              href="/sach"
              className="border-primary text-primary flex h-full items-center gap-2 border-b-2 font-semibold"
            >
              <BookOpen size={18} /> Tất cả sách luật
            </Link>
            <Link href="/sach?category=dan-su" className="hover:text-accent text-sm">
              Dân sự
            </Link>
            <Link href="/sach?category=hinh-su" className="hover:text-accent text-sm">
              Hình sự
            </Link>
            <Link href="/sach?category=kinh-te" className="hover:text-accent text-sm">
              Kinh tế & Doanh nghiệp
            </Link>
            <Link href="/sach?type=textbook" className="hover:text-accent text-sm">
              Giáo trình
            </Link>
          </nav>
          <details className="group relative md:hidden">
            <summary className="flex list-none items-center gap-2 py-3 font-medium">
              <Menu size={20} /> Danh mục sách <ChevronDown size={16} />
            </summary>
            <nav
              aria-label="Danh mục trên điện thoại"
              className="border-border bg-background absolute top-full left-0 w-72 rounded-b-lg border p-3 shadow-lg"
            >
              {[
                ["", "Tất cả sách luật"],
                ["?category=dan-su", "Dân sự"],
                ["?category=hinh-su", "Hình sự"],
                ["?category=kinh-te", "Kinh tế & Doanh nghiệp"],
                ["?type=textbook", "Giáo trình"],
              ].map(([query, label]) => (
                <Link className="hover:bg-surface block rounded px-3 py-3" href={`/sach${query}`} key={label}>
                  {label}
                </Link>
              ))}
            </nav>
          </details>
          <span className="text-muted ml-auto hidden text-xs lg:block">Biên soạn chuyên sâu · Cập nhật pháp luật</span>
        </Container>
      </div>
    </header>
  );
}
