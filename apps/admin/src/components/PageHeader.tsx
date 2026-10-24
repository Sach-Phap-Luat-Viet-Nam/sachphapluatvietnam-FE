import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Nút thao tác chính ở góc phải (ví dụ "Thêm sách"). */
  actions?: ReactNode;
}

/** Tiêu đề trang quản trị (thẻ `h1`) kèm mô tả và nút thao tác. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="text-muted leading-7">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
