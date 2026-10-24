import { Container } from "@slvn/ui";

export default function BookLoading() {
  return (
    <main id="noi-dung" aria-busy="true">
      <Container className="py-10">
        <p role="status" className="text-gold mb-10 text-xs tracking-[0.3em]">
          ĐANG MỞ SÁCH…
        </p>
        <div aria-hidden="true" className="grid gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
          <div className="bg-panel mx-auto h-80 w-60 animate-pulse sm:h-104 sm:w-78" />
          <div className="flex flex-col gap-4">
            <div className="bg-panel h-3 w-24 animate-pulse" />
            <div className="bg-panel h-12 w-4/5 animate-pulse" />
            <div className="bg-panel h-4 w-1/2 animate-pulse" />
            <div className="bg-panel mt-6 h-48 w-full animate-pulse" />
          </div>
        </div>
      </Container>
    </main>
  );
}
