import { Container } from "@slvn/ui";

export default function BooksLoading() {
  return (
    <main id="noi-dung" aria-busy="true">
      <Container className="py-10">
        <p role="status" className="text-muted mb-8 text-sm">
          Đang tải tủ sách…
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-6 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} aria-hidden="true">
              <div className="bg-paper h-58 animate-pulse rounded-lg sm:h-66" />
              <div className="bg-surface mt-4 h-4 w-3/4 animate-pulse rounded" />
              <div className="bg-surface mt-3 h-4 w-1/2 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
