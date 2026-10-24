import { Container } from "@slvn/ui";
import { BookLoader } from "@/components/BookLoader";

export default function BooksLoading() {
  return (
    <main id="noi-dung" aria-busy="true">
      <Container className="flex min-h-[60vh] items-center justify-center">
        <BookLoader label="Đang mở tủ sách" />
      </Container>
    </main>
  );
}
