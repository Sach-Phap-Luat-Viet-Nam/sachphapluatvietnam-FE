import { QuickAddButton } from "./QuickAddButton";
import type { QuickAddButtonProps } from "./QuickAddButton";
import { QuickBuyButton } from "./QuickBuyButton";

/** Hai nút mua nhanh của thẻ sách: "Mua ngay" (sang thanh toán) và thêm vào giỏ. */
export function QuickPurchase({ slug, title, variant = "icon" }: QuickAddButtonProps) {
  if (variant === "full") {
    return (
      <div className="flex flex-col gap-3">
        <QuickAddButton slug={slug} title={title} variant="full" />
        <QuickBuyButton slug={slug} title={title} variant="full" />
      </div>
    );
  }
  return (
    // `ml-auto` để khi dòng giá quá dài, hai nút xuống dòng vẫn nằm sát phải.
    <div className="ml-auto flex items-end gap-2">
      <QuickBuyButton slug={slug} title={title} />
      <QuickAddButton slug={slug} title={title} />
    </div>
  );
}
