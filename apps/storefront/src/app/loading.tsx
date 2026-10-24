import { Container } from "@slvn/ui";
import { BookLoader } from "@/components/BookLoader";

/** Trạng thái chờ chung khi chuyển sang trang render trên server (header, footer vẫn giữ nguyên). */
export default function Loading() {
  return (
    <main id="noi-dung" aria-busy="true">
      <Container className="flex min-h-[60vh] items-center justify-center">
        <BookLoader label="Đang tải" />
      </Container>
    </main>
  );
}
