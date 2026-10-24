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
    // Hai nút nằm riêng một hàng dưới giá: "Mua ngay" giãn hết chỗ còn lại, nút giỏ vuông cùng chiều cao (h-11).
    <div className="flex items-stretch gap-2 [&>div:first-child]:flex-1 [&>div:first-child>button]:w-full">
      <QuickBuyButton slug={slug} title={title} />
      <QuickAddButton slug={slug} title={title} />
    </div>
  );
}
