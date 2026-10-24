import type { ReactNode } from "react";

export interface AuthLayoutProps {
  title: string;
  /** Câu dẫn dưới tiêu đề. */
  lead?: ReactNode;
  children: ReactNode;
}

/** Khung cho màn đăng nhập và bật 2FA: thẻ ở giữa trang, không có sidebar. */
export function AuthLayout({ title, lead, children }: AuthLayoutProps) {
  return (
    <main id="noi-dung" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <p className="text-primary text-center leading-tight">
        <span className="block text-lg font-bold">Sách Luật Việt Nam</span>
        <span className="text-muted text-sm">Trang quản trị</span>
      </p>
      <section
        aria-labelledby="auth-title"
        className="bg-background border-border flex w-full max-w-md flex-col gap-6 rounded-lg border p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-col gap-2">
          <h1 id="auth-title" className="text-2xl font-semibold">
            {title}
          </h1>
          {lead && <p className="text-muted leading-7">{lead}</p>}
        </div>
        {children}
      </section>
    </main>
  );
}
