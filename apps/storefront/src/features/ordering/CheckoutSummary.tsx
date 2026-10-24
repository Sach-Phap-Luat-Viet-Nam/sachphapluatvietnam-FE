import type { ReactNode } from "react";
import { cn } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { etaText, payableShipping } from "./checkout-preview";
import type { CheckoutPreview } from "./checkout-preview";

export interface CheckoutSummaryProps {
  /** Số liệu tạm của giỏ/dòng Mua ngay, chỉ hiện khi chưa có preview (đang tải hoặc preview lỗi). */
  fallback: { subtotal: number; totalQuantity: number };
  /** Tổng giá bìa các dòng; lớn hơn tạm tính thì hiện giá gốc và số tiền tiết kiệm từ giá bán. */
  listSubtotal: number;
  preview: CheckoutPreview | undefined;
  /** Số đang hiện có thể sắp đổi (đổi tỉnh, mã, số điện thoại…). */
  updating: boolean;
  /** Preview lỗi (không phải lỗi mã giảm giá): chỉ báo nhẹ, backend vẫn tính lại khi tạo đơn. */
  loadFailed: boolean;
  /** Ô nhập mã giảm giá. */
  coupon: ReactNode;
  /** Danh sách sách trong đơn, đặt dưới tổng tiền. */
  lines: ReactNode;
}

function Row({ term, children, tone }: { term: string; children: ReactNode; tone?: "ok" }) {
  return (
    <div className={cn("flex justify-between gap-4", tone === "ok" && "text-ok")}>
      <dt className={tone ? undefined : "text-sand"}>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Tóm tắt thanh toán theo `POST /checkout/preview`: mọi số tiền lấy nguyên từ backend, FE không cộng trừ lại (chỉ phí
 * ship thực trả = `shippingFee − shippingDiscount` để hiện "Miễn phí").
 */
export function CheckoutSummary({
  fallback,
  listSubtotal,
  preview,
  updating,
  loadFailed,
  coupon,
  lines,
}: CheckoutSummaryProps) {
  const subtotal = preview?.subtotal ?? fallback.subtotal;
  const quantity = preview ? preview.items.reduce((sum, item) => sum + item.quantity, 0) : fallback.totalQuantity;
  const saved = Math.max(0, listSubtotal - subtotal);
  const eta = preview ? etaText(preview.eta) : null;
  const shippingFree = preview !== undefined && payableShipping(preview) === 0;

  return (
    <div className="border-gold/30 bg-panel flex flex-col gap-5 border px-6 py-7">
      <h2 className="font-editorial text-2xl font-bold">Tóm tắt đơn hàng</h2>
      {coupon}
      <dl
        aria-busy={updating}
        className={cn("flex flex-col gap-2.5 text-[15px] transition-opacity", updating && "opacity-50")}
      >
        {saved > 0 && (
          <Row term="Giá gốc">
            <span className="text-mist line-through">{formatPrice(listSubtotal)}</span>
          </Row>
        )}
        {saved > 0 && (
          <Row term="Giảm giá sách" tone="ok">
            −{formatPrice(saved)}
          </Row>
        )}
        <Row term={`Tạm tính (${quantity} cuốn)`}>{formatPrice(subtotal)}</Row>
        {preview && preview.discount > 0 && (
          <Row term="Giảm giá khuyến mãi" tone="ok">
            −{formatPrice(preview.discount)}
          </Row>
        )}
        {preview && (
          <Row term="Phí vận chuyển">
            {shippingFree && preview.shippingDiscount > 0
              ? "Miễn phí"
              : preview.shippingFee
                ? formatPrice(preview.shippingFee)
                : "Miễn phí"}
          </Row>
        )}
        {preview && preview.shippingDiscount > 0 && !shippingFree && (
          <Row term="Giảm phí ship" tone="ok">
            −{formatPrice(preview.shippingDiscount)}
          </Row>
        )}
        {preview && (
          <div className="border-gold/25 flex justify-between gap-4 border-t pt-3.5 text-lg font-semibold">
            <dt>Tổng thanh toán</dt>
            <dd className="text-gold-pale">{formatPrice(preview.total)}</dd>
          </div>
        )}
      </dl>
      {preview && preview.appliedPromotions.length > 0 && (
        <ul
          aria-label="Ưu đãi đã áp"
          className="border-ok/50 bg-ok/10 text-ok flex flex-col gap-1.5 border px-4 py-3 text-[15px]"
        >
          {preview.appliedPromotions.map((promotion) => (
            <li key={promotion.promotionId} className="flex justify-between gap-4">
              <span>{promotion.name}</span>
              <span className="shrink-0 font-medium">−{formatPrice(promotion.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {preview && preview.amountToFreeShipping > 0 && (
        <p className="text-mist text-sm leading-6">
          Mua thêm {formatPrice(preview.amountToFreeShipping)} để được miễn phí vận chuyển.
        </p>
      )}
      {eta && <p className="text-mist text-sm">{eta}.</p>}
      {loadFailed && !preview && (
        <p className="text-mist text-sm leading-6">Tổng tiền và phí vận chuyển sẽ được tính khi tạo đơn.</p>
      )}
      {lines}
    </div>
  );
}
