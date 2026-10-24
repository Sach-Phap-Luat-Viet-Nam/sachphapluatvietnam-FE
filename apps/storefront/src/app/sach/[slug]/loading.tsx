import { Container } from "@slvn/ui";
import { BookLoader } from "@/components/BookLoader";

export default function BookLoading() {
  return (
    <main id="noi-dung" aria-busy="true">
      <Container className="flex min-h-[60vh] items-center justify-center">
        <BookLoader label="Đang mở sách" />
      </Container>
    </main>
  );
}
