import type { ReactNode } from "react";
import { Clock, KeyRound, Scale, ShieldCheck } from "lucide-react";

export interface AuthLayoutProps {
  title: string;
  /** Câu dẫn dưới tiêu đề. */
  lead?: ReactNode;
  children: ReactNode;
}

const SECURITY_NOTES = [
  { icon: ShieldCheck, text: "Bắt buộc xác thực 2 lớp bằng ứng dụng trên điện thoại." },
  { icon: Clock, text: "Phiên đăng nhập 12 giờ, không ghi nhớ trên máy dùng chung." },
  { icon: KeyRound, text: "Chỉ dành cho tài khoản nhân viên do Super Admin cấp." },
] as const;

/**
 * Khung cho màn đăng nhập và bật 2FA, không có sidebar. Desktop chia hai cột: bên trái là khối thương hiệu kèm ghi chú
 * bảo mật, bên phải là thẻ form. Mobile chỉ còn tên thương hiệu và thẻ form.
 */
export function AuthLayout({ title, lead, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="bg-primary text-primary-foreground relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        {/* Hoa văn trang trí: hai vòng tròn mờ, không mang nội dung. */}
        <span
          aria-hidden="true"
          className="border-primary-foreground/10 absolute -top-32 -right-32 size-96 rounded-full border-[3rem]"
        />
        <span aria-hidden="true" className="bg-accent/25 absolute -bottom-24 -left-24 size-72 rounded-full blur-3xl" />

        <Brand />

        <div className="relative flex max-w-md flex-col gap-8">
          <p className="text-3xl leading-tight font-semibold xl:text-4xl">Quản lý sách, kho và đơn hàng ở một nơi.</p>
          <ul className="flex flex-col gap-4">
            {SECURITY_NOTES.map(({ icon: Icon, text }) => (
              <li key={text} className="text-primary-foreground/85 flex items-start gap-3 leading-7">
                <span className="bg-primary-foreground/10 flex size-8 shrink-0 items-center justify-center rounded-md">
                  <Icon size={18} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-primary-foreground/60 relative text-sm">Trang nội bộ, không dành cho khách mua sách.</p>
      </aside>

      <main id="noi-dung" className="flex flex-col items-center justify-center gap-6 px-4 py-10 sm:px-8">
        <div className="text-primary lg:hidden">
          <Brand />
        </div>
        <section
          aria-labelledby="auth-title"
          className="bg-background border-border flex w-full max-w-md flex-col gap-6 rounded-xl border p-6 shadow-sm sm:p-8"
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
    </div>
  );
}

function Brand() {
  return (
    <p className="relative flex items-center gap-3 leading-tight">
      <span className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-lg">
        <Scale size={22} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-lg font-bold">Sách Luật Việt Nam</span>
        <span className="text-sm opacity-75">Trang quản trị</span>
      </span>
    </p>
  );
}
