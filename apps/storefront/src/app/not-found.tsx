import Link from "next/link";
import { Container } from "@slvn/ui";
export default function NotFound() {
  return (
    <main id="noi-dung">
      <Container className="py-24 text-center">
        <p className="text-accent text-sm">404</p>
        <h1 className="font-editorial text-primary mt-4 text-4xl">Không tìm thấy trang</h1>
        <Link href="/sach" className="text-primary mt-6 inline-block underline">
          Về tủ sách pháp luật
        </Link>
      </Container>
    </main>
  );
}
