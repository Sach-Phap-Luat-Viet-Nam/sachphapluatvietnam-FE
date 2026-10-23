import { Container } from "@slvn/ui";

export default function BooksLoading() {
  return (
    <main id="noi-dung" aria-busy="true">
      <Container className="py-10">
        <p role="status" className="text-gold mb-10 text-xs tracking-[0.3em]">
          ĐANG MỞ TỦ SÁCH…
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-8 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} aria-hidden="true">
              <div className="border-gold/40 flex h-56 items-end justify-center border-b sm:h-76">
                <div className="bg-panel h-44 w-33 animate-pulse sm:h-60 sm:w-45" />
              </div>
              <div className="bg-panel mt-5 h-3 w-1/3 animate-pulse" />
              <div className="bg-panel mt-3 h-5 w-3/4 animate-pulse" />
              <div className="bg-panel mt-3 h-4 w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
