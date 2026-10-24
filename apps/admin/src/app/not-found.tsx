import Link from "next/link";
import { buttonClassName } from "@slvn/ui";

export default function NotFound() {
  return (
    <main id="noi-dung" className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-primary text-5xl font-bold">404</p>
      <h1 className="text-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="text-muted max-w-md leading-7">Trang này chưa có hoặc đã đổi địa chỉ.</p>
      <Link href="/" className={buttonClassName({ size: "lg" })}>
        Về trang Tổng quan
      </Link>
    </main>
  );
}
