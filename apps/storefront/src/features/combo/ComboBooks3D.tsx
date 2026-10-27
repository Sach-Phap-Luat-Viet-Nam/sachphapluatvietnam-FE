import { Book3D } from "@/features/home/Book3D";
import type { ComboItem } from "./schemas";

/** Số cuốn dựng 3D cạnh nhau; bộ nhiều sách hơn thì trang combo dùng bìa phẳng (`ComboCovers`). */
export const MAX_3D_BOOKS = 2;

/** Combo 1–2 sách dựng được mô hình 3D; nhiều hơn thì không đủ chỗ trong cột ảnh. */
export function canShow3D(items: readonly unknown[]): boolean {
  return items.length >= 1 && items.length <= MAX_3D_BOOKS;
}

export interface ComboBooks3DProps {
  items: readonly Pick<ComboItem, "skuId" | "bookTitle" | "coverImageUrl">[];
}

/**
 * Mô hình 3D các cuốn trong combo (`Book3D`), nghiêng theo chuột khi bọc trong `HeroSpotlight`. Hai cuốn đứng cạnh nhau;
 * một cuốn thì cỡ lớn như trang chi tiết sách.
 */
export function ComboBooks3D({ items }: ComboBooks3DProps) {
  const size = items.length > 1 ? "combo" : "detail";
  return (
    <div className="relative flex h-80 w-full items-center justify-center gap-4 sm:h-104 sm:gap-8 lg:h-96 lg:gap-5">
      <span aria-hidden="true" className="book-floor absolute bottom-6 h-10 w-full max-w-sm rounded-full sm:bottom-4" />
      {items.map((item) => (
        <Book3D key={item.skuId} title={item.bookTitle} coverImageUrl={item.coverImageUrl} size={size} />
      ))}
    </div>
  );
}
